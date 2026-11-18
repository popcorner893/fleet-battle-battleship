import React, { useEffect, useRef, useState } from 'react';
import { TurnOwner } from '../types';
import { FastForward, Volume2, VolumeX, Crosshair, Flame } from 'lucide-react';

const VIDEO_ASSET_URL = '/assets/aistudio/gemini_generated_video_dfa868e3_6950c7db.mp4';

// Singleton in-memory Blob URL cache so the video plays from RAM with zero network buffering
let cachedVideoBlobUrl: string | null = null;
let preloadPromise: Promise<string> | null = null;

export function preloadOutroVideo(): Promise<string> {
  if (cachedVideoBlobUrl) {
    return Promise.resolve(cachedVideoBlobUrl);
  }
  if (preloadPromise) {
    return preloadPromise;
  }

  preloadPromise = fetch(VIDEO_ASSET_URL)
    .then((res) => {
      if (!res.ok) throw new Error('Failed to fetch video');
      return res.blob();
    })
    .then((blob) => {
      cachedVideoBlobUrl = URL.createObjectURL(blob);
      return cachedVideoBlobUrl;
    })
    .catch(() => {
      preloadPromise = null;
      return VIDEO_ASSET_URL;
    });

  return preloadPromise;
}

interface FinalCinematicModalProps {
  winner: TurnOwner | null;
  soundEnabled: boolean;
  onComplete: () => void;
}

export const FinalCinematicModal: React.FC<FinalCinematicModalProps> = ({
  winner,
  soundEnabled,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  const rafRef = useRef<number | null>(null);

  const [isMuted, setIsMuted] = useState(!soundEnabled);
  const [videoSrc, setVideoSrc] = useState<string>(cachedVideoBlobUrl || VIDEO_ASSET_URL);

  const isVictory = winner === 'player';

  // Keep latest onComplete callback in a ref so it never re-triggers video.play() effect
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Resolve preloaded Blob URL if not immediately ready
  useEffect(() => {
    if (!cachedVideoBlobUrl) {
      preloadOutroVideo().then((src) => {
        setVideoSrc(src);
      });
    }
  }, []);

  // Start playback once and update progress bar via GPU transform (zero React re-renders!)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !soundEnabled;
    video.currentTime = 0;

    const startPlayback = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch(() => {
              setTimeout(() => onCompleteRef.current(), 1200);
            });
          }
        });
      }
    };

    if (video.readyState >= 2) {
      startPlayback();
    } else {
      video.addEventListener('canplay', startPlayback, { once: true });
    }

    // Smooth 60fps progress bar update without triggering React state re-renders
    const updateProgressLoop = () => {
      if (videoRef.current && progressBarRef.current && videoRef.current.duration > 0) {
        const ratio = Math.min(1, Math.max(0, videoRef.current.currentTime / videoRef.current.duration));
        progressBarRef.current.style.transform = `scaleX(${ratio})`;
      }
      rafRef.current = requestAnimationFrame(updateProgressLoop);
    };

    rafRef.current = requestAnimationFrame(updateProgressLoop);

    return () => {
      video.removeEventListener('canplay', startPlayback);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [videoSrc]); // Only runs once when videoSrc is set

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 select-none">
      {/* Main Cinematic Frame — Hardware accelerated, no backdrop-blur lag */}
      <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl bg-black">
        {/* Top Tactical HUD Overlay */}
        <div className="absolute top-0 inset-x-0 z-20 p-3 sm:p-4 bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isVictory ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
            />
            <div className="flex items-center gap-2">
              <Crosshair
                className={`w-4 h-4 ${isVictory ? 'text-emerald-400' : 'text-rose-400'}`}
              />
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                {isVictory
                  ? '¡Impacto Final Confirmado! — Flota Enemiga Destruida'
                  : '¡Alerta Crítica! — Último Buque Aliado Hundido'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="p-2 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 transition-colors cursor-pointer"
              title={isMuted ? 'Activar Audio del Video' : 'Silenciar Audio'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onCompleteRef.current()}
              className="py-1.5 px-3 rounded-lg bg-slate-900/90 hover:bg-cyan-600 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
            >
              <span>Ver Informe Final</span>
              <FastForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Element — GPU-composited layer */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            src={videoSrc}
            preload="auto"
            className="w-full h-full object-cover transform-gpu"
            playsInline
            onEnded={() => onCompleteRef.current()}
            onError={() => onCompleteRef.current()}
          />

          {/* Subtle Corner Reticle Accents */}
          <div className="pointer-events-none absolute inset-4 border border-white/10 rounded-xl" />
        </div>

        {/* Bottom Progress & Status Bar */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex flex-col gap-2">
          <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
            <div
              ref={progressBarRef}
              className={`h-full w-full origin-left transform-gpu ${
                isVictory ? 'bg-emerald-400' : 'bg-rose-500'
              }`}
              style={{ transform: 'scaleX(0)' }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Cinemática de Destrucción Naval en Curso...</span>
            </span>
            <span className="text-slate-300">
              {isVictory ? 'VICTORIA ALIADA' : 'VICTORIA ENEMIGA'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
