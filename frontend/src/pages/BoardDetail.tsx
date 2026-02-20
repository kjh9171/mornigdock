import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { getPostAPI, deletePostAPI, Post } from '../lib/api';
import { User, Clock, Eye, MessageSquare, Trash2, ArrowLeft, ExternalLink, Bot, ShieldCheck, Sparkles, TrendingUp, AlertTriangle, Target, Fingerprint, Share2, Loader2 } from 'lucide-react';
import { useNavigationStore } from '../store/useNavigationStore';
import CommentSection from '../components/CommentSection';

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { setView, setSelectedNewsId } = useNavigationStore();
  
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getPostAPI(parseInt(id)).then(res => {
      if (res.success) setPost(res.post); 
    }).finally(() => setIsLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!post || !confirm('Confirm Declassification & Deletion?')) return;
    const res = await deletePostAPI(post.id);
    if (res.success) navigate('/board');
  };

  const handleAIAnalysis = () => {
    if (!post) return;
    setSelectedNewsId(post.id);
    setView('ai-analysis');
    navigate('/');
  };

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
                {post.category || 'INTERNAL OPS'}
              </span>
              <span className="text-[9px] font-black px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-agora-gold uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" /> {t('verified_intel')}
              </span>
            </div>
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

        {/* ─── AI 지능 분석 결과 (게시글) ─── */}
        {post.ai_report ? (
          <div className="p-10 md:p-14 bg-white/[0.02] border-t border-white/5">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-3 bg-agora-gold/20 border border-agora-gold/30 rounded-2xl">
                <Bot className="w-6 h-6 text-agora-gold" />
              </div>
              <h3 className="text-xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                Strategic Neural Intel
                <Sparkles className="w-4 h-4 text-agora-gold animate-pulse" />
              </h3>
            </div>
            <div className="bg-white/[0.03] p-10 rounded-[2.5rem] border border-white/5 shadow-inner relative overflow-hidden group">
               <p className="text-[13px] text-white/70 whitespace-pre-wrap font-sans leading-relaxed italic tracking-wide">{post.ai_report}</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ─── 통합 댓글 섹션 ─── */}
      <CommentSection postId={post.id} />
    </div>
  );
}
