import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type AdminTab = 'posts' | 'comments' | 'users' | 'media'
type MediaType = 'youtube' | 'podcast' | 'music'
type UserRole = 'user' | 'editor' | 'admin'

interface MockUser { id: number; username: string; email: string; role: UserRole; is_active: boolean; created_at: string }
interface MockPost { id: number; title: string; author: string; category: string; created_at: string; comments: number; pinned: boolean }
interface MockComment { id: number; postTitle: string; author: string; content: string; created_at: string; reported: boolean }
interface MediaItem { id: number; type: MediaType; title: string; description: string; url: string; author: string; category: string; duration: string }

// ─────────────────────────────────────────────
// 목업 데이터 (실제는 API로 교체)
// ─────────────────────────────────────────────
const INIT_USERS: MockUser[] = [
  { id: 1, username: '관리자', email: 'admin@agora.com', role: 'admin', is_active: true, created_at: '2026-01-01' },
  { id: 2, username: '김철수', email: 'kim@example.com', role: 'editor', is_active: true, created_at: '2026-01-15' },
  { id: 3, username: '이영희', email: 'lee@example.com', role: 'user', is_active: true, created_at: '2026-02-01' },
  { id: 4, username: '박민수', email: 'park@example.com', role: 'user', is_active: false, created_at: '2026-02-10' },
  { id: 5, username: '최지혜', email: 'choi@example.com', role: 'user', is_active: true, created_at: '2026-02-15' },
]

const INIT_POSTS: MockPost[] = [
  { id: 1, title: '연준 금리 동결 결정…시장 반응은?', author: '관리자', category: '경제', created_at: '2026-02-18', comments: 12, pinned: true },
  { id: 2, title: 'OpenAI GPT-5 출시 일정 공식 발표', author: '김철수', category: '기술', created_at: '2026-02-18', comments: 8, pinned: false },
  { id: 3, title: '한미 정상회담 경제 안보 협력 강화', author: '관리자', category: '정치', created_at: '2026-02-17', comments: 5, pinned: false },
  { id: 4, title: '국제유가 배럴당 90달러 돌파', author: '이영희', category: '글로벌', created_at: '2026-02-17', comments: 3, pinned: false },
  { id: 5, title: '현대차 전기차 판매 목표 상향 조정', author: '김철수', category: '산업', created_at: '2026-02-16', comments: 7, pinned: false },
]

const INIT_COMMENTS: MockComment[] = [
  { id: 1, postTitle: '연준 금리 동결 결정', author: '이영희', content: '정말 예상했던 결과네요. 하반기가 더 기대됩니다.', created_at: '2026-02-18', reported: false },
  { id: 2, postTitle: 'OpenAI GPT-5 출시', author: '박민수', content: '이건 광고 아닌가요? 삭제해주세요!!', created_at: '2026-02-18', reported: true },
  { id: 3, postTitle: '한미 정상회담', author: '최지혜', content: '반도체 협력이 더 확대되었으면 합니다.', created_at: '2026-02-17', reported: false },
  { id: 4, postTitle: '국제유가 90달러', author: '김철수', content: '물가에 영향 없을지 걱정되네요.', created_at: '2026-02-17', reported: false },
  { id: 5, postTitle: '연준 금리 동결 결정', author: '이영희', content: '스팸 링크입니다 → http://spam.com', created_at: '2026-02-18', reported: true },
]

const INIT_MEDIA: MediaItem[] = [
  { id: 1, type: 'youtube', title: '2024 글로벌 경제 전망 분석', description: '경제 전문가 심층 분석', url: 'dQw4w9WgXcQ', author: 'Bloomberg Korea', category: '경제', duration: '18:32' },
  { id: 2, type: 'youtube', title: 'AI 기술 혁신의 현재와 미래', description: '생성형 AI 산업 분석', url: 'jNQXAC9IVRw', author: 'TechInsight', category: '기술', duration: '24:10' },
  { id: 3, type: 'podcast', title: '아침 경제 브리핑 EP.142', description: '오늘의 경제 뉴스 15분 요약', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', author: '모닝독 팟캐스트', category: '경제', duration: '15:04' },
  { id: 4, type: 'music', title: 'Focus Flow — Lo-fi Study Beats', description: '집중력 향상 로파이 믹스', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', author: 'ChillBeats', category: '로파이', duration: '1:02:14' },
]

// ─────────────────────────────────────────────
// 공통: 섹션 카드 래퍼
// ─────────────────────────────────────────────
function SectionCard({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm">
      <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
        <h3 className="font-semibold text-stone-800">{title}</h3>
        {count !== undefined && (
          <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">총 {count}건</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 역할 뱃지
// ─────────────────────────────────────────────
function RoleBadge({ role }: { role: UserRole }) {
  const c = { admin: 'bg-red-100 text-red-700', editor: 'bg-blue-100 text-blue-700', user: 'bg-stone-100 text-stone-600' }
  const l = { admin: '관리자', editor: '에디터', user: '일반' }
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c[role]}`}>{l[role]}</span>
}

// ─────────────────────────────────────────────
// 미디어 폼 모달
// ─────────────────────────────────────────────
const EMPTY_MEDIA: Omit<MediaItem, 'id'> = { type: 'youtube', title: '', description: '', url: '', author: '', category: '', duration: '' }

function MediaModal({ item, onSave, onClose }: {
  item?: MediaItem
  onSave: (data: Omit<MediaItem, 'id'>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Omit<MediaItem, 'id'>>(item ? { ...item } : { ...EMPTY_MEDIA })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.url) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">{item ? '미디어 수정' : '미디어 추가'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">미디어 유형</label>
            <select name="type" value={form.type} onChange={handleChange}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
              <option value="youtube">YouTube</option>
              <option value="podcast">팟캐스트</option>
              <option value="music">집중 음악</option>
            </select>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">제목 *</label>
            <input name="title" value={form.title} onChange={handleChange} required
              placeholder="미디어 제목"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              URL / ID *
              <span className="text-stone-400 ml-1 font-normal">
                {form.type === 'youtube' ? '(YouTube 영상 ID: dQw4w9WgXcQ)' : '(오디오 파일 URL)'}
              </span>
            </label>
            <input name="url" value={form.url} onChange={handleChange} required
              placeholder={form.type === 'youtube' ? 'YouTube 영상 ID' : 'https://...mp3'}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
          </div>

          {/* 제작자/출처 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">제작자/출처</label>
              <input name="author" value={form.author} onChange={handleChange}
                placeholder="채널명"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">카테고리</label>
              <input name="category" value={form.category} onChange={handleChange}
                placeholder="경제, 기술..."
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>

          {/* 시간/설명 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">재생시간</label>
              <input name="duration" value={form.duration} onChange={handleChange}
                placeholder="18:32"
                className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">설명</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={2}
              placeholder="간략한 설명"
              className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition-colors">
              취소
            </button>
            <button type="submit"
              className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors font-medium">
              {item ? '수정 완료' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 관리자 페이지
// ─────────────────────────────────────────────
export default function Admin() {
  const { user, logout } = useAuth()

  // ✅ 관리자 권한 체크
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  const [activeTab, setActiveTab] = useState<AdminTab>('posts')
  const [users, setUsers] = useState<MockUser[]>(INIT_USERS)
  const [posts, setPosts] = useState<MockPost[]>(INIT_POSTS)
  const [comments, setComments] = useState<MockComment[]>(INIT_COMMENTS)
  const [media, setMedia] = useState<MediaItem[]>(INIT_MEDIA)
  const [mediaModal, setMediaModal] = useState<{ open: boolean; item?: MediaItem }>({ open: false })
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType | 'all'>('all')

  // ✅ 사용자 역할 변경
  const changeRole = (id: number, role: UserRole) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
  }

  // ✅ 사용자 활성/차단 토글
  const toggleUser = (id: number) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
  }

  // ✅ 게시글 상단고정 토글
  const togglePin = (id: number) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, pinned: !p.pinned } : p))
  }

  // ✅ 게시글 삭제
  const deletePost = (id: number) => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  // ✅ 댓글 삭제
  const deleteComment = (id: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    setComments(prev => prev.filter(c => c.id !== id))
  }

  // ✅ 미디어 저장 (추가/수정)
  const saveMedia = (data: Omit<MediaItem, 'id'>) => {
    if (mediaModal.item) {
      setMedia(prev => prev.map(m => m.id === mediaModal.item!.id ? { ...m, ...data } : m))
    } else {
      setMedia(prev => [...prev, { ...data, id: Date.now() }])
    }
    setMediaModal({ open: false })
  }

  // ✅ 미디어 삭제
  const deleteMedia = (id: number) => {
    if (!confirm('미디어를 삭제하시겠습니까?')) return
    setMedia(prev => prev.filter(m => m.id !== id))
  }

  const filteredMedia = mediaTypeFilter === 'all' ? media : media.filter(m => m.type === mediaTypeFilter)

  const TABS: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'posts', label: '게시글', icon: '📄' },
    { key: 'comments', label: '댓글', icon: '💬' },
    { key: 'users', label: '회원', icon: '👥' },
    { key: 'media', label: '미디어', icon: '🎬' },
  ]

  const MEDIA_TYPE_ICONS: Record<MediaType, string> = { youtube: '▶', podcast: '🎙', music: '🎵' }
  const MEDIA_TYPE_LABELS: Record<MediaType, string> = { youtube: 'YouTube', podcast: '팟캐스트', music: '음악' }

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {mediaModal.open && (
        <MediaModal item={mediaModal.item} onSave={saveMedia} onClose={() => setMediaModal({ open: false })} />
      )}

      {/* ─── 헤더 ─── */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-stone-800">아고라</Link>
            <nav className="hidden sm:flex gap-1">
              <Link to="/" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">뉴스</Link>
              <Link to="/media" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">미디어</Link>
              <span className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-medium">관리자</span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">ADMIN</span>
            <button onClick={logout}
              className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 상단 통계 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: '전체 회원', value: users.length, sub: `활성 ${users.filter(u=>u.is_active).length}`, color: 'text-blue-600' },
            { label: '게시글', value: posts.length, sub: `고정 ${posts.filter(p=>p.pinned).length}`, color: 'text-amber-600' },
            { label: '댓글', value: comments.length, sub: `신고 ${comments.filter(c=>c.reported).length}`, color: 'text-green-600' },
            { label: '미디어', value: media.length, sub: `YouTube ${media.filter(m=>m.type==='youtube').length}`, color: 'text-purple-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-stone-400">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-stone-400 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-1 mb-5 bg-white border border-stone-200 rounded-xl p-1 w-fit">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${activeTab === tab.key ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* ════ 게시글 관리 탭 ════ */}
        {activeTab === 'posts' && (
          <SectionCard title="게시글 관리" count={posts.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left">
                    <th className="pb-3 text-xs font-medium text-stone-400">제목</th>
                    <th className="pb-3 text-xs font-medium text-stone-400 hidden sm:table-cell">작성자</th>
                    <th className="pb-3 text-xs font-medium text-stone-400 hidden md:table-cell">카테고리</th>
                    <th className="pb-3 text-xs font-medium text-stone-400 hidden md:table-cell">날짜</th>
                    <th className="pb-3 text-xs font-medium text-stone-400">댓글</th>
                    <th className="pb-3 text-xs font-medium text-stone-400">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {posts.map(post => (
                    <tr key={post.id} className="hover:bg-stone-50/50">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-1.5">
                          {post.pinned && <span className="text-xs text-amber-600">📌</span>}
                          <span className="text-stone-700 truncate max-w-[180px]">{post.title}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-stone-500 hidden sm:table-cell">{post.author}</td>
                      <td className="py-3 pr-4 hidden md:table-cell">
                        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{post.category}</span>
                      </td>
                      <td className="py-3 pr-4 text-stone-400 text-xs hidden md:table-cell">{post.created_at}</td>
                      <td className="py-3 pr-4 text-stone-500">{post.comments}</td>
                      <td className="py-3">
                        <div className="flex gap-1">
                          <button onClick={() => togglePin(post.id)}
                            className={`text-xs px-2 py-1 rounded-md transition-colors
                              ${post.pinned ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500 hover:bg-amber-50 hover:text-amber-600'}`}>
                            {post.pinned ? '고정 해제' : '고정'}
                          </button>
                          <button onClick={() => deletePost(post.id)}
                            className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ════ 댓글 관리 탭 ════ */}
        {activeTab === 'comments' && (
          <SectionCard title="댓글 관리" count={comments.length}>
            <div className="space-y-3">
              {comments.map(comment => (
                <div key={comment.id}
                  className={`p-4 rounded-lg border ${comment.reported ? 'border-red-200 bg-red-50' : 'border-stone-100 bg-stone-50/50'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-stone-700">{comment.author}</span>
                        <span className="text-xs text-stone-400">·</span>
                        <span className="text-xs text-stone-400 truncate max-w-[150px]">{comment.postTitle}</span>
                        <span className="text-xs text-stone-400">{comment.created_at}</span>
                        {comment.reported && (
                          <span className="text-xs bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full font-medium">🚨 신고됨</span>
                        )}
                      </div>
                      <p className="text-sm text-stone-600">{comment.content}</p>
                    </div>
                    <button onClick={() => deleteComment(comment.id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors shrink-0">
                      삭제
                    </button>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-center text-stone-400 py-8">댓글이 없습니다.</p>
              )}
            </div>
          </SectionCard>
        )}

        {/* ════ 회원 관리 탭 ════ */}
        {activeTab === 'users' && (
          <SectionCard title="회원 관리" count={users.length}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left">
                    <th className="pb-3 text-xs font-medium text-stone-400">사용자</th>
                    <th className="pb-3 text-xs font-medium text-stone-400 hidden sm:table-cell">이메일</th>
                    <th className="pb-3 text-xs font-medium text-stone-400">역할</th>
                    <th className="pb-3 text-xs font-medium text-stone-400">상태</th>
                    <th className="pb-3 text-xs font-medium text-stone-400 hidden md:table-cell">가입일</th>
                    <th className="pb-3 text-xs font-medium text-stone-400">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-stone-50/50">
                      <td className="py-3 pr-4 font-medium text-stone-700">{u.username}</td>
                      <td className="py-3 pr-4 text-stone-400 text-xs hidden sm:table-cell">{u.email}</td>
                      <td className="py-3 pr-4">
                        <select value={u.role}
                          onChange={e => changeRole(u.id, e.target.value as UserRole)}
                          disabled={u.id === user?.id}
                          className="text-xs border border-stone-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50">
                          <option value="user">일반</option>
                          <option value="editor">에디터</option>
                          <option value="admin">관리자</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full
                          ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
                          {u.is_active ? '활성' : '차단'}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-stone-400 text-xs hidden md:table-cell">{u.created_at}</td>
                      <td className="py-3">
                        <button
                          onClick={() => toggleUser(u.id)}
                          disabled={u.id === user?.id}
                          className={`text-xs px-3 py-1 rounded-md transition-colors disabled:opacity-30
                            ${u.is_active
                              ? 'bg-red-50 text-red-500 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                          {u.is_active ? '차단' : '해제'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ════ 미디어 관리 탭 ════ */}
        {activeTab === 'media' && (
          <SectionCard title="미디어 관리" count={media.length}>
            {/* 필터 + 추가 버튼 */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex gap-1">
                {(['all', 'youtube', 'podcast', 'music'] as const).map(t => (
                  <button key={t} onClick={() => setMediaTypeFilter(t)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors
                      ${mediaTypeFilter === t ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                    {t === 'all' ? '전체' : MEDIA_TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
              <button onClick={() => setMediaModal({ open: true })}
                className="text-xs px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium">
                + 미디어 추가
              </button>
            </div>

            {/* 미디어 목록 */}
            <div className="space-y-2">
              {filteredMedia.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 border border-stone-100 rounded-lg hover:bg-stone-50/50 transition-colors">
                  {/* 타입 아이콘 */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0
                    ${item.type === 'youtube' ? 'bg-red-50' : item.type === 'podcast' ? 'bg-violet-50' : 'bg-emerald-50'}`}>
                    {MEDIA_TYPE_ICONS[item.type]}
                  </div>

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-700 truncate">{item.title}</span>
                      <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full shrink-0">
                        {MEDIA_TYPE_LABELS[item.type]}
                      </span>
                      {item.category && (
                        <span className="text-xs text-stone-400 shrink-0">{item.category}</span>
                      )}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">{item.author} · {item.duration}</p>
                    <p className="text-xs text-stone-300 truncate max-w-xs">{item.url}</p>
                  </div>

                  {/* 수정/삭제 */}
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setMediaModal({ open: true, item })}
                      className="text-xs px-2.5 py-1.5 bg-stone-100 text-stone-600 rounded-md hover:bg-amber-100 hover:text-amber-700 transition-colors">
                      수정
                    </button>
                    <button onClick={() => deleteMedia(item.id)}
                      className="text-xs px-2.5 py-1.5 bg-red-50 text-red-500 rounded-md hover:bg-red-100 transition-colors">
                      삭제
                    </button>
                  </div>
                </div>
              ))}

              {filteredMedia.length === 0 && (
                <div className="text-center py-10 text-stone-400">
                  <p className="text-3xl mb-2">🎬</p>
                  <p className="text-sm">미디어가 없습니다. 추가해보세요.</p>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </main>
    </div>
  )
}