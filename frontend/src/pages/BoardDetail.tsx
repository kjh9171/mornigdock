import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPostAPI, addCommentAPI, deletePostAPI, Post, Comment } from '../lib/api'
import { User, Clock, Eye, MessageSquare, CornerDownRight, Trash2, ArrowLeft, Send, ExternalLink } from 'lucide-react'

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
      <div className={`${depth > 0 ? 'ml-10 mt-4' : ''}`}>
        <div className="py-4 text-xs text-stone-400 italic bg-stone-50/50 rounded-xl px-4 border border-dashed border-stone-200">삭제된 댓글입니다.</div>
        {replies.map(r => (
          <CommentItem key={r.id} comment={r} allComments={allComments} postId={postId} onCommentAdded={onCommentAdded} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className={`${depth > 0 ? 'ml-10 mt-4' : 'mt-6'}`}>
      <div className="bg-white border border-stone-100 rounded-2xl p-5 shadow-sm relative">
        {depth > 0 && <CornerDownRight className="absolute -left-7 top-6 w-4 h-4 text-stone-300" />}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center text-[10px] font-black text-stone-500 uppercase">{comment.author_name.charAt(0)}</div>
            <span className="text-[11px] font-black text-stone-800 uppercase tracking-tight">{comment.author_name}</span>
            <span className="text-[9px] font-mono text-stone-400">{formatDateTime(comment.created_at)}</span>
          </div>
          {user && depth === 0 && (
            <button onClick={() => setShowReply(!showReply)} className="text-[9px] font-black text-amber-600 uppercase hover:underline">Reply</button>
          )}
        </div>
        <p className="text-sm text-stone-600 font-medium leading-relaxed whitespace-pre-wrap">{comment.content}</p>
        
        {showReply && (
          <div className="mt-4 flex gap-2 animate-in slide-in-from-top-2">
            <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="답글 입력..." className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 focus:ring-amber-500/20 font-bold" />
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
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    getPostAPI(parseInt(id)).then(res => {
      if (res.success) { setPost(res.post); setComments(res.comments); }
    }).finally(() => setIsLoading(false))
  }, [id])

  const handleDelete = async () => {
    if (!post || !confirm('게시글을 삭제하시겠습니까?')) return
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

  const rootComments = comments.filter(c => c.parent_id === null)

  if (isLoading) return <div className="py-40 text-center"><div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full mx-auto" /></div>

  if (!post) return (
    <div className="py-40 text-center">
      <p className="text-stone-500 font-bold mb-6 italic uppercase tracking-widest">Post Intelligence Not Found</p>
      <Link to="/board" className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-black uppercase">Return to Board</Link>
    </div>
  )

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/board')} className="flex items-center gap-2 text-xs font-black text-amber-600 uppercase hover:underline"><ArrowLeft className="w-4 h-4" /> Back to Archive</button>
        {(user?.id === post.author_id || user?.role === 'admin') && (
          <button onClick={handleDelete} className="flex items-center gap-1.5 text-xs font-black text-red-500 uppercase hover:underline"><Trash2 className="w-3.5 h-3.5" /> Purge Insight</button>
        )}
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-10 border-b border-stone-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-stone-100 text-stone-500 uppercase">{post.category}</span>
              {post.pinned && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">Pin</span>}
            </div>
            {post.source_url && (
              <a href={post.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase hover:underline">
                <ExternalLink className="w-3 h-3" />
                원문 링크
              </a>
            )}
          </div>
          <h1 className="text-3xl font-black text-stone-900 mb-8 leading-tight tracking-tighter uppercase">{post.title}</h1>
          <div className="flex items-center gap-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {post.author_name}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formatDateTime(post.created_at)}</span>
            <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> {post.view_count}</span>
          </div>
        </div>
        <div className="p-10 bg-white min-h-[300px]">
          <div className="text-lg text-stone-700 leading-relaxed font-medium whitespace-pre-wrap">
            {post.content}
          </div>
        </div>
      </div>

      <div className="bg-stone-50 border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-10">
          <h3 className="text-xs font-black text-stone-900 uppercase tracking-widest mb-8 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-amber-600" /> Intelligence Discussion ({comments.filter(c => !c.is_deleted).length})</h3>
          
          {user ? (
            <div className="relative mb-10">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={3} placeholder="당신의 통찰을 공유하세요..." className="w-full p-5 bg-white border border-stone-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 font-medium pr-16 resize-none shadow-sm" />
              <button onClick={handleComment} disabled={isSubmitting || !commentText.trim()} className="absolute right-4 bottom-4 p-2.5 bg-stone-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-30 shadow-lg"><Send className="w-5 h-5" /></button>
            </div>
          ) : (
            <div className="mb-10 p-6 bg-white border border-dashed border-stone-300 rounded-2xl text-center">
              <Link to="/login" className="text-sm font-black text-amber-600 uppercase hover:underline tracking-widest">Access Identity Required to Share Insight</Link>
            </div>
          )}

          <div className="space-y-6">
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
