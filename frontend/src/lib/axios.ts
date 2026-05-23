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

// Track if we're already refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic for the refresh endpoint itself to avoid infinite loops
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const refreshRes = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
          const newToken = refreshRes.data?.data?.access_token;
          if (newToken) {
            // Update the stored token
            const stored = localStorage.getItem('ai-setu-auth');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (parsed?.state) {
                  parsed.state.accessToken = newToken;
                  localStorage.setItem('ai-setu-auth', JSON.stringify(parsed));
                }
              } catch { /* ignore */ }
            }
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            onTokenRefreshed(newToken);
            isRefreshing = false;

            // Retry the original request with the new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          } else {
            throw new Error('No access token in refresh response');
          }
        } catch {
          isRefreshing = false;
          refreshSubscribers = [];
          // Refresh failed — session is truly expired
          localStorage.removeItem('ai-setu-auth');
          toast.error('Session expired — redirecting to login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1200);
          return Promise.reject(error);
        }
      } else {
        // Another request triggered refresh; queue this one until refresh completes
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }
    }

    return Promise.reject(error);
  }
);
