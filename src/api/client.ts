import axios from 'axios';

// Get token from localStorage — uses 'authToken' key consistently across the app
export const getAuthToken = () => {
  const token = localStorage.getItem('authToken');
  if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
    return null;
  }
  return token;
};
export const setAuthToken = (token: string) => localStorage.setItem('authToken', token);
export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
  delete apiClient.defaults.headers.common['Authorization'];
};

// Create the Axios client instance
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to automatically attach authorization token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    const isAuthRoute = config.url && (config.url.includes('auth/login') || config.url.includes('auth/register'));
    if (token && !isAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally and implement token refresh mechanism
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if error is 401 Unauthorized (invalid token / expired)
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      removeAuthToken();
      window.dispatchEvent(new Event('auth_logout'));
    }

    // Extract standardized custom error message from backend if available
    if (error.response && error.response.data && error.response.data.message) {
      error.message = error.response.data.message;
    } else if (error.response && error.response.data && error.response.data.detail) {
      error.message = error.response.data.detail;
    } else if (error.response && error.response.status === 429) {
      error.message = 'Too many requests. Please slow down and try again later.';
    } else if (error.message === 'Network Error') {
      error.message = 'Could not connect to the server. Please check your connection.';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
