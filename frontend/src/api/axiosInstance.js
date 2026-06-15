import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'https://hyper-local-delivery-dispatcher-ppc4.onrender.com',
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
