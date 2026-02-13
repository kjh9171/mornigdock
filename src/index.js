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
  Settings2,
  AlertTriangle,
  Terminal,
  Activity,
  Code2,
  Zap
} from 'lucide-react';

// 안티그래비티 시큐어 UI 컴포넌트: 카드 레이아웃 (보안 무결성 디자인)
const Card = ({ children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// 안티그래비티 시큐어 UI 컴포넌트: 버튼 시스템 (유쾌한 부문장님 톤 디자인)
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
  // 인증 및 사용자 세션 상태 (구글 OTP 연동 유지)
  const [isAuthenticated, setIsAuthenticated] = useState(true); // 실제 운영 시 false
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [user, setUser] = useState({
    email: "kjh9171@mornigdock.io",
    name: "김종환 대표님",
    role: "admin",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=CERT",
    lastLogin: "2026-02-14 08:30"
  });
  
  // 네비게이션 상태 (페이지 형태 전환 무결성 확보)
  const [currentView, setCurrentView] = useState('dashboard');
  const [adminTab, setAdminTab] = useState('users');
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // 데이터 세트 (게시글 열람 불가 현상 해결을 위한 데이터 구조화)
  const [posts, setPosts] = useState([
    { id: 1, title: "모닝독 인텔리전스 2.5 배포 가이드", content: "안녕하세요. 안티그래비티 시큐어 팀 CERT입니다.\n클라우드플레어 배포 이슈를 기가 막히게 해결하기 위한 최종 UI 통합본입니다.\n상세 보기 기능이 모달이 아닌 페이지로 전환되었으며, 관리자 센터에서 AI 엔진의 심장을 직접 튜닝할 수 있습니다.", author: "cert@antigravity.io", authorEmail: "cert@antigravity.io", type: "notice", views: 156, likes: 62, createdAt: "2024-02-14 10:00" },
    { id: 2, title: "오늘의 뉴스 인공지능 분석 요약", content: "AI가 분석한 결과, 반도체 및 AI 인프라 확충에 대한 글로벌 트렌드가 감지되었습니다.\n모닝독의 독자들을 위한 핵심 요약본을 확인하세요.", author: "kjh9171@mornigdock.io", authorEmail: "kjh9171@mornigdock.io", type: "post", views: 92, likes: 38, createdAt: "2024-02-14 11:30" },
  ]);

  const [newsList, setNewsList] = useState([
    { id: 1, source: "연합뉴스", title: "한국 AI 반도체 수출 역대 최대 기록", summary: "과학기술정보통신부는 지난달 AI 반도체 수출액이 폭발적으로 증가했다고 발표했습니다.", analyzedAt: "2024-02-14 09:00", status: "published" },
    { id: 2, source: "네이버속보", title: "차세대 AI 연합 '세이프 가드' 출범", summary: "글로벌 빅테크들이 AI 안전성 확보를 위한 국제 표준 수립에 합의했습니다.", analyzedAt: "2024-02-14 08:45", status: "analyzed" },
  ]);

  const [mediaAssets, setMediaAssets] = useState([
    { id: 1, name: "모닝독 서비스 레이아웃", type: "image", url: "https://picsum.photos/800/450", size: "1.2MB" },
    { id: 2, name: "AI 트렌드 심층 분석 영상", type: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", size: "Remote" },
    { id: 3, name: "데일리 테크 브리핑 팟캐스트", type: "podcast", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", size: "Streaming" },
  ]);

  // AI 엔진 핵심 설정 (인공지능 관리 센터)
  const [aiConfig, setAiConfig] = useState({
    apiKey: "G-KEY-PRO-••••••••",
    model: "gemini-2.5-flash-preview-09-2025",
    scrapInterval: "1h",
    persona: "분석적이고 신속한 기술 전문 기자",
    status: "online"
  });

  // 1. 보안 인증: OTP 입력 핸들러 (이동 및 포커스 제어)
  const handleOtpInput = (index, val) => {
    if (!/^[0-9]?$/.test(val)) return;
    const newOtp = [...otpValue];
    newOtp[index] = val;
    setOtpValue(newOtp);
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // 2. 게시글 상세 보기 핸들러 (모달 방식 제거, 페이지 전환 방식 고수)
  const openPostDetail = (post) => {
    setSelectedPost(post);
    setCurrentView('post-detail');
  };

  // 3. 실시간 뉴스 스크랩 시뮬레이션 (AI 엔진 작동 애니메이션 연동)
  const runScraping = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const newEntry = {
        id: newsList.length + 1,
        source: "연합뉴스",
        title: "실시간 속보: 모닝독 엔진 최적화 완료",
        summary: "안티그래비티 시큐어 팀이 배포 핸들러 이슈를 기가 막히게 해결했습니다.",
        analyzedAt: new Date().toLocaleTimeString(),
        status: "published"
      };
      setNewsList([newEntry, ...newsList]);
    }, 2000);
  };

  // --- 렌더링 모듈: 로그인 (OTP 인증) ---
  const renderLogin = () => (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-10 space-y-8 border-slate-800 shadow-2xl">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white mx-auto shadow-2xl shadow-blue-500/40 rotate-12">
            <ShieldCheck size={44} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Secure Entry</h1>
          <p className="text-slate-500 text-sm font-bold">보안 총괄 CERT의 구글 OTP 이중 인증 시스템</p>
        </div>

        {!isOtpStep ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase px-1 tracking-widest">Admin Identity</label>
              <input type="email" value={user.email} className="w-full px-5 py-4 bg-slate-800 border-none rounded-2xl text-white font-bold" readOnly />
            </div>
            <Button className="w-full h-14" onClick={() => setIsOtpStep(true)}>인증 코드 요청</Button>
          </div>
        ) : (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
            <div className="p-6 bg-blue-500/10 rounded-3xl border border-blue-500/20 flex flex-col items-center gap-4">
              <Smartphone className="text-blue-500 animate-pulse" size={40} />
              <p className="text-xs font-black text-blue-400 text-center leading-relaxed">구글 OTP 앱을 열어<br/>6자리 코드를 입력하십시오.</p>
            </div>
            <div className="flex justify-between gap-2">
              {otpValue.map((d, i) => (
                <input 
                  key={i} id={`otp-${i}`} type="text" maxLength="1" value={d}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  className="w-12 h-16 text-center text-3xl font-black bg-slate-800 border-none rounded-2xl text-white focus:ring-2 focus:ring-blue-500" 
                />
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setIsOtpStep(false)}>뒤로가기</Button>
              <Button className="flex-[2] h-14" onClick={() => setIsAuthenticated(true)}>보안 접속 승인</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  // --- 렌더링 모듈: 게시글 상세 페이지 (게시글 읽기 기능의 핵심) ---
  const renderPostDetail = () => (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <button onClick={() => {setSelectedPost(null); setCurrentView('community');}} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-all font-black group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 커뮤니티 광장으로 복귀
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
                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">{selectedPost?.type}</span>
                <span className="text-[10px] text-slate-400 font-bold">{selectedPost?.createdAt}</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight leading-tight">{selectedPost?.title}</h1>
              <p className="mt-2 text-slate-500 font-bold flex items-center gap-2 text-sm">
                <User size={16} /> {selectedPost?.author} ({selectedPost?.authorEmail})
              </p>
            </div>
          </div>
          {(user.email === selectedPost?.authorEmail || user.role === 'admin') && (
            <div className="flex gap-2">
              <Button variant="outline" icon={Edit3} className="px-5">수정</Button>
              <Button variant="danger" icon={Trash2} className="px-5">삭제</Button>
            </div>
          )}
        </div>
        
        <div className="text-xl leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-medium min-h-[400px]">
          {selectedPost?.content}
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex items-center gap-8">
          <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold"><ThumbsUp size={20} /> {selectedPost?.likes} 좋아요</button>
          <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold"><Eye size={20} /> {selectedPost?.views} 조회수</button>
          <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-colors font-bold ml-auto"><Share2 size={20} /> 기사 공유</button>
        </div>
      </Card>

      {/* 토론 댓글 영역 */}
      <div className="space-y-6">
        <h3 className="text-2xl font-black flex items-center gap-3 px-4">
          <MessageSquare size={26} className="text-blue-600" /> 모두의 인텔리전스 토론장
        </h3>
        <Card className="p-8 shadow-xl">
          <textarea 
            placeholder="기가 막힌 인사이트를 나눠주세요. 대표님과 모든 회원이 함께 성장합니다." 
            className="w-full min-h-[150px] p-6 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl focus:ring-2 focus:ring-blue-600 resize-none text-lg font-medium shadow-inner"
          />
          <div className="flex justify-end mt-4">
            <Button icon={Send} className="px-12 h-14 text-lg">의견 제출</Button>
          </div>
        </Card>
      </div>
    </div>
  );

  // --- 렌더링 모듈: 관리자 통합 센터 (AI 튜닝 및 배포 이슈 해결) ---
  const renderAdmin = () => (
    <div className="space-y-10 animate-in slide-in-from-right-10 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Master Command Center</h2>
          <p className="text-slate-500 font-bold mt-2">인공지능 코어 제어 및 시스템 보안 무결성 관리</p>
        </div>
        <div className="flex gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-[2rem] shadow-inner">
          {[
            { id: 'users', label: '가입자 정보', icon: User },
            { id: 'content', label: '게시글 관리', icon: FileText },
            { id: 'ai-config', label: 'AI 분석 설정', icon: Cpu },
            { id: 'deploy-guide', label: '배포/데브옵스', icon: Terminal }
          ].map(tab => (
            <button
              key={tab.id} onClick={() => setAdminTab(tab.id)}
              className={`px-8 py-3.5 rounded-[1.5rem] text-xs font-black transition-all flex items-center gap-2 ${
                adminTab === tab.id ? 'bg-white dark:bg-slate-700 shadow-xl text-blue-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {adminTab === 'ai-config' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Card className="p-10 border-l-8 border-blue-600 shadow-2xl space-y-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30"><Settings2 size={24} /></div>
                  <h3 className="text-2xl font-black tracking-tight">인공지능 분석 엔진 튜닝</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key size={14} /> Gemini API 인증 키</label>
                    <input type="password" value={aiConfig.apiKey} className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-sm font-bold shadow-inner" readOnly />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Layers size={14} /> 분석 모델 아키텍처</label>
                    <select className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-sm font-black shadow-inner">
                      <option value="flash">Gemini 2.5 Flash (초고속 엔진)</option>
                      <option value="pro">Gemini 2.5 Pro (정밀 분석 엔진)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">AI 시스템 프롬프트 (페르소나)</label>
                  <textarea 
                    className="w-full min-h-[200px] p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border-none text-sm leading-relaxed font-medium shadow-inner" 
                    defaultValue={aiConfig.persona + " - 기가 막힌 인사이트를 추출하여 대표님께 보고합니다."}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <Button icon={Save} className="px-14 h-14 text-base">심장 설정 저장</Button>
                </div>
              </Card>
            </div>
            
            <div className="space-y-8">
              <Card className="p-8 bg-slate-900 text-white border-none shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-black uppercase tracking-widest text-blue-400">엔진 상태</h4>
                  <Activity size={20} className="text-green-500 animate-pulse" />
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <span className="text-slate-400 text-xs font-bold uppercase">Uptime</span>
                    <span className="text-2xl font-black">342h 12m</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-blue-500 rounded-full"></div>
                  </div>
                  <Button variant="dark" icon={RefreshCw} className="w-full h-12" onClick={runScraping} disabled={isLoading}>
                    {isLoading ? '뉴스 분석 중...' : '즉시 분석 수행'}
                  </Button>
                </div>
              </Card>

              <Card className="p-8 bg-gradient-to-br from-indigo-600 to-blue-800 text-white border-none shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <Globe size={20} className="text-blue-300" />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Connected Sources</span>
                </div>
                <ul className="space-y-3">
                  {['Naver News API', 'Yonhap News Feed', 'AI Intelligence Core'].map(src => (
                    <li key={src} className="flex items-center gap-2 text-xs font-bold">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.6)]"></div> {src}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}

        {adminTab === 'deploy-guide' && (
          <Card className="p-10 border-none shadow-2xl space-y-8 bg-[#0f172a] text-slate-300">
            <div className="flex items-center gap-4 text-white">
              <Terminal size={28} className="text-blue-500" />
              <h3 className="text-2xl font-black tracking-tight">클라우드플레어 배포 이슈 (Code: 10068) 최종 해결책</h3>
            </div>
            
            <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex gap-4">
              <AlertTriangle className="text-red-500 shrink-0" size={24} />
              <div className="space-y-2">
                <p className="text-sm font-black text-red-400">현상: The uploaded script has no registered event handlers.</p>
                <p className="text-xs leading-relaxed text-slate-400 font-medium">조치: wrangler.toml의 main 항목이 가리키는 파일이 반드시 'export default { fetch }'를 포함해야 합니다.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-2 px-1">
                <Code2 size={16} className="text-blue-500" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">server/index.ts 수정 가이드 (Express 전용)</p>
              </div>
              <div className="p-6 bg-slate-900 rounded-2xl font-mono text-sm border border-slate-800 overflow-x-auto relative">
                <div className="absolute top-4 right-4 text-blue-500/30 font-black italic">CERT SECURE CODE</div>
                <pre className="text-blue-400 leading-relaxed">
{`// 1. Express 앱을 정의한 후 최하단에 아래 코드를 추가하십시오.
// Cloudflare Workers는 app.listen() 대신 fetch export를 요구합니다.

/**
 * @CERT_SECURE_ADAPTER
 * Express 앱을 Cloudflare Workers 핸들러로 내보냅니다.
 */
export default {
  async fetch(request: Request, env: any, ctx: any) {
    // 만약 Express 5.x를 사용 중이라면 handle 메서드를 사용할 수 있습니다.
    // 혹은 itty-router-extras와 같은 어댑터를 사용하십시오.
    return (app as any).handle(request, env, ctx); 
  }
};`}
                </pre>
              </div>
              
              <div className="flex items-center gap-4 p-5 bg-blue-600/10 rounded-2xl border border-blue-500/20">
                <Zap className="text-blue-500" size={20} />
                <p className="text-xs font-bold text-blue-500">지시하신 대로 깃허브 저장소의 server/index.ts 파일 끝에 위 코드를 추가하시면, 클라우드플레어 엔진이 기가 막히게 앱을 인식할 것입니다!</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );

  // --- 메인 아키텍처: 사이드바 및 레이아웃 ---
  if (!isAuthenticated) return renderLogin();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden transition-colors duration-500">
      {/* 안티그래비티 시큐어 사이드바 (기가 막힌 레이아웃) */}
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
                currentView === item.id && !selectedPost ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 translate-x-1' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon size={22} />
              {isSidebarOpen && <span className="text-sm font-black tracking-tight">{item.label}</span>}
            </button>
          ))}
          
          {user.role === 'admin' && (
            <div className="mt-10 pt-10 border-t border-slate-200 dark:border-slate-800">
              {isSidebarOpen && <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Secure Command</p>}
              <button
                onClick={() => {setSelectedPost(null); setCurrentView('admin');}}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                  currentView === 'admin' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xl translate-x-1' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <ShieldCheck size={22} />
                {isSidebarOpen && <span className="text-sm font-black tracking-tight">통합 관리 센터</span>}
              </button>
            </div>
          )}
        </nav>

        {/* 좌측 하단 대표님 계정 영역 */}
        <div className="p-8">
          <button 
            onClick={() => {setAdminTab('ai-config'); setCurrentView('admin');}}
            className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all duration-300 group ${
              currentView === 'admin' && adminTab === 'ai-config' ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-blue-500' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 shadow-inner'
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

      {/* 메인 콘텐츠 영역 */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-28 bg-white/80 dark:bg-[#111827]/80 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 px-14 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-10">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm">
              <MoreVertical size={24} className="rotate-90 text-slate-400" />
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <Globe size={12} className="text-blue-600" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Cloud Active</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 capitalize">
                {currentView.replace('-', ' ')}
                {selectedPost && <><ChevronRight size={18} className="text-slate-300" /><span className="text-blue-600">Post Insight</span></>}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="relative hidden lg:block">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input type="text" placeholder="통합 검색..." className="pl-16 pr-10 py-4 bg-slate-100 dark:bg-slate-800/50 border-none rounded-2xl text-sm w-[400px] focus:ring-2 focus:ring-blue-600 transition-all font-medium shadow-inner" />
            </div>
            <button className="w-14 h-14 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-500 hover:text-blue-600 transition-all shadow-sm relative">
              <Bell size={24} />
              <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-600 border-[3px] border-white dark:border-[#111827] rounded-full"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-14 space-y-12 scroll-smooth custom-scrollbar">
          {currentView === 'dashboard' && (
            <div className="space-y-12 animate-in fade-in duration-700">
              <div className="flex justify-between items-end">
                <div>
                  <h1 className="text-5xl font-black tracking-tighter leading-tight">반갑습니다, 대표님!<br/><span className="text-blue-600">오늘의 AI 뉴스 리포트입니다.</span></h1>
                  <p className="text-slate-500 mt-4 text-lg font-bold">네이버와 연합뉴스의 실시간 데이터를 기가 막히게 분석했습니다.</p>
                </div>
                <Button onClick={runScraping} icon={RefreshCw} disabled={isLoading} className="h-16 px-10 text-lg">
                  {isLoading ? '실시간 스크랩 중...' : '인텔리전스 갱신'}
                </Button>
              </div>

              <div className="grid gap-8">
                {newsList.map(news => (
                  <Card key={news.id} className="p-10 hover:ring-2 hover:ring-blue-600 transition-all cursor-pointer group shadow-xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800/50 border-none">
                    <div className="flex gap-12">
                      <div className="w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-[3rem] flex-shrink-0 flex items-center justify-center group-hover:bg-blue-600/5 transition-all duration-700 shadow-inner overflow-hidden">
                        <Newspaper size={64} className="text-slate-300 group-hover:text-blue-600 transition-all duration-700 group-hover:scale-110" />
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-5">
                        <div className="flex justify-between items-start">
                          <span className="px-4 py-1.5 bg-blue-50 dark:bg-blue-900/40 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest border border-blue-100 dark:border-blue-800">{news.source}</span>
                          <span className="text-xs text-slate-400 font-black">{news.analyzedAt}</span>
                        </div>
                        <h3 className="text-2xl font-black leading-tight group-hover:text-blue-600 transition-colors tracking-tight">{news.title}</h3>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-base font-medium line-clamp-2">{news.summary}</p>
                        <div className="flex gap-4 pt-2">
                          <Button variant="outline" className="h-11 px-8 text-xs" icon={ExternalLink}>원본 소스</Button>
                          <Button variant="secondary" className="h-11 px-8 text-xs" icon={MessageSquare} onClick={() => openPostDetail(posts[1])}>토론 참여</Button>
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
                  <p className="text-slate-500 text-lg mt-2 font-bold">가치 있는 지식 공유와 기가 막힌 토론의 장</p>
                </div>
                <Button icon={Plus} className="h-16 px-12 text-lg">지식 나눔 글쓰기</Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {posts.map(p => (
                  <Card key={p.id} className="p-10 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer border-none bg-white dark:bg-slate-900/50 group" onClick={() => openPostDetail(p)}>
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-blue-600 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                          {p.author.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-900 dark:text-slate-100 leading-none mb-1">{p.author}</p>
                          <p className="text-xs text-slate-400 font-bold tracking-tighter">{p.createdAt}</p>
                        </div>
                      </div>
                      {p.type === 'notice' && <span className="px-4 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-600 text-[9px] font-black rounded-full border border-orange-200 dark:border-orange-800 tracking-widest">NOTICE</span>}
                    </div>
                    <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-blue-600 transition-colors leading-snug">{p.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-2 text-base leading-relaxed font-medium">{p.content}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentView === 'post-detail' && renderPostDetail()}
          
          {currentView === 'media' && (
            <div className="space-y-10 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Multimedia Hub</h2>
                  <p className="text-slate-500 font-bold mt-2">유튜브 및 팟캐스트 인텔리전스 통합 관리</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" icon={Youtube} className="text-xs">유튜브 링크 추가</Button>
                  <Button variant="outline" icon={Mic} className="text-xs">팟캐스트 등록</Button>
                  <Button icon={Plus} className="text-xs">에셋 업로드</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {mediaAssets.map(asset => (
                  <Card key={asset.id} className="group hover:-translate-y-2 transition-all duration-500 shadow-lg hover:shadow-2xl border-transparent hover:border-blue-500/20">
                    <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                      {asset.type === 'youtube' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/10">
                          <Youtube size={64} className="text-red-600 drop-shadow-lg" />
                        </div>
                      ) : asset.type === 'podcast' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 dark:bg-purple-900/10">
                          <Mic size={64} className="text-purple-600 drop-shadow-lg" />
                        </div>
                      ) : (
                        <img src={asset.url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={asset.name} />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                        <Button className="rounded-full w-14 h-14 p-0" icon={Play} />
                      </div>
                    </div>
                    <div className="p-6 space-y-3">
                      <h4 className="font-black text-sm truncate">{asset.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          asset.type === 'youtube' ? 'bg-red-100 text-red-600' : 
                          asset.type === 'podcast' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {asset.type}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{asset.size}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {currentView === 'admin' && renderAdmin()}
        </div>
      </main>

      {/* 로딩 오버레이 (인텔리전스 스크래핑 애니메이션) */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#0b0f19]/80 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center text-white gap-10">
          <div className="relative">
            <div className="w-40 h-40 border-[8px] border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
            <Cpu className="absolute inset-0 m-auto text-blue-400 animate-pulse" size={56} />
          </div>
          <div className="text-center space-y-4">
            <p className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">ANALYZING INTELLIGENCE</p>
            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-xs">AI 코어 엔진이 실시간 기사 수집 및 분석 중입니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}