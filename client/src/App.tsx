import React, { useState, useEffect } from 'react';
import { 
  User, 
  Settings, 
  MessageSquare, 
  FileText, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  ArrowLeft,
  Menu,
  X,
  Send,
  Youtube,
  Mic,
  Play,
  Save,
  Key,
  Layers,
  Share2,
  ThumbsUp,
  Eye,
  BookOpen, // 이야기 아이콘
  Anchor, // 항구(Port) 아이콘
  Music, // 음악 아이콘
  LogIn,
  LogOut,
  Sun,
  Moon,
  Users
} from 'lucide-react';

// --- Storyport 디자인 시스템 컴포넌트 ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl border border-black/10 dark:border-white/10 shadow-lg ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon }) => {
  const variants = {
    primary: "bg-[#8c6d62] text-white hover:bg-[#a38b82] shadow-md",
    secondary: "bg-[#eaddd7] text-[#8c6d62] hover:bg-[#f5f0eb]",
    danger: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-[#8c6d62] text-[#8c6d62] hover:bg-[#f5f0eb]",
    ghost: "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700",
  };
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all duration-300 text-sm font-semibold disabled:opacity-50 active:scale-95 ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

// ... (Modal 컴포넌트들은 아래 App 컴포넌트 내에서 사용됩니다)


export default function App() {
  const [theme, setTheme] = useState('light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [adminTab, setAdminTab] = useState('users');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [newCommentText, setNewCommentText] = useState("");
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState(null);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playingMedia, setPlayingMedia] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isPostManagementModalOpen, setIsPostManagementModalOpen] = useState(false);
  const [editingPostManagement, setEditingPostManagement] = useState(null);

  const [posts, setPosts] = useState([
    { id: 1, title: "스토리포트에 오신 것을 환영합니다", content: "이곳은 당신의 이야기가 머무는 항구입니다.\n자유롭게 글을 쓰고, 음악을 감상하며 영감을 나눠보세요.", author: "운영팀", authorEmail: "cert@storyport.io", type: "notice", views: 156, likes: 62, createdAt: "2024-02-14 10:00" },
    { id: 2, title: "오늘의 추천 플레이리스트", content: "나른한 오후, 잠시 쉬어가고 싶을 때 듣기 좋은 음악들을 모아봤습니다.", author: "DJ 아톰", authorEmail: "atom@storyport.io", type: "post", views: 92, likes: 38, createdAt: "2024-02-14 11:30" },
  ]);

  const [users, setUsers] = useState([
    { id: 1, name: "김종환 대표님", email: "kjh9171@storyport.io", role: "admin", status: "active", createdAt: "2023-01-01" },
    { id: 2, name: "DJ 아톰", email: "atom@storyport.io", role: "editor", status: "active", createdAt: "2023-03-15" },
    { id: 3, name: "일반 이용자", email: "viewer@storyport.io", role: "viewer", status: "inactive", createdAt: "2023-06-20" },
  ]);

  const [mediaAssets, setMediaAssets] = useState([
    { id: 1, name: "고요한 항구의 풍경", type: "image", url: "https://picsum.photos/seed/harbor/800/450", size: "1.2MB" },
    { id: 2, name: "Lo-fi Jazz for study", type: "youtube", url: "https://www.youtube.com/watch?v=5qap5aO4i9A", size: "Remote" },
    { id: 3, name: "이야기 팟캐스트: 첫 항해", type: "podcast", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", size: "Streaming" },
  ]);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleLogin = () => {
    // 로그인 시뮬레이션
    setUser({
      email: "kjh9171@storyport.io",
      name: "김종환 대표님",
      role: "admin",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=SP",
    });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };
  
  const openPostDetail = (post) => {
    setSelectedPost(post);
    setCurrentView('post-detail');
    setComments([
      { id: 1, author: "운영팀", content: "첫 댓글입니다. 자유롭게 의견을 나눠주세요.", createdAt: "2026-02-14 15:00" }
    ]);
    setNewCommentText("");
  };

  // ... (다른 핸들러 함수들: handleAddEditMedia, handleDeleteMedia, etc.)

  const renderDashboard = () => (
    <div className="space-y-8">
      {posts.map(post => (
        <Card key={post.id} className="p-8 cursor-pointer" onClick={() => openPostDetail(post)}>
          <h3 className="text-2xl font-bold font-lora text-gray-900 dark:text-white">{post.title}</h3>
          <p className="text-sm text-gray-500 mt-2">by {post.author}</p>
          <p className="mt-4 text-gray-700 dark:text-gray-300 line-clamp-2">{post.content}</p>
        </Card>
      ))}
    </div>
  );

  const renderMedia = () => (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mediaAssets.map(asset => (
          <Card key={asset.id} className="group">
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative overflow-hidden rounded-t-xl">
              {asset.type === 'youtube' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/10">
                  <Youtube size={48} className="text-red-500" />
                </div>
              ) : asset.type === 'podcast' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-purple-500/10">
                  <Mic size={48} className="text-purple-500" />
                </div>
              ) : (
                <img src={asset.url} className="w-full h-full object-cover" alt={asset.name} />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button onClick={() => { setPlayingMedia(asset); setIsPlayerModalOpen(true);}} className="rounded-full w-16 h-16 p-0" icon={Play} />
              </div>
            </div>
            <div className="p-4">
              <h4 className="font-bold truncate">{asset.name}</h4>
              <p className="text-xs text-gray-500">{asset.type}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCommunity = () => (
    <div>
      <h2 className="text-3xl font-bold font-lora mb-6">커뮤니티</h2>
      <p>커뮤니티 기능은 현재 개발 중입니다.</p>
    </div>
  );

  const renderPostDetail = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <Button onClick={() => {setSelectedPost(null); setCurrentView('dashboard');}} icon={ArrowLeft}>모든 이야기로 돌아가기</Button>
      <Card className="p-8">
        <h1 className="text-4xl font-bold font-lora">{selectedPost?.title}</h1>
        <p className="text-sm text-gray-500 mt-2">by {selectedPost?.author} on {selectedPost?.createdAt}</p>
        <div className="mt-8 prose dark:prose-invert max-w-none">
          <p>{selectedPost?.content}</p>
        </div>
      </Card>
      {/* 댓글 기능은 여기에 추가 */}
    </div>
  );
  
  const renderAdmin = () => (
    <div>
        <h2 className="text-3xl font-bold font-lora mb-6">관리자 센터</h2>
        {/* 관리자 탭 등 구현 */}
        <p>관리자 기능은 현재 개발 중입니다.</p>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fdfaf6] dark:bg-[#1a1a1a] flex items-center justify-center p-6 font-lora">
        <Card className="w-full max-w-sm p-10 text-center shadow-2xl">
          <Anchor className="mx-auto text-[#8c6d62] mb-4" size={48} />
          <h1 className="text-4xl font-bold text-[#3a3a3a] dark:text-white">Storyport</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">당신의 이야기가 머무는 항구</p>
          <div className="mt-8">
            <Button onClick={handleLogin} icon={LogIn} className="w-full">관리자 로그인</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex font-poppins">
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-white/30 dark:bg-gray-800/20 backdrop-blur-xl border-r border-black/5 dark:border-white/5 transition-all duration-500 flex flex-col`}>
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-[#8c6d62] rounded-lg flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            <Anchor size={24} />
          </div>
          {isSidebarOpen && (
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none">Storyport</h1>
              <span className="text-xs text-gray-500">이야기 항구</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-6 space-y-2">
          {[
            { id: 'dashboard', icon: BookOpen, label: '모든 이야기' },
            { id: 'media', icon: Music, label: '음악 & 미디어' },
            { id: 'community', icon: MessageSquare, label: '커뮤니티' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {setSelectedPost(null); setCurrentView(item.id);}}
              className={`w-full flex items-center gap-4 px-5 py-3 rounded-lg transition-all duration-300 ${
                currentView === item.id && !selectedPost ? 'bg-[#8c6d62] text-white shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="text-sm font-semibold">{item.label}</span>}
            </button>
          ))}
          
          {user.role === 'admin' && (
            <div className="mt-8 pt-8 border-t border-black/5 dark:border-white/5">
              {isSidebarOpen && <p className="px-5 text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Admin</p>}
              <button
                onClick={() => {setSelectedPost(null); setCurrentView('admin');}}
                className={`w-full flex items-center gap-4 px-5 py-3 rounded-lg transition-all ${
                  currentView === 'admin' ? 'bg-[#3a3a3a] dark:bg-white text-white dark:text-gray-800 shadow-lg' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Settings size={20} />
                {isSidebarOpen && <span className="text-sm font-semibold">관리자 센터</span>}
              </button>
            </div>
          )}
        </nav>

        <div className="p-6">
          <Card className="p-4">
            <div className="flex items-center gap-4">
              <img src={user.avatar} className="w-10 h-10 rounded-full bg-gray-200" alt="profile" />
              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold truncate">{user.name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              )}
              {isSidebarOpen && <Button onClick={handleLogout} variant="ghost" className="p-2"><LogOut size={18} /></Button>}
            </div>
          </Card>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-24 bg-white/10 backdrop-blur-xl border-b border-black/5 dark:border-white/5 px-10 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              <Menu size={22} className="text-gray-500" />
            </button>
            <h2 className="text-2xl font-bold tracking-tight capitalize font-lora">
              {selectedPost ? '이야기 상세' : currentView.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input type="text" placeholder="이야기 검색..." className="pl-12 pr-4 py-3 bg-white/50 dark:bg-gray-800/50 border border-black/10 dark:border-white/10 rounded-lg text-sm w-96 focus:ring-2 focus:ring-[#8c6d62] transition-all" />
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 space-y-10 scroll-smooth custom-scrollbar">
          {currentView === 'dashboard' && !selectedPost && renderDashboard()}
          {currentView === 'media' && !selectedPost && renderMedia()}
          {currentView === 'community' && !selectedPost && renderCommunity()}
          {currentView === 'admin' && !selectedPost && renderAdmin()}
          {selectedPost && renderPostDetail()}
        </div>
      </main>
    </div>
  );
}