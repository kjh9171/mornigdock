import { useState } from 'react'; // React에서 상태 관리를 위한 훅을 임포트합니다.
import { Search, TrendingUp, Clock, ChevronRight, Newspaper, Bookmark } from 'lucide-react'; // 아이콘을 사용하기 위해 lucide-react에서 컴포넌트를 Им포트합니다.

// 뉴스 기사의 타입 구조를 정의합니다.
interface NewsArticle {
  id: number; // 기사의 고유 식별자입니다.
  title: string; // 기사의 제목입니다.
  category: string; // 기사의 카테고리 (예: AI, 보안)입니다.
  time: string; // 기사가 작성된 시간입니다.
  readTime: string; // 기사를 읽는 데 걸리는 예상 시간입니다.
  imageUrl: string; // 기사 썸네일 이미지의 URL입니다.
  source: string; // 기사의 출처입니다.
}

// 예시 데이터로 사용할 뉴스 배열을 선언합니다.
const mockNews: NewsArticle[] = [
  {
    id: 1, // 첫 번째 기사 ID
    title: '오픈AI의 새로운 언어 모델, 코딩 패러다임을 혁신하다', // 흥미로운 뉴스 제목
    category: '인공지능', // 카테고리 분류
    time: '2시간 전', // 작성된 지 2시간 지남
    readTime: '4분 읽음', // 읽는 데 약 4분 소요 예상
    imageUrl: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=600&auto=format&fit=crop', // 언스플래시의 멋진 AI 관련 이미지
    source: 'Tech Daily', // 출처 표기
  },
  {
    id: 2, // 두 번째 기사 ID
    title: '해커들의 새로운 타겟: 분산형 금융망 보안 적신호', // 보안 관련 뉴스
    category: '사이버보안', // 심각한 이슈를 다루는 카테고리
    time: '4시간 전', // 4시간 전에 발간됨
    readTime: '6분 읽음', // 심층 기사라 시간이 조금 더 걸림
    imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=600&auto=format&fit=crop', // 서버룸 관련 분위기 있는 이미지
    source: 'Security Week', // 보안 전문 출처
  },
  {
    id: 3, // 세 번째 기사 ID
    title: '양자 컴퓨터 상용화 시대, 암호화폐의 미래는?', // 트렌디한 주제의 기사
    category: '테크놀로지', // 기술 카테고리
    time: '5시간 전', // 5시간 경과
    readTime: '5분 읽음', // 평균적인 읽기 시간
    imageUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=600&auto=format&fit=crop', // 양자역학을 연상시키는 섬세한 텍스처 이미지
    source: 'Future Net', // 미래 기술 미디어
  }
];

// 뉴스 지능 페이지의 메인 컴포넌트를 내보냅니다.
export default function News() {
  // 사용자가 입력할 검색어를 저장하는 상태입니다.
  const [searchQuery, setSearchQuery] = useState('');
  
  // 상태를 기반으로 기사를 필터링합니다. 아직은 전체 목업을 반환합니다.
  const filteredNews = mockNews.filter(article => article.title.includes(searchQuery));

  // 화면에 렌더링될 구조입니다.
  return (
    // 전체 컨테이너: 패딩과 애니메이션을 주어 부드럽게 나타나게 합니다.
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in zoom-in duration-500">
      
      {/* 헤더 섹션: 타이틀 및 설명, 배경에는 은은한 그래디언트 디자인을 입힙니다 */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 p-10 text-white mb-12 shadow-2xl shadow-blue-500/20">
        
        {/* 우측 상단의 장식용 아이콘으로 다이내믹함을 연출합니다 */}
        <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-1/4 -translate-y-1/4">
          <Newspaper size={200} />
        </div>
        
        {/* 제목들을 담는 컨테이너입니다 */}
        <div className="relative z-10 max-w-2xl">
          {/* 배지 부분입니다. 프리미엄 느낌의 둥근 모서리와 아이콘을 결합했습니다 */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-white/20">
            <TrendingUp size={14} className="text-blue-300" />
            <span>실시간 글로벌 테크 동향</span>
          </div>
          
          {/* 페이지 메인 타이틀입니다. 크고 강렬하게 표기합니다. */}
          <h1 className="text-5xl font-black mb-4 tracking-tighter shadow-sm">
            뉴스 모니터링 허브
          </h1>
          
          {/* 부차적인 설명 텍스트입니다 */}
          <p className="text-lg text-blue-100 font-medium tracking-tight mb-8">
            최신 보안, 인공지능, 그리고 IT 시장의 핵심 지수를 실시간으로 분석하고 큐레이션하여 제공합니다.
          </p>
          
          {/* 검색 바 컴포넌트: 깔끔한 형태의 입력 필드입니다 */}
          <div className="relative max-w-md group">
            {/* 검색 아이콘을 왼쪽에 배치합니다 */}
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            {/* 입력창의 배경을 흰색으로 넣고 포커스 시 부드러운 효과가 나도록 합니다 */}
            <input 
              type="text" 
              placeholder="관심 키워드로 인텔리전스 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-4 rounded-2xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all font-bold"
            />
          </div>
        </div>
      </div>

      {/* 기사 리스트 섹션: 제목과 네비게이션 버튼을 포함합니다 */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">오늘의 최상위 분석 기사</h2>
        <button className="flex items-center gap-1 text-sm font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors group">
          모아보기 <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* 기사 카드들을 그리드 레이아웃으로 배치합니다 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* 필터링된 뉴스들을 순회하며 카드로 그려냅니다 */}
        {filteredNews.map(article => (
          // 카드 개별 컨테이너: 호버 시 살짝 떠오르는 마이크로 인터랙션을 사용합니다
          <div key={article.id} className="group bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col cursor-pointer">
            {/* 썸네일 영역: 이미지가 확대되는 효과로 동적 느낌을 줍니다 */}
            <div className="aspect-[4/3] overflow-hidden relative">
              <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
              {/* 카테고리 배지를 이미지 좌상단에 오버레이합니다 */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-600">
                {article.category}
              </div>
              {/* 북마크 버튼: 호버 시에만 명확하게 보입니다 */}
              <button className="absolute top-4 right-4 w-8 h-8 bg-white/50 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-slate-700 transition-all opacity-0 group-hover:opacity-100">
                <Bookmark size={14} />
              </button>
            </div>
            
            {/* 카드 정보 영역: 기사 제목과 부가 정보를 깔끔하게 배치합니다 */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                {/* 언론사명과 경과 시간을 윗부분에 작게 보여줍니다 */}
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">
                  <span>{article.source}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {article.time}</span>
                </div>
                {/* 메인 기사 제목을 굵고 읽기 좋게 설정합니다 */}
                <h3 className="text-xl font-black text-slate-800 leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                  {article.title}
                </h3>
              </div>
              
              {/* 카드 하단부: 읽는 시간 정보와 '자세히 보기' 지시자를 포함합니다 */}
              <div className="flex items-center justify-between border-t border-slate-50 pt-4 mt-auto">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg">
                  {article.readTime}
                </span>
                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
