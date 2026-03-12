import { useState, useEffect, useRef } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Clock, Search, Send, Plus, X, Reply, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

// ── 인터페이스 정의 ──────────────────────────────────────────
interface Post {
  id: number;
  category: string;
  title: string;
  content: string;
  author_name: string;
  author_id: number;
  likes_count: number;
  dislikes_count: number;
  comment_count: number;
  view_count: number;
  created_at: string;
  is_pinned?: boolean;
  is_private?: boolean;
}

interface Comment {
  id: number;
  user_id: number;
  user_name: string;
  content: string;
  created_at: string;
  parent_id: number | null;   // 대댓글 부모 ID
  replies?: Comment[];         // 대댓글 목록
  is_deleted?: boolean;
}

// ── 단일 댓글 컴포넌트 (재귀형 대댓글 지원) ──────────────────
function CommentItem({
  comment,
  depth = 0,
  onReply,
  isAuthenticated,
}: {
  comment: Comment;
  depth?: number;
  onReply: (parentId: number, parentName: string) => void;
  isAuthenticated: boolean;
}) {
  return (
    <div className={`${depth > 0 ? 'ml-8 mt-3 border-l-2 border-indigo-100 pl-4' : ''}`}>
      <div className={`p-4 rounded-2xl ${depth === 0 ? 'bg-slate-50 border border-slate-100' : 'bg-indigo-50/50 border border-indigo-100/50'}`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            {/* 대댓글 표시 아이콘 */}
            {depth > 0 && <Reply size={12} className="text-indigo-400 shrink-0" />}
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[9px] font-black shrink-0">
              {comment.user_name?.[0]?.toUpperCase() || 'A'}
            </div>
            <span className="font-bold text-xs text-slate-800">{comment.user_name || '익명'}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold">{new Date(comment.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className={`text-sm leading-relaxed ${comment.is_deleted ? 'text-slate-400 italic' : 'text-slate-600 font-medium'}`}>
          {comment.content}
        </p>
        {/* 대댓글 작성 버튼 (삭제되지 않은 댓글, 최대 2depth) */}
        {isAuthenticated && !comment.is_deleted && depth < 2 && (
          <button onClick={() => onReply(comment.id, comment.user_name)}
            className="mt-2 flex items-center gap-1 text-[10px] text-indigo-500 font-bold hover:text-indigo-700 transition-colors">
            <Reply size={10} /> 답글 달기
          </button>
        )}
      </div>
      {/* 재귀적으로 대댓글 렌더링 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-1 space-y-1">
          {comment.replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} isAuthenticated={isAuthenticated} />
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 메인 Board 컴포넌트
// ═══════════════════════════════════════════════════════════════
export default function Board() {
  const { user, isAuthenticated } = useAuthStore();
  const [posts, setPosts]         = useState<Post[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 글 작성 모달
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [newTitle, setNewTitle]       = useState('');
  const [newContent, setNewContent]   = useState('');

  // 게시글 상세 모달
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments]         = useState<Comment[]>([]);
  const [newComment, setNewComment]     = useState('');

  // 대댓글 상태 (어느 댓글에 대댓글 쓸지)
  const [replyTo, setReplyTo] = useState<{ parentId: number; parentName: string } | null>(null);

  // 반응 처리 중 방지용
  const reactingRef = useRef(false);

  // ── 게시글 목록 패칭 ──────────────────────────────────────
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/posts', { params: { search: searchQuery, limit: 50 } });
      if (res.data.success && res.data.posts) {
        setPosts(res.data.posts);
      }
    } catch (err) {
      console.error('게시글 목록 로딩 실패', err);
    } finally {
      setLoading(false);
    }
  };

  // 검색어 변경 시 목록 재조회 (디바운스 적용)
  useEffect(() => {
    const t = setTimeout(() => fetchPosts(), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── 게시글 작성 ───────────────────────────────────────────
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      const res = await api.post('/posts', { title: newTitle, content: newContent, category: 'general' });
      if (res.data.success) {
        setIsWriteOpen(false);
        setNewTitle('');
        setNewContent('');
        fetchPosts();
      }
    } catch {
      alert('글 작성에 실패했습니다.');
    }
  };

  // ── 게시글 상세 열기 + 댓글 로딩 ─────────────────────────
  const openPostDetail = async (id: number) => {
    try {
      const res = await api.get(`/posts/${id}`);
      if (res.data.success) {
        setSelectedPost(res.data.post);
        // 계층형 댓글 구조 (백엔드에서 트리로 반환)
        const commentsRes = await api.get('/comments', { params: { postId: id } });
        if (commentsRes.data.success) {
          setComments(commentsRes.data.data || []);
        }
      }
    } catch {
      alert('게시글을 불러오는데 실패했습니다.');
    }
  };

  // 모달 닫기 시 댓글 상태 초기화
  const closePostDetail = () => {
    setSelectedPost(null);
    setComments([]);
    setNewComment('');
    setReplyTo(null);
  };

  // ── 댓글 등록 (일반 댓글 + 대댓글 통합) ──────────────────
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedPost) return;
    try {
      const payload: any = {
        postId:  selectedPost.id,
        content: newComment,
      };
      // 대댓글인 경우 parentId 포함
      if (replyTo) {
        payload.parentId = replyTo.parentId;
      }

      const res = await api.post('/comments', payload);
      if (res.data.success) {
        setNewComment('');
        setReplyTo(null);
        // 댓글 목록 새로고침
        const commentsRes = await api.get('/comments', { params: { postId: selectedPost.id } });
        if (commentsRes.data.success) setComments(commentsRes.data.data || []);
        // 게시글 목록의 댓글 수 갱신
        fetchPosts();
      }
    } catch {
      console.error('댓글 작성 실패');
    }
  };

  // ── 좋아요/싫어요 반응 처리 ───────────────────────────────
  const handleReaction = async (id: number, reaction: 'like' | 'dislike', e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // 게시글 카드 클릭 이벤트 전파 차단
    if (!isAuthenticated) return alert('로그인이 필요합니다.');
    if (reactingRef.current) return; // 중복 클릭 방지

    reactingRef.current = true;
    try {
      const res = await api.post(`/posts/${id}/reaction`, { reaction });
      if (res.data.success) {
        const { likes_count, dislikes_count } = res.data.data;

        // 게시글 목록 상태 즉시 업데이트 (반응 숫자 실시간 반영)
        setPosts(prev => prev.map(p =>
          p.id === id ? { ...p, likes_count, dislikes_count } : p
        ));

        // 상세 모달이 열려있으면 모달 내 숫자도 업데이트
        if (selectedPost?.id === id) {
          setSelectedPost(prev => prev ? { ...prev, likes_count, dislikes_count } : null);
        }
      }
    } catch {
      console.error('반응 처리 실패');
    } finally {
      reactingRef.current = false;
    }
  };

  // ── 대댓글 시작 핸들러 ────────────────────────────────────
  const handleStartReply = (parentId: number, parentName: string) => {
    setReplyTo({ parentId, parentName });
    setNewComment(''); // 입력창 비우기
    // 스크롤을 입력창으로 이동
    setTimeout(() => {
      document.getElementById('comment-input')?.focus();
    }, 100);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 relative">
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-1">아고라 광장</h1>
          <p className="text-sm font-bold text-slate-400">요원들 간의 자유로운 의견과 지식 공유 공간</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* 검색 */}
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input type="text" placeholder="게시글 검색..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-bold text-slate-700 shadow-sm" />
          </div>
          {/* 새 글 작성 */}
          <button onClick={() => { if (!isAuthenticated) return alert('로그인이 필요합니다.'); setIsWriteOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all shrink-0">
            <Plus size={14} /> 새 글
          </button>
        </div>
      </div>

      {/* 게시글 목록 */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id}
              onClick={() => openPostDetail(post.id)}
              className="cursor-pointer bg-white rounded-2xl p-6 border border-slate-100 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              {/* 상단 메타 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs shadow">
                    {post.author_name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">{post.author_name || '익명'}</p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock size={9} /> {new Date(post.created_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {post.is_pinned && (
                  <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black uppercase tracking-widest">공지</span>
                )}
                <div className="flex gap-2">
                  {post.is_private && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">비밀</span>
                  )}
                  {post.category === 'music_request' && (
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">음악신청</span>
                  )}
                </div>
              </div>
              {/* 제목 / 내용 */}
              <h3 className="text-lg font-black text-slate-800 mb-1.5 leading-snug">{post.title}</h3>
              <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4">{post.content}</p>
              {/* 하단 반응 */}
              <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                <div className="flex items-center gap-3">
                  {/* 좋아요 버튼 - 숫자 실시간 반영 */}
                  <button onClick={e => handleReaction(post.id, 'like', e)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors text-xs font-black group">
                    <ThumbsUp size={13} className="group-hover:scale-110 transition-transform" />
                    <span className="tabular-nums">{post.likes_count || 0}</span>
                  </button>
                  {/* 싫어요 버튼 - 숫자 실시간 반영 */}
                  <button onClick={e => handleReaction(post.id, 'dislike', e)}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-rose-500 transition-colors text-xs font-black group">
                    <ThumbsDown size={13} className="group-hover:scale-110 transition-transform" />
                    <span className="tabular-nums">{post.dislikes_count || 0}</span>
                  </button>
                </div>
                {/* 댓글 수 */}
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-black">
                  <MessageSquare size={13} />
                  <span className="tabular-nums">{post.comment_count || 0}</span>
                </div>
              </div>
            </div>
          ))}
          {posts.length === 0 && !loading && (
            <div className="text-center py-24 text-slate-400 font-bold">
              <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
              등록된 게시글이 없습니다. 첫 글을 작성해 보세요!
            </div>
          )}
        </div>
      )}

      {/* ── 글 작성 모달 ───────────────────────────────────── */}
      {isWriteOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-black text-slate-800">새 글 작성</h2>
              <button onClick={() => setIsWriteOpen(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreatePost} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">제목</label>
                <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-bold text-slate-800 transition-all"
                  placeholder="제목을 입력하세요" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">내용</label>
                <textarea required value={newContent} onChange={e => setNewContent(e.target.value)} rows={7}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium text-slate-700 resize-none leading-relaxed transition-all"
                  placeholder="자유롭게 의견을 나누어 주세요." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsWriteOpen(false)} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 transition-colors">취소</button>
                <button type="submit" className="flex items-center gap-2 px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all">
                  <Send size={13} /> 게시물 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 게시글 상세 + 대댓글 모달 ──────────────────────── */}
      {selectedPost && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* 헤더 */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black shadow">
                  {selectedPost.author_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">{selectedPost.author_name}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock size={9} /> {new Date(selectedPost.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              </div>
              <button onClick={closePostDetail} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"><X size={18} /></button>
            </div>

            {/* 본문 */}
            <div className="p-8 overflow-y-auto flex-1">
              <h1 className="text-2xl font-black text-slate-900 mb-5 leading-tight">{selectedPost.title}</h1>
              <p className="text-sm text-slate-700 leading-loose font-medium whitespace-pre-wrap mb-8">{selectedPost.content}</p>

              {/* 좋아요/싫어요 - 실시간 숫자 연동 */}
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                <button onClick={() => handleReaction(selectedPost.id, 'like')}
                  className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-black bg-slate-50 hover:bg-indigo-50 px-4 py-2.5 rounded-xl border border-slate-100 hover:border-indigo-100">
                  <ThumbsUp size={15} /> <span className="tabular-nums">{selectedPost.likes_count || 0}</span>
                </button>
                <button onClick={() => handleReaction(selectedPost.id, 'dislike')}
                  className="flex items-center gap-2 text-slate-500 hover:text-rose-600 transition-colors text-sm font-black bg-slate-50 hover:bg-rose-50 px-4 py-2.5 rounded-xl border border-slate-100 hover:border-rose-100">
                  <ThumbsDown size={15} /> <span className="tabular-nums">{selectedPost.dislikes_count || 0}</span>
                </button>
              </div>

              {/* 댓글 섹션 */}
              <div className="mt-7">
                <h3 className="text-base font-black text-slate-800 mb-5 flex items-center gap-2">
                  <MessageSquare size={16} className="text-indigo-500" />
                  댓글 <span className="text-indigo-500">{comments.length}</span>
                </h3>

                {/* 계층형 댓글 목록 */}
                <div className="space-y-3 mb-6">
                  {comments.map(c => (
                    <CommentItem
                      key={c.id}
                      comment={c}
                      depth={0}
                      onReply={handleStartReply}
                      isAuthenticated={isAuthenticated}
                    />
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm font-bold text-slate-400 text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
                    </p>
                  )}
                </div>

                {/* 댓글 입력창 */}
                {isAuthenticated ? (
                  <form onSubmit={handleAddComment} className="space-y-2">
                    {/* 대댓글 표시 배너 */}
                    {replyTo && (
                      <div className="flex items-center justify-between px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                        <span className="text-xs font-bold text-indigo-600 flex items-center gap-1.5">
                          <Reply size={11} /> {replyTo.parentName}님에게 답글 작성 중
                        </span>
                        <button type="button" onClick={() => setReplyTo(null)} className="text-indigo-400 hover:text-indigo-600">
                          <X size={13} />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        id="comment-input"
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder={replyTo ? `@${replyTo.parentName} 에게 답글...` : '댓글을 입력하세요...'}
                        className="flex-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-bold text-slate-700 transition-all"
                      />
                      <button type="submit" disabled={!newComment.trim()}
                        className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0">
                        등록
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs font-bold text-slate-400">댓글을 작성하려면 <span className="text-indigo-500 cursor-pointer hover:underline">로그인</span>이 필요합니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
