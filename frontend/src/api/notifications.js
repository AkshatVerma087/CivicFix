import { api } from './client';

export const notificationsAPI = {
  // Get my notifications
  getMy: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    const qs = query.toString();
    return api.get(`/notifications/my${qs ? `?${qs}` : ''}`);
  },

  // Mark notification as read
  markRead: (id) => api.patch(`/notifications/${id}/read`, {}),
};
