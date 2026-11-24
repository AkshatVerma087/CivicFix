import { api } from './client';

// Go backend (/api/v1) user endpoints, used in Clerk mode.
export const usersAPI = {
  getMe: () => api.get('/me'),
  onboard: (data) => api.post('/me/onboarding', data),
  updateLocation: (latitude, longitude) => api.patch('/me/location', { latitude, longitude }),
  promoteToAdmin: (userId) => api.post(`/admin/users/${encodeURIComponent(userId)}/promote`, {}),
};

// Map the Go user ({ id, role, name, email, citizen, authority }) to the shape
// the pages already use ({ _id, role, name, email, address, department, zone, location, ... }).
export function toAppUser(u) {
  if (!u) return null;
  return {
    _id: u.id,
    role: u.role,
    name: u.name,
    email: u.email,
    ...(u.citizen && { address: u.citizen.address }),
    ...(u.authority && {
      phone: u.authority.phone,
      department: u.authority.department,
      zone: u.authority.zone,
      location: u.authority.location || null,
      isVerified: u.authority.isVerified,
    }),
  };
}
