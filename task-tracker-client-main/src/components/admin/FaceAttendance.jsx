import React, { useState, useRef, useEffect, useContext } from 'react';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import Modal from '../common/Modal';
import api from '../../hooks/useAxios';
import appContext from '../../context/AppContext';
import { getAuthToken } from '../../utils/authUtils';
import { useAuth } from '../../hooks/useAuth'; // Added import for useAuth
import { FaMapMarkerAlt } from 'react-icons/fa';

const FaceAttendance = ({ onAttendanceSuccess }) => {
  const webcamRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { subdomain } = useContext(appContext);
  const { user } = useAuth(); // Get user information
  const [status, setStatus] = useState('checking_location'); // 'checking_location', 'location_verified', 'wrong_location', 'capturing', 'processing', 'success', 'error', 'camera_closed'
  const [message, setMessage] = useState('Checking your location...');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const [cameraActive, setCameraActive] = useState(false); // Start with camera inactive
  const lastRequestTime = useRef(0); // To prevent multiple rapid requests
  
  // Location-related state
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Check worker location immediately when component mounts (only for workers)
  useEffect(() => {
    if (user && user.role === 'worker') {
      checkWorkerLocation();
    } else if (user && user.role === 'admin') {
      // Admins can proceed directly
      setStatus('location_verified');
      setCameraActive(true);
      setMessage('Face recognition is ready. Please position your face in the camera.');
    }
  }, [user]);

  // Function to check worker location
  const checkWorkerLocation = () => {
    setStatus('checking_location');
    setMessage('Checking your location...');
    
    if (!navigator.geolocation) {
      setStatus('wrong_location');
      setMessage('Geolocation is not supported by your browser');
      toast.error('Geolocation is not supported by your browser. Attendance cannot be marked.');
      return;
    }
    
    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setIsGettingLocation(false);
        
        // Send location to backend for verification
        try {
          const token = getAuthToken();
          const response = await api.post('/attendance/check-location', {
            subdomain,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.data.allowed) {
            setStatus('location_verified');
            setCameraActive(true);
            setMessage('Location verified successfully. Face recognition is ready.');
            toast.success('Location verified successfully. You can now mark attendance.');
          } else {
            setStatus('wrong_location');
            setMessage('❌ Wrong location - ' + response.data.message);
            toast.error('Wrong location - ' + response.data.message);
          }
        } catch (error) {
          console.error('Location check error:', error);
          setIsGettingLocation(false);
          setStatus('wrong_location');
          setMessage('❌ Error checking location. Please try again.');
          toast.error('Error checking location. Please try again.');
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsGettingLocation(false);
        setStatus('wrong_location');
        
        // Show error message based on error code
        let errorMessage = 'Error getting your location';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location services to mark attendance.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Attendance cannot be marked.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage = 'An unknown error occurred getting your location.';
        }
        
        setMessage('❌ ' + errorMessage);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000 // 30 seconds
      }
    );
  };

  useEffect(() => {
    let intervalId;
    if (status === 'location_verified' && cameraActive) {
      intervalId = setInterval(() => {
        captureAndSubmit();
      }, 4000); // Adjusted to 4 seconds for better balance
    }
    return () => clearInterval(intervalId);
  }, [status, cameraActive]);

  // Countdown timer for automatic redirect after success
  useEffect(() => {
    let countdownInterval;
    if (showSuccessModal && countdown > 0) {
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleCloseCamera();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(countdownInterval);
  }, [showSuccessModal, countdown]);

  const captureAndSubmit = async () => {
    // Only proceed if location is verified
    if (status !== 'location_verified') {
      return;
    }
    
    const now = Date.now();
    // Prevent multiple requests within 2 seconds
    if (isCapturing || !cameraActive || (now - lastRequestTime.current) < 2000) {
      return;
    }
    
    lastRequestTime.current = now;
    setStatus('capturing');
    setMessage('📸 Capturing your image...');
    setIsCapturing(true);

    try {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (!imageSrc) {
        setStatus('location_verified'); // Reset to location_verified state
        setMessage('Unable to capture image. Please ensure camera is working.');
        setIsCapturing(false);
        return;
      }

      const blob = await fetch(imageSrc).then(res => res.blob());
      const formData = new FormData();
      formData.append('subdomain', subdomain);
      formData.append('face_photo', blob);
      
      // Add location data if available (only for workers)
      if (user && user.role === 'worker' && location) {
        formData.append('latitude', location.latitude);
        formData.append('longitude', location.longitude);
        formData.append('accuracy', location.accuracy);
      }

      setStatus('processing');
      setMessage('🔍 Processing face recognition...');

      const token = getAuthToken();
      const response = await api.post('/attendance/face', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
      });
      
      // Success - prepare for camera closure
      setStatus('success');
      setCameraActive(false); // Stop camera immediately
      setAttendanceData({
        worker: response.data.worker,
        attendance: response.data.attendance,
        message: response.data.message
      });
      setShowSuccessModal(true);
      setCountdown(5); // Start 5-second countdown
      
      // Show success toast
      toast.success(`✅ ${response.data.message}`, {
        position: "top-center",
        autoClose: 3000,
      });
      
      setIsCapturing(false);
    } catch (error) {
      setIsCapturing(false);
      
      // Handle location verification error (only for workers)
      if (error.response?.status === 403 && error.response?.data?.locationError) {
        setStatus('wrong_location');
        setMessage(`❌ ${error.response.data.message}`);
        
        toast.error(error.response.data.message, {
          position: "top-center",
          autoClose: 5000,
          bodyClassName: "text-sm",
          closeButton: true
        });
        return;
      }
      
      // Check if this is an unregistered face
      if (error.response?.data?.isUnsavedFace) {
        setStatus('location_verified'); // Reset to location_verified state
        setMessage('⚠️ ' + error.response.data.message);
        
        // Show a specific toast for unregistered faces with more detailed information
        toast.error('Unregistered Face Detected', {
          position: "top-center",
          autoClose: 5000,
          bodyClassName: "text-sm",
          closeButton: true
        });
        
        // Also show a more detailed message in the console for debugging
        console.log('Unregistered face detected:', error.response.data);
        
        setTimeout(() => {
          setMessage('Face recognition is ready. Please position your face in the camera.');
        }, 4000);
      }
      // Handle 429 Too Many Requests error (2-minute interval enforcement)
      else if (error.response?.status === 429) {
        setStatus('location_verified'); // Reset to location_verified state
        setMessage('⏰ ' + error.response.data.message);
        
        // Show a specific toast for the interval enforcement
        toast.error('Please Wait', {
          position: "top-center",
          autoClose: 5000,
          bodyClassName: "text-sm",
          closeButton: true
        });
        
        setTimeout(() => {
          setMessage('Face recognition is ready. Please position your face in the camera.');
        }, 5000);
      }
      // Handle other 404 errors (no face found)
      else if (error.response?.status === 404) {
        setStatus('location_verified'); // Reset to location_verified state
        // Check if this is specifically an unsaved face error
        if (error.response.data?.isUnsavedFace) {
          setMessage('❌ ' + error.response.data.message);
          toast.error('Unregistered Face Detected', {
            position: "top-center",
            autoClose: 5000,
            bodyClassName: "text-sm",
            closeButton: true
          });
        } else {
          setMessage('❌ No matching face found. Please try again.');
        }
        setTimeout(() => {
          setMessage('Face recognition is ready. Please position your face in the camera.');
        }, 3000);
      } 
      // Handle all other errors
      else {
        setStatus('location_verified'); // Reset to location_verified state
        setMessage(error.response?.data?.message || '❌ Face recognition failed. Please try again.');
        console.error('Face attendance error:', error);
        setTimeout(() => {
          setMessage('Face recognition is ready. Please position your face in the camera.');
        }, 3000);
      }
    }
  };

  const handleCloseCamera = () => {
    setCameraActive(false);
    setStatus('camera_closed');
    setShowSuccessModal(false);
    // Use setTimeout to avoid setState during render
    if (attendanceData && onAttendanceSuccess) {
      setTimeout(() => {
        onAttendanceSuccess(attendanceData.worker);
      }, 0);
    }
  };

  const handleTryAgain = () => {
    if (user && user.role === 'worker') {
      checkWorkerLocation();
    } else if (user && user.role === 'admin') {
      setStatus('location_verified');
      setCameraActive(true);
      setMessage('Face recognition is ready. Please position your face in the camera.');
    }
  };

  // Show location checking state
  if (status === 'checking_location') {
    return (
      <div className="text-center p-8">
        <div className="mb-6">
          <Spinner size="lg" className="mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-blue-600 mb-2">Checking Your Location</h3>
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    );
  }

  // Show wrong location message
  if (status === 'wrong_location') {
    return (
      <div className="text-center p-8">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">❌</span>
          </div>
          <h3 className="text-xl font-semibold text-red-600 mb-2">Wrong Location</h3>
          <p className="text-gray-600 mb-4">{message}</p>
          <p className="text-sm text-gray-500">You must be at the designated work location to mark attendance.</p>
        </div>
        <Button onClick={handleTryAgain} variant="primary">
          Try Again
        </Button>
      </div>
    );
  }

  if (status === 'camera_closed') {
    return (
      <div className="text-center p-8">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-3xl">✅</span>
          </div>
          <h3 className="text-xl font-semibold text-green-600 mb-2">Attendance Marked Successfully!</h3>
          <p className="text-gray-600">Camera has been closed. Redirecting...</p>
        </div>
        <Button onClick={handleTryAgain} variant="secondary">
          Mark Another Attendance
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center">
      {/* Location Status Indicator (only for workers) */}
      {user && user.role === 'worker' && (
        <div className={`location-status mb-4 p-2 rounded-lg flex items-center ${status === 'location_verified' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="mr-2">
            <FaMapMarkerAlt className={`text-lg ${status === 'location_verified' ? 'text-green-500' : 'text-blue-500'}`} />
          </div>
          <div className="flex-grow">
            <p className={`text-sm ${status === 'location_verified' ? 'text-green-700' : 'text-blue-700'}`}>
              {status === 'location_verified' ? '✅ Location verified for attendance' : '📍 Checking location...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Admin notification */}
      {user && user.role === 'admin' && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Admin Mode:</strong> Location verification is disabled for admin users. 
            You can mark attendance for any worker without location restrictions.
          </p>
        </div>
      )}

      {/* Camera Feed */}
      <div className="relative mb-4">
        {cameraActive ? (
          <>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ 
                facingMode: 'user',
                width: 640,
                height: 480
              }}
              className="w-full rounded-lg shadow-lg"
            />
            
            {/* Face Detection Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-blue-400 rounded-full opacity-50 animate-pulse"></div>
              </div>
            </div>
            
            {/* Processing Overlay */}
            {(status === 'capturing' || status === 'processing') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-80 text-white rounded-lg">
                <Spinner size="lg" />
                <p className="mt-4 text-lg font-medium">{message}</p>
                <div className="mt-2 text-sm opacity-75">
                  {status === 'capturing' ? 'Hold still...' : 'Analyzing face...'}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <span className="text-4xl mb-4 block">📷</span>
              <p className="text-gray-600">Camera is closed</p>
            </div>
          </div>
        )}
      </div>

      {/* Status Message */}
      <div className="mb-4">
        <p className={`text-lg font-medium ${
          status === 'success' ? 'text-green-600' : 
          status === 'error' ? 'text-red-600' : 
          status === 'processing' ? 'text-blue-600' : 
          status === 'capturing' ? 'text-blue-600' : 
          status === 'location_verified' ? 'text-green-600' : 'text-gray-700'
        }`}>
          {message}
        </p>
        
        {status === 'location_verified' && cameraActive && (
          <div className="mt-2 text-sm text-gray-500">
            <p>💡 Position your face within the circle for automatic detection</p>
            <p className="mt-1">Scanning every 4 seconds...</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(status === 'error' || status === 'location_verified') && (
        <div className="flex gap-3 justify-center">
          <Button onClick={handleTryAgain} variant="primary">
            {status === 'error' ? 'Try Again' : 'Restart Camera'}
          </Button>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && attendanceData && (
        <Modal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          title="🎉 Attendance Successful!"
        >
          <div className="text-center p-6">
            {attendanceData.worker.photo && (
              <img 
                src={attendanceData.worker.photo} 
                alt={attendanceData.worker.name}
                className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
              />
            )}
            
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome, {attendanceData.worker.name}!
            </h3>
            
            <p className="text-gray-600 mb-2">
              Department: {attendanceData.worker.department}
            </p>
            
            <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mb-4 ${
              attendanceData.message.includes('in') 
                ? 'bg-green-100 text-green-800' 
                : 'bg-blue-100 text-blue-800'
            }`}>
              {attendanceData.message}
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              Camera will close automatically in {countdown} seconds
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button onClick={handleCloseCamera} variant="primary">
                Close Now
              </Button>
              <Button onClick={() => setShowSuccessModal(false)} variant="secondary">
                Keep Open
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FaceAttendance;