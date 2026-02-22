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
    <div className={`py-6 ${depth > 0 ? 'ml-12 pl-6 border-l border-white/5 bg-white/[0.01]' : 'border-b border-white/5 hover:bg-white/[0.01] transition-all'}`}>
      <div className="flex items-start gap-4">
        {depth > 0 && <CornerDownRight className="w-5 h-5 text-white/10 mt-1 shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
               <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${comment.author_name?.includes('Admin') ? 'bg-agora-gold text-primary-900' : 'bg-white/10 text-white/40'}`}>
                  {comment.author_name?.[0]?.toUpperCase() || 'A'}
               </div>
              <span className={`text-[11px] font-black uppercase tracking-widest ${comment.author_name?.includes('Admin') ? 'text-agora-gold' : 'text-white/60'}`}>
                {comment.author_name || 'Anonymous Envoy'} {comment.author_name?.includes('Admin') && '[HQ]'}
              </span>
              <span className="text-[10px] text-white/10 font-mono italic">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated && depth === 0 && (
                <button 
                  className="text-[10px] font-black text-white/20 hover:text-agora-gold uppercase tracking-widest flex items-center gap-2 transition-colors"
                  onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setContent(''); }}>
                  <Reply size={12} /> Response
                </button>
              )}
              {user && (user.id === comment.user_id || user.role === 'admin') && (
                <button className="text-white/10 hover:text-red-500 transition-colors"
                  onClick={() => deleteComment(comment.id)}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          <p className="text-sm text-white/70 leading-relaxed font-medium pl-11">{comment.content}</p>

          {replyTo === comment.id && (
            <form onSubmit={(e) => submit(e, comment.id)} className="mt-6 flex gap-3 animate-in slide-in-from-top-4 pl-11">
              <input 
                className="flex-1 px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white outline-none focus:border-agora-gold/30"
                placeholder="답변 내용을 연동하십시오..."
                value={content} onChange={e => setContent(e.target.value)} autoFocus
              />
              <button type="submit" className="bg-agora-gold text-primary-950 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl" disabled={sending}>
                Confirm
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
    <div className="agora-bg p-8 md:p-12 rounded-[2.5rem] border border-white/5 mt-16 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
        <MessageSquare className="w-6 h-6 text-agora-gold" />
        <h3 className="text-xl font-black text-white uppercase tracking-tighter">
          Intelligence Discussion <span className="text-agora-gold ml-2 bg-agora-gold/10 px-3 py-1 rounded-lg text-sm">[{comments.length}]</span>
        </h3>
      </div>

      {loading ? (
        <div className="py-20 text-center">
            <Loader2 className="animate-spin text-agora-gold mx-auto w-10 h-10" />
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-4">Syncing Comms...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {comments.map(c => <CommentItem key={c.id} comment={c} />)}
          {comments.length === 0 && (
              <div className="py-20 text-center text-white/10 text-[11px] font-black uppercase tracking-[0.5em] italic">
                  No Strategic Intelligence Logged.
              </div>
          )}
        </div>
      )}

      {isAuthenticated && !replyTo && (
        <form onSubmit={(e) => submit(e)} className="mt-12 relative group">
          <div className="border border-white/10 rounded-[2rem] overflow-hidden focus-within:border-agora-gold/30 transition-all bg-white/[0.02] shadow-inner">
            <textarea 
              className="w-full p-8 text-sm text-white/80 outline-none resize-none bg-transparent placeholder:text-white/10 font-bold leading-relaxed"
              placeholder="당신의 전략적 분석과 통찰을 공유하십시오..."
              value={content} onChange={e => setContent(e.target.value)} rows={4}
            />
            <div className="flex justify-end p-4 bg-white/[0.01] border-t border-white/5">
              <button 
                type="submit" disabled={sending || !content.trim()}
                className="px-10 py-3.5 bg-agora-gold text-primary-950 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:scale-105 hover:shadow-agora-gold/20 disabled:opacity-10 transition-all flex items-center gap-3 shadow-xl"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Transmit Insight
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
