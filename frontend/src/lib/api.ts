import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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
  category: string;
  type?: string;
  author_id?: number;
  author_name?: string;
  view_count?: number;
  comment_count?: number;
  is_pinned?: boolean;
  published_at?: string;
  created_at: string;
  ai_report?: any;
  ai_analysis?: string;
  source?: string;
  source_name?: string;
  source_url?: string;
  url?: string;
  image_url?: string;
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
  author?: string;
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

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? '';

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ── 게시판 (Board) ─
export const getPostsAPI = (params?: any) => api.get('/posts', { params }).then(res => res.data);
export const getPostAPI  = (id: string | number) => api.get(`/posts/${id}`).then(res => res.data);
export const createPostAPI = (data: any) => api.post('/posts', data).then(res => res.data);
export const updatePostAPI = (id: number | string, data: any) => api.put(`/posts/${id}`, data).then(res => res.data);
export const deletePostAPI = (id: number) => api.delete(`/admin/posts/${id}`).then(res => res.data);

// ── 뉴스 (News) ──
export const getNewsAPI  = (params?: any) => api.get('/news', { params }).then(res => res.data);
export const getNewsDetailAPI = (id: string | number) => api.get(`/news/${id}`).then(res => res.data);
export const fetchNewsAPI = () => api.post('/news/fetch').then(res => res.data);
export const deleteNewsAPI = (id: number) => api.delete(`/admin/news/${id}`).then(res => res.data);
export const updateNewsAPI = (id: number | string, data: any) => api.put(`/news/${id}`, data).then(res => res.data);

// ── 관리자 (Admin) ──
export const getAdminStatsAPI = () => api.get('/admin/dashboard').then(res => res.data);
export const getAdminUsersAPI = () => api.get('/admin/users').then(res => res.data);
export const getAdminNewsAPI  = () => api.get('/admin/news').then(res => res.data);
export const getAdminPostsAPI = () => api.get('/admin/posts').then(res => res.data);
export const getAdminLogsAPI  = (page = 1) => api.get('/admin/logs', { params: { page } }).then(res => res.data);
export const addAdminUserAPI = (data: any) => api.post('/admin/users', data).then(res => res.data);
export const deleteAdminUserAPI = (id: number) => api.delete(`/admin/users/${id}`).then(res => res.data);
export const getAdminMediaAPI = () => api.get('/admin/media').then(res => res.data);
export const addAdminMediaAPI = (data: any) => api.post('/admin/media', data).then(res => res.data);

// ── 구식 호환용 에일리어스 ──
export const adminDeletePostAPI = deleteNewsAPI;
export const updatePostAnalysisAPI = (id: number, analysis: string) => 
  api.post(`/news/${id}/ai-report`, { analysis }).then(res => res.data);

// ── 인증 (Auth) ──
export const registerAPI = (data: any) => api.post('/auth/register', data).then(res => res.data);

// ── 주식 & 미디어 ──
export const getStocksAPI = () => api.get('/stocks').then(res => res.data);
export const getMediaAPI  = (type?: string) => api.get('/media', { params: { type } }).then(res => res.data);
export const createMediaAPI = (data: any) => api.post('/media', data).then(res => res.data);
export const deleteMediaAPI = (id: number) => api.delete(`/media/${id}`).then(res => res.data);

// ── 댓글 ──
export const addCommentAPI = (newsId: number | null, postId: number | null, content: string, parentId?: number | null) => 
  api.post('/comments', { newsId, postId, content, parentId }).then(res => res.data);

// Interceptors
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ code?: string; message?: string }>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');
        const { data: refreshRes } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        const { accessToken, refreshToken: newRefresh } = refreshRes.data;
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefresh);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (err) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
