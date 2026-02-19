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
        {item.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
            {item.duration}
          </div>
        )}
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

type MediaTabType = 'youtube' | 'podcast' | 'music'

export default function Media() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<MediaTabType>('youtube')
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedYT, setSelectedYT] = useState<MediaItem | null>(null)
  const [playingAudio, setPlayingAudio] = useState<MediaItem | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setSelectedYT(null)
    audioRef.current?.pause()
    setPlayingAudio(null)

    getMediaAPI(activeTab)
      .then(res => {
        if (res.success) setMediaList(res.media)
        else setMediaList([])
      })
      .catch(() => setMediaList([]))
      .finally(() => setIsLoading(false))
  }, [activeTab])

  const handleAudioPlay = (item: MediaItem) => {
    if (playingAudio?.id === item.id) {
      if (audioRef.current?.paused) audioRef.current.play().catch(() => {})
      else { audioRef.current?.pause(); setPlayingAudio(null); }
      return
    }
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
    <div className="w-full">
      <audio ref={audioRef} onEnded={() => setPlayingAudio(null)} />

      <div className="mb-8">
        <h2 className="text-2xl font-black text-stone-900 uppercase tracking-tighter">Media Center</h2>
        <p className="text-sm text-stone-400 font-medium mt-1">지능형 영상 보고 및 집중을 위한 미디어 라이브러리</p>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto no-scrollbar pb-2">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-black transition-all whitespace-nowrap
              ${activeTab === tab.key
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                : 'bg-white border border-stone-200 text-stone-500 hover:border-amber-400 hover:text-amber-600'}`}
          >
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'youtube' && (
        <div className="space-y-8">
          {selectedYT && (
            <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm animate-in zoom-in-95 duration-300">
              <div className="relative" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  key={selectedYT.id}
                  src={`https://www.youtube.com/embed/${selectedYT.url}?autoplay=1&rel=0`}
                  title={selectedYT.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full border-0"
                />
              </div>
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-black text-stone-900 leading-tight">{selectedYT.title}</h3>
                  <button onClick={() => setSelectedYT(null)} className="text-xs font-black text-amber-600 uppercase hover:underline">Close Player</button>
                </div>
                <div className="flex items-center gap-3 text-xs text-stone-400 font-bold uppercase tracking-widest">
                  <span>{selectedYT.author}</span>
                  <span className="w-1 h-1 bg-stone-200 rounded-full" />
                  <span>{selectedYT.duration}</span>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {(activeTab === 'podcast' || activeTab === 'music') && (
        <div className="space-y-8">
          {playingAudio && (
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex gap-1 items-end h-8 shrink-0">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-1 bg-amber-500 rounded-full animate-bounce" style={{ height: `${12 + (i % 3) * 8}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-amber-900 truncate uppercase">{playingAudio.title}</p>
                <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">{playingAudio.author}</p>
              </div>
              <button onClick={() => { audioRef.current?.pause(); setPlayingAudio(null) }} className="px-4 py-2 bg-amber-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-amber-700 transition-all shadow-md shadow-amber-600/20">Stop Session</button>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  )
}
