import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { createPostAPI } from '../lib/api';
import { 
  PenSquare, AlertCircle, ArrowLeft, Send, 
  Loader2, Sparkles, Layout
} from 'lucide-react';

const CATEGORIES = [
  { id: 'general', label: '자유토론' },
  { id: 'tech', label: '기술/IT' },
  { id: 'economy', label: '경제/금융' },
  { id: 'news_analysis', label: '뉴스분석' }
];

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
    if (!form.title.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!form.content.trim()) { setError('내용을 입력해주세요.'); return; }
    
    setIsSubmitting(true);
    try {
      // 🔥 [핵심] DB 제약 조건에 맞춰 type을 'post'로 전송합니다.
      const res = await createPostAPI({ 
        type: form.category === 'news_analysis' ? 'news' : 'post', 
        category: form.category,
        title: form.title,
        content: form.content
      });
      
      if (res.success) {
        navigate(`/board/${res.post.id}`);
      } else {
        setError(res.message || '게시글 작성에 실패했습니다.');
      }
    } catch (err: any) {
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-500 min-h-screen">
      {/* ── 헤더 섹션 ── */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/board')} 
          className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-sm transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">아젠다 발제</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">New Operational Insight</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-8">
          {error && (
            <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-sm text-red-600 font-bold">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">카테고리</label>
              <select 
                value={form.category} 
                onChange={e => setForm(p => ({...p, category: e.target.value}))}
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all appearance-none cursor-pointer"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">제목</label>
              <input 
                value={form.title} 
                onChange={e => setForm(p => ({...p, title: e.target.value}))}
                placeholder="토론할 주제를 입력하세요..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-blue-500 transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 block">통찰 내용</label>
            <textarea 
              value={form.content} 
              onChange={e => setForm(p => ({...p, content: e.target.value}))}
              rows={12} 
              placeholder="요원들과 공유하고 싶은 상세 내용을 작성해 주세요..."
              className="w-full bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-base font-medium text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-all resize-none placeholder:text-slate-300 leading-relaxed"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-3 px-12 py-5 bg-blue-600 text-white rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 disabled:opacity-20"
            >
              {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              {isSubmitting ? '전송 중...' : '인사이트 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
