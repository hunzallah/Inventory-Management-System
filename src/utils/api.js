import axios from 'axios';

const isElectron = window.location.protocol === 'file:';
const API_BASE = isElectron
  ? `http://localhost:${window.electronAPI?.serverPort || 3001}/api`
  : `http://localhost:3001/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

export default api;

export const API_ORIGIN = API_BASE.replace('/api', '');
