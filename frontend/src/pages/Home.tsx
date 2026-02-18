import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ✅ 샘플 뉴스 데이터 (실제 크롤링 전 목업)
const MOCK_NEWS = [
  {
    id: 1,
    category: '경제',
    title: '연준, 금리 동결 결정…시장 반응은?',
    summary: '미국 연방준비제도(Fed)가 이번 회의에서 기준금리를 동결하기로 결정했다. 시장은 하반기 인하 가능성을 주시하고 있다.',
    source: 'Bloomberg',
    time: '2시간 전',
    aiResult: 'Fed의 금리 동결은 인플레이션 둔화 신호로 해석되며, 단기적으로 채권 시장에 긍정적 영향을 줄 가능성이 높습니다. 주식 시장은 불확실성이 해소되며 소폭 상승할 것으로 예상됩니다.',
  },
  {
    id: 2,
    category: '기술',
    title: 'OpenAI, GPT-5 출시 일정 공식 발표',
    summary: 'OpenAI가 차세대 모델 GPT-5의 출시 일정을 공식적으로 밝혔다. 추론 능력이 대폭 향상될 예정이라고 전했다.',
    source: 'TechCrunch',
    time: '4시간 전',
    aiResult: 'GPT-5 출시는 AI 업계 전반의 경쟁을 심화시킬 전망입니다. 특히 Google과 Anthropic의 대응 전략에 관심이 집중될 것이며, 기업용 AI 도입 속도가 빨라질 것으로 분석됩니다.',
  },
  {
    id: 3,
    category: '정치',
    title: '한미 정상회담, 경제 안보 협력 강화 합의',
    summary: '한국과 미국 정상이 회담을 통해 반도체, 배터리 등 핵심 산업 공급망 협력을 더욱 강화하기로 합의했다.',
    source: '연합뉴스',
    time: '6시간 전',
    aiResult: '이번 합의는 한국 반도체 및 배터리 기업들에게 긍정적인 신호로 작용할 것입니다. 삼성전자, SK하이닉스, LG에너지솔루션 등의 미국 투자 확대가 예상됩니다.',
  },
  {
    id: 4,
    category: '글로벌',
    title: '중동 긴장 고조…국제유가 배럴당 90달러 돌파',
    summary: '중동 지역 지정학적 불안이 계속되며 국제유가가 배럴당 90달러를 넘어섰다. 에너지 시장 변동성이 확대되고 있다.',
    source: 'Reuters',
    time: '8시간 전',
    aiResult: '유가 상승은 글로벌 인플레이션 압력을 재점화할 수 있습니다. 항공, 운송업종의 비용 부담이 커지고, 에너지 기업들의 수익성은 개선될 전망입니다.',
  },
  {
    id: 5,
    category: '산업',
    title: '현대차, 전기차 판매 목표 상향 조정',
    summary: '현대자동차그룹이 올해 전기차 판매 목표를 기존 대비 15% 상향 조정했다. 아이오닉 라인업 확대가 주요 동력이다.',
    source: '한국경제',
    time: '10시간 전',
    aiResult: '현대차의 목표 상향은 전기차 시장에서의 자신감을 반영합니다. 북미 및 유럽 시장에서의 점유율 확대가 기대되며, 관련 부품 협력사들에게도 긍정적인 효과가 예상됩니다.',
  },
]

const CATEGORIES = ['전체', '경제', '기술', '정치', '글로벌', '산업']

// ─────────────────────────────────────────────
// 뉴스 카드 컴포넌트
// ─────────────────────────────────────────────
function NewsCard({ news }: { news: typeof MOCK_NEWS[0] }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<string[]>([])
  const [showComments, setShowComments] = useState(false)

  // ✅ AI 분석 버튼 클릭 - 1.5초 로딩 시뮬레이션
  const handleAnalyze = () => {
    if (showAI) { setShowAI(false); return }
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
      setShowAI(true)
    }, 1500)
  }

  // ✅ 댓글 추가
  const handleAddComment = () => {
    if (!comment.trim()) return
    setComments((prev) => [...prev, comment.trim()])
    setComment('')
  }

  const categoryColors: Record<string, string> = {
    경제: 'bg-amber-100 text-amber-700',
    기술: 'bg-blue-100 text-blue-700',
    정치: 'bg-red-100 text-red-700',
    글로벌: 'bg-green-100 text-green-700',
    산업: 'bg-purple-100 text-purple-700',
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* 상단: 카테고리 + 출처 + 시간 */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryColors[news.category] || 'bg-stone-100 text-stone-600'}`}>
          {news.category}
        </span>
        <span className="text-xs text-stone-400">{news.source} · {news.time}</span>
      </div>

      {/* 제목 */}
      <h3 className="text-base font-semibold text-stone-800 mb-2 leading-snug">
        {news.title}
      </h3>

      {/* 요약 */}
      <p className="text-sm text-stone-500 leading-relaxed mb-4">
        {news.summary}
      </p>

      {/* AI 분석 로딩 바 */}
      {isAnalyzing && (
        <div className="mb-3">
          <div className="h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full animate-pulse w-3/4" />
          </div>
          <p className="text-xs text-stone-400 mt-1">AI 분석 중...</p>
        </div>
      )}

      {/* AI 분석 결과 */}
      {showAI && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-amber-600 text-xs font-semibold">✦ AI 분석</span>
          </div>
          <p className="text-sm text-stone-700 leading-relaxed">{news.aiResult}</p>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleAnalyze}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors
            ${showAI
              ? 'bg-amber-600 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-amber-100 hover:text-amber-700'
            }`}
        >
          {isAnalyzing ? '분석 중...' : showAI ? '분석 닫기' : '✦ AI 분석'}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="text-xs px-3 py-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors font-medium"
        >
          💬 댓글 {comments.length > 0 && `(${comments.length})`}
        </button>
      </div>

      {/* 댓글 섹션 */}
      {showComments && (
        <div className="border-t border-stone-100 pt-3">
          {/* 기존 댓글 목록 */}
          {comments.length > 0 && (
            <div className="mb-3 space-y-2">
              {comments.map((c, i) => (
                <div key={i} className="flex gap-2 text-sm">
                  <span className="text-stone-400">•</span>
                  <span className="text-stone-700">{c}</span>
                </div>
              ))}
            </div>
          )}
          {/* 댓글 입력 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="댓글을 입력하세요..."
              className="flex-1 text-sm px-3 py-1.5 border border-stone-200 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
            />
            <button
              onClick={handleAddComment}
              className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              등록
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 홈 페이지
// ─────────────────────────────────────────────
export default function Home() {
  const { user, logout } = useAuth()
  const [activeCategory, setActiveCategory] = useState('전체')
  const [lang, setLang] = useState<'ko' | 'en'>('ko')

  // ✅ 카테고리 필터
  const filteredNews = activeCategory === '전체'
    ? MOCK_NEWS
    : MOCK_NEWS.filter((n) => n.category === activeCategory)

  const labels = {
    ko: { title: '아고라', subtitle: '매일 아침, 세상의 흐름을 읽다', today: '오늘의 브리핑' },
    en: { title: 'Agora', subtitle: 'Read the world every morning', today: "Today's Briefing" },
  }
  const L = labels[lang]

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* ─── 헤더 ─── */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* 로고 + 네비게이션 */}
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-stone-800 tracking-tight">{L.title}</span>
            <nav className="hidden sm:flex gap-1">
              <span className="text-sm px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium">뉴스</span>
              <Link to="/media" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">미디어</Link>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">관리자</Link>
              )}
            </nav>
          </div>

          {/* 우측 컨트롤 */}
          <div className="flex items-center gap-3">
            {/* 언어 토글 */}
            <button
              onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
              className="text-xs px-2.5 py-1 border border-stone-200 rounded-full text-stone-500
                         hover:border-amber-400 hover:text-amber-600 transition-colors"
            >
              {lang === 'ko' ? 'EN' : '한'}
            </button>

            {/* 사용자 정보 */}
            <span className="text-sm text-stone-500 hidden sm:inline">{user?.username}</span>

            {/* 로그아웃 */}
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600
                         rounded-lg transition-colors font-medium"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* ─── 메인 콘텐츠 ─── */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* 섹션 제목 */}
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-stone-800">{L.today}</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>

        {/* 카테고리 필터 탭 */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-sm px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium
                ${activeCategory === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-600'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 뉴스 카드 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredNews.map((news) => (
            <NewsCard key={news.id} news={news} />
          ))}
        </div>

        {filteredNews.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            해당 카테고리의 뉴스가 없습니다.
          </div>
        )}
      </main>
    </div>
  )
}