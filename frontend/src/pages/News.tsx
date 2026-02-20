import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { getPostsAPI, getPostAPI, Post, addCommentAPI } from '../lib/api'
import { useActivityLog } from '../utils/activityLogger'
import { Pin, ShieldCheck, MessageSquare, ChevronRight, AlertCircle, Loader2, Cpu, Sparkles, Send, CornerDownRight, ExternalLink } from 'lucide-react'
import { StockMarket } from '../components/StockMarket'

const NEWS_CATEGORIES = ['전체', '경제', '기술', '정치', '글로벌', '산업']
const CAT_BADGE: Record<string, string> = {
  경제: 'bg-amber-100 text-amber-700', 기술: 'bg-blue-100 text-blue-700',
  정치: 'bg-red-100 text-red-700', 글로벌: 'bg-green-100 text-green-700',
  산업: 'bg-purple-100 text-purple-700',
}

const AI_INSIGHTS: Record<string, any> = {
  경제: { summary: '네이버 뉴스 분석 결과, 거시경제 지표의 급격한 변화로 인한 시장 변동성 확대 국면입니다.', strategy: '자산 배분 전략의 재점검 및 리스크 관리 강화가 필수적인 시점입니다.' },
  기술: { summary: 'HBM4 양산 시점 단축은 글로벌 AI 경쟁에서 주도권을 확보하려는 전략적 포석으로 분석됩니다.', strategy: '반도체 밸류체인 내 핵심 장비 및 소재 기업에 대한 집중 모니터링이 필요합니다.' },
  default: { summary: '네이버 속보 데이터를 바탕으로 한 정밀 분석 결과, 산업 패러다임의 중대한 전환점이 포착되었습니다.', strategy: '기존 관성을 탈피한 새로운 전략적 의사결정이 요구되는 구간입니다.' }
}

export default function News() {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { logActivity } = useActivityLog()
  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState('전체')
  const [isLoading, setIsLoading] = useState(false)

  // 🔥 [긴급 내비게이션 리다이렉트] 뉴스 상세 접근 시 아고라 토론장으로 강제 이동
  if (id) {
    return <Navigate to={`/board/${id}`} replace />;
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const res = await getPostsAPI({ type: 'news', limit: 20, category: category === '전체' ? '' : category })
    if (res.success) setPosts(res.posts)
    setIsLoading(false)
  }, [category])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSelect = (p: Post) => {
    navigate(`/board/${p.id}`)
    window.scrollTo(0, 0)
  }

  return (
    <div className="w-full space-y-6">
      <StockMarket />
      
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {NEWS_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); navigate('/'); }} className={`text-sm px-4 py-2 rounded-full font-bold border transition-all whitespace-nowrap ${category === cat ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-stone-500 border-stone-200'}`}>{cat}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">
        {isLoading ? <div className="col-span-full py-40 text-center"><Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto" /></div> : (
          posts.map(p => (
            <div key={p.id} onClick={() => handleSelect(p)} className="group bg-white border border-stone-200 p-8 rounded-3xl hover:border-amber-400 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden">
              <div className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center justify-between">{p.category} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-all" /></div>
              <h3 className="text-xl font-bold text-stone-900 mb-4 group-hover:text-amber-700 tracking-tight line-clamp-2">{p.title}</h3>
              <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed font-medium mb-6">{p.content}</p>
              <div className="pt-6 border-t border-stone-50 flex justify-between text-[10px] font-black text-stone-400 uppercase tracking-tighter"><span>{p.source}</span><span>{new Date(p.created_at).toLocaleDateString()}</span></div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
