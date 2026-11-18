import React, { useState } from 'react';
import { AchievementStateItem, Difficulty, MatchStatistics } from '../types';
import { sound } from '../services/audio';
import { Volume2, VolumeX, Trophy, Swords } from 'lucide-react';

export interface MainMenuProps {
  onStartGame: (difficulty: Difficulty) => void;
  currentDifficulty: Difficulty;
  onUpdateDifficulty?: (difficulty: Difficulty) => void;
  onOpenSettings: () => void;
  onOpenInstructions: () => void;
  onOpenStats: () => void;
  onOpenAchievements?: () => void;
  onOpenMultiplayer: () => void;
  onOpenTournament?: () => void;
  statistics: MatchStatistics;
  achievements?: AchievementStateItem[];
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  sfxVolume?: number;
  onUpdateVolume?: (vol: number) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  currentDifficulty,
  onUpdateDifficulty,
  onOpenSettings,
  onOpenInstructions,
  onOpenStats,
  onOpenAchievements,
  onOpenMultiplayer,
  onOpenTournament,
  statistics,
  achievements = [],
  soundEnabled = true,
  onToggleSound,
  sfxVolume = 0.5,
  onUpdateVolume,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(currentDifficulty);
  const [isSonarRippling, setIsSonarRippling] = useState(false);

  const difficultyTactics: Record<
    Difficulty,
    { label: string; rank: string; desc: string; color: string }
  > = {
    EASY: {
      label: 'Fácil',
      rank: 'Recluta',
      desc: 'Disparos pseudoaleatorios sin memoria táctica post-impacto.',
      color: '#f97316',
    },
    MEDIUM: {
      label: 'Media',
      rank: 'Comandante',
      desc: 'Algoritmo Hunt-and-Target: rastreo y persecución ortogonal tras impacto.',
      color: '#06b6d4',
    },
    HARD: {
      label: 'Difícil',
      rank: 'Almirante',
      desc: 'Matriz bayesiana de densidad probabilística continua con filtrado en damero.',
      color: '#f59e0b',
    },
  };

  const handleSelectDifficulty = (diff: Difficulty) => {
    setSelectedDifficulty(diff);
    onUpdateDifficulty?.(diff);
    sound.playClick();
  };

  const handleRadarClick = () => {
    sound.playSonar();
    setIsSonarRippling(true);
    setTimeout(() => setIsSonarRippling(false), 900);
  };

  const handleVolumeToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSound?.();
    sound.playClick();
  };

  return (
    <div className="relative w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center p-2 sm:p-4 select-none overflow-x-hidden">
      {/* Background Ambience: Deep ocean glow */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(6,182,212,0.08),rgba(2,6,23,0.98))]"
      />

      {/* Primary CRT Terminal Console Frame — Strictly locked to the exact 2000:1116 aspect ratio of the entrance artwork */}
      <div className="relative w-full max-w-[min(1360px,calc(86vh*1.79211))] mx-auto flex flex-col items-center">
        {/* Retro Curved CRT Screen Housing — Driven directly by the intrinsic image ratio so buttons never shift */}
        <div className="relative w-full aspect-[2000/1116] rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.95)] border-4 sm:border-8 border-slate-900 ring-1 ring-amber-500/20 bg-black">
          {/* Base Console Graphic — Exact entrance artwork */}
          <img
            src="/assets/aistudio/image_e4f6d179.png"
            alt="Puesto de Mando Naval — Fleet Battle Terminal"
            className="block w-full h-full object-fill select-none pointer-events-none"
            loading="eager"
            decoding="sync"
            referrerPolicy="no-referrer"
          />

          {/* Subtle CRT Scanline and Phosphor Vignette Overlays */}
          <div className="absolute inset-0 crt-overlay" />
          <div className="absolute inset-0 crt-vignette" />

          {/* =========================================================================
              ZONE 1: TOP BRASS CONTROLS (Exact calibrated hitboxes on image_e4f6d179.png)
              ========================================================================= */}
          {/* 1. PUESTO DE MANDO */}
          <button
            type="button"
            onClick={() => sound.playClick()}
            className="absolute top-[6.3%] left-[27.0%] w-[10.3%] h-[5.2%] z-20 rounded-md cursor-pointer transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Puesto de Mando Activo — Centro de Operaciones"
            aria-label="Puesto de Mando"
          >
            <div className="absolute inset-0 rounded-md border border-amber-400/50 bg-amber-500/10 shadow-[0_0_14px_rgba(245,158,11,0.45)] group-hover:bg-amber-500/20 transition-all" />
          </button>

          {/* 2. MULTIJUGADOR P2P */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenMultiplayer();
            }}
            className="absolute top-[6.3%] left-[38.8%] w-[10.4%] h-[5.2%] z-20 rounded-md cursor-pointer transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            title="Abrir Sala Multijugador P2P en Tiempo Real"
            aria-label="Multijugador P2P"
          >
            <div className="absolute inset-0 rounded-md border border-transparent group-hover:bg-emerald-500/20 group-hover:border-emerald-400/70 group-hover:shadow-[0_0_14px_rgba(16,185,129,0.55)] transition-all" />
          </button>

          {/* 3. REGLAS DEL JUEGO */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenInstructions();
            }}
            className="absolute top-[6.3%] left-[50.8%] w-[10.4%] h-[5.2%] z-20 rounded-md cursor-pointer transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            title="Abrir Manual y Reglas de Combate Naval"
            aria-label="Reglas del Juego"
          >
            <div className="absolute inset-0 rounded-md border border-transparent group-hover:bg-cyan-500/20 group-hover:border-cyan-400/70 group-hover:shadow-[0_0_14px_rgba(6,182,212,0.55)] transition-all" />
          </button>

          {/* 4. ESTADÍSTICAS */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenStats();
            }}
            className="absolute top-[6.3%] left-[62.7%] w-[10.4%] h-[5.2%] z-20 rounded-md cursor-pointer transition-all duration-150 group focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title="Abrir Hoja de Servicio y Estadísticas Militares"
            aria-label="Estadísticas"
          >
            <div className="absolute inset-0 rounded-md border border-transparent group-hover:bg-amber-500/20 group-hover:border-amber-400/70 group-hover:shadow-[0_0_14px_rgba(245,158,11,0.55)] transition-all" />
          </button>

          {/* =========================================================================
              ZONE 2: CENTRAL RADAR SCREEN (Calibrated to inner green CRT glass)
              ========================================================================= */}
          <div
            className="absolute top-[42.2%] left-[46.2%] w-[7.6%] h-[8.8%] z-20 cursor-pointer rounded-full overflow-hidden flex items-center justify-center group"
            onClick={handleRadarClick}
            title="Radar Táctico Naval — Haz clic para emitir pulso acústico de sonar"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleRadarClick();
            }}
            aria-label="Sonar y Radar Táctico"
          >
            {/* Animated Rotating Radar Sweep Beam */}
            <div className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none opacity-65">
              <div className="w-1/2 h-1/2 ml-auto origin-bottom-left bg-gradient-to-tr from-emerald-400/45 via-emerald-500/20 to-transparent" />
            </div>

            {/* Pulsing Sonar Ripple Echo on Click */}
            {isSonarRippling && (
              <div className="absolute inset-0 rounded-full border-2 border-emerald-300 animate-ping pointer-events-none z-30" />
            )}

            {/* Hover highlight halo */}
            <div className="absolute inset-0 rounded-full border border-emerald-400/20 group-hover:border-emerald-400/80 group-hover:shadow-[inset_0_0_14px_rgba(16,185,129,0.45)] transition-all" />
          </div>

          {/* =========================================================================
              ZONE 3: AI DIFFICULTY LEVERS (Exact metallic switch plates)
              ========================================================================= */}
          {/* 1. FÁCIL / Recluta */}
          <button
            type="button"
            onClick={() => handleSelectDifficulty('EASY')}
            className="absolute top-[62.0%] left-[35.4%] w-[7.8%] h-[6.2%] z-20 cursor-pointer rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 group"
            title="Nivel Fácil: Recluta — Disparos sin memoria táctica"
            aria-label="Dificultad Fácil: Recluta"
          >
            {selectedDifficulty === 'EASY' ? (
              <>
                <div className="absolute top-[22%] left-[11%] w-[20%] h-[56%] rounded-xs bg-orange-500/45 border border-orange-300 shadow-[0_0_14px_#f97316] animate-pulse" />
                <div className="absolute inset-0 rounded-md border-2 border-orange-400/90 shadow-[0_0_16px_rgba(249,115,22,0.55)] pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 rounded-md border border-transparent group-hover:border-orange-400/50 group-hover:bg-orange-500/10 transition-all" />
            )}
          </button>

          {/* 2. MEDIA / Comandante */}
          <button
            type="button"
            onClick={() => handleSelectDifficulty('MEDIUM')}
            className="absolute top-[62.0%] left-[46.1%] w-[7.8%] h-[6.2%] z-20 cursor-pointer rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 group"
            title="Nivel Media: Comandante — Algoritmo Hunt-and-Target"
            aria-label="Dificultad Media: Comandante"
          >
            {selectedDifficulty === 'MEDIUM' ? (
              <>
                <div className="absolute top-[22%] left-[11%] w-[20%] h-[56%] rounded-xs bg-cyan-400/45 border border-cyan-200 shadow-[0_0_16px_#06b6d4] animate-pulse" />
                <div className="absolute inset-0 rounded-md border-2 border-cyan-400/90 shadow-[0_0_18px_rgba(6,182,212,0.6)] pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 rounded-md border border-transparent group-hover:border-cyan-400/50 group-hover:bg-cyan-500/10 transition-all" />
            )}
          </button>

          {/* 3. DIFÍCIL / Almirante */}
          <button
            type="button"
            onClick={() => handleSelectDifficulty('HARD')}
            className="absolute top-[62.0%] left-[56.9%] w-[7.8%] h-[6.2%] z-20 cursor-pointer rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group"
            title="Nivel Difícil: Almirante — Matriz Bayesiana Probabilística"
            aria-label="Dificultad Difícil: Almirante"
          >
            {selectedDifficulty === 'HARD' ? (
              <>
                <div className="absolute top-[22%] left-[11%] w-[20%] h-[56%] rounded-xs bg-amber-400/45 border border-amber-200 shadow-[0_0_16px_#f59e0b] animate-pulse" />
                <div className="absolute inset-0 rounded-md border-2 border-amber-400/90 shadow-[0_0_18px_rgba(245,158,11,0.6)] pointer-events-none" />
              </>
            ) : (
              <div className="absolute inset-0 rounded-md border border-transparent group-hover:border-amber-400/50 group-hover:bg-amber-500/10 transition-all" />
            )}
          </button>

          {/* =========================================================================
              ZONE 4: COMBAT ACTIONS (Exact calibrated inner plates)
              ========================================================================= */}
          {/* Primary Action Button: INICIAR BATALLA NAVAL (vs IA) */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onStartGame(selectedDifficulty);
            }}
            className="absolute top-[73.1%] left-[33.7%] w-[32.6%] h-[5.4%] z-20 cursor-pointer rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 group"
            title={`Iniciar Batalla Naval contra la IA (${difficultyTactics[selectedDifficulty].rank})`}
            aria-label="Iniciar Batalla Naval contra IA"
          >
            <div className="absolute inset-0 rounded-lg border border-cyan-400/40 group-hover:border-cyan-300 group-hover:bg-cyan-500/20 group-hover:shadow-[0_0_24px_rgba(6,182,212,0.7)] group-active:scale-[0.99] transition-all" />
          </button>

          {/* Secondary Action Button: COMBATE MULTIJUGADOR EN RED (TIEMPO REAL) [P2P] */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenMultiplayer();
            }}
            className="absolute top-[80.1%] left-[33.7%] w-[32.6%] h-[5.4%] z-20 cursor-pointer rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 group"
            title="Combate Multijugador en Red (Tiempo Real P2P)"
            aria-label="Combate Multijugador en Red P2P"
          >
            <div className="absolute inset-0 rounded-lg border border-emerald-500/40 group-hover:border-emerald-300 group-hover:bg-emerald-500/20 group-hover:shadow-[0_0_24px_rgba(16,185,129,0.7)] group-active:scale-[0.99] transition-all" />
          </button>

          {/* =========================================================================
              ZONE 5: BOTTOM BAR (Exact calibrated positions for Reglas, Estadísticas, Ajustes, Volumen)
              ========================================================================= */}
          {/* 1. REGLAS */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenInstructions();
            }}
            className="absolute top-[89.5%] left-[26.0%] w-[11.2%] h-[4.4%] z-20 cursor-pointer rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 group"
            title="Abrir Reglamento Naval y Tácticas de Flota"
            aria-label="Reglas del Juego"
          >
            <div className="absolute inset-0 rounded-md border border-transparent group-hover:border-red-400/70 group-hover:bg-red-500/15 group-hover:shadow-[0_0_12px_rgba(239,68,68,0.5)] transition-all" />
          </button>

          {/* 2. ESTADÍSTICAS */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenStats();
            }}
            className="absolute top-[89.5%] left-[38.2%] w-[11.2%] h-[4.4%] z-20 cursor-pointer rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group"
            title="Abrir Registro Histórico de Combate y Efectividad"
            aria-label="Estadísticas de Combate"
          >
            <div className="absolute inset-0 rounded-md border border-transparent group-hover:border-amber-400/70 group-hover:bg-amber-500/15 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.5)] transition-all" />
          </button>

          {/* 3. AJUSTES */}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              onOpenSettings();
            }}
            className="absolute top-[89.5%] left-[50.4%] w-[11.2%] h-[4.4%] z-20 cursor-pointer rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 group"
            title="Ajustes de Audio, Radar Táctico y Coordenadas"
            aria-label="Ajustes Tácticos"
          >
            <div className="absolute inset-0 rounded-md border border-transparent group-hover:border-cyan-300/70 group-hover:bg-cyan-500/15 group-hover:shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all" />
          </button>

          {/* 4. VOLUMEN (Mute toggle + Hover Volume Slider on CRT) */}
          <div className="absolute top-[89.5%] left-[62.6%] w-[11.4%] h-[4.4%] z-20 group">
            {/* Floating Volume Slider Popover on Hover */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-all duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 rounded-xl bg-slate-950/95 border border-emerald-500/60 shadow-[0_0_20px_rgba(0,0,0,0.9)] flex items-center gap-2 z-40 whitespace-nowrap"
            >
              <button
                type="button"
                onClick={handleVolumeToggle}
                className="text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                title={soundEnabled ? 'Silenciar' : 'Activar sonido'}
              >
                {soundEnabled && sfxVolume > 0 ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-red-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={soundEnabled ? sfxVolume : 0}
                onChange={(e) => onUpdateVolume?.(parseFloat(e.target.value))}
                aria-label="Nivel de volumen"
                className="w-20 sm:w-24 h-1.5 accent-emerald-400 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-mono font-bold text-emerald-300 w-7 text-right">
                {Math.round((soundEnabled ? sfxVolume : 0) * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={handleVolumeToggle}
              className="w-full h-full cursor-pointer rounded-md transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 flex items-center justify-center relative"
              title={
                soundEnabled
                  ? `Sonido Activo (${Math.round(sfxVolume * 100)}%) — Clic para silenciar o desliza arriba para ajustar`
                  : 'Sonido Silenciado — Clic para activar'
              }
              aria-label="Control de Volumen"
            >
              {(!soundEnabled || sfxVolume === 0) && (
                <div className="absolute inset-x-3 h-0.5 bg-red-500 rotate-[-12deg] shadow-[0_0_8px_#ef4444] z-30" />
              )}
              <div
                className={`absolute inset-0 rounded-md transition-all ${
                  !soundEnabled || sfxVolume === 0
                    ? 'bg-red-950/40 border border-red-500/60 shadow-[0_0_10px_rgba(239,68,68,0.4)]'
                    : 'border border-transparent group-hover:border-emerald-400/70 group-hover:bg-emerald-500/15 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Slim Telemetry, Volume Slider & Doctrine Strip below CRT */}
        <div className="w-full mt-2 px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-lg backdrop-blur flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: difficultyTactics[selectedDifficulty].color }}
            />
            <span className="font-bold text-white uppercase tracking-wider">
              IA {difficultyTactics[selectedDifficulty].label} ({difficultyTactics[selectedDifficulty].rank}):
            </span>
            <span className="text-slate-300 hidden lg:inline">
              {difficultyTactics[selectedDifficulty].desc}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] text-slate-300 font-mono tabular-nums">
            {/* Dedicated Classroom Tournament Button in Main Menu */}
            {onOpenTournament && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onOpenTournament();
                }}
                className="py-1.5 px-3.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-400/70 hover:border-emerald-300 text-emerald-200 font-sans font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)] whitespace-nowrap shrink-0"
                title="Abrir Modo Torneo de Aula (Eliminatoria con Código)"
              >
                <Swords className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Torneo de Aula</span>
              </button>
            )}

            {/* Dedicated Achievements Button in Main Menu */}
            {onOpenAchievements && (
              <button
                type="button"
                onClick={() => {
                  sound.playClick();
                  onOpenAchievements();
                }}
                className="py-1.5 px-3 rounded-lg bg-amber-950/70 hover:bg-amber-900/80 border border-amber-500/60 hover:border-amber-400 text-amber-300 font-sans font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-sm whitespace-nowrap shrink-0"
                title="Abrir Condecoraciones y Logros Navales"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Logros</span>
                <span className="font-mono text-[11px] text-amber-200 tabular-nums">
                  {achievements.filter((a) => a.unlocked).length}/{achievements.length || 17}
                </span>
              </button>
            )}

            {/* Direct Volume Slider Control */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800">
              <button
                type="button"
                onClick={handleVolumeToggle}
                className="text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
                title={soundEnabled ? 'Silenciar sonido' : 'Activar sonido'}
              >
                {soundEnabled && sfxVolume > 0 ? (
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={soundEnabled ? sfxVolume : 0}
                onChange={(e) => onUpdateVolume?.(parseFloat(e.target.value))}
                aria-label="Control deslizante de volumen"
                className="w-20 sm:w-24 h-1.5 accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] font-bold text-cyan-400 w-7 text-right">
                {Math.round((soundEnabled ? sfxVolume : 0) * 100)}%
              </span>
            </div>

            <div>
              <span className="text-slate-500">Batallas:</span>{' '}
              <strong className="text-slate-200">{statistics.gamesPlayed}</strong>
            </div>
            <div>
              <span className="text-slate-500">Victorias:</span>{' '}
              <strong className="text-cyan-400">{statistics.wins}</strong>
            </div>
            <div>
              <span className="text-slate-500">Efectividad:</span>{' '}
              <strong className="text-emerald-400">
                {statistics.gamesPlayed > 0
                  ? Math.round((statistics.wins / statistics.gamesPlayed) * 100)
                  : 0}
                %
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Racha:</span>{' '}
              <strong className="text-amber-400">{statistics.currentStreak}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
