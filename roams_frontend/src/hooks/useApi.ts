import axios from 'axios';
import { getServerUrl } from '@/services/api';

export function useApi() {
  const api = axios.create({
    baseURL: `${getServerUrl()}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add token to requests
  api.interceptors.request.use((config: any) => {
    const token = localStorage.getItem('token');
    if (token) {
      if (!config.headers) {
        config.headers = {};
      }
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  });

  return { api };
}
