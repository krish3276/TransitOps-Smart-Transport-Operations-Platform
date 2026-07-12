import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api.js';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('transitops_token', data.token);
        set({ user: data, token: data.token, isAuthenticated: true });
        return data;
      },

      register: async (payload) => {
        const { data } = await api.post('/auth/register', payload);
        localStorage.setItem('transitops_token', data.token);
        set({ user: data, token: data.token, isAuthenticated: true });
        return data;
      },

      logout: () => {
        localStorage.removeItem('transitops_token');
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({ user: { ...state.user, ...updates } })),
    }),
    { name: 'transitops-auth', partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }) }
  )
);

export default useAuthStore;
