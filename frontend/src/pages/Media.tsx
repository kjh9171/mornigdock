import React, { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type MediaType = 'youtube' | 'podcast' | 'music'

interface MediaItem {
  id: number
  type: MediaType
  title: string
  description: string
  thumbnail: string
  url: string          // YouTube: video ID, Podcast/Music: 스트림 URL
  duration?: string
  author?: string
  category?: string
}

// ─────────────────────────────────────────────
// 샘플 미디어 데이터 (관리자가 추가/수정/삭제)
// ─────────────────────────────────────────────
const INITIAL_MEDIA: MediaItem[] = [
  // YouTube
  {
    id: 1, type: 'youtube',
    title: '2024 글로벌 경제 전망 분석',
    description: '세계 주요 경제 전문가들이 분석하는 2024년 경제 흐름',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    url: 'dQw4w9WgXcQ',
    duration: '18:32', author: 'Bloomberg Korea', category: '경제',
  },
  {
    id: 2, type: 'youtube',
    title: 'AI 기술 혁신의 현재와 미래',
    description: '생성형 AI가 바꾸는 산업 지형도',
    thumbnail: 'https://img.youtube.com/vi/jNQXAC9IVRw/mqdefault.jpg',
    url: 'jNQXAC9IVRw',
    duration: '24:10', author: 'TechInsight', category: '기술',
  },
  {
    id: 3, type: 'youtube',
    title: '반도체 공급망 재편, 한국의 기회',
    description: '미중 갈등 속 반도체 산업 전략 심층 분석',
    thumbnail: 'https://img.youtube.com/vi/ysz5S6PUM-U/mqdefault.jpg',
    url: 'ysz5S6PUM-U',
    duration: '31:45', author: 'Korea Economic TV', category: '산업',
  },
  // Podcast
  {
    id: 4, type: 'podcast',
    title: '아침 경제 브리핑 EP.142',
    description: '오늘 주목해야 할 경제 뉴스 5가지를 15분 안에 정리합니다.',
    thumbnail: '',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: '15:04', author: '모닝독 팟캐스트', category: '경제',
  },
  {
    id: 5, type: 'podcast',
    title: '테크 위클리 EP.89 - AI 시대의 직업',
    description: 'ChatGPT 이후 직업 시장이 어떻게 변하고 있는지 살펴봅니다.',
    thumbnail: '',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: '28:17', author: 'Tech Weekly', category: '기술',
  },
  {
    id: 6, type: 'podcast',
    title: '글로벌 인사이트 EP.55 - 중동 지정학',
    description: '중동 분쟁이 에너지 시장과 글로벌 경제에 미치는 영향',
    thumbnail: '',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: '22:33', author: 'Global Insight', category: '글로벌',
  },
  // Music (집중 음악)
  {
    id: 7, type: 'music',
    title: 'Focus Flow — Lo-fi Study Beats',
    description: '집중력 향상을 위한 로파이 힙합 믹스',
    thumbnail: '',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    duration: '1:02:14', author: 'ChillBeats', category: '로파이',
  },
  {
    id: 8, type: 'music',
    title: 'Morning Productivity — Ambient',
    description: '아침 업무 집중을 위한 앰비언트 사운드스케이프',
    thumbnail: '',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    duration: '45:00', author: 'Ambient Works', category: '앰비언트',
  },
  {
    id: 9, type: 'music',
    title: 'Deep Work — Classical Focus',
    description: '딥 워크에 최적화된 클래식 피아노 모음',
    thumbnail: '',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    duration: '58:20', author: 'Classical Daily', category: '클래식',
  },
]

// ─────────────────────────────────────────────
// 카테고리 뱃지 색상
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
// 오디오 플레이어 컴포넌트 (Podcast / Music)
// ─────────────────────────────────────────────
function AudioCard({ item, isPlaying, onPlay }: {
  item: MediaItem
  isPlaying: boolean
  onPlay: (item: MediaItem) => void
}) {
  const emoji = item.type === 'podcast' ? '🎙️' : '🎵'
  const bgColor = item.type === 'podcast' ? 'from-violet-500 to-indigo-600' : 'from-emerald-500 to-teal-600'

  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm transition-all duration-200
      ${isPlaying ? 'border-amber-400 shadow-amber-100 shadow-md' : 'border-stone-200 hover:shadow-md'}`}>
      {/* 썸네일 영역 */}
      <div className={`w-full h-24 rounded-lg bg-gradient-to-br ${bgColor} flex items-center justify-center mb-3 relative overflow-hidden`}>
        <span className="text-4xl">{emoji}</span>
        {isPlaying && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-0.5">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="w-0.5 bg-white rounded-full animate-bounce"
                style={{ height: `${8 + (i % 3) * 4}px`, animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="mb-3">
        {item.category && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[item.category] || 'bg-stone-100 text-stone-500'} mb-1.5 inline-block`}>
            {item.category}
          </span>
        )}
        <h3 className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2">{item.title}</h3>
        <p className="text-xs text-stone-400 mt-0.5">{item.author} · {item.duration}</p>
      </div>

      {/* 재생 버튼 */}
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
  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden shadow-sm cursor-pointer transition-all duration-200
        ${isActive ? 'border-amber-400 shadow-amber-100 shadow-md' : 'border-stone-200 hover:shadow-md'}`}
      onClick={() => onSelect(item)}
    >
      <div className="relative">
        <img src={item.thumbnail} alt={item.title}
          className="w-full h-40 object-cover"
          onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/320x180/1c1c1c/amber?text=Video' }} />
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {item.duration}
        </div>
        {isActive && (
          <div className="absolute inset-0 bg-amber-600/20 flex items-center justify-center">
            <div className="bg-amber-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-lg">▶</div>
          </div>
        )}
      </div>
      <div className="p-3">
        {item.category && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE[item.category] || 'bg-stone-100 text-stone-500'} mb-1.5 inline-block`}>
            {item.category}
          </span>
        )}
        <h3 className="text-sm font-semibold text-stone-800 leading-snug line-clamp-2">{item.title}</h3>
        <p className="text-xs text-stone-400 mt-0.5">{item.author}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// 메인 미디어 페이지
// ─────────────────────────────────────────────
export default function Media() {
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState<MediaType>('youtube')
  const [selectedYT, setSelectedYT] = useState<MediaItem | null>(null)
  const [playingAudio, setPlayingAudio] = useState<MediaItem | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const mediaList = INITIAL_MEDIA.filter(m => m.type === activeTab)

  // ✅ 오디오 재생/일시정지 토글
  const handleAudioPlay = (item: MediaItem) => {
    if (playingAudio?.id === item.id) {
      // 같은 항목: 토글
      if (audioRef.current?.paused) {
        audioRef.current.play()
      } else {
        audioRef.current?.pause()
        setPlayingAudio(null)
      }
      return
    }
    // 다른 항목: 교체
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setPlayingAudio(item)
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.src = item.url
        audioRef.current.play().catch(() => {})
      }
    }, 50)
  }

  const TABS: { key: MediaType; label: string; icon: string }[] = [
    { key: 'youtube', label: 'YouTube', icon: '▶' },
    { key: 'podcast', label: '팟캐스트', icon: '🎙' },
    { key: 'music', label: '집중 음악', icon: '🎵' },
  ]

  return (
    <div className="min-h-screen bg-[#F9F9F9]">
      {/* 숨겨진 오디오 엘리먼트 */}
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      {/* ─── 헤더 ─── */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold text-stone-800 tracking-tight">아고라</Link>
            <nav className="hidden sm:flex gap-1">
              <Link to="/" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">뉴스</Link>
              <span className="text-sm px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium">미디어</span>
              {user?.role === 'admin' && (
                <Link to="/admin" className="text-sm px-3 py-1.5 rounded-lg text-stone-500 hover:bg-stone-100">관리자</Link>
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

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); setSelectedYT(null) }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors
                ${activeTab === tab.key ? 'bg-amber-600 text-white' : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-600'}`}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* ── YouTube 탭 ── */}
        {activeTab === 'youtube' && (
          <div>
            {/* 선택된 영상 플레이어 */}
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
                </div>
              </div>
            )}

            {!selectedYT && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                ▶ 영상을 선택하면 이 자리에서 바로 재생됩니다.
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaList.map(item => (
                <YouTubeCard key={item.id} item={item}
                  isActive={selectedYT?.id === item.id}
                  onSelect={setSelectedYT} />
              ))}
            </div>
          </div>
        )}

        {/* ── 팟캐스트 / 음악 탭 ── */}
        {(activeTab === 'podcast' || activeTab === 'music') && (
          <div>
            {/* 현재 재생 중 배너 */}
            {playingAudio && playingAudio.type === activeTab && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-400 rounded-xl flex items-center gap-3">
                <div className="flex gap-0.5 items-end h-6">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-1 bg-amber-500 rounded-full animate-bounce"
                      style={{ height: `${10 + (i % 3) * 6}px`, animationDelay: `${i * 0.12}s` }} />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-800 truncate">{playingAudio.title}</p>
                  <p className="text-xs text-amber-600">{playingAudio.author}</p>
                </div>
                <button onClick={() => { audioRef.current?.pause(); setPlayingAudio(null) }}
                  className="text-xs px-3 py-1 bg-amber-600 text-white rounded-full hover:bg-amber-700">
                  ■ 정지
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mediaList.map(item => (
                <AudioCard key={item.id} item={item}
                  isPlaying={playingAudio?.id === item.id}
                  onPlay={handleAudioPlay} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}