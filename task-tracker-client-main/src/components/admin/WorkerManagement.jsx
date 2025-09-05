import React, { useState, useEffect, useContext, useRef } from 'react';
import { toast } from 'react-toastify';
import { FaPlus, FaEdit, FaTrash, FaUserShield } from 'react-icons/fa';
import { getWorkers, createWorker, updateWorker, deleteWorker, getUniqueId, deleteWorkerFacePhotos, deleteIndividualFacePhoto } from '../../services/workerService';
import { getDepartments } from '../../services/departmentService';
import Card from '../common/Card';
import Button from '../common/Button';
import Table from '../common/Table';
import Modal from '../common/Modal';
import Spinner from '../common/Spinner';
import appContext from '../../context/AppContext';
import QRCode from 'qrcode';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import api from '../../hooks/useAxios';
import { getAuthToken } from '../../utils/authUtils';
import FaceEnrollment from './FaceEnrollment';
import Webcam from 'react-webcam';

const WorkerManagement = () => {
  const nameInputRef = useRef(null);
  const webcamRef = useRef(null);
  const [workers, setWorkers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [batches, setBatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [editProfilePhoto, setEditProfilePhoto] = useState(null);


  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    setProfilePhoto(file);
  };
  const handleEditProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    setEditProfilePhoto(file);
  };


  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEnrollFaceModalOpen, setIsEnrollFaceModalOpen] = useState(false);
  const [isDeleteIndividualFacePhotoModalOpen, setIsDeleteIndividualFacePhotoModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [photoToDeleteIndex, setPhotoToDeleteIndex] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    rfid: '',
    salary: '',
    password: '',
    confirmPassword: '',
    department: '',
    batch: '',
  });

  const { subdomain } = useContext(appContext);

  const loadData = async () => {
    setIsLoading(true);
    setIsLoadingDepartments(true);
    setIsLoadingBatches(true);

    const fetchSettings = async () => {
      if (!subdomain || subdomain === 'main') return null;
      try {
        const token = getAuthToken();
        const response = await api.get(`/settings/${subdomain}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching settings:', error);
        return null;
      }
    };

    try {
      const [workersData, departmentsData, settingsData] = await Promise.all([
        getWorkers({ subdomain }),
        getDepartments({ subdomain }),
        fetchSettings()
      ]);

      // Enhanced logging to debug face photos
      console.log('Workers data received:', workersData);
      if (workersData && workersData.length > 0) {
        const workerWithFacePhotos = workersData.find(w => w.facePhotos && w.facePhotos.length > 0);
        if (workerWithFacePhotos) {
          console.log('Worker with face photos:', workerWithFacePhotos.name, workerWithFacePhotos.facePhotos);
        }
      }

      const safeWorkersData = Array.isArray(workersData) ? workersData : [];
      const safeDepartmentsData = Array.isArray(departmentsData) ? departmentsData : [];
      const safeBatchesData = settingsData?.batches && Array.isArray(settingsData.batches) ? settingsData.batches : [];

      setWorkers(safeWorkersData);
      setDepartments(safeDepartmentsData);
      setBatches(safeBatchesData);
    } catch (error) {
      toast.error('Failed to load data');
      console.error(error);
      setWorkers([]);
      setDepartments([]);
      setBatches([]);
    } finally {
      setIsLoading(false);
      setIsLoadingDepartments(false);
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getWorkerId = async () => {
    await getUniqueId()
      .then((response) => {
        setFormData(prev => ({ ...prev, rfid: response.rfid }));
      })
      .catch((e) => console.log(e.message));
  }

  useEffect(() => {
    getWorkerId();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const filteredWorkers = Array.isArray(workers)
    ? workers.filter(
      worker =>
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (worker.department && worker.department.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    : [];

  useEffect(() => {
    if (isAddModalOpen) {
      nameInputRef.current?.focus();
    }
  }, [isAddModalOpen]);

  const openAddModal = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      salary: '',
      department: departments.length > 0 ? departments[0]._id : '',
      batch: 'Default', // Setting default batch value
      rfid: '',
      confirmPassword: ''
    });
    setCapturedImages([]);
    setProfilePhoto(null);
    getWorkerId();
    setIsAddModalOpen(true);
  };

  const openEditModal = async (worker) => {
    const departmentId = typeof worker.department === 'object'
      ? worker.department._id
      : (departments.find(dept => dept.name === worker.department)?._id || worker.department);

    // Always fetch fresh worker data to ensure we have the latest face photos
    let workerToUse = worker;
    try {
      console.log('Opening edit modal for worker:', worker.name);
      const freshWorkersData = await getWorkers({ subdomain });
      const freshWorker = freshWorkersData.find(w => w._id === worker._id);
      
      if (freshWorker) {
        console.log('Fresh worker data loaded:', freshWorker.name, 'Face photos:', freshWorker.facePhotos?.length || 0);
        console.log('Face photos array:', freshWorker.facePhotos);
        workerToUse = freshWorker;
        setSelectedWorker(freshWorker);
      } else {
        console.warn('Could not find fresh worker data, using existing data');
        setSelectedWorker(worker);
      }
    } catch (error) {
      console.error('Error fetching fresh worker data:', error);
      setSelectedWorker(worker);
    }

    // Use the fresh worker data for form
    const freshDepartmentId = typeof workerToUse.department === 'object'
      ? workerToUse.department._id
      : (departments.find(dept => dept.name === workerToUse.department)?._id || workerToUse.department);

    setFormData({
      name: workerToUse.name || '',
      username: workerToUse.username || '',
      department: freshDepartmentId || '',
      batch: workerToUse.batch || '',
      photo: workerToUse.photo || '',
      salary: workerToUse.salary || '',
      password: '',
      confirmPassword: ''
    });
    setEditProfilePhoto(null);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (worker) => {
    setSelectedWorker(worker);
    setIsDeleteModalOpen(true);
  };

  const handleEnrollmentSuccess = async () => {
    // Refresh the worker data to show updated face photos
    try {
      const updatedWorkersData = await getWorkers({ subdomain });
      const safeWorkersData = Array.isArray(updatedWorkersData) ? updatedWorkersData : [];
      setWorkers(safeWorkersData);
      
      // Update the selected worker with fresh data
      const updatedWorker = safeWorkersData.find(w => w._id === selectedWorker._id);
      if (updatedWorker) {
        setSelectedWorker(updatedWorker);
      }
    } catch (error) {
      console.error('Error refreshing worker data:', error);
    }
  };

  const handleDeleteIndividualFacePhoto = (worker, photoIndex) => {
    setSelectedWorker(worker);
    setPhotoToDeleteIndex(photoIndex);
    setIsDeleteIndividualFacePhotoModalOpen(true);
  };

  // Add this new function to handle the actual deletion of an individual photo
  const confirmDeleteIndividualFacePhoto = async () => {
    try {
      // Use the new API endpoint for deleting individual photos
      await deleteIndividualFacePhoto(selectedWorker._id, photoToDeleteIndex);
      toast.success('Face photo deleted successfully');
      
      // Refresh worker data
      const updatedWorkersData = await getWorkers({ subdomain });
      const safeWorkersData = Array.isArray(updatedWorkersData) ? updatedWorkersData : [];
      setWorkers(safeWorkersData);
      
      // Update the selected worker with fresh data
      const updatedWorker = safeWorkersData.find(w => w._id === selectedWorker._id);
      if (updatedWorker) {
        setSelectedWorker(updatedWorker);
      }
      
      setIsDeleteIndividualFacePhotoModalOpen(false);
      setPhotoToDeleteIndex(null);
    } catch (error) {
      console.error('Error deleting face photo:', error);
      toast.error(error.message || 'Failed to delete face photo');
    }
  };

  const openEnrollFaceModal = (worker) => {
    setSelectedWorker(worker);
    setIsEnrollFaceModalOpen(true);
  };

  const generateQRCode = async (username, uniqueId) => {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(uniqueId, { width: 300 });
      const link = document.createElement('a');
      link.href = qrCodeDataURL;
      link.download = `${username}_${uniqueId}.png`;
      link.click();
    } catch (error) {
      console.error('QR Code generation error:', error);
    }
  };

  const convertDataURLToBlob = (dataURL) => {
    try {
      const arr = dataURL.split(',');
      if (arr.length < 2) {
        throw new Error('Invalid data URL format');
      }
      
      // Extract mime type from the data URL
      const mime = arr[0].match(/:(.*?);/)[1] || 'image/jpeg'; // Default to image/jpeg if not found
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      // Create blob with explicit MIME type
      const blob = new Blob([u8arr], { type: mime });
      console.log('Created blob:', { type: blob.type, size: blob.size });
      return blob;
    } catch (error) {
      console.error('Error converting data URL to blob:', error);
      throw error;
    }
  };

  const captureImage = () => {
    if (capturedImages.length >= 3) {
      toast.warn("You have already captured 3 photos.");
      return;
    }
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setCapturedImages(prev => [...prev, imageSrc]);
      toast.success(`Captured photo ${capturedImages.length + 1} of 3!`);
    } else {
      toast.error("Failed to capture photo.");
    }
  };

  const handleAddWorker = async (e) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();
    const trimmedUsername = formData.username.trim();
    const trimmedPassword = formData.password.trim();
    const trimmedSalary = formData.salary ? formData.salary.toString().trim() : '';

    if (!subdomain || subdomain == 'main') {
      toast.error('Subdomain is missing, check the url');
      return;
    }

    if (!trimmedName || !trimmedUsername || !trimmedPassword || !trimmedSalary) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.department || !formData.rfid) {
      toast.error('Please ensure department and unique ID are selected.');
      return;
    }
    
    // Set a default batch value
    if (!formData.batch) {
      formData.batch = "Default";
    }

    if (capturedImages.length < 3) {
      toast.error(`Please capture ${3 - capturedImages.length} more face photos.`);
      return;
    }

    setIsCapturing(true);
    try {
      console.log('Converting captured images to blobs:', capturedImages.length);
      console.log('Captured images URLs:', capturedImages);
      
      // Only convert profile photo if it exists
      let profilePhotoBlob = null;
      if (profilePhoto) {
        profilePhotoBlob = await fetch(URL.createObjectURL(profilePhoto)).then(res => res.blob());
        console.log('Profile photo blob:', {
          type: profilePhotoBlob.type,
          size: profilePhotoBlob.size
        });
      }
      
      const facePhotoBlobs = capturedImages.map((img, index) => {
        try {
          console.log(`Converting face photo ${index + 1}:`, img.substring(0, 50) + '...');
          const blob = convertDataURLToBlob(img);
          console.log(`Face photo ${index + 1} blob:`, {
            type: blob.type,
            size: blob.size
          });
          return blob;
        } catch (error) {
          console.error(`Error converting face photo ${index + 1}:`, error);
          throw error;
        }
      });

      console.log('All face photo blobs created:', facePhotoBlobs.length);
      console.log('Face photo blobs details:', facePhotoBlobs.map((blob, i) => ({
        index: i,
        type: blob.type,
        size: blob.size
      })));

      console.log('Creating worker with face photos:', facePhotoBlobs.length);
      
      // Create the worker data object
      const workerCreateData = {
        ...formData,
        name: trimmedName,
        username: trimmedUsername,
        rfid: formData.rfid,
        salary: trimmedSalary,
        subdomain,
        password: trimmedPassword,
        // Only include photo if it exists
        ...(profilePhotoBlob && { photo: profilePhotoBlob }),
        facePhotos: facePhotoBlobs
      };
      
      console.log('Worker create data:', {
        ...workerCreateData,
        photo: profilePhotoBlob ? 'Blob(' + profilePhotoBlob.size + ' bytes)' : 'None',
        facePhotos: 'Array(' + facePhotoBlobs.length + ' blobs)'
      });

      const newWorker = await createWorker(workerCreateData);

      console.log('Worker created successfully:', newWorker);
      console.log('Face photos in response:', newWorker.facePhotos);
      console.log('Face photos count:', newWorker.facePhotosCount || 0);

      generateQRCode(trimmedUsername, formData.rfid);
      
      // Immediate success feedback
      setIsAddModalOpen(false);
      toast.success(newWorker.message || `Employee added successfully with ${newWorker.facePhotosCount || 0} face photos`);
      
      // Add a delay to ensure face photos are fully processed and saved
      setTimeout(async () => {
        // Refresh the complete workers data to ensure face photos are properly loaded
        console.log('Refreshing data after worker creation...');
        await loadData();
        console.log('Data refreshed after worker creation - face photos should now be visible');
      }, 2000); // Increased delay to 2 seconds
    } catch (error) {
      console.error('Add Employee Error:', error);
      if (error.response) {
        console.error('Error response:', {
          data: error.response.data,
          status: error.response.status,
          headers: error.response.headers
        });
      }
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleEditWorker = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.username || !formData.department) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password) {
      if (formData.password !== formData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        toast.error('Password must be at least 6 characters long');
        return;
      }
    }

    try {
      const updateData = {
        name: formData.name,
        username: formData.username,
        department: formData.department,
        batch: formData.batch || 'Default', // Use existing batch or set default
        salary: formData.salary
      };

      if (formData.password) {
        updateData.password = formData.password;
      }
      if (editProfilePhoto) {
        updateData.photo = editProfilePhoto;
      }

      const updatedWorker = await updateWorker(selectedWorker._id, updateData);

      setWorkers(prev =>
        prev.map(worker =>
          worker._id === selectedWorker._id ? {
            ...updatedWorker,
            department: departments.find(dept => dept._id === updatedWorker.department)?.name || updatedWorker.department
          } : worker
        )
      );

      setIsEditModalOpen(false);
      toast.success('Employee updated successfully');
      loadData();
    } catch (error) {
      console.error('Update Error:', error);
      toast.error(error.message || 'Failed to update employee');
    }
  };

  const handleDeleteWorker = async () => {
    try {
      await deleteWorker(selectedWorker._id);
      setWorkers(prev => prev.filter(worker => worker._id !== selectedWorker._id));
      setIsDeleteModalOpen(false);
      toast.success('Employee deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete employee');
    }
  };

  const columns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (record) => (
        <div className="flex items-center">
          {record?.photo && (
            <img
              src={record.photo
                ? record.photo
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(record.name)}`}
              alt="Employee"
              className="w-8 h-8 rounded-full mr-2"
            />
          )}
          {record?.name || 'Unknown'}
        </div>
      )
    },
    {
      header: 'Salary',
      accessor: 'salary'
    },
    {
      header: 'Employee ID',
      accessor: 'rfid'
    },
    {
      header: 'Department',
      accessor: 'department'
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (worker) => (
        <div className="flex space-x-2">
          <button
            onClick={() => openEditModal(worker)}
            className="p-1 text-blue-600 hover:text-blue-800"
          >
            <FaEdit />
          </button>
          <button
            onClick={() => openDeleteModal(worker)}
            className="p-1 text-red-600 hover:text-red-800"
          >
            <FaTrash />
          </button>
          <button
            onClick={() => openEnrollFaceModal(worker)}
            className="p-1 text-purple-600 hover:text-purple-800"
            title="Enroll Face for Attendance"
          >
            <FaUserShield />
          </button>
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Employee Management</h1>
        <Button
          variant="primary"
          onClick={openAddModal}
          className='flex items-center'
        >
          <FaPlus className="mr-2" /> Add Employee
        </Button>
      </div>

      <Card>
        <div className="mb-4">
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredWorkers}
            noDataMessage="No employee found."
          />
        )}
      </Card>

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Worker"
      >
        <form onSubmit={handleAddWorker}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Name</label>
            <input
              ref={nameInputRef}
              type="text"
              id="name"
              name="name"
              className="form-input"
              value={formData.name || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              className="form-input"
              value={formData.username || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="text" className="form-label">Unique ID</label>
            <input
              type="text"
              id="rfid"
              name="rfid"
              className="form-input"
              value={formData.rfid || ''}
              onChange={handleChange}
              required
              disabled
            />
          </div>

          <div className="form-group">
            <label htmlFor="number" className="form-label">{"Salary (per month)"}</label>
            <input
              type="number"
              id="salary"
              name="salary"
              className="form-input"
              value={formData.salary || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group relative">
            <label htmlFor="password" className="form-label">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              className="form-input pr-12"
              value={formData.password || ''}
              onChange={handleChange}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-11 transform -translate-y-12 text-gray-600"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="department" className="form-label">Department</label>
            <select
              id="department"
              name="department"
              className='form-input'
              value={formData.department || ''}
              onChange={handleChange}
              required
            >
              {departments.length === 0 ? (
                <option value="">No departments available</option>
              ) : (
                <>
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Batch field removed as requested */}

          <div className="form-group">
            <label htmlFor="photo" className="form-label">Profile Photo (Optional)</label>
            <input
              type="file"
              id="photo"
              name="photo"
              className="form-input"
              onChange={handleProfilePhotoChange}
              accept="image/*"
            />
          </div>

          <div className="form-group">
            <label htmlFor="face-photo" className="form-label">Face Photos for Recognition ({capturedImages.length}/3)</label>
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: "user" }}
              className="w-full rounded-lg shadow mb-2"
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={captureImage}
              disabled={capturedImages.length >= 3}
            >
              Capture Photo
            </Button>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {capturedImages.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Captured Face ${index + 1}`}
                  className="rounded-lg border-2 border-green-500"
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end mt-6 space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isCapturing || capturedImages.length < 3}
            >
              {isCapturing ? <Spinner size="sm" /> : "Add Employee"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Employee: ${selectedWorker?.name}`}
      >
        <form onSubmit={handleEditWorker}>
          <div className="form-group">
            <label htmlFor="edit-name" className="form-label">Name</label>
            <input
              type="text"
              id="edit-name"
              name="name"
              className="form-input"
              value={formData.name || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-username" className="form-label">Username</label>
            <input
              type="text"
              id="edit-username"
              name="username"
              className="form-input"
              value={formData.username || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="edit-salary" className="form-label">Salary</label>
            <input
              type="number"
              id="edit-salary"
              name="salary"
              className="form-input"
              value={formData.salary || ''}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group relative">
            <label htmlFor="edit-password" className="form-label">New Password (optional)</label>
            <input
              type={showEditPassword ? 'text' : 'password'}
              id="edit-password"
              name="password"
              className="form-input pr-12"
              value={formData.password || ''}
              onChange={handleChange}
              placeholder="Leave blank to keep current password"
            />
            <button
              type="button"
              onClick={() => setShowEditPassword(v => !v)}
              className="absolute right-3 top-11 transform -translate-y-12 text-gray-600"
            >
              {showEditPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="form-group relative">
            <label htmlFor="edit-confirm-password" className="form-label">Confirm New Password</label>
            <input
              type={showEditConfirmPassword ? 'text' : 'password'}
              id="edit-confirm-password"
              name="confirmPassword"
              className="form-input pr-12"
              value={formData.confirmPassword || ''}
              onChange={handleChange}
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowEditConfirmPassword(v => !v)}
              className="absolute right-3 top-11 transform -translate-y-12 text-gray-600"
            >
              {showEditConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="edit-photo" className="form-label">Profile Photo (Optional)</label>
            <div className="flex items-center">
              {selectedWorker?.photo && (
                <img
                  src={selectedWorker.photo}
                  alt="Current Photo"
                  className="w-20 h-20 rounded-full object-cover mr-4"
                />
              )}
              <input
                type="file"
                id="edit-photo"
                name="photo"
                className="form-input"
                onChange={handleEditProfilePhotoChange}
                accept="image/*"
              />
            </div>
          </div>

          {/* Face Recognition Photos Section */}
          <div className="form-group">
            <label className="form-label">Face Recognition Photos</label>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
              <div className="flex items-center text-blue-700 text-sm mb-2">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                <strong>These photos are used for automatic attendance marking</strong>
              </div>
              <p className="text-blue-600 text-xs">
                Photos captured during 'Face Photos for Recognition' are stored here and used for face-based attendance.
              </p>
            </div>
            {(() => {
              console.log('Face photos display check:', {
                selectedWorker: selectedWorker?.name,
                hasFacePhotos: !!selectedWorker?.facePhotos,
                facePhotosLength: selectedWorker?.facePhotos?.length,
                facePhotosArray: selectedWorker?.facePhotos
              });
              return selectedWorker?.facePhotos && selectedWorker.facePhotos.length > 0;
            })() ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  {selectedWorker.facePhotos.map((facePhoto, index) => {
                    console.log(`Face photo ${index + 1} URL:`, facePhoto);
                    const photoUrl = facePhoto.startsWith('http') ? facePhoto : `https://ciphergate-backend.onrender.com${facePhoto}`;
                    return (
                      <div key={index} className="relative">
                        <img
                          src={photoUrl}
                          alt={`Face photo ${index + 1}`}
                          className="w-20 h-20 rounded-lg object-cover border-2 border-blue-200"
                          onError={(e) => {
                            console.error(`Failed to load face photo ${index + 1}:`, photoUrl);
                            e.target.style.border = '2px solid red';
                            e.target.alt = `Error loading photo ${index + 1}`;
                          }}
                          onLoad={() => {
                            console.log(`Successfully loaded face photo ${index + 1}:`, photoUrl);
                          }}
                        />
                        <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {index + 1}
                        </div>
                        {/* Add delete button for individual photo */}
                        <button
                          type="button"
                          onClick={() => handleDeleteIndividualFacePhoto(selectedWorker, index)}
                          className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          title="Delete this photo"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-green-700">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    Face recognition enrolled ({selectedWorker.facePhotos.length} photos)
                  </div>
                  <div className="text-xs text-gray-600">
                    ✓ Ready for attendance marking
                  </div>
                </div>
                {/* Add Edit Face Photos Button */}
                <div className="mt-4 flex flex-col sm:flex-row sm:space-x-4 space-y-2 sm:space-y-0">
                  <button
                    type="button"
                    onClick={() => openEnrollFaceModal(selectedWorker)}
                    className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FaUserShield className="mr-2" />
                    Update Face Photos
                  </button>
                  <p className="text-xs text-gray-500 mt-1 sm:mt-0">
                    Update replaces existing photos
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <div className="text-gray-500 mb-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M24 6v6m0 0v6m0-6h6m-6 0h-6" />
                    <circle cx={24} cy={24} r={20} />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  No face recognition photos enrolled
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Face photos are required for automatic attendance marking
                </p>
                <button
                  type="button"
                  onClick={() => openEnrollFaceModal(selectedWorker)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FaUserShield className="mr-2" />
                  Enroll Face Photos
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="edit-department" className="form-label">Department</label>
            <select
              id="edit-department"
              name="department"
              className="form-input"
              value={formData.department || ''}
              onChange={handleChange}
              required
            >
              {departments.map((dept) => (
                <option
                  key={dept._id}
                  value={dept._id}
                >
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch selection removed from Edit Employee form as requested */}

          <div className="flex justify-end mt-6 space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              Update Employee
            </Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Employee"
      >
        <p className="mb-4">
          Are you sure you want to delete <strong>{selectedWorker?.name}</strong>?
          This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteWorker}
          >
            Delete
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteIndividualFacePhotoModalOpen}
        onClose={() => setIsDeleteIndividualFacePhotoModalOpen(false)}
        title="Delete Face Photo"
      >
        <p className="mb-4">
          Are you sure you want to delete this face recognition photo for <strong>{selectedWorker?.name}</strong>?
        </p>
        <p className="mb-4 text-sm text-red-600">
          <strong>Warning:</strong> This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsDeleteIndividualFacePhotoModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDeleteIndividualFacePhoto}
          >
            Delete Photo
          </Button>
        </div>
      </Modal>

      {/* Add this new modal for deleting individual face photos */}
      <Modal
        isOpen={isDeleteIndividualFacePhotoModalOpen}
        onClose={() => setIsDeleteIndividualFacePhotoModalOpen(false)}
        title="Delete Face Photo"
      >
        <p className="mb-4">
          Are you sure you want to delete this face recognition photo for <strong>{selectedWorker?.name}</strong>?
        </p>
        <p className="mb-4 text-sm text-red-600">
          <strong>Warning:</strong> This action cannot be undone.
        </p>

        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsDeleteIndividualFacePhotoModalOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDeleteIndividualFacePhoto}
          >
            Delete Photo
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={isEnrollFaceModalOpen}
        onClose={() => setIsEnrollFaceModalOpen(false)}
        title={selectedWorker?.facePhotos && selectedWorker.facePhotos.length > 0 ? `Update Face Photos for ${selectedWorker?.name}` : `Enroll Face for ${selectedWorker?.name}`}
      >
        <FaceEnrollment 
          workerId={selectedWorker?._id} 
          onClose={() => setIsEnrollFaceModalOpen(false)}
          onEnrollmentSuccess={handleEnrollmentSuccess}
          isUpdating={selectedWorker?.facePhotos && selectedWorker.facePhotos.length > 0}
        />
      </Modal>
    </div>
  );
};

export default WorkerManagement;
