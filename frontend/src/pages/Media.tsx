import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, Trash2, Youtube, Mic2, Music, Loader2, X } from 'lucide-react';

interface Media {
  id: number;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  description: string;
  url: string;
  thumbnail: string;
}

const TYPE_ICONS = { youtube: Youtube, podcast: Mic2, music: Music };
const TYPE_LABELS = { youtube: 'YouTube', podcast: '팟캐스트', music: '음악' };

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default function MediaPage() {
  const { user } = useAuthStore();
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">미디어 센터</h1>
          <p className="text-agora-muted text-sm mt-0.5">YouTube · 팟캐스트 · 음악 스트리밍</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> 미디어 추가
          </button>
        )}
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 bg-agora-surface border border-agora-border rounded-lg p-1 w-fit">
        {['all', 'youtube', 'podcast', 'music'].map(t => (
          <button key={t}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              filter === t ? 'bg-agora-accent text-white' : 'text-agora-muted hover:text-agora-text'
            }`}
            onClick={() => setFilter(t)}>
            {t !== 'all' && (() => { const Icon = TYPE_ICONS[t as keyof typeof TYPE_ICONS]; return <Icon size={13} />; })()}
            {t === 'all' ? '전체' : TYPE_LABELS[t as keyof typeof TYPE_LABELS]}
          </button>
        ))}
      </div>

      {/* 미디어 그리드 */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-agora-muted">
          <Loader2 size={24} className="animate-spin mr-2" /> 로딩 중...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-agora-muted">
          {canEdit ? '미디어를 추가해 보세요.' : '미디어가 없습니다.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const ytId = item.type === 'youtube' ? getYoutubeId(item.url) : null;
            const Icon = TYPE_ICONS[item.type];
            return (
              <div key={item.id} className="card card-hover overflow-hidden">
                {/* YouTube 임베드 */}
                {playing === item.id && ytId ? (
                  <div className="aspect-video mb-3 rounded-lg overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  </div>
                ) : ytId ? (
                  <button
                    className="relative aspect-video mb-3 rounded-lg overflow-hidden w-full group"
                    onClick={() => setPlaying(item.id)}>
                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt={item.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                        <div className="w-0 h-0 border-y-[8px] border-y-transparent border-l-[14px] border-l-white ml-1" />
                      </div>
                    </div>
                  </button>
                ) : null}

                {/* 오디오 플레이어 */}
                {(item.type === 'podcast' || item.type === 'music') && (
                  <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg ${
                    item.type === 'music' ? 'bg-purple-500/10' : 'bg-orange-500/10'
                  }`}>
                    <Icon size={18} className={item.type === 'music' ? 'text-purple-400' : 'text-orange-400'} />
                    <audio controls className="flex-1 h-8" src={item.url}>
                      브라우저가 오디오를 지원하지 않습니다.
                    </audio>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={13} className="text-agora-muted flex-shrink-0" />
                      <span className="text-xs text-agora-muted">{TYPE_LABELS[item.type]}</span>
                    </div>
                    <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-agora-muted mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  {canEdit && (
                    <button onClick={() => handleDelete(item.id)}
                      className="flex-shrink-0 text-agora-muted hover:text-red-400 transition-colors p-1">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 미디어 추가 모달 ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="card w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">미디어 추가</h2>
              <button onClick={() => setShowForm(false)} className="text-agora-muted hover:text-agora-text">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs text-agora-muted mb-1 block">타입</label>
                <select className="input" value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="youtube">YouTube</option>
                  <option value="podcast">팟캐스트</option>
                  <option value="music">음악</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-agora-muted mb-1 block">제목</label>
                <input className="input" value={form.title} required
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="미디어 제목" />
              </div>
              <div>
                <label className="text-xs text-agora-muted mb-1 block">URL</label>
                <input className="input" value={form.url} required type="url"
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder={form.type === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://....'} />
              </div>
              <div>
                <label className="text-xs text-agora-muted mb-1 block">설명 (선택)</label>
                <textarea className="input resize-none" rows={2} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="미디어 설명..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" className="btn-ghost flex-1" onClick={() => setShowForm(false)}>취소</button>
                <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={saving}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
