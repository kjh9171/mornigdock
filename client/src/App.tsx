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
  Users,
  LayoutDashboard
} from 'lucide-react';

// --- Storyport 디자인 시스템 컴포넌트 ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl border border-black/10 dark:border-white/10 shadow-lg ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon }) => {
  const variants = {
    primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 shadow-md",
    secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--secondary)]/90",
    danger: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--secondary)]",
    ghost: "text-[var(--foreground)]/70 hover:bg-[var(--secondary)]",
    dark: "bg-[var(--dark-card-background)] text-[var(--dark-card-foreground)] hover:bg-[var(--dark-card-background)]/80"
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

// MediaModal 컴포넌트 (추가/편집 모달)
const MediaModal = ({ isOpen, onClose, onSave, media }) => {
  const [name, setName] = useState(media?.name || '');
  const [type, setType] = useState(media?.type || 'image');
  const [url, setUrl] = useState(media?.url || '');
  const [size, setSize] = useState(media?.size || '');

  useEffect(() => {
    if (media) {
      setName(media.name);
      setType(media.type);
      setUrl(media.url);
      setSize(media.size);
    } else {
      setName('');
      setType('image');
      setUrl('');
      setSize('');
    }
  }, [media]);

  const handleSubmit = () => {
    onSave({ ...media, name, type, url, size });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-lg p-8 space-y-6 bg-white dark:bg-[var(--dark-card-background)] dark:text-[var(--dark-card-foreground)]">
        <h3 className="text-2xl font-bold font-lora">{media ? '미디어 편집' : '새 미디어 추가'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">타입</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]">
              <option value="image">이미지</option>
              <option value="youtube">유튜브</option>
              <option value="podcast">팟캐스트</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">URL</label>
            <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">크기/정보</label>
            <input type="text" value={size} onChange={(e) => setSize(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]" />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit}>{media ? '저장' : '추가'}</Button>
        </div>
      </Card>
    </div>
  );
};

// MediaPlayerModal 컴포넌트 (재생 모달)
const MediaPlayerModal = ({ isOpen, onClose, media }) => {
  if (!isOpen || !media) return null;

  const getYouTubeEmbedUrl = (url) => {
    const videoIdMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}?autoplay=1` : '';
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-4xl p-4 space-y-4 bg-white dark:bg-[var(--dark-card-background)] dark:text-[var(--dark-card-foreground)]">
        <h3 className="text-xl font-bold font-lora">{media.name}</h3>
        <div className="relative aspect-video w-full">
          {media.type === 'youtube' && (
            <iframe
              className="absolute inset-0 w-full h-full rounded-lg"
              src={getYouTubeEmbedUrl(media.url)}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={media.name}
            ></iframe>
          )}
          {media.type === 'podcast' && (
            <audio controls autoPlay className="w-full rounded-lg">
              <source src={media.url} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          )}
          {media.type === 'image' && (
            <img src={media.url} alt={media.name} className="w-full h-full object-contain rounded-lg" />
          )}
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>닫기</Button>
        </div>
      </Card>
    </div>
  );
};

// UserModal 컴포넌트 (사용자 추가/편집 모달)
const UserModal = ({ isOpen, onClose, onSave, user }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [role, setRole] = useState(user?.role || 'viewer');
  const [status, setStatus] = useState(user?.status || 'active');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setStatus(user.status);
    } else {
      setName('');
      setEmail('');
      setRole('viewer');
      setStatus('active');
    }
  }, [user]);

  const handleSubmit = () => {
    onSave({ ...user, name, email, role, status });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-lg p-8 space-y-6 bg-white dark:bg-[var(--dark-card-background)] dark:text-[var(--dark-card-foreground)]">
        <h3 className="text-2xl font-bold font-lora">{user ? '사용자 편집' : '새 사용자 추가'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">역할</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]">
              <option value="admin">관리자</option>
              <option value="editor">에디터</option>
              <option value="viewer">뷰어</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">상태</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]">
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit}>{user ? '저장' : '추가'}</Button>
        </div>
      </Card>
    </div>
  );
};

// PostManagementModal 컴포넌트 (게시글 추가/편집 모달)
const PostManagementModal = ({ isOpen, onClose, onSave, post }) => {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [type, setType] = useState(post?.type || 'post');

  useEffect(() => {
    if (post) {
      setTitle(post.title);
      setContent(post.content);
      setType(post.type);
    } else {
      setTitle('');
      setContent('');
      setType('post');
    }
  }, [post]);

  const handleSubmit = () => {
    onSave({ ...post, title, content, type });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <Card className="w-full max-w-2xl p-8 space-y-6 bg-white dark:bg-[var(--dark-card-background)] dark:text-[var(--dark-card-foreground)]">
        <h3 className="text-2xl font-bold font-lora">{post ? '게시글 편집' : '새 게시글 작성'}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">제목</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">내용</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="w-full min-h-[150px] p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg resize-y border border-[var(--border)] dark:border-[var(--dark-border)]" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">타입</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]">
              <option value="post">일반</option>
              <option value="notice">공지</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>취소</Button>
          <Button onClick={handleSubmit}>{post ? '저장' : '작성'}</Button>
        </div>
      </Card>
    </div>
  );
};


export default function App() {
  const [theme, setTheme] = useState('light');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [adminTab, setAdminTab] = useState('users');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가
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

  // 로그인 핸들러
  const handleLogin = () => {
    // 실제 OTP 인증 로직 대신 관리자 계정으로 로그인 시뮬레이션
    setUser({
      email: "kjh9171@storyport.io",
      name: "김종환 대표님",
      role: "admin",
      avatar: "https://api.dicebear.com/7.x/initials/svg?seed=SP",
    });
    setIsAuthenticated(true);
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCurrentView('dashboard'); // 로그아웃 시 대시보드로 이동
  };
  
  // 게시글 상세 보기 핸들러
  const openPostDetail = (post) => {
    setSelectedPost(post);
    setCurrentView('community'); // 상세 페이지로 이동
    setComments([
      { id: 1, author: "운영팀", content: "첫 댓글입니다. 자유롭게 의견을 나눠주세요.", createdAt: "2026-02-14 15:00" }
    ]);
    setNewCommentText("");
  };

  // 댓글 제출 핸들러
  const handleCommentSubmit = () => {
    if (newCommentText.trim() === "" || !user) return; // 로그인하지 않았으면 댓글 작성 불가

    const newComment = {
      id: comments.length + 1,
      author: user.name,
      content: newCommentText,
      createdAt: new Date().toLocaleString(),
    };

    setComments([...comments, newComment]);
    setNewCommentText("");
  };

  // 미디어 추가/편집 핸들러
  const handleAddEditMedia = (media) => {
    if (editingMedia) {
      setMediaAssets(mediaAssets.map(item => (item.id === media.id ? media : item)));
    } else {
      setMediaAssets([...mediaAssets, { ...media, id: mediaAssets.length ? Math.max(...mediaAssets.map(m => m.id)) + 1 : 1 }]);
    }
    setIsMediaModalOpen(false);
    setEditingMedia(null);
  };

  // 미디어 삭제 핸들러
  const handleDeleteMedia = (id) => {
    if (window.confirm("정말 이 미디어를 삭제하시겠습니까?")) {
      setMediaAssets(mediaAssets.filter(item => item.id !== id));
    }
  };

  // 미디어 플레이어 열기 핸들러
  const openMediaPlayer = (media) => {
    setPlayingMedia(media);
    setIsPlayerModalOpen(true);
  };

  // 사용자 추가/편집 핸들러
  const handleAddEditUser = (userData) => {
    if (editingUser) {
      setUsers(users.map(u => (u.id === userData.id ? userData : u)));
    } else {
      setUsers([...users, { ...userData, id: users.length ? Math.max(...users.map(u => u.id)) + 1 : 1, createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  // 사용자 삭제 핸들러
  const handleDeleteUser = (id) => {
    if (window.confirm("정말 이 사용자를 삭제하시겠습니까?")) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  // 게시글 추가/편집 핸들러
  const handleAddEditPostManagement = (postData) => {
    if (editingPostManagement) {
      setPosts(posts.map(p => (p.id === postData.id ? postData : p)));
    } else {
      setPosts([...posts, { ...postData, id: posts.length ? Math.max(...posts.map(p => p.id)) + 1 : 1, author: user.name, authorEmail: user.email, views: 0, likes: 0, createdAt: new Date().toLocaleString() }]);
    }
    setIsPostManagementModalOpen(false);
    setEditingPostManagement(null);
  };

  // 게시글 삭제 핸들러
  const handleDeletePostManagement = (id) => {
    if (window.confirm("정말 이 게시글을 삭제하시겠습니까?")) {
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  // --- 렌더링 함수들 ---
  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <h2 className="text-4xl font-bold font-lora mb-6 text-[var(--foreground)] dark:text-[var(--dark-foreground)]">모든 이야기</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <Card key={post.id} className="p-6 cursor-pointer hover:shadow-xl transition-shadow duration-300" onClick={() => openPostDetail(post)}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">{post.title}</h3>
              {post.type === 'notice' && (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-[var(--secondary)] text-[var(--secondary-foreground)]">공지</span>
              )}
            </div>
            <p className="text-sm text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70 mt-2 line-clamp-3">{post.content}</p>
            <p className="text-xs text-[var(--foreground)]/50 dark:text-[var(--dark-foreground)]/50 mt-4">by {post.author} on {post.createdAt}</p>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderMedia = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">음악 & 미디어</h2>
        <div className="flex gap-3">
          <Button variant="outline" icon={Youtube} className="text-sm" onClick={() => { setIsMediaModalOpen(true); setEditingMedia(null); }}>유튜브 추가</Button>
          <Button variant="outline" icon={Mic} className="text-sm" onClick={() => { setIsMediaModalOpen(true); setEditingMedia(null); }}>팟캐스트 추가</Button>
          <Button icon={Plus} className="text-sm" onClick={() => { setIsMediaModalOpen(true); setEditingMedia(null); }}>미디어 업로드</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mediaAssets.map(asset => (
          <Card key={asset.id} className="group overflow-hidden">
            <div className="aspect-video bg-[var(--secondary)] dark:bg-[var(--dark-input)] relative flex items-center justify-center">
              {asset.type === 'youtube' && <Youtube size={48} className="text-red-500" />}
              {asset.type === 'podcast' && <Mic size={48} className="text-purple-500" />}
              {asset.type === 'image' && <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />}
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button onClick={() => openMediaPlayer(asset)} className="rounded-full w-14 h-14 p-0" icon={Play} />
              </div>
            </div>
            <div className="p-4 space-y-2 bg-white dark:bg-[var(--dark-card-background)]">
              <h4 className="font-bold font-lora truncate text-[var(--foreground)] dark:text-[var(--dark-foreground)]">{asset.name}</h4>
              <p className="text-xs text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70">{asset.type} • {asset.size}</p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" icon={Edit3} className="flex-1" onClick={() => { setIsMediaModalOpen(true); setEditingMedia(asset); }}>편집</Button>
                <Button variant="danger" icon={Trash2} className="flex-1" onClick={() => handleDeleteMedia(asset.id)}>삭제</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderCommunity = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <h2 className="text-4xl font-bold font-lora mb-6 text-[var(--foreground)] dark:text-[var(--dark-foreground)]">커뮤니티 광장</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <Card key={post.id} className="p-6 cursor-pointer hover:shadow-xl transition-shadow duration-300" onClick={() => openPostDetail(post)}>
            <h3 className="text-xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">{post.title}</h3>
            <p className="text-sm text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70 mt-2 line-clamp-3">{post.content}</p>
            <p className="text-xs text-[var(--foreground)]/50 dark:text-[var(--dark-foreground)]/50 mt-4">by {post.author}</p>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderPostDetail = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <Button onClick={() => {setSelectedPost(null); setCurrentView('community');}} icon={ArrowLeft} variant="outline">커뮤니티로 돌아가기</Button>
      <Card className="p-8 bg-white dark:bg-[var(--dark-card-background)]">
        <h1 className="text-4xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">{selectedPost?.title}</h1>
        <p className="text-sm text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70 mt-2">by {selectedPost?.author} on {selectedPost?.createdAt}</p>
        <div className="mt-8 prose dark:prose-invert max-w-none text-[var(--foreground)] dark:text-[var(--dark-foreground)]">
          <p>{selectedPost?.content}</p>
        </div>
        <div className="flex items-center gap-4 mt-8 pt-4 border-t border-[var(--border)] dark:border-[var(--dark-border)]">
          <Button variant="ghost" icon={ThumbsUp}>{selectedPost?.likes} 좋아요</Button>
          <Button variant="ghost" icon={Eye}>{selectedPost?.views} 조회수</Button>
          <Button variant="ghost" icon={Share2}>공유</Button>
        </div>
      </Card>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">댓글</h3>
        <Card className="p-6 bg-white dark:bg-[var(--dark-card-background)]">
          <textarea
            className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)] min-h-[100px]"
            placeholder={user ? "댓글을 작성해주세요." : "로그인 후 댓글을 작성할 수 있습니다."}
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            disabled={!user}
          />
          <div className="flex justify-end mt-4">
            <Button onClick={handleCommentSubmit} disabled={!user} icon={Send}>댓글 작성</Button>
          </div>
        </Card>
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card key={comment.id} className="p-4 bg-white dark:bg-[var(--dark-card-background)]">
              <p className="text-sm font-semibold text-[var(--foreground)] dark:text-[var(--dark-foreground)]">{comment.author}</p>
              <p className="text-xs text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70">{comment.createdAt}</p>
              <p className="mt-2 text-[var(--foreground)] dark:text-[var(--dark-foreground)]">{comment.content}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
  
  const renderAdmin = () => (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-end mb-6">
        <h2 className="text-4xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">관리자 센터</h2>
        <div className="flex gap-2 p-1 bg-[var(--secondary)] dark:bg-[var(--dark-input)] rounded-lg">
          <Button variant={adminTab === 'users' ? 'primary' : 'ghost'} onClick={() => setAdminTab('users')} icon={Users}>사용자</Button>
          <Button variant={adminTab === 'posts' ? 'primary' : 'ghost'} onClick={() => setAdminTab('posts')} icon={FileText}>게시글</Button>
          <Button variant={adminTab === 'settings' ? 'primary' : 'ghost'} onClick={() => setAdminTab('settings')} icon={Settings}>설정</Button>
        </div>
      </div>

      {adminTab === 'users' && (
        <Card className="p-8 bg-white dark:bg-[var(--dark-card-background)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">사용자 관리</h3>
            <Button icon={Plus} onClick={() => { setIsUserModalOpen(true); setEditingUser(null); }}>새 사용자 추가</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-[var(--dark-card-background)] rounded-lg">
              <thead>
                <tr className="text-left bg-[var(--secondary)] dark:bg-[var(--dark-input)] text-[var(--secondary-foreground)] dark:text-[var(--dark-foreground)]">
                  <th className="py-3 px-4 rounded-tl-lg">ID</th>
                  <th className="py-3 px-4">이름</th>
                  <th className="py-3 px-4">이메일</th>
                  <th className="py-3 px-4">역할</th>
                  <th className="py-3 px-4">상태</th>
                  <th className="py-3 px-4 rounded-tr-lg">액션</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-[var(--border)] dark:border-[var(--dark-border)] text-[var(--foreground)] dark:text-[var(--dark-foreground)]">
                    <td className="py-3 px-4">{u.id}</td>
                    <td className="py-3 px-4">{u.name}</td>
                    <td className="py-3 px-4">{u.email}</td>
                    <td className="py-3 px-4">{u.role}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>{u.status}</span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <Button variant="ghost" icon={Edit3} onClick={() => { setIsUserModalOpen(true); setEditingUser(u); }}>편집</Button>
                      <Button variant="danger" icon={Trash2} onClick={() => handleDeleteUser(u.id)}>삭제</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {adminTab === 'posts' && (
        <Card className="p-8 bg-white dark:bg-[var(--dark-card-background)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">게시글 관리</h3>
            <Button icon={Plus} onClick={() => { setIsPostManagementModalOpen(true); setEditingPostManagement(null); }}>새 게시글 작성</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-[var(--dark-card-background)] rounded-lg">
              <thead>
                <tr className="text-left bg-[var(--secondary)] dark:bg-[var(--dark-input)] text-[var(--secondary-foreground)] dark:text-[var(--dark-foreground)]">
                  <th className="py-3 px-4 rounded-tl-lg">ID</th>
                  <th className="py-3 px-4">제목</th>
                  <th className="py-3 px-4">작성자</th>
                  <th className="py-3 px-4">타입</th>
                  <th className="py-3 px-4">조회수</th>
                  <th className="py-3 px-4">좋아요</th>
                  <th className="py-3 px-4 rounded-tr-lg">액션</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(p => (
                  <tr key={p.id} className="border-b border-[var(--border)] dark:border-[var(--dark-border)] text-[var(--foreground)] dark:text-[var(--dark-foreground)]">
                    <td className="py-3 px-4">{p.id}</td>
                    <td className="py-3 px-4">{p.title}</td>
                    <td className="py-3 px-4">{p.author}</td>
                    <td className="py-3 px-4">{p.type}</td>
                    <td className="py-3 px-4">{p.views}</td>
                    <td className="py-3 px-4">{p.likes}</td>
                    <td className="py-3 px-4 flex gap-2">
                      <Button variant="ghost" icon={Edit3} onClick={() => { setIsPostManagementModalOpen(true); setEditingPostManagement(p); }}>편집</Button>
                      <Button variant="danger" icon={Trash2} onClick={() => handleDeletePostManagement(p.id)}>삭제</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {adminTab === 'settings' && (
        <Card className="p-8 bg-white dark:bg-[var(--dark-card-background)]">
          <h3 className="text-2xl font-bold font-lora mb-6 text-[var(--foreground)] dark:text-[var(--dark-foreground)]">AI 분석 설정</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">API 키</label>
              <input type="password" value="****************" readOnly className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">분석 모델</label>
              <select className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]">
                <option>Gemini 1.5 Flash (초고속)</option>
                <option>Gemini 1.5 Pro (정밀)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">스크랩 주기</label>
              <input type="text" value="1시간마다" readOnly className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)]" />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button icon={Save}>설정 저장</Button>
          </div>
        </Card>
      )}
    </div>
  );

  // --- 메인 앱 렌더링 ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--dark-background)] flex items-center justify-center p-6 font-lora">
        <Card className="w-full max-w-sm p-10 text-center shadow-2xl bg-[var(--card-background)] dark:bg-[var(--dark-card-background)]">
          <Anchor className="mx-auto text-[var(--primary)] mb-4" size={48} />
          <h1 className="text-4xl font-bold text-[var(--foreground)] dark:text-[var(--dark-foreground)]">Storyport</h1>
          <p className="mt-2 text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70">당신의 이야기가 머무는 항구</p>
          <div className="mt-8">
            <Button onClick={handleLogin} icon={LogIn} className="w-full">관리자 로그인</Button>
            {/* 실제 가입 로직은 백엔드 연동이 필요하므로 현재는 시뮬레이션 */}
            <p className="text-xs text-[var(--foreground)]/50 dark:text-[var(--dark-foreground)]/50 mt-4">
              * 일반 사용자 가입은 현재 준비 중입니다.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--dark-background)] text-[var(--foreground)] dark:text-[var(--dark-foreground)] flex font-poppins">
      {/* 사이드바 */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-[var(--card-background)]/30 dark:bg-[var(--dark-card-background)]/30 backdrop-blur-xl border-r border-[var(--border)] dark:border-[var(--dark-border)] transition-all duration-500 flex flex-col shadow-lg`}>
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-[var(--primary)] rounded-lg flex items-center justify-center text-[var(--primary-foreground)] font-bold text-2xl shadow-lg">
            <Anchor size={24} />
          </div>
          {isSidebarOpen && (
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none text-[var(--foreground)] dark:text-[var(--dark-foreground)]">Storyport</h1>
              <span className="text-xs text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70">이야기 항구</span>
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
                currentView === item.id && !selectedPost ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg' : 'text-[var(--foreground)]/70 hover:bg-[var(--secondary)]'
              }`}
            >
              <item.icon size={20} />
              {isSidebarOpen && <span className="text-sm font-semibold">{item.label}</span>}
            </button>
          ))}
          
          {user && user.role === 'admin' && (
            <div className="mt-8 pt-8 border-t border-[var(--border)] dark:border-[var(--dark-border)]">
              {isSidebarOpen && <p className="px-5 text-xs font-bold text-[var(--foreground)]/50 dark:text-[var(--dark-foreground)]/50 uppercase tracking-wider mb-3">관리자 메뉴</p>}
              <button
                onClick={() => {setSelectedPost(null); setCurrentView('admin');}}
                className={`w-full flex items-center gap-4 px-5 py-3 rounded-lg transition-all ${
                  currentView === 'admin' ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg' : 'text-[var(--foreground)]/70 hover:bg-[var(--secondary)]'
                }`}
              >
                <Settings size={20} />
                {isSidebarOpen && <span className="text-sm font-semibold">관리자 센터</span>}
              </button>
            </div>
          )}
        </nav>

        <div className="p-6">
          <Card className="p-4 bg-white dark:bg-[var(--dark-card-background)]">
            <div className="flex items-center gap-4">
              <img src={user.avatar} className="w-10 h-10 rounded-full bg-[var(--secondary)]" alt="profile" />
              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold truncate text-[var(--foreground)] dark:text-[var(--dark-foreground)]">{user.name}</p>
                  <p className="text-xs text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70 truncate">{user.email}</p>
                </div>
              )}
              {isSidebarOpen && <Button onClick={handleLogout} variant="ghost" className="p-2"><LogOut size={18} /></Button>}
            </div>
          </Card>
        </div>
      </aside>

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-24 bg-[var(--card-background)]/30 dark:bg-[var(--dark-card-background)]/30 backdrop-blur-xl border-b border-[var(--border)] dark:border-[var(--dark-border)] px-10 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-md hover:bg-[var(--secondary)]">
              {isSidebarOpen ? <X size={22} className="text-[var(--foreground)]" /> : <Menu size={22} className="text-[var(--foreground)]" />}
            </button>
            <h2 className="text-2xl font-bold tracking-tight capitalize font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)]">
              {selectedPost ? '이야기 상세' : currentView.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground)]/50" size={18} />
              <input type="text" placeholder="이야기 검색..." className="pl-12 pr-4 py-3 bg-[var(--input)] dark:bg-[var(--dark-input)] border border-[var(--border)] dark:border-[var(--dark-border)] rounded-lg text-sm w-96 focus:ring-2 focus:ring-[var(--primary)] transition-all" />
            </div>
            <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-3 rounded-md hover:bg-[var(--secondary)]">
              {theme === 'light' ? <Moon size={20} className="text-[var(--foreground)]" /> : <Sun size={20} className="text-[var(--foreground)]" />}
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

      {/* 모달 컴포넌트들 */}
      <MediaModal 
        isOpen={isMediaModalOpen} 
        onClose={() => {setIsMediaModalOpen(false); setEditingMedia(null);}} 
        onSave={handleAddEditMedia} 
        media={editingMedia} 
      />

      <MediaPlayerModal 
        isOpen={isPlayerModalOpen} 
        onClose={() => {setIsPlayerModalOpen(false); setPlayingMedia(null);}} 
        media={playingMedia} 
      />

      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {setIsUserModalOpen(false); setEditingUser(null);}}
        onSave={handleAddEditUser}
        user={editingUser}
      />

      <PostManagementModal
        isOpen={isPostManagementModalOpen}
        onClose={() => {setIsPostManagementModalOpen(false); setEditingPostManagement(null);}}
        onSave={handleAddEditPostManagement}
        post={editingPostManagement}
      />
    </div>
  );
}
