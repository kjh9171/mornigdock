import { useState, useEffect } from 'react';
import { api, addCommentAPI, Comment } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, Reply, Trash2, Edit2, CornerDownRight, MessageSquare, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  newsId?: number;
  postId?: number;
}

export default function CommentSection({ newsId, postId }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const { t } = useTranslation();
  const [comments, setComments]   = useState<Comment[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [content,  setContent]    = useState('');
  const [sending,  setSending]    = useState(false);
  const [replyTo,  setReplyTo]    = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await api.get('/comments', { params: { newsId, postId } });
      setComments(res.data.data || []);
    } catch { setComments([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [newsId, postId]);

  const submit = async (e: React.FormEvent, parentId: number | null = null) => {
    e.preventDefault();
    const text = parentId ? content : content; // Simplified for this context
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await addCommentAPI(newsId || null, postId || null, text.trim(), parentId);
      if (res.success) {
        setContent(''); setReplyTo(null);
        await load();
      }
    } catch (err: any) {
      console.error(err);
    } finally { setSending(false); }
  };

  const deleteComment = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await api.delete(`/comments/${id}`);
      if (res.data.success) await load();
    } catch (err: any) { console.error(err); }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <div className={`py-4 ${depth > 0 ? 'ml-8 bg-slate-50/50 pl-4 border-l-2 border-slate-200' : 'border-b border-slate-100'}`}>
      <div className="flex items-start gap-3">
        {depth > 0 && <CornerDownRight className="w-4 h-4 text-slate-300 mt-1" />}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-bold ${comment.author_name?.includes('Admin') ? 'text-blue-600' : 'text-slate-700'}`}>
                {comment.author_name || '익명사용자'}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated && depth === 0 && (
                <button 
                  className="text-[11px] text-slate-400 hover:text-blue-600 flex items-center gap-1"
                  onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setContent(''); }}>
                  <Reply size={12} /> 답글
                </button>
              )}
              {user && (user.id === comment.user_id || user.role === 'admin') && (
                <button className="text-[11px] text-slate-400 hover:text-red-500"
                  onClick={() => deleteComment(comment.id)}>
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>

          <p className="text-[13px] text-slate-600 leading-relaxed py-1">{comment.content}</p>

          {replyTo === comment.id && (
            <form onSubmit={(e) => submit(e, comment.id)} className="mt-3 flex gap-2 animate-fade-in">
              <input 
                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded text-[13px] outline-none focus:border-blue-400"
                placeholder="답글을 입력하세요"
                value={content} onChange={e => setContent(e.target.value)} autoFocus
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded text-[12px] font-bold" disabled={sending}>
                등록
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
    <div className="bg-white p-6 rounded border border-slate-200 mt-10 shadow-sm animate-fade-in">
      <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
        <MessageSquare className="w-5 h-5 text-blue-600" />
        <h3 className="text-[15px] font-bold text-slate-800">댓글 <span className="text-blue-600">{comments.length}</span></h3>
      </div>

      {loading ? (
        <div className="py-10 text-center">
            <Loader2 className="animate-spin text-blue-600 mx-auto w-6 h-6" />
        </div>
      ) : (
        <div className="space-y-1">
          {comments.map(c => <CommentItem key={c.id} comment={c} />)}
          {comments.length === 0 && (
              <div className="py-10 text-center text-slate-400 text-[13px]">
                  등록된 댓글이 없습니다. 첫 댓글을 남겨주세요!
              </div>
          )}
        </div>
      )}

      {isAuthenticated && !replyTo && (
        <form onSubmit={(e) => submit(e)} className="mt-8">
          <div className="border border-slate-200 rounded overflow-hidden">
            <textarea 
              className="w-full p-4 text-[13px] text-slate-700 outline-none resize-none bg-slate-50 focus:bg-white transition-colors"
              placeholder="댓글을 남겨보세요. 타인을 배려하는 마음을 담아주세요."
              value={content} onChange={e => setContent(e.target.value)} rows={3}
            />
            <div className="flex justify-end p-2 bg-white border-t border-slate-100">
              <button 
                type="submit" disabled={sending || !content.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded text-[13px] font-bold hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                댓글 등록
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
