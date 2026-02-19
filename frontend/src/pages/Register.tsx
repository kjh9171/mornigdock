import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()

  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    username: '',
  })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // ✅ 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  // ✅ 회원가입 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 클라이언트 유효성 검사
    if (!form.email || !form.password || !form.username) {
      setError('모든 필드를 입력해주세요.')
      return
    }

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (form.password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }

    if (form.username.length < 2) {
      setError('사용자명은 2자 이상이어야 합니다.')
      return
    }

    setIsLoading(true)

    try {
      const res = await registerAPI({
        email: form.email.trim(),
        password: form.password,
        username: form.username.trim(),
      })

      if (res.success && res.token && res.user) {
        // ✅ 가입 즉시 로그인 처리
        setAuth(res.token, res.user)
        navigate('/')
      } else {
        setError(res.message || '회원가입에 실패했습니다.')
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
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">아고라</h1>
          <p className="mt-2 text-stone-500 text-sm">매일 아침, 세상의 흐름을 읽다</p>
        </div>

        {/* 회원가입 카드 */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-6">회원가입</h2>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 사용자명 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1">
                사용자명
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={form.username}
                onChange={handleChange}
                placeholder="홍길동"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           transition-all duration-200"
              />
            </div>

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
                autoComplete="new-password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="6자 이상 입력"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           transition-all duration-200"
              />
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-stone-700 mb-1">
                비밀번호 확인
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                value={form.passwordConfirm}
                onChange={handleChange}
                placeholder="비밀번호 재입력"
                className={`w-full px-3 py-2 border rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent
                           transition-all duration-200
                           ${
                             form.passwordConfirm && form.password !== form.passwordConfirm
                               ? 'border-red-400 bg-red-50'
                               : 'border-stone-300'
                           }`}
              />
              {form.passwordConfirm && form.password !== form.passwordConfirm && (
                <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            {/* 가입 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300
                         text-white font-medium rounded-lg text-sm
                         transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  가입 중...
                </span>
              ) : (
                '회원가입'
              )}
            </button>
          </form>

          {/* 로그인 링크 */}
          <p className="mt-6 text-center text-sm text-stone-500">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="text-amber-600 hover:text-amber-700 font-medium">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}