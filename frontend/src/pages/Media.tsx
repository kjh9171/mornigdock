import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { 
  Plus, Trash2, Youtube, Mic2, Music, 
  Loader2, X, Play, Video, Send, 
  CheckCircle2, Clock
} from 'lucide-react';

interface Media {
  id: number;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  is_active: boolean;
  requester_name?: string;
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
  const [form,     setForm]     = useState({ type: 'music', title: '', description: '', url: '' });
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('로그인이 필요합니다.');
    setSaving(true);
    try {
      const endpoint = isRequestMode ? '/media/request' : '/media';
      await api.post(endpoint, form);
      alert(isRequestMode ? '음악 신청이 완료되었습니다! 관리자 승인 후 리스트에 추가됩니다.' : '미디어가 추가되었습니다.');
      setShowForm(false);
      setForm({ type: 'music', title: '', description: '', url: '' });
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? '처리 실패');
    } finally { 
      setSaving(false); 
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/media/${id}`);
      setMedia(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      alert('삭제 실패');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.put(`/media/${id}`, { is_active: true });
      setMedia(prev => prev.map(m => m.id === id ? { ...m, is_active: true } : m));
    } catch (err) {
      alert('승인 실패');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 min-h-screen">
      {/* ── 헤더 섹션 ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Video size={28} className="stroke-[2.5]" />
            <span className="text-sm font-black uppercase tracking-widest">Entertainment & Intelligence</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">미디어 센터</h1>
          <p className="text-slate-500 mt-2 font-medium">유튜브, 팟캐스트 및 요원들이 신청한 음악 큐레이션</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { setIsRequestMode(true); setShowForm(true); }}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm"
          >
            <Music size={16} className="text-blue-600" />
            음악 신청하기
          </button>
          {canModerate && (
            <button 
              onClick={() => { setIsRequestMode(false); setShowForm(true); }}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
            >
              <Plus size={16} />
              미디어 직접 추가
            </button>
          )}
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
      ) : media.length === 0 ? (
        <div className="py-40 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100 mx-4">
          <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">미디어 저장소가 비어 있습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
          {media.map(item => {
            const ytId = item.type === 'youtube' ? getYoutubeId(item.url) : null;
            const Icon = TYPE_ICONS[item.type];
            return (
              <div key={item.id} className="group bg-white rounded-[2.5rem] border border-slate-100 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-500/10 transition-all overflow-hidden flex flex-col shadow-sm relative">
                
                {/* 대기 중 뱃지 */}
                {!item.is_active && (
                  <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-amber-500 text-white text-[10px] font-black rounded-lg shadow-lg animate-pulse">
                    승인 대기 중
                  </div>
                )}

                {/* 미디어 플레이어 영역 */}
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
                    <span className="text-[11px] font-bold text-slate-300">|</span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {item.requester_name ? `${item.requester_name} 요원 신청` : 'AGORA 공식 큐레이션'}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-slate-800 leading-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-2 uppercase">
                    {item.title}
                  </h3>
                  
                  {item.description && (
                    <p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2 mb-6">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Clock size={14} />
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {format(new Date(), 'yyyy.MM.dd')}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {canModerate && !item.is_active && (
                        <button 
                          onClick={() => handleApprove(item.id)}
                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                          title="승인"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      {canModerate && (
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-2.5 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="삭제"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 미디어 신청/추가 모달 ── */}
      {showForm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="w-full max-w-lg bg-white rounded-[3rem] p-10 shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="flex items-center justify-between mb-10">
              <div>
                 <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                   {isRequestMode ? '음악 신청하기' : '미디어 직접 추가'}
                 </h2>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mt-1">
                   {isRequestMode ? ' 요원들의 감성을 공유해 주세요' : '시스템 통합 미디어 관리'}
                 </p>
              </div>
              <button onClick={() => setShowForm(false)} className="w-12 h-12 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-8">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">카테고리</label>
                <select className="w-full px-6 py-4 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800 appearance-none cursor-pointer" 
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="youtube">YouTube 영상</option>
                  <option value="podcast">팟캐스트 오디오</option>
                  <option value="music">음악 스트리밍</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">제목</label>
                <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300" 
                  value={form.title} required
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="미디어 제목을 입력하세요..." />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">URL 주소</label>
                <input className="w-full px-6 py-4 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 font-mono text-sm" 
                  value={form.url} required type="url"
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">설명 (선택)</label>
                <textarea className="w-full px-6 py-4 bg-slate-50 border border-slate-100 focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 resize-none" 
                  rows={3} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="간략한 설명을 적어주세요..." />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" className="flex-1 py-5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all" onClick={() => setShowForm(false)}>취소</button>
                <button type="submit" className="flex-1 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50" disabled={saving}>
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {isRequestMode ? '신청하기' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
