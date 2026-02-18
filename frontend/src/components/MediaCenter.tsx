import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext'; // 기존 AuthContext 계승
import { 
  Loader2, Music, Youtube, Mic, Trash2, Plus, 
  Play, Pause, X, LayoutGrid, ListMusic 
} from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  url: string;
  description: string;
  author: string;
  category: string;
  created_at: string;
}

export function MediaCenter() {
  const { user } = useAuth(); // 대표님의 관리자 권한 확인
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // ✅ Form State (기존 기능 통합)
  const [newType, setNewType] = useState<'youtube' | 'podcast' | 'music'>('youtube');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // ── [기능] 미디어 리스트 실시간 동기화 ──
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      // API 주소는 대표님의 백엔드 설정(8787 포트)을 따릅니다.
      const res = await fetch('http://localhost:8787/api/media');
      const data = await res.json();
      setMedia(data.media || data); // API 응답 구조에 맞게 최적화
    } catch (err) {
      console.error('CERT 로그: 미디어 로드 실패', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  // ── [기능] 신규 미디어 등록 (보안 적용) ──
  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'admin') return; // ✅ 관리자 보안 체크

    try {
      const res = await fetch('http://localhost:8787/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          title: newTitle,
          url: newUrl,
          description: newDesc,
          author: user.username,
          category: 'agora-media'
        }),
      });

      if (res.ok) {
        setShowAddForm(false);
        setNewTitle(''); setNewUrl(''); setNewDesc('');
        fetchMedia(); // 즉시 갱신
        // 성능 예측: 낙관적 업데이트 적용 검토 시 체감 속도 500ms 향상 가능
      }
    } catch (err) {
      console.error('CERT 로그: 미디어 추가 실패', err);
    }
  };

  // ── [기능] 미디어 삭제 (대표님 전용 액션) ──
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`[보안 확인] '${title}' 콘텐츠를 삭제하시겠습니까?`)) return;
    try {
      await fetch(`http://localhost:8787/api/media/${id}`, { method: 'DELETE' });
      fetchMedia();
    } catch (err) {
      console.error('CERT 로그: 삭제 실패', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
        case 'youtube': return <Youtube className="w-4 h-4 text-red-500" />;
        case 'podcast': return <Mic className="w-4 h-4 text-purple-400" />;
        case 'music': return <Music className="w-4 h-4 text-blue-400" />;
        default: return <Play className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-500">
      {/* ── 상단 헤더: AGORA JKEBOX 스타일 적용 ── */}
      <div className="flex justify-between items-center bg-stone-950 p-6 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500 rounded-xl shadow-lg shadow-amber-500/20">
            <ListMusic className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tighter">AGORA MEDIA HUB</h2>
            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Powered by CERT Security</p>
          </div>
        </div>
        {user?.role === 'admin' && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all ${
              showAddForm ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:scale-105'
            }`}
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'CANCEL' : 'ADD CONTENT'}
          </button>
        )}
      </div>

      {/* ── 관리자 추가 폼: MediaManager 스타일 통합 ── */}
      {showAddForm && (
        <form onSubmit={handleAddMedia} className="bg-white border border-stone-200 p-8 rounded-3xl shadow-xl animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-stone-400 uppercase tracking-wider ml-1">Content Type</label>
              <select 
                value={newType} 
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              >
                <option value="youtube">YouTube Video</option>
                <option value="podcast">Podcast (Audio URL)</option>
                <option value="music">Music Streaming</option>
              </select>
            </div>
            <div className="space-y-2">
               <label className="text-[11px] font-black text-stone-400 uppercase tracking-wider ml-1">
                 {newType === 'youtube' ? 'YouTube ID' : 'Source URL'}
               </label>
               <input 
                 type="text" required value={newUrl}
                 onChange={(e) => setNewUrl(e.target.value)}
                 className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                 placeholder={newType === 'youtube' ? 'e.g. dQw4w9WgXcQ' : 'https://...'}
               />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-stone-400 uppercase tracking-wider ml-1">Title</label>
              <input 
                type="text" required value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-black text-stone-400 uppercase tracking-wider ml-1">Description</label>
              <input 
                type="text" required value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-stone-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg">
            DEPLOY CONTENT
          </button>
        </form>
      )}

      {/* ── 미디어 그리드: 고도화된 카드 레이아웃 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {loading ? (
           <div className="col-span-full py-20 flex flex-col items-center gap-4">
             <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
             <p className="text-xs font-bold text-stone-400 tracking-widest uppercase">Syncing with Agora Server...</p>
           </div>
        ) : media.length === 0 ? (
           <div className="col-span-full py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200">
             <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">No media resources deployed.</p>
           </div>
        ) : (
           media.map(item => (
             <div key={item.id} className="group bg-white rounded-3xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-xl hover:border-amber-400/50 transition-all duration-300">
               {/* Player Section */}
               <div className="aspect-video bg-stone-900 flex items-center justify-center relative overflow-hidden">
                  {item.type === 'youtube' ? (
                    <iframe 
                      className="w-full h-full"
                      src={`https://www.youtube.com/embed/${item.url}`}
                      title={item.title}
                      allowFullScreen
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-6">
                        <div className="p-4 bg-white/5 rounded-full animate-pulse">
                           {item.type === 'music' ? <Music className="w-12 h-12 text-blue-400" /> : <Mic className="w-12 h-12 text-purple-400" />}
                        </div>
                        <audio controls src={item.url} className="w-64 h-8 brightness-90 contrast-125" />
                    </div>
                  )}
               </div>
               
               {/* Information Section */}
               <div className="p-6">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="p-1 bg-stone-100 rounded-md">{getIcon(item.type)}</span>
                            <span className="text-[10px] font-black uppercase text-stone-400 tracking-widest">{item.type}</span>
                        </div>
                        <h3 className="font-black text-stone-900 text-lg leading-tight">{item.title}</h3>
                        <p className="text-stone-500 text-xs mt-2 leading-relaxed line-clamp-2">{item.description}</p>
                    </div>
                    
                    {user?.role === 'admin' && (
                        <button 
                          onClick={() => handleDelete(item.id, item.title)}
                          className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                 </div>
               </div>
             </div>
           ))
        )}
      </div>
    </div>
  );
}