import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPostsAPI, Post } from '../lib/api'
import { MessageSquare, User, Clock, Eye, Search, PenSquare, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Loader2, Sparkles } from 'lucide-react'

const BOARD_CATEGORIES = ['전체', '뉴스 분석', '자유', '정보', '질문', '유머', '기타']

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '방금'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  if (d.getFullYear() === now.getFullYear()) return `${mm}.${dd}`
  return `${d.getFullYear()}.${mm}.${dd}`
}

const CAT_COLORS: Record<string, string> = {
  '자유': 'text-stone-500', '정보': 'text-blue-600', '질문': 'text-amber-600',
  '유머': 'text-pink-500', '기타': 'text-stone-400', '뉴스 분석': 'text-emerald-600'
}

export default function Board() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [category, setCategory] = useState('전체')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    setIsLoading(true)
    // 🔥 [통합 지휘 로직] 전체 또는 뉴스 분석 선택 시 'news'와 'board' 타입을 모두 아우르도록 요청
    const params: Record<string, string | number> = { page, limit: 25 }
    
    if (category === '뉴스 분석') {
      params.type = 'news'
    } else if (category === '전체') {
      // 백엔드에서 type 미지정 시 전체를 가져오도록 처리 (또는 API 스펙에 맞춰 조정)
      params.type = '' 
    } else {
      params.type = 'board'
      params.category = category
    }

    getPostsAPI(params).then(res => {
      if (res.success) {
        setPosts(res.posts)
        setPagination(res.pagination)
      }
    }).finally(() => setIsLoading(false))
  }, [category, page])

  const filteredPosts = searchQuery
    ? posts.filter(p => p.title.includes(searchQuery) || p.author_name.includes(searchQuery))
    : posts

  const changePage = (p: number) => { setPage(p); window.scrollTo(0, 0) }
  const changeCategory = (cat: string) => { setCategory(cat); setPage(1) }

  const handlePostClick = (post: Post) => {
    navigate(`/board/${post.id}`)
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-amber-600" />
            Agora Discussion Room
          </h2>
          <p className="text-sm text-stone-400 font-medium mt-1">지능 보고서와 연동된 실시간 요원 토론 게시판</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <form onSubmit={e => { e.preventDefault(); setSearchQuery(searchInput) }}>
              <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="검색..." className="pl-9 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500/20 w-48 font-medium shadow-sm" />
            </form>
          </div>
          <button onClick={() => navigate('/board/write')} className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg">
            <PenSquare className="w-4 h-4" /> New Post
          </button>
        </div>
      </div>

      <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="flex border-b border-stone-100 bg-stone-50/50 overflow-x-auto no-scrollbar">
          {BOARD_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => changeCategory(cat)} className={`px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 whitespace-nowrap ${category === cat ? 'border-amber-600 text-amber-600 bg-white' : 'border-transparent text-stone-400 hover:text-stone-600'}`}>{cat}</button>
          ))}
        </div>

        <div className="divide-y divide-stone-50">
          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="w-10 h-10 text-stone-200 animate-spin mx-auto" /></div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-20 text-center text-stone-400 font-medium italic">공유된 데이터가 없습니다.</div>
          ) : (
            filteredPosts.map((post, idx) => (
              <div 
                key={post.id} 
                onClick={() => handlePostClick(post)}
                className={`flex items-center gap-4 px-8 py-5 hover:bg-stone-50/50 transition-colors cursor-pointer ${post.type === 'news' ? 'bg-emerald-50/10' : ''}`}
              >
                <div className="hidden sm:flex w-10 text-xs font-mono text-stone-300">
                  {pagination.total - ((page - 1) * 25) - idx}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {post.type === 'news' ? (
                      <span className="flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        <Sparkles className="w-3 h-3" /> INTEL
                      </span>
                    ) : (
                      <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${CAT_COLORS[post.category]?.replace('text-', 'bg-').replace('-600', '-50') || 'bg-stone-100'} ${CAT_COLORS[post.category] || 'text-stone-500'}`}>{post.category}</span>
                    )}
                    <h3 className={`text-sm font-bold truncate leading-snug ${post.type === 'news' ? 'text-primary-900' : 'text-stone-800'}`}>{post.title}</h3>
                    {post.comment_count > 0 && <span className="text-[10px] font-black text-amber-600">[{post.comment_count}]</span>}
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-black text-stone-400 uppercase tracking-tighter">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author_name}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(post.created_at)}</span>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-4 text-stone-300">
                  <div className="flex flex-col items-center min-w-[40px]"><Eye className="w-3.5 h-3.5" /><span className="text-[9px] font-black mt-1">{post.view_count}</span></div>
                  <div className="flex flex-col items-center min-w-[40px]"><MessageSquare className="w-3.5 h-3.5" /><span className="text-[9px] font-black mt-1">{post.comment_count}</span></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 pt-4">
          <button onClick={() => changePage(page - 1)} disabled={page === 1} className="p-2 text-stone-400 hover:text-stone-900 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => changePage(page + 1)} disabled={page === pagination.totalPages} className="p-2 text-stone-400 hover:text-stone-900 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  )
}
