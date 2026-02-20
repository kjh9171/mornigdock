import { useEffect, useState } from 'react';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDiscussionStore } from '../store/useDiscussionStore';
import { getPostAPI, deletePostAPI, addCommentAPI, updatePostAPI, Post, Comment } from '../lib/api';
import { ArrowLeft, ExternalLink, Bot, MessageSquarePlus, Edit, Trash2, Save, X, Loader2, Send, MessageSquare, CornerDownRight } from 'lucide-react';

export function NewsDetail() {
  const { logActivity } = useActivityLog();
  const { selectedNewsId, setView, setUserTab } = useNavigationStore();
  const { user } = useAuthStore();
  
  const [newsItem, setNewsItem] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  
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

  const handleAddComment = async (e: React.FormEvent, parentId?: number) => {
    e.preventDefault();
    if (!newsItem || !user) return;
    
    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;

    const res = await addCommentAPI(newsItem.id, text, parentId);
    if (res.success) {
      setComments(prev => [...prev, res.comment]);
      if (parentId) {
        setReplyTo(null);
        setReplyText('');
      } else {
        setCommentText('');
      }
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

  // 🌳 [계층형 트리 작전] 평면 댓글 데이터를 트리 구조로 변환
  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-stone-300" /></div>;
  if (!newsItem) return null;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Controls */}
      <div className="flex justify-between items-center">
        <button onClick={handleBack} className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">지능물 목록으로 복귀</span>
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-primary-100 text-primary-700 text-[10px] font-black tracking-widest rounded-full uppercase">
                {newsItem.source || 'INTEL'}
              </span>
              <span className="text-[10px] font-bold text-stone-400">
                {new Date(newsItem.created_at).toLocaleString()}
              </span>
            </div>
            
            {newsItem.source_url && (
              <a href={newsItem.source_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-stone-50 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-100 transition-all border border-stone-200">
                <ExternalLink className="w-4 h-4 text-accent-600" />
                원문 기사(네이버) 확인
              </a>
            )}
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
                <div className="bg-stone-50 p-8 rounded-3xl border border-stone-100 mb-8">
                  <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> 원문 기사 첩보 내용
                  </h4>
                  <p className="text-lg text-stone-700 leading-relaxed whitespace-pre-wrap font-medium">
                    {newsItem.content}
                  </p>
                </div>

                {newsItem.ai_analysis && (
                  <div className="bg-amber-50/30 p-8 md:p-12 rounded-[2.5rem] border-2 border-amber-100 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Bot className="w-32 h-32 text-amber-600" /></div>
                    <div className="flex items-center gap-3 mb-6 text-amber-700 relative z-10">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                      <h3 className="text-xl font-black tracking-tight uppercase">사령부 정밀 지능 분석 보고서</h3>
                    </div>
                    <pre className="text-sm md:text-base text-stone-800 whitespace-pre-wrap font-sans leading-relaxed relative z-10 italic bg-white/60 p-8 rounded-2xl border border-white shadow-sm">
                      {newsItem.ai_analysis}
                    </pre>
                  </div>
                )}
              </div>

              {!newsItem.ai_analysis && (
                <div className="flex justify-center pt-8 border-t border-stone-100">
                  <button 
                    onClick={handleAIAnalysis}
                    className="w-full flex items-center justify-center gap-3 py-5 bg-stone-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl hover:shadow-accent-600/20"
                  >
                    <Bot className="w-6 h-6 text-accent-400" />
                    사령부 AI 지능 분석 보고서 생성 및 열람
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Integrated Threaded Discussion Section */}
        <div className="bg-stone-100/50 border-t border-stone-200 p-8 md:p-12">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-stone-900 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-accent-600" />
              아고라 통합 토론 게시판 <span className="text-stone-400 text-sm font-mono">({comments.length})</span>
            </h3>
          </div>

          {/* Root Comment Form */}
          <form onSubmit={(e) => handleAddComment(e)} className="mb-12 relative">
            <textarea 
              value={commentText} onChange={e => setCommentText(e.target.value)}
              placeholder={user ? "이 지능물에 대한 당신의 전략적 통찰을 발제하십시오..." : "요원 가동 승인(로그인) 후 참여 가능합니다."}
              disabled={!user}
              className="w-full p-6 bg-white border border-stone-200 rounded-3xl text-sm font-bold outline-none focus:ring-4 focus:ring-accent-600/10 transition-all pr-20 shadow-inner"
              rows={3}
            />
            <button 
              type="submit" disabled={!user || !commentText.trim()}
              className="absolute right-4 bottom-4 p-3 bg-stone-900 text-white rounded-2xl hover:bg-black transition-all disabled:opacity-30 shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>

          {/* Threaded Comment List */}
          <div className="space-y-6">
            {rootComments.length === 0 ? (
              <div className="text-center py-12 text-stone-400 font-bold italic">현재 발제된 공식 의견이 없습니다.</div>
            ) : (
              rootComments.map(c => (
                <div key={c.id} className="space-y-4">
                  {/* Root Comment Card */}
                  <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-3">
                      <span className={`text-[11px] font-black uppercase tracking-wider ${c.author_name.includes('Admin') ? 'text-accent-600' : 'text-stone-500'}`}>
                        {c.author_name} {c.author_name.includes('Admin') && '(HQ)'}
                      </span>
                      <span className="text-[10px] text-stone-300 font-mono italic">{new Date(c.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed font-bold mb-4">{c.content}</p>
                    <button 
                      onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                      className="text-[10px] font-black text-accent-600 uppercase hover:underline flex items-center gap-1"
                    >
                      <MessageSquarePlus className="w-3 h-3" />
                      대댓글(답글) 작성
                    </button>
                  </div>

                  {/* Replies (Thread) */}
                  {getReplies(c.id).map(r => (
                    <div key={r.id} className="ml-8 flex gap-3 animate-in slide-in-from-left-4">
                      <CornerDownRight className="w-5 h-5 text-stone-300 mt-2 shrink-0" />
                      <div className="flex-1 bg-white/60 p-5 rounded-2xl border border-stone-100 shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-stone-500 uppercase">{r.author_name}</span>
                          <span className="text-[10px] text-stone-300 font-mono italic">{new Date(r.created_at).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed font-medium">{r.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Reply Form */}
                  {replyTo === c.id && (
                    <form onSubmit={(e) => handleAddComment(e, c.id)} className="ml-12 mt-2 flex gap-2 animate-in slide-in-from-top-2">
                      <input 
                        value={replyText} onChange={e => setReplyText(e.target.value)}
                        placeholder="대댓글 내용을 입력하십시오..."
                        className="flex-1 bg-white border border-accent-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-accent-600/20"
                      />
                      <button type="submit" className="bg-accent-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md">등록</button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
