import React, { useState, useEffect, useMemo } from 'react';
import { 
  Layout, 
  User, 
  Settings, 
  ShieldCheck, 
  MessageSquare, 
  FileText, 
  Image as ImageIcon, 
  Newspaper, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  ArrowLeft,
  ChevronRight,
  BarChart3,
  Globe,
  Bell,
  MoreVertical,
  Send,
  Loader2,
  Cpu,
  RefreshCw,
  ExternalLink,
  Youtube,
  Mic,
  Play,
  Save,
  Key,
  Layers,
  Lock,
  Smartphone
} from 'lucide-react';

// 안티그래비티 시큐어 UI 컴포넌트: 카드 레이아웃
const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// 안티그래비티 시큐어 UI 컴포넌트: 버튼 시스템
const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
  };
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
};

export default function App() {
  // 인증 및 사용자 상태 관리
  const [isAuthenticated, setIsAuthenticated] = useState(true); // 실제 운영 시 false에서 시작
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [user, setUser] = useState({
    email: "kjh9171@mornigdock.io",
    name: "김종환 대표님",
    role: "admin",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CERT"
  });
  
  // 네비게이션 및 뷰 상태
  const [currentView, setCurrentView] = useState('dashboard');
  const [subView, setSubView] = useState('users');
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 인공지능 뉴스 분석 및 게시글 데이터셋
  const [posts, setPosts] = useState([
    { id: 1, title: "모닝독 인텔리전스 서비스 런칭", content: "모닝독 커뮤니티가 정식으로 시작되었습니다. 인공지능 기반의 뉴스 분석과 토론을 경험하세요.", author: "kjh9171@mornigdock.io", type: "notice", createdAt: "2024-02-14 10:00" },
    { id: 2, title: "멀티모달 AI의 미래", content: "최근 발표된 구글 Gemini 2.5 모델의 특징을 분석합니다.", author: "user1@example.com", type: "post", createdAt: "2024-02-14 11:30" },
  ]);

  const [newsList, setNewsList] = useState([
    { id: 1, source: "연합뉴스", title: "한국 AI 반도체 수출 역대 최대 기록", summary: "정부 발표에 따르면 지난달 반도체 수출액이 폭발적으로 증가하며 경제 성장을 견인하고 있습니다.", analyzedAt: "2024-02-14 09:00", status: "published" },
    { id: 2, source: "네이버뉴스", title: "생성형 AI 시장 규모 100조 돌파", summary: "글로벌 시장 조사 기관들은 생성형 AI 시장의 가파른 성장을 예고하고 있습니다.", analyzedAt: "2024-02-14 08:30", status: "pending" },
  ]);

  // 미디어 관리 (유튜브, 팟캐스트, 이미지 포함)
  const [media, setMedia] = useState([
    { id: 1, name: "대표님 전용 대시보드 로고", type: "image", url: "https://picsum.photos/400/225", size: "120KB" },
    { id: 2, name: "AI 트렌드 기술 분석 영상", type: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", size: "External" },
    { id: 3, name: "모닝독 데일리 팟캐스트 브리핑", type: "podcast", url: "https://example.com/podcast.mp3", size: "External" },
  ]);

  // 관리자 전용 AI 설정 파라미터
  const [aiSettings, setAiSettings] = useState({
    apiKey: "••••••••••••••••",
    model: "gemini-2.5-flash-preview-09-2025",
    scrapInterval: "1h",
    systemPrompt: "당신은 뉴스를 분석하여 핵심 요약과 토론 거리를 제공하는 AI 비서입니다."
  });

  const isAdmin = user.role === 'admin';

  // 1. 구글 OTP 로그인 화면 시뮬레이션
  const renderLogin = () => (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-4">MORNIGDOCK SECURE</h1>
          <p className="text-slate-500 text-sm">안전한 로그인을 위해 인증을 진행해 주세요.</p>
        </div>

        {!isOtpStep ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">이메일 계정</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="email" value={user.email} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500" readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="password" placeholder="••••••••" className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <Button className="w-full py-3 h-12" onClick={() => setIsOtpStep(true)}>다음 단계로</Button>
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="flex flex-col items-center gap-4 py-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800">
              <Smartphone className="text-blue-600 animate-bounce" size={32} />
              <p className="text-sm font-bold text-blue-600 text-center px-4">구글 OTP 앱을 열어<br/>표시된 인증번호 6자리를 입력하세요.</p>
            </div>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <input key={i} type="text" maxLength="1" className="w-12 h-14 text-center text-2xl font-black bg-slate-50 dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 border-none" />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setIsOtpStep(false)}>뒤로가기</Button>
              <Button className="flex-[2]" onClick={() => setIsAuthenticated(true)}>인증 완료 및 입장</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  // 2. 게시글 상세 읽기 페이지 (페이지 형태)
  const renderPostDetail = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => setCurrentView('community')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors">
        <ArrowLeft size={16} /> 커뮤니티 목록으로 돌아가기
      </button>
      <Card className="p-10">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
              {selectedPost?.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">{selectedPost?.title}</h1>
              <div className="flex items-center gap-3 mt-1 text-slate-500 text-sm">
                <span className="font-bold text-blue-600">{selectedPost?.author}</span>
                <span>•</span>
                <span>{selectedPost?.createdAt}</span>
              </div>
            </div>
          </div>
          {(user.email === selectedPost?.author || isAdmin) && (
            <div className="flex gap-2">
              <Button variant="outline" icon={Edit3}>수정</Button>
              <Button variant="danger" icon={Trash2}>삭제</Button>
            </div>
          )}
        </div>
        <div className="prose dark:prose-invert max-w-none text-lg leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
          {selectedPost?.content}
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2 px-2">
          <MessageSquare size={20} className="text-blue-600" /> 답변 및 토론 참여
        </h3>
        <Card className="p-6">
          <textarea 
            placeholder="이 주제에 대한 대표님의 의견이나 답변을 입력하세요..." 
            className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 focus:ring-blue-500 resize-none text-base"
          />
          <div className="flex justify-end mt-4">
            <Button icon={Send} className="px-8 py-3 h-12 shadow-lg shadow-blue-500/20">답변 게시하기</Button>
          </div>
        </Card>
      </div>
    </div>
  );

  // 3. 미디어 보관함 (유튜브/팟캐스트 지원)
  const renderMediaPage = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black tracking-tight">멀티미디어 인텔리전스</h2>
        <div className="flex gap-2">
          <Button variant="outline" icon={Youtube}>유튜브 링크 추가</Button>
          <Button variant="outline" icon={Mic}>팟캐스트 추가</Button>
          <Button icon={Plus}>에셋 업로드</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {media.map(m => (
          <Card key={m.id} className="group hover:-translate-y-2 transition-all duration-300 border-transparent hover:border-blue-500/30">
            <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
              {m.type === 'youtube' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/10">
                  <Youtube size={56} className="text-red-500" />
                  <span className="text-[10px] font-black text-red-500 mt-2 uppercase">YouTube Intelligence</span>
                </div>
              ) : m.type === 'podcast' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-900/10">
                  <Mic size={56} className="text-purple-500" />
                  <span className="text-[10px] font-black text-purple-500 mt-2 uppercase">Audio Insight</span>
                </div>
              ) : (
                <img src={m.url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <Button className="rounded-full w-12 h-12 p-0" icon={Play} />
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-sm truncate flex-1">{m.name}</h4>
                <button className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1">
                {m.type === 'youtube' && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}
                {m.type === 'podcast' && <span className="w-2 h-2 bg-purple-500 rounded-full"></span>}
                {m.type} Asset • {m.size}
              </p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // 4. 관리자 전용 AI 분석 제어판
  const renderAiAdmin = () => (
    <div className="max-w-3xl space-y-6">
      <Card className="p-8 border-l-4 border-blue-600">
        <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Cpu size={24} className="text-blue-600" /> 인공지능 엔진 컨트롤 타워</h3>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase flex items-center gap-2"><Key size={14} /> Gemini API 인증 키</label>
            <div className="flex gap-2">
              <input type="password" value={aiSettings.apiKey} className="flex-1 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm focus:ring-2 focus:ring-blue-600" />
              <Button variant="secondary">재발급</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase">분석 모델 아키텍처</label>
              <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold">
                <option value="flash">Gemini 2.5 Flash (속도 최적화)</option>
                <option value="pro">Gemini 2.5 Pro (정밀 분석)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase">기사 스크랩 빈도</label>
              <select className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm font-bold">
                <option value="15m">15분 마다 (매우 빈번)</option>
                <option value="1h" selected>1시간 마다 (권장)</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase">시스템 코어 프롬프트</label>
            <textarea className="w-full min-h-[150px] p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-none text-sm leading-relaxed" defaultValue={aiSettings.systemPrompt} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost">설정 초기화</Button>
            <Button icon={Save} className="px-8 h-12 shadow-lg shadow-blue-600/30">안전하게 저장 및 적용</Button>
          </div>
        </div>
      </Card>
      
      <Card className="p-6 bg-gradient-to-br from-slate-900 to-blue-900 text-white border-none">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
            <RefreshCw className="animate-spin text-blue-400" size={24} />
          </div>
          <div>
            <h4 className="font-bold">현재 AI 엔진 상태: 최적화됨</h4>
            <p className="text-xs text-blue-200">지난 1시간 동안 24건의 기사를 스크랩하고 분석했습니다.</p>
          </div>
        </div>
      </Card>
    </div>
  );

  // 메인 렌더링 로직 (인증 여부에 따라)
  if (!isAuthenticated) return renderLogin();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden">
      {/* 고정 사이드바 */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 transition-all duration-500 flex flex-col z-50`}>
        <div className="p-8 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-blue-600/30">M</div>
          {isSidebarOpen && <h1 className="text-xl font-black tracking-tighter">MORNIGDOCK</h1>}
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {[
            { id: 'dashboard', icon: BarChart3, label: '인텔리전스 대시보드' },
            { id: 'community', icon: MessageSquare, label: '커뮤니티 광장' },
            { id: 'media-page', icon: ImageIcon, label: '미디어 보관함' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                currentView === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="text-sm font-bold">{item.label}</span>}
            </button>
          ))}
          
          {isAdmin && (
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
              {isSidebarOpen && <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Security Command</p>}
              <button
                onClick={() => setCurrentView('admin')}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                  currentView === 'admin' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck size={22} />
                {isSidebarOpen && <span className="text-sm font-bold">관리자 센터</span>}
              </button>
            </div>
          )}
        </nav>

        {/* 좌측 하단 대표님 계정 클릭 영역 (설정 및 관리자용) */}
        <div className="p-6">
          <button 
            onClick={() => setCurrentView('admin')}
            className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 ${
              currentView === 'admin' ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-blue-500' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-200 shadow-sm" />
            {isSidebarOpen && (
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-xs font-black truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 truncate font-medium">{user.email}</p>
              </div>
            )}
            {isSidebarOpen && <Settings size={16} className="text-slate-400" />}
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 뷰포트 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-10 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <MoreVertical size={20} className="rotate-90 text-slate-400" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Workspace</span>
              <ChevronRight size={14} className="text-slate-300" />
              <h2 className="text-sm font-black capitalize tracking-tight">{currentView.replace('-', ' ')}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder="인텔리전스 검색..." className="pl-12 pr-6 py-2.5 bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl text-xs w-80 focus:ring-2 focus:ring-blue-600 transition-all" />
            </div>
            <button className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-blue-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-[#111827] rounded-full"></span>
            </button>
          </div>
        </header>

        {/* 가변 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-10 space-y-8 scroll-smooth">
          {currentView === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-3xl font-black tracking-tight">좋은 아침입니다, 대표님!</h1>
                  <p className="text-slate-500 mt-1">오늘의 AI 뉴스 분석 리포트가 준비되었습니다.</p>
                </div>
                <Button onClick={() => {setIsLoading(true); setTimeout(()=>setIsLoading(false), 2000)}} icon={RefreshCw} disabled={isLoading}>
                  {isLoading ? '실시간 분석 중...' : '뉴스 분석 갱신'}
                </Button>
              </div>

              <div className="grid gap-6">
                {newsList.map(news => (
                  <Card key={news.id} className="p-8 hover:ring-2 hover:ring-blue-600 transition-all cursor-pointer group" onClick={() => {
                    setSelectedNews(news);
                    setCurrentView('community-detail');
                  }}>
                    <div className="flex gap-8">
                      <div className="w-40 h-40 bg-slate-100 dark:bg-slate-800 rounded-3xl flex-shrink-0 flex items-center justify-center group-hover:bg-blue-600/10 transition-colors">
                        <Newspaper size={48} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">{news.source}</span>
                          <span className="text-xs text-slate-400 font-medium">{news.analyzedAt}</span>
                        </div>
                        <h3 className="text-2xl font-black leading-tight group-hover:text-blue-600 transition-colors">{news.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">{news.summary}</p>
                        <div className="flex gap-4">
                          <Button variant="outline" className="h-9 text-xs" icon={ExternalLink}>원본 기사</Button>
                          <Button variant="secondary" className="h-9 text-xs" icon={MessageSquare}>토론 시작하기</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentView === 'community' && (
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tight">커뮤니티 광장</h2>
                <Button icon={Plus} className="h-12 px-6">새로운 글 작성</Button>
              </div>
              <div className="grid gap-6">
                {posts.map(p => (
                  <Card key={p.id} className="p-8 hover:shadow-xl transition-all cursor-pointer" onClick={() => {
                    setSelectedPost(p);
                    setCurrentView('community-detail');
                  }}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-blue-600">
                          {p.author.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black">{p.author}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{p.createdAt}</p>
                        </div>
                      </div>
                      {p.type === 'notice' && <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-[10px] font-black rounded-full uppercase">공지사항</span>}
                    </div>
                    <h3 className="text-xl font-black mb-3">{p.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-2 text-sm leading-relaxed">{p.content}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentView === 'community-detail' && renderPostDetail()}
          {currentView === 'media-page' && renderMediaPage()}
          
          {currentView === 'admin' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black tracking-tight">보안 및 관리자 센터</h2>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                  {['users', 'posts', 'media', 'ai-admin'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setSubView(tab)}
                      className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
                        subView === tab ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {tab === 'users' ? '사용자' : tab === 'posts' ? '게시글' : tab === 'media' ? '미디어' : '분석 설정'}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                {subView === 'ai-admin' ? renderAiAdmin() : (
                  <Card className="p-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto text-blue-600">
                      <ShieldCheck size={40} />
                    </div>
                    <h3 className="text-xl font-black">데이터 매니지먼트 모듈 활성화</h3>
                    <p className="text-slate-500 max-w-md mx-auto">해당 영역에서 {subView} 데이터를 기가 막히게 관리할 수 있습니다. 안티그래비티 보안 로직이 모든 작업을 로깅합니다.</p>
                    <Button variant="outline" className="mt-6">모듈 데이터 새로고침</Button>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-white gap-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <Cpu className="absolute inset-0 m-auto text-blue-500 animate-pulse" size={32} />
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl font-black tracking-tighter">INTELLIGENCE NEWS SCRAPING</p>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">네이버/연합뉴스 실시간 분석 중...</p>
          </div>
        </div>
      )}
    </div>
  );
}