import React from 'react';
import { PlacedShip } from '../types';
import { calculateAccuracy } from '../engine/combat';
import { COMMANDER_PROFILES, CommanderAvatar } from './CommanderAvatar';
import { Trophy, Skull, Home, Eye, Film, Activity, Target, ShieldCheck } from 'lucide-react';

interface MultiplayerResultsModalProps {
  isVictory: boolean;
  playerName: string;
  opponentName: string;
  playerFleet: PlacedShip[];
  opponentSunkShipsCount: number;
  playerShotsCount: number;
  playerHitsCount: number;
  totalTurns: number;
  onReturnToMenu: () => void;
  onInspectBoard: () => void;
  onReplayCinematic?: () => void;
  isTournamentMatch?: boolean;
  onReturnToTournament?: () => void;
}

export const MultiplayerResultsModal: React.FC<MultiplayerResultsModalProps> = ({
  isVictory,
  playerName,
  opponentName,
  playerFleet,
  opponentSunkShipsCount,
  playerShotsCount,
  playerHitsCount,
  totalTurns,
  onReturnToMenu,
  onInspectBoard,
  onReplayCinematic,
  isTournamentMatch = false,
  onReturnToTournament,
}) => {
  const accuracy = calculateAccuracy(playerHitsCount, playerShotsCount);
  const playerAfloatCount = playerFleet.filter((s) => !s.isSunk).length;

  const playerFinalMood = isVictory ? 'victory' : 'under_attack';
  const enemyFinalMood = isVictory ? 'under_attack' : 'victory';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
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
          <div className="flex items-center justify-center gap-6 mb-3">
            <div className="flex flex-col items-center">
              <CommanderAvatar character="navy_seal" mood={playerFinalMood} size="lg" />
              <span className="mt-1 text-xs font-bold text-white">{playerName || 'Tú'}</span>
              <span
                className={`text-[10px] font-mono ${
                  isVictory ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {COMMANDER_PROFILES.navy_seal.moodLabels[playerFinalMood]}
              </span>
            </div>

            <div
              className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border shadow-lg ${
                isVictory
                  ? 'bg-emerald-900/50 border-emerald-400 text-emerald-400'
                  : 'bg-rose-900/50 border-rose-400 text-rose-400'
              }`}
            >
              {isVictory ? <Trophy className="w-6 h-6" /> : <Skull className="w-6 h-6" />}
            </div>

            <div className="flex flex-col items-center">
              <CommanderAvatar character="battleship_captain" mood={enemyFinalMood} size="lg" />
              <span className="mt-1 text-xs font-bold text-slate-300">{opponentName || 'Rival'}</span>
              <span
                className={`text-[10px] font-mono ${
                  isVictory ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {COMMANDER_PROFILES.battleship_captain.moodLabels[enemyFinalMood]}
              </span>
            </div>
          </div>

          <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
            Enfrentamiento Multijugador P2P Concluido
          </span>
          <h2
            className={`text-2xl font-black mt-0.5 tracking-tight ${
              isVictory ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isVictory ? '¡VICTORIA NAVAL!' : '¡DERROTA TÁCTICA!'}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
            {isVictory
              ? `Has destruido toda la flota enemiga de ${opponentName}. Las aguas territoriales han sido aseguradas.`
              : `La flota de ${opponentName} ha superado nuestras defensas navales. Todos los navíos han sido neutralizados.`}
          </p>
        </div>

        {/* Combat Stats Grid */}
        <div className="p-4 grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-800 text-cyan-400 flex items-center justify-center shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400">Precisión Balística</div>
              <div className="text-sm font-bold text-white">{accuracy}%</div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400">Tus Barcos a Flote</div>
              <div className="text-sm font-bold text-white">{playerAfloatCount} / 5</div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-950/50 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400">Impactos / Disparos</div>
              <div className="text-sm font-bold text-white">
                {playerHitsCount} / {playerShotsCount}
              </div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950/50 border border-purple-800 text-purple-400 flex items-center justify-center shrink-0">
              <Skull className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-400">Hundidos al Rival</div>
              <div className="text-sm font-bold text-white">{opponentSunkShipsCount} / 5</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 pt-1 bg-slate-950/40 border-t border-slate-800/80 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onInspectBoard}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Ver Tableros</span>
            </button>

            {onReplayCinematic && (
              <button
                type="button"
                onClick={onReplayCinematic}
                className="py-2.5 px-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-800/80 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Film className="w-4 h-4 text-cyan-400" />
                <span>Cinemática</span>
              </button>
            )}
          </div>

          {isTournamentMatch && onReturnToTournament && (
            <button
              type="button"
              onClick={onReturnToTournament}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-amber-500/25"
            >
              <Trophy className="w-4 h-4" />
              <span>Volver a las Llaves del Torneo</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnToMenu}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              isTournamentMatch && onReturnToTournament
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Volver al Puesto de Mando</span>
          </button>
        </div>
      </div>
    </div>
  );
};
