import axios from 'axios';

const renderBaseUrl = 'https://hyper-local-delivery-dispatcher-ppc4.onrender.com';
const envBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '') || (import.meta.env.MODE === 'production' ? renderBaseUrl : 'http://localhost:5000');
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
