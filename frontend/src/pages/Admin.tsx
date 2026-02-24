import { useState, useEffect } from 'react';
import { Shield, Users, Server, Activity, Database, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

interface SystemStats {
  totalUsers: number;
  totalNews: number;
  totalComments: number;
  totalMedia: number;
  pendingInquiries: number;
}

export default function Admin() {
  const { user, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'dashboard'|'users'|'posts'|'media'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);

  const fetchDashboard = async () => {
    if (!isAuthenticated || user?.role !== 'admin') return;
    try {
      setLoading(true);
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
      console.error('Failed to fetch admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [isAuthenticated, user, activeTab]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <div className="p-8 text-center text-rose-500 font-bold">관리자 권한이 필요합니다.</div>;
  }

  const metrics = [
    { id: 1, label: '활성 사용자 (명)', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500 bg-blue-50' },
    { id: 2, label: '뉴스 스크랩 건수', value: stats?.totalNews || 0, icon: Database, color: 'text-emerald-500 bg-emerald-50' },
    { id: 3, label: '게시물/댓글 수', value: stats?.totalComments || 0, icon: Activity, color: 'text-amber-500 bg-amber-50' },
    { id: 4, label: '큐레이션 미디어', value: stats?.totalMedia || 0, icon: Shield, color: 'text-rose-500 bg-rose-50' },
  ];

  const toggleBlockUser = async (id: number, blocked: boolean) => {
    if(!confirm(`정말 이 사용자를 ${blocked ? '차단' : '차단 해제'}하시겠습니까?`)) return;
    try {
      const res = await api.put(`/admin/users/${id}/block`, { blocked });
      if(res.data.success) fetchDashboard();
      else alert(res.data.message);
    } catch(err) {
      console.error(err);
    }
  };

  const deleteMedia = async (id: number) => {
    if(!confirm('정말 이 미디어를 삭제하시겠습니까?')) return;
    try {
      const res = await api.delete(`/admin/media/${id}`);
      if(res.data.success) fetchDashboard();
    } catch(err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">
      
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-slate-900/30 shrink-0">
            <Server className="text-white w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter">통합 관제 센터</h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-[0.3em]">
              System Operations & Security Control
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
           <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2.5 rounded-xl transition-colors shadow-sm font-black text-xs uppercase ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>요약 현황</button>
           <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 rounded-xl transition-colors shadow-sm font-black text-xs uppercase ${activeTab === 'users' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>사용자 관리</button>
           <button onClick={() => setActiveTab('posts')} className={`px-5 py-2.5 rounded-xl transition-colors shadow-sm font-black text-xs uppercase ${activeTab === 'posts' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>게시글 관리</button>
           <button onClick={() => setActiveTab('media')} className={`px-5 py-2.5 rounded-xl transition-colors shadow-sm font-black text-xs uppercase ${activeTab === 'media' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>미디어 관리</button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activeTab === 'dashboard' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {metrics.map((metric) => (
              <div key={metric.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex items-center gap-5 hover:-translate-y-1 transition-transform duration-300">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${metric.color}`}>
                  <metric.icon size={24} />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{metric.label}</p>
                  <h3 className="text-3xl font-black text-slate-800">{metric.value.toLocaleString()}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
            
            <div className="relative z-10 w-full">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">system_log_stream.sh</span>
              </div>
              
              <div className="font-mono text-xs md:text-sm leading-8 text-emerald-400 tracking-tight max-h-64 overflow-y-auto">
                {logs.length > 0 ? logs.map((log: any, i) => (
                  <p key={i}><span className="text-slate-500">[{new Date(log.created_at).toISOString().replace('T', ' ').slice(0,19)}]</span> <span className="text-blue-400">INFO</span> - IP: {log.ip_address} | {log.endpoint} {log.user_name ? `| User: ${log.user_name}` : ''}</p>
                )) : (
                   <p><span className="text-slate-500">[{new Date().toISOString().replace('T', ' ').slice(0,19)}]</span> <span className="text-emerald-400">INFO</span> - System initialized successfully. Awaiting logs.</p>
                )}
                <p className="mt-4"><span className="animate-pulse inline-block w-2.5 h-4 bg-emerald-400"></span></p>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-xl">
          {activeTab === 'users' && (
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-medium text-slate-600">
                  <thead className="text-xs uppercase bg-slate-50 text-slate-400">
                    <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-4 font-bold text-slate-800">{u.name}</td>
                        <td className="px-4 py-4">{u.email}</td>
                        <td className="px-4 py-4"><span className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 text-xs uppercase font-black">{u.role}</span></td>
                        <td className="px-4 py-4">{u.is_blocked ? <span className="text-rose-500 font-bold">차단됨</span> : <span className="text-emerald-500 font-bold">정상</span>}</td>
                        <td className="px-4 py-4 text-right">
                          <button onClick={() => toggleBlockUser(u.id, !u.is_blocked)} className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-colors ${u.is_blocked ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-rose-500 text-white hover:bg-rose-600'}`}>
                            {u.is_blocked ? '차단 해제' : '차단 여부'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}
          {activeTab === 'posts' && (
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-medium text-slate-600">
                  <thead className="text-xs uppercase bg-slate-50 text-slate-400">
                    <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Likes</th><th className="px-4 py-3">Created At</th></tr>
                  </thead>
                  <tbody>
                    {posts.map(p => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-4 font-bold text-slate-800 line-clamp-1">{p.title}</td>
                        <td className="px-4 py-4"><span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs uppercase font-black">{p.category}</span></td>
                        <td className="px-4 py-4 flex items-center gap-1"><span className="text-blue-500">{p.likes_count}</span> / <span className="text-rose-400">{p.dislikes_count}</span></td>
                        <td className="px-4 py-4">{new Date(p.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}
          {activeTab === 'media' && (
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-medium text-slate-600">
                  <thead className="text-xs uppercase bg-slate-50 text-slate-400">
                    <tr><th className="px-4 py-3">Type</th><th className="px-4 py-3">Title</th><th className="px-4 py-3 text-right">Action</th></tr>
                  </thead>
                  <tbody>
                    {media.map(m => (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-4 uppercase font-black text-xs">{m.type}</td>
                        <td className="px-4 py-4 font-bold text-slate-800">{m.title}</td>
                        <td className="px-4 py-4 text-right">
                          <button onClick={() => deleteMedia(m.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
