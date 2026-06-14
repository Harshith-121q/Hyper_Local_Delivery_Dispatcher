import axiosInstance from '../api/axiosInstance';

export const getAgents = async () => {
  const res = await axiosInstance.get('/agents');
  return res.data;
};

export const updateAgentStatus = async (agentId, availability) => {
  const res = await axiosInstance.put(`/agents/${agentId}/status`, { availability });
  return res.data;
};

export const seedAgents = async () => {
  const res = await axiosInstance.post('/agents/seed');
  return res.data;
};
