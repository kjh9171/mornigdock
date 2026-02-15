import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // useQueryClient 임포트
import {
  User as UserIcon, // User 아이콘과 User 타입을 구분하기 위해 별칭 사용
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
import { LoginForm, RegisterForm } from './components/Auth';
import { useAuth } from './hooks/useAuth';
import { User, InsertNews } from '@shared/schema';

// --- Storyport 디자인 시스템 컴포넌트 ---
export const Card = ({ children, className = "" }) => (
  <div className={`bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl border border-black/10 dark:border-white/10 shadow-lg ${className}`}>
    {children}
  </div>
);

export const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon }) => {
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

// API로부터 게시글 데이터를 가져오는 함수
const fetchPosts = async () => {
  const token = localStorage.getItem('jwt_token');
  const response = await fetch('/api/news', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }); // 백엔드 API 엔드포인트 호출
  if (!response.ok) {
    throw new Error('네트워크 응답이 올바르지 않습니다.');
  }
  return response.json();
};



export default function App() {
  const [theme, setTheme] = useState('light');
  const [currentView, setCurrentView] = useState('dashboard');
  const [adminTab, setAdminTab] = useState('users');
  const [selectedPost, setSelectedPost] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
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

  // useAuth 훅을 사용하여 인증 상태 관리
  const { isAuthenticated, user, token, isLoading: authLoading, login, register, logout } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false); // 회원가입 폼 표시 여부
  const [mfaRequired, setMfaRequired] = useState(false); // MFA 필요 여부

  const queryClient = useQueryClient();

  // TanStack Query를 사용하여 게시글 데이터 가져오기
  const { data: posts, isLoading: postsLoading, error: postsError } = useQuery({
    queryKey: ['posts'], // 쿼리 키 정의
    queryFn: fetchPosts, // 데이터를 가져올 함수
    enabled: isAuthenticated, // 인증된 경우에만 쿼리 실행
  });
  
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
    // API를 통해 게시글 생성 또는 업데이트 후 쿼리 무효화
    // 이 예시에서는 API 호출 부분을 생략하고 쿼리 무효화만 표시
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    setIsPostManagementModalOpen(false);
    setEditingPostManagement(null);
  };

  // 게시글 삭제 핸들러
  const handleDeletePostManagement = (id) => {
    if (window.confirm("정말 이 게시글을 삭제하시겠습니까?")) {
      // API를 통해 게시글 삭제 후 쿼리 무효화
      // 이 예시에서는 API 호출 부분을 생략하고 쿼리 무효화만 표시
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    }
  };

  // --- 메인 앱 렌더링 ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--dark-background)] flex items-center justify-center p-6 font-lora">
        <Card className="w-full max-w-sm p-10 text-center shadow-2xl bg-[var(--card-background)] dark:bg-[var(--dark-card-background)]">
          <h1 className="text-3xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)] mb-6">
            로딩 중...
          </h1>
          <p className="text-sm text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70">인증 상태를 확인하고 있습니다.</p>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--dark-background)] flex items-center justify-center p-6 font-lora">
        {isRegistering ? (
          <RegisterForm
            onRegisterSuccess={() => {
              setIsRegistering(false);
              setCurrentView('dashboard');
              queryClient.invalidateQueries({ queryKey: ['posts'] }); // 게시글 쿼리 무효화
            }}
            onNavigateToLogin={() => setIsRegistering(false)}
          />
        ) : (
          <LoginForm
            onLoginSuccess={async (success, mfaRequiredResult) => {
              if (success) {
                setCurrentView('dashboard');
                setMfaRequired(false); // 로그인 성공 시 MFA 상태 초기화
                queryClient.invalidateQueries({ queryKey: ['posts'] }); // 게시글 쿼리 무효화
              } else if (mfaRequiredResult) {
                setMfaRequired(true);
              }
            }}
            onNavigateToRegister={() => setIsRegistering(true)}
          />
        )}
      </div>
    );
  }

  // MFA가 필요할 경우 MFA 입력 폼 렌더링 (임시)
  if (mfaRequired) {
    return (
      <div className="min-h-screen bg-[var(--background)] dark:bg-[var(--dark-background)] flex items-center justify-center p-6 font-lora">
        <Card className="w-full max-w-sm p-10 text-center shadow-2xl bg-[var(--card-background)] dark:bg-[var(--dark-card-background)]">
          <h1 className="text-3xl font-bold font-lora text-[var(--foreground)] dark:text-[var(--dark-foreground)] mb-6">MFA 인증 필요</h1>
          <p className="text-sm text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70 mb-4">로그인을 완료하려면 OTP 토큰을 입력하세요.</p>
          {/* TODO: 실제 MFA 입력 폼 컴포넌트 추가 */}
          <input type="text" placeholder="OTP 토큰" className="w-full p-3 bg-[var(--input)] dark:bg-[var(--dark-input)] rounded-lg border border-[var(--border)] dark:border-[var(--dark-border)] mb-4" />
          <Button className="w-full">인증</Button>
          <Button variant="ghost" className="w-full mt-4" onClick={logout}>다른 계정으로 로그인</Button>
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
              <img src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username || 'Guest'}`} className="w-10 h-10 rounded-full bg-[var(--secondary)]" alt="profile" />
              {isSidebarOpen && (
                <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold truncate text-[var(--foreground)] dark:text-[var(--dark-foreground)]">{user?.username}</p>
                  <p className="text-xs text-[var(--foreground)]/70 dark:text-[var(--dark-foreground)]/70 truncate">{user?.email}</p>
                </div>
              )}
              {isSidebarOpen && <Button onClick={logout} variant="ghost" className="p-2"><LogOut size={18} /></Button>}
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