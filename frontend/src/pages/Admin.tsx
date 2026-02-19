import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminStatsAPI, getAdminUsersAPI,
  getAdminPostsAPI, togglePinAPI, adminDeletePostAPI,
  getMediaAPI, createMediaAPI, updateMediaAPI, deleteMediaAPI,
  MediaItem, Post, createPostAPI
} from '../lib/api'
import { 
  Users, FileText, MessageSquare, Play, LayoutDashboard, 
  Shield, Activity, Settings, Plus, Edit2, Trash2, 
  Lock, Unlock, Pin, Sparkles, Loader2, Mail, Globe, Clock, Server, RefreshCw, Key, UserPlus
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

function UserModal({ item, onSave, onClose }: { item?: any; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item } : { email: '', username: '', password: '', role: 'user', is_active: true })
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p: any) => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? (e.target as any).checked : e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50"><h3 className="font-bold text-stone-800">{item ? 'Identities Intelligence Update' : 'New Identity Registry'}</h3><button onClick={onClose} className="text-stone-400">✕</button></div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-6 space-y-4">
          <input name="email" value={form.email} onChange={h} required placeholder="Email Address" disabled={!!item} className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold" />
          <input name="username" value={form.username} onChange={h} required placeholder="Display Name" className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold" />
          {!item && <input name="password" type="password" value={form.password} onChange={h} required placeholder="Initial Key (Password)" className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono" />}
          <select name="role" value={form.role} onChange={h} className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-black uppercase">
            <option value="user">Standard User</option><option value="editor">Intelligence Editor</option><option value="admin">Platform Admin</option>
          </select>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-stone-200 text-stone-500 rounded-xl text-sm font-bold">Abort</button>
            <button type="submit" className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-sm font-bold shadow-lg uppercase tracking-widest">Execute</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MediaModal({ item, onSave, onClose }: { item?: MediaItem; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item } : { type: 'youtube', title: '', url: '', author: '', duration: '', category: '경제', is_active: true })
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50"><h3 className="font-bold text-stone-800">{item ? 'Media Asset Sync' : 'New Asset Deployment'}</h3><button onClick={onClose} className="text-stone-400">✕</button></div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-6 space-y-4">
          <select name="type" value={form.type} onChange={h} className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold uppercase"><option value="youtube">YouTube</option><option value="podcast">Podcast</option><option value="music">Music</option></select>
          <input name="title" value={form.title} onChange={h} required placeholder="Asset Title" className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold" />
          <input name="url" value={form.url} onChange={h} required placeholder="URL or Video ID" className="w-full text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono" />
          <div className="grid grid-cols-2 gap-4">
            <input name="author" value={form.author} onChange={h} placeholder="Source/Author" className="text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold" />
            <input name="duration" value={form.duration} onChange={h} placeholder="Duration (e.g. 15:00)" className="text-sm px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-stone-200 text-stone-500 rounded-xl text-sm font-bold">Abort</button>
            <button type="submit" className="flex-1 py-3 bg-stone-900 text-white rounded-xl text-sm font-bold shadow-lg uppercase tracking-widest">Execute</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />

  const [tab, setTab] = useState<AdminTab>('dashboard')
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [posts, setPosts] = useState<any[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [userModal, setUserModal] = useState<{ open: boolean; item?: any }>({ open: false })
  const [mediaModal, setMediaModal] = useState<{ open: boolean; item?: MediaItem }>({ open: false })
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)

  const API_BASE = import.meta.env.VITE_API_URL || ''
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (tab === 'dashboard') {
        const r = await fetch(`${API_BASE}/api/admin/stats`, { headers }).then(r => r.json())
        if (r.success) setStats(r.stats)
      } else if (tab === 'users') {
        const r = await fetch(`${API_BASE}/api/admin/users`, { headers }).then(r => r.json())
        if (r.success) setUsers(r.users)
      } else if (tab === 'posts') {
        const r = await fetch(`${API_BASE}/api/admin/posts`, { headers }).then(r => r.json())
        if (r.success) setPosts(r.posts)
      } else if (tab === 'media') {
        const r = await fetch(`${API_BASE}/api/media`, { headers }).then(r => r.json())
        if (r.success) setMedia(r.media)
      } else if (tab === 'logs') {
        const r = await fetch(`${API_BASE}/api/admin/logs`, { headers }).then(r => r.json())
        if (r.success) setLogs(r.logs)
      }
    } finally { setIsLoading(false) }
  }

  useEffect(() => { loadData() }, [tab])

  // 🔥 [User Actions]
  const handleSaveUser = async (data: any) => {
    const url = data.id ? `${API_BASE}/api/admin/users/${data.id}` : `${API_BASE}/api/admin/users`
    const r = await fetch(url, { method: data.id ? 'PUT' : 'POST', headers, body: JSON.stringify(data) }).then(r => r.json())
    if (r.success) { setUserModal({ open: false }); loadData(); }
  }
  const handleDeleteUser = async (id: number) => {
    if (id === user.id || !confirm('Identity를 영구 삭제하시겠습니까?')) return
    const r = await fetch(`${API_BASE}/api/admin/users/${id}`, { method: 'DELETE', headers }).then(r => r.json())
    if (r.success) loadData()
  }

  // 🔥 [Media Actions]
  const handleSaveMedia = async (data: any) => {
    const url = data.id ? `${API_BASE}/api/media/${data.id}` : `${API_BASE}/api/media`
    const r = await fetch(url, { method: data.id ? 'PUT' : 'POST', headers, body: JSON.stringify(data) }).then(r => r.json())
    if (r.success) { setMediaModal({ open: false }); loadData(); }
  }
  const handleDeleteMedia = async (id: number) => {
    if (!confirm('Asset을 영구 삭제하시겠습니까?')) return
    const r = await fetch(`${API_BASE}/api/media/${id}`, { method: 'DELETE', headers }).then(r => r.json())
    if (r.success) loadData()
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-20">
      {userModal.open && <UserModal item={userModal.item} onSave={handleSaveUser} onClose={() => setUserModal({ open: false })} />}
      {mediaModal.open && <MediaModal item={mediaModal.item} onSave={handleSaveMedia} onClose={() => setMediaModal({ open: false })} />}

      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div><h1 className="text-4xl font-black text-stone-900 tracking-tighter uppercase leading-none">Command Center</h1></div>
          <div className="flex bg-white border border-stone-200 rounded-2xl p-1.5 shadow-sm">
            {[{ key: 'dashboard', icon: LayoutDashboard }, { key: 'users', icon: Users }, { key: 'posts', icon: FileText }, { key: 'media', icon: Play }, { key: 'logs', icon: Activity }].map(t => (
              <button key={t.key} onClick={() => setTab(t.key as AdminTab)} className={`p-3 rounded-xl transition-all ${tab === t.key ? 'bg-stone-900 text-white shadow-xl' : 'text-stone-400 hover:bg-stone-50'}`}><t.icon className="w-5 h-5" /></button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-40 text-center"><Loader2 className="w-12 h-12 text-stone-300 animate-spin mx-auto" /></div>
        ) : (
          <div className="space-y-8">
            {tab === 'dashboard' && stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[{ label: 'Identities', value: stats.users, icon: Users, color: 'text-blue-600' }, { label: 'Insights', value: stats.posts, icon: FileText, color: 'text-amber-600' }, { label: 'Operations', value: stats.media, icon: Play, color: 'text-purple-600' }].map(s => (
                  <div key={s.label} className="bg-white border border-stone-200 p-8 rounded-3xl shadow-sm"><s.icon className={`w-5 h-5 ${s.color} mb-6`} /><p className="text-4xl font-black text-stone-900 tracking-tighter mb-1">{s.value}</p><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">{s.label}</p></div>
                ))}
              </div>
            )}

            {tab === 'users' && (
              <Card title="User Registry & Protocol" action={<button onClick={() => setUserModal({ open: true })} className="flex items-center gap-1 text-[10px] font-black bg-stone-900 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-black transition-all"><UserPlus className="w-3.5 h-3.5" /> Deploy Identity</button>}>
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] font-black text-stone-400 uppercase border-b border-stone-100"><th className="py-5 px-4 text-left">Identity</th><th className="py-5 px-4 text-left">Role</th><th className="py-5 px-4 text-center">Status</th><th className="py-5 px-4 text-right">Operation</th></tr></thead><tbody className="divide-y divide-stone-50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-stone-50/50"><td className="py-5 px-4"><span className="font-black text-stone-800 block uppercase">{u.username}</span><span className="text-[10px] text-stone-400 font-mono italic">{u.email}</span></td><td className="py-5 px-4"><span className="text-[10px] font-black px-2 py-0.5 rounded bg-stone-100 text-stone-600 uppercase">{u.role}</span></td><td className="py-5 px-4 text-center"><span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{u.is_active ? 'Active' : 'Locked'}</span></td><td className="py-5 px-4 text-right"><div className="flex justify-end gap-1"><button onClick={() => setUserModal({ open: true, item: u })} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeleteUser(u.id)} disabled={u.id === user.id} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button></div></td></tr>
                  ))}
                </tbody></table></div>
              </Card>
            )}

            {tab === 'media' && (
              <Card title="Media Asset Deployment" action={<button onClick={() => setMediaModal({ open: true })} className="flex items-center gap-1 text-[10px] font-black bg-stone-900 text-white px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-black transition-all"><Plus className="w-3.5 h-3.5" /> Deploy Asset</button>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {media.map(m => (
                    <div key={m.id} className="flex items-center gap-4 p-4 border border-stone-100 rounded-2xl hover:bg-stone-50 transition-all"><div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${m.type==='youtube'?'bg-red-50 text-red-600':'bg-violet-50 text-violet-600'}`}>{m.type==='youtube'?'▶':'🎙'}</div><div className="flex-1 min-w-0"><p className="text-sm font-bold text-stone-800 truncate uppercase">{m.title}</p><p className="text-[10px] text-stone-400 font-medium uppercase">{m.author} · {m.duration}</p></div><div className="flex gap-1"><button onClick={() => setMediaModal({ open: true, item: m })} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-lg transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeleteMedia(m.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button></div></div>
                  ))}
                </div>
              </Card>
            )}

            {tab === 'logs' && (
              <Card title="Master Intelligence Audit Logs">
                <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-[10px] font-black text-stone-400 uppercase border-b border-stone-100"><th className="py-5 px-4 text-left">Identity</th><th className="py-5 px-4 text-left">Audit Description</th><th className="py-5 px-4 text-right">Access IP & Time</th></tr></thead><tbody className="divide-y divide-stone-50">
                  {logs.map(l => (
                    <tr key={l.id} className="hover:bg-stone-50/50"><td className="py-5 px-4 font-bold text-stone-800 text-xs uppercase">{l.username || 'Unknown'}</td><td className="py-5 px-4"><span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${l.action.includes('ADMIN') ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{l.action}</span></td><td className="py-5 px-4 text-right flex flex-col items-end"><span className="text-[10px] text-stone-400 font-mono">{l.ip_address}</span><span className="text-[9px] text-stone-300 font-mono">{new Date(l.created_at).toLocaleString()}</span></td></tr>
                  ))}
                </tbody></table></div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
