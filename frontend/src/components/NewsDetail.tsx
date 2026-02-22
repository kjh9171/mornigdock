import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { getNewsDetailAPI, addCommentAPI, Comment } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';
import { 
  ArrowLeft, ExternalLink, Clock, Brain, 
  Sparkles, Send, MessageSquare, 
  MessageSquarePlus, CornerDownRight, 
  ShieldCheck, Loader2, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { format } from 'date-fns';

export function NewsDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [newsItem, setNewsItem] = useState<any | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getNewsDetailAPI(id);
      if (res.success) {
        setNewsItem(res.data);
        // 댓글 로드는 별도 API가 필요할 수 있으나 여기서는 res.data에 포함된 것으로 가정하거나 별도 호출
        const commentRes = await api.get(`/comments?newsId=${id}`);
        setComments(commentRes.data.data || []);
      } else {
        navigate('/news');
      }
    } catch (err) {
      console.error(err);
      navigate('/news');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddComment = async (e: React.FormEvent, parentId?: number) => {
    e.preventDefault();
    if (!newsItem || !user) return alert('로그인이 필요합니다.');
    
    const text = parentId ? replyText : commentText;
    if (!text.trim()) return;

    try {
      const res = await addCommentAPI(newsItem.id, null, text, parentId);
      if (res.success) {
        setComments(prev => [...prev, res.data]);
        if (parentId) {
          setReplyTo(null);
          setReplyText('');
        } else {
          setCommentText('');
        }
      }
    } catch (err) {
      alert('댓글 등록 실패');
    }
  };

  const handleAIAnalysis = async () => {
    if (!newsItem) return;
    setIsAnalyzing(true);
    try {
      const { data } = await api.post(`/news/${newsItem.id}/ai-report`);
      if (data.success) {
        setNewsItem({ ...newsItem, ai_report: data.data });
      }
    } catch (err) {
      alert('AI 분석 실패');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (!user) return alert('로그인이 필요합니다.');
    try {
      const { data } = await api.post(`/news/${newsItem.id}/reaction`, { reaction });
      setNewsItem({ ...newsItem, ...data.data });
    } catch (err) {
      console.error('반응 실패');
    }
  };

  const rootComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: number) => comments.filter(c => c.parent_id === parentId);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4 opacity-20" />
      <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Decrypting...</span>
    </div>
  );

  if (!newsItem) return null;

  return (
    <div className="w-full max-w-5xl mx-auto pb-40 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      {/* ── 상단 네비게이션 ── */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/news')} 
          className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-sm transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-sm font-bold text-slate-400">Integrated Intelligence Hub</div>
      </div>

      {/* ── 메인 리포트 카드 ── */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
        <div className="p-8 md:p-16">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black tracking-widest rounded-xl uppercase">
              {newsItem.source_name || 'Global News'}
            </span>
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
              <Clock size={14} />
              {format(new Date(newsItem.published_at || newsItem.created_at), 'yyyy.MM.dd HH:mm')}
            </div>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-12">
            {newsItem.title}
          </h1>

          <div className="bg-slate-50/50 rounded-[2.5rem] p-8 md:p-12 mb-12 border border-slate-100 relative group">
            <p className="text-lg md:text-xl text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
              {newsItem.content || newsItem.description}
            </p>
          </div>

          {/* 원문 링크 & 반응 버튼 */}
          <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-100 pb-12">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all ${
                  newsItem.likes_count > 0 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <ThumbsUp size={18} fill={newsItem.likes_count > 0 ? 'currentColor' : 'none'} />
                <span>유익함 {newsItem.likes_count || 0}</span>
              </button>
              <button 
                onClick={() => handleReaction('dislike')}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black transition-all ${
                  newsItem.dislikes_count > 0 ? 'bg-red-500 text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                <ThumbsDown size={18} fill={newsItem.dislikes_count > 0 ? 'currentColor' : 'none'} />
                <span>글쎄요 {newsItem.dislikes_count || 0}</span>
              </button>
            </div>
            
            <a 
              href={newsItem.url} 
              target="_blank" 
              rel="noreferrer" 
              className="flex items-center gap-2 text-blue-600 font-black text-sm hover:underline"
            >
              <ExternalLink size={18} />
              공식 뉴스 원문 보기
            </a>
          </div>

          {/* AI 분석 리포트 섹션 */}
          <div className="mt-16">
            {newsItem.ai_report ? (
              <div className="space-y-8">
                <div className="flex items-center gap-3 text-purple-600">
                  <div className="w-10 h-10 bg-purple-100 rounded-2xl flex items-center justify-center">
                    <Brain size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">Gemini AI 정밀 분석 리포트</h3>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Neural Intelligence Report v1.5</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="p-8 bg-purple-50/50 rounded-[2rem] border border-purple-100 shadow-sm">
                    <div className="flex items-center gap-2 text-purple-600 mb-3 font-black text-xs uppercase tracking-widest">
                      <Sparkles size={14} /> 핵심 요약
                    </div>
                    <p className="text-slate-700 font-bold leading-relaxed">{newsItem.ai_report.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100">
                      <div className="flex items-center gap-2 text-blue-600 mb-3 font-black text-xs uppercase tracking-widest">
                        <ShieldCheck size={14} /> 사회/경제적 파급력
                      </div>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed">{newsItem.ai_report.impact}</p>
                    </div>
                    <div className="p-8 bg-emerald-50/50 rounded-[2rem] border border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-600 mb-3 font-black text-xs uppercase tracking-widest">
                        <Sparkles size={14} /> 전문가 제언
                      </div>
                      <p className="text-slate-700 text-sm font-medium leading-relaxed">{newsItem.ai_report.advice}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="w-full group relative overflow-hidden p-1 bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-[2rem] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                <div className="bg-white rounded-[1.9rem] py-8 flex flex-col items-center justify-center gap-3 group-hover:bg-white/90 transition-all">
                  {isAnalyzing ? (
                    <Loader2 size={32} className="animate-spin text-purple-500" />
                  ) : (
                    <Brain size={32} className="text-purple-500" />
                  )}
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-800">Gemini AI 뉴스 분석 실행</p>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Request Neural Intelligence Summary</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* ── 아고라 토론 섹션 ── */}
        <div className="bg-slate-50/50 border-t border-slate-100 p-8 md:p-16">
          <div className="max-w-3xl">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-4 mb-12">
              <MessageSquare size={28} className="text-blue-600" />
              요원 토론광장 <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-full">{comments.length}</span>
            </h3>

            {/* 댓글 입력 */}
            <form onSubmit={(e) => handleAddComment(e)} className="mb-16 relative">
              <textarea 
                value={commentText} 
                onChange={e => setCommentText(e.target.value)}
                placeholder={user ? "이 소식에 대한 당신의 날카로운 분석을 들려주세요..." : "로그인한 요원만 토론에 참여할 수 있습니다."}
                disabled={!user}
                className="w-full p-8 bg-white border border-slate-200 rounded-[2.5rem] text-sm font-bold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all shadow-sm placeholder:text-slate-300 min-h-[120px] resize-none"
              />
              <button 
                type="submit" 
                disabled={!user || !commentText.trim()}
                className="absolute right-6 bottom-6 p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-110 active:scale-95 transition-all disabled:opacity-20"
              >
                <Send size={24} />
              </button>
            </form>

            {/* 댓글 리스트 */}
            <div className="space-y-12">
              {rootComments.length === 0 ? (
                <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-sm">
                  아직 기록된 전술적 토론이 없습니다.
                </div>
              ) : (
                rootComments.map(c => (
                  <div key={c.id} className="space-y-6">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative group">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-400 text-[10px]">
                            {c.author_name?.[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-black text-slate-700">{c.author_name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-300 italic">{format(new Date(c.created_at), 'HH:mm:ss')}</span>
                      </div>
                      <p className="text-sm text-slate-600 font-bold leading-relaxed mb-6">{c.content}</p>
                      <button 
                        onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 uppercase hover:underline"
                      >
                        <MessageSquarePlus size={14} /> 답글 달기
                      </button>
                    </div>

                    {/* 대댓글 */}
                    {getReplies(c.id).map(r => (
                      <div key={r.id} className="ml-12 flex gap-4 animate-in slide-in-from-left-4">
                        <CornerDownRight className="w-6 h-6 text-slate-200 mt-2 shrink-0" />
                        <div className="flex-1 bg-white/60 p-6 rounded-[1.5rem] border border-slate-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-black text-slate-500">{r.author_name}</span>
                            <span className="text-[10px] font-bold text-slate-300 italic">{format(new Date(r.created_at), 'HH:mm:ss')}</span>
                          </div>
                          <p className="text-xs text-slate-500 font-bold leading-relaxed">{r.content}</p>
                        </div>
                      </div>
                    ))}

                    {/* 답글 입력 폼 */}
                    {replyTo === c.id && (
                      <form onSubmit={(e) => handleAddComment(e, c.id)} className="ml-16 flex gap-3 animate-in slide-in-from-top-4">
                        <input 
                          value={replyText} 
                          onChange={e => setReplyText(e.target.value)}
                          placeholder="답글을 입력하세요..."
                          className="flex-1 bg-white border border-blue-100 rounded-2xl px-6 py-3 text-xs font-bold text-slate-800 outline-none focus:border-blue-500 transition-all shadow-sm"
                        />
                        <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95">등록</button>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
