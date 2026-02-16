import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Loader2, ShieldAlert, Users, FileText, Activity, Trash2, Megaphone, Check } from 'lucide-react';

interface Log {
  id: string;
  email: string;
  activity: string;
  timestamp: string;
}

interface User {
    email: string;
    joinedAt: string;
    isAdmin: boolean;
}

interface Post {
    id: string;
    title: string;
    author: string;
    isNotice?: boolean;
    timestamp: string;
}

export function AdminPanel() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'logs' | 'users' | 'content'>('logs');
  
  const [logs, setLogs] = useState<Log[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch Logic
  const fetchLogs = () => fetch('http://localhost:8787/api/admin/logs').then(res => res.json()).then(setLogs);
  const fetchUsers = () => fetch('http://localhost:8787/api/admin/users').then(res => res.json()).then(setUsersList);
  const fetchPosts = () => fetch('http://localhost:8787/api/posts').then(res => res.json()).then(setPosts);

  useEffect(() => {
    if (!user?.isAdmin) return;
    setLoading(true);
    
    // Initial fetch based on tab
    const load = async () => {
        if (tab === 'logs') await fetchLogs();
        if (tab === 'users') await fetchUsers();
        if (tab === 'content') await fetchPosts();
        setLoading(false);
    };
    load();

    const interval = setInterval(load, 2000); // Auto-refresh every 2s
    return () => clearInterval(interval);
  }, [user, tab]);

  // Actions
  const handleBanUser = async (email: string) => {
      if (!confirm(`Ban user ${email}?`)) return;
      await fetch('http://localhost:8787/api/admin/users', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
      });
      fetchUsers();
  };

  const handleDeletePost = async (id: string) => {
      if (!confirm('Delete this post?')) return;
      await fetch(`http://localhost:8787/api/posts/${id}`, { method: 'DELETE' });
      fetchPosts();
  };

  const handleToggleNotice = async (id: string, current: boolean) => {
      await fetch(`http://localhost:8787/api/posts/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isNotice: !current })
      });
      fetchPosts();
  };

  if (!user?.isAdmin) return <div className="text-red-500">Access Denied</div>;

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl border-[0.5px] border-stone-200 shadow-xl overflow-hidden min-h-[500px] flex flex-col">
      <div className="bg-stone-900 px-6 py-4 border-b border-stone-800 flex justify-between items-center">
        <h2 className="text-lg font-mono text-green-400 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          ADMIN_CONSOLE_V1
        </h2>
        <div className="flex bg-stone-800 rounded-lg p-1">
            <button onClick={() => setTab('logs')} className={`px-3 py-1 text-xs font-mono rounded ${tab === 'logs' ? 'bg-stone-700 text-white' : 'text-stone-400'}`}>LOGS</button>
            <button onClick={() => setTab('users')} className={`px-3 py-1 text-xs font-mono rounded ${tab === 'users' ? 'bg-stone-700 text-white' : 'text-stone-400'}`}>USERS</button>
            <button onClick={() => setTab('content')} className={`px-3 py-1 text-xs font-mono rounded ${tab === 'content' ? 'bg-stone-700 text-white' : 'text-stone-400'}`}>CONTENT</button>
        </div>
      </div>

      <div className="p-0 flex-1 overflow-auto bg-stone-50 font-mono text-sm relative">
        {loading && logs.length === 0 && usersList.length === 0 && posts.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                <Loader2 className="animate-spin" />
            </div>
        )}

        {/* LOGS TAB */}
        {tab === 'logs' && (
            <table className="w-full text-left">
            <thead className="bg-stone-100 text-stone-500 text-xs uppercase sticky top-0">
                <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Activity</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white">
                {logs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50 transition-colors animate-in fade-in slide-in-from-left-4 duration-300">
                    <td className="px-6 py-3 text-stone-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-3 text-primary-800 font-medium">{log.email}</td>
                    <td className="px-6 py-3 text-stone-600">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.activity.includes('Login') ? 'bg-blue-100 text-blue-800' :
                        log.activity.includes('Alert') ? 'bg-red-100 text-red-800' :
                        'bg-stone-100 text-stone-800'
                    }`}>
                        {log.activity}
                    </span>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
             <table className="w-full text-left">
             <thead className="bg-stone-100 text-stone-500 text-xs uppercase sticky top-0">
                 <tr>
                 <th className="px-6 py-3 font-medium">Email</th>
                 <th className="px-6 py-3 font-medium">Joined</th>
                 <th className="px-6 py-3 font-medium">Role</th>
                 <th className="px-6 py-3 font-medium">Actions</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-stone-200 bg-white">
                 {usersList.map((u) => (
                 <tr key={u.email} className="hover:bg-stone-50">
                     <td className="px-6 py-3 text-primary-800 font-medium">{u.email}</td>
                     <td className="px-6 py-3 text-stone-400">{new Date(u.joinedAt).toLocaleDateString()}</td>
                     <td className="px-6 py-3">
                        {u.isAdmin ? <span className="text-purple-600 font-bold">ADMIN</span> : 'USER'}
                     </td>
                     <td className="px-6 py-3">
                         {!u.isAdmin && (
                             <button onClick={() => handleBanUser(u.email)} className="text-red-500 hover:text-red-700 text-xs underline">
                                 BAN
                             </button>
                         )}
                     </td>
                 </tr>
                 ))}
             </tbody>
             </table>
        )}

        {/* CONTENT TAB */}
        {tab === 'content' && (
             <table className="w-full text-left">
             <thead className="bg-stone-100 text-stone-500 text-xs uppercase sticky top-0">
                 <tr>
                 <th className="px-6 py-3 font-medium">Title</th>
                 <th className="px-6 py-3 font-medium">Author</th>
                 <th className="px-6 py-3 font-medium">Status</th>
                 <th className="px-6 py-3 font-medium">Actions</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-stone-200 bg-white">
                 {posts.map((p) => (
                 <tr key={p.id} className="hover:bg-stone-50">
                     <td className="px-6 py-3 text-primary-800 font-medium truncate max-w-[200px]">{p.title}</td>
                     <td className="px-6 py-3 text-stone-500">{p.author}</td>
                     <td className="px-6 py-3">
                        {p.isNotice && <span className="bg-accent-100 text-accent-700 px-2 py-0.5 rounded text-xs font-bold">NOTICE</span>}
                     </td>
                     <td className="px-6 py-3 flex gap-2">
                         <button 
                            onClick={() => handleToggleNotice(p.id, p.isNotice || false)} 
                            className="text-stone-500 hover:text-accent-600"
                            title="Toggle Notice"
                         >
                            <Megaphone className="w-4 h-4" />
                         </button>
                         <button 
                            onClick={() => handleDeletePost(p.id)} 
                            className="text-stone-500 hover:text-red-600"
                            title="Delete Post"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                     </td>
                 </tr>
                 ))}
             </tbody>
             </table>
        )}

      </div>
    </div>
  );
}
