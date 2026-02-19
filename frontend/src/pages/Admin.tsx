import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  getAdminStatsAPI, getAdminUsersAPI,
  getAdminPostsAPI, togglePinAPI, adminDeletePostAPI,
  getMediaAPI, createMediaAPI, updateMediaAPI, deleteMediaAPI,
  MediaItem, Post
} from '../lib/api'
import { 
  Users, FileText, MessageSquare, Play, LayoutDashboard, 
  Shield, Activity, Settings, Plus, Edit2, Trash2, 
  Lock, Unlock, Pin, Sparkles, Loader2, Mail, Globe, Clock, Server, RefreshCw, Key, UserPlus, ChevronRight, AlertCircle, BarChart3, ExternalLink, Zap
} from 'lucide-react'

type AdminTab = 'dashboard' | 'users' | 'posts' | 'media' | 'logs'

const parseYouTubeId = (url: string) => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : url;
}

function Card({ children, title, action, icon: Icon }: { children: React.ReactNode; title: string; action?: React.ReactNode; icon?: any }) {
  return (
    <div className="bg-white border border-stone-200 rounded-3xl shadow-sm overflow-hidden transition-all hover:shadow-md">
      <div className="px-8 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/30">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-amber-600" />}
          <h3 className="font-black text-stone-800 text-xs tracking-widest uppercase">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-8">{children}</div>
    </div>
  )
}

function PostModal({ item, onSave, onClose }: { item?: any; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item } : { type: 'news', category: '경제', title: '', content: '', source: '네이버 뉴스 (연합뉴스)', source_url: '' })
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p: any) => ({ ...p, [e.target.name]: e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <h3 className="font-black text-stone-900 flex items-center gap-2"><FileText className="w-5 h-5 text-amber-600" /> {item ? '지능 분석물 수정' : '신규 지능 리포트 생성'}</h3>
          <button onClick={onClose} className="text-stone-400">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">유형</label>
              <select name="type" value={form.type} onChange={h} className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-black uppercase outline-none focus:ring-2 focus:ring-amber-500/20">
                <option value="news">NEWS (지능 보고서)</option>
                <option value="board">BOARD (일반 토론)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">카테고리</label>
              <input name="category" value={form.category} onChange={h} className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" />
            </div>
          </div>
          <input name="title" value={form.title} onChange={h} required placeholder="리포트 제목" className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" />
          <textarea name="content" value={form.content} onChange={h} required rows={8} placeholder="본문 내용" className="w-full text-sm px-5 py-4 bg-stone-50 border border-stone-200 rounded-2xl font-medium focus:ring-2 focus:ring-amber-500/20 outline-none resize-none" />
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">원문 링크 (Source URL)</label>
            <input name="source_url" value={form.source_url} onChange={h} placeholder="https://n.news.naver.com/..." className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-mono focus:ring-2 focus:ring-amber-500/20 outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-4 border border-stone-200 text-stone-500 rounded-2xl text-sm font-black uppercase">취소</button>
            <button type="submit" className="flex-1 py-4 bg-stone-900 text-white rounded-2xl text-sm font-black shadow-xl uppercase">저장 및 배포</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UserModal({ item, onSave, onClose }: { item?: any; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState<any>(item ? { ...item } : { email: '', username: '', password: '', role: 'user', is_active: true })
  const h = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((p: any) => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? (e.target as any).checked : e.target.value }))
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <h3 className="font-black text-stone-900 flex items-center gap-2"><UserPlus className="w-5 h-5 text-amber-600" /> 요원 정보 관리</h3>
          <button onClick={onClose} className="text-stone-400">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-8 space-y-5">
          <input name="email" value={form.email} onChange={h} required placeholder="Email Address" disabled={!!item} className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" />
          <input name="username" value={form.username} onChange={h} required placeholder="요원 호출명" className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" />
          {!item && <input name="password" type="password" value={form.password} onChange={h} required placeholder="보안 키" className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-mono focus:ring-2 focus:ring-amber-500/20 outline-none" />}
          <select name="role" value={form.role} onChange={h} className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-black uppercase outline-none focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none">
            <option value="user">USER</option><option value="editor">EDITOR</option><option value="admin">ADMIN</option>
          </select>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 border border-stone-200 text-stone-500 rounded-2xl text-sm font-black uppercase">취소</button>
            <button type="submit" className="flex-1 py-4 bg-stone-900 text-white rounded-2xl text-sm font-black shadow-xl uppercase">실행</button>
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
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
          <h3 className="font-black text-stone-900 flex items-center gap-2"><Play className="w-5 h-5 text-amber-600" /> 미디어 자산 동기화</h3>
          <button onClick={onClose} className="text-stone-400">✕</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form) }} className="p-8 space-y-5">
          <select name="type" value={form.type} onChange={h} className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-black uppercase appearance-none outline-none focus:ring-2 focus:ring-amber-500/20"><option value="youtube">YouTube</option><option value="podcast">Podcast</option><option value="music">Music</option></select>
          <input name="title" value={form.title} onChange={h} required placeholder="콘텐츠 제목" className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" />
          <input name="url" value={form.url} onChange={h} required placeholder="URL 또는 ID" className="w-full text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-mono focus:ring-2 focus:ring-amber-500/20 outline-none" />
          <div className="grid grid-cols-2 gap-4">
            <input name="author" value={form.author} onChange={h} placeholder="출처/분석가" className="text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold" />
            <input name="duration" value={form.duration} onChange={h} placeholder="시간 (15:00)" className="text-sm px-5 py-3 bg-stone-50 border border-stone-200 rounded-2xl font-bold" />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-4 border border-stone-200 text-stone-500 rounded-2xl text-sm font-black uppercase">취소</button>
            <button type="submit" className="flex-1 py-4 bg-stone-900 text-white rounded-2xl text-sm font-black shadow-xl uppercase">실행</button>
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
  const [postModal, setPostModal] = useState<{ open: boolean; item?: any }>({ open: false })
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

  const handleManualFetch = async () => {
    setIsFetching(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/fetch-news`, {
        method: 'POST',
        headers
      }).then(r => r.json())
      if (res.success) {
        alert('최신 지능 수집이 완료되었습니다.')
        loadData()
      }
    } finally {
      setIsFetching(false)
    }
  }

  const handleSavePost = async (data: any) => {
    // 🔥 관리자 전용 엔드포인트로 통일
    const url = data.id ? `${API_BASE}/api/posts/${data.id}` : `${API_BASE}/api/admin/posts`
    const r = await fetch(url, { 
      method: data.id ? 'PUT' : 'POST', 
      headers, 
      body: JSON.stringify(data) 
    }).then(r => r.json())
    if (r.success) { setPostModal({ open: false }); loadData(); }
  }
  const handleDeletePost = async (id: number) => {
    if (!confirm('분석물을 영구 파기하시겠습니까?')) return
    const r = await fetch(`${API_BASE}/api/admin/posts/${id}`, { method: 'DELETE', headers }).then(r => r.json())
    if (r.success) loadData()
  }
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
  const handleSaveMedia = async (data: any) => {
    if (data.type === 'youtube') data.url = parseYouTubeId(data.url)
    const url = data.id ? `${API_BASE}/api/media/${data.id}` : `${API_BASE}/api/media`
    const r = await fetch(url, { method: data.id ? 'PUT' : 'POST', headers, body: JSON.stringify(data) }).then(r => r.json())
    if (r.success) { setMediaModal({ open: false }); loadData(); }
  }
  const handleDeleteMedia = async (id: number) => {
    if (!confirm('Asset을 영구 삭제하시겠습니까?')) return
    const r = await fetch(`${API_BASE}/api/media/${id}`, { method: 'DELETE', headers }).then(r => r.json())
    if (r.success) loadData()
  }

  const MENU_ITEMS = [
    { key: 'dashboard', label: '전략 현황', desc: 'SYSTEM OVERVIEW', icon: LayoutDashboard },
    { key: 'users', label: '요원 명단', desc: 'IDENTITY ARCHIVE', icon: Users },
    { key: 'posts', label: '지능 분석물', desc: 'INTEL ARCHIVE', icon: FileText },
    { key: 'media', label: '멀티미디어', desc: 'MEDIA ASSETS', icon: Play },
    { key: 'logs', label: '감사 로그', desc: 'SECURITY AUDIT', icon: Activity },
  ]

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex flex-col md:flex-row overflow-hidden">
      <aside className="w-full md:w-72 bg-white border-r border-stone-200 flex flex-col z-10 shrink-0">
        <div className="p-8 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-stone-900 rounded-xl flex items-center justify-center shadow-lg"><Shield className="w-4 h-4 text-amber-500" /></div>
            <h2 className="text-lg font-black text-stone-900 tracking-tighter uppercase leading-none">사령부 HQ</h2>
          </div>
          <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none">Master Control Protocol</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {MENU_ITEMS.map(item => (
            <button key={item.key} onClick={() => setTab(item.key as AdminTab)} className={`w-full group flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left ${tab === item.key ? 'bg-stone-900 text-white shadow-xl shadow-stone-200' : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'}`}>
              <item.icon className={`w-5 h-5 transition-colors ${tab === item.key ? 'text-amber-500' : 'text-stone-300'}`} />
              <div className="min-w-0">
                <p className="text-sm font-black tracking-tight">{item.label}</p>
                <p className={`text-[9px] font-bold uppercase tracking-tighter truncate ${tab === item.key ? 'text-stone-400' : 'text-stone-300'}`}>{item.desc}</p>
              </div>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10 h-screen bg-[#FDFDFD]">
        {postModal.open && <PostModal item={postModal.item} onSave={handleSavePost} onClose={() => setPostModal({ open: false })} />}
        {userModal.open && <UserModal item={userModal.item} onSave={handleSaveUser} onClose={() => setUserModal({ open: false })} />}
        {mediaModal.open && <MediaModal item={mediaModal.item} onSave={handleSaveMedia} onClose={() => setMediaModal({ open: false })} />}

        <div className="w-full space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-stone-900 tracking-tighter uppercase leading-none mb-2">{MENU_ITEMS.find(m => m.key === tab)?.label}</h1>
              <div className="flex items-center gap-2 text-[10px] font-black text-stone-400 uppercase tracking-widest"><Globe className="w-3 h-3" /> AGORA WIDE-SCREEN COMMAND <span className="text-stone-200">|</span> v1.0.7-HQ</div>
            </div>
            <div className="flex gap-2">
              {tab === 'dashboard' && (
                <button 
                  onClick={handleManualFetch}
                  disabled={isFetching}
                  className="flex items-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-amber-700 shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
                >
                  {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  지능 즉시 수집
                </button>
              )}
              <button onClick={loadData} className="p-3 bg-white border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:border-stone-900 transition-all shadow-sm active:scale-95"><RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-amber-600' : ''}`} /></button>
            </div>
          </div>

          {isLoading ? (
            <div className="py-40 text-center"><Loader2 className="w-12 h-12 text-stone-200 animate-spin mx-auto" /></div>
          ) : (
            <div className="w-full">
              {tab === 'dashboard' && stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[{ label: '활성 요원', value: stats.users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' }, { label: '분석 리포트', value: stats.posts, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' }, { label: '미디어 자산', value: stats.media, icon: Play, color: 'text-purple-600', bg: 'bg-purple-50' }].map(s => (
                    <div key={s.label} className="bg-white border border-stone-200 p-10 rounded-[2.5rem] shadow-sm flex flex-col items-center text-center"><div className={`w-14 h-14 ${s.bg} rounded-2xl flex items-center justify-center mb-6`}><s.icon className={`w-6 h-6 ${s.color}`} /></div><p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">{s.label}</p><p className="text-5xl font-black text-stone-900 tracking-tighter leading-none">{s.value}</p></div>
                  ))}
                </div>
              )}

              {tab === 'users' && (
                <Card title="요원 레지스트리 및 프로토콜" icon={Shield} action={<button onClick={() => setUserModal({ open: true })} className="flex items-center gap-2 text-[10px] font-black bg-stone-900 text-white px-5 py-2.5 rounded-xl uppercase tracking-widest hover:bg-black shadow-lg transition-all"><UserPlus className="w-4 h-4" /> 신규 요원 배치</button>}>
                  <div className="overflow-x-auto -mx-8"><table className="w-full text-sm"><thead><tr className="text-[10px] font-black text-stone-400 uppercase border-b border-stone-100 bg-stone-50/30"><th className="py-5 px-8 text-left whitespace-nowrap">식별 ID / 호출명</th><th className="py-5 px-8 text-left whitespace-nowrap">보안 권한</th><th className="py-5 px-8 text-center whitespace-nowrap">상태</th><th className="py-5 px-8 text-right whitespace-nowrap">전략 통제</th></tr></thead><tbody className="divide-y divide-stone-50">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-stone-50/50 transition-all"><td className="py-6 px-8 whitespace-nowrap"><span className="font-black text-stone-800 block uppercase tracking-tight">{u.username}</span><span className="text-[10px] text-stone-400 font-mono italic">{u.email}</span></td><td className="py-6 px-8 whitespace-nowrap"><span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase ${u.role === 'admin' ? 'bg-stone-900 text-amber-400' : 'bg-stone-100 text-stone-600'}`}>{u.role}</span></td><td className="py-6 px-8 text-center whitespace-nowrap"><span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{u.is_active ? '정상 작동' : '접속 차단'}</span></td><td className="py-6 px-8 text-right whitespace-nowrap"><div className="flex justify-end gap-2"><button onClick={() => setUserModal({ open: true, item: u })} className="p-3 text-stone-400 hover:text-stone-900 hover:bg-white rounded-2xl shadow-sm transition-all border border-transparent hover:border-stone-200"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeleteUser(u.id)} disabled={u.id === user.id} className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-4 h-4" /></button></div></td></tr>
                    ))}
                  </tbody></table></div>
                </Card>
              )}

              {tab === 'posts' && (
                <Card title="인텔리전스 분석물 통제" icon={FileText} action={<button onClick={() => setPostModal({ open: true })} className="flex items-center gap-2 text-[10px] font-black bg-stone-900 text-white px-5 py-2.5 rounded-xl uppercase tracking-widest hover:bg-black shadow-lg transition-all"><Plus className="w-4 h-4" /> 신규 리포트 생성</button>}>
                  <div className="overflow-x-auto -mx-8"><table className="w-full text-sm"><thead><tr className="text-[10px] font-black text-stone-400 uppercase border-b border-stone-100 bg-stone-50/30"><th className="py-5 px-8 text-left whitespace-nowrap">분류</th><th className="py-5 px-8 text-left whitespace-nowrap">리포트 제목</th><th className="py-5 px-8 text-left whitespace-nowrap">분석관</th><th className="py-5 px-8 text-right whitespace-nowrap">통제</th></tr></thead><tbody className="divide-y divide-stone-50">
                    {posts.map(p => (
                      <tr key={p.id} className={`hover:bg-stone-50/50 transition-all ${p.pinned ? 'bg-amber-50/30' : ''}`}><td className="py-6 px-8 whitespace-nowrap"><span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase ${p.type === 'news' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-500'}`}>{p.type}</span></td><td className="py-6 px-8 max-w-[400px]"><div className="flex items-center gap-2">{p.pinned && <Pin className="w-3 h-3 text-amber-600" />}<span className="text-stone-800 font-black truncate leading-tight tracking-tight">{p.title}</span></div></td><td className="py-6 px-8 text-stone-400 font-bold text-[10px] uppercase whitespace-nowrap">{p.author_name}</td><td className="py-6 px-8 text-right whitespace-nowrap"><div className="flex justify-end gap-2"><button onClick={() => setPostModal({ open: true, item: p })} className="p-3 text-stone-400 hover:text-stone-900 hover:bg-white rounded-2xl shadow-sm transition-all"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDeletePost(p.id)} className="p-3 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><Trash2 className="w-4 h-4" /></button></div></td></tr>
                    ))}
                  </tbody></table></div>
                </Card>
              )}

              {tab === 'media' && (
                <Card title="멀티미디어 인텔리전스 자산" icon={Play} action={<button onClick={() => setMediaModal({ open: true })} className="flex items-center gap-2 text-[10px] font-black bg-stone-900 text-white px-5 py-2.5 rounded-xl uppercase tracking-widest hover:bg-black shadow-lg transition-all"><Plus className="w-4 h-4" /> 신규 자산 배치</button>}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {media.map(m => (
                      <div key={m.id} className="group flex items-center gap-5 p-6 border border-stone-100 rounded-[2rem] hover:bg-stone-50 transition-all hover:border-amber-200 bg-white shadow-sm"><div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner ${m.type==='youtube'?'bg-red-50 text-red-600':'bg-violet-50 text-violet-600'}`}>{m.type==='youtube'?'▶':'🎙'}</div><div className="flex-1 min-w-0"><p className="text-sm font-black text-stone-800 truncate uppercase leading-tight mb-1">{m.title}</p><p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{m.author} · {m.duration}</p></div><div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setMediaModal({ open: true, item: m })} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-white rounded-xl shadow-sm transition-all border border-transparent hover:border-stone-200"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => handleDeleteMedia(m.id)} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-3.5 h-3.5" /></button></div></div>
                    ))}
                  </div>
                </Card>
              )}

              {tab === 'logs' && (
                <Card title="사령부 보안 감사 타임라인" icon={Activity}>
                  <div className="overflow-x-auto -mx-8"><table className="w-full text-sm"><thead><tr className="text-[10px] font-black text-stone-400 uppercase border-b border-stone-100 bg-stone-50/30"><th className="py-5 px-8 text-left whitespace-nowrap">실행 주체</th><th className="py-5 px-8 text-left whitespace-nowrap">감사 내역 (Action)</th><th className="py-5 px-8 text-right whitespace-nowrap">접속 IP / 타임스탬프</th></tr></thead><tbody className="divide-y divide-stone-50">
                    {logs.map(l => (
                      <tr key={l.id} className="hover:bg-stone-50/50 transition-all"><td className="py-6 px-8 font-black text-stone-800 text-xs uppercase whitespace-nowrap">{l.username || 'Unknown Operator'}</td><td className="py-6 px-8"><span className={`text-[9px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-widest ${l.action.includes('ADMIN') ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>{l.action}</span></td><td className="py-6 px-8 text-right flex flex-col items-end gap-1 whitespace-nowrap"><span className="text-[10px] text-stone-400 font-mono font-bold">{l.ip_address}</span><span className="text-[9px] text-stone-300 font-mono">{new Date(l.created_at).toLocaleString('ko-KR')}</span></td></tr>
                    ))}
                  </tbody></table></div>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
