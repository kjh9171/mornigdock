import { useState, useEffect } from 'react';
import { useNavigationStore } from '../store/useNavigationStore';
import { useActivityLog } from '../utils/activityLogger';
import { ArrowLeft, Bot, Loader2, Sparkles, TrendingUp } from 'lucide-react';

interface NewsItem {
  id: number;
  source: string;
  type: 'breaking' | 'analysis';
  title: { ko: string; en: string };
  summary: { ko: string; en: string };
  url?: string;
}

export function AIAnalysis() {
  const { selectedNewsId, setView } = useNavigationStore();
  const { logActivity } = useActivityLog();
  
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [scrapedNews, setScrapedNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    if (selectedNewsId) {
      // Single article mode
      setMode('single');
      fetch('http://localhost:8787/api/news')
        .then(res => res.json())
        .then((data: NewsItem[]) => {
          const item = data.find(n => n.id === selectedNewsId);
          if (item) setNewsItem(item);
        });
    } else {
      // Batch analysis mode - fetch scraped news from Naver
      setMode('batch');
      fetch('http://localhost:8787/api/news/scrape')
        .then(res => res.json())
        .then((data: NewsItem[]) => {
          setScrapedNews(data);
        })
        .catch(err => {
          console.error('Failed to scrape news:', err);
          // Fallback to existing news
          fetch('http://localhost:8787/api/news')
            .then(res => res.json())
            .then((data: NewsItem[]) => {
              setScrapedNews(data.filter(n => n.type === 'breaking'));
            });
        });
    }
  }, [selectedNewsId]);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setResult(null);
    logActivity(`AI Analysis: ${mode === 'single' ? newsItem?.id : 'Batch'}`);

    setTimeout(() => {
      setAnalyzing(false);
      if (mode === 'single') {
        setResult(`[AI 분석 결과]\n\n주요 키워드: 보안, 플랫폼, 글로벌\n감정 분석: 긍정적 (87%)\n신뢰도: 높음\n위협 수준: 낮음\n\n요약: 해당 기사는 새로운 보안 플랫폼의 출시를 다루고 있으며, 전반적으로 긍정적인 전망을 제시하고 있습니다. 특별한 위협 요소는 발견되지 않았습니다.`);
      } else {
        setResult(`[실시간 뉴스 스크랩 분석]\n\n총 ${scrapedNews.length}개의 속보 발견\n\n주요 트렌드:\n1. 보안 기술 혁신 (40%)\n2. 글로벌 시장 확대 (30%)\n3. 언어 장벽 해소 (20%)\n4. 관리자 권한 논의 (10%)\n\n전체 감정: 긍정적\n추천 액션: 주요 기사 3건에 대한 심층 분석 권장`);
      }
    }, 2000);
  };

  const handleBack = () => {
    if (selectedNewsId) {
      setView('news-detail');
    } else {
      setView('user');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back</span>
      </button>

      {/* Header */}
      <div className="bg-gradient-to-br from-accent-600 to-accent-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center gap-3 mb-3">
          <Bot className="w-8 h-8" />
          <h1 className="text-3xl font-bold">AI Intelligence Analysis</h1>
        </div>
        <p className="text-accent-100 font-light">
          {mode === 'single' 
            ? '선택한 기사에 대한 AI 분석을 수행합니다.' 
            : '실시간 뉴스를 스크랩하여 트렌드를 분석합니다.'}
        </p>
      </div>

      {/* Content */}
      {mode === 'single' && newsItem && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-soft">
          <h3 className="text-sm font-medium text-stone-500 mb-2">분석 대상 기사</h3>
          <h2 className="text-xl font-bold text-primary-800 mb-2">{newsItem.title.ko}</h2>
          <p className="text-stone-600 text-sm">{newsItem.summary.ko}</p>
        </div>
      )}

      {mode === 'batch' && (
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent-600" />
            <h3 className="text-lg font-bold text-primary-800">실시간 스크랩 뉴스 목록</h3>
          </div>
          <div className="space-y-3">
            {scrapedNews.map(news => (
              <div key={news.id} className="p-4 bg-stone-50 rounded-lg border border-stone-200">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded uppercase">{news.source}</span>
                  <span className="text-[10px] font-medium text-red-500 animate-pulse">● LIVE</span>
                </div>
                <h4 className="font-semibold text-stone-800 text-sm">{news.title.ko}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={analyzing}
        className="w-full py-4 bg-accent-600 text-white rounded-xl font-bold text-sm hover:bg-accent-700 transition-all shadow-lg shadow-accent-200 flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {analyzing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            분석 중...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            AI 분석 시작
          </>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-bold text-green-800">분석 완료</h3>
          </div>
          <pre className="text-sm text-stone-700 whitespace-pre-wrap font-light leading-relaxed">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}
