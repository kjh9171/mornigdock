import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminStatsAPI, getAdminUsersAPI, changeUserRoleAPI, toggleUserAPI,
  getAdminPostsAPI, togglePinAPI, adminDeletePostAPI,
  getAdminCommentsAPI, adminDeleteCommentAPI,
  getMediaAPI, createMediaAPI, updateMediaAPI, deleteMediaAPI,
  MediaItem, Post, createPostAPI
} from '../lib/api'
import { 
  Users, FileText, MessageSquare, Play, LayoutDashboard, 
  Search, Shield, Activity, Settings, Plus, Edit2, Trash2, 
  Lock, Unlock, Pin, Sparkles, Loader2, Mail, Globe, Clock
} from 'lucide-react'

type AdminTab = 'dashboard' | 'users' | 'posts' | 'comments' | 'media' | 'logs'

function Card({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <h3 className="font-bold text-stone-800 text-sm tracking-tight">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 게시글 추가/수정 모달
// ─────────────────────────────────────────────
function PostModal({ item, onSave, onClose }: { item?: any; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item } : { type: 'board', category: '자유', title: '', content: '', source: '' })
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="font-bold text-stone-800">{item ? '게시글 수정' : '새 게시글 작성'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">유형</label>
              <select name="type" value={form.type} onChange={h}
                className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold">
                <option value="board">일반 게시판</option>
                <option value="news">뉴스 인텔리전스</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">카테고리</label>
              <input name="category" value={form.category} onChange={h} placeholder="경제, 기술, 자유..."
                className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold" />
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">제목</label>
            <input name="title" value={form.title} onChange={h} required placeholder="글 제목을 입력하세요"
              className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold" />
          </div>
          {form.type === 'news' && (
            <div>
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">출처</label>
              <input name="source" value={form.source} onChange={h} placeholder="Reuters, Bloomberg 등"
                className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold" />
            </div>
          )}
          <div>
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">내용</label>
            <textarea name="content" value={form.content} onChange={h} rows={8} required placeholder="내용을 입력하세요"
              className="w-full text-sm px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium leading-relaxed" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-stone-200 text-stone-500 rounded-xl text-sm font-bold hover:bg-stone-50 transition-all">취소</button>
            <button type="submit"
              className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-stone-200">
              {item ? '수정 내용 저장' : '게시글 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const EMPTY_MEDIA = { type: 'youtube', title: '', description: '', url: '', author: '', category: '', duration: '', is_active: true }

function MediaModal({ item, onSave, onClose }: { item?: MediaItem; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item } : { ...EMPTY_MEDIA })
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50">
          <h3 className="font-bold text-stone-800">{item ? '미디어 수정' : '새 미디어 추가'}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">미디어 유형</label>
            <select name="type" value={form.type} onChange={h}
              className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold">
              <option value="youtube">YouTube (Video)</option>
              <option value="podcast">팟캐스트 (Audio)</option>
              <option value="music">집중 음악 (Audio)</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">제목</label>
            <input name="title" value={form.title} onChange={h} required
              className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold" />
          </div>
          <div>
            <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">
              URL / ID {form.type === 'youtube' && <span className="text-stone-400 lowercase font-medium">(ID만 입력)</span>}
            </label>
            <input name="url" value={form.url} onChange={h} required
              placeholder={form.type === 'youtube' ? 'dQw4w9WgXcQ' : 'https://...mp3'}
              className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">출처</label>
              <input name="author" value={form.author} onChange={h}
                className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold" />
            </div>
            <div>
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">재생시간</label>
              <input name="duration" value={form.duration} onChange={h} placeholder="18:32"
                className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-stone-200 text-stone-500 rounded-xl text-sm font-bold hover:bg-stone-50 transition-all">취소</button>
            <button type="submit"
              className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-black transition-all shadow-lg shadow-stone-200">
              저장
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
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [logs, setLogs] = useState<any[]>([])
  
  const [postModal, setPostModal] = useState<{ open: boolean; item?: any }>({ open: false })
  const [mediaModal, setMediaModal] = useState<{ open: boolean; item?: MediaItem }>({ open: false })
  
  const [isLoading, setIsLoading] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)

  const API_BASE = import.meta.env.VITE_API_URL || ''

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (tab === 'dashboard') {
        const res = await getAdminStatsAPI()
        if (res.success) setStats(res.stats)
      } else if (tab === 'users') {
        const res = await getAdminUsersAPI()
        if (res.success) setUsers(res.users)
      } else if (tab === 'posts') {
        const res = await getAdminPostsAPI()
        if (res.success) setPosts(res.posts)
      } else if (tab === 'comments') {
        const res = await getAdminCommentsAPI()
        if (res.success) setComments(res.comments)
      } else if (tab === 'media') {
        const res = await getMediaAPI()
        if (res.success) setMedia(res.media)
      } else if (tab === 'logs') {
        const res = await fetch(`${API_BASE}/api/admin/logs`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }).then(r => r.json())
        if (res.success) setLogs(res.logs)
      }
    } catch (err) {
      console.error('Data Load Error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { loadData() }, [tab])

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
  const handleSavePost = async (data: any) => {
    let r;
    if (postModal.item) {
      r = await fetch(`${API_BASE}/api/posts/${postModal.item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(data)
      }).then(res => res.json())
    } else {
      r = await createPostAPI(data)
    }
    if (r.success) {
      setPostModal({ open: false })
      loadData()
    }
  }
  const handleDeletePost = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return
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

  function fmtDate(d: string) {
    const dt = new Date(d)
    return `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-20">
      {postModal.open && <PostModal item={postModal.item} onSave={handleSavePost} onClose={() => setPostModal({ open: false })} />}
      {mediaModal.open && <MediaModal item={mediaModal.item} onSave={handleSaveMedia} onClose={() => setMediaModal({ open: false })} />}

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-stone-900 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">System Control</div>
              <Shield className="w-4 h-4 text-stone-400" />
            </div>
            <h1 className="text-3xl font-black text-stone-900 tracking-tighter uppercase">Admin Command Center</h1>
          </div>
          
          <div className="flex bg-white border border-stone-200 rounded-2xl p-1 shadow-sm">
            {[
              { key: 'dashboard', icon: LayoutDashboard },
              { key: 'users', icon: Users },
              { key: 'posts', icon: FileText },
              { key: 'comments', icon: MessageSquare },
              { key: 'media', icon: Play },
              { key: 'logs', icon: Activity },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as AdminTab)}
                className={`p-2.5 rounded-xl transition-all ${tab === t.key ? 'bg-stone-900 text-white shadow-md' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-50'}`}>
                <t.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        {tab === 'dashboard' && stats && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Active Users', value: stats.users, icon: Users, color: 'text-blue-600' },
                { label: 'Total Insights', value: stats.posts, icon: FileText, color: 'text-amber-600' },
                { label: 'Discussion', value: stats.comments, icon: MessageSquare, color: 'text-emerald-600' },
                { label: 'Reports', value: stats.reportedComments, icon: Shield, color: 'text-red-600' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-stone-200 p-6 rounded-3xl shadow-sm">
                  <s.icon className={`w-5 h-5 ${s.color} mb-4`} />
                  <p className="text-3xl font-black text-stone-900 tracking-tighter">{s.value}</p>
                  <p className="text-[10px] font-black text-stone-400 uppercase mt-1 tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>

            <Card title="System Control & Settings">
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-800">AI Analysis Module</p>
                    <p className="text-xs text-stone-400">Global toggle for intelligence simulation features</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`w-14 h-7 rounded-full transition-all relative ${aiEnabled ? 'bg-amber-600' : 'bg-stone-200'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${aiEnabled ? 'left-8' : 'left-1'}`} />
                </button>
              </div>
            </Card>
          </div>
        )}

        {tab === 'users' && (
          <Card title="User Registry" action={<span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{users.length} Identities</span>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                  <th className="pb-4 text-left px-2">Identity</th>
                  <th className="pb-4 text-left px-2">E-mail Address</th>
                  <th className="pb-4 text-left px-2">Level</th>
                  <th className="pb-4 text-center px-2">Status</th>
                  <th className="pb-4 text-right px-2">Actions</th>
                </tr></thead>
                <tbody className="divide-y divide-stone-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="py-4 px-2 font-bold text-stone-800">{u.username}</td>
                      <td className="py-4 px-2 text-stone-400 font-mono text-xs">{u.email}</td>
                      <td className="py-4 px-2">
                        <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)}
                          disabled={u.id === user.id}
                          className="text-[10px] font-black uppercase border border-stone-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-amber-500/20 outline-none">
                          <option value="user">User</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-4 px-2 text-center">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${u.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {u.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button onClick={() => handleToggleUser(u.id)} disabled={u.id === user.id}
                          className={`p-2 rounded-lg transition-all ${u.is_active ? 'text-stone-400 hover:text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
                          {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
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
          <Card title="Content Intelligence" action={
            <button onClick={() => setPostModal({ open: true })} className="flex items-center gap-1 text-[10px] font-black bg-stone-900 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-black transition-all">
              <Plus className="w-3.5 h-3.5" /> Create Insight
            </button>
          }>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                  <th className="pb-4 text-left px-2">Type</th>
                  <th className="pb-4 text-left px-2">Subject Title</th>
                  <th className="pb-4 text-left px-2">Author</th>
                  <th className="pb-4 text-right px-2">Registry Date</th>
                  <th className="pb-4 text-right px-2">Control</th>
                </tr></thead>
                <tbody className="divide-y divide-stone-50">
                  {posts.map(p => (
                    <tr key={p.id} className={`hover:bg-stone-50/50 transition-colors ${p.pinned ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-4 px-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${p.type === 'news' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'}`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="py-4 px-2 max-w-[300px]">
                        <div className="flex items-center gap-2">
                          {p.pinned && <Pin className="w-3 h-3 text-amber-600" />}
                          <span className="text-stone-800 font-bold truncate">{p.title}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-stone-400 font-medium text-xs">{p.author_name}</td>
                      <td className="py-4 px-2 text-right text-stone-400 font-mono text-[10px]">{fmtDate(p.created_at)}</td>
                      <td className="py-4 px-2 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => handlePin(p.id)} className={`p-2 rounded-lg transition-all ${p.pinned ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:bg-stone-100'}`}><Pin className="w-4 h-4" /></button>
                          <button onClick={() => setPostModal({ open: true, item: p })} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeletePost(p.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 'logs' && (
          <Card title="User Intelligence Tracking" action={<button onClick={loadData} className="p-2 hover:bg-stone-100 rounded-lg transition-all text-stone-400"><Activity className="w-4 h-4" /></button>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">
                  <th className="pb-4 text-left px-2">Operator</th>
                  <th className="pb-4 text-left px-2">Activity Description</th>
                  <th className="pb-4 text-left px-2">Access IP</th>
                  <th className="pb-4 text-right px-2">Timestamp (UTC)</th>
                </tr></thead>
                <tbody className="divide-y divide-stone-50">
                  {logs.map(l => (
                    <tr key={l.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="py-4 px-2">
                        <div className="flex flex-col">
                          <span className="font-bold text-stone-800 text-xs">{l.username || 'Guest'}</span>
                          <span className="text-[9px] text-stone-400 font-medium lowercase italic">{l.email || 'anonymous'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${l.action.includes('Login') ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {l.action}
                        </span>
                      </td>
                      <td className="py-4 px-2 text-stone-400 font-mono text-[10px]">{l.ip_address}</td>
                      <td className="py-4 px-2 text-right text-stone-400 font-mono text-[10px] whitespace-nowrap">{fmtDate(l.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && <div className="text-center py-20 text-stone-300 font-bold uppercase italic tracking-widest text-sm">No activity records found in central database.</div>}
            </div>
          </Card>
        )}

        {/* ... (Existing media/comments tab logic can remain or be updated similarly) ... */}
        {tab === 'media' && (
          <Card title="Media Archive" action={<button onClick={() => setMediaModal({ open: true })} className="flex items-center gap-1 text-[10px] font-black bg-stone-900 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-black transition-all">+ Add Asset</button>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {media.map(m => (
                <div key={m.id} className="flex items-center gap-4 p-4 border border-stone-100 rounded-2xl hover:bg-stone-50 transition-all">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${m.type==='youtube'?'bg-red-50':'bg-violet-50'}`}>
                    {m.type==='youtube'?'▶':'🎙'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 truncate">{m.title}</p>
                    <p className="text-[10px] text-stone-400 font-medium mt-0.5">{m.author} · {m.duration}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setMediaModal({ open: true, item: m })} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-lg transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteMedia(m.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}