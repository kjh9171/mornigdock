import { useEffect, useState } from 'react';
import { useLocalizedContent, LocalizedText } from '../utils/langUtils';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft, ExternalLink, Bot, MessageSquarePlus, Edit, Trash2 } from 'lucide-react';

interface NewsItem {
  id: number;
  source: string;
  type: 'breaking' | 'analysis';
  title: LocalizedText;
  summary: LocalizedText;
  content: LocalizedText;
  url?: string;
}

export function NewsDetail() {
  const { ln } = useLocalizedContent();
  const { logActivity } = useActivityLog();
  const { selectedNewsId, setView, setUserTab } = useNavigationStore();
  const { user } = useAuthStore();
  
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);

  useEffect(() => {
    if (!selectedNewsId) {
      setView('user');
      return;
    }

    fetch('http://localhost:8787/api/news')
      .then(res => res.json())
      .then((data: NewsItem[]) => {
        const item = data.find(n => n.id === selectedNewsId);
        if (item) {
          setNewsItem(item);
          logActivity(`View News Detail: ${item.id}`);
        } else {
          setView('user');
        }
      })
      .catch(err => {
        console.error('Failed to fetch news:', err);
        setView('user');
      });
  }, [selectedNewsId, setView, logActivity]);

  const handleBack = () => {
    setView('user');
    setUserTab('news');
  };

  const handleAIAnalysis = () => {
    setView('ai-analysis');
    logActivity(`AI Analysis Request: ${newsItem?.id}`);
  };

  const handleDiscuss = () => {
    if (!newsItem) return;
    // TODO: Create discussion topic
    setView('user');
    setUserTab('discussion');
    logActivity(`Start Discussion from News: ${newsItem.id}`);
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'Yonhap':
        return <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold tracking-wider rounded uppercase">YONHAP</span>;
      case 'Naver':
        return <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-bold tracking-wider rounded uppercase">NAVER</span>;
      default:
        return <span className="px-3 py-1 bg-stone-100 text-stone-500 text-xs font-bold tracking-wider rounded uppercase">AGORA</span>;
    }
  };

  if (!newsItem) {
    return (
      <div className="flex justify-center p-8">
        <p className="text-stone-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to News</span>
      </button>

      {/* Article Header */}
      <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          {getSourceBadge(newsItem.source)}
          {newsItem.type === 'breaking' && (
            <span className="text-xs font-medium text-red-500 animate-pulse">● LIVE</span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-primary-800 leading-tight">
          {ln(newsItem.title)}
        </h1>

        <p className="text-lg text-stone-600 font-light leading-relaxed">
          {ln(newsItem.summary)}
        </p>

        {newsItem.url && (
          <a 
            href={newsItem.url} 
            target="_blank" 
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-accent-600 font-medium hover:underline decoration-accent-600 underline-offset-4"
          >
            <ExternalLink className="w-4 h-4" />
            View Original Source
          </a>
        )}
      </div>

      {/* Article Content */}
      <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-soft">
        <div className="prose prose-stone max-w-none">
          <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
            {ln(newsItem.content)}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleAIAnalysis}
          className="py-4 bg-white border-2 border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 hover:border-accent-600 hover:text-accent-600 transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <Bot className="w-5 h-5" />
          AI Analysis
        </button>

        <button
          onClick={handleDiscuss}
          className="py-4 bg-primary-800 text-white rounded-xl text-sm font-bold hover:bg-stone-900 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
        >
          <MessageSquarePlus className="w-5 h-5" />
          Discuss on Agora
        </button>
      </div>
    </div>
  );
}
