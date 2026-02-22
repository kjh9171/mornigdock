import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Youtube, Mic2, Music, Loader2, X, Play, Video } from 'lucide-react';

interface Media {
  id: number;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  description: string;
  url: string;
  thumbnail: string;
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
  const [form,     setForm]     = useState({ type: 'youtube', title: '', description: '', url: '' });
  const [saving,   setSaving]   = useState(false);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const load = async () => {
    try {
      const params = filter !== 'all' ? { type: filter } : {};
      const { data } = await api.get('/media', { params });
      setMedia(data.data);
    } catch { setMedia([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/media', form);
      setShowForm(false);
      setForm({ type: 'youtube', title: '', description: '', url: '' });
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? '추가 실패');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.delete(`/media/${id}`);
    setMedia(prev => prev.filter(m => m.id !== id));
  };

  const filtered = filter === 'all' ? media : media.filter(m => m.type === filter);

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end justify-between border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 text-agora-gold mb-2">
            <Video size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Curation Stream</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">{t('media_center')}</h1>
          <p className="text-white/30 text-xs font-bold mt-2 uppercase tracking-wider">YouTube · Podcast · Music Streaming</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white transition-all shadow-xl active:scale-95">
            <Plus size={16} className="text-agora-gold" /> {t('add_media')}
          </button>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex flex-wrap gap-2">
        {['all', 'youtube', 'podcast', 'music'].map(t_key => (
          <button key={t_key}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
              filter === t_key ? 'bg-white text-agora-bg shadow-xl scale-[1.05]' : 'bg-white/5 text-white/30 hover:text-white/60 border border-white/5'
            }`}
            onClick={() => setFilter(t_key)}>
            {t_key !== 'all' && (() => { const Icon = TYPE_ICONS[t_key as keyof typeof TYPE_ICONS]; return <Icon size={14} />; })()}
            {t(t_key)}
          </button>
        ))}
      </div>

      {/* 미디어 그리드 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 text-white/20 animate-pulse">
          <Loader2 size={40} className="animate-spin mb-4 text-agora-gold" />
          <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t('loading')}</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-40 bg-white/5 rounded-[2.5rem] border border-white/5">
          <p className="text-white/20 text-xs font-black uppercase tracking-widest leading-loose">
            {canEdit ? 'The center is empty. Start adding intelligence.' : 'No Media In Intelligence Repository'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map(item => {
            const ytId = item.type === 'youtube' ? getYoutubeId(item.url) : null;
            const Icon = TYPE_ICONS[item.type];
            return (
              <div key={item.id} className="group glass-container rounded-[2rem] overflow-hidden transition-all duration-500 hover:bg-white/[0.05] border border-white/5 flex flex-col">
                {/* YouTube 임베드 */}
                {playing === item.id && ytId ? (
                  <div className="aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                ) : ytId ? (
                  <button
                    className="relative aspect-video overflow-hidden w-full group/thumb"
                    onClick={() => setPlaying(item.id)}>
                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt={item.title} className="w-full h-full object-cover grayscale brightness-50 group-hover/thumb:grayscale-0 group-hover/thumb:brightness-100 group-hover/thumb:scale-110 transition-all duration-700" />
                    <div className="absolute inset-0 bg-black/40 group-hover/thumb:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 bg-red-600/90 rounded-full flex items-center justify-center shadow-2xl transform translate-y-2 opacity-0 group-hover/thumb:translate-y-0 group-hover/thumb:opacity-100 transition-all duration-500">
                        <Play size={24} className="text-white ml-1" fill="currentColor" />
                      </div>
                    </div>
                    {/* Badge */}
                    <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-white/70">
                        YouTube
                    </div>
                  </button>
                ) : null}

                {/* 오디오 플레이어 */}
                {(item.type === 'podcast' || item.type === 'music') && (
                  <div className={`aspect-video flex flex-col items-center justify-center gap-6 p-8 bg-gradient-to-br transition-all duration-700 ${
                    item.type === 'music' ? 'from-purple-900/40 to-black/20' : 'from-orange-900/40 to-black/20'
                  }`}>
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-110 duration-500 ${
                       item.type === 'music' ? 'bg-purple-600 text-white' : 'bg-orange-600 text-white'
                    }`}>
                        <Icon size={28} />
                    </div>
                    <audio controls className="w-full h-10 opacity-60 hover:opacity-100 transition-opacity" src={item.url} />
                  </div>
                )}

                <div className="p-8 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-white/20" />
                        <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">{t(item.type)}</span>
                      </div>
                      <h3 className="text-lg font-black text-white group-hover:text-agora-accent transition-colors duration-300 leading-snug line-clamp-2 uppercase tracking-wide">{item.title}</h3>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-xs text-white/40 leading-relaxed line-clamp-2 mb-8">{item.description}</p>
                  )}

                  <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                       <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Active Intelligence</span>
                    </div>
                    {canEdit && (
                      <button onClick={() => handleDelete(item.id)}
                        className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-all duration-300 flex items-center justify-center">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 미디어 추가 모달 ── */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-lg agora-bg border border-white/10 rounded-[2.5rem] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="flex items-center justify-between mb-10">
              <div className="flex flex-col">
                 <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Add Intelligence</h2>
                 <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mt-1 text-agora-gold">New Media Protocol</p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-8">
              <div className="space-y-3 group">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-agora-gold transition-colors">Media Classification</label>
                <select className="w-full px-6 py-4 bg-white/5 border border-white/10 focus:border-agora-gold/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white appearance-none cursor-pointer" 
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="youtube">YouTube Video</option>
                  <option value="podcast">Podcast Audio</option>
                  <option value="music">Music Stream</option>
                </select>
              </div>
              <div className="space-y-3 group">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-agora-gold transition-colors">Title Identifier</label>
                <input className="w-full px-6 py-4 bg-white/5 border border-white/10 focus:border-agora-gold/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/10" 
                  value={form.title} required
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="E.g. Technical Analysis 01" />
              </div>
              <div className="space-y-3 group">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-agora-gold transition-colors">Source URL</label>
                <input className="w-full px-6 py-4 bg-white/5 border border-white/10 focus:border-agora-gold/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/10 font-mono text-sm" 
                  value={form.url} required type="url"
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder={form.type === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://....'} />
              </div>
              <div className="space-y-3 group">
                <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-agora-gold transition-colors">Intelligence Brief (Optional)</label>
                <textarea className="w-full px-6 py-4 bg-white/5 border border-white/10 focus:border-agora-gold/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/10 resize-none" 
                  rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detailed metadata description..." />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all" onClick={() => setShowForm(false)}>{t('cancel')}</button>
                <button type="submit" className="flex-1 py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-900/40 flex items-center justify-center gap-3 disabled:opacity-50" disabled={saving}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Execute Protocol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
