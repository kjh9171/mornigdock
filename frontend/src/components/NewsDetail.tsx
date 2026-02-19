import { useEffect, useState } from 'react';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { useAuthStore } from '../store/useAuthStore';
import { useDiscussionStore } from '../store/useDiscussionStore';
import { getPostAPI, deletePostAPI, Post } from '../lib/api';
import { ArrowLeft, ExternalLink, Bot, MessageSquarePlus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';

export function NewsDetail() {
  const { logActivity } = useActivityLog();
  const { selectedNewsId, setView, setUserTab } = useNavigationStore();
  const { user } = useAuthStore();
  const { startDiscussion } = useDiscussionStore();
  
  const [newsItem, setNewsItem] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    source_url: ''
  });

  useEffect(() => {
    if (!selectedNewsId) {
      setView('user');
      return;
    }

    setLoading(true);
    getPostAPI(selectedNewsId)
      .then(res => {
        if (res.success && res.post) {
          setNewsItem(res.post);
          setEditForm({
            title: res.post.title,
            content: res.post.content,
            source_url: res.post.source_url || ''
          });
          logActivity(`View News Detail: ${res.post.id}`);
        } else {
          setView('user');
        }
      })
      .catch(err => {
        console.error('Failed to fetch news:', err);
        setView('user');
      })
      .finally(() => setLoading(false));
  }, [selectedNewsId, setView, logActivity]);

  const canEdit = () => {
    if (!user || !newsItem) return false;
    return user.role === 'admin' || user.id === newsItem.author_id;
  };

  const handleBack = () => {
    setView('user');
    setUserTab('news');
  };

  const handleAIAnalysis = () => {
    setView('ai-analysis');
    logActivity(`AI Analysis Request: ${newsItem?.id}`);
  };

  const handleDiscuss = () => {
    if (!newsItem) return;
    
    // 아고라 토론 연동 작전 개시
    const draftTitle = `[토론] ${newsItem.title}`;
    const draftContent = `위 기사(${newsItem.source})에 대한 사령부 요원들의 의견을 구합니다.\n\n원문 요약:\n${newsItem.content.substring(0, 200)}...\n\n본 토론은 지능형 보고 체계와 연동되어 기록됩니다.`;
    
    // Discussion Store에 초안 및 연관 ID 설정 (관리에 필수!)
    // Note: useDiscussionStore might need related_post_id field in its draft
    startDiscussion(draftTitle, draftContent);
    
    // Store에 직접 related_post_id 주입 (draft가 object이므로 확장 가능)
    const discussionStore = useDiscussionStore.getState();
    discussionStore.setDraft({ 
      title: draftTitle, 
      content: draftContent,
      // @ts-ignore - Dynamic extension for linking
      related_post_id: newsItem.id 
    });

    setView('user');
    setUserTab('discussion');
    logActivity(`Start Linked Discussion from News: ${newsItem.id}`);
  };

  const handleEdit = () => setIsEditing(true);

  const handleCancelEdit = () => {
    if (!newsItem) return;
    setEditForm({
      title: newsItem.title,
      content: newsItem.content,
      source_url: newsItem.source_url || ''
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!newsItem) return;
    
    const res = await updatePostAPI(newsItem.id, {
      title: editForm.title,
      content: editForm.content,
      source_url: editForm.source_url
    });

    if (res.success) {
      logActivity(`Update News Content: ${newsItem.id}`);
      setNewsItem({ ...newsItem, ...editForm });
      setIsEditing(false);
    } else {
      alert('수정 승인 실패. 권한을 확인하세요.');
    }
  };

  const handleDelete = async () => {
    if (!newsItem) return;
    if (!confirm('정말 이 지능물을 폐기하시겠습니까?')) return;

    const res = await deletePostAPI(newsItem.id);
    if (res.success) {
      logActivity(`Delete News: ${newsItem.id}`);
      setView('user');
      setUserTab('news');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="w-8 h-8 animate-spin text-stone-300" />
      </div>
    );
  }

  if (!newsItem) return null;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Intelligence</span>
      </button>

      {/* Article Header */}
      <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-bold tracking-wider rounded uppercase">
              {newsItem.source || 'INTEL'}
            </span>
            {newsItem.type === 'news' && (
              <span className="text-xs font-medium text-red-500 animate-pulse">● LIVE</span>
            )}
          </div>
          
          {canEdit() && !isEditing && (
            <div className="flex gap-2">
              <button onClick={handleEdit} className="p-2 text-stone-400 hover:text-accent-600 transition-colors"><Edit className="w-5 h-5" /></button>
              <button onClick={handleDelete} className="p-2 text-stone-400 hover:text-red-600 transition-colors"><Trash2 className="w-5 h-5" /></button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600 font-bold"
            />
            <textarea
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              rows={8}
              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
            />
            <div className="flex gap-3">
              <button onClick={handleSave} className="flex-1 py-3 bg-accent-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"><Save className="w-5 h-5" />Save</button>
              <button onClick={handleCancelEdit} className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold flex items-center justify-center gap-2"><X className="w-5 h-5" />Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-primary-800 leading-tight">
              {newsItem.title}
            </h1>

            {newsItem.source_url && (
              <a 
                href={newsItem.source_url} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-accent-600 font-medium hover:underline decoration-accent-600 underline-offset-4"
              >
                <ExternalLink className="w-4 h-4" />
                View Original Source
              </a>
            )}
          </>
        )}
      </div>

      {!isEditing && (
        <>
          {/* Article Content */}
          <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-soft">
            <div className="prose prose-stone max-w-none">
              <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">
                {newsItem.content}
              </p>
            </div>
          </div>

          {/* AI Analysis Preview if exists */}
          {newsItem.ai_analysis && (
            <div className="bg-stone-900 rounded-2xl p-6 border border-stone-800 text-stone-300">
              <div className="flex items-center gap-2 mb-4 text-accent-400">
                <Bot className="w-5 h-5" />
                <h3 className="font-bold">사령부 지능 분석 완료됨</h3>
              </div>
              <p className="text-xs leading-relaxed opacity-80 line-clamp-3 mb-4">
                {newsItem.ai_analysis}
              </p>
              <button 
                onClick={handleAIAnalysis}
                className="text-xs font-bold text-accent-400 hover:text-accent-300 underline"
              >
                보고서 전문 보기
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleAIAnalysis}
              className="py-4 bg-white border-2 border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 hover:border-accent-600 hover:text-accent-600 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Bot className="w-5 h-5" />
              {newsItem.ai_analysis ? '지능 보고서 확인' : 'AI 지능 분석 수행'}
            </button>

            <button
              onClick={handleDiscuss}
              className="py-4 bg-primary-800 text-white rounded-xl text-sm font-bold hover:bg-stone-900 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
            >
              <MessageSquarePlus className="w-5 h-5" />
              아고라 토론 발제
            </button>
          </div>
        </>
      )}
    </div>
  );
}
