import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminStatsAPI, getAdminUsersAPI, changeUserRoleAPI, toggleUserAPI,
  getAdminPostsAPI, togglePinAPI, adminDeletePostAPI,
  getAdminCommentsAPI, adminDeleteCommentAPI,
  getMediaAPI, createMediaAPI, updateMediaAPI, deleteMediaAPI,
  MediaItem
} from '../lib/api'

type AdminTab = 'dashboard' | 'users' | 'posts' | 'comments' | 'media'

function Card({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl shadow-sm">
      <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between">
        <h3 className="font-semibold text-stone-800 text-sm">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const EMPTY_MEDIA = { type: 'youtube', title: '', description: '', url: '', author: '', category: '', duration: '', is_active: true }

function MediaModal({ item, onSave, onClose }: { item?: MediaItem; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item } : { ...EMPTY_MEDIA })
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h3 className="font-semibold text-stone-800">{item ? '미디어 수정' : '미디어 추가'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-2xl leading-none">x</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">미디어 유형</label>
            <select name="type" value={form.type} onChange={h}
              className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400">
              <option value="youtube">YouTube</option>
              <option value="podcast">팟캐스트</option>
              <option value="music">집중 음악</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">제목 *</label>
            <input name="title" value={form.title} onChange={h} required
              className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              URL / ID * {form.type === 'youtube' && <span className="text-stone-400 text-xs">(YouTube 영상 ID만)</span>}
            </label>
            <input name="url" value={form.url} onChange={h} required
              placeholder={form.type === 'youtube' ? 'dQw4w9WgXcQ' : 'https://...mp3'}
              className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">출처/제작자</label>
              <input name="author" value={form.author} onChange={h}
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-1">카테고리</label>
              <input name="category" value={form.category} onChange={h} placeholder="경제, 기술..."
                className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">재생시간</label>
            <input name="duration" value={form.duration} onChange={h} placeholder="18:32"
              className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">설명</label>
            <textarea name="description" value={form.description} onChange={h} rows={2}
              className="w-full text-sm px-3 py-2 border border-stone-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50">취소</button>
            <button type="submit"
              className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 font-medium">
              {item ? '수정 완료' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const { user, logout } = useAuth()

  if (!user) return <Navigate to="/login" replace />

  if (user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl border border-stone-200 shadow-sm max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <p className="font-semibold text-stone-800 mb-2">관리자 전용 페이지</p>
          <p className="text-sm text-stone-500 mb-4">현재 계정 역할: <b className="text-stone-700">{user.role}</b></p>
          <div className="bg-stone-100 rounded-lg p-3 text-left mb-5">
            <p className="text-xs text-stone-500 mb-1">관리자 권한 부여 방법:</p>
            <code className="text-xs font-mono text-stone-700 block">
              UPDATE users SET role='admin'<br/>
              WHERE email='{user.email}';
            </code>
          </div>
          <Link to="/" className="text-sm px-5 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-700 inline-block">
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [mediaModal, setMediaModal] = useState<{ open: boolean; item?: MediaItem }>({ open: false })
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(true)
    const loaders: Record<AdminTab, () => Promise<void>> = {
      dashboard: async () => { const r = await getAdminStatsAPI(); if (r.success) setStats(r.stats) },
      users: async () => { const r = await getAdminUsersAPI(); if (r.success) setUsers(r.users) },
      posts: async () => { const r = await getAdminPostsAPI(); if (r.success) setPosts(r.posts) },
      comments: async () => { const r = await getAdminCommentsAPI(); if (r.success) setComments(r.comments) },
      media: async () => { const r = await getMediaAPI(); if (r.success) setMedia(r.media) },
    }
    loaders[tab]().finally(() => setIsLoading(false))
  }, [tab])

  const handleRoleChange = async (id: number, role: string) => {
    const r = await changeUserRoleAPI(id, role)
    if (r.success) setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
  }
  const handleToggleUser = async (id: number) => {
    const r = await toggleUserAPI(id)
    if (r.success) setUsers(p => p.map(u => u.id === id ? { ...u, is_active: r.user.is_active } : u))
  }
  const handlePin = async (id: number) => {
    const r = await togglePinAPI(id)
    if (r.success) setPosts(p => p.map(x => x.id === id ? { ...x, pinned: r.post.pinned } : x))
  }
  const handleDeletePost = async (id: number) => {
    if (!confirm('게시글을 삭제하시겠습니까?')) return
    const r = await adminDeletePostAPI(id)
    if (r.success) setPosts(p => p.filter(x => x.id !== id))
  }
  const handleDeleteComment = async (id: number) => {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    const r = await adminDeleteCommentAPI(id)
    if (r.success) setComments(p => p.filter(c => c.id !== id))
  }
  const handleSaveMedia = async (data: any) => {
    if (mediaModal.item) {
      const r = await updateMediaAPI(mediaModal.item.id, data)
      if (r.success) setMedia(p => p.map(m => m.id === mediaModal.item!.id ? r.media : m))
    } else {
      const r = await createMediaAPI(data)
      if (r.success) setMedia(p => [...p, r.media])
    }
    setMediaModal({ open: false })
  }
  const handleDeleteMedia = async (id: number) => {
    if (!confirm('미디어를 삭제하시겠습니까?')) return
    const r = await deleteMediaAPI(id)
    if (r.success) setMedia(p => p.filter(m => m.id !== id))
  }

  const TABS: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'dashboard', label: '대시보드', icon: '📊' },
    { key: 'users', label: '회원관리', icon: '👥' },
    { key: 'posts', label: '게시글', icon: '📄' },
    { key: 'comments', label: '댓글', icon: '💬' },
    { key: 'media', label: '미디어', icon: '🎬' },
  ]
  const MEDIA_LABELS: Record<string, string> = { youtube: 'YouTube', podcast: '팟캐스트', music: '음악' }
  const MEDIA_ICONS: Record<string, string> = { youtube: '▶', podcast: '🎙', music: '🎵' }
  const filteredMedia = mediaTypeFilter === 'all' ? media : media.filter(m => m.type === mediaTypeFilter)

  function fmtDate(d: string) {
    const dt = new Date(d)
    return `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {mediaModal.open && (
        <MediaModal item={mediaModal.item} onSave={handleSaveMedia} onClose={() => setMediaModal({ open: false })} />
      )}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-stone-800">아고라</Link>
            <nav className="hidden sm:flex gap-1">
              <Link to="/" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">뉴스</Link>
              <Link to="/board" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">게시판</Link>
              <Link to="/media" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">미디어</Link>
              <span className="text-sm px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-medium">관리자 센터</span>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">ADMIN</span>
            <span className="text-sm text-stone-500 hidden sm:inline">{user.username}</span>
            <button onClick={logout} className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg">로그아웃</button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 bg-white border border-stone-200 rounded-xl p-1 w-fit shadow-sm flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${tab === t.key ? 'bg-stone-800 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin h-8 w-8 border-4 border-amber-600 border-t-transparent rounded-full" />
          </div>
        ) : (
          <>
            {tab === 'dashboard' && stats && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { label: '전체 회원', value: stats.users, icon: '👥', c: 'text-blue-600' },
                    { label: '게시글', value: stats.posts, icon: '📄', c: 'text-amber-600' },
                    { label: '댓글', value: stats.comments, icon: '💬', c: 'text-green-600' },
                    { label: '미디어', value: stats.media, icon: '🎬', c: 'text-purple-600' },
                    { label: '신고 댓글', value: stats.reportedComments, icon: '🚨', c: 'text-red-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm">
                      <p className="text-2xl mb-1">{s.icon}</p>
                      <p className={`text-2xl font-bold ${s.c}`}>{s.value}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Card title="빠른 이동">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TABS.filter(t => t.key !== 'dashboard').map(t => (
                      <button key={t.key} onClick={() => setTab(t.key)}
                        className="p-4 border border-stone-200 rounded-xl hover:bg-amber-50 hover:border-amber-300 transition-colors text-center">
                        <p className="text-2xl mb-1">{t.icon}</p>
                        <p className="text-sm font-medium text-stone-700">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {tab === 'users' && (
              <Card title="회원 관리" action={<span className="text-xs text-stone-400">총 {users.length}명</span>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-stone-100">
                      {['사용자','이메일','역할','상태','가입일','관리'].map(h => (
                        <th key={h} className="pb-3 text-xs font-medium text-stone-400 text-left pr-3">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-stone-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-stone-50/50">
                          <td className="py-3 pr-3 font-medium text-stone-700 text-sm">{u.username}</td>
                          <td className="py-3 pr-3 text-stone-400 text-xs">{u.email}</td>
                          <td className="py-3 pr-3">
                            <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                              disabled={u.id === user.id}
                              className="text-xs border border-stone-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-40">
                              <option value="user">일반</option>
                              <option value="editor">에디터</option>
                              <option value="admin">관리자</option>
                            </select>
                          </td>
                          <td className="py-3 pr-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
                              {u.is_active ? '활성' : '차단'}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-stone-400 text-xs">{fmtDate(u.created_at)}</td>
                          <td className="py-3">
                            <button onClick={() => handleToggleUser(u.id)} disabled={u.id === user.id}
                              className={`text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-30 ${u.is_active ? 'bg-red-50 text-red-500 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                              {u.is_active ? '차단' : '해제'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tab === 'posts' && (
              <Card title="게시글 관리" action={<span className="text-xs text-stone-400">총 {posts.length}건</span>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-stone-100">
                      {['유형','제목','작성자','날짜','조회','댓글','관리'].map(h => (
                        <th key={h} className="pb-3 text-xs font-medium text-stone-400 text-left pr-3">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-stone-50">
                      {posts.map(p => (
                        <tr key={p.id} className={`hover:bg-stone-50/50 ${p.pinned ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-3 pr-3">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.type === 'news' ? 'bg-blue-100 text-blue-600' : 'bg-stone-100 text-stone-500'}`}>
                              {p.type === 'news' ? '뉴스' : '게시판'}
                            </span>
                          </td>
                          <td className="py-3 pr-3 max-w-[160px]">
                            <div className="flex items-center gap-1">
                              {p.pinned && <span className="text-amber-600 text-xs">📌</span>}
                              <span className="text-stone-700 truncate text-xs">{p.title}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-3 text-stone-400 text-xs">{p.author_name}</td>
                          <td className="py-3 pr-3 text-stone-400 text-xs">{fmtDate(p.created_at)}</td>
                          <td className="py-3 pr-3 text-stone-400 text-xs">{p.view_count}</td>
                          <td className="py-3 pr-3 text-stone-400 text-xs">{p.comment_count}</td>
                          <td className="py-3">
                            <div className="flex gap-1">
                              <button onClick={() => handlePin(p.id)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${p.pinned ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500 hover:bg-amber-50 hover:text-amber-600'}`}>
                                {p.pinned ? '해제' : '고정'}
                              </button>
                              <button onClick={() => handleDeletePost(p.id)}
                                className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100">삭제</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tab === 'comments' && (
              <Card title="댓글 관리" action={
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${comments.filter(c=>c.reported).length > 0 ? 'bg-red-100 text-red-600' : 'bg-stone-100 text-stone-400'}`}>
                  신고 {comments.filter(c=>c.reported).length}건
                </span>}>
                <div className="space-y-2">
                  {comments.map(c => (
                    <div key={c.id} className={`p-3.5 rounded-xl border ${c.reported ? 'border-red-200 bg-red-50' : 'border-stone-100 bg-stone-50/50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-semibold text-stone-700">{c.author_name}</span>
                            <span className="text-xs text-stone-400 truncate">{c.post_title}</span>
                            <span className="text-xs text-stone-400">{fmtDate(c.created_at)}</span>
                            {c.reported && <span className="text-xs bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full">🚨 신고</span>}
                            {c.parent_id && <span className="text-xs bg-stone-200 text-stone-500 px-1.5 py-0.5 rounded-full">대댓글</span>}
                          </div>
                          <p className="text-sm text-stone-600">{c.content}</p>
                        </div>
                        <button onClick={() => handleDeleteComment(c.id)}
                          className="text-xs px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 shrink-0">삭제</button>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <div className="text-center py-10 text-stone-400 text-sm">댓글이 없습니다.</div>}
                </div>
              </Card>
            )}

            {tab === 'media' && (
              <Card title="미디어 관리" action={
                <button onClick={() => setMediaModal({ open: true })}
                  className="text-xs px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium">
                  + 미디어 추가
                </button>}>
                <div className="flex gap-1 mb-4 flex-wrap">
                  {['all','youtube','podcast','music'].map(t => (
                    <button key={t} onClick={() => setMediaTypeFilter(t)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${mediaTypeFilter === t ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                      {t === 'all' ? '전체' : MEDIA_LABELS[t]}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {filteredMedia.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-3.5 border border-stone-100 rounded-xl hover:bg-stone-50/50">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 ${m.type==='youtube'?'bg-red-50':m.type==='podcast'?'bg-violet-50':'bg-emerald-50'}`}>
                        {MEDIA_ICONS[m.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-stone-700 truncate">{m.title}</span>
                          <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full shrink-0">{MEDIA_LABELS[m.type]}</span>
                        </div>
                        <p className="text-xs text-stone-400">{m.author} · {m.duration}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => setMediaModal({ open: true, item: m })}
                          className="text-xs px-2.5 py-1.5 bg-stone-100 text-stone-600 rounded-lg hover:bg-amber-100 hover:text-amber-700 transition-colors">수정</button>
                        <button onClick={() => handleDeleteMedia(m.id)}
                          className="text-xs px-2.5 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors">삭제</button>
                      </div>
                    </div>
                  ))}
                  {filteredMedia.length === 0 && (
                    <div className="text-center py-12 text-stone-400"><p className="text-3xl mb-2">🎬</p><p className="text-sm">미디어가 없습니다.</p></div>
                  )}
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}