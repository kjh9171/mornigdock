import { useState, useEffect } from 'react';
import api, { getAdminNewsAPI, getAdminPostsAPI, deleteNewsAPI, deletePostAPI, fetchNewsAPI } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Users, Newspaper, MessageSquare, Tv, Shield, RefreshCw, Loader2, Ban, CheckCircle, Crown, Activity, Terminal, Settings, Trash2, Zap, FileText, Search, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';
import { useLanguageStore } from '../store/useLanguageStore';

interface DashData {
  stats: { totalUsers: number; totalNews: number; totalComments: number; totalMedia: number };
  recentLogs: any[];
  system: { dbConnected: boolean; uptime: number };
}

interface UserRow {
  id: number; email: string; name: string; role: string;
  is_blocked: boolean; last_login: string; login_count: number;
}

type Tab = 'dashboard' | 'users' | 'content' | 'settings';

export default function AdminPage() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const [tab,      setTab]      = useState<Tab>('dashboard');
  const [dash,     setDash]     = useState<DashData | null>(null);
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [content,  setContent]  = useState<any[]>([]);
  const [contentType, setContentType] = useState<'news' | 'posts'>('news');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const currentLocale = language === 'ko' ? ko : enUS;

  useEffect(() => {
    loadTabContent();
  }, [tab, contentType]);

  const loadTabContent = async () => {
    setLoading(true);
    try {
      if (tab === 'dashboard') {
        const { data } = await api.get('/admin/dashboard');
        setDash(data.data);
      } else if (tab === 'users') {
        const { data } = await api.get('/admin/users');
        setUsers(data.data);
      } else if (tab === 'content') {
        if (contentType === 'news') {
          const res = await getAdminNewsAPI();
          setContent(res.data);
        } else {
          const res = await getAdminPostsAPI();
          setContent(res.data);
        }
      } else if (tab === 'settings') {
        const { data } = await api.get('/admin/settings');
        setSettings(data.data);
      }
    } catch (err) {
      console.error('Load Error:', err);
    } finally { setLoading(false); }
  };

  const handleDeleteContent = async (id: number) => {
    if (!confirm(t('confirm_delete') || '정말 삭제하시겠습니까?')) return;
    try {
      if (contentType === 'news') await deleteNewsAPI(id);
      else await deletePostAPI(id);
      setContent(prev => prev.filter(item => item.id !== id));
    } catch (err) { alert('삭제 실패'); }
  };

  const handleFetchNews = async () => {
    setActionLoading(true);
    try {
      await fetchNewsAPI();
      if (contentType === 'news') loadTabContent();
    } finally { setActionLoading(false); }
  };

  const handleBlock = async (id: number, blocked: boolean) => {
    await api.put(`/admin/users/${id}/block`, { blocked: !blocked });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_blocked: !blocked } : u));
  };

  const handleRole = async (id: number, role: string) => {
    await api.put(`/admin/users/${id}/role`, { role });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: t('dashboard'), icon: Activity },
    { key: 'users',     label: t('user_mgmt'),   icon: Users },
    { key: 'content',   label: '콘텐츠 관리',    icon: FileText },
    { key: 'settings',  label: t('system_settings'), icon: Settings },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end justify-between border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 text-agora-gold mb-2">
            <Shield size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Admin Console</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">{t('admin_panel')}</h1>
          <p className="text-white/30 text-xs font-bold mt-2 uppercase tracking-wider">Service Monitoring & Content Control</p>
        </div>
        
        <div className="flex gap-2 bg-white/5 p-1.5 rounded-[1.25rem] border border-white/5">
            {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 ${
                tab === key ? 'bg-white text-agora-bg shadow-xl' : 'text-white/30 hover:text-white/60'
                }`}
                onClick={() => setTab(key)}>
                <Icon size={14} />
                {label}
            </button>
            ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 text-white/20 animate-pulse">
            <Loader2 size={40} className="animate-spin mb-4 text-agora-gold" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em]">{t('loading')}</span>
        </div>
      ) : (
        <div className="space-y-10">
          {tab === 'dashboard' && dash && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: t('total_users'), value: dash.stats.totalUsers,    icon: Users,        color: 'text-blue-400', bg: 'bg-blue-400/10' },
                  { label: t('total_news'),   value: dash.stats.totalNews,     icon: Newspaper,    color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                  { label: t('total_comments'), value: dash.stats.totalComments, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                  { label: t('media'),    value: dash.stats.totalMedia,    icon: Tv,           color: 'text-orange-400', bg: 'bg-orange-400/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="glass-container p-8 rounded-[2rem] border border-white/5 hover:bg-white/[0.05] transition-all duration-300">
                    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-6`}>
                        <Icon size={20} className={color} />
                    </div>
                    <p className="text-3xl font-black text-white tracking-tighter mb-1">{value.toLocaleString()}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 glass-container p-8 rounded-[2.5rem] border border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white mb-8 flex items-center gap-3"><Activity size={16} className="text-agora-gold" /> {t('system_status')}</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Database</span>
                            <span className={`text-[10px] font-black uppercase ${dash.system.dbConnected ? 'text-emerald-400' : 'text-red-400'}`}>{dash.system.dbConnected ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Uptime</span>
                            <span className="text-[10px] font-black text-white">{Math.floor(dash.system.uptime / 3600)}H {Math.floor((dash.system.uptime % 3600) / 60)}M</span>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 glass-container p-8 rounded-[2.5rem] border border-white/5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-white mb-8 flex items-center gap-3"><Terminal size={16} className="text-agora-gold" /> {t('recent_logs')}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="border-b border-white/5">
                                <tr>
                                    <th className="pb-4 text-[9px] font-black text-white/20 uppercase tracking-widest">User</th>
                                    <th className="pb-4 text-[9px] font-black text-white/20 uppercase tracking-widest">Action</th>
                                    <th className="pb-4 text-right text-[9px] font-black text-white/20 uppercase tracking-widest">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dash.recentLogs.map((log: any) => (
                                    <tr key={log.id} className="border-b border-white/5 last:border-0">
                                        <td className="py-4 text-[11px] font-bold text-white/80">{log.user_name || log.email}</td>
                                        <td className="py-4"><span className="px-2 py-1 rounded bg-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest">{log.action}</span></td>
                                        <td className="py-4 text-right text-[10px] font-bold text-white/20">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: currentLocale })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="glass-container rounded-[2.5rem] border border-white/5 overflow-hidden animate-in fade-in duration-500">
                <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                            <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">identity</th>
                            <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">Clearance</th>
                            <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Access control</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {users.map(u => (
                            <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-10 py-8">
                                    <p className="text-sm font-black text-white uppercase tracking-tight">{u.name}</p>
                                    <p className="text-[10px] font-bold text-white/20 mt-1 uppercase tracking-widest">{u.email}</p>
                                </td>
                                <td className="px-10 py-8">
                                    <select value={u.role} onChange={e => handleRole(u.id, e.target.value)}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-black text-white uppercase tracking-widest outline-none focus:border-agora-gold/40">
                                        <option value="user" className="bg-agora-bg text-white">Agent</option>
                                        <option value="editor" className="bg-agora-bg text-white">Analyst</option>
                                        <option value="admin" className="bg-agora-bg text-white">Director</option>
                                    </select>
                                </td>
                                <td className="px-10 py-8 text-right">
                                    <button onClick={() => handleBlock(u.id, u.is_blocked)}
                                        className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${u.is_blocked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {u.is_blocked ? 'RESTORE' : 'BLOCK'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          )}

          {tab === 'content' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                      <button onClick={() => setContentType('news')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${contentType === 'news' ? 'bg-white text-agora-bg' : 'text-white/30 hover:text-white/60'}`}>뉴스 분석 (Intel)</button>
                      <button onClick={() => setContentType('posts')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${contentType === 'posts' ? 'bg-white text-agora-bg' : 'text-white/30 hover:text-white/60'}`}>커뮤니티 게시글</button>
                  </div>
                  {contentType === 'news' && (
                      <button onClick={handleFetchNews} disabled={actionLoading} className="flex items-center gap-3 px-8 py-3 bg-agora-gold/10 hover:bg-agora-gold/20 border border-agora-gold/20 text-agora-gold rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                          {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                          지능 데이터 즉시 수집
                      </button>
                  )}
               </div>

               <div className="glass-container rounded-[2.5rem] border border-white/5 overflow-hidden">
                  <table className="w-full text-left">
                     <thead className="bg-white/5 border-b border-white/5">
                        <tr>
                           <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">Asset Detail</th>
                           <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">Classification</th>
                           <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest">Date</th>
                           <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-widest text-right">Action</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                        {content.map(item => (
                           <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-10 py-7 max-w-md">
                                 <p className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">{item.title}</p>
                                 <p className="text-[9px] font-bold text-white/20 mt-1 uppercase tracking-widest">{item.source_name || item.author_name}</p>
                              </td>
                              <td className="px-10 py-7">
                                 <span className="px-4 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-white/40 uppercase tracking-widest">{item.category}</span>
                              </td>
                              <td className="px-10 py-7 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                                 {formatDistanceToNow(new Date(item.published_at || item.created_at), { addSuffix: true, locale: currentLocale })}
                              </td>
                              <td className="px-10 py-7 text-right">
                                 <button onClick={() => handleDeleteContent(item.id)} className="p-3 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-all group">
                                    <Trash2 size={14} className="group-active:scale-90" />
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {tab === 'settings' && (
             <div className="glass-container p-12 rounded-[2.5rem] border border-white/5 max-w-2xl mx-auto animate-in fade-in duration-500">
                 <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-10 flex items-center gap-4"><Settings size={22} className="text-agora-gold" /> System Calibration</h3>
                 <div className="space-y-8">
                    {Object.entries(settings).map(([key, value]) => (
                        <div key={key} className="space-y-3">
                            <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">{key.replace(/_/g, ' ')}</label>
                            <input className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:border-agora-gold/30 transition-all" value={value} onChange={e => setSettings(s => ({...s, [key]: e.target.value}))} />
                        </div>
                    ))}
                    <button onClick={async () => { await api.put('/admin/settings', settings); alert('저장 완료'); }} className="w-full py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Save Protocols</button>
                 </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
