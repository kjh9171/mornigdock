import { useState, useEffect } from 'react';
import { Shield, Users, Server, Activity, Database } from 'lucide-react';
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

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!isAuthenticated || user?.role !== 'admin') return;
      try {
        const res = await api.get('/admin/dashboard');
        if (res.data.success) {
          setStats(res.data.data.stats);
          setLogs(res.data.data.recentLogs || []);
        }
      } catch (err) {
        console.error('Failed to fetch admin dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [isAuthenticated, user]);

  if (!isAuthenticated || user?.role !== 'admin') {
    return <div className="p-8 text-center text-rose-500 font-bold">관리자 권한이 필요합니다.</div>;
  }

  const metrics = [
    { id: 1, label: '활성 사용자 (명)', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-500 bg-blue-50' },
    { id: 2, label: '뉴스 스크랩 건수', value: stats?.totalNews || 0, icon: Database, color: 'text-emerald-500 bg-emerald-50' },
    { id: 3, label: '게시물/댓글 수', value: stats?.totalComments || 0, icon: Activity, color: 'text-amber-500 bg-amber-50' },
    { id: 4, label: '큐레이션 미디어', value: stats?.totalMedia || 0, icon: Shield, color: 'text-rose-500 bg-rose-50' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto animate-in slide-in-from-bottom-5 duration-700">
      
      <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
        <div className="flex items-center gap-4">
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
           {['사용자 관리', '게시물 관리', '미디어 관리'].map((label) => (
            <button key={label} onClick={() => alert('세부 관리 기능은 추후 확장 팩에서 제공됩니다.')} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-black text-xs uppercase cursor-pointer">
              {label}
            </button>
           ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
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
                  <p key={i}><span className="text-slate-500">[{new Date(log.created_at).toISOString().replace('T', ' ').slice(0,19)}]</span> <span className="text-blue-400">INFO</span> - IP: {log.ip_address} | Endpoint: {log.endpoint} {log.user_name ? `| User: ${log.user_name}` : ''}</p>
                )) : (
                   <p><span className="text-slate-500">[{new Date().toISOString().replace('T', ' ').slice(0,19)}]</span> <span className="text-emerald-400">INFO</span> - System initialized successfully. Awaiting logs.</p>
                )}
                <p className="mt-4"><span className="animate-pulse inline-block w-2.5 h-4 bg-emerald-400"></span></p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
