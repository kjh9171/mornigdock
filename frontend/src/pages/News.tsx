import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { getPostsAPI, getPostAPI } from '../lib/api';
import { Pin, MessageSquare, Music, Plus, Trash2, Globe, Shield } from 'lucide-react';

export default function News() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [category, setCategory] = useState('전체');
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [mediaList, setMediaList] = useState<{id: string, title: string}[]>([]); // ✅ 유튜브/팟캐스트 목록

  // ── [기능] 데이터 로딩 (AI 뉴스 & 게시판 통합) ──
  const fetchData = useCallback(async () => {
    const res = await getPostsAPI({ type: 'news', category: category !== '전체' ? category : undefined });
    if (res.success) setPosts(res.posts);
  }, [category]);

  useEffect(() => { fetchData() }, [fetchData]);

  // ── [기능] 대댓글 포함 상세 보기 ──
  const handleViewDetail = async (id: number) => {
    const res = await getPostAPI(id);
    if (res.success) {
      setSelectedPost(res.post);
      setComments(res.comments); // 백엔드에서 트리 구조 혹은 parent_id 포함 데이터 전송 가정
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── [미디어 센터] 유튜브 및 팟캐스트 관리 ── */}
      <section className="bg-stone-900 text-white p-5 rounded-2xl shadow-xl border border-white/5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="flex items-center gap-2 font-bold"><Music className="w-4 h-4 text-amber-400" /> Agora Media</h2>
          {user?.role === 'admin' && <button className="p-1 hover:bg-white/10 rounded"><Plus className="w-4 h-4" /></button>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {mediaList.map(m => (
            <div key={m.id} className="bg-white/5 p-3 rounded-xl flex justify-between items-center group">
              <span className="text-xs truncate">{m.title}</span>
              {user?.role === 'admin' && <Trash2 className="w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 cursor-pointer" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── [메인 피드] AI 뉴스 & 게시판 통합 리스트 ── */}
      <main className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-black text-stone-900 uppercase tracking-tighter">Live Insight</h1>
          <div className="flex gap-2">
             {['전체', '경제', '기술', '정치'].map(cat => (
               <button key={cat} onClick={() => setCategory(cat)} 
                 className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${category === cat ? 'bg-amber-600 text-white' : 'bg-white text-stone-400 border border-stone-200'}`}>
                 {cat}
               </button>
             ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map(post => (
            <div key={post.id} onClick={() => handleViewDetail(post.id)} 
              className="relative bg-white border border-stone-200 p-5 rounded-2xl hover:border-amber-400 transition-all cursor-pointer group">
              
              {/* 관리자 전용 속성 분기 */}
              {post.pinned && <Pin className="absolute top-4 right-4 w-4 h-4 text-amber-600" />}
              {user?.role === 'admin' && <Shield className="absolute top-4 right-10 w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100" />}

              <div className="flex items-center gap-2 mb-3">
                <span className="bg-stone-100 text-[9px] font-black px-1.5 py-0.5 rounded text-stone-500 uppercase">{post.category}</span>
                {post.is_ai && <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-1.5 py-0.5 rounded">AI NEWS</span>}
              </div>
              <h3 className="font-bold text-stone-900 mb-2 line-clamp-1">{post.title}</h3>
              <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">{post.content}</p>
            </div>
          ))}
        </div>
      </main>

      {/* ── [상세 모달] 대댓글 토론 시스템 ── */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[80vh] rounded-3xl overflow-y-auto p-8 shadow-2xl">
            <button onClick={() => setSelectedPost(null)} className="mb-4 text-sm font-bold text-stone-400 hover:text-stone-900">CLOSE</button>
            <h2 className="text-2xl font-black text-stone-900 mb-6 leading-tight">{selectedPost.title}</h2>
            <div className="text-stone-700 text-sm leading-loose whitespace-pre-wrap border-b border-stone-100 pb-8 mb-8">{selectedPost.content}</div>
            
            {/* 대댓글 영역 */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest">Discussion</h4>
              {comments.map(comment => (
                <div key={comment.id} className={`p-4 rounded-xl ${comment.parent_id ? 'ml-8 bg-stone-50 border-l-2 border-amber-200' : 'bg-stone-100'}`}>
                  <div className="flex justify-between mb-1">
                    <span className="text-[10px] font-bold">{comment.author_name}</span>
                    <span className="text-[9px] text-stone-400">Reply</span>
                  </div>
                  <p className="text-xs text-stone-600">{comment.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}