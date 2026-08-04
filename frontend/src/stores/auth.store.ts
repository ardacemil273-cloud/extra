import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens } from '@/types';
import api, { setAuthTokens, clearAuthTokens } from '@/lib/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (usernameOrEmail: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  setTokens: (tokens: AuthTokens) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (usernameOrEmail, password) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { usernameOrEmail, password });
          const tokens: AuthTokens = data.data || data;
          setAuthTokens(tokens.accessToken, tokens.refreshToken);
          set({ isAuthenticated: true });
          await get().loadCurrentUser();
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (username, email, password, displayName) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { username, email, password, displayName });
          const tokens: AuthTokens = data.data || data;
          setAuthTokens(tokens.accessToken, tokens.refreshToken);
          set({ isAuthenticated: true });
          await get().loadCurrentUser();
        } finally {
          set({ isLoading: false });
        }
      },

      loginAsGuest: async () => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/guest');
          const tokens: AuthTokens = data.data || data;
          setAuthTokens(tokens.accessToken, tokens.refreshToken);
          set({ isAuthenticated: true });
          await get().loadCurrentUser();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const Cookies = (await import('js-cookie')).default;
        const refreshToken = Cookies.get('refreshToken');
        try {
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } catch {}
        clearAuthTokens();
        set({ user: null, isAuthenticated: false });
      },

      loadCurrentUser: async () => {
        try {
          const { data } = await api.get('/auth/me');
          const user: User = data.data || data;

          const profileData = await api.get('/profile/me');
          const profile = (profileData.data.data || profileData.data);

          set({ user: { ...user, profile: profile.profile || profile, statistics: profile.user?.statistics }, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
          clearAuthTokens();
        }
      },

      setTokens: (tokens) => {
        setAuthTokens(tokens.accessToken, tokens.refreshToken);
        set({ isAuthenticated: true });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'partyverse-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
