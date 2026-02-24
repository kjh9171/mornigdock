import { PlayCircle, Headphones, Video, Clock } from 'lucide-react'; // 미디어 관련 세련된 시각 아이콘 임포트.

// 미디어 컨텐츠의 인터페이스를 정의합니다.
interface MediaItem {
  id: number; // 미디어 식별자
  type: 'video' | 'audio'; // 영상물과 음원물을 구분할 타입
  title: string; // 미디어의 주제목
  duration: string; // 컨텐츠의 길이
  thumbnail: string; // 미디어 카드를 화려하게 장식할 이미지 경로
}

// 목업 배열 데이터: 비디오 및 오디오 튜토리얼 또는 자료들을 명시합니다.
const mediaList: MediaItem[] = [
  {
    id: 1, // 아이템 ID
    type: 'video', // 비디오 분류
    title: '제로 트러스트 아키텍처 구축 실무 가이드', // 기술적 비디오 제목
    duration: '1:12:45', // 영화 같은 길이
    thumbnail: 'https://images.unsplash.com/photo-1510511459019-5d648d2bc22e?q=80&w=600&auto=format&fit=crop', // 어두운 IT 느낌의 환상적인 사진
  },
  {
    id: 2, // 아이템 ID
    type: 'audio', // 팟캐스트 오디오 분류
    title: '[팟캐스트] 생성형 AI 시대의 윤리적 딜레마', // 오디오 에피소드 제목
    duration: '45:30', // 강연 길이
    thumbnail: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=600&auto=format&fit=crop', // 스포트라이트를 받는 마이크 이미지 (분위기 압권)
  },
  {
    id: 3, // 아이템 ID
    type: 'video', // 컨퍼런스 비디오 분류
    title: '2026 글로벌 사이버 시큐리티 서밋 하이라이트', // 중요한 비디오 내용
    duration: '15:20', // 짧은 요약본 길이
    thumbnail: 'https://images.unsplash.com/photo-1540317580384-e5d43867caa6?q=80&w=600&auto=format&fit=crop', // 사람들이 모인 열정적인 컨퍼런스 뷰
  }
];

// 미디어 플레이어 통합 허브 페이지 컴포넌트를 설계하여 내보냅니다.
export default function Media() {
  return (
    // 전체 컨테이너: 넉넉한 상하 패딩과 고급스러운 투명도 페이드인 애니메이션!
    <div className="p-8 max-w-7xl mx-auto animate-in fade-in duration-700">
      
      {/* 최상단 페이지 안내 헤더 영역 */}
      <div className="mb-12">
        {/* 미디어 전용 아이콘과 굵직한 폰트로 압도적인 전문성을 나타냅니다. */}
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center">
            <PlayCircle className="text-white w-6 h-6" />
          </div>
          큐레이션 미디어 랩
        </h1>
        {/* 짧고 강렬한 영어 모토로 장식합니다. */}
        <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs mt-3 ml-16">
          Premium Knowledge Content & Podcast Hub
        </p>
      </div>

      {/* 미디어 콘텐츠를 렌더링하기 위한 그리드 레이아웃, 다양한 스크린 폭에 유연하게 대응합니다. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        {/* 각 미디어 데이터를 순차적으로 그려냅니다. */}
        {mediaList.map((media) => (
          // 카드 개별 컨테이너. 호버 시 둥둥 떠오르고 그림자가 짙어집니다.
          <div key={media.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl shadow-slate-200/50 hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-500 cursor-pointer flex flex-col">
            
            {/* 상단 썸네일 영역: 상대적 크기를 조절하여 이미지가 가득 차 보이게 합니다. */}
            <div className="relative aspect-video overflow-hidden">
              <img src={media.thumbnail} alt={media.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
              
              {/* 이미지 위를 덮어씌운 오버레이 레이어. 마우스를 올릴 때 어두워집니다. */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
              
              {/* 좌측 상단 배지: 타입(비디오/오디오)에 따라 뱃지 색과 아이콘이 기가 막히게 바뀝니다! */}
              <div className="absolute top-5 left-5">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${media.type === 'video' ? 'bg-rose-500/20 text-rose-100 border border-rose-500/30' : 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30'}`}>
                  {media.type === 'video' ? <Video size={12} /> : <Headphones size={12} />}
                  {media.type}
                </div>
              </div>
              
              {/* 우측 하단 영상 길이 표기 영역: 반투명 검정 배경으로 가독성을 철저히 지킵니다. */}
              <div className="absolute bottom-5 right-5 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-xl text-[10px] font-black text-white tracking-widest">
                <Clock size={12} /> {media.duration}
              </div>
              
              {/* 중앙 호버 시 나타나는 큰 플레이버튼으로 재생을 직관적으로 유도합니다. */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-50 group-hover:scale-100">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center shadow-2xl border border-white/30">
                  <PlayCircle className="text-white w-8 h-8 ml-1" />
                </div>
              </div>
            </div>
            
            {/* 카드 하단 정보 섹션: 넉넉한 패딩 안쪽으로 정보성 텍스트를 담아냅니다. */}
            <div className="p-6 flex-1 flex flex-col justify-center bg-white border-t-4 border-slate-50 group-hover:border-blue-500 transition-colors duration-300">
              {/* 메인 타이틀: 선명한 대비를 통해 쉽게 읽힙니다. */}
              <h3 className="text-xl font-black text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                {media.title}
              </h3>
            </div>
            
          </div>
        ))}
      </div>
      
    </div>
  );
}
