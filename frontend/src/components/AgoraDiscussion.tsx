import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useActivityLog } from '../utils/activityLogger';
import { useDiscussionStore } from '../store/useDiscussionStore';
import { Loader2, MessageSquare, PenSquare, ArrowLeft, Send, User, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  timestamp: string;
  views: number;
  comments: Comment[];
}

export function AgoraDiscussion() {
  const { user } = useAuthStore();
  const { logActivity } = useActivityLog();
  const { view: storeView, setView: setStoreView, draft, setDraft } = useDiscussionStore();
  
  // Local UI state (synced with store or independent)
  // For simplicity, we'll sync local view with store view or just use store view directly?
  // Let's use local state for now but initialized/controlled by store actions.
  const [view, setView] = useState<'list' | 'detail' | 'write'>('list');
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
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
      // Clear draft after consuming? Or keep until submitted?
      // Lets keep it, but maybe resetting it on specific actions.
    }
  }, [storeView, draft]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8787/api/posts');
      const data = await res.json();
      setPosts(data);
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
      await fetch('http://localhost:8787/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, author: user.email }),
      });
      logActivity('Create Post');
      setTitle('');
      setContent('');
      setView('list');
      
      // Clear store state
      setDraft(null);
      setStoreView('list');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostClick = async (post: Post) => {
    setSelectedPost(post); // Optimistic UI
    setView('detail');
    logActivity(`Read Post: ${post.id}`);
    
    // Fetch fresh to get comments
    try {
      const res = await fetch(`http://localhost:8787/api/posts/${post.id}`);
      const data = await res.json();
      setSelectedPost(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !user || !commentText.trim()) return;

    try {
      const res = await fetch(`http://localhost:8787/api/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: user.email, content: commentText }),
      });
      const newComment = await res.json();
      
      setSelectedPost(prev => prev ? ({
        ...prev,
        comments: [...prev.comments, newComment]
      }) : null);
      
      setCommentText('');
      logActivity(`Comment on Post: ${selectedPost.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full max-w-2xl min-h-[500px]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-primary-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent-600" />
          Agora Discussion
        </h2>
        {view === 'list' && (
          <button 
            onClick={() => setView('write')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-full text-sm font-medium hover:bg-stone-900 transition-all shadow-soft"
          >
            <PenSquare className="w-4 h-4" />
            Write Post
          </button>
        )}
        {view !== 'list' && (
          <button 
            onClick={() => setView('list')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-stone-600 border border-stone-200 rounded-full text-sm font-medium hover:bg-stone-50 transition-all shadow-soft"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to List
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-soft border-[0.5px] border-stone-200 overflow-hidden min-h-[400px]">
        {/* List View */}
        {view === 'list' && (
          <div className="divide-y divide-stone-100">
            {loading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-stone-300" /></div>
            ) : posts.length === 0 ? (
              <div className="text-center p-12 text-stone-400">No active discussions. Be the first!</div>
            ) : (
              posts.map(post => (
                <div 
                  key={post.id} 
                  onClick={() => handlePostClick(post)}
                  className="p-5 hover:bg-stone-50 transition-colors cursor-pointer group"
                >
                  <h3 className="font-semibold text-lg text-primary-800 group-hover:text-accent-600 transition-colors">
                    {post.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author.split('@')[0]}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(post.timestamp).toLocaleDateString()}</span>
                    <span>{post.comments?.length || 0} comments</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Write View */}
        {view === 'write' && (
          <form onSubmit={handleCreatePost} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Topic</label>
              <input 
                type="text" 
                required 
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20"
                placeholder="What's on your mind?"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Content</label>
              <textarea 
                required 
                rows={8}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20 resize-none"
                placeholder="Share your thoughts..."
                value={content}
                onChange={e => setContent(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-3 bg-accent-600 text-white rounded-xl font-medium hover:bg-accent-700 transition-colors shadow-lg shadow-accent-100"
            >
              Publish to Agora
            </button>
          </form>
        )}

        {/* Detail View */}
        {view === 'detail' && selectedPost && (
          <div>
            <div className="p-6 border-b border-stone-100 bg-stone-50/30">
              <h2 className="text-xl font-bold text-primary-800 mb-2">{selectedPost.title}</h2>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="bg-stone-100 px-2 py-1 rounded-md text-stone-600 border border-stone-200">{selectedPost.author}</span>
                <span>{new Date(selectedPost.timestamp).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="p-6 min-h-[150px] text-primary-800 leading-relaxed">
              {selectedPost.content}
            </div>

            {/* Comments Section */}
            <div className="bg-stone-50 border-t border-stone-100 p-6">
              <h4 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Discussion ({selectedPost.comments.length})
              </h4>
              
              <div className="space-y-4 mb-6">
                {selectedPost.comments.length === 0 ? (
                  <p className="text-sm text-stone-400 italic">No comments yet. Start the debate!</p>
                ) : (
                  selectedPost.comments.map(comment => (
                    <div key={comment.id} className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold ${comment.author.includes('admin') ? 'text-accent-600' : 'text-stone-600'}`}>
                          {comment.author} {comment.author.includes('admin') && '(Official)'}
                        </span>
                        <span className="text-[10px] text-stone-400">{new Date(comment.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-sm text-stone-700">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input 
                  type="text" 
                  className="flex-1 p-3 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/20 text-sm"
                  placeholder="Add to the discussion..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!commentText.trim()}
                  className="p-3 bg-primary-800 text-white rounded-xl hover:bg-stone-900 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
