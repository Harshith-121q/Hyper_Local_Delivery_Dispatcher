import axios from 'axios';

// Prefer an explicit VITE_API_BASE_URL if provided; otherwise use localhost for now.
// This ensures the frontend talks to your local backend during development/testing
// and avoids calling the deployed Render URL unless you set the env var.
const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || 'https://hyper-local-delivery-dispatcher-ppc4.onrender.com';
const baseURL = `${envBaseUrl}/api`;

const axiosInstance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically inject JWT token into requests if available
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
