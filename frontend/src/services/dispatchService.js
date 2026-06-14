import axiosInstance from '../api/axiosInstance';

export const updateStageStatus = async (orderId, stageNumber, status) => {
  const res = await axiosInstance.put('/dispatch/stage-status', { orderId, stageNumber, status });
  return res.data;
};

export const getWarehouses = async () => {
  const res = await axiosInstance.get('/warehouses');
  return res.data;
};

export const getGodowns = async () => {
  const res = await axiosInstance.get('/godowns');
  return res.data;
};

export const seedWarehouses = async () => {
  const res = await axiosInstance.post('/warehouses/seed');
  return res.data;
};

export const seedGodowns = async () => {
  const res = await axiosInstance.post('/godowns/seed');
  return res.data;
};
