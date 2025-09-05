import React, { useState, useRef, useContext, useEffect } from 'react';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';
import Button from '../common/Button';
import Spinner from '../common/Spinner';
import api from '../../hooks/useAxios';
import appContext from '../../context/AppContext';
import { getAuthToken } from '../../utils/authUtils';
import { clearWorkerFacePhotos } from '../../services/workerService'; // Add this import

const FaceEnrollment = ({ workerId, onClose, onEnrollmentSuccess, isUpdating = false }) => {
  const webcamRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const { subdomain } = useContext(appContext);

  // If updating existing photos, show a warning message
  useEffect(() => {
    if (isUpdating) {
      toast.info('Capturing new photos will replace all existing face recognition photos for this employee.');
    }
  }, [isUpdating]);

  const captureImage = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImages(prev => [...prev, imageSrc]);
      toast.success(`Photo ${capturedImages.length + 1} captured!`);
    }
  };

  const enrollAllImages = async () => {
    if (capturedImages.length === 0) {
      toast.error('Please capture at least one photo first.');
      return;
    }

    setIsUploading(true);

    try {
      // If updating, first clear existing face photos
      if (isUpdating) {
        try {
          await clearWorkerFacePhotos(workerId);
          console.log('Cleared existing face photos');
        } catch (error) {
          console.error('Error clearing existing face photos:', error);
          // Continue with enrollment even if clearing fails
        }
      }

      let successCount = 0;
      
      for (let i = 0; i < capturedImages.length; i++) {
        const imageSrc = capturedImages[i];
        const blob = await fetch(imageSrc).then(res => res.blob());
        const formData = new FormData();
        formData.append('workerId', workerId);
        formData.append('subdomain', subdomain);
        formData.append('face_photo', blob);

        try {
          const token = getAuthToken();
          await api.post('/workers/enroll-face', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`
            },
          });
          successCount++;
        } catch (error) {
          console.error(`Error enrolling photo ${i + 1}:`, error);
          toast.error(`Failed to enroll photo ${i + 1}`);
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully enrolled ${successCount} face photo(s)!`);
        if (onEnrollmentSuccess) {
          onEnrollmentSuccess();
        }
        onClose();
      } else {
        toast.error('Failed to enroll any photos. Please try again.');
      }
    } catch (error) {
      console.error('Face enrollment error:', error);
      toast.error('Failed to enroll face photos.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="text-center">
      <div className="relative mb-4">
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          videoConstraints={{ 
            facingMode: 'user',
            width: 640,
            height: 480
          }}
          className="w-full rounded-lg shadow"
        />
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70 rounded-lg">
            <div className="text-center text-white">
              <Spinner size="lg" />
              <p className="mt-2">{isUpdating ? 'Updating' : 'Enrolling'} face photos...</p>
            </div>
          </div>
        )}
      </div>

      {/* Captured Images Preview */}
      {capturedImages.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Captured Photos ({capturedImages.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {capturedImages.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`Captured ${index + 1}`}
                  className="w-full h-20 object-cover rounded border-2 border-green-400"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-700">
          {isUpdating 
            ? '📸 Capture new photos to replace existing ones. This will remove all current face recognition photos.' 
            : '📸 Capture 2-3 photos from different angles for better recognition accuracy'}
        </p>
      </div>

      <div className="flex justify-center space-x-2">
        <Button
          onClick={captureImage}
          disabled={isUploading || capturedImages.length >= 5}
          variant="secondary"
        >
          📷 Capture Photo ({capturedImages.length}/5)
        </Button>
        <Button
          onClick={enrollAllImages}
          disabled={isUploading || capturedImages.length === 0}
          variant="primary"
        >
          {isUploading ? <Spinner size="sm" /> : (isUpdating ? '🔄 Update Photos' : '✅ Enroll All Photos')}
        </Button>
        <Button onClick={onClose} disabled={isUploading} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default FaceEnrollment;