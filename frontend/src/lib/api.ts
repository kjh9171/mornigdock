import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// ── 무적의 하이브리드 데이터 타입 정의 ──────────────────────────────────────
export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'user';
  otp_enabled?: boolean;
}

export interface Post {
  id: number;
  title: string;
  content: string;
  description?: string;
  url?: string;
  image_url?: string;
  source_name?: string;
  source?: string;
  source_url?: string;
  category: string;
  is_pinned: boolean;
  ai_analysis?: string;
  published_at: string;
  created_at: string;
  // 구식 컴포넌트 호환용 필드 추가
  type?: string;
  author_id?: number;
  author_name?: string;
  view_count?: number;
  comment_count?: number;
  pinned?: boolean;
}

export interface Comment {
  id: number;
  news_id?: number;
  post_id?: number;
  parent_id: number | null;
  user_id: number;
  author_name: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  replies?: Comment[];
}

export interface StockInfo {
  id: number;
  symbol: string;
  name: string;
  price: number;
  change_val: number;
  change_rate: number;
  market_status: string;
  updated_at: string;
  // 구식 컴포넌트 호환용
  ai_summary?: string;
}

export interface MediaItem {
  id: number;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  description: string;
  url: string;
  thumbnail?: string;
  duration?: number;
  created_at: string;
  // 구식 컴포넌트 호환용
  author?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// 래퍼 함수들 (데이터 자동 추출)
export const getPostsAPI = (params?: any) => api.get('/news', { params }).then(res => res.data);
export const getPostAPI = (id: string | number) => api.get(`/news/${id}`).then(res => res.data);
export const registerAPI = (data: any) => api.post('/auth/register', data).then(res => res.data);
export const getAdminStatsAPI = () => api.get('/admin/dashboard').then(res => res.data);
export const getAdminUsersAPI = () => api.get('/admin/users').then(res => res.data);
export const getAdminPostsAPI = () => api.get('/news').then(res => res.data); 
export const adminDeletePostAPI = (id: number) => api.delete(`/news/${id}`).then(res => res.data);
export const createPostAPI = (data: any) => api.post('/news', data).then(res => res.data);
export const fetchNewsAPI = () => api.post('/news/fetch').then(res => res.data);
export const getStocksAPI = () => api.get('/stocks').then(res => res.data);
export const getMediaAPI = (type?: string) => api.get('/media', { params: { type } }).then(res => res.data);
export const createMediaAPI = (data: any) => api.post('/media', data).then(res => res.data);
export const deleteMediaAPI = (id: number) => api.delete(`/media/${id}`).then(res => res.data);

// 인자 개수 맞춤 호환성 강화
export const addCommentAPI = (newsId: number, content: string, parentId?: number | null) => 
  api.post('/comments', { newsId, content, parentId }).then(res => res.data);

export const updatePostAPI = (id: number, data: any) => api.put(`/news/${id}`, data).then(res => res.data);
export const deletePostAPI = (id: number) => api.delete(`/news/${id}`).then(res => res.data);
export const updatePostAnalysisAPI = (id: number, analysis: string) => 
  api.post(`/news/${id}/ai-report`, { analysis }).then(res => res.data);

// Interceptors
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ code?: string; message?: string }>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && error.response.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }
      original._retry = true;
      isRefreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data: refreshRes } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = refreshRes.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        processQueue(null, accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
