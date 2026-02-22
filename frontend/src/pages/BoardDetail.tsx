import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { getPostAPI, deletePostAPI, Post } from '../lib/api';
import { 
  User, Clock, Eye, Trash2, ArrowLeft, 
  ShieldCheck, Loader2, ThumbsUp, ThumbsDown,
  MessageSquare, Share2
} from 'lucide-react';
import { format } from 'date-fns';
import CommentSection from '../components/CommentSection';

export default function BoardDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getPostAPI(id).then(res => {
      if (res.success) setPost(res.post); 
      else navigate('/board');
    }).finally(() => setIsLoading(false));
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!post || !confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await deletePostAPI(post.id);
      if (res.success) navigate('/board');
    } catch (err) {
      alert('삭제 권한이 없거나 오류가 발생했습니다.');
    }
  };

  const handleReaction = async (reaction: 'like' | 'dislike') => {
    if (!user) return alert('로그인이 필요합니다.');
    // 게시글 반응 API 구현 시 연동 (현재는 UI만)
    alert('준비 중인 기능입니다.');
  };

  if (isLoading) return (
    <div className="py-40 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4 opacity-20" />
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Decrypting...</span>
    </div>
  );

  if (!post) return null;

  return (
    <div className="max-w-5xl mx-auto pb-40 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4">
      {/* ── 상단 네비게이션 ── */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate('/board')} 
          className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 hover:border-blue-100 hover:shadow-sm transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <button className="p-3 text-slate-400 hover:text-blue-600 transition-all">
            <Share2 size={20} />
          </button>
          {(user?.id === post.author_id || user?.role === 'admin') && (
            <button 
              onClick={handleDelete}
              className="p-3 text-slate-300 hover:text-red-500 transition-all"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
      </div>

      {/* ── 메인 게시글 카드 ── */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl shadow-blue-500/5 overflow-hidden">
        <div className="p-8 md:p-16">
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black tracking-widest rounded-xl uppercase">
              {post.category || 'General Discussion'}
            </span>
            <span className="px-4 py-1.5 bg-slate-50 text-slate-400 text-[10px] font-black tracking-widest rounded-xl uppercase flex items-center gap-2">
              <ShieldCheck size={12} /> Verified Intel
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight tracking-tight mb-10 uppercase">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 mb-12 py-6 border-y border-slate-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black text-xs">
                {post.author_name?.[0].toUpperCase()}
              </div>
              <span className="text-sm font-black text-slate-700">{post.author_name} 요원</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
              <Clock size={14} />
              {format(new Date(post.created_at), 'yyyy.MM.dd HH:mm')}
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-xs font-bold ml-auto">
              <Eye size={14} />
              조회 {post.view_count}
            </div>
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg md:text-xl text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
              {post.content}
            </p>
          </div>

          <div className="mt-16 flex justify-center gap-4">
            <button 
              onClick={() => handleReaction('like')}
              className="flex items-center gap-2 px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
            >
              <ThumbsUp size={20} />
              공감 0
            </button>
            <button 
              onClick={() => handleReaction('dislike')}
              className="flex items-center gap-2 px-8 py-4 bg-slate-50 text-slate-500 rounded-2xl font-black hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100"
            >
              <ThumbsDown size={20} />
              반대 0
            </button>
          </div>
        </div>

        {/* ── 댓글 섹션 ── */}
        <div className="bg-slate-50/50 border-t border-slate-100 p-8 md:p-16">
          <CommentSection postId={post.id} />
        </div>
      </div>
    </div>
  );
}
