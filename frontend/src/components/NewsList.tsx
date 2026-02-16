import { useEffect, useState } from 'react';
import { useLocalizedContent, LocalizedText } from '../utils/langUtils';
import { useActivityLog } from '../utils/activityLogger';
import { FileText, Loader2, X, Bot, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NewsItem {
  id: number;
  title: LocalizedText;
  summary: LocalizedText;
  content: LocalizedText;
}

export function NewsList() {
  const { ln } = useLocalizedContent();
  const { logActivity } = useActivityLog();
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
    logActivity(`View News: ${item.id}`);
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
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-stone-50 rounded-lg group-hover:bg-accent-600/10 transition-colors">
                <FileText className="w-5 h-5 text-stone-400 group-hover:text-accent-600 transition-colors" />
              </div>
              <div>
                <h3 className="font-semibold text-primary-800 text-lg group-hover:text-accent-600 transition-colors">
                  {ln(item.title)}
                </h3>
                <p className="text-stone-500 font-light mt-1">
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
                <h2 className="text-xl font-bold text-primary-800 pr-8 leading-tight">
                  {ln(selectedItem.title)}
                </h2>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-400 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <p className="text-stone-600 leading-relaxed font-light text-lg">
                  {ln(selectedItem.content)}
                </p>

                {/* AI Analysis Section */}
                <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="w-5 h-5 text-accent-600" />
                    <span className="font-semibold text-sm text-primary-800">AI Intelligence Insight</span>
                  </div>

                  {!aiResult ? (
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="w-full py-2 bg-white border border-stone-300 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-accent-600 hover:text-accent-600 transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      {analyzing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                        </>
                      ) : (
                        "Run Analysis"
                      )}
                    </button>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-white rounded-lg border border-green-200 text-sm text-green-800 flex gap-2 items-start"
                    >
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                      {aiResult}
                    </motion.div>
                  )}
                </div>
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
