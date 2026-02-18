import React, { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPostAPI, addCommentAPI, deletePostAPI, Post, Comment } from '../lib/api'

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// ── 댓글 하나 렌더링 (대댓글 지원) ──
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

  // 이 댓글의 대댓글들
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
      <div className={`${depth > 0 ? 'ml-6 border-l-2 border-stone-100 pl-3' : ''}`}>
        <div className="py-2.5 text-xs text-stone-400 italic">삭제된 댓글입니다.</div>
        {replies.map(r => (
          <CommentItem key={r.id} comment={r} allComments={allComments}
            postId={postId} onCommentAdded={onCommentAdded} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div className={`${depth > 0 ? 'ml-6 border-l-2 border-amber-100 pl-3' : ''}`}>
      <div className="py-3 border-b border-stone-100 last:border-0">
        {/* 댓글 헤더 */}
        <div className="flex items-center gap-2 mb-1.5">
          {depth > 0 && <span className="text-stone-300 text-xs">└</span>}
          <div className="w-6 h-6 bg-stone-200 rounded-full flex items-center justify-center text-xs font-medium text-stone-600">
            {comment.author_name.charAt(0)}
          </div>
          <span className="text-sm font-medium text-stone-700">{comment.author_name}</span>
          <span className="text-xs text-stone-400">{formatDateTime(comment.created_at)}</span>
        </div>
        {/* 댓글 내용 */}
        <p className="text-sm text-stone-700 leading-relaxed pl-8 whitespace-pre-wrap">{comment.content}</p>
        {/* 대댓글 버튼 */}
        {user && depth === 0 && (
          <div className="pl-8 mt-1.5">
            <button onClick={() => setShowReply(!showReply)}
              className="text-xs text-stone-400 hover:text-amber-600 transition-colors">
              {showReply ? '취소' : '↩ 답글'}
            </button>
          </div>
        )}
        {/* 대댓글 입력창 */}
        {showReply && (
          <div className="pl-8 mt-2 flex gap-2">
            <textarea value={replyText} onChange={e => setReplyText(e.target.value)}
              rows={2} placeholder="답글을 입력하세요..."
              className="flex-1 text-sm px-3 py-2 border border-stone-200 rounded-lg resize-none
                         focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <button onClick={handleReply} disabled={isSubmitting || !replyText.trim()}
              className="text-xs px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700
                         disabled:opacity-40 self-end">
              등록
            </button>
          </div>
        )}
      </div>
      {/* 대댓글 재귀 렌더링 */}
      {replies.map(r => (
        <CommentItem key={r.id} comment={r} allComments={allComments}
          postId={postId} onCommentAdded={onCommentAdded} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [commentText, setCommentText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!id) return
    getPostAPI(parseInt(id)).then(res => {
      if (res.success) {
        setPost(res.post)
        setComments(res.comments)
      }
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
    if (res.success && res.comment) {
      setComments(prev => [...prev, res.comment])
      setCommentText('')
    }
    setIsSubmitting(false)
  }

  const onCommentAdded = (c: Comment) => setComments(prev => [...prev, c])

  // 최상위 댓글만 (parent_id가 null인 것)
  const rootComments = comments.filter(c => c.parent_id === null)

  if (isLoading) return (
    <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
    </div>
  )

  if (!post) return (
    <div className="min-h-screen bg-[#F2F2F2] flex items-center justify-center">
      <div className="text-center">
        <p className="text-stone-500 mb-4">게시글을 찾을 수 없습니다.</p>
        <Link to="/board" className="text-amber-600 hover:underline">게시판으로 돌아가기</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* 헤더 */}
      <header className="bg-white border-b border-stone-300 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold text-stone-800">아고라</Link>
            <span className="text-stone-300">|</span>
            <nav className="flex gap-0.5 text-sm">
              <Link to="/" className="px-2.5 py-1 rounded text-stone-500 hover:bg-stone-100">뉴스</Link>
              <Link to="/board" className="px-2.5 py-1 rounded bg-stone-800 text-white font-medium">게시판</Link>
              <Link to="/media" className="px-2.5 py-1 rounded text-stone-500 hover:bg-stone-100">미디어</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="px-2.5 py-1 rounded text-red-600 hover:bg-red-50 font-medium">관리자</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 hidden sm:inline">{user?.username}</span>
            <button onClick={logout} className="text-xs px-2 py-1 bg-stone-100 rounded text-stone-500 hover:bg-stone-200">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 py-4">
        {/* 게시글 본문 */}
        <div className="bg-white border border-stone-300 rounded mb-2">
          {/* 제목 영역 */}
          <div className="px-5 py-4 border-b border-stone-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                {post.category}
              </span>
              {post.pinned && (
                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">공지</span>
              )}
            </div>
            <h1 className="text-xl font-bold text-stone-800 leading-tight mb-3">{post.title}</h1>
            <div className="flex items-center justify-between text-xs text-stone-400 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 bg-stone-200 rounded-full flex items-center justify-center text-xs font-medium text-stone-600">
                    {post.author_name.charAt(0)}
                  </div>
                  <span className="font-medium text-stone-600">{post.author_name}</span>
                </div>
                <span>{formatDateTime(post.created_at)}</span>
                <span>조회 {post.view_count.toLocaleString()}</span>
                <span>댓글 {comments.filter(c => !c.is_deleted).length}</span>
              </div>
              {/* 수정/삭제 버튼 */}
              {(user?.id === post.author_id || user?.role === 'admin') && (
                <div className="flex gap-1">
                  <button onClick={handleDelete}
                    className="text-xs px-2 py-1 text-red-500 border border-red-200 rounded hover:bg-red-50">
                    삭제
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 본문 */}
          <div className="px-5 py-5 min-h-[200px]">
            <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap">
              {post.content}
            </div>
          </div>
        </div>

        {/* 댓글 영역 */}
        <div className="bg-white border border-stone-300 rounded">
          <div className="px-5 py-3 border-b border-stone-200 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-stone-700">
              댓글 <span className="text-amber-600">{comments.filter(c => !c.is_deleted).length}</span>
            </h2>
          </div>

          {/* 댓글 목록 */}
          <div className="px-5">
            {rootComments.length === 0 ? (
              <div className="py-8 text-center text-sm text-stone-400">
                첫 댓글을 남겨보세요!
              </div>
            ) : (
              rootComments.map(comment => (
                <CommentItem key={comment.id} comment={comment} allComments={comments}
                  postId={post.id} onCommentAdded={onCommentAdded} />
              ))
            )}
          </div>

          {/* 댓글 작성 */}
          {user ? (
            <div className="px-5 py-4 border-t border-stone-100 bg-stone-50/50">
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center text-xs font-bold text-amber-700 shrink-0 mt-0.5">
                  {user.username.charAt(0)}
                </div>
                <div className="flex-1">
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                    rows={3} placeholder="댓글을 입력하세요... (Ctrl+Enter로 등록)"
                    onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') handleComment() }}
                    className="w-full text-sm px-3 py-2 border border-stone-200 rounded-lg resize-none
                               focus:outline-none focus:ring-2 focus:ring-amber-400" />
                  <div className="flex justify-end mt-1.5">
                    <button onClick={handleComment} disabled={isSubmitting || !commentText.trim()}
                      className="text-xs px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700
                                 disabled:opacity-40 font-medium transition-colors">
                      {isSubmitting ? '등록 중...' : '댓글 등록'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-5 py-4 border-t border-stone-100 text-center">
              <Link to="/login" className="text-sm text-amber-600 hover:underline">로그인</Link>
              <span className="text-sm text-stone-400"> 후 댓글을 작성할 수 있습니다.</span>
            </div>
          )}
        </div>

        {/* 하단 네비게이션 */}
        <div className="mt-3 flex justify-between">
          <Link to="/board" className="text-xs px-4 py-2 bg-stone-600 text-white rounded hover:bg-stone-700">
            ← 목록
          </Link>
          <button onClick={() => navigate('/board/write')}
            className="text-xs px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700">
            글쓰기
          </button>
        </div>
      </main>
    </div>
  )
}