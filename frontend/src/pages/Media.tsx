import React, { useState, useEffect } from 'react';
import { PlayCircle, Headphones, Youtube, Music, Search, X, Volume2, ExternalLink, Star } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

// ── 인터페이스 정의 ──────────────────────────────────────────
interface MediaItem {
  id: number;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  url: string;
  thumbnail: string;
  description: string;
  artist: string;
  is_active: boolean;
  is_featured: boolean;
  play_count: number;
  created_at: string;
}

// ── YouTube URL을 Embed URL로 변환 ───────────────────────────
function toEmbedUrl(url: string): string {
  const matchWatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (matchWatch) return `https://www.youtube.com/embed/${matchWatch[1]}?autoplay=1&rel=0`;

  const matchShort = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (matchShort) return `https://www.youtube.com/embed/${matchShort[1]}?autoplay=1&rel=0`;

  if (url.includes('/embed/')) return url;

  return url;
}

// ── 미디어 타입별 아이콘 컴포넌트 ───────────────────────────
const TypeIcon = ({ type, size = 18 }: { type: string; size?: number }) => {
  if (type === 'youtube')  return <Youtube size={size} className="text-red-500" />;
  if (type === 'podcast')  return <Headphones size={size} className="text-purple-500" />;
  return <Music size={size} className="text-emerald-500" />;
};

// ── 타입별 배지 색상 ─────────────────────────────────────────
const typeBg: Record<string, string> = {
  youtube: 'bg-red-600',
  podcast: 'bg-purple-600',
  music:   'bg-emerald-600',
};

// ═══════════════════════════════════════════════════════════════
// 메인 Media 컴포넌트
// ═══════════════════════════════════════════════════════════════
export default function Media() {
  const { isAuthenticated } = useAuthStore();
  const [mediaList, setMediaList]     = useState<MediaItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeType, setActiveType]   = useState<'all' | 'youtube' | 'podcast' | 'music'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [playing, setPlaying]         = useState<MediaItem | null>(null);
  const [showPlayer, setShowPlayer]   = useState(false);

  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm]         = useState({ title: '', url: '', content: '' });
  const [reqSending, setReqSending]   = useState(false);

  // ── 미디어 목록 패칭 ──────────────────────────────────────
  const fetchMedia = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (activeType !== 'all')  params.type   = activeType;
      if (searchQuery.trim())    params.search = searchQuery;

      const res = await api.get('/media', { params });
      if (res.data.success) {
        setMediaList(res.data.data);
      }
    } catch (err) {
      console.error('미디어 로딩 실패', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(fetchMedia, 300);
    return () => clearTimeout(t);
  }, [activeType, searchQuery]);

  // ── 미디어 재생 핸들러 ────────────────────────────────────
  const handlePlay = async (item: MediaItem) => {
    setPlaying(item);
    setShowPlayer(true);
    try {
      await api.post(`/media/${item.id}/play`);
      setMediaList(prev =>
        prev.map(m => m.id === item.id ? { ...m, play_count: m.play_count + 1 } : m)
      );
    } catch {}
  };

  // ── 음악 신청 제출 ────────────────────────────────────────
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return alert('로그인 후 신청 가능합니다.');
    setReqSending(true);
    try {
      const res = await api.post('/media/request', reqForm);
      if (res.data.success) {
        alert('신청이 완료되었습니다! 관리자 검토 후 추가됩니다.');
        setShowRequest(false);
        setReqForm({ title: '', url: '', content: '' });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || '신청 실패. 다시 시도해주세요.');
    } finally {
      setReqSending(false);
    }
  };

  // ✅ 수정: JSX.Element → React.ReactElement
  const typeFilters: { key: typeof activeType; label: string; icon: React.ReactElement }[] = [
    { key: 'all',     label: '전체',    icon: <Volume2 size={13} /> },
    { key: 'youtube', label: 'YouTube', icon: <Youtube size={13} /> },
    { key: 'podcast', label: '팟캐스트', icon: <Headphones size={13} /> },
    { key: 'music',   label: '음악',    icon: <Music size={13} /> },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">

      {/* 헤더 */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-100 text-indigo-600">
          <Headphones size={12} /> 프리미엄 큐레이션
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter mb-3">미디어 &amp; 팟캐스트 랩</h1>
        <p className="text-sm text-slate-400 font-bold max-w-xl">에이전트들을 위한 고품질 오디오와 YouTube 브리핑 영상을 제공합니다.</p>
      </div>

      {/* 컨트롤 바 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="flex gap-2">
          {typeFilters.map(f => (
            <button key={f.key} onClick={() => setActiveType(f.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all border
                ${activeType === f.key ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="미디어 검색..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-bold text-slate-700 w-48" />
          </div>
          <button onClick={() => setShowRequest(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-md">
            <Music size={13} /> 음악 신청
          </button>
        </div>
      </div>

      {/* 미디어 그리드 */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mediaList.map(item => (
            <div key={item.id}
              className="group relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-900/20 hover:shadow-indigo-500/30 hover:-translate-y-2 transition-all duration-500 cursor-pointer"
              onClick={() => handlePlay(item)}>

              <div className="absolute inset-0">
                <img
                  src={item.thumbnail || `https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=600`}
                  alt={item.title}
                  className="w-full h-full object-cover opacity-50 group-hover:opacity-30 group-hover:scale-110 transition-all duration-700"
                  onError={e => { (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=480`; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />
              </div>

              <div className="relative z-10 p-6 flex flex-col min-h-[280px]">
                <div className="flex justify-between items-start mb-auto">
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 ${typeBg[item.type]} rounded-xl text-white text-[10px] font-black`}>
                    <TypeIcon type={item.type} size={12} />
                    {item.type.toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {item.is_featured && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-400/90 backdrop-blur-sm rounded-full">
                        <Star size={9} className="text-white fill-white" />
                        <span className="text-white text-[9px] font-black">추천</span>
                      </div>
                    )}
                    <div className="px-2 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 text-white text-[9px] font-black">
                      ▶ {item.play_count}회
                    </div>
                  </div>
                </div>

                <div className="mt-auto">
                  {item.artist && (
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{item.artist}</p>
                  )}
                  <h3 className="text-lg font-black text-white leading-snug mb-2 group-hover:text-indigo-300 transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-slate-400 text-xs font-medium line-clamp-2 mb-3">{item.description}</p>
                  )}
                </div>
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-2xl">
                  <PlayCircle size={34} className="text-white ml-0.5" />
                </div>
              </div>
            </div>
          ))}
          {mediaList.length === 0 && !loading && (
            <div className="col-span-3 text-center py-24 text-slate-400 font-bold">
              <Music size={48} className="mx-auto mb-4 opacity-20" />
              등록된 미디어가 없습니다.<br />
              <span className="text-xs mt-2 block">관리자에게 음악을 신청해 보세요!</span>
            </div>
          )}
        </div>
      )}

      {/* ── YouTube/미디어 플레이어 모달 ──────────────────── */}
      {showPlayer && playing && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowPlayer(false)}>
          <div className="w-full max-w-4xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 px-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl ${typeBg[playing.type]} flex items-center justify-center`}>
                  <TypeIcon type={playing.type} size={15} />
                </div>
                <div>
                  <p className="text-white font-black leading-snug line-clamp-1">{playing.title}</p>
                  {playing.artist && <p className="text-slate-400 text-xs font-bold">{playing.artist}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={playing.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-colors" onClick={e => e.stopPropagation()}>
                  <ExternalLink size={12} /> 원본
                </a>
                <button onClick={() => setShowPlayer(false)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {(playing.type === 'youtube' || playing.url.includes('youtube') || playing.url.includes('youtu.be')) ? (
              <div className="relative w-full rounded-[1.5rem] overflow-hidden shadow-2xl bg-black" style={{ aspectRatio: '16/9' }}>
                <iframe
                  src={toEmbedUrl(playing.url)}
                  title={playing.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="bg-slate-800 rounded-[1.5rem] p-10 text-center shadow-2xl">
                <img src={playing.thumbnail || 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=400'} alt={playing.title}
                  className="w-40 h-40 rounded-2xl object-cover mx-auto mb-6 shadow-xl" />
                <h3 className="text-white font-black text-xl mb-2">{playing.title}</h3>
                {playing.artist && <p className="text-slate-400 text-sm font-bold mb-2">{playing.artist}</p>}
                <p className="text-slate-500 text-sm mb-8">{playing.description || ''}</p>
                <a href={playing.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30">
                  <ExternalLink size={16} /> 외부 링크에서 재생
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 음악 신청 모달 ──────────────────────────────────── */}
      {showRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Music size={18} className="text-indigo-500" /> 음악 / 미디어 신청
              </h3>
              <button onClick={() => setShowRequest(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">신청 제목</label>
                <input required value={reqForm.title} onChange={e => setReqForm({...reqForm, title: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium" placeholder="신청할 미디어 제목" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">URL</label>
                <input required type="url" value={reqForm.url} onChange={e => setReqForm({...reqForm, url: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium" placeholder="https://www.youtube.com/watch?v=..." />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">추가 메모 (선택)</label>
                <textarea value={reqForm.content} onChange={e => setReqForm({...reqForm, content: e.target.value})} rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-sm font-medium resize-none" placeholder="신청 이유나 추가 설명을 남겨주세요." />
              </div>
              {!isAuthenticated && (
                <p className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl">로그인 후 음악 신청이 가능합니다.</p>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowRequest(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-xs">취소</button>
                <button type="submit" disabled={reqSending || !isAuthenticated}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-md">
                  {reqSending ? '전송 중...' : '신청하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}