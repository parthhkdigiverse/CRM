import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState } from '../types';
import { apiClient } from '../lib/axios';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      
      login: (user, token, org) => {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        set({ 
          user, 
          accessToken: token, 
          organization: org || null, 
          isAuthenticated: true,
          isLoading: false 
        });
      },
      
      logout: () => {
        delete apiClient.defaults.headers.common['Authorization'];
        set({ 
          user: null, 
          accessToken: null, 
          organization: null, 
          isAuthenticated: false,
          isLoading: false
        });
      },
      
      setLoading: (isLoading) => set({ isLoading }),
      
      updateUser: (updatedFields) => 
        set((state) => ({ 
          user: state.user ? { ...state.user, ...updatedFields } : null 
        })),
    }),
    {
      name: 'ai-setu-auth',
      onRehydrateStorage: () => (state) => {
        if (state && state.accessToken) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${state.accessToken}`;
        }
        if (state) state.isLoading = false;
      },
    }
  )
);
