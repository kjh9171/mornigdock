import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useActivityLog } from '../utils/activityLogger';
import { getAdminStatsAPI, getAdminUsersAPI, getAdminPostsAPI, adminDeletePostAPI, createPostAPI, Post } from '../lib/api';
import { Loader2, ShieldAlert, Users, FileText, Activity, Trash2, Megaphone, PlusCircle, Filter, Bot, MessageSquare } from 'lucide-react';

export function AdminPanel() {
  const { user } = useAuthStore();
  const { logActivity } = useActivityLog();
  const [tab, setTab] = useState<'logs' | 'users' | 'content'>('content');
  const [filterType, setFilterType] = useState<string>('all');
  
  const [stats, setStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States for creating new content
  const [isCreating, setIsCreating] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'news', category: '산업' });

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'content') {
        const res = await getAdminPostsAPI();
        if (res.success) setPosts(res.posts);
      } else if (tab === 'users') {
        const res = await getAdminUsersAPI();
        if (res.success) setUsersList(res.users);
      }
      const statsRes = await getAdminStatsAPI();
      if (statsRes.success) setStats(statsRes.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user?.role?.includes('admin')) return;
    loadData();
    const interval = setInterval(loadData, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, [user, tab]);

  const handleDeletePost = async (id: number) => {
    if (!confirm('정말 이 지능물을 영구 삭제하시겠습니까?')) return;
    const res = await adminDeletePostAPI(id);
    if (res.success) {
      logActivity(`ADMIN: Delete Post ${id}`);
      loadData();
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createPostAPI(newPost);
    if (res.success) {
      logActivity(`ADMIN: Create ${newPost.type} - ${newPost.title}`);
      setIsCreating(false);
      setNewPost({ title: '', content: '', type: 'news', category: '산업' });
      loadData();
    }
  };

  if (!user?.role?.includes('admin')) return <div className="p-20 text-center text-red-500 font-bold">비정상적인 접근이 감지되었습니다. 사령부에 보고됩니다.</div>;

  const filteredPosts = filterType === 'all' ? posts : posts.filter(p => p.type === filterType);

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl border-[0.5px] border-stone-200 shadow-2xl overflow-hidden min-h-[600px] flex flex-col font-sans">
      {/* Header */}
      <div className="bg-stone-900 px-8 py-5 border-b border-stone-800 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-accent-500 animate-pulse" />
          <h2 className="text-xl font-bold text-white tracking-tighter">
            HQ STRATEGIC CONSOLE <span className="text-stone-500 text-xs font-mono ml-2">v2.1.0-STABLE</span>
          </h2>
        </div>
        
        <div className="flex bg-stone-800 rounded-xl p-1.5 gap-1">
            <button onClick={() => setTab('users')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'users' ? 'bg-accent-600 text-white' : 'text-stone-400 hover:text-stone-200'}`}>요원 관리</button>
            <button onClick={() => setTab('content')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === 'content' ? 'bg-accent-600 text-white' : 'text-stone-400 hover:text-stone-200'}`}>지능 자산</button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-stone-50 border-b border-stone-200 px-8 py-3 flex gap-8 text-[10px] font-bold text-stone-500 uppercase tracking-widest">
        <div className="flex items-center gap-2"><Users className="w-3 h-3" /> 활성 요원: <span className="text-primary-800">{stats?.users || 0}</span></div>
        <div className="flex items-center gap-2"><FileText className="w-3 h-3" /> 총 지능물: <span className="text-primary-800">{stats?.posts || 0}</span></div>
        <div className="flex items-center gap-2"><Activity className="w-3 h-3" /> 시스템 상태: <span className="text-green-500">OPERATIONAL</span></div>
      </div>

      <div className="p-0 flex-1 overflow-auto bg-white relative">
        {loading && <div className="absolute top-0 left-0 w-full h-1 bg-accent-600 animate-progress"></div>}

        {/* CONTENT MANAGEMENT */}
        {tab === 'content' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-stone-100 border-none rounded-xl text-xs font-bold text-stone-600 focus:ring-2 focus:ring-accent-600 outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">모든 자산</option>
                    <option value="news">뉴스 (Intel)</option>
                    <option value="discussion">아고라 토론</option>
                    <option value="board">자유 게시판</option>
                  </select>
                </div>
              </div>
              
              <button 
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-xl text-xs font-bold hover:bg-stone-900 transition-all shadow-lg"
              >
                <PlusCircle className="w-4 h-4" />
                지능물 직접 배포
              </button>
            </div>

            {isCreating && (
              <div className="mb-8 p-6 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200">
                <form onSubmit={handleCreatePost} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      type="text" placeholder="지능물 제목" required
                      value={newPost.title} onChange={e => setNewPost({...newPost, title: e.target.value})}
                      className="p-3 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent-600"
                    />
                    <div className="flex gap-2">
                      <select 
                        value={newPost.type} onChange={e => setNewPost({...newPost, type: e.target.value})}
                        className="flex-1 p-3 bg-white border border-stone-200 rounded-xl text-sm outline-none"
                      >
                        <option value="news">뉴스 분석 (Intel)</option>
                        <option value="discussion">아고라 토론</option>
                      </select>
                      <input 
                        type="text" placeholder="카테고리"
                        value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}
                        className="flex-1 p-3 bg-white border border-stone-200 rounded-xl text-sm outline-none"
                      />
                    </div>
                  </div>
                  <textarea 
                    placeholder="지능물 상세 내용 (기밀 유출 금지)" required rows={5}
                    value={newPost.content} onChange={e => setNewPost({...newPost, content: e.target.value})}
                    className="w-full p-4 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-accent-600 resize-none"
                  />
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2 text-stone-500 font-bold text-xs">취소</button>
                    <button type="submit" className="px-8 py-2 bg-accent-600 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-accent-700">배포 승인</button>
                  </div>
                </form>
              </div>
            )}

            <table className="w-full text-left">
              <thead className="bg-stone-100/50 text-stone-500 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-bold">Asset ID / Title</th>
                    <th className="px-6 py-4 font-bold">Type</th>
                    <th className="px-6 py-4 font-bold">Analyst</th>
                    <th className="px-6 py-4 font-bold">Metrics</th>
                    <th className="px-6 py-4 font-bold text-right">Control</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                  {filteredPosts.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors group">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-stone-400 mb-1">#{p.id}</span>
                          <span className="text-sm font-bold text-primary-900 group-hover:text-accent-600 transition-colors truncate max-w-[250px]">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.type === 'news' ? 'bg-red-50 text-red-600' :
                          p.type === 'discussion' ? 'bg-blue-50 text-blue-600' :
                          'bg-stone-100 text-stone-600'
                        }`}>
                          {p.type === 'news' ? <Bot className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                          {p.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs text-stone-600 font-medium">{p.author_name}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex gap-3 text-[10px] text-stone-400">
                          <span>V: {p.view_count}</span>
                          <span>C: {p.comment_count || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => handleDeletePost(p.id)} 
                            className="p-2 text-stone-300 hover:text-red-600 transition-colors"
                            title="Purge Asset"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                      </td>
                  </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* USERS MANAGEMENT */}
        {tab === 'users' && (
          <div className="p-6">
             <table className="w-full text-left">
             <thead className="bg-stone-100/50 text-stone-500 text-[10px] uppercase tracking-wider">
                 <tr>
                 <th className="px-6 py-4 font-bold">Agent Info</th>
                 <th className="px-6 py-4 font-bold">Deployment Date</th>
                 <th className="px-6 py-4 font-bold">Clearance</th>
                 <th className="px-6 py-4 font-bold text-right">Actions</th>
                 </tr>
             </thead>
             <tbody className="divide-y divide-stone-100">
                 {usersList.map((u) => (
                 <tr key={u.id} className="hover:bg-stone-50">
                     <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-primary-900">{u.username}</span>
                          <span className="text-xs text-stone-400">{u.email}</span>
                        </div>
                     </td>
                     <td className="px-6 py-5 text-xs text-stone-500">{new Date(u.created_at).toLocaleDateString()}</td>
                     <td className="px-6 py-5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-stone-100 text-stone-600'}`}>
                          {u.role.toUpperCase()}
                        </span>
                     </td>
                     <td className="px-6 py-5 text-right">
                         {u.role !== 'admin' && (
                             <button className="text-red-500 hover:underline text-xs font-bold">제명</button>
                         )}
                     </td>
                 </tr>
                 ))}
             </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
}
