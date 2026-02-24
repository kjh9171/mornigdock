import { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Clock, Search, Send, Plus, X } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

interface Post {
  id: number;
  category: string;
  title: string;
  content: string;
  author_name: string;
  likes_count: number;
  dislikes_count: number;
  comment_count: number;
  created_at: string;
  is_pinned?: boolean;
}

export default function Board() {
  const { isAuthenticated } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 모달 상태
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/posts', { params: { search: searchQuery } });
      if (res.data.success && res.data.posts) {
        setPosts(res.data.posts);
      }
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [searchQuery]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    try {
      const res = await api.post('/posts', { title: newTitle, content: newContent, category: 'general' });
      if (res.data.success) {
        setIsWriteModalOpen(false);
        setNewTitle('');
        setNewContent('');
        fetchPosts();
      }
    } catch (err) {
      console.error('글 작성 실패', err);
      alert('글 작성에 실패했습니다.');
    }
  };

  const handleReaction = async (id: number, reaction: 'like' | 'dislike') => {
    if (!isAuthenticated) return alert('로그인이 필요합니다.');
    try {
      await api.post(`/posts/${id}/reaction`, { reaction });
      fetchPosts();
    } catch (err) {
      console.error('반응 실패', err);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in duration-500 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">아고라 광장</h1>
          <p className="text-sm font-bold text-slate-400 tracking-wider">요원들 간의 자유로운 의견과 지식 공유 공간</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="게시글 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-bold text-slate-700 transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => {
              if(!isAuthenticated) return alert('로그인이 필요합니다.');
              setIsWriteModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all shrink-0"
          >
            <Plus size={16} /> 새 글 작성
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-md shadow-slate-200/50 hover:shadow-xl transition-all duration-300">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-black text-xs shadow-inner">
                    {post.author_name?.[0]?.toUpperCase() || 'A'}
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-800">{post.author_name || '익명'}</span>
                    <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(post.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                {post.is_pinned && <div className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-md text-[10px] font-black uppercase tracking-widest">필독 공지</div>}
              </div>

              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2 leading-snug">{post.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed font-medium mb-5 whitespace-pre-wrap">{post.content}</p>

              <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => handleReaction(post.id, 'like')} className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors text-xs font-black">
                    <ThumbsUp size={14} /> {post.likes_count || 0}
                  </button>
                  <button onClick={() => handleReaction(post.id, 'dislike')} className="flex items-center gap-1.5 text-slate-400 hover:text-rose-600 transition-colors text-xs font-black">
                    <ThumbsDown size={14} /> {post.dislikes_count || 0}
                  </button>
                </div>
                <button className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-600 transition-colors text-xs font-black uppercase tracking-widest">
                  <MessageSquare size={14} /> 댓글 {post.comment_count || 0}
                </button>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="text-center py-20 text-slate-400 font-bold">
              등록된 게시글이 없습니다.
            </div>
          )}
        </div>
      )}

      {/* 글작성 모달 */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">새 글 작성</h2>
              <button onClick={() => setIsWriteModalOpen(false)} className="text-slate-400 hover:text-slate-800 p-2 rounded-full hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreatePost} className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">제목</label>
                <input 
                  type="text" required value={newTitle} onChange={(e)=>setNewTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all font-bold"
                  placeholder="제목을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">내용</label>
                <textarea 
                  required value={newContent} onChange={(e)=>setNewContent(e.target.value)} rows={6}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white transition-all resize-none font-medium text-sm leading-relaxed"
                  placeholder="자유롭게 의견을 나누어주세요."
                />
              </div>
              <div className="flex justify-end pt-4">
                <button type="submit" className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5">
                  <Send size={16} /> 게시물 등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
