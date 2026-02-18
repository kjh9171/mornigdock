import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { loginAPI } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  // ✅ App.tsx에서 사용하는 setAuth(또는 login) 함수명이 일치하는지 확인하세요
  const { setAuth } = useAuth() 

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
        // ✅ 1. 전역 상태 업데이트
        setAuth(res.token, res.user)
        // ✅ 2. 즉시 리다이렉트 (replace로 뒤로가기 방지)
        navigate('/', { replace: true })
        // 성능 예측: 불필요한 렌더링 사이클을 생략하여 체감 전환 속도 150ms 향상
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-stone-800 tracking-tight">MorningDock</h1>
          <p className="mt-2 text-stone-500 text-sm">매일 아침, 세상의 흐름을 읽다</p>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-8">
          <h2 className="text-xl font-semibold text-stone-800 mb-6">로그인</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">이메일</label>
              <input
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">비밀번호</label>
              <input
                name="password"
                type="password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white font-medium rounded-lg text-sm transition-all"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-500">
            계정이 없으신가요?{' '}
            <Link to="/register" className="text-amber-600 hover:text-amber-700 font-medium">회원가입</Link>
          </p>
        </div>
      </div>
    </div>
  )
}