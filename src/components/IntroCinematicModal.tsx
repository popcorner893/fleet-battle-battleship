import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FastForward, Volume2, VolumeX, Anchor } from 'lucide-react';

const INTRO_VIDEO_URL = '/assets/aistudio/Video_Intro_25dcb5f4.mp4';

interface IntroCinematicModalProps {
  soundEnabled: boolean;
  sfxVolume?: number;
  onComplete: () => void;
}

export const IntroCinematicModal: React.FC<IntroCinematicModalProps> = ({
  soundEnabled,
  sfxVolume = 0.5,
  onComplete,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const onCompleteRef = useRef(onComplete);
  const rafRef = useRef<number | null>(null);
  const isCompletingRef = useRef(false);

  const [isMuted, setIsMuted] = useState(!soundEnabled);
  const [autoplayBlockedAudio, setAutoplayBlockedAudio] = useState(false);
  const [isFadingToBlack, setIsFadingToBlack] = useState(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const handleFinishIntro = useCallback(() => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    setIsFadingToBlack(true);

    setTimeout(() => {
      onCompleteRef.current();
    }, 550);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = Math.max(0, Math.min(1, sfxVolume));
    video.muted = !soundEnabled;
    video.currentTime = 0;

    const startPlayback = () => {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Browser blocked unmuted autoplay on initial page load; fallback to muted autoplay
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            if (soundEnabled) {
              setAutoplayBlockedAudio(true);
            }
            videoRef.current.play().catch(() => {
              handleFinishIntro();
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

    const updateProgressLoop = () => {
      if (videoRef.current && progressBarRef.current && videoRef.current.duration > 0) {
        const ratio = Math.min(
          1,
          Math.max(0, videoRef.current.currentTime / videoRef.current.duration)
        );
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
  }, [soundEnabled, sfxVolume, handleFinishIntro]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    if (!nextMuted) {
      videoRef.current.volume = Math.max(0.2, Math.min(1, sfxVolume));
      setAutoplayBlockedAudio(false);
    }
    setIsMuted(nextMuted);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none transition-opacity duration-500 ${
        isFadingToBlack ? 'opacity-100' : 'opacity-100'
      }`}
    >
      {/* Fullscreen Video Viewport */}
      <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoRef}
          src={INTRO_VIDEO_URL}
          preload="auto"
          playsInline
          onClick={
            autoplayBlockedAudio
              ? () => {
                  if (videoRef.current) {
                    videoRef.current.muted = false;
                    videoRef.current.volume = Math.max(0.3, Math.min(1, sfxVolume));
                    setIsMuted(false);
                    setAutoplayBlockedAudio(false);
                  }
                }
              : undefined
          }
          onEnded={handleFinishIntro}
          onError={handleFinishIntro}
          className={`w-full h-full object-contain sm:object-cover transform-gpu transition-opacity duration-500 ${
            isFadingToBlack ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Top Tactical HUD Bar */}
        <div
          className={`absolute top-0 inset-x-0 z-20 p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between gap-3 transition-opacity duration-500 ${
            isFadingToBlack ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/90 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
              <Anchor className="w-4 h-4" />
            </div>
            <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
              FLEET BATTLE — Operaciones Navales
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="py-1.5 px-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              title={isMuted ? 'Activar Audio' : 'Silenciar Audio'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-amber-400" />
                  <span>{autoplayBlockedAudio ? 'Activar Sonido' : 'Silenciado'}</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  <span className="hidden sm:inline">Audio Activo</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFinishIntro}
              className="py-1.5 px-3.5 rounded-lg bg-slate-900/90 hover:bg-cyan-600 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg"
            >
              <span>Saltar Intro</span>
              <FastForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Progress Strip */}
        <div
          className={`absolute bottom-0 inset-x-0 z-20 p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-500 ${
            isFadingToBlack ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="max-w-4xl mx-auto w-full h-1 bg-slate-900/90 rounded-full overflow-hidden">
            <div
              ref={progressBarRef}
              className="h-full w-full origin-left bg-cyan-400 transform-gpu"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
