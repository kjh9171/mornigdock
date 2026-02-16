import { useEffect, useState } from 'react';
import { useLocalizedContent, LocalizedText } from '../utils/langUtils';
import { useActivityLog } from '../utils/activityLogger';
import { useDiscussionStore } from '../store/useDiscussionStore';
import { useNavigationStore } from '../store/useNavigationStore';
import { FileText, Loader2, X, Bot, CheckCircle2, MessageSquarePlus, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { startDiscussion } = useDiscussionStore();
  const { setView, setUserTab } = useNavigationStore();
  
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<NewsItem | null>(null);
  
  // AI Simulation States
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

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
    setSelectedItem(item);
    setAiResult(null); // Reset previous analysis
    logActivity(`View News: ${item.id} (${item.source})`);
  };

  const handleAnalyze = () => {
    if (!selectedItem) return;
    setAnalyzing(true);
    logActivity(`Analyze News: ${selectedItem.id}`);

    // Simulate AI Analysis (1.5s)
    setTimeout(() => {
      setAnalyzing(false);
      setAiResult("Analysis Complete: No critical threats detected. Sentiment is positive. (Mock AI Result)");
    }, 1500);
  };

  const handleDiscuss = () => {
    if (!selectedItem) return;
    const title = `[Discussion] ${ln(selectedItem.title)}`;
    const content = `Source: ${selectedItem.source}\nSnippet: ${ln(selectedItem.summary)}\nLink: ${selectedItem.url || 'No URL'}\n\nLet's discuss this news...`;
    
    startDiscussion(title, content);
    logActivity(`Start Discussion: ${selectedItem.id}`);
    setSelectedItem(null);
    
    // Switch via Store
    setView('user');
    setUserTab('discussion');
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
    <>
      <div className="grid gap-4 w-full max-w-2xl">
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

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-start">
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-2">
                     {getSourceBadge(selectedItem.source)}
                     <span className="text-xs text-stone-400 font-mono tracking-tight">{selectedItem.type.toUpperCase()}</span>
                  </div>
                  <h2 className="text-xl font-bold text-primary-800 leading-tight">
                    {ln(selectedItem.title)}
                  </h2>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <p className="text-stone-600 leading-relaxed font-light text-lg whitespace-pre-wrap">
                  {ln(selectedItem.content)}
                </p>

                {/* URL Link */}
                {selectedItem.url && (
                    <a 
                        href={selectedItem.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-accent-600 font-medium hover:underline decoration-accent-600 underline-offset-4"
                    >
                        <ExternalLink className="w-4 h-4" />
                        View Original Source 
                    </a>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-stone-100">
                   <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="py-3 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-accent-600 hover:text-accent-600 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4" /> AI Analysis
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDiscuss}
                      className="py-3 bg-primary-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
                    >
                      <MessageSquarePlus className="w-4 h-4" /> Discuss on Agora
                    </button>
                </div>

                {/* AI Result Area (Moved below buttons) */}
                {aiResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 text-sm text-green-800 flex gap-3 items-start"
                  >
                    <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-600" />
                    <div>
                      <p className="font-bold mb-1">AI Intelligence Insight</p>
                      {aiResult}
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="p-4 bg-stone-50 border-t border-stone-100 text-center">
                <span className="text-xs text-stone-400 font-mono">ID: {selectedItem.id} • SECURE LOGGED</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
