const API_BASE_URL = import.meta.env.VITE_API_URL || ''

async function fetchAPI<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers })
    const data = await response.json()
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return data
  } catch (err) {
    return { success: false, message: '서버 연결 실패' } as T
  }
}

export interface UserInfo { id: number; email: string; username: string; role: string }
export interface AuthResponse { success: boolean; message?: string; token?: string; user?: UserInfo }
export const registerAPI = (p: { email: string; password: string; username: string }) =>
  fetchAPI<AuthResponse>('/api/auth/register', { method: 'POST', body: JSON.stringify(p) })
export const loginAPI = (p: { email: string; password: string }) =>
  fetchAPI<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(p) })
export const getMeAPI = () => fetchAPI<{ success: boolean; user?: UserInfo }>('/api/auth/me')
export function logoutAPI() { localStorage.removeItem('token'); localStorage.removeItem('user') }

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
  return fetchAPI<{ success: boolean; posts: Post[]; pagination: any }>(`/api/posts?${qs}`)
}
export const getPostAPI = (id: number) =>
  fetchAPI<{ success: boolean; post: Post; comments: Comment[] }>(`/api/posts/${id}`)
export const createPostAPI = (data: Partial<Post>) =>
  fetchAPI<{ success: boolean; post: Post }>('/api/posts', { method: 'POST', body: JSON.stringify(data) })
export const deletePostAPI = (id: number) =>
  fetchAPI<{ success: boolean }>(`/api/posts/${id}`, { method: 'DELETE' })
export const addCommentAPI = (postId: number, content: string, parent_id?: number) =>
  fetchAPI<{ success: boolean; comment: Comment }>(`/api/posts/${postId}/comments`, {
    method: 'POST', body: JSON.stringify({ content, parent_id })
  })

export interface MediaItem {
  id: number; type: string; title: string; description: string; url: string
  thumbnail_url?: string; author: string; category: string; duration: string; is_active: boolean
}
export const getMediaAPI = (type?: string) =>
  fetchAPI<{ success: boolean; media: MediaItem[] }>(`/api/media${type ? '?type=' + type : ''}`)
export const createMediaAPI = (data: Partial<MediaItem>) =>
  fetchAPI<{ success: boolean; media: MediaItem }>('/api/media', { method: 'POST', body: JSON.stringify(data) })
export const updateMediaAPI = (id: number, data: Partial<MediaItem>) =>
  fetchAPI<{ success: boolean; media: MediaItem }>(`/api/media/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteMediaAPI = (id: number) =>
  fetchAPI<{ success: boolean }>(`/api/media/${id}`, { method: 'DELETE' })

export const getAdminStatsAPI = () => fetchAPI<any>('/api/admin/stats')
export const getAdminUsersAPI = () => fetchAPI<any>('/api/admin/users')
export const changeUserRoleAPI = (id: number, role: string) =>
  fetchAPI<any>(`/api/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) })
export const toggleUserAPI = (id: number) =>
  fetchAPI<any>(`/api/admin/users/${id}/toggle`, { method: 'PUT' })
export const getAdminPostsAPI = () => fetchAPI<any>('/api/admin/posts')
export const togglePinAPI = (id: number) =>
  fetchAPI<any>(`/api/admin/posts/${id}/pin`, { method: 'PUT' })
export const adminDeletePostAPI = (id: number) =>
  fetchAPI<any>(`/api/admin/posts/${id}`, { method: 'DELETE' })
export const getAdminCommentsAPI = () => fetchAPI<any>('/api/admin/comments')
export const adminDeleteCommentAPI = (id: number) =>
  fetchAPI<any>(`/api/admin/comments/${id}`, { method: 'DELETE' })