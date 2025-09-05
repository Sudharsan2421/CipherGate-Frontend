import api from '../hooks/useAxios';
import { getAuthToken } from '../utils/authUtils';
import uploadUtils from '../utils/uploadUtils';

export const getUniqueId = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token available');
      return [];
    }

    const response = await api.get('/workers/generate-id', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    console.log(response.data);

    return response.data || [];
  } catch (error) {
    console.error('Workers fetch error:', error);
    return [];
  }
};

export const createWorker = async (workerData) => {
  try {
    console.log('Worker data:', workerData);
    const token = getAuthToken();

    // Enhanced client-side validation
    if (!workerData.name || workerData.name.trim() === '') {
      throw new Error('Name is required and cannot be empty');
    }
    if (!workerData.username || workerData.username.trim() === '') {
      throw new Error('Username is required and cannot be empty');
    }
    if (!workerData.subdomain || workerData.subdomain.trim() === '') {
      throw new Error('Subdomain is missing, please check the url');
    }
    if (!workerData.password || workerData.password.trim() === '') {
      throw new Error('Password is required and cannot be empty');
    }
    if (!workerData.salary || workerData.salary.trim() === '') {
      throw new Error('Salary is required and cannot be empty');
    }
    if (!workerData.department) {
      throw new Error('Department is required');
    }
    if (!workerData.batch) {
      throw new Error('Batch is required');
    }

    // Step 1: Create the worker without face photos first
    const basicFormData = new FormData();
    basicFormData.append('name', workerData.name);
    basicFormData.append('username', workerData.username);
    basicFormData.append('rfid', workerData.rfid);
    basicFormData.append('salary', workerData.salary);
    basicFormData.append('password', workerData.password);
    basicFormData.append('subdomain', workerData.subdomain);
    basicFormData.append('department', workerData.department);
    basicFormData.append('batch', workerData.batch);
    
    // Add profile photo if provided
    if (workerData.photo) {
      console.log('Adding profile photo:', {
        type: typeof workerData.photo,
        isBlob: workerData.photo instanceof Blob,
        isFile: workerData.photo instanceof File,
        size: workerData.photo?.size
      });
      basicFormData.append('photo', workerData.photo);
    }

    console.log('Sending basic worker data');
    const response = await api.post('/workers', basicFormData, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const newWorker = response.data;
    console.log('Worker created successfully:', newWorker);
    
    // Step 2: If worker created successfully and there are face photos, upload them
    if (newWorker && workerData.facePhotos && Array.isArray(workerData.facePhotos) && workerData.facePhotos.length > 0) {
      console.log(`Uploading ${workerData.facePhotos.length} face photos for new worker`);
      
      let successCount = 0;
      for (let i = 0; i < workerData.facePhotos.length; i++) {
        const facePhoto = workerData.facePhotos[i];
        if (facePhoto instanceof Blob && facePhoto.size > 0) {
          try {
            // Use the same code pattern as the working FaceEnrollment component
            const imageSrc = URL.createObjectURL(facePhoto);
            const blob = await fetch(imageSrc).then(res => res.blob());

            const faceFormData = new FormData();
            faceFormData.append('workerId', newWorker._id);
            faceFormData.append('subdomain', workerData.subdomain);
            faceFormData.append('face_photo', blob);
            
            // Debugging: Log FormData contents
            console.log(`Face photo ${i+1} FormData contents:`);
            for (let pair of faceFormData.entries()) {
              if (pair[1] instanceof Blob) {
                console.log(pair[0] + ': Blob(' + pair[1].size + ' bytes, ' + pair[1].type + ')');
              } else {
                console.log(pair[0] + ': ' + pair[1]);
              }
            }
            
            const enrollResponse = await api.post('/workers/enroll-face', faceFormData, {
              headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': `Bearer ${token}`
              },
            });
            
            console.log(`Successfully uploaded face photo ${i+1}:`, enrollResponse.data);
            successCount++;
          } catch (error) {
            console.error(`Error uploading face photo ${i+1}:`, error);
            if (error.response) {
              console.error(`Error response for face photo ${i+1}:`, {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
              });
            }
          }
        }
      }
      
      console.log(`Successfully uploaded ${successCount} of ${workerData.facePhotos.length} face photos`);
      
      // Step 3: Fetch the updated worker data with face photos
      if (successCount > 0) {
        try {
          const updatedWorkerResponse = await api.get(`/workers/${newWorker._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          return {
            ...updatedWorkerResponse.data,
            facePhotosCount: successCount,
            message: `Employee created successfully with ${successCount} face photos`
          };
        } catch (error) {
          console.error('Error fetching updated worker data:', error);
          return {
            ...newWorker,
            facePhotosCount: successCount,
            message: `Employee created successfully with ${successCount} face photos`
          };
        }
      }
    }
    
    return newWorker;
  } catch (error) {
    console.error('Worker creation error:', error.response?.data || error);
    throw error.response?.data || new Error('Failed to create worker');
  }
};

export const getWorkers = async (subdomain) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token available');
      return [];
    }

    const response = await api.post('/workers/all', subdomain, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data || [];
  } catch (error) {
    console.error('Workers fetch error:', error);
    return [];
  }
};

export const getPublicWorkers = async (subdomain) => {
  try {
    const token = getAuthToken();
    const response = await api.post('/workers/public', subdomain, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data || [];
  } catch (error) {
    console.error('Public workers fetch error:', error);
    return [];
  }
};

export const getWorkerById = async (id) => {
  try {
    const token = getAuthToken();
    if (!token) {
      console.warn('No auth token available');
      return null;
    }

    const response = await api.get(`/workers/${id}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data || null;
  } catch (error) {
    console.error('Fetch worker by ID error:', error);
    throw error.response?.data || new Error('Failed to fetch worker');
  }
};

export const updateWorker = async (id, workerData) => {
  try {
    const token = getAuthToken();
    const formData = new FormData();

    // Temporarily disable photo upload due to Supabase configuration issue
    // if (workerData.photo) {
    //   const urlResponse = await uploadUtils(workerData.photo);
    //   workerData.photo = urlResponse;
    // }
    
    if (workerData.photo) {
      workerData.photo = null; // or keep existing photo URL
      console.warn('Photo upload disabled - Supabase configuration issue');
    }

    const response = await api.put(`/workers/${id}`, workerData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Update Worker Error:', {
      response: error.response,
      data: error.response?.data,
      status: error.response?.status
    });
    throw error.response ? error.response.data : new Error('Failed to update worker');
  }
};
export const deleteWorker = async (id) => {
  try {
    const token = getAuthToken(); // Get the authentication token
    const response = await api.delete(`/workers/${id}`, {
      headers: { Authorization: `Bearer ${token}` } // Add authorization header
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Failed to delete worker');
  }
};

// Add this new function to clear face photos
export const clearWorkerFacePhotos = async (id) => {
  try {
    const token = getAuthToken();
    const response = await api.delete(`/workers/${id}/face-photos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Failed to clear face photos');
  }
};

// Add this new function
export const deleteWorkerFacePhotos = async (id) => {
  try {
    const token = getAuthToken();
    const response = await api.delete(`/workers/${id}/face-photos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Failed to delete face photos');
  }
};

// Add this new function for deleting individual face photos
export const deleteIndividualFacePhoto = async (id, photoIndex) => {
  try {
    const token = getAuthToken();
    const response = await api.delete(`/workers/${id}/face-photos/${photoIndex}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Failed to delete face photo');
  }
};
