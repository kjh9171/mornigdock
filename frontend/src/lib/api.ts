import axios from 'axios'

// ✅ API 호출의 기준점 설정 (Vite Proxy 사용 시 빈 문자열로 두어 상대 경로 처리)
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

// ─────────────────────────────────────────────────────────────────────────────
// 공통 API 호출 함수: 인증 토큰 주입 및 에러 처리 통합
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAPI<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    // endpoint에 /api가 누락된 경우 자동으로 추가하여 프록시가 작동하게 함
    const safeEndpoint = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`
    
    const response = await fetch(`${API_BASE_URL}${safeEndpoint}`, { ...options, headers })
    
    // 응답 텍스트를 먼저 확인하여 JSON 파싱 에러 방지
    const text = await response.text()
    const data = text ? JSON.parse(text) : {}

    // 인증 만료(401) 처리
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    if (!response.ok) {
      return { success: false, message: data.message || '요청 실패' } as T
    }

    return data
  } catch (err) {
    console.error('CERT 통신 장애 로그:', err)
    return { success: false, message: '서버 연결 실패' } as T
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 인터페이스 및 API 엔드포인트 정의 (Agora 서비스 기준)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserInfo { id: number; email: string; username: string; role: string; isAdmin?: boolean }
export interface AuthResponse { success: boolean; message?: string; token?: string; user?: UserInfo }

// 인증 관련
export const registerAPI = (p: { email: string; password: string; username: string }) =>
  fetchAPI<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(p) })
export const loginAPI = (p: { email: string; password: string }) =>
  fetchAPI<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(p) })
export const getMeAPI = () => fetchAPI<{ success: boolean; user?: UserInfo }>('/auth/me')
export function logoutAPI() { localStorage.removeItem('token'); localStorage.removeItem('user') }

// 게시글 관련
export interface Post {
  id: number; type: string; category: string; title: string; content: string
  author_name: string; author_id?: number; pinned: boolean; view_count: number
  like_count: number; source?: string; comment_count?: number; created_at: string
}
export interface Comment {
  id: number; post_id: number; parent_id: number | null; author_name: string
  content: string; is_deleted: boolean; reported: boolean; created_at: string
}
export const getPostsAPI = (params: Record<string, string | number>) => {
  const qs = new URLSearchParams(params as any).toString()
  return fetchAPI<{ success: boolean; posts: Post[]; pagination: any }>(`/posts?${qs}`)
}
export const getPostAPI = (id: number) =>
  fetchAPI<{ success: boolean; post: Post; comments: Comment[] }>(`/posts/${id}`)
export const createPostAPI = (data: Partial<Post>) =>
  fetchAPI<{ success: boolean; post: Post }>('/posts', { method: 'POST', body: JSON.stringify(data) })
export const deletePostAPI = (id: number) =>
  fetchAPI<{ success: boolean }>(`/posts/${id}`, { method: 'DELETE' })
export const addCommentAPI = (postId: number, content: string, parent_id?: number) =>
  fetchAPI<{ success: boolean; comment: Comment }>(`/posts/${postId}/comments`, {
    method: 'POST', body: JSON.stringify({ content, parent_id })
  })

// 미디어 센터 관련
export interface MediaItem {
  id: number; type: string; title: string; description: string; url: string
  thumbnail_url?: string; author: string; category: string; duration: string; is_active: boolean
}
export const getMediaAPI = (type?: string) =>
  fetchAPI<{ success: boolean; media: MediaItem[] }>(`/media${type ? '?type=' + type : ''}`)
export const createMediaAPI = (data: Partial<MediaItem>) =>
  fetchAPI<{ success: boolean; media: MediaItem }>('/media', { method: 'POST', body: JSON.stringify(data) })
export const updateMediaAPI = (id: number, data: Partial<MediaItem>) =>
  fetchAPI<{ success: boolean; media: MediaItem }>(`/media/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteMediaAPI = (id: number) =>
  fetchAPI<{ success: boolean }>(`/media/${id}`, { method: 'DELETE' })

// 관리자 패널 전용
export const getAdminStatsAPI = () => fetchAPI<any>('/admin/stats')
export const getAdminUsersAPI = () => fetchAPI<any>('/admin/users')
export const changeUserRoleAPI = (id: number, role: string) =>
  fetchAPI<any>(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
export const toggleUserAPI = (id: number) =>
  fetchAPI<any>(`/admin/users/${id}/toggle`, { method: 'PUT' })
export const getAdminPostsAPI = () => fetchAPI<any>('/admin/posts')
export const togglePinAPI = (id: number) =>
  fetchAPI<any>(`/admin/posts/${id}/pin`, { method: 'PUT' })
export const adminDeletePostAPI = (id: number) =>
  fetchAPI<any>(`/admin/posts/${id}`, { method: 'DELETE' })
export const getAdminCommentsAPI = () => fetchAPI<any>('/admin/comments')
export const adminDeleteCommentAPI = (id: number) =>
  fetchAPI<any>(`/admin/comments/${id}`, { method: 'DELETE' })