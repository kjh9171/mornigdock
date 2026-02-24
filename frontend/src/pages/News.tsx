import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper, RefreshCw, ExternalLink, Clock, ChevronRight,
  Globe, Tv, Music2, Heart, Trophy, Users, Building2,
  TrendingUp, MapPin, BookOpen, Mic2, FlaskConical, Flag
} from 'lucide-react';
import { api } from '../lib/api';

interface NewsItem {
  title:       string;
  link:        string;
  description: string;
  pubDate:     string;
  category:    string;
  thumbnail:   string;
}

interface Category {
  key:   string;
  label: string;
}

const categoryIcons: Record<string, React.ReactElement> = {
  news:          <Newspaper size={13} />,
  politics:      <Building2 size={13} />,
  northkorea:    <Flag size={13} />,
  economy:       <TrendingUp size={13} />,
  market:        <TrendingUp size={13} />,
  industry:      <FlaskConical size={13} />,
  society:       <Users size={13} />,
  local:         <MapPin size={13} />,
  international: <Globe size={13} />,
  culture:       <Tv size={13} />,
  health:        <Heart size={13} />,
  entertainment: <Music2 size={13} />,
  sports:        <Trophy size={13} />,
  opinion:       <BookOpen size={13} />,
  people:        <Mic2 size={13} />,
};

const categoryColors: Record<string, string> = {
  news:          'bg-blue-600',
  politics:      'bg-red-600',
  northkorea:    'bg-gray-700',
  economy:       'bg-emerald-600',
  market:        'bg-teal-600',
  industry:      'bg-cyan-600',
  society:       'bg-orange-600',
  local:         'bg-lime-600',
  international: 'bg-violet-600',
  culture:       'bg-pink-600',
  health:        'bg-rose-500',
  entertainment: 'bg-purple-600',
  sports:        'bg-amber-600',
  opinion:       'bg-indigo-600',
  people:        'bg-fuchsia-600',
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);
    if (diff < 1)    return '방금 전';
    if (diff < 60)   return diff + '분 전';
    if (diff < 1440) return Math.floor(diff / 60) + '시간 전';
    return (d.getMonth() + 1) + '/' + d.getDate();
  } catch {
    return dateStr;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').trim();
}

function handleImgError(e: React.SyntheticEvent<HTMLImageElement>): void {
  (e.target as HTMLImageElement).style.display = 'none';
}

export default function News() {
  const [categories, setCategories]         = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('news');
  const [newsList, setNewsList]             = useState<NewsItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const [featured, setFeatured]             = useState<NewsItem | null>(null);

  useEffect(() => {
    api.get('/news/categories')
      .then(function(res) { if (res.data.success) setCategories(res.data.data); })
      .catch(console.error);
  }, []);

  const fetchNews = useCallback(async function(isRefresh: boolean = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/news', { params: { category: activeCategory, limit: 30 } });
      if (res.data.success) {
        const data: NewsItem[] = res.data.data;
        setNewsList(data);
        setFeatured(data[0] ?? null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('뉴스 로딩 실패', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(function() { fetchNews(); }, [fetchNews]);

  useEffect(function() {
    const interval = setInterval(function() { fetchNews(true); }, 5 * 60 * 1000);
    return function() { clearInterval(interval); };
  }, [fetchNews]);

  const activeCategoryLabel = categories.find(function(c) { return c.key === activeCategory; })?.label ?? '최신기사';
  const accentColor         = categoryColors[activeCategory] ?? 'bg-blue-600';

  function getCategoryTabClass(key: string): string {
    const base = 'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all border flex-shrink-0';
    if (key === activeCategory) {
      return base + ' ' + accentColor + ' text-white border-transparent shadow-lg';
    }
    return base + ' bg-white text-slate-500 border-slate-200 hover:border-slate-400';
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-blue-100 text-blue-600">
            <Newspaper size={12} />
            연합뉴스 실시간
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter">뉴스 브리핑</h1>
          {lastUpdated && (
            <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1">
              <Clock size={11} />
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          )}
        </div>
        <button
          onClick={function() { fetchNews(true); }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-700 transition-all shadow-md disabled:opacity-50"
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? '갱신 중...' : '새로고침'}
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
        {categories.map(function(cat) {
          return (
            <button
              key={cat.key}
              onClick={function() { setActiveCategory(cat.key); }}
              className={getCategoryTabClass(cat.key)}
            >
              {categoryIcons[cat.key]}
              {cat.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">

          {featured && (
            <a
              href={featured.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative rounded-3xl overflow-hidden shadow-2xl hover:-translate-y-1 transition-all duration-500 min-h-[300px] bg-slate-900"
            >
              {featured.thumbnail ? (
                <img
                  src={featured.thumbnail}
                  alt={featured.title}
                  onError={handleImgError}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
                />
              ) : (
                <div className={'absolute inset-0 opacity-20 ' + accentColor} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

              <div className="relative z-10 p-8 flex flex-col justify-end min-h-[300px]">
                <div className="mb-auto">
                  <div className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[10px] font-black mb-3 ' + accentColor}>
                    {categoryIcons[activeCategory]}
                    {activeCategoryLabel} · 주요기사
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-white leading-snug mb-3 group-hover:text-blue-300 transition-colors">
                    {featured.title}
                  </h2>
                  {featured.description && (
                    <p className="text-slate-300 text-sm font-medium line-clamp-2 mb-4">
                      {stripHtml(featured.description)}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-xs font-bold flex items-center gap-1">
                      <Clock size={11} />
                      {formatDate(featured.pubDate)}
                    </span>
                    <span className="flex items-center gap-1 text-white text-xs font-black bg-white/10 px-3 py-1.5 rounded-full">
                      전문 보기
                      <ExternalLink size={11} />
                    </span>
                  </div>
                </div>
              </div>
            </a>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {newsList.slice(1).map(function(item, idx) {
              return (
                <a
                  key={idx}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                >
                  {item.thumbnail && (
                    <div className="relative overflow-hidden h-44 bg-slate-100">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        onError={handleImgError}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}

                  <div className="p-5 flex flex-col flex-1">
                    <div className={'inline-flex self-start items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[10px] font-black mb-3 ' + accentColor}>
                      {categoryIcons[activeCategory]}
                      {activeCategoryLabel}
                    </div>

                    <h3 className="text-sm font-black text-slate-800 leading-snug mb-2 line-clamp-3 group-hover:text-blue-700 transition-colors flex-1">
                      {item.title}
                    </h3>

                    {item.description && (
                      <p className="text-slate-400 text-xs font-medium line-clamp-2 mb-3">
                        {stripHtml(item.description)}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                      <span className="text-slate-400 text-[10px] font-bold flex items-center gap-1">
                        <Clock size={10} />
                        {formatDate(item.pubDate)}
                      </span>
                      <span className="text-blue-600 text-[10px] font-black flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                        읽기
                        <ChevronRight size={11} />
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {newsList.length === 0 && (
            <div className="text-center py-24 text-slate-400">
              <Newspaper size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">뉴스를 불러올 수 없습니다.</p>
              <p className="text-xs mt-1">잠시 후 다시 시도해주세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}