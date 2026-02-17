import { useEffect, useState } from 'react';
import { useLocalizedContent, LocalizedText } from '../utils/langUtils';
import { useActivityLog } from '../utils/activityLogger';
import { useNavigationStore } from '../store/useNavigationStore';
import { useAuthStore } from '../store/useAuthStore';
import { ArrowLeft, ExternalLink, Bot, MessageSquarePlus, Edit, Trash2, Save, X } from 'lucide-react';

interface NewsItem {
  id: number;
  source: string;
  type: 'breaking' | 'analysis';
  title: LocalizedText;
  summary: LocalizedText;
  content: LocalizedText;
  url?: string;
  author?: string;
}

export function NewsDetail() {
  const { ln } = useLocalizedContent();
  const { logActivity } = useActivityLog();
  const { selectedNewsId, setView, setUserTab } = useNavigationStore();
  const { user } = useAuthStore();
  
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    titleKo: '',
    titleEn: '',
    summaryKo: '',
    summaryEn: '',
    contentKo: '',
    contentEn: '',
    url: ''
  });

  useEffect(() => {
    if (!selectedNewsId) {
      setView('user');
      return;
    }

    fetch('http://localhost:8787/api/news')
      .then(res => res.json())
      .then((data: NewsItem[]) => {
        const item = data.find(n => n.id === selectedNewsId);
        if (item) {
          setNewsItem(item);
          setEditForm({
            titleKo: item.title.ko,
            titleEn: item.title.en,
            summaryKo: item.summary.ko,
            summaryEn: item.summary.en,
            contentKo: item.content.ko,
            contentEn: item.content.en,
            url: item.url || ''
          });
          logActivity(`View News Detail: ${item.id}`);
        } else {
          setView('user');
        }
      })
      .catch(err => {
        console.error('Failed to fetch news:', err);
        setView('user');
      });
  }, [selectedNewsId, setView, logActivity]);

  const canEdit = () => {
    if (!user || !newsItem) return false;
    return user.isAdmin || user.email === newsItem.author;
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
    setView('user');
    setUserTab('discussion');
    logActivity(`Start Discussion from News: ${newsItem.id}`);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!newsItem) return;
    setEditForm({
      titleKo: newsItem.title.ko,
      titleEn: newsItem.title.en,
      summaryKo: newsItem.summary.ko,
      summaryEn: newsItem.summary.en,
      contentKo: newsItem.content.ko,
      contentEn: newsItem.content.en,
      url: newsItem.url || ''
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!newsItem) return;

    try {
      const res = await fetch(`http://localhost:8787/api/news/${newsItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: { ko: editForm.titleKo, en: editForm.titleEn },
          summary: { ko: editForm.summaryKo, en: editForm.summaryEn },
          content: { ko: editForm.contentKo, en: editForm.contentEn },
          url: editForm.url
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setNewsItem(updated);
        setIsEditing(false);
        logActivity(`Edit News: ${newsItem.id}`);
      }
    } catch (err) {
      console.error('Failed to update news:', err);
    }
  };

  const handleDelete = async () => {
    if (!newsItem) return;
    if (!confirm('정말 이 기사를 삭제하시겠습니까?')) return;

    try {
      const res = await fetch(`http://localhost:8787/api/news/${newsItem.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        logActivity(`Delete News: ${newsItem.id}`);
        setView('user');
        setUserTab('news');
      }
    } catch (err) {
      console.error('Failed to delete news:', err);
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'Yonhap':
        return <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold tracking-wider rounded uppercase">YONHAP</span>;
      case 'Naver':
        return <span className="px-3 py-1 bg-green-100 text-green-600 text-xs font-bold tracking-wider rounded uppercase">NAVER</span>;
      default:
        return <span className="px-3 py-1 bg-stone-100 text-stone-500 text-xs font-bold tracking-wider rounded uppercase">AGORA</span>;
    }
  };

  if (!newsItem) {
    return (
      <div className="flex justify-center p-8">
        <p className="text-stone-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to News</span>
      </button>

      {/* Article Header */}
      <div className="bg-white rounded-2xl p-8 border border-stone-200 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getSourceBadge(newsItem.source)}
            {newsItem.type === 'breaking' && (
              <span className="text-xs font-medium text-red-500 animate-pulse">● LIVE</span>
            )}
          </div>
          
          {canEdit() && !isEditing && (
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                className="p-2 text-stone-500 hover:text-accent-600 transition-colors"
                title="Edit"
              >
                <Edit className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-stone-500 hover:text-red-600 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-stone-500 font-medium">Title (Korean)</label>
              <input
                type="text"
                value={editForm.titleKo}
                onChange={(e) => setEditForm({ ...editForm, titleKo: e.target.value })}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium">Title (English)</label>
              <input
                type="text"
                value={editForm.titleEn}
                onChange={(e) => setEditForm({ ...editForm, titleEn: e.target.value })}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium">Summary (Korean)</label>
              <textarea
                value={editForm.summaryKo}
                onChange={(e) => setEditForm({ ...editForm, summaryKo: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium">Summary (English)</label>
              <textarea
                value={editForm.summaryEn}
                onChange={(e) => setEditForm({ ...editForm, summaryEn: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium">Content (Korean)</label>
              <textarea
                value={editForm.contentKo}
                onChange={(e) => setEditForm({ ...editForm, contentKo: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium">Content (English)</label>
              <textarea
                value={editForm.contentEn}
                onChange={(e) => setEditForm({ ...editForm, contentEn: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 font-medium">URL</label>
              <input
                type="text"
                value={editForm.url}
                onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-600"
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-accent-600 text-white rounded-xl font-bold hover:bg-accent-700 transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-3 bg-stone-200 text-stone-700 rounded-xl font-bold hover:bg-stone-300 transition-all flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-primary-800 leading-tight">
              {ln(newsItem.title)}
            </h1>

            <p className="text-lg text-stone-600 font-light leading-relaxed">
              {ln(newsItem.summary)}
            </p>

            {newsItem.url && (
              <a 
                href={newsItem.url} 
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
                {ln(newsItem.content)}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={handleAIAnalysis}
              className="py-4 bg-white border-2 border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 hover:border-accent-600 hover:text-accent-600 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Bot className="w-5 h-5" />
              AI Analysis
            </button>

            <button
              onClick={handleDiscuss}
              className="py-4 bg-primary-800 text-white rounded-xl text-sm font-bold hover:bg-stone-900 transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
            >
              <MessageSquarePlus className="w-5 h-5" />
              Discuss on Agora
            </button>
          </div>
        </>
      )}
    </div>
  );
}
