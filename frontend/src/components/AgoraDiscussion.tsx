import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useActivityLog } from '../utils/activityLogger';
import { useDiscussionStore } from '../store/useDiscussionStore';
import { getPostsAPI, getPostAPI, createPostAPI, addCommentAPI, Post, Comment } from '../lib/api';
import { Loader2, MessageSquare, PenSquare, ArrowLeft, Send, User, Clock, Link as LinkIcon } from 'lucide-react';

export function AgoraDiscussion() {
  const { user } = useAuthStore();
  const { logActivity } = useActivityLog();
  const { view: storeView, setView: setStoreView, draft, setDraft } = useDiscussionStore();
  
  const [view, setView] = useState<'list' | 'detail' | 'write'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  // Form States
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [commentText, setCommentText] = useState('');

  // Sync with Store for "Draft Mode"
  useEffect(() => {
    if (storeView === 'write' && draft) {
      setView('write');
      setTitle(draft.title);
      setContent(draft.content);
    }
  }, [storeView, draft]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      // 🔥 [타입 표준화] 모든 사용자 게시글은 'board' 타입으로 통합 관리
      const res = await getPostsAPI({ type: 'board', limit: 20 });
      if (res.success) setPosts(res.posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'list') fetchPosts();
  }, [view]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // @ts-ignore - related_post_id passed via draft
      const relatedId = (draft as any)?.related_post_id;
      
      const res = await createPostAPI({ 
        title, 
        content, 
        type: 'board', // 🔥 'discussion' 대신 'board'로 표준화
        category: '자유',
        related_post_id: relatedId 
      });
      
      if (res.success) {
        logActivity(`Create Agora Post: ${title}`);
        setTitle('');
        setContent('');
        setView('list');
        setDraft(null);
        setStoreView('list');
        fetchPosts(); // 리스트 갱신
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostClick = async (post: Post) => {
    setSelectedPost(post);
    setView('detail');
    logActivity(`Read Agora Post: ${post.id}`);
    
    try {
      const res = await getPostAPI(post.id);
      if (res.success) {
        setSelectedPost(res.post);
        setComments(res.comments);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !user || !commentText.trim()) return;

    try {
      const res = await addCommentAPI(selectedPost.id, commentText);
      if (res.success) {
        setComments(prev => [...prev, res.comment]);
        setCommentText('');
        logActivity(`Comment on Agora Post: ${selectedPost.id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-full min-h-[600px] animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8 px-2">
        <div>
          <h2 className="text-2xl font-black text-primary-800 flex items-center gap-3 uppercase tracking-tighter">
            <MessageSquare className="w-7 h-7 text-accent-600" />
            Agora Discussion
          </h2>
          <p className="text-sm text-stone-400 font-bold mt-1 uppercase tracking-widest">Public Intelligence Sharing Forum</p>
        </div>
        {view === 'list' && (
          <button 
            onClick={() => setView('write')}
            className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
          >
            <PenSquare className="w-4 h-4" />
            New Post
          </button>
        )}
        {view !== 'list' && (
          <button 
            onClick={() => {
              setView('list');
              setDraft(null);
              setStoreView('list');
            }}
            className="flex items-center gap-2 px-6 py-3 bg-white text-stone-600 border-2 border-stone-100 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-stone-50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Archive
          </button>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden min-h-[500px]">
        {/* List View */}
        {view === 'list' && (
          <div className="divide-y divide-stone-50">
            {loading ? (
              <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 animate-spin text-accent-600" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center p-32">
                <MessageSquare className="w-16 h-16 text-stone-100 mx-auto mb-4" />
                <p className="text-stone-400 font-black uppercase tracking-widest">No Active Intelligence Discussions</p>
              </div>
            ) : (
              posts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => handlePostClick(post)}
                  className="p-8 hover:bg-stone-50/50 transition-all cursor-pointer group flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-500 text-[10px] font-black rounded uppercase tracking-tighter">
                        {post.category || '자유'}
                      </span>
                      {post.related_post_id && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-accent-600 bg-accent-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                          <LinkIcon className="w-3 h-3" /> INTEL_LINKED
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-xl text-primary-900 group-hover:text-accent-600 transition-colors leading-tight mb-3 truncate">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{post.author_name}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(post.created_at).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5 text-accent-600"><MessageSquare className="w-3.5 h-3.5" />{post.comment_count || 0} Comments</span>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-stone-200 group-hover:text-accent-600 group-hover:translate-x-1 transition-all ml-8" />
                </div>
              ))
            )}
          </div>
        )}

        {/* Write View */}
        {view === 'write' && (
          <form onSubmit={handleCreatePost} className="p-12 space-y-8 animate-in slide-in-from-bottom-4">
            {draft && (
              <div className="p-4 bg-accent-50 text-accent-700 text-xs font-black rounded-2xl border-2 border-accent-100 flex items-center gap-3">
                <LinkIcon className="w-4 h-4" />
                INTELLIGENCE SOURCE DRAFT LOADED
              </div>
            )}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Operational Topic</label>
              <input 
                type="text" 
                required 
                className="w-full p-5 bg-stone-50 border-2 border-transparent focus:border-accent-600/20 rounded-[1.5rem] outline-none transition-all font-black text-primary-900 text-lg"
                placeholder="What is the mission objective?"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-1">Intelligence Content</label>
              <textarea 
                required 
                rows={10}
                className="w-full p-8 bg-stone-50 border-2 border-transparent focus:border-accent-600/20 rounded-[2rem] outline-none transition-all font-medium text-primary-800 leading-relaxed resize-none"
                placeholder="Detail your strategic insights..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-5 bg-accent-600 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-accent-700 transition-all shadow-2xl shadow-accent-600/20 text-sm"
            >
              Authorize & Publish to Agora
            </button>
          </form>
        )}

        {/* Detail View */}
        {view === 'detail' && selectedPost && (
          <div className="animate-in fade-in duration-500">
            <div className="p-12 border-b border-stone-50 bg-gradient-to-br from-stone-50/50 to-white">
              {selectedPost.related_post_id && (
                <div className="mb-6">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-accent-100 text-accent-700 text-[10px] font-black rounded-full uppercase tracking-widest shadow-sm">
                    <LinkIcon className="w-3.5 h-3.5" />
                    Linked Intel: {selectedPost.related_post_title || 'SECURE_SOURCE_' + selectedPost.related_post_id}
                  </span>
                </div>
              )}
              <h2 className="text-3xl font-black text-primary-950 leading-tight tracking-tighter mb-6">{selectedPost.title}</h2>
              <div className="flex items-center gap-6 text-[10px] font-black text-stone-400 uppercase tracking-widest">
                <span className="bg-stone-900 text-white px-3 py-1 rounded-md">{selectedPost.author_name}</span>
                <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
                <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{selectedPost.view_count} Views</span>
              </div>
            </div>
            
            <div className="p-12 min-h-[250px] text-lg text-primary-900 leading-relaxed font-medium whitespace-pre-wrap">
              {selectedPost.content}
            </div>

            {/* Comments Section */}
            <div className="bg-stone-50/50 border-t border-stone-100 p-12">
              <h4 className="text-sm font-black text-stone-900 mb-8 flex items-center gap-3 uppercase tracking-widest">
                <MessageSquare className="w-5 h-5 text-accent-600" /> Operational Feedback ({comments.length})
              </h4>
              
              <div className="space-y-6 mb-12">
                {comments.length === 0 ? (
                  <p className="text-center py-12 text-stone-300 font-bold italic uppercase tracking-widest">No Strategic Input Yet</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-white p-6 rounded-[1.5rem] border border-stone-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex justify-between items-center mb-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${comment.author_name.includes('Admin') ? 'text-accent-600' : 'text-stone-500'}`}>
                          {comment.author_name} {comment.author_name.includes('Admin') && '(HQ)'}
                        </span>
                        <span className="text-[9px] text-stone-300 font-mono">{new Date(comment.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-stone-700 font-bold leading-relaxed">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-3">
                <input 
                  type="text" 
                  className="flex-1 p-5 bg-white border-2 border-stone-100 rounded-[1.25rem] outline-none focus:border-accent-600/20 transition-all text-sm font-bold"
                  placeholder="Share your strategic feedback..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!commentText.trim()}
                  className="p-5 bg-stone-900 text-white rounded-[1.25rem] hover:bg-black transition-all shadow-xl disabled:opacity-30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
