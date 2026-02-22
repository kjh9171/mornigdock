import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Trash2, Youtube, Mic2, Music, 
  Loader2, X, Play, Video, Send, 
  CheckCircle2, Clock, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

interface Media {
  id: number;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  is_active: boolean;
}

const TYPE_ICONS = { youtube: Youtube, podcast: Mic2, music: Music };

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function MediaPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [media,    setMedia]    = useState<Media[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<string>('all');
  const [playing,  setPlaying]  = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isRequestMode, setIsRequestMode] = useState(false);
  const [form,     setForm]     = useState({ title: '', url: '', content: '' });
  const [saving,   setSaving]   = useState(false);

  const canModerate = user?.role === 'admin' || user?.role === 'editor';

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const { data } = await api.get('/media', { params });
      setMedia(data.data);
    } catch { 
      setMedia([]); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, [filter]);

  const handleRequestMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('로그인이 필요합니다.');
    setSaving(true);
    try {
      // 관리자에게 문의글로 신청
      await api.post('/media/request', form);
      alert('관리자에게 음악 신청 문의가 전송되었습니다! 검토 후 리스트에 추가됩니다.');
      setShowForm(false);
      setForm({ title: '', url: '', content: '' });
    } catch (err: any) {
      alert(err.response?.data?.message ?? '신청 실패');
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 min-h-screen">
      {/* ── 헤더 섹션 ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Video size={28} className="stroke-[2.5]" />
            <span className="text-sm font-black uppercase tracking-widest">Entertainment Stream</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">미디어 센터</h1>
          <p className="text-slate-500 mt-2 font-medium">유튜브, 팟캐스트 및 요원들이 신청한 음악 큐레이션</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsRequestMode(true); setShowForm(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <MessageSquare size={16} className="text-blue-600" />
            관리자에게 음악 신청하기
          </button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex flex-wrap gap-3 mb-10 px-4">
        {['all', 'youtube', 'podcast', 'music'].map(t_key => {
          const Icon = t_key === 'all' ? null : TYPE_ICONS[t_key as keyof typeof TYPE_ICONS];
          return (
            <button key={t_key}
              onClick={() => setFilter(t_key)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                filter === t_key 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              {Icon && <Icon size={16} />}
              {t_key === 'all' ? '전체 보기' : t(t_key)}
            </button>
          );
        })}
      </div>

      {/* 미디어 그리드 */}
      {loading ? (
        <div className="py-40 text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-600 opacity-20" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Media Loading...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {media.map(item => {
            const ytId = item.type === 'youtube' ? getYoutubeId(item.url) : null;
            const Icon = TYPE_ICONS[item.type];
            return (
              <div key={item.id} className="group bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 transition-all overflow-hidden flex flex-col shadow-sm">
                <div className="aspect-video bg-slate-100 relative group/player overflow-hidden">
                  {playing === item.id && ytId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : ytId ? (
                    <button className="w-full h-full" onClick={() => setPlaying(item.id)}>
                      <img 
                        src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                        onError={(e) => (e.currentTarget.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`)}
                        className="w-full h-full object-cover group-hover/player:scale-110 transition-transform duration-700" 
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover/player:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl transform scale-90 opacity-0 group-hover/player:scale-100 group-hover/player:opacity-100 transition-all duration-500">
                          <Play size={28} fill="currentColor" className="ml-1" />
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br ${item.type === 'music' ? 'from-blue-500/10 to-indigo-500/10' : 'from-orange-500/10 to-red-500/10'}`}>
                      <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-xl ${item.type === 'music' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'}`}>
                        <Icon size={32} />
                      </div>
                      <audio controls className="w-4/5 h-10 opacity-80" src={item.url} />
                    </div>
                  )}
                </div>

                <div className="p-8 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${item.type === 'youtube' ? 'bg-red-50 text-red-600' : item.type === 'music' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                      {item.type}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 leading-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 uppercase">
                    {item.title}
                  </h3>
                  {item.description && <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-6">{item.description}</p>}
                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{format(new Date(), 'yyyy.MM.dd')}</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Verified Asset</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 음악 신청 모달 ── */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in-95 duration-500">
            <div className="flex items-center justify-between mb-10">
              <div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">관리자에게 음악 신청</h2>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">문의글을 남겨주시면 관리자가 검토합니다.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 flex items-center justify-center transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleRequestMusic} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">곡 제목 / 아티스트</label>
                <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-800" 
                  value={form.title} required
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="예: NewJeans - Ditto" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">유튜브 또는 소스 URL</label>
                <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 font-mono text-sm" 
                  value={form.url} required type="url"
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://youtube.com/..." />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">추가 메시지</label>
                <textarea className="w-full px-6 py-4 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none font-bold text-slate-800 resize-none" 
                  rows={3} value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="관리자에게 남길 말을 적어주세요..." />
              </div>
              <button type="submit" disabled={saving} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                신청 문의글 전송
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
