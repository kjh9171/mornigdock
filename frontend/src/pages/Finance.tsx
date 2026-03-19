import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, RefreshCw, ExternalLink, Clock, ChevronRight,
  BarChart2, Building2, Globe, BookOpen, Users, Star,
  Landmark, Home, Newspaper, FileText, Flame
} from 'lucide-react';
import { api } from '../lib/api';

// ── 타입 정의 ──────────────────────────────────────────────
interface FinanceItem {
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
  group: string;
}

// ── 카테고리 아이콘 ────────────────────────────────────────
const categoryIcons: Record<string, React.ReactElement> = {
  all:        <Newspaper size={13} />,
  popular:    <Flame size={13} />,
  stocks:     <BarChart2 size={13} />,
  bond:       <TrendingUp size={13} />,
  global:     <Globe size={13} />,
  policy:     <Landmark size={13} />,
  realestate: <Home size={13} />,
  ib:         <Building2 size={13} />,
  intl:       <Globe size={13} />,
  column:     <BookOpen size={13} />,
  feature:    <Star size={13} />,
  contrib:    <FileText size={13} />,
  people:     <Users size={13} />,
  terms:      <BookOpen size={13} />,
  press:      <Newspaper size={13} />,
};

// ── 카테고리 색상 ──────────────────────────────────────────
const categoryColors: Record<string, string> = {
  all:        'bg-emerald-600',
  popular:    'bg-rose-600',
  stocks:     'bg-blue-600',
  bond:       'bg-violet-600',
  global:     'bg-cyan-600',
  policy:     'bg-amber-600',
  realestate: 'bg-orange-600',
  ib:         'bg-indigo-600',
  intl:       'bg-teal-600',
  column:     'bg-slate-600',
  feature:    'bg-yellow-600',
  contrib:    'bg-pink-600',
  people:     'bg-fuchsia-600',
  terms:      'bg-lime-600',
  press:      'bg-gray-600',
};

// ── 그룹 레이블 ────────────────────────────────────────────
const groupLabels: Record<string, string> = {
  main:    '메인',
  market:  '시장',
  economy: '경제',
  global:  '글로벌',
  opinion: '오피니언',
  etc:     '기타',
};

// ── 날짜 포맷 ──────────────────────────────────────────────
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);
    if (diff < 1)    return '방금 전';
    if (diff < 60)   return diff + '분 전';
    if (diff < 1440) return Math.floor(diff / 60) + '시간 전';
    return (d.getMonth() + 1) + '.' + d.getDate();
  } catch {
    return dateStr;
  }
}

// ── HTML 디코딩 및 태그 제거 함수 ──────────────────────────
function decodeHtml(text: string): string {
  if (!text) return '';
  
  // 1. 기본적인 HTML 태그 제거
  let decoded = text.replace(/<[^>]*>/g, '');
  
  // 2. 주요 HTML 엔티티 변환 (반복 적용하여 중복 인코딩 처리)
  const entities: Record<string, string> = {
    '&amp;':  '&',
    '&lt;':   '<',
    '&gt;':   '>',
    '&quot;': '"',
    '&#39;':  "'",
    '&nbsp;': ' ',
    '&apos;': "'"
  };

  // 엔티티가 더 이상 발견되지 않을 때까지 반복 (최대 3회)
  for (let i = 0; i < 3; i++) {
    let changed = false;
    Object.entries(entities).forEach(([key, val]) => {
      if (decoded.includes(key)) {
        decoded = decoded.replace(new RegExp(key, 'g'), val);
        changed = true;
      }
    });
    if (!changed) break;
  }

  return decoded.trim();
}

function handleImgError(e: React.SyntheticEvent<HTMLImageElement>): void {
  (e.target as HTMLImageElement).style.display = 'none';
}

// ── 그룹별로 카테고리 분류 ────────────────────────────────
function groupCategories(categories: Category[]): Record<string, Category[]> {
  const result: Record<string, Category[]> = {};
  categories.forEach(function(cat) {
    if (!result[cat.group]) result[cat.group] = [];
    result[cat.group].push(cat);
  });
  return result;
}

// ═══════════════════════════════════════════════════════════
// 메인 Finance 컴포넌트
// ═══════════════════════════════════════════════════════════
export default function Finance() {
  const [categories, setCategories]         = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [newsList, setNewsList]             = useState<FinanceItem[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [lastUpdated, setLastUpdated]       = useState<Date | null>(null);
  const [viewMode, setViewMode]             = useState<'grid' | 'list'>('grid');

  // ── 카테고리 목록 로드 ────────────────────────────────────
  useEffect(function() {
    api.get('/finance/categories')
      .then(function(res) { if (res.data.success) setCategories(res.data.data); })
      .catch(console.error);
  }, []);

  // ── 뉴스 패칭 ─────────────────────────────────────────────
  const fetchNews = useCallback(async function(isRefresh: boolean = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/finance', {
        params: { category: activeCategory, limit: 30 },
      });
      if (res.data.success) {
        setNewsList(res.data.data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('금융뉴스 로딩 실패', err);
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

  const activeCat   = categories.find(function(c) { return c.key === activeCategory; });
  const activeLabel = activeCat?.label ?? '전체기사';
  const accentColor = categoryColors[activeCategory] ?? 'bg-emerald-600';
  const grouped     = groupCategories(categories);
  const featured    = newsList[0] ?? null;
  const rest        = newsList.slice(1);

  function getTabClass(key: string): string {
    const base = 'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border flex-shrink-0';
    if (key === activeCategory) {
      return base + ' ' + accentColor + ' text-white border-transparent shadow-md';
    }
    return base + ' bg-white text-slate-500 border-slate-200 hover:border-slate-400';
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">

      {/* ── 헤더 ─────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 border border-emerald-100 text-emerald-600">
            <TrendingUp size={12} />
            연합인포맥스 실시간
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter">금융 분석</h1>
          {lastUpdated && (
            <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1">
              <Clock size={11} />
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 뷰 모드 토글 */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={function() { setViewMode('grid'); }}
              className={'px-3 py-1.5 rounded-lg text-xs font-black transition-all ' + (viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400')}
            >
              그리드
            </button>
            <button
              onClick={function() { setViewMode('list'); }}
              className={'px-3 py-1.5 rounded-lg text-xs font-black transition-all ' + (viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400')}
            >
              목록
            </button>
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
      </div>

      {/* ── 카테고리 탭 (그룹별) ─────────────────────────── */}
      <div className="mb-8 space-y-3">
        {Object.keys(grouped).map(function(group) {
          return (
            <div key={group} className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest w-14 flex-shrink-0">
                {groupLabels[group]}
              </span>
              <div className="flex gap-2 flex-wrap">
                {grouped[group].map(function(cat) {
                  return (
                    <button
                      key={cat.key}
                      onClick={function() { setActiveCategory(cat.key); }}
                      className={getTabClass(cat.key)}
                    >
                      {categoryIcons[cat.key]}
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── 현재 카테고리 인디케이터 ─────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className={'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-black ' + accentColor}>
          {categoryIcons[activeCategory]}
          {activeLabel}
        </div>
        {!loading && (
          <span className="text-xs text-slate-400 font-bold">
            {newsList.length}건
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── 피처드 뉴스 ──────────────────────────────── */}
          {featured && (
            <a
              href={featured.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative rounded-3xl overflow-hidden shadow-2xl hover:-translate-y-1 transition-all duration-500 min-h-[280px] bg-slate-900"
            >
              {featured.thumbnail ? (
                <img
                  src={featured.thumbnail}
                  alt={featured.title}
                  onError={handleImgError}
                  className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-30 group-hover:scale-105 transition-all duration-700"
                />
              ) : (
                <div className={'absolute inset-0 opacity-10 ' + accentColor} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-transparent" />

              <div className="relative z-10 p-8 flex flex-col justify-end min-h-[280px]">
                <div className="mb-auto">
                  <div className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-[10px] font-black mb-3 ' + accentColor}>
                    {categoryIcons[activeCategory]}
                    {activeLabel} · 주요기사
                  </div>
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white leading-snug mb-3 group-hover:text-emerald-300 transition-colors">
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

          {/* ── 그리드 모드 ──────────────────────────────── */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rest.map(function(item, idx) {
                return (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col bg-white rounded-2xl border border-slate-100 overflow-hidden hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                  >
                    {item.thumbnail && (
                      <div className="relative overflow-hidden h-40 bg-slate-100">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          onError={handleImgError}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-4 flex flex-col flex-1">
                      <div className={'inline-flex self-start items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[10px] font-black mb-2 ' + accentColor}>
                        {categoryIcons[activeCategory]}
                        {activeLabel}
                      </div>
                      <h3 className="text-sm font-black text-slate-800 leading-snug mb-2 line-clamp-3 group-hover:text-emerald-700 transition-colors flex-1">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-slate-400 text-xs font-medium line-clamp-2 mb-2">
                          {stripHtml(item.description)}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                        <span className="text-slate-400 text-[10px] font-bold flex items-center gap-1">
                          <Clock size={10} />
                          {formatDate(item.pubDate)}
                        </span>
                        <span className="text-emerald-600 text-[10px] font-black flex items-center gap-0.5 group-hover:gap-1.5 transition-all">
                          읽기
                          <ChevronRight size={11} />
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}

          {/* ── 리스트 모드 ──────────────────────────────── */}
          {viewMode === 'list' && (
            <div className="space-y-2">
              {rest.map(function(item, idx) {
                return (
                  <a
                    key={idx}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-4 bg-white rounded-2xl border border-slate-100 p-4 hover:border-slate-300 hover:shadow-md transition-all duration-200"
                  >
                    {/* 번호 */}
                    <span className="text-slate-300 text-sm font-black w-6 flex-shrink-0 mt-0.5">
                      {idx + 2}
                    </span>

                    {/* 썸네일 */}
                    {item.thumbnail && (
                      <div className="w-20 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          onError={handleImgError}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}

                    {/* 텍스트 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-black text-slate-800 leading-snug mb-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-slate-400 text-xs font-medium line-clamp-1 mb-1">
                          {stripHtml(item.description)}
                        </p>
                      )}
                      <span className="text-slate-300 text-[10px] font-bold flex items-center gap-1">
                        <Clock size={9} />
                        {formatDate(item.pubDate)}
                      </span>
                    </div>

                    <ChevronRight size={16} className="text-slate-300 group-hover:text-emerald-500 flex-shrink-0 mt-1 transition-colors" />
                  </a>
                );
              })}
            </div>
          )}

          {newsList.length === 0 && (
            <div className="text-center py-24 text-slate-400">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">금융 뉴스를 불러올 수 없습니다.</p>
              <p className="text-xs mt-1">잠시 후 다시 시도해주세요.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}