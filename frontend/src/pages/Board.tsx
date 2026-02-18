import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPostsAPI, Post } from '../lib/api'

const BOARD_CATEGORIES = ['전체', '자유', '정보', '질문', '유머', '기타']

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
  자유: 'text-stone-500', 정보: 'text-blue-600', 질문: 'text-amber-600',
  유머: 'text-pink-500', 기타: 'text-stone-400',
}

export default function Board() {
  const { user, logout } = useAuth()
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
    const params: Record<string, string | number> = { type: 'board', page, limit: 25 }
    if (category !== '전체') params.category = category
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

  // 페이지 변경 시 상단 스크롤
  const changePage = (p: number) => { setPage(p); window.scrollTo(0, 0) }
  const changeCategory = (cat: string) => { setCategory(cat); setPage(1) }

  return (
    <div className="min-h-screen bg-[#F2F2F2]">
      {/* ── 헤더 ── */}
      <header className="bg-white border-b border-stone-300 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-3 h-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-bold text-stone-800">아고라</Link>
            <span className="text-stone-300">|</span>
            <nav className="flex gap-0.5 text-sm">
              <Link to="/" className="px-2.5 py-1 rounded text-stone-500 hover:bg-stone-100">뉴스</Link>
              <span className="px-2.5 py-1 rounded bg-stone-800 text-white font-medium">게시판</span>
              <Link to="/media" className="px-2.5 py-1 rounded text-stone-500 hover:bg-stone-100">미디어</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="px-2.5 py-1 rounded text-red-600 hover:bg-red-50 font-medium">관리자</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 hidden sm:inline">{user?.username}</span>
            <button onClick={logout} className="text-xs px-2 py-1 bg-stone-100 rounded text-stone-500 hover:bg-stone-200">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 py-4">
        {/* ── 게시판 헤더 ── */}
        <div className="bg-white border border-stone-300 rounded mb-1">
          {/* 게시판 타이틀 */}
          <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-base font-bold text-stone-800">자유게시판</h1>
            <div className="flex items-center gap-2">
              {/* 검색 */}
              <form onSubmit={e => { e.preventDefault(); setSearchQuery(searchInput) }}
                className="flex gap-1">
                <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
                  placeholder="검색..."
                  className="text-xs px-2 py-1 border border-stone-200 rounded w-28 focus:outline-none focus:ring-1 focus:ring-amber-400" />
                <button type="submit"
                  className="text-xs px-2 py-1 bg-stone-600 text-white rounded hover:bg-stone-700">
                  검색
                </button>
                {searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(''); setSearchInput('') }}
                    className="text-xs px-2 py-1 bg-stone-100 text-stone-500 rounded hover:bg-stone-200">
                    초기화
                  </button>
                )}
              </form>
              {/* 글쓰기 */}
              <button onClick={() => navigate('/board/write')}
                className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 font-medium whitespace-nowrap">
                글쓰기
              </button>
            </div>
          </div>

          {/* 카테고리 탭 */}
          <div className="flex gap-0 border-b border-stone-200 overflow-x-auto">
            {BOARD_CATEGORIES.map(cat => (
              <button key={cat} onClick={() => changeCategory(cat)}
                className={`text-xs px-4 py-2 border-b-2 whitespace-nowrap transition-colors
                  ${category === cat
                    ? 'border-amber-600 text-amber-700 font-semibold bg-amber-50/50'
                    : 'border-transparent text-stone-500 hover:text-stone-800 hover:bg-stone-50'}`}>
                {cat}
              </button>
            ))}
          </div>

          {/* ── 게시글 테이블 헤더 ── */}
          <div className="hidden sm:grid grid-cols-[40px_1fr_80px_70px_60px_60px] px-3 py-1.5 bg-stone-50 border-b border-stone-200">
            {['번호', '제목', '글쓴이', '날짜', '조회', '댓글'].map(h => (
              <span key={h} className="text-xs text-stone-400 font-medium text-center first:text-left">{h}</span>
            ))}
          </div>

          {/* ── 게시글 목록 ── */}
          {isLoading ? (
            <div className="py-12 text-center text-stone-400 text-sm">로딩 중...</div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-sm">게시글이 없습니다.</div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {filteredPosts.map((post, idx) => (
                <li key={post.id}
                  className={`grid grid-cols-[1fr] sm:grid-cols-[40px_1fr_80px_70px_60px_60px]
                    items-center px-3 py-2 hover:bg-amber-50/40 transition-colors
                    ${post.pinned ? 'bg-amber-50/30' : ''}`}>

                  {/* 번호 */}
                  <span className="hidden sm:block text-xs text-center text-stone-400">
                    {post.pinned ? (
                      <span className="text-amber-600 font-bold">공지</span>
                    ) : (
                      pagination.total - ((page - 1) * 25) - idx
                    )}
                  </span>

                  {/* 제목 */}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* 카테고리 태그 */}
                    <span className={`text-xs font-medium shrink-0 ${CAT_COLORS[post.category] || 'text-stone-400'}`}>
                      [{post.category}]
                    </span>
                    <Link to={`/board/${post.id}`}
                      className="text-sm text-stone-800 hover:text-amber-700 hover:underline truncate">
                      {post.title}
                    </Link>
                    {/* 새 댓글 */}
                    {post.comment_count && post.comment_count > 0 ? (
                      <span className="text-xs text-amber-600 font-medium shrink-0">
                        [{post.comment_count}]
                      </span>
                    ) : null}
                    {post.pinned && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded shrink-0">고정</span>
                    )}
                  </div>

                  {/* 글쓴이 */}
                  <span className="hidden sm:block text-xs text-stone-500 text-center truncate px-1">
                    {post.author_name}
                  </span>
                  {/* 날짜 */}
                  <span className="hidden sm:block text-xs text-stone-400 text-center">
                    {formatDate(post.created_at)}
                  </span>
                  {/* 조회 */}
                  <span className="hidden sm:block text-xs text-stone-400 text-center">
                    {post.view_count.toLocaleString()}
                  </span>
                  {/* 댓글 */}
                  <span className={`hidden sm:block text-xs text-center font-medium
                    ${post.comment_count && post.comment_count > 0 ? 'text-amber-600' : 'text-stone-300'}`}>
                    {post.comment_count || 0}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── 페이지네이션 ── */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-1 mt-3">
            <button onClick={() => changePage(1)} disabled={page === 1}
              className="text-xs px-2 py-1 border border-stone-300 rounded disabled:opacity-40 hover:bg-stone-100">
              «
            </button>
            <button onClick={() => changePage(page - 1)} disabled={page === 1}
              className="text-xs px-2 py-1 border border-stone-300 rounded disabled:opacity-40 hover:bg-stone-100">
              ‹
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => {
              const p = Math.max(1, page - 4) + i
              if (p > pagination.totalPages) return null
              return (
                <button key={p} onClick={() => changePage(p)}
                  className={`text-xs px-2.5 py-1 border rounded transition-colors
                    ${p === page
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'border-stone-300 hover:bg-stone-100 text-stone-600'}`}>
                  {p}
                </button>
              )
            })}
            <button onClick={() => changePage(page + 1)} disabled={page === pagination.totalPages}
              className="text-xs px-2 py-1 border border-stone-300 rounded disabled:opacity-40 hover:bg-stone-100">
              ›
            </button>
            <button onClick={() => changePage(pagination.totalPages)} disabled={page === pagination.totalPages}
              className="text-xs px-2 py-1 border border-stone-300 rounded disabled:opacity-40 hover:bg-stone-100">
              »
            </button>
          </div>
        )}
        <p className="text-center text-xs text-stone-400 mt-2">
          전체 {pagination.total}개 · {page}/{pagination.totalPages} 페이지
        </p>
      </main>
    </div>
  )
}