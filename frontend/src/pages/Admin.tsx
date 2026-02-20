import { useState, useEffect } from 'react';
import api from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Users, Newspaper, MessageSquare, Tv, Shield, RefreshCw, Loader2, Ban, CheckCircle, Crown, Activity, Terminal, Settings } from 'lucide-react';
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

type Tab = 'dashboard' | 'users' | 'settings';

export default function AdminPage() {
  const { t, i18n } = useTranslation();
  const { language } = useLanguageStore();
  const [tab,      setTab]      = useState<Tab>('dashboard');
  const [dash,     setDash]     = useState<DashData | null>(null);
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);

  const currentLocale = language === 'ko' ? ko : enUS;

  useEffect(() => {
    if (tab === 'dashboard') loadDash();
    else if (tab === 'users') loadUsers();
    else if (tab === 'settings') loadSettings();
  }, [tab]);

  const loadDash = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/dashboard');
      setDash(data.data);
    } finally { setLoading(false); }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users');
      setUsers(data.data);
    } finally { setLoading(false); }
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/settings');
      setSettings(data.data);
    } finally { setLoading(false); }
  };

  const handleBlock = async (id: number, blocked: boolean) => {
    await api.put(`/admin/users/${id}/block`, { blocked: !blocked });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_blocked: !blocked } : u));
  };

  const handleRole = async (id: number, role: string) => {
    await api.put(`/admin/users/${id}/role`, { role });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  };

  const saveSettings = async () => {
    await api.put('/admin/settings', settings);
    alert(t('analysis_complete'));
  };

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: t('dashboard'), icon: Activity },
    { key: 'users',     label: t('user_mgmt'), icon: Users },
    { key: 'settings',  label: t('system_settings'), icon: Settings },
  ];

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* ── 헤더 ── */}
      <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end justify-between border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-2 text-agora-gold mb-2">
            <Shield size={16} />
            <span className="text-[10px] font-black uppercase tracking-[0.3em]">System Admin Console</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white uppercase">{t('admin_panel')}</h1>
          <p className="text-white/30 text-xs font-bold mt-2 uppercase tracking-wider">Service Monitoring & System Control</p>
        </div>
        
        {/* 탭 디자인 보정 */}
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
          {/* ── 대시보드 ── */}
          {tab === 'dashboard' && dash && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
              {/* 스탯 카드 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: t('total_users'), value: dash.stats.totalUsers,    icon: Users,        color: 'text-blue-400', bg: 'bg-blue-400/10' },
                  { label: t('total_news'),   value: dash.stats.totalNews,     icon: Newspaper,    color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                  { label: t('total_comments'), value: dash.stats.totalComments, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                  { label: t('media'),    value: dash.stats.totalMedia,    icon: Tv,           color: 'text-orange-400', bg: 'bg-orange-400/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="glass-container p-8 rounded-[2rem] border border-white/5 hover:bg-white/[0.05] transition-all duration-300 group">
                    <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
                        <Icon size={20} className={color} />
                    </div>
                    <p className="text-3xl font-black text-white tracking-tighter mb-1">{value.toLocaleString()}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 시스템 상태 */}
                <div className="lg:col-span-1 glass-container p-8 rounded-[2rem] border border-white/5">
                    <div className="flex items-center gap-3 mb-8">
                        <Activity size={18} className="text-agora-gold" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-white">{t('system_status')}</h3>
                    </div>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${dash.system.dbConnected ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('db_status')}</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${dash.system.dbConnected ? 'text-emerald-400' : 'text-red-400'}`}>
                                {dash.system.dbConnected ? '연결됨 (Normal)' : '연결 끊김 (Critical)'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <Activity size={12} className="text-white/20" />
                                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{t('uptime')}</span>
                            </div>
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                                {Math.floor(dash.system.uptime / 3600)}시간 {Math.floor((dash.system.uptime % 3600) / 60)}분
                            </span>
                        </div>
                    </div>
                </div>

                {/* 최근 접속 로그 */}
                <div className="lg:col-span-2 glass-container p-8 rounded-[2rem] border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <Terminal size={18} className="text-agora-gold" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">{t('recent_logs')}</h3>
                        </div>
                        <button onClick={loadDash} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center">
                            <RefreshCw size={14} />
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-white/5">
                                    <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-white/20">사용자</th>
                                    <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-white/20">IP 주소</th>
                                    <th className="pb-4 text-[9px] font-black uppercase tracking-widest text-white/20">수행 동작</th>
                                    <th className="pb-4 text-right text-[9px] font-black uppercase tracking-widest text-white/20">시간</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {dash.recentLogs.map((log: any) => (
                                    <tr key={log.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4 text-[11px] font-bold text-white/80">{log.user_name ?? log.email}</td>
                                        <td className="py-4 text-[10px] font-mono text-white/30">{log.ip_address}</td>
                                        <td className="py-4">
                                            <span className="px-2 py-1 rounded bg-agora-gold/10 text-agora-gold text-[9px] font-black uppercase tracking-tighter border border-agora-gold/20">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-4 text-right text-[10px] font-bold text-white/20">
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: currentLocale })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 사용자 관리 ── */}
          {tab === 'users' && (
            <div className="glass-container p-8 rounded-[2.5rem] border border-white/5 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left border-b border-white/5">
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-white/20">Agent Identity</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-white/20">{t('role')}</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-white/20">Deployment Count</th>
                                <th className="pb-6 text-[10px] font-black uppercase tracking-widest text-white/20">{t('last_login')}</th>
                                <th className="pb-6 text-right text-[10px] font-black uppercase tracking-widest text-white/20">{t('manage')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map(u => (
                                <tr key={u.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="py-6">
                                        <p className="text-[13px] font-black text-white uppercase tracking-tight">{u.name}</p>
                                        <p className="text-[10px] font-bold text-white/20 mt-1">{u.email}</p>
                                    </td>
                                    <td className="py-6">
                                        <select
                                            value={u.role}
                                            onChange={e => handleRole(u.id, e.target.value)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-agora-gold/30 transition-all cursor-pointer">
                                            <option value="user" className="bg-agora-bg">Agent</option>
                                            <option value="editor" className="bg-agora-bg">Analyst</option>
                                            <option value="admin" className="bg-agora-bg">Administrator</option>
                                        </select>
                                    </td>
                                    <td className="py-6 text-[11px] font-black text-white/30 uppercase tracking-widest">{Number(u.login_count).toLocaleString()}</td>
                                    <td className="py-6 text-[10px] font-bold text-white/20">
                                        {u.last_login
                                        ? formatDistanceToNow(new Date(u.last_login), { addSuffix: true, locale: currentLocale })
                                        : '-'}
                                    </td>
                                    <td className="py-6 text-right">
                                        <button
                                        onClick={() => handleBlock(u.id, u.is_blocked)}
                                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${
                                            u.is_blocked
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white'
                                        }`}>
                                        {u.is_blocked ? t('unblock') : t('block')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}

          {/* ── 시스템 설정 ── */}
          {tab === 'settings' && (
            <div className="glass-container p-12 rounded-[2.5rem] border border-white/5 animate-in fade-in slide-in-from-bottom-5 duration-700 max-w-2xl">
              <div className="flex items-center gap-4 mb-10">
                 <div className="w-12 h-12 rounded-2xl bg-agora-gold/10 flex items-center justify-center text-agora-gold">
                    <Settings size={22} />
                 </div>
                 <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">{t('system_settings')}</h3>
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mt-1">Core Protocol Calibration</p>
                 </div>
              </div>
              <div className="space-y-8">
                {Object.entries(settings).map(([key, value]) => (
                    <div key={key} className="space-y-3 group">
                        <label className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] ml-1 group-focus-within:text-agora-gold transition-colors">{key.replace(/_/g, ' ')}</label>
                        {value === 'true' || value === 'false' ? (
                            <select className="w-full px-6 py-4 bg-white/5 border border-white/10 focus:border-agora-gold/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white appearance-none cursor-pointer" 
                                value={value}
                                onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}>
                                <option value="true" className="bg-agora-bg">Active Protocol</option>
                                <option value="false" className="bg-agora-bg">Halted Protocol</option>
                            </select>
                        ) : (
                            <input className="w-full px-6 py-4 bg-white/5 border border-white/10 focus:border-agora-gold/30 focus:bg-white/[0.08] rounded-2xl outline-none transition-all font-bold text-white placeholder:text-white/10" 
                                value={value}
                                onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} />
                        )}
                    </div>
                ))}
                <button onClick={saveSettings} className="w-full py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-primary-900/40 transform active:scale-95 duration-200 mt-4">
                    {t('save_settings')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
