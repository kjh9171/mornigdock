import { create } from 'zustand';
import { api } from '../lib/api';

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
  };
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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: !!localStorage.getItem('accessToken'),

  login: async (email, password, otpCode) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password, otpCode });
      const data = res.data;

      if (data.requireOtp) {
        return { success: true, requireOtp: true, message: data.message };
      }

      if (data.success && data.data) {
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        set({ user: data.data.user, isAuthenticated: true });
        return { success: true, user: data.data.user };
      }
      return { success: false, message: data.message || '로그인 실패' };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message ?? '로그인 실패' };
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', { email, password, name });
      const data = res.data;
      if (data.success) {
        return { success: true, data: data.data };
      }
      return { success: false, message: data.message || '회원가입 실패' };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message ?? '회원가입 실패' };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        set({ user: res.data.data, isAuthenticated: true });
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false });
      }
    } catch (err) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false });
    }
  },

  setUser: (user) => set({ user }),
}));
