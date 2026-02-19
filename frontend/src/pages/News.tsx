import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { getPostsAPI, getPostAPI, Post } from '../lib/api'
import { Pin, ShieldCheck, MessageSquare, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'

const NEWS_CATEGORIES = ['전체', '경제', '기술', '정치', '글로벌', '산업']
const CAT_BADGE: Record<string, string> = {
  경제: 'bg-amber-100 text-amber-700', 기술: 'bg-blue-100 text-blue-700',
  정치: 'bg-red-100 text-red-700', 글로벌: 'bg-green-100 text-green-700',
  산업: 'bg-purple-100 text-purple-700',
}

export default function News() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState('전체')
  const [selected, setSelected] = useState<Post | null>(null)
  const [selectedComments, setSelectedComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // ✅ [보안/성능] 데이터 바인딩 자동 탐지 로직
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: any = { type: 'news', limit: 20 }
      if (category !== '전체') params.category = category
      const res = await getPostsAPI(params)
      
      let dataToSet: Post[] = [];
      if (res && res.success) {
        dataToSet = res.posts || [];
      } else if (Array.isArray(res)) {
        dataToSet = res;
      }
      
      setPosts(dataToSet);
    } catch (error) {
      console.error('CERT 로그: 데이터 로딩 실패', error);
    } finally {
      setIsLoading(false);
    }
  }, [category])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSelect = async (post: Post) => {
    setSelected(post)
    try {
      const res = await getPostAPI(post.id)
      if (res.success) {
        setSelected(res.post)
        setSelectedComments(res.comments || [])
      }
    } catch (e) {
      console.error(e)
    }
    window.scrollTo(0, 0)
  }

  return (
    <div className="w-full space-y-6">
      {/* ── 카테고리 필터 ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
        {NEWS_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setSelected(null) }}
            className={`text-sm px-4 py-2 rounded-full font-bold border transition-all whitespace-nowrap ${
              category === cat ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-stone-500 border-stone-200 hover:border-amber-400'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {selected ? (
        /* ── 기사 상세 ── */
        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="p-8">
            <button onClick={() => setSelected(null)} className="text-sm font-bold text-amber-600 mb-6 hover:underline">← 목록으로</button>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${CAT_BADGE[selected.category] || 'bg-stone-100 text-stone-500'}`}>
                  {selected.category}
                </span>
              </div>
              {user?.isAdmin && <ShieldCheck className="w-5 h-5 text-blue-500" />}
            </div>
            <h2 className="text-2xl font-black text-stone-900 mb-6 leading-tight">{selected.title}</h2>
            <div className="text-stone-700 leading-relaxed text-base whitespace-pre-wrap border-t border-stone-100 pt-8">
              {selected.content}
            </div>
          </div>
          
          {/* 대댓글 토론 시스템 */}
          <div className="bg-stone-50 p-8 border-t border-stone-100">
            <h3 className="text-xs font-black text-stone-900 mb-6 uppercase tracking-widest flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Discussion
            </h3>
            <div className="space-y-4">
              {selectedComments.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No comments yet.</p>
              ) : (
                selectedComments.map(c => (
                  <div key={c.id} className={`p-4 rounded-xl border ${c.parent_id ? 'ml-8 bg-white border-stone-200' : 'bg-white border-stone-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[11px] font-black text-stone-800">{c.author_name}</span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── 기사 카드 그리드 ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-24 text-center">
              <Loader2 className="animate-spin h-10 w-10 text-amber-600 mx-auto mb-4" />
              <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">Syncing with MorningDock...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="col-span-full py-24 text-center border-2 border-dashed border-stone-200 rounded-3xl">
              <AlertCircle className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-400 font-bold text-sm uppercase tracking-wider italic">No insights available.</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} onClick={() => handleSelect(post)} 
                className="group bg-white border border-stone-200 p-6 rounded-2xl hover:border-amber-400 hover:shadow-xl transition-all cursor-pointer relative overflow-hidden">
                {post.pinned && <Pin className="absolute top-4 right-4 w-4 h-4 text-amber-600" />}
                <div className="text-[10px] font-black text-stone-400 uppercase mb-3 tracking-widest">{post.category}</div>
                <h3 className="text-lg font-bold text-stone-900 mb-3 group-hover:text-amber-700 line-clamp-2 leading-tight">{post.title}</h3>
                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-4">{post.content}</p>
                <div className="flex justify-between items-center pt-4 border-t border-stone-50 text-[10px] font-bold text-stone-400">
                  <span>{post.source}</span>
                  <span className="flex items-center gap-1 group-hover:text-amber-600">READ MORE <ChevronRight className="w-3 h-3" /></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}