import React from 'react';
import { Difficulty, PlacedShip, TurnOwner } from '../types';
import { calculateAccuracy } from '../engine/combat';
import {
  COMMANDER_PROFILES,
  CommanderAvatar,
  getOpponentCharacterByDifficulty,
} from './CommanderAvatar';
import {
  Trophy,
  Skull,
  RotateCcw,
  Play,
  Home,
  Target,
  ShieldCheck,
  Film,
} from 'lucide-react';

interface ResultsModalProps {
  winner: TurnOwner | null;
  playerFleet: PlacedShip[];
  aiFleet: PlacedShip[];
  playerShotsCount: number;
  playerHitsCount: number;
  aiShotsCount: number;
  elapsedSeconds: number;
  difficulty: Difficulty;
  onRematchSameFleet: () => void;
  onNewPlacement: () => void;
  onReturnToMenu: () => void;
  onReplayCinematic?: () => void;
}

export const ResultsModal: React.FC<ResultsModalProps> = ({
  winner,
  playerFleet,
  aiFleet,
  playerShotsCount,
  playerHitsCount,
  aiShotsCount,
  elapsedSeconds,
  difficulty,
  onRematchSameFleet,
  onNewPlacement,
  onReturnToMenu,
  onReplayCinematic,
}) => {
  const isVictory = winner === 'player';
  const accuracy = calculateAccuracy(playerHitsCount, playerShotsCount);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}m ${secs}s`;
  };

  const difficultyLabels: Record<Difficulty, string> = {
    EASY: 'Fácil (Recluta)',
    MEDIUM: 'Media (Comandante)',
    HARD: 'Difícil (Almirante)',
  };

  const playerShipsAlive = playerFleet.filter((s) => !s.isSunk).length;
  const enemyShipsAlive = aiFleet.filter((s) => !s.isSunk).length;

  const enemyCharId = getOpponentCharacterByDifficulty(difficulty);
  const enemyProfile = COMMANDER_PROFILES[enemyCharId];
  const playerFinalMood = isVictory ? 'victory' : 'under_attack';
  const enemyFinalMood = isVictory ? 'under_attack' : 'victory';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Result Header Banner */}
        <div
          className={`p-5 text-center border-b ${
            isVictory
              ? 'bg-emerald-950/40 border-emerald-800/60'
              : 'bg-rose-950/40 border-rose-800/60'
          }`}
        >
          {/* Commander Outcome Portraits */}
          <div className="flex items-center justify-center gap-5 mb-3">
            <div className="flex flex-col items-center">
              <CommanderAvatar character="navy_seal" mood={playerFinalMood} size="lg" />
              <span className="mt-1 text-[11px] font-bold text-white">Navy SEAL</span>
              <span
                className={`text-[10px] font-mono ${
                  isVictory ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {COMMANDER_PROFILES.navy_seal.moodLabels[playerFinalMood]}
              </span>
            </div>

            <div
              className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border shadow-lg ${
                isVictory
                  ? 'bg-emerald-900/50 border-emerald-400 text-emerald-400'
                  : 'bg-rose-900/50 border-rose-400 text-rose-400'
              }`}
            >
              {isVictory ? <Trophy className="w-5 h-5" /> : <Skull className="w-5 h-5" />}
            </div>

            <div className="flex flex-col items-center">
              <CommanderAvatar character={enemyCharId} mood={enemyFinalMood} size="lg" />
              <span className="mt-1 text-[11px] font-bold text-white">{enemyProfile.name}</span>
              <span
                className={`text-[10px] font-mono ${
                  !isVictory ? 'text-amber-400' : 'text-rose-400'
                }`}
              >
                {enemyProfile.moodLabels[enemyFinalMood]}
              </span>
            </div>
          </div>

          <h2
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 ${
              isVictory ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isVictory ? '¡VICTORIA NAVAL!' : 'DERROTA OPERACIONAL'}
          </h2>

          <p className="text-xs sm:text-sm text-slate-300">
            {isVictory
              ? 'Has destruido todas las unidades navales enemigas con honor.'
              : 'Tu flota ha sido totalmente hundida por las fuerzas enemigas.'}
          </p>
        </div>

        {/* Operational Debriefing Stats */}
        <div className="p-6 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1 border-b border-slate-800 flex items-center justify-between">
            <span>Informe Táctico de Misión</span>
            <span className="font-mono text-cyan-400">{difficultyLabels[difficulty]}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 mb-0.5">Disparos</div>
              <div className="text-lg font-bold font-mono text-slate-100">
                {playerShotsCount}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 mb-0.5">Impactos</div>
              <div className="text-lg font-bold font-mono text-amber-400">
                {playerHitsCount}
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 mb-0.5">Precisión</div>
              <div className="text-lg font-bold font-mono text-cyan-400">
                {accuracy}%
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-center">
              <div className="text-[11px] text-slate-400 mb-0.5">Tiempo</div>
              <div className="text-lg font-bold font-mono text-slate-200">
                {formatTimer(elapsedSeconds)}
              </div>
            </div>
          </div>

          {/* Fleet attrition status */}
          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Tus barcos a flote:</span>
            </div>
            <span className="font-mono font-bold text-slate-200">
              {playerShipsAlive} / 5
            </span>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-rose-400" />
              <span>Barcos enemigos restantes:</span>
            </div>
            <span className="font-mono font-bold text-slate-200">
              {enemyShipsAlive} / 5
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 pt-0 space-y-2.5">
          <button
            type="button"
            onClick={onRematchSameFleet}
            className="w-full py-3 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Jugar de Nuevo (Misma Posición)</span>
          </button>

          {onReplayCinematic && (
            <button
              type="button"
              onClick={onReplayCinematic}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Repetir Animación Final de Combate</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onNewPlacement}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Nuevo Despliegue</span>
            </button>

            <button
              type="button"
              onClick={onReturnToMenu}
              className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Menú Principal</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
