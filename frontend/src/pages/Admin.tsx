import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Users, Newspaper, MessageSquare, Tv, Shield, RefreshCw, Loader2, Ban, CheckCircle, Crown } from 'lucide-react';
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

type Tab = 'dashboard' | 'users' | 'settings';

export default function AdminPage() {
  const [tab,      setTab]      = useState<Tab>('dashboard');
  const [dash,     setDash]     = useState<DashData | null>(null);
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);

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
    alert('설정이 저장되었습니다.');
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: '대시보드' },
    { key: 'users',     label: '사용자 관리' },
    { key: 'settings',  label: '시스템 설정' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield size={22} className="text-agora-gold" />
        <div>
          <h1 className="text-xl font-bold">Admin 관제실</h1>
          <p className="text-agora-muted text-sm">시스템 모니터링 및 관리</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-agora-surface border border-agora-border rounded-lg p-1 w-fit">
        {TABS.map(({ key, label }) => (
          <button key={key}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === key ? 'bg-agora-gold text-black' : 'text-agora-muted hover:text-agora-text'
            }`}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-agora-muted">
          <Loader2 size={24} className="animate-spin mr-2" /> 로딩 중...
        </div>
      ) : (
        <>
          {/* ── 대시보드 ── */}
          {tab === 'dashboard' && dash && (
            <div className="space-y-5 animate-fade-in">
              {/* 스탯 카드 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: '총 사용자', value: dash.stats.totalUsers,    icon: Users,        color: 'text-blue-400' },
                  { label: '총 뉴스',   value: dash.stats.totalNews,     icon: Newspaper,    color: 'text-green-400' },
                  { label: '총 댓글',   value: dash.stats.totalComments, icon: MessageSquare, color: 'text-purple-400' },
                  { label: '미디어',    value: dash.stats.totalMedia,    icon: Tv,           color: 'text-orange-400' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="card">
                    <Icon size={20} className={`${color} mb-2`} />
                    <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                    <p className="text-agora-muted text-xs mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* 시스템 상태 */}
              <div className="card">
                <h3 className="font-semibold mb-3 text-sm">시스템 상태</h3>
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dash.system.dbConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse-dot`} />
                    <span className="text-agora-muted">DB</span>
                    <span className={dash.system.dbConnected ? 'text-green-400' : 'text-red-400'}>
                      {dash.system.dbConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot" />
                    <span className="text-agora-muted">가동 시간</span>
                    <span>{Math.floor(dash.system.uptime / 3600)}h {Math.floor((dash.system.uptime % 3600) / 60)}m</span>
                  </div>
                </div>
              </div>

              {/* 최근 접속 로그 */}
              <div className="card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">최근 접속 로그</h3>
                  <button onClick={loadDash} className="text-agora-muted hover:text-agora-text">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-agora-muted border-b border-agora-border">
                        <th className="text-left py-2 pr-4">사용자</th>
                        <th className="text-left py-2 pr-4">IP</th>
                        <th className="text-left py-2 pr-4">액션</th>
                        <th className="text-left py-2">시간</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dash.recentLogs.map((log: any) => (
                        <tr key={log.id} className="border-b border-agora-border/50 hover:bg-agora-border/20 transition-colors">
                          <td className="py-2 pr-4">{log.user_name ?? log.email}</td>
                          <td className="py-2 pr-4 font-mono text-agora-muted">{log.ip_address}</td>
                          <td className="py-2 pr-4">
                            <span className="badge bg-agora-accent/10 text-agora-accent">{log.action}</span>
                          </td>
                          <td className="py-2 text-agora-muted">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ko })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── 사용자 관리 ── */}
          {tab === 'users' && (
            <div className="card animate-fade-in overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-agora-muted border-b border-agora-border text-xs">
                    <th className="text-left py-3 pr-4">이름 / 이메일</th>
                    <th className="text-left py-3 pr-4">역할</th>
                    <th className="text-left py-3 pr-4">로그인 수</th>
                    <th className="text-left py-3 pr-4">마지막 접속</th>
                    <th className="text-left py-3">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-agora-border/50 hover:bg-agora-border/20 transition-colors">
                      <td className="py-3 pr-4">
                        <p className="font-medium">{u.name}</p>
                        <p className="text-agora-muted text-xs">{u.email}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          value={u.role}
                          onChange={e => handleRole(u.id, e.target.value)}
                          className="bg-agora-bg border border-agora-border rounded px-2 py-1 text-xs">
                          <option value="user">user</option>
                          <option value="editor">editor</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4 text-agora-muted">{Number(u.login_count).toLocaleString()}</td>
                      <td className="py-3 pr-4 text-agora-muted text-xs">
                        {u.last_login
                          ? formatDistanceToNow(new Date(u.last_login), { addSuffix: true, locale: ko })
                          : '-'}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleBlock(u.id, u.is_blocked)}
                          className={`flex items-center gap-1 text-xs transition-colors ${
                            u.is_blocked
                              ? 'text-green-400 hover:text-green-300'
                              : 'text-agora-muted hover:text-red-400'
                          }`}>
                          {u.is_blocked
                            ? <><CheckCircle size={13} /> 해제</>
                            : <><Ban size={13} /> 차단</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── 시스템 설정 ── */}
          {tab === 'settings' && (
            <div className="card animate-fade-in max-w-lg space-y-4">
              <h3 className="font-semibold mb-2">시스템 설정</h3>
              {Object.entries(settings).map(([key, value]) => (
                <div key={key}>
                  <label className="text-xs text-agora-muted mb-1 block">{key}</label>
                  {value === 'true' || value === 'false' ? (
                    <select className="input text-sm" value={value}
                      onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}>
                      <option value="true">활성화</option>
                      <option value="false">비활성화</option>
                    </select>
                  ) : (
                    <input className="input text-sm" value={value}
                      onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} />
                  )}
                </div>
              ))}
              <button onClick={saveSettings} className="btn-primary w-full mt-2">설정 저장</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
