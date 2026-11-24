import { api } from './client';
import { IS_CLERK } from '../config/auth';
import { usersAPI } from './users';

export const authAPI = {
  // Citizen
  registerCitizen: (data) => api.post('/auth/citizen/register', data),
  loginCitizen: (data) => api.post('/auth/citizen/login', data),
  logoutCitizen: () => api.get('/auth/citizen/logout'),

  // Authority
  registerAuthority: (data) => api.post('/auth/authority/register', data),
  loginAuthority: (data) => api.post('/auth/authority/login', data),
  logoutAuthority: () => api.get('/auth/authority/logout'),

  // Admin
  loginAdmin: (data) => api.post('/auth/admin/login', data),
  logoutAdmin: () => api.post('/auth/admin/logout'),
  getAllAuthorities: () => api.get('/auth/admin/authorities'),

  // Update authority location
  updateLocation: (latitude, longitude) =>
    IS_CLERK
      ? usersAPI.updateLocation(latitude, longitude)
      : api.patch('/auth/authority/location', { latitude, longitude }),

  // Profile
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};
