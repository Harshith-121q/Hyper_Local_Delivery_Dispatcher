const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, '')
  || 'https://hyper-local-delivery-dispatcher-ppc4.onrender.com';

const SOCKET_BASE_URL = import.meta.env.VITE_SOCKET_BASE_URL?.replace(/\/+$/, '')
  || API_BASE_URL;

export { API_BASE_URL, SOCKET_BASE_URL };
