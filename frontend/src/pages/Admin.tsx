import { useState, useEffect, useRef } from 'react';
import {
  Shield, Users, Server, Activity, Database, Trash2,
  Plus, Edit2, X, Save, Youtube, Headphones, Music,
  Eye, EyeOff, ChevronDown, Check, AlertCircle, Star
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

// ── 인터페이스 정의 ──────────────────────────────────────────
interface SystemStats {
  totalUsers: number;
  totalNews: number;
  totalComments: number;
  totalMedia: number;
  pendingInquiries: number;
}

interface UserItem {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'user';
  is_blocked: boolean;
  otp_enabled: boolean;
  last_login: string;
  created_at: string;
  login_count: number;
}

interface MediaItem {
  id: number;
  type: 'youtube' | 'podcast' | 'music';
  title: string;
  url: string;
  description: string;
  thumbnail: string;
  artist: string;
  is_active: boolean;
  is_featured: boolean;
  play_count: number;
  created_at: string;
}

// ── 역할 배지 색상 매핑 ──────────────────────────────────────
const roleBadge: Record<string, string> = {
  admin:  'bg-rose-100 text-rose-700',
  editor: 'bg-amber-100 text-amber-700',
  user:   'bg-blue-100 text-blue-700',
};

// ── 미디어 타입 아이콘 ───────────────────────────────────────
const MediaIcon = ({ type }: { type: string }) => {
  if (type === 'youtube')  return <Youtube  size={14} className="text-red-500" />;
  if (type === 'podcast')  return <Headphones size={14} className="text-purple-500" />;
  return <Music size={14} className="text-emerald-500" />;
};

// ── 알림 컴포넌트 ────────────────────────────────────────────
const Toast = ({ msg, type }: { msg: string; type: 'ok' | 'err' }) => (
  <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold text-white animate-in slide-in-from-right-5 duration-300
    ${type === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
    {type === 'ok' ? <Check size={16} /> : <AlertCircle size={16} />}
    {msg}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// 메인 Admin 컴포넌트
// ═══════════════════════════════════════════════════════════════
export default function Admin() {
  const { user, isAuthenticated } = useAuthStore();

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'posts' | 'media'>('dashboard');

  // 공통 상태
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  // 대시보드 상태
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs]   = useState<any[]>([]);

  // 사용자 관리 상태
  const [users, setUsers]         = useState<UserItem[]>([]);
  const [userForm, setUserForm]   = useState({ email: '', name: '', password: '', role: 'user' as 'admin'|'editor'|'user' });
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showPwd, setShowPwd]     = useState(false);

  // 게시글 상태
  const [posts, setPosts] = useState<any[]>([]);

  // 미디어 관리 상태
  const [media, setMedia]           = useState<MediaItem[]>([]);
  const [showMediaForm, setShowMediaForm] = useState(false);
  const [editMedia, setEditMedia]   = useState<MediaItem | null>(null);
  const [mediaForm, setMediaForm]   = useState({
    title: '', type: 'youtube' as 'youtube'|'podcast'|'music',
    url: '', description: '', artist: '', is_featured: false, is_active: true
  });

  // ── 알림 표시 유틸 ────────────────────────────────────────
  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── 데이터 패칭 ───────────────────────────────────────────
  const fetchData = async () => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    setLoading(true);
    try {
      if (activeTab === 'dashboard') {
        const res = await api.get('/admin/dashboard');
        if (res.data.success) {
          setStats(res.data.data.stats);
          setLogs(res.data.data.recentLogs || []);
        }
      } else if (activeTab === 'users') {
        const res = await api.get('/admin/users');
        if (res.data.success) setUsers(res.data.data);
      } else if (activeTab === 'posts') {
        const res = await api.get('/admin/posts');
        if (res.data.success) setPosts(res.data.data);
      } else if (activeTab === 'media') {
        const res = await api.get('/admin/media');
        if (res.data.success) setMedia(res.data.data);
      }
    } catch (err) {
      showToast('데이터 로딩 실패', 'err');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [isAuthenticated, user, activeTab]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <Shield size={48} className="text-rose-400 mx-auto mb-4" />
        <p className="text-rose-500 font-bold text-lg">관리자 권한이 필요합니다.</p>
      </div>
    );
  }

  // ── 사용자 추가 ───────────────────────────────────────────
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', userForm);
      if (res.data.success) {
        showToast('사용자가 추가되었습니다.');
        setShowAddUser(false);
        setUserForm({ email: '', name: '', password: '', role: 'user' });
        fetchData();
      } else {
        showToast(res.data.message || '추가 실패', 'err');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || '추가 실패', 'err');
    }
  };

  // ── 사용자 정보 수정 ──────────────────────────────────────
  const handleSaveUser = async () => {
    if (!editingUser) return;
    try {
      const res = await api.put(`/admin/users/${editingUser.id}`, {
        name:       editingUser.name,
        role:       editingUser.role,
        is_blocked: editingUser.is_blocked,
      });
      if (res.data.success) {
        showToast('사용자 정보가 수정되었습니다.');
        setEditingUser(null);
        fetchData();
      } else {
        showToast(res.data.message || '수정 실패', 'err');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || '수정 실패', 'err');
    }
  };

  // ── 사용자 삭제 ───────────────────────────────────────────
  const handleDeleteUser = async (u: UserItem) => {
    if (!confirm(`정말 "${u.name}" 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      const res = await api.delete(`/admin/users/${u.id}`);
      if (res.data.success) {
        showToast('사용자가 삭제되었습니다.');
        fetchData();
      } else {
        showToast(res.data.message || '삭제 실패', 'err');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || '삭제 실패', 'err');
    }
  };

  // ── 사용자 차단/해제 ──────────────────────────────────────
  const toggleBlock = async (u: UserItem) => {
    try {
      const res = await api.put(`/admin/users/${u.id}/block`, { blocked: !u.is_blocked });
      if (res.data.success) {
        showToast(res.data.message);
        fetchData();
      }
    } catch { showToast('처리 실패', 'err'); }
  };

  // ── 미디어 저장 (추가/수정) ───────────────────────────────
  const handleSaveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let res;
      if (editMedia) {
        res = await api.put(`/admin/media/${editMedia.id}`, mediaForm);
      } else {
        res = await api.post('/admin/media', mediaForm);
      }
      if (res.data.success) {
        showToast(editMedia ? '미디어가 수정되었습니다.' : '미디어가 추가되었습니다.');
        setShowMediaForm(false);
        setEditMedia(null);
        setMediaForm({ title: '', type: 'youtube', url: '', description: '', artist: '', is_featured: false, is_active: true });
        fetchData();
      } else {
        showToast(res.data.message || '저장 실패', 'err');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || '저장 실패', 'err');
    }
  };

  // ── 미디어 삭제 ───────────────────────────────────────────
  const handleDeleteMedia = async (id: number) => {
    if (!confirm('이 미디어를 삭제하시겠습니까?')) return;
    try {
      const res = await api.delete(`/admin/media/${id}`);
      if (res.data.success) {
        showToast('미디어가 삭제되었습니다.');
        fetchData();
      }
    } catch { showToast('삭제 실패', 'err'); }
  };

  // ── 미디어 수정 모달 열기 ────────────────────────────────
  const openEditMedia = (m: MediaItem) => {
    setEditMedia(m);
    setMediaForm({
      title: m.title, type: m.type, url: m.url,
      description: m.description || '', artist: m.artist || '',
      is_featured: m.is_featured, is_active: m.is_active
    });
    setShowMediaForm(true);
  };

  // ── 게시글 삭제 ───────────────────────────────────────────
  const handleDeletePost = async (id: number) => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return;
    try {
      const res = await api.delete(`/admin/posts/${id}`);
      if (res.data.success) {
        showToast('게시글이 삭제되었습니다.');
        fetchData();
      }
    } catch { showToast('삭제 실패', 'err'); }
  };

  // 대시보드 메트릭 카드 정의
  const metrics = [
    { label: '전체 사용자', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500 bg-blue-50' },
    { label: '뉴스 스크랩', value: stats?.totalNews || 0, icon: Database, color: 'text-emerald-500 bg-emerald-50' },
    { label: '댓글 수', value: stats?.totalComments || 0, icon: Activity, color: 'text-amber-500 bg-amber-50' },
    { label: '미디어', value: stats?.totalMedia || 0, icon: Shield, color: 'text-rose-500 bg-rose-50' },
  ];

  // 탭 버튼 목록
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'dashboard', label: '요약 현황' },
    { key: 'users',     label: '사용자 관리' },
    { key: 'posts',     label: '게시글 관리' },
    { key: 'media',     label: '미디어 관리' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">
      {/* 알림 토스트 */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* 헤더 */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl shrink-0">
            <Server className="text-white w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">통합 관제 센터</h1>
            <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">System Operations & Security Control</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`px-4 py-2 rounded-xl transition-all text-xs font-black uppercase
                ${activeTab === t.key ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 로딩 스피너 */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (

        <>
          {/* ── 대시보드 탭 ─────────────────────────────────── */}
          {activeTab === 'dashboard' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                {metrics.map((m, i) => (
                  <div key={i} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-lg flex items-center gap-4 hover:-translate-y-1 transition-transform">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${m.color}`}>
                      <m.icon size={22} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{m.label}</p>
                      <h3 className="text-2xl font-black text-slate-800">{m.value.toLocaleString()}</h3>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl overflow-hidden relative">
                <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
                <div className="flex items-center gap-2 mb-5 relative z-10">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono tracking-widest">system_log_stream.sh</span>
                </div>
                <div className="font-mono text-xs leading-7 text-emerald-400 max-h-64 overflow-y-auto relative z-10">
                  {logs.length > 0 ? logs.map((log: any, i) => (
                    <p key={i}>
                      <span className="text-slate-500">[{new Date(log.created_at).toISOString().slice(0, 19).replace('T', ' ')}]</span>{' '}
                      <span className="text-blue-400">INFO</span> - IP: {log.ip_address} | {log.endpoint || log.action || '-'}{log.user_name ? ` | User: ${log.user_name}` : ''}
                    </p>
                  )) : (
                    <p><span className="text-slate-500">[{new Date().toISOString().slice(0, 19).replace('T', ' ')}]</span> <span className="text-emerald-400">INFO</span> - System initialized. Awaiting logs...</p>
                  )}
                  <p className="mt-3"><span className="animate-pulse inline-block w-2 h-4 bg-emerald-400" /></p>
                </div>
              </div>
            </>
          )}

          {/* ── 사용자 관리 탭 ──────────────────────────────── */}
          {activeTab === 'users' && (
            <div>
              {/* 사용자 추가 버튼 */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800">사용자 목록 ({users.length}명)</h2>
                <button onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg">
                  <Plus size={14} /> 사용자 추가
                </button>
              </div>

              {/* 사용자 추가 폼 모달 */}
              {showAddUser && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100">
                      <h3 className="text-lg font-black text-slate-800">새 사용자 추가</h3>
                      <button onClick={() => setShowAddUser(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
                    </div>
                    <form onSubmit={handleAddUser} className="p-6 space-y-4">
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-widest">이메일</label>
                        <input type="email" required value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm font-medium" placeholder="user@example.com" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-widest">이름</label>
                        <input type="text" required value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm font-medium" placeholder="홍길동" />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-widest">비밀번호</label>
                        <div className="relative">
                          <input type={showPwd ? 'text' : 'password'} required value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})}
                            className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm font-medium" placeholder="최소 6자" />
                          <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-widest">권한</label>
                        <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as any})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm font-medium">
                          <option value="user">일반 사용자</option>
                          <option value="editor">에디터</option>
                          <option value="admin">관리자</option>
                        </select>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50 transition-colors">취소</button>
                        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-700 transition-colors shadow-md">추가하기</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 사용자 테이블 */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-slate-600">
                    <thead className="text-[10px] uppercase tracking-widest bg-slate-50 text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-5 py-3 text-left">사용자</th>
                        <th className="px-5 py-3 text-left">이메일</th>
                        <th className="px-5 py-3 text-left">권한</th>
                        <th className="px-5 py-3 text-left">상태</th>
                        <th className="px-5 py-3 text-left">로그인</th>
                        <th className="px-5 py-3 text-right">관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-5 py-4">
                            {editingUser?.id === u.id ? (
                              <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                                className="px-2 py-1 rounded-lg border border-slate-300 text-sm font-bold w-32 focus:outline-none focus:ring-1 focus:ring-slate-400" />
                            ) : (
                              <span className="font-bold text-slate-800">{u.name}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500">{u.email}</td>
                          <td className="px-5 py-4">
                            {editingUser?.id === u.id ? (
                              <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})}
                                className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-slate-400">
                                <option value="user">user</option>
                                <option value="editor">editor</option>
                                <option value="admin">admin</option>
                              </select>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${roleBadge[u.role]}`}>{u.role}</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {editingUser?.id === u.id ? (
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editingUser.is_blocked} onChange={e => setEditingUser({...editingUser, is_blocked: e.target.checked})} className="rounded" />
                                <span className="text-xs font-bold text-slate-500">차단</span>
                              </label>
                            ) : (
                              u.is_blocked
                                ? <span className="text-xs font-bold text-rose-500">차단됨</span>
                                : <span className="text-xs font-bold text-emerald-500">정상</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-400">{u.login_count}회</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              {editingUser?.id === u.id ? (
                                <>
                                  <button onClick={handleSaveUser} className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"><Save size={13} /></button>
                                  <button onClick={() => setEditingUser(null)} className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"><X size={13} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => setEditingUser(u)} className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"><Edit2 size={13} /></button>
                                  <button onClick={() => toggleBlock(u)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-colors ${u.is_blocked ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-amber-100 text-amber-600 hover:bg-amber-200'}`}>
                                    {u.is_blocked ? '해제' : '차단'}
                                  </button>
                                  <button onClick={() => handleDeleteUser(u)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"><Trash2 size={13} /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {users.length === 0 && <div className="py-16 text-center text-slate-400 font-bold">등록된 사용자가 없습니다.</div>}
                </div>
              </div>
            </div>
          )}

          {/* ── 게시글 관리 탭 ──────────────────────────────── */}
          {activeTab === 'posts' && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-600">
                  <thead className="text-[10px] uppercase tracking-widest bg-slate-50 text-slate-400 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 text-left">제목</th>
                      <th className="px-5 py-3 text-left">작성자</th>
                      <th className="px-5 py-3 text-left">카테고리</th>
                      <th className="px-5 py-3 text-left">반응</th>
                      <th className="px-5 py-3 text-left">작성일</th>
                      <th className="px-5 py-3 text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-bold text-slate-800 max-w-xs"><p className="truncate">{p.title}</p></td>
                        <td className="px-5 py-4 text-xs text-slate-500">{p.author_name || '-'}</td>
                        <td className="px-5 py-4"><span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black uppercase">{p.category}</span></td>
                        <td className="px-5 py-4 text-xs"><span className="text-blue-500">👍 {p.likes_count || 0}</span> / <span className="text-rose-400">👎 {p.dislikes_count || 0}</span></td>
                        <td className="px-5 py-4 text-xs text-slate-400">{new Date(p.created_at).toLocaleDateString('ko-KR')}</td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => handleDeletePost(p.id)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {posts.length === 0 && <div className="py-16 text-center text-slate-400 font-bold">등록된 게시글이 없습니다.</div>}
              </div>
            </div>
          )}

          {/* ── 미디어 관리 탭 ──────────────────────────────── */}
          {activeTab === 'media' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black text-slate-800">미디어 목록 ({media.length}개)</h2>
                <button onClick={() => { setEditMedia(null); setMediaForm({ title: '', type: 'youtube', url: '', description: '', artist: '', is_featured: false, is_active: true }); setShowMediaForm(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all shadow-lg">
                  <Plus size={14} /> 미디어 추가
                </button>
              </div>

              {/* 미디어 추가/수정 모달 */}
              {showMediaForm && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-6 border-b border-slate-100">
                      <h3 className="text-lg font-black text-slate-800">{editMedia ? '미디어 수정' : '새 미디어 추가'}</h3>
                      <button onClick={() => { setShowMediaForm(false); setEditMedia(null); }} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
                    </div>
                    <form onSubmit={handleSaveMedia} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                      {/* 타입 선택 */}
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">미디어 타입</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['youtube', 'podcast', 'music'] as const).map(t => (
                            <button key={t} type="button" onClick={() => setMediaForm({...mediaForm, type: t})}
                              className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black border-2 transition-all
                                ${mediaForm.type === t ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200 text-slate-500 hover:border-slate-400'}`}>
                              <MediaIcon type={t} /> {t}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 제목 */}
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-widest">제목</label>
                        <input required value={mediaForm.title} onChange={e => setMediaForm({...mediaForm, title: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm" placeholder="미디어 제목" />
                      </div>
                      {/* URL */}
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-widest">URL</label>
                        <input required value={mediaForm.url} onChange={e => setMediaForm({...mediaForm, url: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm" placeholder="https://www.youtube.com/watch?v=..." />
                      </div>
                      {/* 아티스트/채널 */}
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-widest">아티스트 / 채널명</label>
                        <input value={mediaForm.artist} onChange={e => setMediaForm({...mediaForm, artist: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm" placeholder="채널 또는 아티스트명" />
                      </div>
                      {/* 설명 */}
                      <div>
                        <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-widest">설명</label>
                        <textarea rows={3} value={mediaForm.description} onChange={e => setMediaForm({...mediaForm, description: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500/30 text-sm resize-none" placeholder="미디어에 대한 간략한 설명" />
                      </div>
                      {/* 토글 옵션 */}
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={mediaForm.is_active} onChange={e => setMediaForm({...mediaForm, is_active: e.target.checked})} className="rounded w-4 h-4 accent-slate-800" />
                          <span className="text-xs font-bold text-slate-600">활성화</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={mediaForm.is_featured} onChange={e => setMediaForm({...mediaForm, is_featured: e.target.checked})} className="rounded w-4 h-4 accent-amber-500" />
                          <span className="text-xs font-bold text-slate-600">추천 미디어</span>
                        </label>
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => { setShowMediaForm(false); setEditMedia(null); }} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-black text-xs hover:bg-slate-50">취소</button>
                        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs hover:bg-slate-700 shadow-md flex items-center justify-center gap-2">
                          <Save size={14} /> {editMedia ? '저장' : '추가'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* 미디어 카드 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {media.map(m => (
                  <div key={m.id} className={`bg-white rounded-2xl border shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 ${!m.is_active ? 'opacity-60' : 'border-slate-100'}`}>
                    {/* 썸네일 */}
                    <div className="relative h-40 bg-slate-100 overflow-hidden">
                      <img src={m.thumbnail || `https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=480`} alt={m.title}
                        className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      {/* 타입 배지 */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                        <MediaIcon type={m.type} />
                        <span className="text-white text-[10px] font-black uppercase">{m.type}</span>
                      </div>
                      {/* 추천 배지 */}
                      {m.is_featured && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-amber-400 rounded-full">
                          <Star size={10} className="text-white fill-white" />
                          <span className="text-white text-[9px] font-black">추천</span>
                        </div>
                      )}
                      {/* 재생 횟수 */}
                      <div className="absolute bottom-3 right-3 text-white text-[10px] font-black bg-black/40 px-2 py-1 rounded-full">
                        ▶ {m.play_count}회
                      </div>
                    </div>
                    {/* 콘텐츠 */}
                    <div className="p-4">
                      <h3 className="font-black text-slate-800 text-sm leading-snug line-clamp-1 mb-1">{m.title}</h3>
                      {m.artist && <p className="text-[11px] text-slate-400 font-bold mb-2">{m.artist}</p>}
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{m.description || '설명 없음'}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${m.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {m.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                        <div className="flex gap-1.5">
                          <a href={m.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="원본链接 열기">
                            <Eye size={13} />
                          </a>
                          <button onClick={() => openEditMedia(m)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-500 transition-colors">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDeleteMedia(m.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {media.length === 0 && (
                  <div className="col-span-3 py-20 text-center text-slate-400 font-bold">
                    <Music size={40} className="mx-auto mb-4 opacity-30" />
                    등록된 미디어가 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
