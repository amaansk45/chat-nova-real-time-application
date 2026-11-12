import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VoicePlayerProps {
  audioUrl: string;
  duration?: number | null;
  waveformData?: number[];
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  audioUrl,
  duration = 0,
  waveformData = [30, 45, 60, 25, 75, 90, 40, 65, 80, 50, 70, 85, 30, 95, 60, 40, 55, 30],
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [speed, setSpeed] = useState<1 | 1.5 | 2>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = speed;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    const nextSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const handleSeek = (percentage: number) => {
    if (!audioRef.current || !totalDuration) return;
    const seekTime = (percentage / 100) * totalDuration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="flex items-center gap-3 p-2 rounded-2xl bg-nova-dark/80 border border-nova-border/70 max-w-sm select-none">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-gradient-to-r from-nova-primary to-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
      </button>

      {/* Waveform Visualization Bars */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex items-center gap-0.5 h-6 cursor-pointer" onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percent = (clickX / rect.width) * 100;
          handleSeek(percent);
        }}>
          {waveformData.map((height, i) => {
            const barProgress = (i / waveformData.length) * 100;
            const isFilled = barProgress <= progressPercent;

            return (
              <div
                key={i}
                style={{ height: `${Math.max(20, Math.min(height, 100))}%` }}
                className={`flex-1 rounded-full transition-colors ${
                  isFilled ? 'bg-nova-accent' : 'bg-slate-700/60'
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[10px] text-nova-muted font-mono mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Speed multiplier pill */}
      <button
        type="button"
        onClick={cycleSpeed}
        className="px-2 py-0.5 rounded-full bg-nova-card border border-nova-border text-[10px] font-bold text-nova-muted hover:text-white transition-colors"
      >
        {speed}x
      </button>
    </div>
  );
};

export default VoicePlayer;
