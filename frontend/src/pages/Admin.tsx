import { useState, useEffect } from 'react';
import api, { getAdminNewsAPI, getAdminPostsAPI, deleteNewsAPI, deletePostAPI, fetchNewsAPI } from '../lib/api';
import { useTranslation } from 'react-i18next';
import { Users, Newspaper, MessageSquare, Tv, Shield, RefreshCw, Loader2, Ban, CheckCircle, Crown, Activity, Terminal, Settings, Trash2, Zap, FileText, Search, Pin, Plus, X } from 'lucide-react';
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
  const [contentType, setContentType] = useState<'news' | 'posts' | 'media'>('news');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // 사용자 추가 모달 상태
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'user' });

  // 미디어 추가 모달 상태
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [newMedia, setNewMedia] = useState({ title: '', type: 'youtube', url: '', description: '', thumbnail: '' });

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
        } else if (contentType === 'posts') {
          const res = await getAdminPostsAPI();
          setContent(res.data);
        } else {
          const { data } = await api.get('/admin/media');
          setContent(data.data);
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
      else if (contentType === 'posts') await deletePostAPI(id);
      else if (contentType === 'media') await api.delete(`/admin/media/${id}`);
      setContent(prev => prev.filter(item => item.id !== id));
      alert('삭제 완료!');
    } catch (err) { alert('삭제 실패: ' + (err as any).response?.data?.message); }
  };

  const handleDeleteUser = async (id: number) => {
    const { deleteAdminUserAPI } = await import('../lib/api');
    if (!confirm('해당 요원을 말소하시겠습니까?')) return;
    try {
      await deleteAdminUserAPI(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      alert('말소 완료');
    } catch (err) { alert('삭제 실패'); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { addAdminUserAPI } = await import('../lib/api');
    setActionLoading(true);
    try {
      await addAdminUserAPI(newUser);
      setShowUserModal(false);
      setNewUser({ email: '', password: '', name: '', role: 'user' });
      loadTabContent();
    } catch (err) { alert('생성 실패'); } finally { setActionLoading(false); }
  };

  const handleCreateMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.post('/admin/media', newMedia);
      setShowMediaModal(false);
      setNewMedia({ title: '', type: 'youtube', url: '', description: '', thumbnail: '' });
      loadTabContent();
    } catch (err) { alert('생성 실패'); } finally { setActionLoading(false); }
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
    <div className="bg-[#0a0a0b] min-h-screen -mt-6 -mx-4 lg:-mx-0 px-4 lg:px-10 py-10 text-white">
      <div className="space-y-10 max-w-7xl mx-auto pb-20">
      
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
                tab === key ? 'bg-white text-primary-900 shadow-xl' : 'text-white/30 hover:text-white/60'
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
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="flex justify-end">
                  <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                    <Plus size={14} /> New Induction
                  </button>
               </div>
               <div className="glass-container rounded-[2.5rem] border border-white/5 overflow-hidden">
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
                                    <button onClick={() => handleDeleteUser(u.id)} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all ml-2">
                                      <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

          {tab === 'content' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                      <button onClick={() => setContentType('news')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${contentType === 'news' ? 'bg-white text-primary-900' : 'text-white/30 hover:text-white/60'}`}>뉴스 분석 (Intel)</button>
                      <button onClick={() => setContentType('posts')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${contentType === 'posts' ? 'bg-white text-primary-900' : 'text-white/30 hover:text-white/60'}`}>커뮤니티 게시글</button>
                      <button onClick={() => setContentType('media')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${contentType === 'media' ? 'bg-white text-primary-900' : 'text-white/30 hover:text-white/60'}`}>미디어 센터 (Asset)</button>
                  </div>
                  <div className="flex gap-3">
                    {contentType === 'news' && (
                        <button onClick={handleFetchNews} disabled={actionLoading} className="flex items-center gap-3 px-8 py-3 bg-agora-gold/10 hover:bg-agora-gold/20 border border-agora-gold/20 text-agora-gold rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                            {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                            지능 데이터 즉시 수집
                        </button>
                    )}
                    {contentType === 'media' && (
                      <button onClick={() => setShowMediaModal(true)} className="flex items-center gap-3 px-8 py-3 bg-primary-600 hover:bg-primary-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                        <Plus size={16} /> New Asset
                      </button>
                    )}
                  </div>
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
             <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto">
               <div className="glass-container p-12 rounded-[3.5rem] border border-white/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-10 opacity-5 shadow-2xl"><Settings size={150} /></div>
                   <div className="flex items-center gap-4 mb-12 relative z-10">
                       <div className="w-12 h-12 bg-agora-gold/20 rounded-2xl flex items-center justify-center">
                           <Zap size={20} className="text-agora-gold animate-pulse" />
                       </div>
                       <div>
                           <h3 className="text-xl font-black text-white uppercase tracking-tighter">System Calibration Center</h3>
                           <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">기지 운영 핵심 프로토콜 조율</p>
                       </div>
                   </div>

                   <div className="space-y-6 relative z-10">
                      {[
                        { 
                          key: 'AI_ANALYSIS_ENABLED', 
                          label: 'AI 지능 분석 엔진', 
                          desc: '뉴스 및 첩보 수집 시 인공지능이 자동으로 분석 리포트를 생성하도록 합니다.',
                          isToggle: true 
                        },
                        { 
                          key: 'AUTO_FETCH_ENABLED', 
                          label: '실시간 뉴스 자동 수집', 
                          desc: '주기적으로 외부 매체에서 새로운 지능 데이터를 자동으로 수집합니다.',
                          isToggle: true 
                        },
                        { 
                          key: 'MAINTENANCE_MODE', 
                          label: '점검 모드 (민간인 접근 제어)', 
                          desc: '활성화 시 관리자 등급 요원 외에는 기지 접근이 차단됩니다.',
                          isToggle: true 
                        },
                        { 
                          key: 'MAX_NEWS_PER_FETCH', 
                          label: '최대 지능 수집량', 
                          desc: '자동 수집 시 한 번에 가져올 최대 기사 수를 설정합니다.',
                          isToggle: false,
                          unit: '건'
                        },
                        { 
                          key: 'NEWS_FETCH_INTERVAL', 
                          label: '수집 주기 (분 단위)', 
                          desc: '데이터 수집 시도 간격을 설정합니다. (너무 잦으면 차단 위험)',
                          isToggle: false,
                          unit: '분'
                        }
                      ].map((item) => (
                          <div key={item.key} className="p-6 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-all group">
                              <div className="flex items-center justify-between gap-6">
                                  <div className="flex-1">
                                      <p className="text-[11px] font-black text-white uppercase tracking-widest mb-1 group-hover:text-agora-gold transition-colors">{item.label}</p>
                                      <p className="text-[10px] font-medium text-white/30 leading-relaxed">{item.desc}</p>
                                  </div>
                                  <div className="shrink-0">
                                      {item.isToggle ? (
                                          <button 
                                              onClick={() => setSettings(s => ({...s, [item.key]: s[item.key] === 'true' ? 'false' : 'true'}))}
                                              className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings[item.key] === 'true' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-white/10'}`}
                                          >
                                              <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${settings[item.key] === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
                                          </button>
                                      ) : (
                                          <div className="flex items-center gap-3">
                                              <input 
                                                  className="w-20 px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-center text-[11px] font-black text-white outline-none focus:border-agora-gold/30"
                                                  value={settings[item.key]} 
                                                  onChange={e => setSettings(s => ({...s, [item.key]: e.target.value}))}
                                              />
                                              <span className="text-[9px] font-black text-white/30 uppercase">{item.unit}</span>
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      ))}

                      <div className="pt-10 flex gap-4">
                          <button 
                            onClick={async () => {
                                const { data } = await api.get('/admin/settings');
                                setSettings(data.data);
                            }}
                            className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all"
                          >
                            Reset Protocols
                          </button>
                          <button 
                            onClick={async () => { 
                                await api.put('/admin/settings', settings); 
                                alert('운영 프로토콜이 업데이트되었습니다.'); 
                            }} 
                            className="flex-[2] py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary-900/40 transition-all active:scale-95"
                          >
                            Apply Operational Changes
                          </button>
                      </div>
                   </div>
               </div>
               <div className="p-8 border border-agora-gold/10 bg-agora-gold/[0.02] rounded-[2.5rem] flex items-center gap-6">
                  <div className="w-10 h-10 rounded-full bg-agora-gold/10 flex items-center justify-center shrink-0">
                      <Shield size={18} className="text-agora-gold" />
                  </div>
                  <p className="text-[10px] font-medium text-white/40 leading-loose uppercase tracking-widest">
                    주의: 설정 변경은 기지 전체 요원에게 즉시 적용되며, 시스템 자원 소모량에 변화를 줄 수 있습니다. 신중하게 검토 후 승인하십시오.
                  </p>
               </div>
             </div>
          )}
        </div>
      )}
      </div>

      {/* ── 사용자 추가 모달 ── */}
      {showUserModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
          <div className="glass-container w-full max-w-md p-10 rounded-[2.5rem] border border-white/10 animate-in zoom-in-95 duration-300 shadow-2xl">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3"><Users className="text-primary-400" size={24} /> New Induction</h3>
                <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white"><X size={20} /></button>
             </div>
             <form onSubmit={handleCreateUser} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Agent Identity (Email)</label>
                  <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary-500/30 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Access Key (Password)</label>
                  <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary-500/30 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Name</label>
                  <input required type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-primary-500/30 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Clearance Level</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full px-6 py-4 bg-[#1a1a1c] border border-white/10 rounded-2xl text-[11px] font-black text-white uppercase tracking-widest outline-none">
                    <option value="user">Agent</option>
                    <option value="editor">Lead Analyst</option>
                    <option value="admin">Director</option>
                  </select>
                </div>
                <button type="submit" disabled={actionLoading} className="w-full py-5 bg-primary-600 hover:bg-primary-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">
                  {actionLoading ? 'Initializing...' : 'Authorize Access'}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* ── 미디어 추가 모달 ── */}
      {showMediaModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-black/60">
           <div className="glass-container w-full max-w-lg p-10 rounded-[2.5rem] border border-white/10 animate-in zoom-in-95 duration-300 shadow-2xl">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3"><Tv className="text-orange-400" size={24} /> Catalog Asset</h3>
                <button onClick={() => setShowMediaModal(false)} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white"><X size={20} /></button>
             </div>
             <form onSubmit={handleCreateMedia} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Asset Title</label>
                  <input required value={newMedia.title} onChange={e => setNewMedia({...newMedia, title: e.target.value})} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Type</label>
                    <select value={newMedia.type} onChange={e => setNewMedia({...newMedia, type: e.target.value})} className="w-full px-6 py-4 bg-[#1a1a1c] border border-white/10 rounded-2xl text-[11px] font-black text-white uppercase outline-none">
                      <option value="youtube">VOD (YouTube)</option>
                      <option value="podcast">AUDIO (Podcast)</option>
                      <option value="music">SND (Music)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Category</label>
                    <input placeholder="Ex: Market" value={newMedia.thumbnail} onChange={e => setNewMedia({...newMedia, thumbnail: e.target.value})} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Source URL</label>
                  <input required value={newMedia.url} onChange={e => setNewMedia({...newMedia, url: e.target.value})} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-white/30 uppercase tracking-widest ml-1">Brief (Internal)</label>
                  <textarea value={newMedia.description} onChange={e => setNewMedia({...newMedia, description: e.target.value})} className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none h-24 font-bold" />
                </div>
                <button type="submit" disabled={actionLoading} className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl">
                  Catalog to DB
                </button>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
