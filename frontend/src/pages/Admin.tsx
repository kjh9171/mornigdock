import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminStatsAPI, getAdminUsersAPI, changeUserRoleAPI, toggleUserAPI,
  getAdminPostsAPI, togglePinAPI, adminDeletePostAPI,
  getMediaAPI, createMediaAPI, updateMediaAPI, deleteMediaAPI,
  MediaItem, Post, createPostAPI
} from '../lib/api'
import { 
  Users, FileText, MessageSquare, Play, LayoutDashboard, 
  Shield, Activity, Settings, Plus, Edit2, Trash2, 
  Lock, Unlock, Pin, Sparkles, Loader2, Mail, Globe, Clock, Server, RefreshCw
} from 'lucide-react'

type AdminTab = 'dashboard' | 'users' | 'posts' | 'media' | 'logs'

function Card({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <h3 className="font-bold text-stone-800 text-sm tracking-tight uppercase">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

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
              <select name="type" value={form.type} onChange={h} className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 font-bold">
                <option value="board">일반 게시판</option>
                <option value="news">뉴스 인텔리전스</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-black text-stone-400 uppercase tracking-widest block mb-1.5">카테고리</label>
              <input name="category" value={form.category} onChange={h} className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 font-bold" />
            </div>
          </div>
          <input name="title" value={form.title} onChange={h} required placeholder="제목" className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 font-bold" />
          <textarea name="content" value={form.content} onChange={h} rows={8} required placeholder="내용" className="w-full text-sm px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl resize-none outline-none focus:ring-2 focus:ring-amber-500/20 font-medium" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-stone-200 text-stone-500 rounded-xl text-sm font-bold">취소</button>
            <button type="submit" className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-sm font-bold shadow-lg">저장</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MediaModal({ item, onSave, onClose }: { item?: MediaItem; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item } : { type: 'youtube', title: '', url: '', author: '', duration: '' })
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <h3 className="font-bold text-stone-800">{item ? '미디어 수정' : '새 미디어 추가'}</h3>
          <button onClick={onClose} className="text-stone-400">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-6 space-y-4">
          <select name="type" value={form.type} onChange={h} className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold">
            <option value="youtube">YouTube</option>
            <option value="podcast">Podcast</option>
            <option value="music">Music</option>
          </select>
          <input name="title" value={form.title} onChange={h} required placeholder="제목" className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold" />
          <input name="url" value={form.url} onChange={h} required placeholder="URL 또는 ID" className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono" />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-stone-200 text-stone-500 rounded-xl text-sm font-bold">취소</button>
            <button type="submit" className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-sm font-bold shadow-lg">저장</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const { user, logout } = useAuth()
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />

  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [postModal, setPostModal] = useState<{ open: boolean; item?: any }>({ open: false })
  const [mediaModal, setMediaModal] = useState<{ open: boolean; item?: MediaItem }>({ open: false })
  const [isLoading, setIsLoading] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [isFetching, setIsFetching] = useState(false)

  const API_BASE = import.meta.env.VITE_API_URL || ''

  const loadData = async () => {
    setIsLoading(true)
    const token = localStorage.getItem('token')
    const headers = { 'Authorization': `Bearer ${token}` }
    try {
      if (tab === 'dashboard') {
        const [statsRes, configRes] = await Promise.all([
          getAdminStatsAPI(),
          fetch(`${API_BASE}/api/admin/config`, { headers }).then(r => r.json())
        ])
        if (statsRes.success) setStats(statsRes.stats)
        if (configRes.success) setAiEnabled(configRes.config.ai_enabled === 'true')
      } else if (tab === 'users') {
        const res = await getAdminUsersAPI(); if (res.success) setUsers(res.users)
      } else if (tab === 'posts') {
        const res = await getAdminPostsAPI(); if (res.success) setPosts(res.posts)
      } else if (tab === 'media') {
        const res = await getMediaAPI(); if (res.success) setMedia(res.media)
      } else if (tab === 'logs') {
        const res = await fetch(`${API_BASE}/api/admin/logs`, { headers }).then(r => r.json())
        if (res.success) setLogs(res.logs)
      }
    } finally { setIsLoading(false) }
  }

  useEffect(() => { loadData() }, [tab])

  const handleManualFetch = async () => {
    setIsFetching(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/fetch-news`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(r => r.json())
      if (res.success) { alert('최신 인텔리전스 수집 완료'); loadData(); }
    } finally { setIsFetching(false) }
  }

  const toggleAI = async () => {
    const newValue = !aiEnabled
    const r = await fetch(`${API_BASE}/api/admin/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ key: 'ai_enabled', value: newValue })
    }).then(res => res.json())
    if (r.success) setAiEnabled(newValue)
  }

  const handleRoleChange = async (id: number, role: string) => {
    const r = await changeUserRoleAPI(id, role)
    if (r.success) setUsers(p => p.map(u => u.id === id ? { ...u, role } : u))
  }
  const handleToggleUser = async (id: number) => {
    const r = await toggleUserAPI(id)
    if (r.success) setUsers(p => p.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
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
    if (r.success) { setPostModal({ open: false }); loadData(); }
  }
  const handleDeletePost = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return
    const r = await adminDeletePostAPI(id)
    if (r.success) setPosts(p => p.filter(x => x.id !== id))
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

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-stone-900 text-white px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest shadow-sm">HQ Command</span>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-4xl font-black text-stone-900 tracking-tighter uppercase leading-none">Command Center</h1>
          </div>
          <div className="flex bg-white border border-stone-200 rounded-2xl p-1.5 shadow-sm">
            {[
              { key: 'dashboard', icon: LayoutDashboard }, { key: 'users', icon: Users }, { key: 'posts', icon: FileText }, { key: 'media', icon: Play }, { key: 'logs', icon: Activity },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as AdminTab)} className={`p-3 rounded-xl transition-all ${tab === t.key ? 'bg-stone-900 text-white shadow-xl scale-105' : 'text-stone-400 hover:bg-stone-50'}`}>
                <t.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-40 text-center"><Loader2 className="w-12 h-12 text-stone-300 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {tab === 'dashboard' && stats && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Identities', value: stats.users, icon: Users, color: 'text-blue-600' },
                    { label: 'Insights', value: stats.posts, icon: FileText, color: 'text-amber-600' },
                    { label: 'Operations', value: stats.media, icon: Play, color: 'text-purple-600' },
                    { label: 'Activity', value: logs.length, icon: Activity, color: 'text-emerald-600' },
                  ].map(s => (
                    <div key={s.label} className="bg-white border border-stone-200 p-8 rounded-3xl shadow-sm">
                      <s.icon className={`w-5 h-5 ${s.color} mb-6`} />
                      <p className="text-4xl font-black text-stone-900 tracking-tighter mb-1">{s.value}</p>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{s.label}</p>
                    </div>
                  ))}
                </div>
                <Card title="System Control & Operations" action={<button onClick={handleManualFetch} disabled={isFetching} className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black disabled:opacity-50 transition-all">{isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Fetch Latest Intel</button>}>
                  <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5 text-amber-600" /></div>
                      <div><p className="text-sm font-bold text-stone-800">Global AI Module</p><p className="text-xs text-stone-400">Intelligence simulation toggle</p></div>
                    </div>
                    <button onClick={toggleAI} className={`w-14 h-7 rounded-full transition-all relative ${aiEnabled ? 'bg-amber-600' : 'bg-stone-200'}`}>
                      <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${aiEnabled ? 'left-8' : 'left-1'}`} />
                    </button>
                  </div>
                </Card>
              </>
            )}

            {tab === 'users' && (
              <Card title="User Registry" action={<span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{users.length} Identities</span>}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-[10px] font-black text-stone-400 uppercase border-b border-stone-100 bg-white"><th className="py-5 px-4 text-left">Identity</th><th className="py-5 px-4 text-left">Access Level</th><th className="py-5 px-4 text-center">Status</th><th className="py-5 px-4 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-stone-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-stone-50/50 transition-colors">
                          <td className="py-5 px-4 flex flex-col"><span className="font-black text-stone-800 uppercase">{u.username}</span><span className="text-[10px] text-stone-400 font-mono italic">{u.email}</span></td>
                          <td className="py-5 px-4"><select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} disabled={u.id === user.id} className="bg-stone-50 border border-stone-200 text-[10px] font-black uppercase rounded-lg px-2 py-1 outline-none"><option value="user">Standard</option><option value="editor">Specialist</option><option value="admin">Administrator</option></select></td>
                          <td className="py-5 px-4 text-center"><span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{u.is_active ? 'Online' : 'Restricted'}</span></td>
                          <td className="py-5 px-4 text-right"><button onClick={() => handleToggleUser(u.id)} disabled={u.id === user.id} className={`p-2.5 rounded-xl transition-all ${u.is_active ? 'text-stone-300 hover:text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>{u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {tab === 'posts' && (
              <Card title="Content Intelligence" action={<button onClick={() => setPostModal({ open: true })} className="flex items-center gap-1 text-[10px] font-black bg-stone-900 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-black transition-all"><Plus className="w-3.5 h-3.5" /> Create Insight</button>}>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] font-black text-stone-400 uppercase border-b border-stone-100 bg-white"><th className="py-5 px-4 text-left">Type</th><th className="py-5 px-4 text-left">Subject Title</th><th className="py-5 px-4 text-left">Author</th><th className="py-5 px-4 text-right">Control</th></tr></thead><tbody className="divide-y divide-stone-50">
                  {posts.map(p => (
                    <tr key={p.id} className={`hover:bg-stone-50/50 transition-colors ${p.pinned ? 'bg-amber-50/30' : ''}`}><td className="py-5 px-4"><span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${p.type === 'news' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'}`}>{p.type}</span></td><td className="py-5 px-4 max-w-[300px]"><div className="flex items-center gap-2">{p.pinned && <Pin className="w-3 h-3 text-amber-600" />}<span className="text-stone-800 font-bold truncate">{p.title}</span></div></td><td className="py-5 px-4 text-stone-400 font-medium text-xs">{p.author_name}</td><td className="py-5 px-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => handlePin(p.id)} className={`p-2 rounded-lg transition-all ${p.pinned ? 'text-amber-600 bg-amber-50' : 'text-stone-400 hover:bg-stone-100'}`}><Pin className="w-4 h-4" /></button><button onClick={() => setPostModal({ open: true, item: p })} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeletePost(p.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button></div></td></tr>
                  ))}
                </tbody></table></div>
              </Card>
            )}

            {tab === 'logs' && (
              <Card title="User Intelligence Tracking" action={<button onClick={loadData} className="p-2 text-stone-400"><Activity className="w-4 h-4" /></button>}>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] font-black text-stone-400 uppercase border-b border-stone-100 bg-white"><th className="py-5 px-8 text-left">Operator</th><th className="py-5 px-8 text-left">Activity Description</th><th className="py-5 px-8 text-left">Access IP</th><th className="py-5 px-8 text-right">Registry Time</th></tr></thead><tbody className="divide-y divide-stone-50">
                  {logs.map(l => (
                    <tr key={l.id} className="hover:bg-stone-50/50 transition-colors group"><td className="py-5 px-8"><div className="flex flex-col"><span className="font-bold text-stone-800 text-xs">{l.username || 'Guest'}</span><span className="text-[9px] text-stone-400 font-medium lowercase italic">{l.email || 'anonymous'}</span></div></td><td className="py-5 px-8"><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${l.action.includes('Login') ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>{l.action}</span></td><td className="py-5 px-8 font-mono text-[10px] text-stone-400">{l.ip_address}</td><td className="py-5 px-8 text-right text-stone-400 font-mono text-[10px] whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td></tr>
                  ))}
                </tbody></table></div>
              </Card>
            )}

            {tab === 'media' && (
              <Card title="Media Archive" action={<button onClick={() => setMediaModal({ open: true })} className="flex items-center gap-1 text-[10px] font-black bg-stone-900 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-black transition-all">+ Add Asset</button>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {media.map(m => (
                    <div key={m.id} className="flex items-center gap-4 p-4 border border-stone-100 rounded-2xl hover:bg-stone-50 transition-all"><div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${m.type==='youtube'?'bg-red-50':'bg-violet-50'}`}>{m.type==='youtube'?'▶':'🎙'}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-stone-800 truncate">{m.title}</p><p className="text-[10px] text-stone-400 font-medium mt-0.5">{m.author} · {m.duration}</p></div><div className="flex gap-1"><button onClick={() => setMediaModal({ open: true, item: m })} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-lg transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeleteMedia(m.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button></div></div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
