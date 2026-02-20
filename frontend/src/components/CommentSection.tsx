import { useState, useEffect } from 'react';
import { api, addCommentAPI, Comment } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { Send, Loader2, Reply, Trash2, Edit2, CornerDownRight, Fingerprint, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

interface Props {
  newsId: number;
}

export default function CommentSection({ newsId }: Props) {
  const { user, isAuthenticated } = useAuthStore();
  const { t, i18n } = useTranslation();
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
    const text = parentId ? content : content;
    if (!text.trim()) return;
    setSending(true);
    try {
      const res = await addCommentAPI(newsId, text.trim(), parentId);
      if (res.success) {
        setContent(''); setReplyTo(null);
        await load();
      }
    } catch (err: any) {
      console.error(err);
    } finally { setSending(false); }
  };

  const deleteComment = async (id: number) => {
    if (!confirm(t('confirm_delete') || 'Delete this node?')) return;
    try {
      const res = await api.delete(`/comments/${id}`);
      if (res.data.success) await load();
    } catch (err: any) { console.error(err); }
  };

  const saveEdit = async (id: number) => {
    if (!editText.trim()) return;
    try {
      const res = await api.put(`/comments/${id}`, { content: editText.trim() });
      if (res.data.success) {
        setEditId(null); setEditText('');
        await load();
      }
    } catch (err: any) { console.error(err); }
  };

  const CommentItem = ({ comment, depth = 0 }: { comment: Comment; depth?: number }) => (
    <div className={`py-6 ${depth > 0 ? 'ml-10 border-l border-white/5 pl-6' : 'border-b border-white/5'}`}>
      <div className="flex gap-4">
        {depth > 0 && <CornerDownRight className="w-4 h-4 text-white/10 mt-1" />}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-agora-gold uppercase">
                {comment.author_name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className={`text-[11px] font-black uppercase tracking-tight ${comment.author_name.includes('Admin') ? 'text-agora-gold' : 'text-white'}`}>
                  {comment.author_name} {comment.author_name.includes('Admin') && ' (HQ)'}
                </span>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: i18n.language === 'ko' ? ko : enUS })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {isAuthenticated && depth === 0 && (
                <button 
                  className="text-[9px] font-black text-agora-accent uppercase hover:underline flex items-center gap-1 opacity-40 hover:opacity-100 transition-all"
                  onClick={() => { setReplyTo(replyTo === comment.id ? null : comment.id); setContent(''); }}>
                  <Reply size={12} /> {t('reply')}
                </button>
              )}
              {user && (user.id === comment.user_id || user.role === 'admin') && (
                <div className="flex items-center gap-3">
                  <button className="text-[9px] font-black text-white/20 uppercase hover:text-white flex items-center gap-1 transition-all"
                    onClick={() => { setEditId(comment.id); setEditText(comment.content); }}>
                    <Edit2 size={12} />
                  </button>
                  <button className="text-[9px] font-black text-white/20 uppercase hover:text-red-400 flex items-center gap-1 transition-all"
                    onClick={() => deleteComment(comment.id)}>
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {editId === comment.id ? (
            <div className="flex gap-3 mt-4">
              <input 
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold text-white outline-none focus:border-agora-gold/30 transition-all"
                value={editText} onChange={e => setEditText(e.target.value)} autoFocus
              />
              <button className="px-6 py-3 bg-agora-gold text-agora-bg rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={() => saveEdit(comment.id)}>{t('submit')}</button>
              <button className="px-6 py-3 bg-white/5 text-white/40 rounded-xl text-[10px] font-black uppercase tracking-widest" onClick={() => setEditId(null)}>{t('cancel')}</button>
            </div>
          ) : (
            <p className="text-sm text-white/70 leading-relaxed font-medium pl-11">{comment.content}</p>
          )}

          {replyTo === comment.id && (
            <form onSubmit={(e) => submit(e, comment.id)} className="mt-6 flex gap-3 animate-in slide-in-from-top-4 duration-300 ml-11">
              <input 
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[11px] font-bold text-white outline-none focus:border-agora-gold/30 transition-all"
                placeholder="Initialize tactical response..."
                value={content} onChange={e => setContent(e.target.value)} autoFocus
              />
              <button type="submit" className="bg-white/10 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/5" disabled={sending}>
                {sending ? <Loader2 size={12} className="animate-spin" /> : 'Launch'}
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
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-agora-gold" />
            {t('comments')}
        </h3>
        <span className="text-[10px] font-black font-mono text-white/20 tracking-widest uppercase">Nodes: {comments.length}</span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-agora-gold w-8 h-8" />
            <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Syncing Intelligence...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map(c => <CommentItem key={c.id} comment={c} />)}
          {comments.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center gap-6 opacity-20">
                  <Fingerprint size={48} className="text-white" />
                  <p className="text-[10px] text-white font-black uppercase tracking-[0.3em]">{t('no_intel')}</p>
              </div>
          )}
        </div>
      )}

      {isAuthenticated && !replyTo && (
        <form onSubmit={(e) => submit(e)} className="relative mt-12 group">
          <div className="absolute inset-0 bg-agora-gold/5 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
          <textarea 
            className="relative w-full p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-sm font-bold text-white outline-none focus:bg-white/[0.08] focus:border-agora-gold/30 transition-all pr-24 shadow-2xl placeholder:text-white/10"
            placeholder={t('write_comment')}
            value={content} onChange={e => setContent(e.target.value)} rows={4}
          />
          <button 
            type="submit" disabled={sending || !content.trim()}
            className="absolute right-6 bottom-6 p-4 bg-primary-600 hover:bg-primary-500 text-white rounded-[1.5rem] transition-all disabled:opacity-30 shadow-xl shadow-primary-900/40 active:scale-90"
          >
            {sending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
          </button>
        </form>
      )}
    </div>
  );
}
