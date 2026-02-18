import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createPostAPI } from '../lib/api'

const CATEGORIES = ['자유', '정보', '질문', '유머', '기타']

export default function BoardWrite() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ category: '자유', title: '', content: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return }
    if (!form.content.trim()) { setError('내용을 입력해주세요.'); return }
    setIsSubmitting(true)
    try {
      const res = await createPostAPI({ type: 'board', ...form })
      if (res.success && res.post) {
        navigate(`/board/${res.post.id}`)
      } else {
        setError(res.message || '게시글 작성에 실패했습니다.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      <header className="bg-white border-b border-stone-300 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold text-stone-800">아고라</Link>
            <span className="text-stone-300">|</span>
            <nav className="flex gap-0.5 text-sm">
              <Link to="/" className="px-2.5 py-1 rounded text-stone-500 hover:bg-stone-100">뉴스</Link>
              <Link to="/board" className="px-2.5 py-1 rounded bg-stone-800 text-white font-medium">게시판</Link>
              <Link to="/media" className="px-2.5 py-1 rounded text-stone-500 hover:bg-stone-100">미디어</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 hidden sm:inline">{user?.username}</span>
            <button onClick={logout} className="text-xs px-2 py-1 bg-stone-100 rounded text-stone-500">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-3 py-6">
        <div className="bg-white border border-stone-300 rounded">
          <div className="px-5 py-3 border-b border-stone-200">
            <h2 className="text-sm font-bold text-stone-700">자유게시판 글쓰기</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>
            )}
            {/* 카테고리 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-stone-600 font-medium w-16 shrink-0">분류</label>
              <select value={form.category} onChange={e => setForm(p => ({...p, category: e.target.value}))}
                className="text-sm px-3 py-1.5 border border-stone-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-400">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* 제목 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-stone-600 font-medium w-16 shrink-0">제목</label>
              <input value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
                required maxLength={200} placeholder="제목을 입력하세요"
                className="flex-1 text-sm px-3 py-1.5 border border-stone-300 rounded
                           focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            {/* 본문 */}
            <div>
              <label className="text-sm text-stone-600 font-medium block mb-1.5">내용</label>
              <textarea value={form.content} onChange={e => setForm(p => ({...p, content: e.target.value}))}
                required rows={16} placeholder="내용을 입력하세요..."
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded resize-none
                           focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            {/* 버튼 */}
            <div className="flex gap-2 justify-end pt-2">
              <Link to="/board"
                className="text-sm px-5 py-2 border border-stone-300 text-stone-600 rounded hover:bg-stone-50">
                취소
              </Link>
              <button type="submit" disabled={isSubmitting}
                className="text-sm px-6 py-2 bg-amber-600 text-white rounded hover:bg-amber-700
                           disabled:opacity-40 font-medium transition-colors">
                {isSubmitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}