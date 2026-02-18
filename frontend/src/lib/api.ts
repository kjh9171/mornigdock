// ✅ 백엔드 API 베이스 URL (환경변수로 관리)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787'

// ─────────────────────────────────────────────
// 공통 fetch 래퍼 함수
// ─────────────────────────────────────────────
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; message?: string }> {
  const token = localStorage.getItem('token')

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    // ✅ 401 토큰 만료 시 자동 로그아웃
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    return data
  } catch (error) {
    console.error(`[API 오류] ${endpoint}:`, error)
    return {
      success: false,
      message: '서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.',
    }
  }
}

// ─────────────────────────────────────────────
// 인증 관련 API
// ─────────────────────────────────────────────
export interface RegisterPayload {
  email: string
  password: string
  username: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface UserInfo {
  id: number
  email: string
  username: string
  role: string
}

export interface AuthResponse {
  success: boolean
  message?: string
  token?: string
  user?: UserInfo
}

// ✅ 회원가입
export async function registerAPI(payload: RegisterPayload): Promise<AuthResponse> {
  const result = await fetchAPI<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return result as AuthResponse
}

// ✅ 로그인
export async function loginAPI(payload: LoginPayload): Promise<AuthResponse> {
  const result = await fetchAPI<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return result as AuthResponse
}

// ✅ 현재 사용자 정보 조회
export async function getMeAPI(): Promise<{ success: boolean; user?: UserInfo; message?: string }> {
  return await fetchAPI('/api/auth/me')
}

// ✅ 로그아웃 (로컬 토큰 삭제)
export function logoutAPI(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}