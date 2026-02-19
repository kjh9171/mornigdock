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
      const res = await getPostsAPI({ type: 'discussion' });
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
        type: 'discussion',
        category: '아고라',
        related_post_id: relatedId 
      });
      
      if (res.success) {
        logActivity(`Create Agora Post: ${title}`);
        setTitle('');
        setContent('');
        setView('list');
        setDraft(null);
        setStoreView('list');
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
            onClick={() => {
              setView('list');
              setDraft(null);
              setStoreView('list');
            }}
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
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg text-primary-800 group-hover:text-accent-600 transition-colors">
                      {post.title}
                    </h3>
                    {post.related_post_id && <LinkIcon className="w-3 h-3 text-accent-400" />}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-stone-400">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" />{post.author_name}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(post.created_at).toLocaleDateString()}</span>
                    <span>{post.comment_count || 0} comments</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Write View */}
        {view === 'write' && (
          <form onSubmit={handleCreatePost} className="p-6 space-y-4">
            {/* Draft Notice */}
            {draft && (
              <div className="p-3 bg-accent-50 text-accent-700 text-xs rounded-lg border border-accent-100 mb-2">
                사령부 지능물에서 연결된 토론 초안이 로드되었습니다.
              </div>
            )}
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
              {/* Linked News Badge */}
              {selectedPost.related_post_id && (
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-accent-200 text-accent-700 text-[10px] font-bold rounded-md">
                    <LinkIcon className="w-3 h-3" />
                    연관 지능물: {selectedPost.related_post_title || 'ID ' + selectedPost.related_post_id}
                  </span>
                </div>
              )}
              <h2 className="text-xl font-bold text-primary-800 mb-2">{selectedPost.title}</h2>
              <div className="flex items-center gap-3 text-xs text-stone-500">
                <span className="bg-stone-100 px-2 py-1 rounded-md text-stone-600 border border-stone-200">{selectedPost.author_name}</span>
                <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="p-6 min-h-[150px] text-primary-800 leading-relaxed whitespace-pre-wrap">
              {selectedPost.content}
            </div>

            {/* Comments Section */}
            <div className="bg-stone-50 border-t border-stone-100 p-6">
              <h4 className="text-sm font-bold text-stone-700 mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Discussion ({comments.length})
              </h4>
              
              <div className="space-y-4 mb-6">
                {comments.length === 0 ? (
                  <p className="text-sm text-stone-400 italic">No comments yet. Start the debate!</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-bold ${comment.author_name.includes('Admin') ? 'text-accent-600' : 'text-stone-600'}`}>
                          {comment.author_name} {comment.author_name.includes('Admin') && '(Official)'}
                        </span>
                        <span className="text-[10px] text-stone-400">{new Date(comment.created_at).toLocaleTimeString()}</span>
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
