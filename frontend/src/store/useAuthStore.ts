import { create } from 'zustand';
import api from '../lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'user';
  otp_enabled: boolean;
}

interface LoginResponse {
  success: boolean;
  requireOtp?: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
  message?: string;
}

interface RegisterResponse {
  success: boolean;
  message?: string;
  data?: {
    user: User;
    qrCode: string;
    otpSecret: string;
  }
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login:    (email: string, password: string, otpCode?: string) => Promise<LoginResponse>;
  register: (email: string, password: string, name: string) => Promise<RegisterResponse>;
  logout:   () => Promise<void>;
  fetchMe:  () => Promise<void>;
  setUser:  (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password, otpCode) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password, otpCode });
      if (data.data?.requireOtp || data.requireOtp) {
        set({ isLoading: false });
        return { success: data.success ?? false, requireOtp: true, message: data.message };
      }
      const { accessToken, refreshToken, user } = data.data;
      localStorage.setItem('accessToken',  accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, isAuthenticated: true, isLoading: false });
      return { success: true, accessToken, refreshToken, user };
    } catch (err: any) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message ?? '로그인 실패' };
    }
  },

  register: async (email, password, name) => {
    try {
      const { data } = await api.post('/auth/register', { email, password, name });
      return { success: data.success, message: data.message, data: data.data };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message ?? '회원가입 실패' };
    }
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken });
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },

  setUser: (user) => set({ user }),
}));
