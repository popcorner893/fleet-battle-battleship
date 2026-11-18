import React from 'react';
import {
  Coordinate,
  Difficulty,
  MoveDirection,
  PlacedShip,
  SalvoOrientation,
  ShotOutcome,
  ShotRecord,
  SonarSectorOverlay,
  TacticalAbilityType,
  TurnOwner,
} from '../types';
import { BoardGrid } from './BoardGrid';
import { FleetStatusPanel } from './FleetStatusPanel';
import { TacticalAbilitiesBar } from './TacticalAbilitiesBar';
import {
  CommanderSidebarCard,
  computeEnemyMood,
  computePlayerMood,
  getOpponentCharacterByDifficulty,
} from './CommanderAvatar';
import { calculateAccuracy } from '../engine/combat';
import { formatCoordinate } from '../utils/coordinates';
import {
  Crosshair,
  Volume2,
  VolumeX,
  BookOpen,
  Flag,
  Flame,
  Waves,
  Clock,
  Radio,
  Activity,
  Zap,
} from 'lucide-react';

interface CombatViewProps {
  playerFleet: PlacedShip[];
  aiFleet: PlacedShip[];
  playerShots: Coordinate[];
  playerHits: Coordinate[];
  aiShots: Coordinate[];
  aiHits: Coordinate[];
  currentTurn: TurnOwner;
  isProcessingTurn: boolean;
  lastPlayerShot: ShotOutcome | null;
  lastAiShot: ShotOutcome | null;
  combatLogs: ShotRecord[];
  elapsedSeconds: number;
  difficulty: Difficulty;
  soundEnabled: boolean;
  sfxVolume?: number;
  onToggleSound: () => void;
  onUpdateVolume?: (vol: number) => void;
  onFireAtEnemy: (coord: Coordinate) => void;
  onOpenInstructions: () => void;
  onSurrender: () => void;
  showCoordinates: boolean;
  radarPulse: boolean;
  isScreenShaking?: boolean;
  activeAbility?: TacticalAbilityType | null;
  usedAbility?: TacticalAbilityType | null;
  sonarNotice?: string | null;
  onSelectAbility?: (ability: TacticalAbilityType | null) => void;
  // AP & Command Ship props
  currentAp?: number;
  maxAp?: number;
  commandShipId?: string | null;
  onSelectCommandShip?: (shipId: string) => void;
  onMoveCommandShip?: (dir: MoveDirection) => void;
  onRepairCommandShip?: () => void;
  onActivateSpecialImmediate?: () => void;
  onEndTurn?: () => void;
  salvoOrientation?: SalvoOrientation;
  onToggleSalvoOrientation?: () => void;
  sonarOverlay?: SonarSectorOverlay | null;
  maneuverCooldown?: number;
}

export const CombatView: React.FC<CombatViewProps> = ({
  playerFleet,
  aiFleet,
  playerShots,
  playerHits,
  aiShots,
  aiHits,
  currentTurn,
  isProcessingTurn,
  lastPlayerShot,
  lastAiShot,
  combatLogs,
  elapsedSeconds,
  difficulty,
  soundEnabled,
  sfxVolume = 0.5,
  onToggleSound,
  onUpdateVolume,
  onFireAtEnemy,
  onOpenInstructions,
  onSurrender,
  showCoordinates,
  radarPulse,
  isScreenShaking = false,
  activeAbility = 'attack',
  usedAbility = null,
  sonarNotice = null,
  onSelectAbility,
  currentAp = 5,
  maxAp = 5,
  commandShipId = null,
  onSelectCommandShip,
  onMoveCommandShip,
  onRepairCommandShip,
  onActivateSpecialImmediate,
  onEndTurn,
  salvoOrientation = 'horizontal',
  onToggleSalvoOrientation,
  sonarOverlay = null,
  maneuverCooldown = 0,
}) => {
  const accuracy = calculateAccuracy(playerHits.length, playerShots.length);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const difficultyLabels: Record<Difficulty, string> = {
    EASY: 'Fácil (Recluta)',
    MEDIUM: 'Media (Comandante)',
    HARD: 'Difícil (Almirante)',
  };

  const isPlayerTurn = currentTurn === 'player' && !isProcessingTurn;

  const playerMood = computePlayerMood({
    lastPlayerShot,
    lastAiShot,
    playerFleet,
    isScreenShaking,
  });

  const enemyMood = computeEnemyMood({
    lastPlayerShot,
    lastAiShot,
    aiFleet,
  });

  const enemyCharacterId = getOpponentCharacterByDifficulty(difficulty);

  const commandShip =
    playerFleet.find((s) => s.id === commandShipId && !s.isSunk) ||
    playerFleet.find((s) => !s.isSunk) ||
    null;

  return (
    <div
      className={`w-full max-w-[1720px] mx-auto px-2 sm:px-4 py-2 transition-transform ${
        isScreenShaking ? 'animate-screen-shake' : ''
      }`}
    >
      {/* Slim Unified Top Operations & Turn Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/90">
        {/* Left: Title & Difficulty */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
            <Crosshair className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Centro de Combate Balístico
              </h2>
              <span className="text-[10px] font-mono font-medium text-cyan-400 bg-cyan-950/80 border border-cyan-800 px-1.5 py-0.5 rounded">
                IA: {difficultyLabels[difficulty]}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono tabular-nums">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
              <span>·</span>
              <span>
                Precisión: <strong className="text-slate-200">{accuracy}%</strong>
              </span>
              <span>·</span>
              <span>
                Aciertos: <strong className="text-emerald-400">{playerHits.length}</strong>/17
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Turn & AP Status Indicator */}
        <div
          className={`px-3 py-1 rounded-xl border flex items-center gap-2 transition-colors shadow-md ${
            isPlayerTurn
              ? 'bg-cyan-950/75 border-cyan-500/60 text-cyan-200'
              : 'bg-amber-950/75 border-amber-500/60 text-amber-200'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              isPlayerTurn ? 'bg-cyan-400 animate-pulse' : 'bg-amber-400 animate-ping'
            }`}
          />
          <div className="text-xs flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider">
              {isPlayerTurn ? 'Tu Turno' : 'Turno IA'}
            </span>
            {isPlayerTurn && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/90 border border-cyan-400/50 text-[11px] font-mono font-extrabold text-cyan-300">
                <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                {currentAp}/{maxAp} AP
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800">
            <button
              type="button"
              onClick={onToggleSound}
              className="text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
              title={soundEnabled ? 'Silenciar Sonido' : 'Activar Sonido'}
            >
              {soundEnabled && sfxVolume > 0 ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={soundEnabled ? sfxVolume : 0}
              onChange={(e) => onUpdateVolume?.(parseFloat(e.target.value))}
              aria-label="Volumen"
              className="w-14 sm:w-20 h-1.5 accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={onOpenInstructions}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Instrucciones del Juego"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onSurrender}
            className="py-1.5 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Rendirse / Retirada Táctica"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Rendirse</span>
          </button>
        </div>
      </div>

      {/* Sonar / Tactical alert notice banner if active */}
      {sonarNotice && (
        <div className="mb-2 py-1.5 px-3 rounded-lg bg-cyan-950/90 border border-cyan-500 text-xs text-cyan-200 flex items-center gap-2 shadow-md animate-fade-in">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
          <span>{sonarNotice}</span>
        </div>
      )}

      {/* ===========================================================================
          3-COLUMN SINGLE-SCREEN TACTICAL LAYOUT (Left Sidebar | Dual Boards | Right Sidebar)
          =========================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-[255px_1fr_235px] xl:grid-cols-[275px_1fr_245px] gap-3 items-start">
        {/* LEFT LATERAL SIDEBAR: Player Commander + Tactical Support + Player Fleet */}
        <div className="flex flex-col gap-2.5 order-2 lg:order-1">
          <CommanderSidebarCard
            character="navy_seal"
            mood={playerMood}
            fleet={playerFleet}
            isActiveTurn={isPlayerTurn}
            isEnemy={false}
          />

          {onSelectAbility && (
            <TacticalAbilitiesBar
              playerFleet={playerFleet}
              aiShots={aiShots}
              maneuverCooldown={maneuverCooldown}
              commandShipId={commandShip?.id || null}
              onSelectCommandShip={onSelectCommandShip}
              currentAp={currentAp}
              maxAp={maxAp}
              activeTargeting={activeAbility}
              onSelectAbility={onSelectAbility}
              onMoveCommandShip={onMoveCommandShip}
              onRepairCommandShip={onRepairCommandShip}
              onActivateSpecialImmediate={onActivateSpecialImmediate}
              onEndTurn={onEndTurn}
              salvoOrientation={salvoOrientation}
              onToggleSalvoOrientation={onToggleSalvoOrientation}
              hitsCount={playerHits.length}
              hitsRequired={2}
              usedAbility={usedAbility}
              isPlayerTurn={isPlayerTurn}
              disabled={!isPlayerTurn}
              compact={true}
            />
          )}
        </div>

        {/* CENTER ARENA: Dual 10x10 Radar Boards + Compact Communications Strip */}
        <div className="flex flex-col gap-2.5 order-1 lg:order-2 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {/* Radar 1: Enemy Radar (Attacking) */}
            <div className="w-full bg-slate-900/75 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-xl backdrop-blur flex flex-col items-center">
              <BoardGrid
                title="Radar Enemigo"
                subtitle={
                  activeAbility === 'double_shot'
                    ? '⚡ Disparo Doble (2× →)'
                    : activeAbility === 'special'
                    ? `🎯 Especial: ${commandShip?.name || 'Buque'}`
                    : isPlayerTurn
                    ? '🎯 Selecciona objetivo'
                    : 'Turno enemigo...'
                }
                ships={aiFleet}
                shots={playerShots}
                hits={playerHits}
                lastTarget={lastPlayerShot?.coordinate}
                lastShot={lastPlayerShot}
                interactive={isPlayerTurn}
                onCellClick={onFireAtEnemy}
                hideUndamagedShips={true}
                showCoordinates={showCoordinates}
                radarPulse={radarPulse}
                disabled={!isPlayerTurn}
                compact={true}
                sonarOverlay={sonarOverlay}
              />

              <div className="w-full mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-400">Último:</span>
                {lastPlayerShot ? (
                  <span
                    className={`font-semibold truncate ${
                      lastPlayerShot.result === 'sunk'
                        ? 'text-rose-400 font-bold'
                        : lastPlayerShot.result === 'hit'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatCoordinate(lastPlayerShot.coordinate)} ·{' '}
                    {lastPlayerShot.result === 'sunk'
                      ? `Hundido (${lastPlayerShot.shipName})`
                      : lastPlayerShot.result === 'hit'
                      ? 'Impacto'
                      : 'Agua'}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">—</span>
                )}
              </div>
            </div>

            {/* Radar 2: Player Fleet (Defense & Contextual Maneuver D-Pad) */}
            <div className="w-full bg-slate-900/75 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-xl backdrop-blur flex flex-col items-center">
              <BoardGrid
                title="Mi Flota"
                subtitle="Defensa aliada"
                ships={playerFleet}
                shots={aiShots}
                hits={aiHits}
                lastTarget={lastAiShot?.coordinate}
                lastShot={lastAiShot}
                interactive={false}
                hideUndamagedShips={false}
                showCoordinates={showCoordinates}
                radarPulse={false}
                compact={true}
                commandShipId={commandShip?.id || null}
                onSelectCommandShip={onSelectCommandShip}
                onMoveCommandShip={onMoveCommandShip}
                currentAp={currentAp}
                maneuverCooldown={maneuverCooldown}
                isPlayerTurn={isPlayerTurn}
              />

              <div className="w-full mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-400">IA:</span>
                {lastAiShot ? (
                  <span
                    className={`font-semibold truncate ${
                      lastAiShot.result === 'sunk'
                        ? 'text-rose-400 font-bold'
                        : lastAiShot.result === 'hit'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatCoordinate(lastAiShot.coordinate)} ·{' '}
                    {lastAiShot.result === 'sunk'
                      ? `Hundido (${lastAiShot.shipName})`
                      : lastAiShot.result === 'hit'
                      ? 'Impacto'
                      : 'Agua'}
                  </span>
                ) : (
                  <span className="text-slate-500 italic">—</span>
                )}
              </div>
            </div>
          </div>

          {/* Slim Single-Row Combat Activity Feed */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2.5 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 shrink-0 pr-2 border-r border-slate-800">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bitácora</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {combatLogs.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic">
                  Esperando primeros informes de fuego balístico...
                </span>
              ) : (
                combatLogs.slice(0, 6).map((log) => {
                  const isPlayer = log.shooter === 'player';
                  const isHit = log.result === 'hit';
                  const isSunk = log.result === 'sunk';

                  return (
                    <div
                      key={log.id}
                      className={`text-[11px] px-2 py-0.5 rounded border flex items-center gap-1 font-mono whitespace-nowrap shrink-0 ${
                        isSunk
                          ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                          : isHit
                          ? 'bg-amber-950/50 border-amber-800 text-amber-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400'
                      }`}
                    >
                      {isSunk ? (
                        <Flame className="w-3 h-3 text-rose-400" />
                      ) : isHit ? (
                        <Flame className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Waves className="w-3 h-3 text-slate-500" />
                      )}
                      <span>
                        <strong>{isPlayer ? 'TÚ' : 'IA'}</strong>
                        {log.coordinate.row >= 0 ? ` ➔ ${formatCoordinate(log.coordinate)}:` : ':'}
                      </span>
                      <span>
                        {log.shipName
                          ? log.shipName
                          : isSunk
                          ? '¡HUNDIDO!'
                          : isHit
                          ? 'Impacto'
                          : 'Agua'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT LATERAL SIDEBAR: Enemy Commander + Enemy Fleet Status */}
        <div className="flex flex-col gap-2.5 order-3">
          <CommanderSidebarCard
            character={enemyCharacterId}
            mood={enemyMood}
            fleet={aiFleet}
            isActiveTurn={!isPlayerTurn}
            isEnemy={true}
          />

          <FleetStatusPanel
            title="Flota Enemiga Detectada"
            ships={aiFleet}
            isEnemy={true}
            compact={true}
          />
        </div>
      </div>
    </div>
  );
};

