import { useEffect, useState } from 'react';
import { useLocalizedContent, LocalizedText } from '../utils/langUtils';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { FileText, Loader2, Bot } from 'lucide-react';

interface NewsItem {
  id: number;
  source: string;
  type: 'breaking' | 'analysis';
  title: LocalizedText;
  summary: LocalizedText;
  content: LocalizedText;
  url?: string;
}

export function NewsList() {
  const { ln } = useLocalizedContent();
  const { logActivity } = useActivityLog();
  const { setView, setSelectedNewsId } = useNavigationStore();
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8787/api/news')
      .then(res => res.json())
      .then(data => {
        setNews(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch news:', err);
        setLoading(false);
      });
  }, []);

  const handleItemClick = (item: NewsItem) => {
    setSelectedNewsId(item.id);
    setView('news-detail');
    logActivity(`View News: ${item.id} (${item.source})`);
  };

  const handleBatchAIAnalysis = () => {
    setSelectedNewsId(null);
    setView('ai-analysis');
    logActivity('Batch AI Analysis Request');
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'Yonhap':
        return <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold tracking-wider rounded-sm uppercase">YONHAP</span>;
      case 'Naver':
        return <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[10px] font-bold tracking-wider rounded-sm uppercase">NAVER</span>;
      default:
        return <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-bold tracking-wider rounded-sm uppercase">AGORA</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      {/* Batch AI Analysis Button */}
      <button
        onClick={handleBatchAIAnalysis}
        className="w-full py-3 bg-gradient-to-r from-accent-600 to-accent-700 text-white rounded-xl font-bold text-sm hover:from-accent-700 hover:to-accent-800 transition-all shadow-lg shadow-accent-200 flex items-center justify-center gap-2"
      >
        <Bot className="w-5 h-5" />
        실시간 뉴스 AI 분석
      </button>

      {/* News List */}
      <div className="grid gap-4">
        {news.map((item) => (
          <div 
            key={item.id} 
            onClick={() => handleItemClick(item)}
            className="bg-white p-5 rounded-xl border-[0.5px] border-stone-200 shadow-soft hover:shadow-md transition-shadow cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              <div className="mt-1 flex flex-col items-center gap-2">
                <div className="p-2 bg-stone-50 rounded-lg group-hover:bg-accent-600/10 transition-colors">
                  <FileText className="w-5 h-5 text-stone-400 group-hover:text-accent-600 transition-colors" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {getSourceBadge(item.source)}
                  {item.type === 'breaking' && (
                    <span className="text-[10px] font-medium text-red-500 animate-pulse">● LIVE</span>
                  )}
                </div>
                <h3 className="font-semibold text-primary-800 text-lg group-hover:text-accent-600 transition-colors leading-tight">
                  {ln(item.title)}
                </h3>
                <p className="text-stone-500 font-light mt-2 text-sm leading-relaxed line-clamp-2">
                   {ln(item.summary)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
