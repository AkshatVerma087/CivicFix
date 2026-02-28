const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(endpoint, options = {}) {
  const token = getToken();

  const headers = { ...options.headers };

  // Don't set Content-Type for FormData (browser sets multipart boundary automatically)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  // Handle 401 - token expired/invalid
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired. Please login again.');
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  get: (endpoint, options = {}) => request(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  put: (endpoint, body, options = {}) =>
    request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  delete: (endpoint, options = {}) => request(endpoint, { ...options, method: 'DELETE' }),
};

// Decode JWT payload (no verification - just extract data)
export function decodeToken(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}
