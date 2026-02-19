import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { getPostsAPI, getPostAPI, Post, addCommentAPI } from '../lib/api'
import { Pin, ShieldCheck, MessageSquare, ChevronRight, AlertCircle, Loader2, Cpu, Sparkles, Send, CornerDownRight, ExternalLink, PlayCircle, Mic } from 'lucide-react'

const NEWS_CATEGORIES = ['전체', '경제', '기술', '정치', '글로벌', '산업']
const CAT_BADGE: Record<string, string> = {
  경제: 'bg-amber-100 text-amber-700', 기술: 'bg-blue-100 text-blue-700',
  정치: 'bg-red-100 text-red-700', 글로벌: 'bg-green-100 text-green-700',
  산업: 'bg-purple-100 text-purple-700',
}

const AI_INSIGHTS: Record<string, any> = {
  경제: { summary: '글로벌 거시경제 지표상 금리 인하 기대감과 인플레이션 둔화세가 변동성을 확대시키는 구간입니다.', strategy: '안정형 가치주 중심의 포트폴리오 재편 권고.' },
  기술: { summary: '생성형 AI 발전이 하드웨어 혁신을 견인하며 반도체 산업의 패러다임을 전환하고 있습니다.', strategy: '공급망 수직 계열화 완성 기업에 주목.' },
  default: { summary: '데이터 분석 결과 장기적인 추세 전환의 신호가 포착되었습니다.', strategy: '리스크 관리 수준 강화 및 추가 데이터 확보 요망.' }
}

export default function News() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState('전체')
  const [selected, setSelected] = useState<Post | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiData, setAiData] = useState<any>(null)
  const [commentInput, setCommentInput] = useState('')
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    const res = await getPostsAPI({ type: 'news', limit: 20, category: category === '전체' ? '' : category })
    if (res.success) setPosts(res.posts)
    setIsLoading(false)
  }, [category])

  useEffect(() => { fetchData() }, [fetchData])

  const loadDetail = async (id: number) => {
    const res = await getPostAPI(id)
    if (res.success) { setSelected(res.post); setComments(res.comments || []); }
  }

  const handleSelect = (p: Post) => {
    setSelected(p); setAiData(null); setCommentInput(''); setReplyTo(null);
    loadDetail(p.id); window.scrollTo(0, 0);
  }

  const handleAI = () => {
    setIsAnalyzing(true)
    setTimeout(() => {
      setAiData(AI_INSIGHTS[selected?.category || ''] || AI_INSIGHTS.default)
      setIsAnalyzing(false)
    }, 1500)
  }

  const submitComment = async (e: React.FormEvent, parentId?: number) => {
    e.preventDefault()
    const content = parentId ? (e.target as any).replyContent.value : commentInput
    if (!content.trim() || !selected || isSubmitting) return
    setIsSubmitting(true)
    const res = await addCommentAPI(selected.id, content.trim(), parentId)
    if (res.success) {
      if (!parentId) setCommentInput('')
      setReplyTo(null); loadDetail(selected.id);
    }
    setIsSubmitting(false)
  }

  const commentTree = comments.filter(c => !c.parent_id).map(p => ({
    ...p, replies: comments.filter(r => r.parent_id === p.id)
  }))

  return (
    <div className="w-full space-y-6">
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {NEWS_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setSelected(null); }} className={`text-sm px-4 py-2 rounded-full font-bold border transition-all whitespace-nowrap ${category === cat ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-white text-stone-500 border-stone-200'}`}>{cat}</button>
        ))}
      </div>

      {selected ? (
        <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm animate-in fade-in duration-500">
          <div className="p-10">
            <div className="flex justify-between items-start mb-8">
              <button onClick={() => setSelected(null)} className="text-xs font-black text-amber-600 uppercase hover:underline">← Insights Archive</button>
              <button onClick={handleAI} disabled={isAnalyzing || aiData} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black shadow-sm ${aiData ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-stone-900 text-white hover:bg-black'}`}>
                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />} {aiData ? 'Intelligence Verified' : 'Run AI Analysis'}
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[10px] font-black px-2.5 py-1 rounded uppercase ${CAT_BADGE[selected.category] || 'bg-stone-100 text-stone-500'}`}>{selected.category}</span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-400 font-bold uppercase tracking-widest">{selected.source}</span>
              </div>
            </div>

            {/* 🔥 제목 클릭 시 원본 이동 */}
            <a 
              href={(selected as any).source_url} 
              target="_blank" 
              rel="noreferrer" 
              className="group block mb-8"
            >
              <h1 className="text-3xl font-black text-stone-900 leading-tight tracking-tighter group-hover:text-amber-600 transition-colors flex items-center gap-3">
                {selected.title}
                <ExternalLink className="w-5 h-5 text-stone-300 group-hover:text-amber-600" />
              </h1>
            </a>

            <div className="text-stone-700 leading-relaxed text-lg whitespace-pre-wrap border-t border-stone-100 pt-10 mb-10">
              {selected.content}
            </div>

            {/* 🔥 관련 영상/오디오 브리핑 섹션 */}
            {((selected as any).related_video_url || (selected as any).related_audio_url) && (
              <div className="mb-10 p-8 bg-stone-50 border border-stone-100 rounded-3xl">
                <h4 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-amber-600" /> Related Intelligence Briefing
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 유튜브 임베드 */}
                  {(selected as any).related_video_url && (
                    <div className="aspect-video rounded-2xl overflow-hidden shadow-lg border border-white">
                      <iframe 
                        src={`https://www.youtube.com/embed/${(selected as any).related_video_url}`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  )}
                  {/* 팟캐스트 플레이어 */}
                  {(selected as any).related_audio_url && (
                    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Mic className="w-5 h-5 text-amber-600" /></div>
                        <div><p className="text-sm font-bold text-stone-800 uppercase">Audio Intelligence</p><p className="text-[10px] text-stone-400 font-medium">Deep Dive Podcast</p></div>
                      </div>
                      <audio controls className="w-full h-10">
                        <source src={(selected as any).related_audio_url} type="audio/mpeg" />
                      </audio>
                    </div>
                  )}
                </div>
              </div>
            )}

            {isAnalyzing && <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden mb-10"><div className="h-full bg-amber-600 animate-[loading_1.5s_ease-in-out]" /></div>}
            
            {aiData && (
              <div className="bg-amber-50/50 rounded-2xl border border-amber-100 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in-95 duration-300">
                <div><h4 className="text-[10px] font-black text-amber-600 uppercase mb-2 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Core Summary</h4><p className="text-sm text-stone-800 font-bold leading-relaxed">{aiData.summary}</p></div>
                <div><h4 className="text-[10px] font-black text-amber-600 uppercase mb-2 flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Strategic Advice</h4><p className="text-sm text-stone-800 font-bold leading-relaxed">{aiData.strategy}</p></div>
              </div>
            )}
          </div>

          <div className="bg-stone-50 p-10 border-t border-stone-100">
            <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest mb-8 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-600" /> Discussion ({comments.length})</h3>
            <form onSubmit={e => submitComment(e)} className="mb-10 relative">
              <textarea value={commentInput} onChange={e => setCommentInput(e.target.value)} placeholder={user ? "당신의 통찰을 공유하세요..." : "로그인 후 참여 가능합니다."} disabled={!user || isSubmitting} className="w-full p-5 bg-white border border-stone-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 font-medium pr-16 resize-none" rows={3} />
              <button type="submit" disabled={!user || !commentInput.trim()} className="absolute right-4 bottom-4 p-2.5 bg-stone-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-30"><Send className="w-5 h-5" /></button>
            </form>
            <div className="space-y-6">
              {commentTree.map(c => (
                <div key={c.id}>
                  <div className="p-5 bg-white border border-stone-100 rounded-2xl shadow-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-[11px] font-black text-stone-800 uppercase">{c.author_name}</span>
                      <div className="flex gap-3"><button onClick={() => setReplyTo(replyTo === c.id ? null : c.id)} className="text-[9px] font-black text-amber-600 uppercase hover:underline">Reply</button><span className="text-[9px] text-stone-400 font-mono italic">{new Date(c.created_at).toLocaleDateString()}</span></div>
                    </div>
                    <p className="text-sm text-stone-600 font-medium leading-relaxed">{c.content}</p>
                    {replyTo === c.id && (
                      <form onSubmit={e => submitComment(e, c.id)} className="mt-4 flex gap-2 animate-in slide-in-from-top-2">
                        <input name="replyContent" required placeholder="답글 입력..." className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 font-bold" />
                        <button type="submit" className="bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-bold">등록</button>
                      </form>
                    )}
                  </div>
                  {c.replies.map((r: any) => (
                    <div key={r.id} className="ml-10 mt-4 flex gap-3 animate-in slide-in-from-left-2">
                      <CornerDownRight className="w-4 h-4 text-stone-300 mt-1 shrink-0" />
                      <div className="flex-1 p-5 bg-white/60 border border-stone-100 rounded-2xl shadow-sm">
                        <div className="flex justify-between mb-2"><span className="text-[11px] font-black text-stone-800 uppercase">{r.author_name}</span><span className="text-[9px] text-stone-400 font-mono italic">{new Date(r.created_at).toLocaleDateString()}</span></div>
                        <p className="text-sm text-stone-600 font-medium leading-relaxed">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  )
}
