import { useState, useEffect } from 'react';
import { api, addCommentAPI, Comment } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Send, Loader2, Trash2, CornerDownRight, 
  MessageSquare, MessageSquarePlus, Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  newsId?: number | string;
  postId?: number | string;
}

export default function CommentSection({ newsId, postId }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const [comments, setComments]   = useState<Comment[]>([]);
  const [loading,  setLoading]    = useState(true);
  const [content,  setContent]    = useState('');
  const [sending,  setSending]    = useState(false);
  const [replyTo,  setReplyTo]    = useState<number | null>(null);

  const load = async () => {
    try {
      const res = await api.get('/comments', { params: { newsId, postId } });
      setComments(res.data.data || []);
    } catch { 
      setComments([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, [newsId, postId]);

  const submit = async (e: React.FormEvent, parentId: number | null = null) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const nId = newsId ? Number(newsId) : null;
      const pId = postId ? Number(postId) : null;
      
      const res = await addCommentAPI(nId, pId, content.trim(), parentId);
      if (res.success) {
        setContent(''); 
        setReplyTo(null);
        await load();
      }
    } catch (err: any) {
      console.error('댓글 등록 실패:', err);
      alert('댓글 등록 중 오류가 발생했습니다.');
    } finally { 
      setSending(false); 
    }
  };

  const deleteComment = async (id: number) => {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return;
    try {
      const res = await api.delete(`/comments/${id}`);
      if (res.data.success) await load();
    } catch (err: any) { 
      console.error(err); 
    }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <div className={`group animate-in fade-in duration-500 ${depth > 0 ? 'ml-12 mt-4' : 'mt-8'}`}>
      <div className={`p-6 rounded-[2rem] border transition-all ${
        depth > 0 ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100 shadow-sm hover:border-blue-200'
      }`}>
        <div className="flex items-start gap-4">
          {depth > 0 && <CornerDownRight className="w-5 h-5 text-slate-300 mt-1 shrink-0" />}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-black text-[10px]">
                  {comment.author_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <span className="text-sm font-black text-slate-700">{comment.author_name}</span>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">
                  <Clock size={10} />
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAuthenticated && depth === 0 && (
                  <button 
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-all"
                    onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setContent(''); }}>
                    <MessageSquarePlus size={14} /> 답글
                  </button>
                )}
                {/* user.userId -> user.id로 수정 (Frontend User Interface 준수) */}
                {user && (user.id === comment.user_id || user.role === 'admin') && (
                  <button className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    onClick={() => deleteComment(comment.id)}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            <p className="text-sm text-slate-600 font-medium leading-relaxed pl-1">{comment.content}</p>

            {replyTo === comment.id && (
              <form onSubmit={(e) => submit(e, comment.id)} className="mt-6 flex gap-3 animate-in slide-in-from-top-4">
                <input 
                  className="flex-1 px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-inner"
                  placeholder="답글 내용을 입력하세요..."
                  value={content} onChange={e => setContent(e.target.value)} autoFocus
                />
                <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-200" disabled={sending}>
                  등록
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.map(r => (
        <CommentItem key={r.id} comment={r} depth={depth + 1} />
      ))}
    </div>
  );

  return (
    <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-6">
        <MessageSquare size={24} className="text-blue-600" />
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">
          토론광장 <span className="text-blue-600 ml-2 bg-blue-50 px-3 py-1 rounded-full text-sm">[{comments.length}]</span>
        </h3>
      </div>

      {loading ? (
        <div className="py-20 text-center">
            <Loader2 className="animate-spin text-blue-600/20 mx-auto w-12 h-12" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Comm Channel Syncing...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(c => <CommentItem key={c.id} comment={c} />)}
          {comments.length === 0 && (
              <div className="py-20 text-center bg-slate-50/50 rounded-[3rem] border border-dashed border-slate-200">
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                      아직 기록된 전술적 토론이 없습니다. 첫 번째 의견을 남겨주세요.
                  </p>
              </div>
          )}
        </div>
      )}

      {isAuthenticated && !replyTo && (
        <form onSubmit={(e) => submit(e)} className="mt-12 group">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/5 transition-all shadow-sm">
            <textarea 
              className="w-full p-8 text-sm text-slate-700 outline-none resize-none bg-transparent placeholder:text-slate-300 font-bold leading-relaxed min-h-[120px]"
              placeholder="당신의 날카로운 통찰을 공유하십시오..."
              value={content} onChange={e => setContent(e.target.value)}
            />
            <div className="flex justify-end p-4 bg-slate-50/50 border-t border-slate-50">
              <button 
                type="submit" disabled={sending || !content.trim()}
                className="px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-200 disabled:opacity-20 transition-all flex items-center gap-3 active:scale-95"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                통찰 전송하기
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
