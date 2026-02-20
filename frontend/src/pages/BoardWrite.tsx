import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { createPostAPI } from '../lib/api';
import { PenSquare, AlertCircle, ArrowLeft, Save, Sparkles, Send, Loader2 } from 'lucide-react';

const CATEGORIES = ['general', 'tech', 'economy', 'environment', 'news_analysis'];

export default function BoardWrite() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: 'general', title: '', content: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError(t('subject_required') || '제목을 입력해주세요.'); return; }
    if (!form.content.trim()) { setError(t('content_required') || '내용을 입력해주세요.'); return; }
    setIsSubmitting(true);
    try {
      const res = await createPostAPI({ 
        type: form.category === 'news_analysis' ? 'news' : 'board', 
        category: form.category,
        title: form.title,
        content: form.content
      });
      if (res.success && res.post) {
        navigate(`/board/${res.post.id}`);
      } else {
        setError(res.message || '게시글 작성에 실패했습니다.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-12 animate-in fade-in duration-700 pb-40">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <button onClick={() => navigate('/board')} className="flex items-center gap-3 text-[10px] font-black text-white/40 uppercase tracking-widest hover:text-white transition-colors group mb-2">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> {t('back_to_hq')}
          </button>
          <div className="flex items-center gap-2 text-agora-gold">
              <PenSquare size={16} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Operational Protocol</span>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            {t('write_insight')}
          </h2>
        </div>
      </div>

      <div className="glass-container rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-agora-gold/5 blur-[100px] -mr-32 -mt-32"></div>
        
        <form onSubmit={handleSubmit} className="p-10 md:p-14 space-y-10 relative">
          {error && (
            <div className="p-6 bg-red-400/10 border border-red-400/20 rounded-2xl flex items-center gap-4 text-[11px] text-red-400 font-bold uppercase tracking-widest">
              <AlertCircle className="w-5 h-5" /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">{t('category')}</label>
                <div className="md:col-span-3">
                    <select 
                        value={form.category} 
                        onChange={e => setForm(p => ({...p, category: e.target.value}))}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[11px] font-black text-white uppercase tracking-[0.2em] outline-none focus:bg-white/[0.08] focus:border-agora-gold/30 transition-all appearance-none cursor-pointer"
                    >
                        {CATEGORIES.map(c => <option key={c} value={c} className="bg-agora-bg text-white">{t(c)}</option>)}
                    </select>
                </div>
            </div>

            <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">{t('subject')}</label>
                <input 
                    value={form.title} 
                    onChange={e => setForm(p => ({...p, title: e.target.value}))}
                    required 
                    maxLength={200} 
                    placeholder="Enter Intelligence Subject..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:bg-white/[0.08] focus:border-agora-gold/30 transition-all placeholder:text-white/10"
                />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 block">Operational Analysis</label>
            <textarea 
              value={form.content} 
              onChange={e => setForm(p => ({...p, content: e.target.value}))}
              required 
              rows={12} 
              placeholder={t('content_placeholder')}
              className="w-full bg-white/5 border border-white/10 rounded-[2rem] p-8 text-base font-medium text-white/80 outline-none focus:bg-white/[0.08] focus:border-agora-gold/30 transition-all resize-none placeholder:text-white/5 leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-6">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-4 px-12 py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-primary-900/40 active:scale-95 disabled:opacity-20"
            >
              {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                  <Send className="w-5 h-5" />
              )}
              {isSubmitting ? 'Syncing...' : t('write_insight')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
