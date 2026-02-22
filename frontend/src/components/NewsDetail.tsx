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
import CommentSection from '../components/CommentSection';

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

  const handleAIAnalysis = async () => {
    if (!newsItem) return;
    setIsAnalyzing(true);
    try {
      const { data } = await api.post(`/news/${newsItem.id}/ai-report`);
      if (data.success) {
        // 분석 리포트 정보를 newsItem에 업데이트
        setNewsItem({ ...newsItem, ai_report: data.data });
        alert('AI 정밀 분석 리포트가 생성되었습니다.');
      }
    } catch (err) {
      alert('AI 분석 실패: API 키 설정 및 서버 상태를 확인하세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (!user) return alert('로그인이 필요합니다.');
    try {
      const { data } = await api.post(`/news/${newsItem.id}/reaction`, { reaction });
      if (data.success) {
        // 서버에서 반환한 최신 좋아요/싫어요 숫자로 상태 업데이트
        setNewsItem({ ...newsItem, ...data.data });
      }
    } catch (err) {
      console.error('반응 실패');
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-40">
      <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4 opacity-20" />
      <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Intelligence Loading...</span>
    </div>
  );

  if (!newsItem) return null;

  return (
    <div className="w-full max-w-5xl mx-auto pb-40 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      {/* ── 상단 네비게이션 ── */}
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/news')} 
          className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">Global Intel Hub</div>
      </div>

      {/* ── 메인 뉴스 카드 ── */}
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

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-12 uppercase">
            {newsItem.title}
          </h1>

          <div className="bg-slate-50/50 rounded-[2.5rem] p-8 md:p-12 mb-12 border border-slate-100">
            <p className="text-lg md:text-xl text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
              {newsItem.content || newsItem.description}
            </p>
          </div>

          {/* 반응 및 원문 링크 */}
          <div className="flex flex-wrap items-center justify-between gap-6 border-b border-slate-100 pb-12">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handleReaction('like')}
                className={`flex items-center gap-2 px-8 py-4 rounded-[1.5rem] font-black transition-all border ${
                  (newsItem.likes_count ?? 0) > 0 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                    : 'bg-slate-50 text-slate-500 border-transparent hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100'
                }`}
              >
                <ThumbsUp size={20} fill={(newsItem.likes_count ?? 0) > 0 ? 'currentColor' : 'none'} />
                <span>도움됨 {newsItem.likes_count || 0}</span>
              </button>
              <button 
                onClick={() => handleReaction('dislike')}
                className={`flex items-center gap-2 px-8 py-4 rounded-[1.5rem] font-black transition-all border ${
                  (newsItem.dislikes_count ?? 0) > 0 
                    ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-200' 
                    : 'bg-slate-50 text-slate-500 border-transparent hover:bg-red-50 hover:text-red-500 hover:border-red-100'
                }`}
              >
                <ThumbsDown size={20} fill={(newsItem.dislikes_count ?? 0) > 0 ? 'currentColor' : 'none'} />
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

          {/* AI 분석 섹션 */}
          <div className="mt-16">
            {newsItem.ai_report ? (
              <div className="space-y-8 animate-in fade-in duration-1000">
                <div className="flex items-center gap-3 text-purple-600">
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                    <Brain size={28} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight uppercase">AI Strategic Analysis</h3>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Neural Intel Report v2.0</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div className="p-10 bg-purple-50 rounded-[2.5rem] border border-purple-100 shadow-sm">
                    <div className="flex items-center gap-2 text-purple-600 mb-4 font-black text-xs uppercase tracking-widest">
                      <Sparkles size={16} /> 핵심 요약
                    </div>
                    <p className="text-slate-800 text-lg font-bold leading-relaxed">{newsItem.ai_report.summary}</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-10 bg-blue-50 rounded-[2.5rem] border border-blue-100">
                      <div className="flex items-center gap-2 text-blue-600 mb-4 font-black text-xs uppercase tracking-widest">
                        <ShieldCheck size={16} /> 파급력 분석
                      </div>
                      <p className="text-slate-700 text-sm font-bold leading-relaxed">{newsItem.ai_report.impact}</p>
                    </div>
                    <div className="p-10 bg-emerald-50 rounded-[2.5rem] border border-emerald-100">
                      <div className="flex items-center gap-2 text-emerald-600 mb-4 font-black text-xs uppercase tracking-widest">
                        <Sparkles size={16} /> 전문가 조언
                      </div>
                      <p className="text-slate-700 text-sm font-bold leading-relaxed">{newsItem.ai_report.advice}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
                className="w-full group relative overflow-hidden p-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-[2.5rem] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-500/10"
              >
                <div className="bg-white rounded-[2.4rem] py-12 flex flex-col items-center justify-center gap-4 group-hover:bg-white/90 transition-all">
                  {isAnalyzing ? (
                    <Loader2 size={40} className="animate-spin text-blue-600" />
                  ) : (
                    <Brain size={40} className="text-blue-600" />
                  )}
                  <div className="text-center">
                    <p className="text-xl font-black text-slate-900 uppercase">Request Gemini AI Analysis</p>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">지능형 요약 및 대응 전략 생성</p>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* ── 토론 섹션 ── */}
        <div className="bg-slate-50/50 border-t border-slate-100 p-8 md:p-16">
          <CommentSection newsId={newsItem.id} />
        </div>
      </div>
    </div>
  );
}
