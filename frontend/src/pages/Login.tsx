import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ✅ 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('') // 입력 시 에러 메시지 초기화
  }

  // ✅ 로그인 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 클라이언트 유효성 검사
    if (!form.email || !form.password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)

    try {
      const res = await loginAPI({
        email: form.email.trim(),
        password: form.password,
      })

      if (res.success && res.token && res.user) {
        // ✅ 인증 상태 저장
        setAuth(res.token, res.user)
        navigate('/') // 메인 페이지로 이동
      } else {
        setError(res.message || '로그인에 실패했습니다.')
      }
    } catch {
      setError('서버 연결에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">MorningDock</h1>
          <p className="mt-2 text-stone-500 text-sm">매일 아침, 세상의 흐름을 읽다</p>
        </div>

        {/* 로그인 카드 */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-6">로그인</h2>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           transition-all duration-200"
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           transition-all duration-200"
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300
                         text-white font-medium rounded-lg text-sm
                         transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  로그인 중...
                </span>
              ) : (
                '로그인'
              )}
            </button>
          </form>

          {/* 회원가입 링크 */}
          <p className="mt-6 text-center text-sm text-stone-500">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-amber-600 hover:text-amber-700 font-medium">
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}