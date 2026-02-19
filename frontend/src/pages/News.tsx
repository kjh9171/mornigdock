import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { getPostsAPI, getPostAPI, Post, addCommentAPI } from '../lib/api'
import { Pin, ShieldCheck, MessageSquare, ChevronRight, AlertCircle, Loader2, Cpu, Sparkles, Send } from 'lucide-react'

const NEWS_CATEGORIES = ['전체', '경제', '기술', '정치', '글로벌', '산업']
const CAT_BADGE: Record<string, string> = {
  경제: 'bg-amber-100 text-amber-700', 기술: 'bg-blue-100 text-blue-700',
  정치: 'bg-red-100 text-red-700', 글로벌: 'bg-green-100 text-green-700',
  산업: 'bg-purple-100 text-purple-700',
}

// ✅ [기능] AI 시뮬레이션 데이터
const AI_INSIGHTS: Record<string, any> = {
  경제: {
    summary: '현재 글로벌 거시경제 지표는 금리 인하 기대감과 인플레이션 둔화세가 맞물려 변동성이 확대되는 구간입니다.',
    impact: '국내 증시 및 신흥국 시장으로의 자금 유입 가속화 가능성 75%.',
    advice: '단기 차익 실현보다는 가치주 중심의 포트폴리오 재편 권고.'
  },
  기술: {
    summary: '생성형 AI의 발전이 하드웨어 아키텍처 혁신을 견인하며 반도체 산업의 새로운 패러다임을 형성하고 있습니다.',
    impact: '엣지 컴퓨팅 및 온디바이스 AI 시장 규모 전년 대비 120% 성장 전망.',
    advice: '관련 공급망의 수직 계열화가 완성된 기업에 주목할 필요가 있음.'
  },
  default: {
    summary: '해당 사안은 다각적인 분석이 필요하며, 현재 수집된 데이터를 바탕으로 볼 때 장기적인 추세 전환의 신호로 해석됩니다.',
    impact: '시장 전반의 리스크 관리 수준 강화가 요구됨.',
    advice: '정보의 비대칭성을 해소하기 위해 공신력 있는 기관의 추가 레포트 확인 요망.'
  }
}

export default function News() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState('전체')
  const [selected, setSelected] = useState<Post | null>(null)
  const [selectedComments, setSelectedComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // AI 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)

  // 댓글 입력 상태
  const [commentInput, setCommentInput] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)

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

  const loadDetail = async (id: number) => {
    try {
      const res = await getPostAPI(id)
      if (res.success) {
        setSelected(res.post)
        setSelectedComments(res.comments || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleSelect = async (post: Post) => {
    setSelected(post)
    setAiResult(null)
    setCommentInput('')
    loadDetail(post.id)
    window.scrollTo(0, 0)
  }

  // ✅ [기능] AI 분석 시뮬레이션 로직
  const handleAIAnalyze = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      const insight = AI_INSIGHTS[selected?.category || ''] || AI_INSIGHTS.default
      setAiResult(insight)
      setIsAnalyzing(false)
    }, 1500)
  }

  // ✅ [기능] 댓글 등록 로직
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentInput.trim() || !selected || isSubmittingComment) return

    setIsSubmittingComment(true)
    try {
      const res = await addCommentAPI(selected.id, commentInput.trim())
      if (res.success) {
        setCommentInput('')
        loadDetail(selected.id) // 댓글 목록 새로고침
      }
    } catch (err) {
      console.error('Comment Post Error:', err)
    } finally {
      setIsSubmittingComment(false)
    }
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
            <div className="flex justify-between items-start mb-6">
              <button onClick={() => setSelected(null)} className="text-sm font-bold text-amber-600 hover:underline">← 목록으로</button>
              
              <button 
                onClick={handleAIAnalyze}
                disabled={isAnalyzing || aiResult}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm
                  ${aiResult ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-stone-900 text-white hover:bg-black active:scale-95 disabled:opacity-50'}`}
              >
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                {aiResult ? 'AI 분석 완료' : 'AI 심층 분석'}
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase ${CAT_BADGE[selected.category] || 'bg-stone-100 text-stone-500'}`}>
                  {selected.category}
                </span>
                <span className="text-xs text-stone-400 font-medium">{selected.source}</span>
              </div>
              {user?.isAdmin && <ShieldCheck className="w-5 h-5 text-blue-500" />}
            </div>
            
            <h2 className="text-2xl font-black text-stone-900 mb-6 leading-tight">{selected.title}</h2>
            
            <div className="text-stone-700 leading-relaxed text-base whitespace-pre-wrap border-t border-stone-100 pt-8">
              {selected.content}
            </div>

            {/* AI 분석 결과 섹션 */}
            {isAnalyzing && (
              <div className="mt-8 p-6 bg-stone-50 rounded-2xl border border-dashed border-stone-200 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-stone-200 rounded-full" />
                  <div className="h-4 w-32 bg-stone-200 rounded" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-stone-200 rounded" />
                  <div className="h-3 w-5/6 bg-stone-200 rounded" />
                </div>
              </div>
            )}

            {aiResult && (
              <div className="mt-8 bg-amber-50/50 rounded-2xl border border-amber-100 overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="bg-amber-600 px-6 py-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-white" />
                  <span className="text-xs font-black text-white uppercase tracking-widest">Agora AI Intelligence Report</span>
                </div>
                <div className="p-6 space-y-6">
                  <div>
                    <h4 className="text-xs font-black text-amber-700 uppercase mb-2">핵심 분석 요약</h4>
                    <p className="text-sm text-stone-800 leading-relaxed font-medium">{aiResult.summary}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-stone-400 uppercase mb-2">시장 파급 효과</h4>
                      <p className="text-xs text-stone-700 font-bold leading-relaxed">{aiResult.impact}</p>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-amber-100 shadow-sm">
                      <h4 className="text-[10px] font-black text-stone-400 uppercase mb-2">전략적 제언</h4>
                      <p className="text-xs text-stone-700 font-bold leading-relaxed">{aiResult.advice}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Discussion Section */}
          <div className="bg-stone-50 p-8 border-t border-stone-100">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Discussion ({selectedComments.length})
              </h3>
            </div>

            {/* Comment Form */}
            <form onSubmit={handleSubmitComment} className="mb-8 relative">
              <textarea
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder={user ? "당신의 통찰을 공유하세요..." : "로그인 후 의견을 남길 수 있습니다."}
                disabled={!user || isSubmittingComment}
                rows={3}
                className="w-full p-4 bg-white border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all resize-none font-medium pr-14"
              />
              <button
                type="submit"
                disabled={!user || !commentInput.trim() || isSubmittingComment}
                className="absolute right-3 bottom-3 p-2 bg-stone-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-30"
              >
                {isSubmittingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>

            <div className="space-y-4">
              {selectedComments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-stone-400 font-bold uppercase tracking-widest italic">No active discussions yet.</p>
                </div>
              ) : (
                selectedComments.map(c => (
                  <div key={c.id} className={`p-4 rounded-2xl border ${c.parent_id ? 'ml-8 bg-white border-stone-200 shadow-sm' : 'bg-white border-stone-100 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[11px] font-black text-stone-800">{c.author_name}</span>
                      <span className="text-[9px] text-stone-400 font-mono">{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed font-medium">{c.content}</p>
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