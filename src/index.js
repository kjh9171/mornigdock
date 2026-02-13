import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Smartphone,
  Music,
  Video,
  Share2,
  ThumbsUp,
  Hash,
  Filter,
  Eye,
  Settings2
} from 'lucide-react';

// 안티그래비티 시큐어 UI 컴포넌트: 카드 레이아웃
const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// 안티그래비티 시큐어 UI 컴포넌트: 버튼 시스템
const Button = ({ children, onClick, variant = "primary", className = "", disabled = false, icon: Icon }) => {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
    dark: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
  };
  
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 text-sm font-black disabled:opacity-50 active:scale-95 ${variants[variant]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

export default function App() {
  // 인증 및 사용자 세션 상태 (구글 OTP 연동)
  const [isAuthenticated, setIsAuthenticated] = useState(true); // 실제 배포 시 false
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [user, setUser] = useState({
    email: "kjh9171@mornigdock.io",
    name: "김종환 대표님",
    role: "admin",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CERT",
    lastLogin: "2026-02-14 08:30"
  });
  
  // 네비게이션 상태 (모달이 아닌 페이지 형태 구현용)
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard, community, news, media, admin, post-detail, post-edit
  const [adminTab, setAdminTab] = useState('users'); // users, content, media, ai-config
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 데이터베이스 시뮬레이션 상태
  const [users, setUsers] = useState([
    { id: 1, email: "kjh9171@mornigdock.io", name: "김종환 대표님", role: "admin", status: "active", joinDate: "2024-01-01" },
    { id: 2, email: "cert@antigravity.io", name: "CERT 개발팀", role: "admin", status: "active", joinDate: "2024-01-02" },
    { id: 3, email: "member@example.com", name: "일반회원A", role: "user", status: "active", joinDate: "2024-02-10" },
  ]);

  const [posts, setPosts] = useState([
    { id: 1, title: "모닝독 인텔리전스 2.5 버전 업데이트 패치노트", content: "안녕하세요. 안티그래비티 시큐어 팀입니다.\n지시하신 대로 게시글 읽기 기능을 페이지 형태로 전환하고, AI 뉴스 분석 엔진의 통제권을 대표님께 드리는 업데이트를 완료했습니다.\n\n주요 변경 사항:\n1. 게시글 상세 보기 페이지화\n2. 관리자 센터 AI 컨트롤 패널 신설\n3. 유튜브 및 팟캐스트 통합 플레이어 지원\n\n항상 최선을 다하겠습니다. 충성!", author: "cert@antigravity.io", authorEmail: "cert@antigravity.io", type: "notice", views: 124, likes: 45, createdAt: "2024-02-14 09:00" },
    { id: 2, title: "오늘의 인텔리전스 뉴스 분석 리포트", content: "AI가 분석한 오늘의 기술 트렌드는 '멀티모달 모델의 민주화'입니다.\n네이버와 연합뉴스의 속보를 종합한 결과, 한국 반도체 수출의 긍정적인 신호가 감지되었습니다.", author: "kjh9171@mornigdock.io", authorEmail: "kjh9171@mornigdock.io", type: "post", views: 89, likes: 32, createdAt: "2024-02-14 11:30" },
  ]);

  const [newsList, setNewsList] = useState([
    { id: 1, source: "연합뉴스", title: "한국 AI 반도체 수출 역대 최대 기록 갱신", summary: "과학기술정보통신부는 지난달 AI 반도체 수출액이 전년 대비 45% 증가한 역대 최고치를 기록했다고 발표했습니다.", analyzedAt: "2024-02-14 10:00", status: "published", url: "#" },
    { id: 2, source: "네이버속보", title: "글로벌 빅테크, 차세대 AI 연합 전선 구축", summary: "애플, 구글, 메타 등 주요 빅테크 기업들이 AI 안전성 표준 수립을 위해 손을 잡았습니다.", analyzedAt: "2024-02-14 09:45", status: "analyzed", url: "#" },
  ]);

  const [mediaAssets, setMediaAssets] = useState([
    { id: 1, name: "서비스 소개 인포그래픽", type: "image", url: "https://picsum.photos/800/450", size: "1.2MB", createdAt: "2024-02-14" },
    { id: 2, name: "AI 트렌드 기술 분석 세미나", type: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", size: "Remote", createdAt: "2024-02-13" },
    { id: 3, name: "모닝독 데일리 브리핑 팟캐스트", type: "podcast", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", size: "Remote", createdAt: "2024-02-14" },
  ]);

  // AI 엔진 제어 설정
  const [aiConfig, setAiConfig] = useState({
    apiKey: "G-KEY-PRO-••••••••",
    model: "gemini-2.5-flash-preview-09-2025",
    scrapInterval: "1h",
    persona: "분석적이고 신속한 기술 전문 기자",
    targetSources: ["Naver", "Yonhap", "New York Times"]
  });

  // 1. 보안 인증 핸들러 (OTP)
  const handleOtpInput = (index, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const newOtp = [...otpValue];
    newOtp[index] = val;
    setOtpValue(newOtp);
    if (val && index < 5) document.getElementById(`otp-${index + 1}`).focus();
  };

  // 2. 게시글 CRUD 핸들러
  const handleDeletePost = (id) => {
    if (confirm("기가 막히게 삭제하시겠습니까? 데이터는 복구할 수 없습니다.")) {
      setPosts(posts.filter(p => p.id !== id));
      setCurrentView('community');
    }
  };

  // 3. 뉴스 분석 시뮬레이션
  const runNewsAnalysis = () => {
    setIsLoading(true);
    setTimeout(() => {
      const mockNews = {
        id: newsList.length + 1,
        source: "연합뉴스",
        title: "실시간 속보: 모닝독 AI 엔진 효율 300% 달성",
        summary: "안티그래비티 시큐어 팀의 최적화 작업으로 뉴스 분석 속도가 비약적으로 향상되었습니다.",
        analyzedAt: new Date().toLocaleString(),
        status: "published"
      };
      setNewsList([mockNews, ...newsList]);
      setIsLoading(false);
    }, 2000);
  };

  // --- 렌더링 모듈: 로그인 ---
  const renderLogin = () => (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6 bg-gradient-to-br from-[#0b0f19] to-[#1a233a]">
      <Card className="w-full max-w-md p-10 space-y-8 border-slate-800 shadow-2xl">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/40 rotate-12">
            <ShieldCheck size={44} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white">MORNIGDOCK AUTH</h1>
          <p className="text-slate-500 text-sm">보안 총괄 CERT의 2단계 인증 시스템입니다.</p>
        </div>

        {!isOtpStep ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identity</label>
              <input type="email" value={user.email} className="w-full px-5 py-4 bg-slate-800/50 border-none rounded-2xl text-white focus:ring-2 focus:ring-blue-500 transition-all font-bold" readOnly />
            </div>
            <Button className="w-full h-14 text-lg" onClick={() => setIsOtpStep(true)}>인증 번호 요청</Button>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="flex flex-col items-center gap-4 py-6 bg-blue-600/10 rounded-3xl border border-blue-500/20">
              <Smartphone className="text-blue-500 animate-pulse" size={40} />
              <p className="text-sm font-bold text-blue-400 text-center px-6 leading-relaxed">구글 OTP 앱의 6자리 코드를<br/>입력하여 보안 터널을 생성하십시오.</p>
            </div>
            <div className="flex justify-between gap-2">
              {otpValue.map((d, i) => (
                <input 
                  key={i} id={`otp-${i}`} type="text" maxLength="1" value={d}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  className="w-12 h-16 text-center text-3xl font-black bg-slate-800 border-none rounded-2xl text-white focus:ring-2 focus:ring-blue-500 shadow-inner" 
                />
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setIsOtpStep(false)}>취소</Button>
              <Button className="flex-[2] h-14" onClick={() => setIsAuthenticated(true)}>보안 접속 허용</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  // --- 렌더링 모듈: 게시글 상세 (페이지 형태) ---
  const renderPostDetail = () => (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <button onClick={() => {setSelectedPost(null); setCurrentView('community');}} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-all font-black group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 커뮤니티 목록으로 복귀
      </button>
      
      <Card className="p-12 border-none shadow-2xl relative">
        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
        <div className="flex items-center justify-between mb-10 pb-8 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center text-white text-3xl font-black shadow-xl">
              {selectedPost?.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-100 dark:border-blue-800">{selectedPost?.type}</span>
                <span className="text-[10px] text-slate-400 font-bold">{selectedPost?.createdAt}</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight leading-tight">{selectedPost?.title}</h1>
              <p className="mt-2 text-slate-500 font-bold flex items-center gap-2">
                <User size={16} /> {selectedPost?.author} ({selectedPost?.authorEmail})
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-xl leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium min-h-[400px]">
          {selectedPost?.content}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex gap-6">
            <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold"><ThumbsUp size={20} /> {selectedPost?.likes} 좋아요</button>
            <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold"><Eye size={20} /> {selectedPost?.views} 조회</button>
            <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold"><Share2 size={20} /> 공유하기</button>
          </div>
          {(user.email === selectedPost?.authorEmail || isAdmin) && (
            <div className="flex gap-3">
              <Button variant="outline" icon={Edit3} className="px-6">수정</Button>
              <Button variant="danger" icon={Trash2} className="px-6" onClick={() => handleDeletePost(selectedPost.id)}>삭제</Button>
            </div>
          )}
        </div>
      </Card>

      {/* 댓글 영역 (모두의 공간) */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black flex items-center gap-3 px-4">
          <MessageSquare size={26} className="text-blue-600" /> 모두의 토론장 (답변)
        </h3>
        <Card className="p-8 shadow-xl">
          <textarea 
            placeholder="기가 막힌 의견을 남겨주세요. 대표님께서 항상 경청하고 계십니다." 
            className="w-full min-h-[150px] p-6 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 resize-none text-lg font-medium shadow-inner"
          />
          <div className="flex justify-end mt-4">
            <Button icon={Send} className="px-12 h-14 text-lg">의견 게시하기</Button>
          </div>
        </Card>
      </div>
    </div>
  );

  // --- 렌더링 모듈: 관리자 센터 (통합 관리) ---
  const renderAdmin = () => (
    <div className="space-y-10 animate-in slide-in-from-right-10 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight">마스터 인텔리전스 센터</h2>
          <p className="text-slate-500 font-bold mt-2">안티그래비티 보안 로직 기반의 통합 관리 시스템</p>
        </div>
        <div className="flex gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-[2rem] shadow-inner">
          {[
            { id: 'users', label: '가입자 권한', icon: User },
            { id: 'content', label: '콘텐츠/토론', icon: FileText },
            { id: 'media', label: '미디어 자산', icon: Video },
            { id: 'ai-config', label: 'AI 분석 설정', icon: Cpu }
          ].map(tab => (
            <button
              key={tab.id} onClick={() => setAdminTab(tab.id)}
              className={`px-8 py-3.5 rounded-[1.5rem] text-xs font-black transition-all flex items-center gap-2 ${
                adminTab === tab.id ? 'bg-white dark:bg-slate-700 shadow-xl text-blue-600' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {adminTab === 'users' && (
          <Card className="overflow-hidden border-none shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">User Identity</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Authority</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Security Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Join Date</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-900 dark:text-slate-100">{u.name}</div>
                      <div className="text-xs text-slate-400 font-medium">{u.email}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${
                        u.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 font-bold text-green-500 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div> {u.status}
                    </td>
                    <td className="px-8 py-6 text-slate-500 font-medium">{u.joinDate}</td>
                    <td className="px-8 py-6 text-right space-x-2">
                      <Button variant="outline" className="p-2 h-10 w-10" icon={Edit3} />
                      <Button variant="danger" className="p-2 h-10 w-10" icon={Trash2} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {adminTab === 'ai-config' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card className="p-10 border-l-8 border-blue-600 shadow-2xl space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white"><Settings2 size={24} /></div>
                  <h3 className="text-2xl font-black tracking-tight">AI 인텔리전스 코어 튜닝</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key size={14} /> Gemini Enterprise API KEY</label>
                    <input type="password" value={aiConfig.apiKey} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-sm font-bold shadow-inner" readOnly />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14} /> Analysis Model</label>
                    <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-sm font-black shadow-inner">
                      <option value="flash">Gemini 2.5 Flash (Ultra Fast)</option>
                      <option value="pro">Gemini 2.5 Pro (Deep Analysis)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">AI Persona & System Prompt</label>
                  <textarea 
                    className="w-full min-h-[200px] p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-none text-sm leading-relaxed font-medium shadow-inner" 
                    defaultValue={aiConfig.persona + " - 모닝독의 모든 뉴스를 분석하여 대표님께 직관적인 보고를 수행합니다."}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="secondary" className="px-8">기본값 복원</Button>
                  <Button icon={Save} className="px-12 h-14 text-base">코어 설정 업데이트</Button>
                </div>
              </Card>
            </div>
            
            <div className="space-y-8">
              <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><RefreshCw size={80} className="animate-spin-slow" /></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">Real-time Scrapping</h4>
                <p className="text-2xl font-black">뉴스 수집 엔진</p>
                <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Naver News</span>
                    <span className="text-green-400 font-bold">Connected</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Yonhap News</span>
                    <span className="text-green-400 font-bold">Connected</span>
                  </div>
                  <Button variant="dark" className="w-full mt-4 h-12" onClick={runNewsAnalysis} disabled={isLoading} icon={RefreshCw}>
                    즉시 스크랩 수행
                  </Button>
                </div>
              </Card>
              
              <Card className="p-8 border-none shadow-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <p className="text-[10px] font-black uppercase tracking-widest mb-1">Total Analysis Count</p>
                <p className="text-4xl font-black tracking-tighter">1,248건</p>
                <p className="text-xs mt-4 opacity-80 font-bold">지난 24시간 동안 대표님을 위해<br/>분석된 기사량입니다.</p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // --- 렌더링 모듈: 미디어 허브 (유튜브/팟캐스트) ---
  const renderMedia = () => (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black tracking-tight">멀티미디어 인텔리전스</h2>
          <p className="text-slate-500 font-bold mt-1">유튜브 분석 및 팟캐스트 스트리밍 통합 허브</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={Youtube}>유튜브 분석 추가</Button>
          <Button variant="outline" icon={Mic}>팟캐스트 등록</Button>
          <Button icon={Plus}>에셋 업로드</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {mediaAssets.map(asset => (
          <Card key={asset.id} className="group hover:-translate-y-2 transition-all duration-500 border-transparent hover:border-blue-500/20 shadow-lg hover:shadow-2xl">
            <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
              {asset.type === 'youtube' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/10">
                  <Youtube size={64} className="text-red-600 drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-red-600 mt-3 tracking-widest uppercase">YouTube Intelligence</span>
                </div>
              ) : asset.type === 'podcast' ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-900/10">
                  <Mic size={64} className="text-purple-600 drop-shadow-lg group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-purple-600 mt-3 tracking-widest uppercase">Podcast Stream</span>
                </div>
              ) : (
                <img src={asset.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={asset.name} />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <Button className="rounded-full w-14 h-14 p-0" icon={Play} />
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-black text-base truncate flex-1">{asset.name}</h4>
                <div className="flex gap-1 ml-2">
                  <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Edit3 size={16} /></button>
                  <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                  asset.type === 'youtube' ? 'bg-red-50 text-red-600 border-red-100' : 
                  asset.type === 'podcast' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-slate-50 text-slate-600 border-slate-100'
                }`}>
                  {asset.type}
                </span>
                <span className="text-[11px] text-slate-400 font-bold">{asset.size} • {asset.createdAt}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // --- 메인 아키텍처 ---
  if (!isAuthenticated) return renderLogin();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden">
      {/* 안티그래비티 시큐어 사이드바 */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-white dark:bg-[#111827] border-r border-slate-200 dark:border-slate-800 transition-all duration-500 flex flex-col z-50`}>
        <div className="p-10 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black shadow-2xl shadow-blue-600/40 text-2xl rotate-3">M</div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tighter leading-none">MORNIGDOCK</h1>
              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-1">Intelligence Comm</span>
            </div>
          )}
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
          {[
            { id: 'dashboard', icon: BarChart3, label: '인텔리전스 센터' },
            { id: 'community', icon: MessageSquare, label: '커뮤니티 광장' },
            { id: 'media', icon: Video, label: '멀티미디어 허브' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {setSelectedPost(null); setCurrentView(item.id);}}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                currentView === item.id && !selectedPost ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="text-sm font-black tracking-tight">{item.label}</span>}
            </button>
          ))}
          
          {isAdmin && (
            <div className="mt-10 pt-10 border-t border-slate-200 dark:border-slate-800">
              {isSidebarOpen && <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Security & Admin</p>}
              <button
                onClick={() => {setSelectedPost(null); setCurrentView('admin');}}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                  currentView === 'admin' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck size={22} />
                {isSidebarOpen && <span className="text-sm font-black tracking-tight">관리자 통합 센터</span>}
              </button>
            </div>
          )}
        </nav>

        {/* 좌측 하단 대표님 프로필 및 설정 트리거 */}
        <div className="p-8">
          <button 
            onClick={() => {setAdminTab('ai-config'); setCurrentView('admin');}}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 group ${
              currentView === 'admin' && adminTab === 'ai-config' ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-blue-500' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-inner'
            }`}
          >
            <div className="relative">
              <img src={user.avatar} className="w-12 h-12 rounded-2xl bg-slate-200 shadow-md border-2 border-white dark:border-slate-700" alt="profile" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>
            </div>
            {isSidebarOpen && (
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-black truncate text-slate-900 dark:text-slate-100 leading-none mb-1">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate font-bold uppercase tracking-tighter">{user.role}</p>
              </div>
            )}
            {isSidebarOpen && <Settings size={18} className="text-slate-300 group-hover:rotate-90 transition-transform duration-700" />}
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 뷰포트 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-28 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 px-14 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-10">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm">
              <MoreVertical size={24} className="rotate-90 text-slate-400" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={12} className="text-blue-600" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Network Active</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 capitalize">
                {currentView.replace('-', ' ')}
                {selectedPost && <><ChevronRight size={18} className="text-slate-300" /><span className="text-blue-600">Article View</span></>}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="relative hidden lg:block">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="통합 인텔리전스 검색..." className="pl-16 pr-10 py-4 bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl text-sm w-[400px] focus:ring-2 focus:ring-blue-600 transition-all font-medium shadow-inner" />
            </div>
            <div className="flex items-center gap-4">
               <button className="w-14 h-14 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-blue-600 transition-all shadow-sm relative">
                <Bell size={24} />
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-600 border-[3px] border-white dark:border-[#111827] rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* 가변 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto p-14 space-y-12 scroll-smooth custom-scrollbar">
          {currentView === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-5xl font-black tracking-tighter leading-tight">오늘의 인텔리전스 리포트,<br/><span className="text-blue-600">대표님 환영합니다!</span></h1>
                  <p className="text-slate-500 mt-4 text-lg font-bold">네이버와 연합뉴스의 실시간 속보를 분석한 최신 정보입니다.</p>
                </div>
                <Button onClick={runNewsAnalysis} icon={RefreshCw} disabled={isLoading} className="h-16 px-10 text-lg">
                  {isLoading ? '실시간 스크랩 중...' : '인텔리전스 갱신'}
                </Button>
              </div>

              <div className="grid gap-8">
                {newsList.map(news => (
                  <Card key={news.id} className="p-10 hover:ring-2 hover:ring-blue-600 transition-all cursor-pointer group shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 border-none" onClick={() => {
                    setSelectedPost(posts[1]); // 예시 연동
                    setCurrentView('post-detail');
                  }}>
                    <div className="flex gap-12">
                      <div className="w-56 h-56 bg-slate-100 dark:bg-slate-800 rounded-[3rem] flex-shrink-0 flex items-center justify-center group-hover:bg-blue-600/5 transition-all duration-700 shadow-inner overflow-hidden">
                        <Newspaper size={72} className="text-slate-300 group-hover:text-blue-600 transition-all duration-700 group-hover:scale-110 group-hover:rotate-3" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-6">
                        <div className="flex justify-between items-start">
                          <span className="px-5 py-2 bg-blue-50 dark:bg-blue-900/40 text-blue-600 text-[11px] font-black rounded-full uppercase tracking-[0.2em] border border-blue-100 dark:border-blue-800 shadow-sm">{news.source} Intelligence</span>
                          <span className="text-xs text-slate-400 font-black">{news.analyzedAt}</span>
                        </div>
                        <h3 className="text-3xl font-black leading-tight group-hover:text-blue-600 transition-colors tracking-tight">{news.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg font-medium line-clamp-2">{news.summary}</p>
                        <div className="flex gap-4 pt-4">
                          <Button variant="outline" className="h-12 px-8" icon={ExternalLink}>원본 소스</Button>
                          <Button variant="secondary" className="h-12 px-8" icon={MessageSquare}>토론방 활성화</Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentView === 'community' && !selectedPost && (
            <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500">
              <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-4xl font-black tracking-tight">커뮤니티 광장</h2>
                  <p className="text-slate-500 text-lg mt-2 font-bold">회원들과 함께 성장하는 가치 있는 지식의 허브</p>
                </div>
                <Button icon={Plus} className="h-16 px-12 text-lg">새로운 지식 공유</Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {posts.map(p => (
                  <Card key={p.id} className="p-10 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer border-none bg-white dark:bg-slate-900/50 group" onClick={() => {
                    setSelectedPost(p);
                    setCurrentView('post-detail');
                  }}>
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center font-black text-blue-600 shadow-inner group-hover:from-blue-600 group-hover:to-indigo-700 group-hover:text-white transition-all duration-500">
                          {p.author.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-900 dark:text-slate-100">{p.author}</p>
                          <p className="text-xs text-slate-400 font-bold mt-1 tracking-tighter">{p.createdAt}</p>
                        </div>
                      </div>
                      {p.type === 'notice' && <span className="px-5 py-2 bg-orange-100 dark:bg-orange-900/50 text-orange-600 text-[10px] font-black rounded-full border border-orange-200 dark:border-orange-800 tracking-widest">OFFICIAL</span>}
                    </div>
                    <h3 className="text-2xl font-black mb-5 tracking-tight group-hover:text-blue-600 transition-colors leading-snug">{p.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-3 text-base leading-relaxed font-medium mb-8">{p.content}</p>
                    <div className="pt-8 border-t border-slate-50 dark:border-slate-800 flex items-center gap-8">
                       <span className="flex items-center gap-2.5 text-xs font-black text-slate-400"><MessageSquare size={18} className="text-blue-500" /> 24 Discussions</span>
                       <span className="flex items-center gap-2.5 text-xs font-black text-slate-400"><Eye size={18} className="text-slate-300" /> {p.views} Views</span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentView === 'post-detail' && renderPostDetail()}
          {currentView === 'media' && renderMedia()}
          {currentView === 'admin' && renderAdmin()}
        </div>
      </main>

      {/* 로딩 오버레이 (인텔리전스 스크래핑 시뮬레이션) */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#0b0f19]/80 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center text-white gap-10 animate-in fade-in duration-300">
          <div className="relative">
            <div className="w-40 h-40 border-[8px] border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <Cpu className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={56} />
          </div>
          <div className="text-center space-y-4">
            <p className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">INTELLIGENCE SCRAPING</p>
            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">네이버/연합뉴스 실시간 속보 데이터 마이닝 및 AI 분석 중</p>
          </div>
        </div>
      )}
    </div>
  );
}