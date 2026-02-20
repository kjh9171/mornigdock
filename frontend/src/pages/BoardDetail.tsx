import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPostAPI, addCommentAPI, deletePostAPI, Post, Comment } from '../lib/api'
import { User, Clock, Eye, MessageSquare, CornerDownRight, Trash2, ArrowLeft, Send, ExternalLink, Bot, ShieldCheck, Sparkles, TrendingUp, AlertTriangle, Target } from 'lucide-react'
import { useNavigationStore } from '../store/useNavigationStore'

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

function CommentItem({ comment, allComments, postId, onCommentAdded, depth = 0 }: {
  comment: Comment
  allComments: Comment[]
  postId: number
  onCommentAdded: (c: Comment) => void
  depth?: number
}) {
  const { user } = useAuth()
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const replies = allComments.filter(c => c.parent_id === comment.id)

  const handleReply = async () => {
    if (!replyText.trim()) return
    setIsSubmitting(true)
    const res = await addCommentAPI(postId, replyText.trim(), comment.id)
    if (res.success && res.comment) {
      onCommentAdded(res.comment)
      setReplyText('')
      setShowReply(false)
    }
    setIsSubmitting(false)
  }

  if (comment.is_deleted) {
    return (
      <div className={`${depth > 0 ? 'ml-8 mt-4' : ''}`}>
        <div className="py-4 text-xs text-stone-400 italic bg-stone-50/50 rounded-xl px-4 border border-dashed border-stone-200 uppercase tracking-widest font-black">Declassified/Deleted Intelligence</div>
        {replies.map(r => (
          <CommentItem key={r.id} comment={r} allComments={allComments} postId={postId} onCommentAdded={onCommentAdded} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-6'}`}>
      <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm relative group hover:shadow-md transition-all">
        {depth > 0 && <CornerDownRight className="absolute -left-6 top-6 w-4 h-4 text-stone-300" />}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center text-[10px] font-black text-stone-500 uppercase">{comment.author_name.charAt(0)}</div>
            <span className={`text-[11px] font-black uppercase tracking-tight ${comment.author_name.includes('Admin') || comment.author_name.includes('수집기') ? 'text-amber-600' : 'text-stone-800'}`}>
              {comment.author_name} {(comment.author_name.includes('Admin') || comment.author_name.includes('수집기')) && '(HQ)'}
            </span>
            <span className="text-[9px] font-mono text-stone-400">{formatDateTime(comment.created_at)}</span>
          </div>
          {user && (
            <button onClick={() => setShowReply(!showReply)} className="text-[9px] font-black text-amber-600 uppercase hover:underline opacity-0 group-hover:opacity-100 transition-opacity">Reply</button>
          )}
        </div>
        <p className="text-sm text-stone-600 font-medium leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        
        {showReply && (
          <div className="mt-4 flex gap-2 animate-in slide-in-from-top-2">
            <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="대댓글(답글) 입력..." className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 font-bold" />
            <button onClick={handleReply} disabled={isSubmitting || !replyText.trim()} className="bg-stone-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md">{isSubmitting ? '...' : '등록'}</button>
          </div>
        )}
      </div>
      {replies.map(r => (
        <CommentItem key={r.id} comment={r} allComments={allComments} postId={postId} onCommentAdded={onCommentAdded} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { setView, setSelectedNewsId } = useNavigationStore()
  
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    getPostAPI(parseInt(id)).then(res => {
      if (res.success) { 
        setPost(res.post); 
        setComments(res.comments); 
      }
    }).finally(() => setIsLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!post || !confirm('지능물을 폐기하시겠습니까?')) return
    const res = await deletePostAPI(post.id)
    if (res.success) navigate('/board')
  }

  const handleComment = async () => {
    if (!commentText.trim() || !post) return
    setIsSubmitting(true)
    const res = await addCommentAPI(post.id, commentText.trim())
    if (res.success && res.comment) { setComments(prev => [...prev, res.comment]); setCommentText(''); }
    setIsSubmitting(false)
  }

  const handleAIAnalysis = () => {
    if (!post) return
    setSelectedNewsId(post.id)
    setView('ai-analysis')
    navigate('/')
  }

  const rootComments = comments.filter(c => c.parent_id === null)

  if (isLoading) return <div className="py-40 text-center"><div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto" /></div>

  if (!post) return (
    <div className="py-40 text-center">
      <p className="text-stone-500 font-bold mb-6 italic uppercase tracking-widest">Post Intelligence Not Found</p>
      <Link to="/" className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-black uppercase">Return to Intelligence</Link>
    </div>
  )

  return (
    <div className="w-full max-w-full space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between px-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase hover:underline">
          <ArrowLeft className="w-4 h-4" /> 뒤로가기
        </button>
        {(user?.id === post.author_id || user?.role === 'admin') && (
          <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs font-black text-red-500 uppercase hover:underline">
            <Trash2 className="w-3.5 h-3.5" /> 폐기(삭제)
          </button>
        )}
      </div>

      {/* ─── 지능물(뉴스) 본문 카드 ─── */}
      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-10 border-b border-stone-100 bg-gradient-to-br from-white to-stone-50/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-primary-900 text-white uppercase tracking-widest">
                {post.source || 'INTERNAL'}
              </span>
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-amber-100 text-amber-700 uppercase tracking-widest flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> VERIFIED INTELLIGENCE
              </span>
            </div>
            
            {post.source_url && (
              <a href={post.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-5 py-2.5 bg-white text-amber-600 rounded-2xl text-xs font-black hover:bg-amber-50 transition-all border-2 border-amber-100 shadow-sm">
                <ExternalLink className="w-4 h-4" />
                원문 기사(Naver) 확인
              </a>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-black text-stone-900 mb-8 leading-tight tracking-tighter uppercase">{post.title}</h1>
          
          <div className="flex items-center gap-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {post.author_name}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formatDateTime(post.created_at)}</span>
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> VIEW: {post.view_count}</span>
          </div>
        </div>

        <div className="p-10 bg-white min-h-[200px]">
          <div className="text-lg text-stone-700 leading-relaxed font-medium whitespace-pre-wrap">
            {post.content}
          </div>
        </div>

        {/* ─── 고도화된 AI 지능 분석 결과 ─── */}
        {post.ai_analysis ? (
          <div className="p-10 bg-stone-900 border-t border-stone-800">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-amber-500 rounded-xl">
                <Bot className="w-6 h-6 text-stone-900" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-2">
                  Strategic Command Intelligence
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                </h3>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mt-0.5">High-Level Impact Assessment Report</p>
              </div>
            </div>
            
            <div className="bg-stone-800/40 p-8 rounded-[2.5rem] border border-stone-700/50 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-5 rotate-12"><Bot className="w-32 h-32 text-white" /></div>
              <div className="relative z-10 grid grid-cols-1 gap-8">
                {/* 보고서 텍스트 파싱 및 섹션화 시뮬레이션 */}
                <div className="prose prose-invert max-w-none">
                  <pre className="text-sm text-stone-300 whitespace-pre-wrap font-sans leading-relaxed italic">
                    {post.ai_analysis}
                  </pre>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-stone-700/50">
                  <div className="p-4 bg-stone-900/50 rounded-2xl border border-stone-700/30">
                    <div className="flex items-center gap-2 mb-2 text-amber-500"><TrendingUp className="w-4 h-4" /><span className="text-[10px] font-black uppercase">Market Vector</span></div>
                    <div className="text-xs text-stone-400 font-bold tracking-tight">변동성 확대 / 주도권 재편</div>
                  </div>
                  <div className="p-4 bg-stone-900/50 rounded-2xl border border-stone-700/30">
                    <div className="flex items-center gap-2 mb-2 text-red-500"><AlertTriangle className="w-4 h-4" /><span className="text-[10px] font-black uppercase">Risk Index</span></div>
                    <div className="text-xs text-stone-400 font-black tracking-tight">CRITICAL (Level 4)</div>
                  </div>
                  <div className="p-4 bg-stone-900/50 rounded-2xl border border-stone-700/30">
                    <div className="flex items-center gap-2 mb-2 text-emerald-500"><Target className="w-4 h-4" /><span className="text-[10px] font-black uppercase">Priority</span></div>
                    <div className="text-xs text-stone-400 font-bold tracking-tight">즉시 대응 및 모니터링</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-between items-center px-4">
              <p className="text-[10px] text-stone-600 font-bold italic">Generated by CERT Strategic Intelligence Engine v2.4</p>
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse delay-75" />
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse delay-150" />
              </div>
            </div>
          </div>
        ) : post.type === 'news' && (
          <div className="p-10 bg-stone-50 border-t border-stone-100 flex flex-col items-center">
            <Bot className="w-12 h-12 text-stone-200 mb-4" />
            <p className="text-sm text-stone-400 font-bold mb-6">아직 정밀 지능 분석이 수행되지 않은 첩보입니다.</p>
            <button 
              onClick={handleAIAnalysis}
              className="flex items-center gap-3 px-10 py-4 bg-primary-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl"
            >
              사령부 AI 정밀 분석 가동
            </button>
          </div>
        )}
      </div>

      {/* ─── 아고라 통합 토론장 ─── */}
      <div className="bg-stone-50 border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-10">
          <h3 className="text-xl font-black text-stone-900 uppercase tracking-tighter mb-8 flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-amber-600" /> 
            아고라 요원 토론장 <span className="text-stone-400 text-sm font-mono">({comments.filter(c => !c.is_deleted).length})</span>
          </h3>
          
          {user ? (
            <div className="relative mb-12">
              <textarea 
                value={commentText} onChange={e => setCommentText(e.target.value)} 
                rows={3} placeholder="사령부 요원으로서 당신의 전략적 견해를 남겨주세요..." 
                className="w-full p-6 bg-white border border-stone-200 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-amber-500/10 transition-all pr-20 shadow-inner" 
              />
              <button onClick={handleComment} disabled={isSubmitting || !commentText.trim()} className="absolute right-4 bottom-4 p-3 bg-stone-900 text-white rounded-2xl hover:bg-black transition-all disabled:opacity-30 shadow-lg">
                <Send className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="mb-12 p-8 bg-white border border-dashed border-stone-300 rounded-3xl text-center">
              <Link to="/login" className="text-sm font-black text-amber-600 uppercase hover:underline tracking-widest">토론 참여를 위해 요원 가동 승인(로그인)이 필요합니다</Link>
            </div>
          )}

          <div className="space-y-2">
            {rootComments.length === 0 ? (
              <p className="text-center py-10 text-xs font-black text-stone-300 uppercase tracking-widest italic">No Intelligence Shared Yet</p>
            ) : (
              rootComments.map(comment => (
                <CommentItem key={comment.id} comment={comment} allComments={comments} postId={post.id} onCommentAdded={(c) => setComments(p => [...p, c])} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
