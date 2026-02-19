import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { createPostAPI } from '../lib/api'
import { PenSquare, AlertCircle, ArrowLeft, Save } from 'lucide-react'

const CATEGORIES = ['자유', '정보', '질문', '유머', '기타']

export default function BoardWrite() {
  const { user } = useAuth()
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
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/board')} className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase hover:underline"><ArrowLeft className="w-4 h-4" /> Cancel & Return</button>
        <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter flex items-center gap-2"><PenSquare className="w-6 h-6" /> Create Insight</h2>
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-sm text-red-600 font-bold">
              <AlertCircle className="w-5 h-5" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Category</label>
            <div className="md:col-span-3">
              <select 
                value={form.category} 
                onChange={e => setForm(p => ({...p, category: e.target.value}))}
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 text-sm font-black uppercase outline-none focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Subject Title</label>
            <div className="md:col-span-3">
              <input 
                value={form.title} 
                onChange={e => setForm(p => ({...p, title: e.target.value}))}
                required 
                maxLength={200} 
                placeholder="제목을 입력하세요"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest block">Insight Content</label>
            <textarea 
              value={form.content} 
              onChange={e => setForm(p => ({...p, content: e.target.value}))}
              required 
              rows={12} 
              placeholder="당신의 통찰을 상세히 기록하세요..."
              className="w-full bg-stone-50 border border-stone-200 rounded-3xl p-8 text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3.5 bg-stone-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-stone-200 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {isSubmitting ? 'Syncing...' : 'Publish Insight'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
