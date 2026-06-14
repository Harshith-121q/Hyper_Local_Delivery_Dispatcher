import axiosInstance from '../api/axiosInstance';

export const getNotifications = async () => {
  const res = await axiosInstance.get('/notifications');
  return res.data;
};

export const markAsRead = async (id) => {
  const res = await axiosInstance.put(`/notifications/${id}/read`);
  return res.data;
};

export const markAllAsRead = async () => {
  const res = await axiosInstance.put('/notifications/read');
  return res.data;
};
