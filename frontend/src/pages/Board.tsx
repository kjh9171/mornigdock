import { MessageSquare, ThumbsUp, MessageCircle, MoreHorizontal } from 'lucide-react'; // 사용자 경험을 높이기 위한 게시판 공용 아이콘들을 불러옵니다.

// 게시글 데이터 구조체를 안전하게 타이핑합니다.
interface Post {
  id: number; // 게시글 고유 키입니다.
  author: string; // 작성자 이름입니다.
  avatarText: string; // 작성자 아바타에 표기할 짧은 이니셜 문자열입니다.
  title: string; // 게시글의 주된 주제 제목입니다.
  content: string; // 본문 일부(요약 텍스트)입니다.
  likes: number; // 좋아요 통계 수치입니다.
  comments: number; // 댓글 통계 수치입니다.
  timeAgo: string; // 게시글이 등록된 후부터 경과된 텍스트 형식의 시간입니다.
}

// 목업 형태의 게시글 배열을 초기화하여 렌더링에 사용합니다.
const mockPosts: Post[] = [
  {
    id: 1, // 게시글 번호
    author: '총괄본부장 CERT', // 권위 있는 사용자의 게시글
    avatarText: 'CE', // 사용자 아바타 약어
    title: 'v2.0 배포 관련 이슈 트래킹 및 의견 수렴의 건', // 핵심 이슈를 나타내는 강력한 제목
    content: '현재 배포된 서버리스 도커 환경에서 레이턴시는 크게 개선되었습니다. 추가적인 병목 현상에 대해 의견 남겨주시면 감사하겠습니다.', // 읽기 편한 내용 요약
    likes: 42, // 팀원들의 긍정적 반응
    comments: 15, // 활발하게 의견 교환 중인 것을 묘사
    timeAgo: '1시간 전', // 1시간 경과
  },
  {
    id: 2, // 두 번째 게시글 번호
    author: '데이터분석팀장', // 직책을 표기하여 몰입감을 줌
    avatarText: 'DA',
    title: '금주 인텔리전스 리포트 취합 프로세스 자동화 제안', // 업무 관련 제목
    content: '파이썬 기반 스크립트를 이용하여 분산된 데이터를 자동으로 시각화하는 파이프라인을 구축하고자 합니다. 세부 기술 스택에 관한 조언 구합니다.', // 본문
    likes: 28, // 승인하는 좋아요
    comments: 8, // 이어진 피드백 갯수
    timeAgo: '3시간 전', // 등록 후 3시간
  },
];

// 커뮤니티 게시판 페이지 컴포넌트 렌더링을 시작합니다.
export default function Board() {
  return (
    // 전체 프레임 구성: 중앙 정렬 후 부드럽게 줌 인되는 이펙트 효과 적용!
    <div className="p-8 max-w-5xl mx-auto animate-in zoom-in-95 duration-500">
      
      {/* 최상단 타이틀 컨테이너: 밝고 산뜻하게 공간을 열어줍니다. */}
      <div className="flex items-center justify-between mb-10 pb-6 border-b-2 border-slate-100">
        <div className="flex items-center gap-4">
          {/* 부드러운 파란색 그라데이션 원형 안에 귀여운 말풍선 아이콘 배치 */}
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <MessageSquare className="text-white w-7 h-7" />
          </div>
          <div>
            {/* 명확한 대제목 표기 */}
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">아고라 광장</h1>
            {/* 세부 분류 혹은 하위 타이틀용 설명 문구 */}
            <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">
              기술 토론 및 인사이트 교류의 장
            </p>
          </div>
        </div>
        
        {/* 새 글 작성 버튼: 눈에 잘 띄게 채도가 높은 검은색 계열을 사용해 대비 효과를 줍니다. */}
        <button className="px-6 py-3.5 bg-slate-900 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 hover:-translate-y-0.5 transition-all">
          새 스레드 시작
        </button>
      </div>

      {/* 게시글 목록 컨테이너 영역: 스페이싱을 통한 가독성 증대 */}
      <div className="space-y-6">
        {/* 배열에 정의해 둔 목업 데이터를 순회하며 아이템을 화면에 조립합니다. */}
        {mockPosts.map((post) => (
          // 게시글 개별 카드: 포커스/호버 시 파란색 외곽선이 부드럽게 강조되도록 설정했습니다.
          <div key={post.id} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 hover:border-blue-200 transition-all cursor-pointer group">
            
            {/* 작성자 정보와 경과 시간을 상단에 얇은 선으로 정렬합니다. */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* 작성자 아바타 이미지 대용 이니셜 뱃지 */}
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xs border border-blue-100">
                  {post.avatarText}
                </div>
                {/* 실명 및 직책 표시 */}
                <span className="font-bold text-slate-700 text-sm tracking-tight">{post.author}</span>
              </div>
              
              {/* 우측 상단의 경과시간 표시 및 옵션 모달 호출용 아이콘 영역 */}
              <div className="flex items-center gap-4 text-slate-300">
                <span className="text-xs font-black uppercase tracking-widest">{post.timeAgo}</span>
                <button className="p-1 hover:text-slate-500 hover:bg-slate-50 rounded-lg transition-colors">
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>

            {/* 본문 콘텐츠 부분: 시원시원한 폰트 사이즈를 활용하여 빠른 가독성을 자랑합니다. */}
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">
                {post.title}
              </h2>
              {/* 긴 요약본도 회색 톤으로 은은하게 표기합니다. */}
              <p className="text-slate-500 font-medium leading-relaxed mb-6 line-clamp-2">
                {post.content}
              </p>
            </div>

            {/* 카드 최하단의 상호작용 지표 통계 부분입니다. 좋아요와 댓글의 갯수를 나타냅니다. */}
            <div className="flex items-center gap-6 pt-5 border-t border-slate-50">
              {/* 좋아요 액션 버튼 박스 */}
              <button className="flex items-center gap-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all font-black text-xs uppercase tracking-widest">
                <ThumbsUp size={16} /> {post.likes} 반응
              </button>
              {/* 댓글 남기기 액션 버튼 박스 */}
              <button className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all font-black text-xs uppercase tracking-widest">
                <MessageCircle size={16} /> {post.comments} 의견
              </button>
            </div>
            
          </div>
        ))}
      </div>
      
    </div>
  );
}
