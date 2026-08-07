import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token!)));
  failedQueue = [];
}

api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original.headers!.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = Cookies.get('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newTokens = data.data || data;

        Cookies.set('accessToken', newTokens.accessToken, {
          expires: 1 / 96,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });
        Cookies.set('refreshToken', newTokens.refreshToken, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
        });

        api.defaults.headers.common.Authorization = `Bearer ${newTokens.accessToken}`;
        processQueue(null, newTokens.accessToken);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export function setAuthTokens(accessToken: string, refreshToken: string) {
  Cookies.set('accessToken', accessToken, {
    expires: 1 / 96,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  Cookies.set('refreshToken', refreshToken, {
    expires: 7,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
}

export function clearAuthTokens() {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  delete api.defaults.headers.common.Authorization;
}

export function getAccessToken(): string | undefined {
  return Cookies.get('accessToken');
}

export default api;
