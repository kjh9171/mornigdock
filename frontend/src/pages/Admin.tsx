import { useState, useEffect } from 'react';
import api, { getAdminNewsAPI, getAdminPostsAPI, deleteNewsAPI, deletePostAPI, fetchNewsAPI } from '../lib/api';
import { 
  Users, Newspaper, MessageSquare, Tv, Shield, 
  RefreshCw, Loader2, Ban, CheckCircle, Activity, 
  Terminal, Settings, Trash2, Zap, FileText, 
  Search, Plus, X, LayoutDashboard, BarChart3,
  Clock, Database, Globe
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

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
  const [tab,      setTab]      = useState<Tab>('dashboard');
  const [dash,     setDash]     = useState<DashData | null>(null);
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [content,  setContent]  = useState<any[]>([]);
  const [contentType, setContentType] = useState<'news' | 'posts' | 'media'>('news');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'user' });

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
    } finally { 
      setLoading(false); 
    }
  };

  const handleAction = async (action: () => Promise<any>, successMsg: string) => {
    setActionLoading(true);
    try {
      await action();
      alert(successMsg);
      loadTabContent();
    } catch (err: any) {
      alert('오류 발생: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'dashboard', label: '대시보드', icon: LayoutDashboard },
    { key: 'users',     label: '요원 관리',   icon: Users },
    { key: 'content',   label: '자산 관리',    icon: FileText },
    { key: 'settings',  label: '시스템 설정', icon: Settings },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 min-h-screen">
      {/* ── 관리자 헤더 ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 p-8 bg-white rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3 text-slate-900 mb-2">
            <Shield size={28} className="text-blue-600" />
            <span className="text-sm font-black uppercase tracking-widest">System Administration</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">중앙 관제 콘솔</h1>
          <p className="text-slate-500 mt-2 font-medium">AGORA 플랫폼의 모든 지능 데이터와 요원을 제어합니다.</p>
        </div>
        
        <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.5rem]">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => setTab(key)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                tab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-40 text-center">
          <Loader2 size={48} className="animate-spin mx-auto mb-4 text-blue-600 opacity-20" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">System Synchronizing...</p>
        </div>
      ) : (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          {tab === 'dashboard' && dash && (
            <div className="space-y-8">
              {/* 통계 카드 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: '전체 요원', value: dash.stats.totalUsers, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: '뉴스 데이터', value: dash.stats.totalNews, icon: Newspaper, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: '토론 기록', value: dash.stats.totalComments, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: '미디어 자산', value: dash.stats.totalMedia, icon: Tv, color: 'text-orange-600', bg: 'bg-orange-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                    <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                      <Icon size={24} className={color} />
                    </div>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter mb-1">{value.toLocaleString()}</p>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 시스템 상태 */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                    <Activity size={20} className="text-blue-600" /> 시스템 상태
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Database</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${dash.system.dbConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className={`text-xs font-black uppercase ${dash.system.dbConnected ? 'text-emerald-600' : 'text-red-600'}`}>
                          {dash.system.dbConnected ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Server Uptime</span>
                      <span className="text-xs font-black text-slate-700">
                        {Math.floor(dash.system.uptime / 3600)}H {Math.floor((dash.system.uptime % 3600) / 60)}M
                      </span>
                    </div>
                  </div>
                </div>

                {/* 최근 활동 로그 */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-3">
                    <Terminal size={20} className="text-blue-600" /> 실시간 활동 로그
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">요원</th>
                          <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">수행 프로토콜</th>
                          <th className="pb-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">타임스탬프</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {dash.recentLogs.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 text-xs font-black text-slate-700">{log.user_name || log.email}</td>
                            <td className="py-4">
                              <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                                {log.action}
                              </span>
                            </td>
                            <td className="py-4 text-right text-[10px] font-bold text-slate-400">
                              {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
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

          {tab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center px-4">
                <h3 className="text-xl font-black text-slate-900 uppercase">Registered Agents</h3>
                <button 
                  onClick={() => setShowUserModal(true)} 
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200"
                >
                  <Plus size={16} /> 신입 요원 등록
                </button>
              </div>
              
              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Clearance</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Protocol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                              {u.name[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{u.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <select 
                            value={u.role} 
                            onChange={e => handleAction(() => api.put(`/admin/users/${u.id}/role`, { role: e.target.value }), '권한이 변경되었습니다.')}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-black text-slate-700 uppercase tracking-widest outline-none focus:border-blue-500"
                          >
                            <option value="user">Agent</option>
                            <option value="editor">Analyst</option>
                            <option value="admin">Director</option>
                          </select>
                        </td>
                        <td className="px-10 py-8 text-right">
                          <button 
                            onClick={() => handleAction(() => api.put(`/admin/users/${u.id}/block`, { blocked: !u.is_blocked }), u.is_blocked ? '차단 해제됨' : '차단됨')}
                            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                              u.is_blocked ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                            }`}
                          >
                            {u.is_blocked ? 'Access Restore' : 'Kill Switch'}
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
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl">
                  {[
                    { id: 'news', label: 'Intel (뉴스)', icon: Newspaper },
                    { id: 'posts', label: 'Discussion (게시글)', icon: MessageSquare },
                    { id: 'media', label: 'Assets (미디어)', icon: Tv }
                  ].map(type => (
                    <button 
                      key={type.id}
                      onClick={() => setContentType(type.id as any)}
                      className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                        contentType === type.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <type.icon size={16} />
                      {type.label}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-3">
                  {contentType === 'news' && (
                    <button 
                      onClick={() => handleAction(() => fetchNewsAPI(), '뉴스 동기화 완료')} 
                      disabled={actionLoading}
                      className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-200"
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                      즉시 수집 프로토콜
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Insight</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classification</th>
                      <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {content.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-10 py-7 max-w-md">
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight line-clamp-1">{item.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest italic">{item.source_name || item.author_name}</p>
                        </td>
                        <td className="px-10 py-7">
                          <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-10 py-7 text-right">
                          <button 
                            onClick={() => handleAction(() => {
                              if (contentType === 'news') return deleteNewsAPI(item.id);
                              if (contentType === 'posts') return deletePostAPI(item.id);
                              return api.delete(`/admin/media/${item.id}`);
                            }, '데이터가 삭제되었습니다.')}
                            className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm group"
                          >
                            <Trash2 size={18} className="group-active:scale-90" />
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
            <div className="max-w-3xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
              <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] -rotate-12"><Settings size={300} /></div>
                
                <div className="flex items-center gap-4 mb-12 relative z-10">
                  <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                    <Zap size={24} className="text-blue-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">System Core Config</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">플랫폼 운영 핵심 파라미터 조율</p>
                  </div>
                </div>

                <div className="space-y-6 relative z-10">
                  {[
                    { key: 'naver_client_id', label: 'Naver API Client ID', desc: '네이버 뉴스 검색 API 사용을 위한 Client ID입니다.', type: 'input' },
                    { key: 'naver_client_secret', label: 'Naver API Client Secret', desc: '네이버 뉴스 검색 API 사용을 위한 Client Secret입니다.', type: 'input' },
                    { key: 'gemini_api_key', label: 'Gemini API Key', desc: '뉴스 본문 분석 및 요약을 위한 Google Gemini API 키입니다.', type: 'input' },
                    { key: 'ai_analysis_enabled', label: 'AI 분석 엔진 가동', desc: '뉴스 수집 시 Gemini AI 분석 리포트를 자동으로 생성합니다.', type: 'toggle' },
                    { key: 'auto_fetch_enabled', label: '실시간 자동 수집', desc: '외부 소스에서 실시간 지능 데이터를 자동으로 가져옵니다.', type: 'toggle' },
                    { key: 'maintenance_mode', label: '점검 모드 (접근 통제)', desc: '관리자를 제외한 일반 요원의 접속을 차단합니다.', type: 'toggle' },
                    { key: 'max_news_per_fetch', label: '최대 수집 데이터량', desc: '자동 수집 시도당 가져올 최대 데이터 개수를 설정합니다.', type: 'input', unit: '건' }
                  ].map((item) => (
                    <div key={item.key} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all flex items-center justify-between gap-6 group">
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1 group-hover:text-blue-600 transition-colors">{item.label}</p>
                        <p className="text-xs font-medium text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                      <div>
                        {item.type === 'toggle' ? (
                          <button 
                            onClick={() => setSettings(s => ({...s, [item.key]: s[item.key] === 'true' ? 'false' : 'true'}))}
                            className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${settings[item.key] === 'true' ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-slate-200'}`}
                          >
                            <div className={`w-6 h-6 bg-white rounded-full transition-all duration-300 ${settings[item.key] === 'true' ? 'translate-x-6' : 'translate-x-0'}`} />
                          </button>
                        ) : (
                          <div className="flex items-center gap-3">
                            <input 
                              className={`px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 outline-none focus:border-blue-500 ${item.key.includes('key') || item.key.includes('secret') ? 'w-64' : 'w-20 text-center'}`}
                              value={settings[item.key] || ''} 
                              onChange={e => setSettings(s => ({...s, [item.key]: e.target.value}))}
                              type={item.key.includes('secret') || item.key.includes('key') ? 'password' : 'text'}
                            />
                            {item.unit && <span className="text-[10px] font-black text-slate-400 uppercase">{item.unit}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="pt-10">
                    <button 
                      onClick={() => handleAction(() => api.put('/admin/settings', settings), '운영 정책이 업데이트되었습니다.')}
                      className="w-full py-6 bg-slate-900 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
                    >
                      Apply Operational Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
