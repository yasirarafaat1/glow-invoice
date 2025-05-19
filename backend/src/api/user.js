import API from './axios';

export const getCurrentUser = async () => {
  try {
    const response = await API.get('/users/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

export const updateProfile = async (userData) => {
  try {
    const response = await API.patch('/users/updateMe', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};