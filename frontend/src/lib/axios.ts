import axios from 'axios';
import { toast } from 'sonner';

const API_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach token
apiClient.interceptors.request.use((config) => {
  const stored = localStorage.getItem('ai-setu-auth');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.accessToken) {
        config.headers.Authorization = `Bearer ${parsed.state.accessToken}`;
      }
    } catch {
      // ignore
    }
  }
  return config;
});

// Track if we're already redirecting to prevent multiple redirects
let isRedirecting = false;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Only auto-redirect on write operations (POST/PUT/DELETE), not background GETs
    const method = error.config?.method?.toUpperCase();
    const isWriteOp = method === 'POST' || method === 'PUT' || method === 'DELETE';

    if (error.response?.status === 401 && isWriteOp && !isRedirecting) {
      const stored = localStorage.getItem('ai-setu-auth');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed?.state?.accessToken) {
            isRedirecting = true;
            toast.error('Session expired — redirecting to login...');
            localStorage.removeItem('ai-setu-auth');
            setTimeout(() => {
              window.location.href = '/login';
              // Reset flag after redirect
              setTimeout(() => { isRedirecting = false; }, 3000);
            }, 1200);
          }
        } catch {
          // ignore
        }
      }
    }
    return Promise.reject(error);
  }
);
