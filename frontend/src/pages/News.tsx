import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPostsAPI, getPostAPI, Post } from '../lib/api'
import { Pin, ShieldCheck, MessageSquare, PlusCircle } from 'lucide-react'

// 기존 카테고리 및 스타일 유지
const NEWS_CATEGORIES = ['전체', '경제', '기술', '정치', '글로벌', '산업']
const CAT_BADGE: Record<string, string> = {
  경제: 'bg-amber-100 text-amber-700', 기술: 'bg-blue-100 text-blue-700',
  정치: 'bg-red-100 text-red-700', 글로벌: 'bg-green-100 text-green-700',
  산업: 'bg-purple-100 text-purple-700',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`
  return `${Math.floor(diff / 86400000)}일 전`
}

export default function News() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState('전체')
  const [selected, setSelected] = useState<Post | null>(null)
  const [selectedComments, setSelectedComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // ✅ 데이터 페칭 (기존 로직 유지)
  useEffect(() => {
    setIsLoading(true)
    const params: any = { type: 'news', limit: 20 }
    if (category !== '전체') params.category = category
    getPostsAPI(params).then(res => {
      if (res.success) setPosts(res.posts)
    }).finally(() => setIsLoading(false))
  }, [category])

  // ✅ 대댓글(토론)을 포함한 상세 보기 (기존 handleSelect 고도화)
  const handleSelect = async (post: Post) => {
    setSelected(post)
    const res = await getPostAPI(post.id)
    if (res.success) {
      setSelected(res.post)
      setSelectedComments(res.comments) // 여기서 parent_id를 가진 대댓글 포함
    }
    window.scrollTo(0, 0)
  }

  const pinnedPost = posts.find(p => p.pinned)
  const normalPosts = posts.filter(p => !p.pinned)

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      <main className="max-w-5xl mx-auto px-4 py-6">
        
        {/* ── 기사 상세 뷰 (대댓글 기능 추가) ── */}
        {selected && (
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm mb-6">
            <div className="px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CAT_BADGE[selected.category] || 'bg-stone-100 text-stone-500'}`}>
                    {selected.category}
                  </span>
                  {selected.is_ai && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">AI INSIGHT</span>}
                </div>
                {user?.role === 'admin' && <ShieldCheck className="w-4 h-4 text-blue-500" title="Admin Verified" />}
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2 leading-snug">{selected.title}</h2>
              <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap border-t border-stone-100 pt-5">
                {selected.content}
              </div>
            </div>

            {/* ✅ 대댓글 토론 시스템 복구 */}
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 rounded-b-xl">
              <h3 className="text-sm font-semibold text-stone-600 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> 토론 ({selectedComments.length})
              </h3>
              <div className="space-y-3">
                {selectedComments.map(c => (
                  <div key={c.id} className={`${c.parent_id ? 'ml-6 border-l-2 border-stone-200 pl-3' : ''} text-sm`}>
                    <span className="font-bold text-stone-800">{c.author_name}</span>
                    <p className="text-stone-600 mt-0.5">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── 리스트 영역 (기존 유지 + 관리자 핀 표시) ── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {NEWS_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setCategory(cat); setSelected(null) }}
              className={`text-sm px-3 py-1.5 rounded-full whitespace-nowrap font-medium transition-all
                ${category === cat ? 'bg-amber-600 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-stone-400">로딩 중...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => (
              <div key={post.id} onClick={() => handleSelect(post)}
                className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm cursor-pointer hover:border-amber-400 transition-all relative">
                {post.pinned && <Pin className="absolute top-4 right-4 w-3 h-3 text-amber-600" />}
                <h3 className="text-sm font-semibold text-stone-800 line-clamp-2">{post.title}</h3>
                <p className="text-xs text-stone-400 mt-2">{post.source} · {timeAgo(post.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}