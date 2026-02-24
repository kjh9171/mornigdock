import { useState, useEffect } from 'react';
import { PlayCircle, Headphones, Youtube, Calendar } from 'lucide-react';
import { api } from '../lib/api';

interface MediaItem {
  id: number;
  type: string;
  title: string;
  url: string;
  thumbnail: string;
  description: string;
  created_at: string;
  is_active: boolean;
}

export default function Media() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const res = await api.get('/media');
        if (res.data.success) {
          setMediaList(res.data.data.filter((m: any) => m.is_active));
        }
      } catch (err) {
        console.error('Failed to fetch media', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMedia();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">
      
      <div className="mb-12 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-xs font-black uppercase tracking-widest mb-4 border border-indigo-100 text-indigo-600">
          <Headphones size={14} /> 프리미엄 큐레이션
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter mb-4">
          미디어 & 팟캐스트 랩
        </h1>
        <p className="text-sm md:text-base font-bold text-slate-400 tracking-wider max-w-2xl">
          에이전트들을 위한 고품질 오디오와 유튜브 브리핑 영상을 제공합니다.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mediaList.map((item) => (
            <div key={item.id} className="group relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl shadow-indigo-900/20 hover:shadow-indigo-500/40 hover:-translate-y-2 transition-all duration-500 cursor-pointer">
              
              <div className="absolute inset-0">
                <img src={item.thumbnail || 'https://images.unsplash.com/photo-1616469829581-73993eb86b02?q=80&w=800&auto=format&fit=crop'} alt={item.title} className="w-full h-full object-cover opacity-50 group-hover:opacity-30 group-hover:scale-110 transition-all duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
              </div>
              
              <div className="relative z-10 p-8 h-full flex flex-col justify-end min-h-[300px]">
                <div className="absolute top-6 left-6">
                  {item.type === 'youtube' ? (
                    <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg"><Youtube size={20} /></div>
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-lg"><Headphones size={20} /></div>
                  )}
                </div>
                
                <div className="absolute top-6 right-6 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-[10px] font-black tracking-widest uppercase">
                  ACTIVE
                </div>

                <div className="mt-auto">
                  <h3 className="text-2xl font-black text-white leading-tight mb-2 group-hover:text-indigo-300 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-slate-300 text-sm font-medium line-clamp-2 mb-4">
                    {item.description || '큐레이션 미디어의 상세 설명입니다.'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(item.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300 border border-white/20">
                  <PlayCircle size={32} className="text-white ml-1" />
                </div>
              </div>

            </div>
          ))}
          {mediaList.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400 font-bold">
              등록된 활성 미디어가 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
