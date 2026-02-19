import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { getPostsAPI, getPostAPI, Post } from '../lib/api'
import { Pin, ShieldCheck, MessageSquare, Cpu, ChevronRight } from 'lucide-react'

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
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState('전체')
  const [selected, setSelected] = useState<Post | null>(null)
  const [selectedComments, setSelectedComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // ✅ [보안/성능] 무한 루프 방지 데이터 페칭
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: any = { type: 'news', limit: 20 }
      if (category !== '전체') params.category = category
      const res = await getPostsAPI(params)
      // 데이터 바인딩 보강: res.posts 또는 res.data 유연하게 대응
      if (res.success) setPosts(res.posts || res.data || [])
    } finally {
      setIsLoading(false)
    }
  }, [category])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSelect = async (post: Post) => {
    setSelected(post)
    const res = await getPostAPI(post.id)
    if (res.success) {
      setSelected(res.post)
      setSelectedComments(res.comments || [])
    }
    window.scrollTo(0, 0)
  }

  return (
    <div className="w-full space-y-6">
      {/* ── 카테고리 필터 (기존 UI 유지 및 다국어 지원) ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {NEWS_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setSelected(null) }}
            className={`text-sm px-4 py-2 rounded-full font-bold border transition-all ${
              category === cat ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-stone-500 border-stone-200 hover:border-amber-400'
            }`}>
            {t(`category.${cat}`, cat)}
          </button>
        ))}
      </div>

      {selected ? (
        /* ── [기능] 기사 상세 및 대댓글 토론 ── */
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="p-8">
            <button onClick={() => setSelected(null)} className="text-sm font-bold text-amber-600 mb-6 flex items-center gap-1">← Back to Feed</button>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${CAT_BADGE[selected.category] || 'bg-stone-100 text-stone-500'}`}>
                  {selected.category}
                </span>
                {selected.is_ai && <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-black"><Cpu className="w-3 h-3" /> AI NEWS</span>}
              </div>
              {user?.isAdmin && <ShieldCheck className="w-5 h-5 text-blue-500" />}
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-6 leading-tight">{selected.title}</h2>
            <div className="text-stone-700 leading-relaxed text-base whitespace-pre-wrap border-t border-stone-100 pt-8">
              {selected.content}
            </div>
          </div>
          
          {/* ✅ 대댓글 토론 시스템 복구 */}
          <div className="bg-stone-50 p-8 border-t border-stone-100">
            <h3 className="text-xs font-black text-stone-900 mb-6 tracking-widest uppercase flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Discussion
            </h3>
            <div className="space-y-4">
              {selectedComments.map(c => (
                <div key={c.id} className={`p-4 rounded-xl border ${c.parent_id ? 'ml-8 bg-white border-stone-200' : 'bg-stone-100 border-transparent shadow-sm'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-black text-stone-800">{c.author_name}</span>
                    <span className="text-[10px] text-stone-400 font-bold uppercase cursor-pointer">Reply</span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">{c.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── [기능] 기사 카드 그리드 (데이터 바인딩 강화) ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-20 text-center text-stone-400 font-bold animate-pulse">SYNCING AGORA FEED...</div>
          ) : posts.length === 0 ? (
            <div className="col-span-full py-20 text-center text-stone-400 border-2 border-dashed border-stone-100 rounded-3xl">No insights available in this category.</div>
          ) : (
            posts.map(post => (
              <div key={post.id} onClick={() => handleSelect(post)} 
                className="group bg-white border border-stone-200 p-6 rounded-2xl hover:border-amber-400 hover:shadow-xl transition-all cursor-pointer relative">
                {post.pinned && <Pin className="absolute top-4 right-4 w-4 h-4 text-amber-600" />}
                <div className="text-[10px] font-black text-stone-400 uppercase mb-3 tracking-widest">{post.category}</div>
                <h3 className="text-lg font-bold text-stone-900 mb-3 group-hover:text-amber-700 line-clamp-2">{post.title}</h3>
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">{post.content}</p>
                <div className="flex justify-between items-center pt-4 border-t border-stone-50 text-[10px] font-bold text-stone-400">
                  <span>{post.source}</span>
                  <span className="flex items-center gap-1 group-hover:text-amber-600">VIEW <ChevronRight className="w-3 h-3" /></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}