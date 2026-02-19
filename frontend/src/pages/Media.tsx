import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getMediaAPI, MediaItem } from '../lib/api'

// ─────────────────────────────────────────────
// 카테고리 뱃지 색상 매핑
// ─────────────────────────────────────────────
const BADGE: Record<string, string> = {
  경제: 'bg-amber-100 text-amber-700',
  기술: 'bg-blue-100 text-blue-700',
  산업: 'bg-purple-100 text-purple-700',
  글로벌: 'bg-green-100 text-green-700',
  로파이: 'bg-pink-100 text-pink-700',
  앰비언트: 'bg-teal-100 text-teal-700',
  클래식: 'bg-orange-100 text-orange-700',
}

// ─────────────────────────────────────────────
// 오디오 플레이어 카드 (팟캐스트 / 집중 음악)
// ─────────────────────────────────────────────
function AudioCard({ item, isPlaying, onPlay }: {
  item: MediaItem
  isPlaying: boolean
  onPlay: (item: MediaItem) => void
}) {
  const emoji = item.type === 'podcast' ? '🎙️' : '🎵'
  const bgColor = item.type === 'podcast'
    ? 'from-violet-500 to-indigo-600'
    : 'from-emerald-500 to-teal-600'

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm transition-all duration-200
      ${isPlaying
        ? 'border-amber-400 shadow-amber-100 shadow-md'
        : 'border-stone-200 hover:shadow-md'}`}>

      {/* 썸네일 - 그라디언트 배경 + 재생 중 이퀄라이저 */}
      <div className={`w-full h-24 rounded-lg bg-gradient-to-br ${bgColor}
        flex items-center justify-center mb-3 relative overflow-hidden`}>
        <span className="text-4xl">{emoji}</span>
        {isPlaying && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-0.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i}
                className="w-0.5 bg-white rounded-full animate-bounce"
                style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="mb-3">
        {item.category && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-1.5
            ${BADGE[item.category] || 'bg-stone-100 text-stone-500'}`}>
            {item.category}
          </span>
        )}
        <h3 className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2">
          {item.title}
        </h3>
        <p className="text-xs text-stone-400 mt-0.5">{item.author} · {item.duration}</p>
      </div>

      {/* 재생/일시정지 버튼 */}
      <button
        onClick={() => onPlay(item)}
        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors
          ${isPlaying
            ? 'bg-amber-600 text-white'
            : 'bg-stone-100 text-stone-700 hover:bg-amber-100 hover:text-amber-700'}`}
      >
        {isPlaying ? '⏸ 일시정지' : '▶ 재생'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// YouTube 카드 컴포넌트
// ─────────────────────────────────────────────
function YouTubeCard({ item, isActive, onSelect }: {
  item: MediaItem
  isActive: boolean
  onSelect: (item: MediaItem) => void
}) {
  // YouTube thumbnail URL 생성 (thumbnail_url이 없으면 video ID로 자동 생성)
  const thumbnail = item.thumbnail_url
    || `https://img.youtube.com/vi/${item.url}/mqdefault.jpg`

  return (
    <div
      onClick={() => onSelect(item)}
      className={`bg-white border rounded-xl overflow-hidden shadow-sm cursor-pointer
        transition-all duration-200
        ${isActive
          ? 'border-amber-400 shadow-amber-100 shadow-md'
          : 'border-stone-200 hover:shadow-md'}`}
    >
      <div className="relative">
        <img
          src={thumbnail}
          alt={item.title}
          className="w-full h-40 object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://placehold.co/320x180/1c1c1c/amber?text=Video'
          }}
        />
        {/* 재생시간 뱃지 */}
        {item.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {item.duration}
          </div>
        )}
        {/* 활성 오버레이 */}
        {isActive && (
          <div className="absolute inset-0 bg-amber-600/20 flex items-center justify-center">
            <div className="bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg">
              ▶
            </div>
          </div>
        )}
      </div>
      <div className="p-3">
        {item.category && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block mb-1.5
            ${BADGE[item.category] || 'bg-stone-100 text-stone-500'}`}>
            {item.category}
          </span>
        )}
        <h3 className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2">
          {item.title}
        </h3>
        <p className="text-xs text-stone-400 mt-0.5">{item.author}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 로딩 스켈레톤
// ─────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden animate-pulse">
      <div className="h-40 bg-stone-100" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-stone-100 rounded w-1/3" />
        <div className="h-4 bg-stone-100 rounded w-4/5" />
        <div className="h-3 bg-stone-100 rounded w-1/2" />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 미디어 페이지
// [핵심 수정] 하드코딩 제거 → getMediaAPI()로 DB에서 실시간 조회
//             관리자가 추가/수정/삭제한 미디어가 즉시 반영됨
// ─────────────────────────────────────────────
type MediaTabType = 'youtube' | 'podcast' | 'music'

export default function Media() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<MediaTabType>('youtube')
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYT, setSelectedYT] = useState<MediaItem | null>(null)
  const [playingAudio, setPlayingAudio] = useState<MediaItem | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ✅ 탭 변경 시 해당 타입 미디어만 API로 조회
  useEffect(() => {
    setIsLoading(true)
    setSelectedYT(null)
    // 탭이 바뀌면 오디오도 정지
    audioRef.current?.pause()
    setPlayingAudio(null)

    getMediaAPI(activeTab)
      .then(res => {
        if (res.success) {
          setMediaList(res.media)
        } else {
          setMediaList([])
        }
      })
      .catch(() => setMediaList([]))
      .finally(() => setIsLoading(false))
  }, [activeTab])

  // ✅ 오디오 재생/일시정지 토글
  const handleAudioPlay = (item: MediaItem) => {
    if (playingAudio?.id === item.id) {
      // 같은 항목 클릭: 재생 중이면 일시정지, 정지 중이면 재생
      if (audioRef.current?.paused) {
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current?.pause()
        setPlayingAudio(null)
      }
      return
    }
    // 다른 항목: 이전 정지 후 새 항목 재생
    audioRef.current?.pause()
    setPlayingAudio(item)
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = item.url
        audioRef.current.play().catch(() => {})
      }
    }, 50)
  }

  const TABS: { key: MediaTabType; label: string; icon: string }[] = [
    { key: 'youtube', label: 'YouTube', icon: '▶' },
    { key: 'podcast', label: '팟캐스트', icon: '🎙' },
    { key: 'music', label: '집중 음악', icon: '🎵' },
  ]

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* 숨겨진 오디오 엘리먼트 - 팟캐스트/음악 재생용 */}
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      {/* ─── 헤더 ─── */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-stone-800 tracking-tight">아고라</Link>
            <nav className="hidden sm:flex gap-1">
              <Link to="/" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">뉴스</Link>
              <Link to="/board" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">게시판</Link>
              <span className="text-sm px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium">미디어</span>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-sm px-3 py-1.5 rounded-lg text-red-600 hover:bg-red-50 font-medium">관리자</Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500 hidden sm:inline">{user?.username}</span>
            <button onClick={logout}
              className="text-xs px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors font-medium">
              로그아웃
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-stone-800">미디어 센터</h2>
          <p className="text-sm text-stone-400 mt-0.5">뉴스 영상, 팟캐스트, 집중 음악을 한 곳에서</p>
        </div>

        {/* 탭 선택 */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
                ${activeTab === tab.key
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-600'}`}
            >
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* ── YouTube 탭 ── */}
        {activeTab === 'youtube' && (
          <div>
            {/* 선택된 영상 임베드 플레이어 */}
            {selectedYT && (
              <div className="mb-6 bg-black rounded-xl overflow-hidden shadow-lg">
                <div className="relative" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    key={selectedYT.id}
                    src={`https://www.youtube.com/embed/${selectedYT.url}?autoplay=1&rel=0`}
                    title={selectedYT.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
                <div className="p-4 bg-white border-t border-stone-100">
                  <h3 className="font-semibold text-stone-800">{selectedYT.title}</h3>
                  <p className="text-sm text-stone-500 mt-1">{selectedYT.description}</p>
                  <p className="text-xs text-stone-400 mt-1">{selectedYT.author} · {selectedYT.duration}</p>
                  <button
                    onClick={() => setSelectedYT(null)}
                    className="mt-2 text-xs text-stone-400 hover:text-stone-600"
                  >
                    ✕ 닫기
                  </button>
                </div>
              </div>
            )}

            {!selectedYT && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                ▶ 영상을 선택하면 이 자리에서 바로 재생됩니다.
              </div>
            )}

            {/* YouTube 카드 그리드 */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : mediaList.length === 0 ? (
              <div className="text-center py-20 text-stone-400">
                <p className="text-3xl mb-2">📺</p>
                <p className="text-sm">등록된 YouTube 영상이 없습니다.</p>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-xs text-amber-600 hover:underline mt-2 inline-block">
                    관리자 센터에서 추가하기 →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaList.map(item => (
                  <YouTubeCard
                    key={item.id}
                    item={item}
                    isActive={selectedYT?.id === item.id}
                    onSelect={setSelectedYT}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 팟캐스트 / 집중 음악 탭 ── */}
        {(activeTab === 'podcast' || activeTab === 'music') && (
          <div>
            {/* 현재 재생 중 배너 */}
            {playingAudio && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-400 rounded-xl flex items-center gap-3">
                {/* 이퀄라이저 애니메이션 */}
                <div className="flex gap-0.5 items-end h-6 shrink-0">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="w-1 bg-amber-500 rounded-full animate-bounce"
                      style={{ height: `${10 + (i % 3) * 6}px`, animationDelay: `${i * 0.12}s` }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 truncate">{playingAudio.title}</p>
                  <p className="text-xs text-amber-600">{playingAudio.author}</p>
                </div>
                <button
                  onClick={() => { audioRef.current?.pause(); setPlayingAudio(null) }}
                  className="text-xs px-3 py-1 bg-amber-600 text-white rounded-full hover:bg-amber-700 shrink-0"
                >
                  ■ 정지
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : mediaList.length === 0 ? (
              <div className="text-center py-20 text-stone-400">
                <p className="text-3xl mb-2">{activeTab === 'podcast' ? '🎙' : '🎵'}</p>
                <p className="text-sm">
                  등록된 {activeTab === 'podcast' ? '팟캐스트' : '집중 음악'}가 없습니다.
                </p>
                {user?.role === 'admin' && (
                  <Link to="/admin" className="text-xs text-amber-600 hover:underline mt-2 inline-block">
                    관리자 센터에서 추가하기 →
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaList.map(item => (
                  <AudioCard
                    key={item.id}
                    item={item}
                    isPlaying={playingAudio?.id === item.id}
                    onPlay={handleAudioPlay}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}