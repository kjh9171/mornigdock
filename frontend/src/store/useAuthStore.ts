import { create } from 'zustand';
// import { api } from '../lib/api'; // api 모듈은 나중에 구현합니다.

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email, password, otpCode) => {
    set({ isLoading: true });
    try {
      // API 호출 로직은 나중에 구현
      console.log('Login attempt:', email, password, otpCode);
      // 임시 응답 (성공)
      return { success: true, user: { id: 1, email, name: 'Agent', role: 'user', otp_enabled: false } };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message ?? '로그인 실패' };
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      // API 호출 로직은 나중에 구현
      console.log('Register attempt:', email, password, name);
      // 임시 응답 (성공)
      return { success: true, data: { user: { id: 1, email, name, role: 'user', otp_enabled: false }, qrCode: 'temp_qr_code', otpSecret: 'temp_secret' } };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message ?? '회원가입 실패' };
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    // API 호출 로직은 나중에 구현
    console.log('Logout');
    set({ user: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    // API 호출 로직은 나중에 구현
    console.log('Fetch Me');
    set({ user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),
}));
