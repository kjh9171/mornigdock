import axios from 'axios';

// 백엔드 API의 기본 URL을 설정합니다.
// 개발 환경에서는 Vite 프록시를 통해 백엔드로 요청이 전달됩니다.
// 프로덕션 환경에서는 Nginx가 프록시 역할을 수행하거나, 직접 백엔드 URL을 지정합니다.
const BASE_URL = import.meta.env.VITE_API_URL ?? '';
const API_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

export const api = axios.create({
  baseURL: API_URL, // 중복 /api 방지
  withCredentials: true,       // JWT 토큰 등을 주고받을 때 필요합니다.
});

// 요청 인터셉터: 모든 요청 헤더에 JWT 액세스 토큰을 자동으로 추가합니다.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터: 401 Unauthorized 에러 발생 시 리프레시 토큰을 사용하여 액세스 토큰을 갱신합니다.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    // 401 에러이고, 이미 재시도한 요청이 아니며, 로그인 또는 토큰 갱신 요청이 아닐 때만 처리
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/login') && !originalRequest.url.includes('/auth/refresh')) {
      originalRequest._retry = true; // 재시도 플래그 설정
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          // 리프레시 토큰을 사용하여 새 액세스 토큰 요청
          const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken: newAccessToken, refreshToken: newRefreshToken } = res.data.data;

          localStorage.setItem('accessToken', newAccessToken);
          localStorage.setItem('refreshToken', newRefreshToken);

          // 새 토큰으로 원래 요청 재시도
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // 리프레시 토큰 갱신 실패 시 로그아웃 처리
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login'; // 로그인 페이지로 리다이렉트
          return Promise.reject(refreshError);
        }
      } else {
        // 리프레시 토큰이 없으면 로그인 페이지로 리다이렉트
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 재사용 가능한 API 호출 함수들 (추후 추가)
export const getNotificationsAPI = async () => (await api.get('/notifications')).data;
export const getNewsAPI = async (params?: any) => (await api.get('/news', { params })).data;
