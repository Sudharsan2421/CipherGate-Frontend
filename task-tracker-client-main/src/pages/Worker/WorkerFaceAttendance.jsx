import React, { useState } from 'react';
import FaceAttendance from '../../components/admin/FaceAttendance';
import Card from '../../components/common/Card';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const WorkerFaceAttendance = () => {
  const navigate = useNavigate();
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  const handleAttendanceSuccess = (workerData) => {
    // Add to local attendance history
    const newAttendance = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      worker: workerData.name,
      department: workerData.department
    };
    
    setAttendanceHistory(prev => [newAttendance, ...prev.slice(0, 4)]); // Keep last 5 records
    
    toast.success(`Welcome ${workerData.name}! Attendance marked successfully.`, {
      position: "top-center",
      autoClose: 3000,
    });
    
    // Auto redirect after 3 seconds
    setTimeout(() => {
      navigate('/worker');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-2">
          🕐 Face Attendance System
        </h1>
        <p className="text-gray-600 text-center">
          Position your face in the camera for automatic attendance marking
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Camera Feed */}
        <div className="md:col-span-2">
          <Card title="📷 Face Recognition" className="h-full">
            <FaceAttendance onAttendanceSuccess={handleAttendanceSuccess} />
          </Card>
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Instructions */}
          <Card title="📋 Instructions" className="">
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">1.</span>
                <span>Look directly into the camera</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">2.</span>
                <span>Ensure good lighting on your face</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">3.</span>
                <span>Stay still until recognition completes</span>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-blue-500 font-bold">4.</span>
                <span>Camera will close automatically after success</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 <strong>Tip:</strong> Remove glasses, hats, or masks for better recognition accuracy.
              </p>
            </div>
          </Card>

          {/* Recent Attendance */}
          {attendanceHistory.length > 0 && (
            <Card title="📊 Recent Activity" className="">
              <div className="space-y-2">
                {attendanceHistory.map((record) => (
                  <div key={record.id} className="p-2 bg-green-50 rounded border-l-4 border-green-400">
                    <p className="text-sm font-medium text-green-800">
                      {record.worker}
                    </p>
                    <p className="text-xs text-green-600">
                      {record.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card title="⚡ Quick Actions" className="">
            <div className="space-y-2">
              <button
                onClick={() => navigate('/worker')}
                className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm transition-colors"
              >
                🏠 Back to Dashboard
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-700 text-sm transition-colors"
              >
                🔄 Restart Camera
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto mt-8 text-center">
        <p className="text-sm text-gray-500">
          Face recognition system powered by AI • Secure & Fast
        </p>
      </div>
    </div>
  );
};

export default WorkerFaceAttendance;