import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { getPostAPI, addCommentAPI, deletePostAPI, Post, Comment } from '../lib/api';
import { User, Clock, Eye, MessageSquare, CornerDownRight, Trash2, ArrowLeft, Send, ExternalLink, Bot, ShieldCheck, Sparkles, TrendingUp, AlertTriangle, Target, Fingerprint, Share2, Loader2, MessageCircle } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function CommentItem({ comment, allComments, postId, onCommentAdded, depth = 0 }: {
  comment: Comment
  allComments: Comment[]
  postId: number
  onCommentAdded: (c: Comment) => void
  depth?: number
}) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const replies = allComments.filter(c => c.parent_id === comment.id);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setIsSubmitting(true);
    const res = await addCommentAPI(postId, replyText.trim(), comment.id);
    if (res.success && res.comment) {
      onCommentAdded(res.comment);
      setReplyText('');
      setShowReply(false);
    }
    setIsSubmitting(false);
  };

  if (comment.is_deleted) {
    return (
      <div className={`${depth > 0 ? 'ml-10 mt-6' : ''}`}>
        <div className="py-4 text-[10px] text-white/20 italic bg-white/5 rounded-2xl px-6 border border-dashed border-white/10 uppercase tracking-widest font-black">Declassified/Deleted Intelligence</div>
        {replies.map(r => (
          <CommentItem key={r.id} comment={r} allComments={allComments} postId={postId} onCommentAdded={onCommentAdded} depth={depth + 1} />
        ))}
      </div>
    );
  }

  return (
    <div className={`${depth > 0 ? 'ml-10 mt-6' : 'mt-8'}`}>
      <div className="glass-container p-6 rounded-3xl border border-white/5 relative group hover:bg-white/[0.03] transition-all duration-500">
        {depth > 0 && <CornerDownRight className="absolute -left-8 top-8 w-4 h-4 text-white/10" />}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-[10px] font-black text-agora-gold uppercase group-hover:scale-110 transition-transform">
                {comment.author_name.charAt(0)}
            </div>
            <div className="flex flex-col">
                <span className={`text-[11px] font-black uppercase tracking-tight ${comment.author_name.includes('Admin') ? 'text-agora-gold' : 'text-white'}`}>
                {comment.author_name} {comment.author_name.includes('Admin') && ' (HQ)'}
                </span>
                <span className="text-[9px] font-bold text-white/20 uppercase tracking-tighter">{formatDateTime(comment.created_at)}</span>
            </div>
          </div>
          {user && (
            <button onClick={() => setShowReply(!showReply)} className="text-[9px] font-black text-agora-gold uppercase tracking-widest hover:underline opacity-0 group-hover:opacity-100 transition-all">Reply</button>
          )}
        </div>
        <p className="text-sm text-white/70 font-medium leading-relaxed whitespace-pre-wrap pl-11">{comment.content}</p>
        
        {showReply && (
          <div className="mt-6 flex gap-3 animate-in slide-in-from-top-4 duration-300 ml-11">
            <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Enter tactical response..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-white border-white/10 focus:border-agora-gold/30 outline-none transition-all" />
            <button onClick={handleReply} disabled={isSubmitting || !replyText.trim()} className="px-6 bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5">{isSubmitting ? '...' : 'Launch'}</button>
          </div>
        )}
      </div>
      {replies.map(r => (
        <CommentItem key={r.id} comment={r} allComments={allComments} postId={postId} onCommentAdded={onCommentAdded} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { setView, setSelectedNewsId } = useNavigationStore();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPostAPI(parseInt(id)).then(res => {
      if (res.success) { 
        setPost(res.post); 
        setComments(res.comments); 
      }
    }).finally(() => setIsLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!post || !confirm('Confirm Declassification & Deletion?')) return;
    const res = await deletePostAPI(post.id);
    if (res.success) navigate('/board');
  };

  const handleComment = async () => {
    if (!commentText.trim() || !post) return;
    setIsSubmitting(true);
    const res = await addCommentAPI(post.id, commentText.trim());
    if (res.success && res.comment) { setComments(prev => [...prev, res.comment]); setCommentText(''); }
    setIsSubmitting(false);
  };

  const handleAIAnalysis = () => {
    if (!post) return;
    setSelectedNewsId(post.id);
    setView('ai-analysis');
    navigate('/');
  };

  const rootComments = comments.filter(c => c.parent_id === null);

  if (isLoading) return (
    <div className="py-40 flex flex-col items-center justify-center animate-pulse">
        <Loader2 className="w-10 h-10 text-agora-gold animate-spin mb-4" />
        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">{t('loading')}</span>
    </div>
  );

  if (!post) return (
    <div className="py-40 text-center space-y-8">
      <div className="flex flex-col items-center gap-4">
        <Target size={48} className="text-white/10" />
        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] font-mono">Terminal Error: Data Node Purged</p>
      </div>
      <button onClick={() => navigate('/board')} className="px-10 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
        {t('back_to_hq')}
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-40">
      {/* ── 상단 제어 바 ── */}
      <div className="flex items-center justify-between px-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-3 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {t('back_to_hq')}
        </button>
        <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-agora-gold transition-colors">
                <Share2 size={14} /> Share
            </button>
            {(user?.id === post.author_id || user?.role === 'admin') && (
            <button onClick={handleDelete} className="flex items-center gap-2 text-[10px] font-black text-red-400 uppercase tracking-widest hover:underline active:scale-95 transition-all">
                <Trash2 className="w-4 h-4" /> {t('delete_intel')}
            </button>
            )}
        </div>
      </div>

      {/* ─── 지능물 본문 카드 ─── */}
      <div className="glass-container rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-agora-gold/5 blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="p-10 md:p-14 border-b border-white/5 relative">
          <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[9px] font-black px-4 py-1.5 rounded-full bg-agora-gold text-agora-bg uppercase tracking-widest">
                {post.source || 'INTERNAL OPS'}
              </span>
              <span className="text-[9px] font-black px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-agora-gold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> {t('verified_intel')}
              </span>
            </div>
            
            {post.source_url && (
              <a href={post.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group">
                <ExternalLink className="w-4 h-4 text-agora-gold" />
                Original Source Control
              </a>
            )}
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-10 leading-[1.15] tracking-tight uppercase max-w-4xl">{post.title}</h1>
          
          <div className="flex flex-wrap items-center gap-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] font-mono">
            <span className="flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-xl"><User size={14} className="text-agora-gold" /> {post.author_name}</span>
            <span className="flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-xl"><Clock size={14} /> {formatDateTime(post.created_at)}</span>
            <span className="flex items-center gap-2.5 bg-white/5 px-4 py-2 rounded-xl"><Eye size={14} /> Views: {post.view_count}</span>
          </div>
        </div>

        <div className="p-10 md:p-14 relative">
          <div className="text-lg text-white/80 leading-[1.8] font-medium whitespace-pre-wrap max-w-4xl">
            {post.content}
          </div>
        </div>

        {/* ─── AI 지능 분석 결과 ─── */}
        {post.ai_analysis ? (
          <div className="p-10 md:p-14 bg-white/[0.02] border-t border-white/5">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-agora-gold/20 border border-agora-gold/30 rounded-2xl">
                <Bot className="w-6 h-6 text-agora-gold" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                  Strategic Neural Intel
                  <Sparkles className="w-4 h-4 text-agora-gold animate-pulse" />
                </h3>
                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Impact Directive Report v2.4</p>
              </div>
            </div>
            
            <div className="bg-white/[0.03] p-10 rounded-[2.5rem] border border-white/5 shadow-inner relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity duration-1000"><Bot className="w-48 h-48 text-white" /></div>
              <div className="relative z-10 grid grid-cols-1 gap-12">
                <div className="prose prose-invert max-w-none">
                  <pre className="text-[13px] text-white/70 whitespace-pre-wrap font-sans leading-relaxed italic tracking-wide">
                    {post.ai_analysis}
                  </pre>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 border-t border-white/5">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                    <div className="flex items-center gap-3 mb-3 text-agora-gold"><TrendingUp size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Market Vector</span></div>
                    <div className="text-xs text-white/50 font-bold uppercase tracking-tight">Evolving Dynamics</div>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                    <div className="flex items-center gap-3 mb-3 text-red-400"><AlertTriangle size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Risk Index</span></div>
                    <div className="text-xs text-red-400/70 font-black uppercase tracking-tighter">Strategic Threat - Lv.4</div>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/[0.08] transition-all">
                    <div className="flex items-center gap-3 mb-3 text-emerald-400"><Target size={16} /><span className="text-[10px] font-black uppercase tracking-widest">Primary Objective</span></div>
                    <div className="text-xs text-emerald-400/70 font-bold uppercase tracking-tight">Immediate Monitoring</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : post.type === 'news' && (
          <div className="p-14 bg-white/[0.02] border-t border-white/5 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-6 group">
                <Bot className="w-8 h-8 text-white/10 group-hover:text-agora-gold transition-colors" />
            </div>
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-[0.2em] mb-10 leading-relaxed max-w-xs">
                Strategic analysis for this intelligence node has not been initialized.
            </p>
            <button 
              onClick={handleAIAnalysis}
              className="flex items-center gap-4 px-12 py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-primary-900/40 active:scale-95"
            >
              <Sparkles className="w-4 h-4" /> Initialize Neural Intel
            </button>
          </div>
        )}
      </div>

      {/* ─── 아고라 통합 토론장 ─── */}
      <div className="space-y-10">
          <div className="flex items-center justify-between border-b border-white/5 pb-6">
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-4">
                <div className="p-2.5 bg-white/5 rounded-2xl"><MessageSquare className="w-6 h-6 text-agora-gold" /></div>
                {t('discussion_room')} 
                <span className="text-white/20 font-black font-mono text-sm ml-2">[{comments.filter(c => !c.is_deleted).length} Nodes]</span>
            </h3>
          </div>
          
          {user ? (
            <div className="relative group">
              <div className="absolute inset-0 bg-agora-gold/5 blur-2xl rounded-3xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
              <textarea 
                value={commentText} onChange={e => setCommentText(e.target.value)} 
                rows={4} placeholder={t('write_comment')} 
                className="relative w-full p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-sm font-bold text-white outline-none focus:bg-white/[0.08] focus:border-agora-gold/30 transition-all pr-24 shadow-2xl placeholder:text-white/10" 
              />
              <button onClick={handleComment} disabled={isSubmitting || !commentText.trim()} className="absolute right-6 bottom-6 p-4 bg-primary-600 hover:bg-primary-500 text-white rounded-[1.5rem] transition-all disabled:opacity-20 shadow-xl shadow-primary-900/40 active:scale-90">
                <Send className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="p-12 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem] text-center group cursor-pointer hover:bg-white/[0.04] transition-all">
              <Link to="/login" className="flex flex-col items-center gap-4">
                  <Fingerprint className="w-10 h-10 text-white/5 group-hover:text-agora-gold transition-colors" />
                  <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.3em] group-hover:text-white transition-colors">Neural Link Required for Session Entry</span>
              </Link>
            </div>
          )}

          <div className="space-y-4">
            {rootComments.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-4 text-white/5 uppercase tracking-[0.4em] font-black text-[10px]">
                  <MessageCircle size={32} />
                  <span>Silent Frequency</span>
              </div>
            ) : (
              rootComments.map(comment => (
                <CommentItem key={comment.id} comment={comment} allComments={comments} postId={post.id} onCommentAdded={(c) => setComments(p => [...p, c])} />
              ))
            )}
          </div>
      </div>
    </div>
  );
}
