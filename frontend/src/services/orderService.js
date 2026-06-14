import axiosInstance from '../api/axiosInstance';

export const createOrder = async (products) => {
  const res = await axiosInstance.post('/orders', { products });
  return res.data;
};

export const getCustomerOrders = async () => {
  const res = await axiosInstance.get('/orders/customer');
  return res.data;
};

export const getAgentOrders = async () => {
  const res = await axiosInstance.get('/orders/agent');
  return res.data;
};

export const getAllOrders = async () => {
  const res = await axiosInstance.get('/orders/all');
  return res.data;
};

export const getOrderDetails = async (id) => {
  const res = await axiosInstance.get(`/orders/${id}`);
  return res.data;
};

export const seedProducts = async () => {
  const res = await axiosInstance.post('/orders/seed-products');
  return res.data;
};

export const getProducts = async () => {
  const res = await axiosInstance.get('/orders/products');
  return res.data;
};

export const getWarehouseOrders = async () => {
  const res = await axiosInstance.get('/orders/warehouse');
  return res.data;
};

export const getGodownOrders = async () => {
  const res = await axiosInstance.get('/orders/godown');
  return res.data;
};

export const getAvailableHubOrders = async () => {
  const res = await axiosInstance.get('/orders/available/hub');
  return res.data;
};

export const getAvailablePartnerOrders = async () => {
  const res = await axiosInstance.get('/orders/available/partner');
  return res.data;
};

export const assignHubDriverOrder = async (id, godownId) => {
  const res = await axiosInstance.post(`/orders/${id}/assign-hub`, { godownId });
  return res.data;
};

export const claimDeliveryPartnerOrder = async (id) => {
  const res = await axiosInstance.post(`/orders/${id}/claim-partner`);
  return res.data;
};

export const deleteOrder = async (id) => {
  const res = await axiosInstance.delete(`/orders/${id}`);
  return res.data;
};
