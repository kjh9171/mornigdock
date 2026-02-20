import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { getMediaAPI, createMediaAPI, deleteMediaAPI, MediaItem } from '../lib/api';
import { Youtube, Mic, Music, Trash2, Plus, Play, Loader2, X, Save, AlertCircle, Film, Radio } from 'lucide-react';

const extractYoutubeId = (url: string) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : url;
};

export function MediaCenter() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    url: '',
    type: 'youtube'
  });

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const res = await getMediaAPI();
      if (res.success) {
        setMedia(res.media);
      }
    } catch (err) {
      console.error('CERT MEDIA FETCH ERROR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.url) return;

    setIsSubmitting(true);
    try {
      const processedUrl = form.type === 'youtube' ? extractYoutubeId(form.url) : form.url;
      const res = await createMediaAPI({
        ...form,
        url: processedUrl,
        author: user?.name || 'HQ',
        category: form.type === 'youtube' ? 'VIDEO' : 'AUDIO'
      });

      if (res.success) {
        setMedia([res.media, ...media]);
        setShowAddForm(false);
        setForm({ title: '', description: '', url: '', type: 'youtube' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePurge = async (id: number) => {
    if (!confirm('해당 미디어 자산을 영구 폐기하시겠습니까?')) return;
    const res = await deleteMediaAPI(id);
    if (res.success) {
      setMedia(media.filter(m => m.id !== id));
    }
  };

  if (loading && media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-40 space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-amber-600" />
        <p className="text-stone-500 font-black uppercase tracking-widest animate-pulse">미디어 자료를 불러오고 있습니다...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex justify-between items-end px-2">
        <div>
          <h2 className="text-3xl font-black text-primary-950 uppercase tracking-tighter flex items-center gap-3">
            <Play className="w-8 h-8 text-amber-600" />
            미디어 자료실
          </h2>
          <p className="text-sm text-stone-400 font-bold mt-1 uppercase tracking-widest">영상 및 오디오 분석 데이터뱅크</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => setShowAddForm(!showAddForm)} 
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl ${showAddForm ? 'bg-white text-stone-500 border-2 border-stone-100' : 'bg-stone-900 text-white hover:bg-black'}`}
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? '취소' : '새 자료 등록'}
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="bg-white p-10 rounded-[2.5rem] border-2 border-stone-100 shadow-2xl animate-in slide-in-from-top-8 duration-500">
          <form onSubmit={handleDeploy} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">자료 분류</label>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setForm({...form, type: 'youtube'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${form.type === 'youtube' ? 'border-amber-600 bg-amber-50 text-amber-600 font-black' : 'border-stone-100 text-stone-400 font-bold'}`}
                  >
                    <Youtube className="w-4 h-4" /> YouTube
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setForm({...form, type: 'audio'})}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all ${form.type === 'audio' ? 'border-amber-600 bg-amber-50 text-amber-600 font-black' : 'border-stone-100 text-stone-400 font-bold'}`}
                  >
                    <Radio className="w-4 h-4" /> 오디오/팟캐스트
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">자료 제목</label>
                <input 
                  required
                  value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full p-4 bg-stone-50 border-2 border-transparent focus:border-amber-600/20 rounded-xl outline-none transition-all font-bold" 
                  placeholder="자료 명칭을 입력하세요..." 
                />
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">소스 링크 (URL)</label>
                <input 
                  required
                  value={form.url} onChange={e => setForm({...form, url: e.target.value})}
                  className="w-full p-4 bg-stone-50 border-2 border-transparent focus:border-amber-600/20 rounded-xl outline-none transition-all font-mono text-xs font-bold" 
                  placeholder="https://youtu.be/..." 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">상세 설명</label>
                <input 
                  value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full p-4 bg-stone-50 border-2 border-transparent focus:border-amber-600/20 rounded-xl outline-none transition-all font-bold text-sm" 
                  placeholder="자료에 대한 간략한 설명을 입력하세요..." 
                />
              </div>
            </div>

            <div className="md:col-span-2 pt-4">
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-5 bg-stone-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-2xl shadow-stone-200 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 text-amber-500" />}
                자료 등록 승인
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {media.length === 0 ? (
          <div className="col-span-full text-center py-40 border-4 border-dashed border-stone-100 rounded-[3rem]">
            <Film className="w-20 h-20 text-stone-100 mx-auto mb-6" />
            <p className="text-stone-400 font-black uppercase tracking-widest">등록된 미디어 자료가 없습니다.</p>
          </div>
        ) : (
          media.map(item => {
            const videoId = item.type === 'youtube' ? extractYoutubeId(item.url) : '';
            return (
              <div key={item.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-stone-200 shadow-soft hover:shadow-2xl transition-all duration-500 flex flex-col">
                <div className="aspect-video bg-stone-900 relative">
                  {item.type === 'youtube' ? (
                    <iframe 
                      className="w-full h-full" 
                      src={`https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0`} 
                      title={item.title} 
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-stone-800 to-black">
                      <Radio className="w-12 h-12 text-amber-500 mb-4 animate-pulse" />
                      <audio controls src={item.url} className="w-full" />
                    </div>
                  )}
                  
                  <div className="absolute top-4 left-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-md shadow-lg ${item.type === 'youtube' ? 'bg-red-600/80 text-white' : 'bg-amber-600/80 text-white'}`}>
                      {item.type === 'youtube' ? '동영상 분석' : '오디오 기록'}
                    </span>
                  </div>
                </div>

                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-black text-primary-950 mb-2 group-hover:text-amber-600 transition-colors">{item.title}</h3>
                    <p className="text-sm text-stone-500 font-medium leading-relaxed line-clamp-2">{item.description || '상세 설명이 제공되지 않았습니다.'}</p>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-stone-50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-stone-100 rounded-full flex items-center justify-center text-[10px] font-black text-stone-400 uppercase">
                        {item.author?.charAt(0) || 'H'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-stone-900 uppercase leading-none">{item.author || '관리자'}</span>
                        <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest mt-1">승인된 자료</span>
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <button 
                        onClick={() => handlePurge(item.id)}
                        className="p-3 text-stone-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="자료 삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}