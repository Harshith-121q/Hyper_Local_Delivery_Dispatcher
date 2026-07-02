const normalizeBaseUrl = (rawUrl) => {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '';
  let url = rawUrl.trim().replace(/\/+$/, '');
  if (url.toLowerCase().endsWith('/api')) {
    url = url.slice(0, -4).replace(/\/+$/, '');
  }
  return url;
};

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const rawSocketBaseUrl = import.meta.env.VITE_SOCKET_BASE_URL;

const API_BASE_URL = normalizeBaseUrl(rawApiBaseUrl) || 'https://hyper-local-delivery-dispatcher-ppc4.onrender.com';
const SOCKET_BASE_URL = normalizeBaseUrl(rawSocketBaseUrl) || API_BASE_URL;

export { API_BASE_URL, SOCKET_BASE_URL };
