import { useEffect, useState } from 'react';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { getPostsAPI, Post } from '../lib/api';
import { FileText, Loader2, Bot, ChevronRight, Eye, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function NewsList() {
  const { logActivity } = useActivityLog();
  const { setView, setSelectedNewsId } = useNavigationStore();
  const navigate = useNavigate();
  
  const [news, setNews] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      const res = await getPostsAPI({ type: 'news', limit: 20 });
      if (res.success) {
        setNews(res.posts);
      }
      setLoading(false);
    };
    fetchNews();
  }, []);

  const handleItemClick = (item: Post) => {
    logActivity(`Inspect Intelligence: ${item.id}`);
    navigate(`/board/${item.id}`);
  };

  const handleBatchAIAnalysis = () => {
    setSelectedNewsId(null);
    setView('ai-analysis');
    logActivity('Operational Analysis Command: Batch');
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="w-10 h-10 animate-spin text-accent-600" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-700">
      {/* Strategic Command Button */}
      <button
        onClick={handleBatchAIAnalysis}
        className="group relative w-full py-5 bg-primary-900 text-white rounded-3xl font-black text-sm hover:bg-black transition-all shadow-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-accent-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center justify-center gap-3 relative z-10 uppercase tracking-widest">
          <Bot className="w-6 h-6 text-accent-400" />
          사령부 실시간 지능 분석 엔진 가동 (Advanced Scrutiny)
        </div>
      </button>

      {/* Intelligence Stream */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {news.length === 0 ? (
          <div className="col-span-full text-center py-32 text-stone-400 font-bold border-4 border-dashed border-stone-100 rounded-[3rem]">현재 수집된 첩보가 없습니다.</div>
        ) : (
          news.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleItemClick(item)}
              className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-soft hover:border-accent-400 hover:shadow-2xl transition-all duration-300 cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-accent-100 text-accent-700 text-[10px] font-black rounded-full uppercase tracking-tighter">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{item.source}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-200 group-hover:text-accent-600 transition-colors" />
                </div>
                <h3 className="font-black text-primary-900 text-xl group-hover:text-accent-600 transition-colors leading-tight mb-4 line-clamp-2">
                  {item.title}
                </h3>
              </div>
              
              <div className="pt-6 border-t border-stone-50 flex items-center justify-between text-[10px] font-black text-stone-400 uppercase tracking-widest">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-stone-300" /> {item.view_count}</span>
                  <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-stone-300" /> {item.comment_count || 0}</span>
                </div>
                <span className="font-mono">{new Date(item.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
