import { useEffect, useState } from 'react';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDiscussionStore } from '../store/useDiscussionStore';
import { getPostAPI, deletePostAPI, addCommentAPI, updatePostAPI, Post, Comment } from '../lib/api';
import { ArrowLeft, ExternalLink, Bot, MessageSquarePlus, Edit, Trash2, Save, X, Loader2, Send, MessageSquare } from 'lucide-react';

export function NewsDetail() {
  const { logActivity } = useActivityLog();
  const { selectedNewsId, setView, setUserTab } = useNavigationStore();
  const { user } = useAuthStore();
  const { startDiscussion } = useDiscussionStore();
  
  const [newsItem, setNewsItem] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    source_url: ''
  });

  const loadData = async () => {
    if (!selectedNewsId) return;
    setLoading(true);
    try {
      const res = await getPostAPI(selectedNewsId);
      if (res.success && res.post) {
        setNewsItem(res.post);
        setComments(res.comments || []);
        setEditForm({
          title: res.post.title,
          content: res.post.content,
          source_url: res.post.source_url || ''
        });
        logActivity(`View Integrated Intelligence: ${res.post.id}`);
      } else {
        setView('user');
      }
    } catch (err) {
      console.error(err);
      setView('user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedNewsId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsItem || !user || !commentText.trim()) return;

    const res = await addCommentAPI(newsItem.id, commentText);
    if (res.success) {
      setComments(prev => [...prev, res.comment]);
      setCommentText('');
      logActivity(`Agora Discussion Contribution: ${newsItem.id}`);
    }
  };

  const handleBack = () => {
    setView('user');
    setUserTab('news');
  };

  const handleAIAnalysis = () => {
    setView('ai-analysis');
  };

  const handleSave = async () => {
    if (!newsItem) return;
    const res = await updatePostAPI(newsItem.id, editForm);
    if (res.success) {
      setNewsItem({ ...newsItem, ...editForm });
      setIsEditing(false);
      logActivity(`Intelligence Correction: ${newsItem.id}`);
    }
  };

  const handleDelete = async () => {
    if (!newsItem) return;
    if (!confirm('정말 이 지능 자산을 폐기하시겠습니까?')) return;
    const res = await deletePostAPI(newsItem.id);
    if (res.success) {
      handleBack();
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-stone-300" /></div>;
  if (!newsItem) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Controls */}
      <div className="flex justify-between items-center">
        <button onClick={handleBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back to List</span>
        </button>
        
        <div className="flex gap-2">
          {user?.role === 'admin' && !isEditing && (
            <>
              <button onClick={() => setIsEditing(true)} className="p-2 text-stone-400 hover:text-accent-600 transition-colors"><Edit className="w-5 h-5" /></button>
              <button onClick={handleDelete} className="p-2 text-stone-400 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
            </>
          )}
        </div>
      </div>

      {/* Main Intelligence Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-primary-100 text-primary-700 text-[10px] font-black tracking-widest rounded-full uppercase">
              {newsItem.source || 'INTEL'}
            </span>
            <span className="text-[10px] font-bold text-stone-400">
              {new Date(newsItem.created_at).toLocaleString()}
            </span>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <input 
                value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})}
                className="w-full text-3xl font-black text-stone-900 outline-none border-b-2 border-accent-600 pb-2"
              />
              <textarea 
                value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})}
                rows={10} className="w-full text-lg text-stone-700 outline-none bg-stone-50 p-4 rounded-2xl"
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 font-bold text-stone-400">Cancel</button>
                <button onClick={handleSave} className="px-8 py-2 bg-accent-600 text-white rounded-xl font-bold shadow-lg">Authorize Correction</button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-3xl md:text-4xl font-black text-stone-900 leading-tight tracking-tighter mb-8">
                {newsItem.title}
              </h1>
              
              <div className="prose prose-stone max-w-none mb-12">
                <p className="text-lg text-stone-700 leading-relaxed whitespace-pre-wrap font-medium">
                  {newsItem.content}
                </p>
              </div>

              <div className="flex flex-wrap gap-4 items-center justify-between pt-8 border-t border-stone-100">
                {newsItem.source_url && (
                  <a href={newsItem.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-black text-accent-600 hover:underline">
                    <ExternalLink className="w-4 h-4" />
                    네이버 뉴스 원문 확인
                  </a>
                )}
                <button 
                  onClick={handleAIAnalysis}
                  className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg"
                >
                  <Bot className="w-5 h-5 text-accent-400" />
                  지능 분석 보고서 {newsItem.ai_analysis ? '재열람' : '생성'}
                </button>
              </div>
            </>
          )}
        </div>

        {/* AI Analysis Preview */}
        {newsItem.ai_analysis && !isEditing && (
          <div className="bg-stone-50 border-t border-stone-100 p-8 md:p-12">
            <div className="flex items-center gap-2 mb-6 text-accent-700">
              <Bot className="w-6 h-6" />
              <h3 className="text-xl font-black tracking-tight text-primary-900 uppercase">Strategic Analysis Result</h3>
            </div>
            <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Bot className="w-20 h-20" /></div>
              <pre className="text-sm text-stone-700 whitespace-pre-wrap font-sans leading-relaxed relative z-10 italic">
                {newsItem.ai_analysis}
              </pre>
            </div>
          </div>
        )}

        {/* Integrated Agora Discussion Section */}
        <div className="bg-stone-100/50 border-t border-stone-200 p-8 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-stone-900 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-accent-600" />
              아고라 통합 토론장 <span className="text-stone-400 text-sm font-mono">({comments.length})</span>
            </h3>
          </div>

          {/* Comment Form */}
          <form onSubmit={handleAddComment} className="mb-10 relative">
            <textarea 
              value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder={user ? "사령부 요원으로서 당신의 전략적 견해를 남겨주세요..." : "인증된 요원만 토론에 참여할 수 있습니다."}
              disabled={!user}
              className="w-full p-6 bg-white border border-stone-200 rounded-3xl text-sm font-medium outline-none focus:ring-4 focus:ring-accent-600/10 transition-all pr-20 shadow-inner"
              rows={3}
            />
            <button 
              type="submit" disabled={!user || !commentText.trim()}
              className="absolute right-4 bottom-4 p-3 bg-stone-900 text-white rounded-2xl hover:bg-black transition-all disabled:opacity-30 shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Comment List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-12 text-stone-400 font-medium italic">아직 발제된 의견이 없습니다. 첫 번째 통찰을 공유하세요.</div>
            ) : (
              comments.map(c => (
                <div key={c.id} className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-center mb-3">
                    <span className={`text-[11px] font-black uppercase tracking-wider ${c.author_name.includes('Admin') ? 'text-accent-600' : 'text-stone-500'}`}>
                      {c.author_name} {c.author_name.includes('Admin') && '(HQ)'}
                    </span>
                    <span className="text-[10px] text-stone-300 font-mono italic">{new Date(c.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed font-medium">{c.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
