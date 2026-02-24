import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck, TrendingUp, Newspaper, Info } from 'lucide-react';

interface Notification {
  id: number;
  type: 'news' | 'finance' | 'system';
  title: string;
  body: string;
  time: Date;
  read: boolean;
}

function getIcon(type: Notification['type']): React.ReactElement {
  if (type === 'finance') return <TrendingUp size={14} className="text-emerald-500" />;
  if (type === 'news')    return <Newspaper size={14} className="text-blue-500" />;
  return <Info size={14} className="text-slate-400" />;
}

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000 / 60);
  if (diff < 1)    return '방금 전';
  if (diff < 60)   return diff + '분 전';
  if (diff < 1440) return Math.floor(diff / 60) + '시간 전';
  return (date.getMonth() + 1) + '/' + date.getDate();
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, type: 'finance',  title: '금융 속보', body: '코스피 장중 2,600선 돌파', time: new Date(Date.now() - 3 * 60000), read: false },
  { id: 2, type: 'news',     title: '뉴스 업데이트', body: '오늘의 주요 뉴스가 업데이트되었습니다', time: new Date(Date.now() - 15 * 60000), read: false },
  { id: 3, type: 'system',   title: '시스템', body: '새로운 미디어 콘텐츠가 등록되었습니다', time: new Date(Date.now() - 60 * 60000), read: true },
  { id: 4, type: 'finance',  title: '환율 알림', body: '달러/원 환율 1,340원대 진입', time: new Date(Date.now() - 120 * 60000), read: true },
];

export default function NotificationBell() {
  const [open, setOpen]         = useState(false);
  const [items, setItems]       = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const ref                     = useRef<HTMLDivElement>(null);
  const unreadCount             = items.filter(function(n) { return !n.read; }).length;

  useEffect(function() {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return function() { document.removeEventListener('mousedown', handleClick); };
  }, []);

  function markAllRead() {
    setItems(function(prev) { return prev.map(function(n) { return { ...n, read: true }; }); });
  }

  function markRead(id: number) {
    setItems(function(prev) { return prev.map(function(n) { return n.id === id ? { ...n, read: true } : n; }); });
  }

  function dismiss(id: number) {
    setItems(function(prev) { return prev.filter(function(n) { return n.id !== id; }); });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={function() { setOpen(function(v) { return !v; }); }}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
      >
        <Bell size={18} className="text-slate-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl shadow-slate-900/15 border border-slate-100 z-50 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">알림</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10px] font-black text-slate-400 hover:text-slate-600 transition-colors"
              >
                <CheckCheck size={12} />
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Bell size={28} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs font-bold">알림이 없습니다</p>
              </div>
            ) : (
              items.map(function(item) {
                return (
                  <div
                    key={item.id}
                    onClick={function() { markRead(item.id); }}
                    className={'flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 ' + (item.read ? 'opacity-60' : '')}
                  >
                    <div className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-700">{item.title}</p>
                      <p className="text-xs text-slate-400 font-medium line-clamp-1 mt-0.5">{item.body}</p>
                      <p className="text-[10px] text-slate-300 font-bold mt-1">{formatTime(item.time)}</p>
                    </div>
                    {!item.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                    <button
                      onClick={function(e) { e.stopPropagation(); dismiss(item.id); }}
                      className="w-5 h-5 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors flex-shrink-0"
                    >
                      <X size={11} className="text-slate-400" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}