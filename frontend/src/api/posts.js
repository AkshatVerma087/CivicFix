import { api } from './client';

export const postsAPI = {
  // Get all posts (with optional query params)
  getAll: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.status) query.set('status', params.status);
    if (params.category) query.set('category', params.category);
    if (params.sortBy) query.set('sortBy', params.sortBy);
    if (params.sortOrder) query.set('sortOrder', params.sortOrder);
    if (params.lat) query.set('lat', params.lat);
    if (params.lng) query.set('lng', params.lng);
    if (params.radius) query.set('radius', params.radius);
    if (params.assignedTo) query.set('assignedTo', params.assignedTo);
    const qs = query.toString();
    return api.get(`/posts${qs ? `?${qs}` : ''}`);
  },

  // Get my posts
  getMyPosts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    const qs = query.toString();
    return api.get(`/posts/my-posts${qs ? `?${qs}` : ''}`);
  },

  // Get posts summary (counts)
  getSummary: () => api.get('/posts/summary'),

  // Get single post
  getById: (id) => api.get(`/posts/${id}`),

  // Create post (multipart form data)
  create: (formData) => api.post('/posts/create', formData),

  // Update post status
  updateStatus: (id, status, statusNote) => {
    const body = { status };
    if (statusNote) body.statusNote = statusNote;
    return api.patch(`/posts/${id}`, body);
  },

  // Delete post
  delete: (id) => api.delete(`/posts/${id}`),

  // Assign post to authority (admin only)
  assign: (id, authorityId) => api.patch(`/posts/${id}/assign`, { authorityId }),

  // Upvote
  upvote: (id) => api.post(`/posts/${id}/upvote`, {}),

  // Remove upvote
  removeUpvote: (id) => api.delete(`/posts/${id}/upvote`),

  // Get comments
  getComments: (id) => api.get(`/posts/${id}/comments`),

  // Add comment
  addComment: (id, text) => api.post(`/posts/${id}/comments`, { text }),

  // Delete comment
  deleteComment: (postId, commentId) => api.delete(`/posts/${postId}/comments/${commentId}`),
  // Confirm resolution (citizen accepts the fix)
  confirmResolution: (id) => api.post(`/posts/${id}/confirm-resolution`, {}),

  // Reject resolution (citizen says issue is not fixed)
  rejectResolution: (id) => api.post(`/posts/${id}/reject-resolution`, {}),

  // Analytics
  getAnalytics: () => api.get('/posts/analytics'),

  // Leaderboard
  getLeaderboard: () => api.get('/posts/leaderboard'),
};
