import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getPostsAPI, getPostAPI, Post } from '../lib/api'

const NEWS_CATEGORIES = ['전체', '경제', '기술', '정치', '글로벌', '산업']

const CAT_BADGE: Record<string, string> = {
  경제: 'bg-amber-100 text-amber-700', 기술: 'bg-blue-100 text-blue-700',
  정치: 'bg-red-100 text-red-700', 글로벌: 'bg-green-100 text-green-700',
  산업: 'bg-purple-100 text-purple-700',
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`
  return `${Math.floor(diff / 86400000)}일 전`
}

export default function News() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [category, setCategory] = useState('전체')
  const [selected, setSelected] = useState<Post | null>(null)
  const [selectedComments, setSelectedComments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const params: Record<string, string | number> = { type: 'news', limit: 20 }
    if (category !== '전체') params.category = category
    getPostsAPI(params).then(res => {
      if (res.success) setPosts(res.posts)
    }).finally(() => setIsLoading(false))
  }, [category])

  const handleSelect = async (post: Post) => {
    setSelected(post)
    const res = await getPostAPI(post.id)
    if (res.success) {
      setSelected(res.post)
      setSelectedComments(res.comments)
    }
    window.scrollTo(0, 0)
  }

  const pinnedPost = posts.find(p => p.pinned)
  const normalPosts = posts.filter(p => !p.pinned)

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* 헤더 */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-stone-800 tracking-tight">아고라</span>
            <nav className="hidden sm:flex gap-1">
              <span className="text-sm px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium">뉴스</span>
              <Link to="/board" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">게시판</Link>
              <Link to="/media" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">미디어</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-sm px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 font-medium">관리자</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500 hidden sm:inline">{user?.username}</span>
            <button onClick={logout}
              className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg">로그아웃</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* ── 기사 상세 뷰 ── */}
        {selected && (
          <div className="bg-white border border-stone-200 rounded-xl shadow-sm mb-6">
            {/* 닫기 + 뒤로 */}
            <div className="px-6 py-3 border-b border-stone-100 flex items-center justify-between">
              <button onClick={() => setSelected(null)}
                className="text-sm text-stone-500 hover:text-stone-700 flex items-center gap-1">
                ← 목록으로
              </button>
              {selected.source && (
                <span className="text-xs text-stone-400">출처: {selected.source}</span>
              )}
            </div>
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CAT_BADGE[selected.category] || 'bg-stone-100 text-stone-500'}`}>
                  {selected.category}
                </span>
                <span className="text-xs text-stone-400">{timeAgo(selected.created_at)} · 조회 {selected.view_count.toLocaleString()}</span>
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2 leading-snug">{selected.title}</h2>
              <p className="text-xs text-stone-400 mb-5">by {selected.author_name}</p>
              <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-wrap border-t border-stone-100 pt-5">
                {selected.content}
              </div>
            </div>
            {/* 댓글 */}
            {selectedComments.length > 0 && (
              <div className="px-6 py-4 border-t border-stone-100 bg-stone-50/50 rounded-b-xl">
                <h3 className="text-sm font-semibold text-stone-600 mb-3">
                  댓글 {selectedComments.filter(c => !c.is_deleted).length}
                </h3>
                <div className="space-y-2">
                  {selectedComments.filter(c => !c.parent_id).map(c => (
                    <div key={c.id} className="text-sm">
                      <span className="font-medium text-stone-700">{c.author_name}</span>
                      <span className="text-stone-500 ml-2">{c.content}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── 카테고리 필터 ── */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {NEWS_CATEGORIES.map(cat => (
            <button key={cat} onClick={() => { setCategory(cat); setSelected(null) }}
              className={`text-sm px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium
                ${category === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-600'}`}>
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-stone-400">로딩 중...</div>
        ) : (
          <>
            {/* ── 헤드라인 (고정 기사) ── */}
            {pinnedPost && !selected && (
              <div className="mb-5 cursor-pointer" onClick={() => handleSelect(pinnedPost)}>
                <div className="bg-white border border-amber-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded font-medium">헤드라인</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CAT_BADGE[pinnedPost.category] || 'bg-stone-100 text-stone-500'}`}>
                      {pinnedPost.category}
                    </span>
                    <span className="text-xs text-stone-400">{timeAgo(pinnedPost.created_at)}</span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-800 mb-1 hover:text-amber-700">{pinnedPost.title}</h2>
                  <p className="text-sm text-stone-500 line-clamp-2">
                    {pinnedPost.content.substring(0, 120)}...
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-stone-400">
                    <span>{pinnedPost.source}</span>
                    <span>조회 {pinnedPost.view_count.toLocaleString()}</span>
                    <span>댓글 {pinnedPost.comment_count || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── 기사 카드 그리드 ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(category === '전체' && !selected ? normalPosts : posts.filter(p => !p.pinned)).map(post => (
                <div key={post.id}
                  onClick={() => handleSelect(post)}
                  className={`bg-white border rounded-xl p-4 shadow-sm cursor-pointer transition-all duration-200
                    ${selected?.id === post.id
                      ? 'border-amber-400 shadow-amber-100 shadow-md'
                      : 'border-stone-200 hover:shadow-md hover:border-stone-300'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CAT_BADGE[post.category] || 'bg-stone-100 text-stone-500'}`}>
                      {post.category}
                    </span>
                    <span className="text-xs text-stone-400">{timeAgo(post.created_at)}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-stone-800 leading-snug mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-stone-400 line-clamp-2 mb-3">
                    {post.content.substring(0, 80)}...
                  </p>
                  <div className="flex items-center justify-between text-xs text-stone-400">
                    <span>{post.source || post.author_name}</span>
                    <div className="flex gap-2">
                      <span>👁 {post.view_count.toLocaleString()}</span>
                      <span>💬 {post.comment_count || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {posts.length === 0 && (
              <div className="text-center py-20 text-stone-400">해당 카테고리의 뉴스가 없습니다.</div>
            )}
          </>
        )}
      </main>
    </div>
  )
}