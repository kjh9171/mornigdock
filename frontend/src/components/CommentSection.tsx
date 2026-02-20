import { useState, useEffect } from 'react';
import { api, addCommentAPI, Comment } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Send, Loader2, Reply, Trash2, Edit2, CornerDownRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  newsId: number;
}

export default function CommentSection({ newsId }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments]   = useState<Comment[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [content,  setContent]    = useState('');
  const [sending,  setSending]    = useState(false);
  const [replyTo,  setReplyTo]    = useState<number | null>(null);
  const [editId,   setEditId]     = useState<number | null>(null);
  const [editText, setEditText]   = useState('');

  const load = async () => {
    try {
      const res = await api.get('/comments', { params: { newsId } });
      setComments(res.data.data || []);
    } catch { setComments([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [newsId]);

  const submit = async (e: React.FormEvent, parentId: number | null = null) => {
    e.preventDefault();
    const text = parentId ? content : content; // 둘 다 content 사용 중이므로 통일
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await addCommentAPI(newsId, text.trim(), parentId);
      if (res.success) {
        setContent(''); setReplyTo(null);
        await load();
      }
    } catch (err: any) {
      alert(err.response?.data?.message ?? '댓글 작성 실패');
    } finally { setSending(false); }
  };

  const deleteComment = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await api.delete(`/comments/${id}`);
      if (res.data.success) await load();
    } catch (err: any) { alert(err.response?.data?.message ?? '삭제 실패'); }
  };

  const saveEdit = async (id: number) => {
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/comments/${id}`, { content: editText.trim() });
      if (res.data.success) {
        setEditId(null); setEditText('');
        await load();
      }
    } catch (err: any) { alert(err.response?.data?.message ?? '수정 실패'); }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <div className={`py-4 ${depth > 0 ? 'ml-8' : 'border-b border-stone-100'}`}>
      <div className="flex gap-3">
        {depth > 0 && <CornerDownRight className="w-4 h-4 text-stone-300 mt-1" />}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-black text-stone-900">{comment.author_name}</span>
            <span className="text-[10px] text-stone-400 font-mono">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
            </span>
          </div>

          {editId === comment.id ? (
            <div className="flex gap-2 mt-2">
              <input 
                className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-600/20"
                value={editText} onChange={e => setEditText(e.target.value)} autoFocus
              />
              <button className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-bold" onClick={() => saveEdit(comment.id)}>저장</button>
              <button className="px-3 py-1.5 bg-stone-100 text-stone-500 rounded-lg text-xs font-bold" onClick={() => setEditId(null)}>취소</button>
            </div>
          ) : (
            <p className="text-sm text-stone-700 leading-relaxed font-medium">{comment.content}</p>
          )}

          <div className="flex items-center gap-4 mt-2">
            {isAuthenticated && depth === 0 && (
              <button 
                className="text-[10px] font-black text-accent-600 uppercase hover:underline flex items-center gap-1"
                onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setContent(''); }}>
                <Reply size={10} /> 답글 작성
              </button>
            )}
            {user && (user.id === comment.user_id || user.role === 'admin') && (
              <>
                <button className="text-[10px] font-black text-stone-400 uppercase hover:text-stone-600 flex items-center gap-1"
                  onClick={() => { setEditId(comment.id); setEditText(comment.content); }}>
                  <Edit2 size={10} /> 수정
                </button>
                <button className="text-[10px] font-black text-stone-400 uppercase hover:text-red-600 flex items-center gap-1"
                  onClick={() => deleteComment(comment.id)}>
                  <Trash2 size={10} /> 삭제
                </button>
              </>
            )}
          </div>

          {replyTo === comment.id && (
            <form onSubmit={(e) => submit(e, comment.id)} className="mt-4 flex gap-2">
              <input 
                className="flex-1 px-4 py-2 bg-white border border-accent-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-accent-600/20"
                placeholder="답글 내용을 입력하십시오..."
                value={content} onChange={e => setContent(e.target.value)} autoFocus
              />
              <button type="submit" className="bg-accent-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md" disabled={sending}>
                {sending ? <Loader2 size={12} className="animate-spin" /> : '등록'}
              </button>
            </form>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.map(r => (
        <CommentItem key={r.id} comment={r} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black text-stone-900">통합 토론 게시판</h3>
        <span className="text-xs font-mono text-stone-400 font-bold">REPLIES: {comments.length}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-stone-200" /></div>
      ) : (
        <div className="space-y-2">
          {comments.map(c => <CommentItem key={c.id} comment={c} />)}
          {comments.length === 0 && <p className="text-center py-12 text-stone-400 font-bold italic">첫 번째 전략적 통찰을 발제하십시오.</p>}
        </div>
      )}

      {isAuthenticated && !replyTo && (
        <form onSubmit={(e) => submit(e)} className="relative mt-8">
          <textarea 
            className="w-full p-4 bg-white border border-stone-200 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-accent-600/10 transition-all shadow-inner"
            placeholder="새로운 토론 주제를 발제하십시오..."
            value={content} onChange={e => setContent(e.target.value)} rows={3}
          />
          <button 
            type="submit" disabled={sending || !content.trim()}
            className="absolute right-3 bottom-3 p-2.5 bg-stone-900 text-white rounded-xl hover:bg-black transition-all disabled:opacity-30 shadow-lg"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      )}
    </div>
  );
}
