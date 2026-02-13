import { useMedia } from "@/hooks/use-media";
import { Play, Pause, SkipForward, Volume2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Slider } from "@/components/ui/slider";

export function MediaPlayer() {
  const { data: media } = useMedia();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // If no media, don't render
  if (!media || media.length === 0) return null;

  const currentTrack = media[currentTrackIndex];

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(console.error);
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const nextTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % media.length);
    setIsPlaying(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-card border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50 flex items-center px-6 justify-between lg:pl-72">
      <audio
        ref={audioRef}
        src={currentTrack.url}
        onEnded={nextTrack}
      />

      <div className="flex items-center gap-4 w-1/3">
        <div className="h-12 w-12 bg-muted rounded-md overflow-hidden flex-shrink-0">
          {currentTrack.coverUrl ? (
            <img src={currentTrack.coverUrl} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-primary/20 flex items-center justify-center">
              <Volume2 className="text-primary" size={20} />
            </div>
          )}
        </div>
        <div className="overflow-hidden">
          <p className="font-medium text-sm truncate silver-text-base">{currentTrack.title}</p>
          <p className="text-xs text-muted-foreground truncate">{currentTrack.artist || "Unknown Artist"}</p>
        </div>
      </div>

      <div className="flex items-center gap-6 justify-center w-1/3">
        <button
          onClick={togglePlay}
          className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>
        <button onClick={nextTrack} className="text-muted-foreground hover:text-foreground transition-colors">
          <SkipForward size={24} />
        </button>
      </div>

      <div className="w-1/3 flex items-center justify-end gap-2">
         {/* Simple volume visualization placeholder */}
        <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary w-2/3"></div>
        </div>
      </div>
    </div>
  );
}
