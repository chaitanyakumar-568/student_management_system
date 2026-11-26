import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// The JWT lives in an HTTP-only cookie (invisible to JS). The CSRF token is kept in memory only
// and is re-fetched from /auth/me after every page refresh.
let csrfToken = null;
let unauthorizedHandler = null;

export const setCsrfToken = (token) => {
  csrfToken = token || null;
};
export const setUnauthorizedHandler = (fn) => {
  unauthorizedHandler = fn;
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // send/receive the auth cookie cross-origin
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toLowerCase();
  if (csrfToken && !['get', 'head', 'options'].includes(method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/me') || url.includes('/auth/logout');
    if (error.response?.status === 401 && !isAuthCall && unauthorizedHandler) {
      unauthorizedHandler();
    }
    return Promise.reject(error);
  }
);

// Turns any axios error into { message, errors, status }.
export function parseApiError(error) {
  if (error.response) {
    const { data, status } = error.response;
    return {
      status,
      message: data?.message || 'Something went wrong. Please try again.',
      errors: data?.errors || {},
    };
  }
  if (error.code === 'ECONNABORTED') {
    return { status: 0, message: 'The request timed out. Please try again.', errors: {} };
  }
  return {
    status: 0,
    message: 'Cannot reach the server. Check your connection and that the API is running.',
    errors: {},
  };
}

export default api;
