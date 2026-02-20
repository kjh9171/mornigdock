import { useEffect, useState } from 'react';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { getPostsAPI, Post } from '../lib/api';
import { FileText, Loader2, Bot, ChevronRight } from 'lucide-react';

export function NewsList() {
  const { logActivity } = useActivityLog();
  const { setView, setSelectedNewsId } = useNavigationStore();
  
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
    setSelectedNewsId(item.id);
    setView('news-detail');
    logActivity(`Inspect Intelligence: ${item.id}`);
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
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Strategic Command Button */}
      <button
        onClick={handleBatchAIAnalysis}
        className="group relative w-full py-4 bg-primary-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-accent-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center justify-center gap-3 relative z-10">
          <Bot className="w-6 h-6 text-accent-400" />
          사령부 실시간 지능 분석 엔진 가동
        </div>
      </button>

      {/* Intelligence Stream */}
      <div className="grid gap-4">
        {news.length === 0 ? (
          <div className="text-center py-20 text-stone-400 font-bold border-2 border-dashed border-stone-100 rounded-3xl">현재 수집된 첩보가 없습니다.</div>
        ) : (
          news.map((item) => (
            <div 
              key={item.id} 
              onClick={() => handleItemClick(item)}
              className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft hover:border-accent-400 hover:shadow-xl transition-all cursor-pointer group flex items-center justify-between"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2 py-0.5 bg-accent-100 text-accent-700 text-[10px] font-black rounded-full uppercase tracking-tighter">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-bold text-stone-400 uppercase">{item.source}</span>
                </div>
                <h3 className="font-bold text-primary-900 text-lg group-hover:text-accent-600 transition-colors leading-snug mb-2">
                  {item.title}
                </h3>
                <div className="flex items-center gap-4 text-[10px] text-stone-400 font-mono">
                  <span>VIEWS: {item.view_count}</span>
                  <span>TIME: {new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-accent-600 group-hover:translate-x-1 transition-all ml-4" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
