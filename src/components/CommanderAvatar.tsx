import React from 'react';
import { Difficulty, PlacedShip, ShotOutcome, TurnOwner } from '../types';

export type AvatarCharacterId =
  | 'navy_seal'
  | 'pirate'
  | 'battleship_captain'
  | 'iron_admiral';

export type AvatarMood = 'calm' | 'victory' | 'under_attack';

interface CropRegion {
  sheet: string;
  sheetW: number;
  sheetH: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CommanderProfile {
  id: AvatarCharacterId;
  name: string;
  rankTitle: string;
  accentColor: string;
  moodLabels: Record<AvatarMood, string>;
  quotes: Record<AvatarMood, string>;
  crops: Record<AvatarMood, CropRegion>;
}

const SHEET_1 = '/assets/aistudio/image_be858906.png'; // 1024 x 622 (Navy SEAL & Pirata)
const SHEET_2 = '/assets/aistudio/image_da60df2f.png'; // 1024 x 572 (Almirante de Hierro & Capitán del Acorazado)

export const COMMANDER_PROFILES: Record<AvatarCharacterId, CommanderProfile> = {
  navy_seal: {
    id: 'navy_seal',
    name: 'Navy SEAL',
    rankTitle: 'Comandante Jugador',
    accentColor: '#38bdf8',
    moodLabels: {
      calm: 'En Calma',
      victory: '¡Victoria!',
      under_attack: '¡Bajo Ataque!',
    },
    quotes: {
      calm: 'Canal táctico abierto. Esperando coordenadas de disparo.',
      victory: '¡Impacto directo confirmado! ¡Mantengan la presión de fuego!',
      under_attack: '¡Nos han alcanzado! ¡Control de averías en el casco!',
    },
    crops: {
      calm: { sheet: SHEET_1, sheetW: 1024, sheetH: 622, x: 54, y: 38, w: 258, h: 258 },
      victory: { sheet: SHEET_1, sheetW: 1024, sheetH: 622, x: 378, y: 38, w: 258, h: 258 },
      under_attack: { sheet: SHEET_1, sheetW: 1024, sheetH: 622, x: 716, y: 38, w: 258, h: 258 },
    },
  },
  pirate: {
    id: 'pirate',
    name: 'Pirata Corsario',
    rankTitle: 'Fácil · Recluta',
    accentColor: '#f97316',
    moodLabels: {
      calm: 'Neutral / Confiado',
      victory: 'Euforia / Risa Malvada',
      under_attack: 'Iracundo / Desesperado',
    },
    quotes: {
      calm: '¡Mis cañones están listos, marinero de agua dulce!',
      victory: '¡Ja, ja, ja! ¡Directo a tu línea de flotación!',
      under_attack: '¡Maldición! ¡Están destrozando mi cubierta!',
    },
    crops: {
      calm: { sheet: SHEET_1, sheetW: 1024, sheetH: 622, x: 58, y: 342, w: 246, h: 246 },
      victory: { sheet: SHEET_1, sheetW: 1024, sheetH: 622, x: 376, y: 342, w: 258, h: 246 },
      under_attack: { sheet: SHEET_1, sheetW: 1024, sheetH: 622, x: 720, y: 342, w: 248, h: 246 },
    },
  },
  battleship_captain: {
    id: 'battleship_captain',
    name: 'Capitán del Acorazado',
    rankTitle: 'Media · Comandante',
    accentColor: '#06b6d4',
    moodLabels: {
      calm: 'En Calma',
      victory: '¡Éxito Táctico!',
      under_attack: '¡Bajo Ataque!',
    },
    quotes: {
      calm: 'Mantengan el rumbo firme y calibren las baterías.',
      victory: '¡Batería principal en el blanco! ¡Hundan esa flota!',
      under_attack: '¡Fuego en cubierta! ¡Sellen los mamparos estancos!',
    },
    crops: {
      calm: { sheet: SHEET_2, sheetW: 1024, sheetH: 572, x: 60, y: 318, w: 246, h: 246 },
      victory: { sheet: SHEET_2, sheetW: 1024, sheetH: 572, x: 380, y: 318, w: 248, h: 246 },
      under_attack: { sheet: SHEET_2, sheetW: 1024, sheetH: 572, x: 716, y: 318, w: 250, h: 246 },
    },
  },
  iron_admiral: {
    id: 'iron_admiral',
    name: 'Almirante de Hierro',
    rankTitle: 'Difícil · Almirante',
    accentColor: '#f59e0b',
    moodLabels: {
      calm: 'En Calma',
      victory: '¡Éxito Calculado!',
      under_attack: '¡Bajo Ataque!',
    },
    quotes: {
      calm: 'Matriz probabilística activa. Tus vectores están calculados.',
      victory: 'Impacto confirmado. Mi cálculo balístico no tiene margen de error.',
      under_attack: '¡Alerta de sobrecarga! ¡Daños detectados en el blindaje!',
    },
    crops: {
      calm: { sheet: SHEET_2, sheetW: 1024, sheetH: 572, x: 62, y: 36, w: 246, h: 246 },
      victory: { sheet: SHEET_2, sheetW: 1024, sheetH: 572, x: 380, y: 36, w: 250, h: 246 },
      under_attack: { sheet: SHEET_2, sheetW: 1024, sheetH: 572, x: 718, y: 36, w: 250, h: 246 },
    },
  },
};

export function getOpponentCharacterByDifficulty(difficulty: Difficulty): AvatarCharacterId {
  switch (difficulty) {
    case 'EASY':
      return 'pirate';
    case 'MEDIUM':
      return 'battleship_captain';
    case 'HARD':
      return 'iron_admiral';
  }
}

export function computePlayerMood(params: {
  lastPlayerShot?: ShotOutcome | null;
  lastAiShot?: ShotOutcome | null;
  playerFleet?: PlacedShip[];
  winner?: TurnOwner | null;
  isScreenShaking?: boolean;
}): AvatarMood {
  const { lastPlayerShot, lastAiShot, playerFleet = [], winner, isScreenShaking } = params;

  if (winner === 'player') return 'victory';
  if (winner === 'ai') return 'under_attack';
  if (isScreenShaking) return 'under_attack';

  // If the AI just hit or sunk a player ship
  if (lastAiShot && (lastAiShot.result === 'hit' || lastAiShot.result === 'sunk')) {
    return 'under_attack';
  }

  // If the player just hit or sunk an enemy ship
  if (lastPlayerShot && (lastPlayerShot.result === 'hit' || lastPlayerShot.result === 'sunk')) {
    return 'victory';
  }

  // If player has lost 3 or more ships
  const sunkCount = playerFleet.filter((s) => s.isSunk).length;
  if (sunkCount >= 3) return 'under_attack';

  return 'calm';
}

export function computeEnemyMood(params: {
  lastPlayerShot?: ShotOutcome | null;
  lastAiShot?: ShotOutcome | null;
  aiFleet?: PlacedShip[];
  winner?: TurnOwner | null;
}): AvatarMood {
  const { lastPlayerShot, lastAiShot, aiFleet = [], winner } = params;

  if (winner === 'player') return 'under_attack';
  if (winner === 'ai') return 'victory';

  // If the player just hit or sunk an enemy ship, enemy is under attack
  if (lastPlayerShot && (lastPlayerShot.result === 'hit' || lastPlayerShot.result === 'sunk')) {
    return 'under_attack';
  }

  // If the AI just hit or sunk a player ship, enemy celebrates victory
  if (lastAiShot && (lastAiShot.result === 'hit' || lastAiShot.result === 'sunk')) {
    return 'victory';
  }

  const sunkCount = aiFleet.filter((s) => s.isSunk).length;
  if (sunkCount >= 3) return 'under_attack';

  return 'calm';
}

interface CommanderAvatarProps {
  character: AvatarCharacterId;
  mood: AvatarMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const CommanderAvatar: React.FC<CommanderAvatarProps> = ({
  character,
  mood,
  size = 'md',
  className = '',
}) => {
  const profile = COMMANDER_PROFILES[character];
  const crop = profile.crops[mood];

  const sizeClasses: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
    sm: 'w-12 h-12 rounded-xl',
    md: 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
    lg: 'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl',
    xl: 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl',
  };

  const moodRingClasses: Record<AvatarMood, string> = {
    calm: 'border-slate-700/90 shadow-md',
    victory: 'border-emerald-400 shadow-[0_0_18px_rgba(16,185,129,0.5)] ring-1 ring-emerald-400/50',
    under_attack: 'border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.65)] ring-1 ring-rose-500/60',
  };

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-slate-950 border-2 transition-all duration-200 select-none ${sizeClasses[size]} ${moodRingClasses[mood]} ${className}`}
      title={`${profile.name} — ${profile.moodLabels[mood]}`}
    >
      <svg
        viewBox={`${crop.x} ${crop.y} ${crop.w} ${crop.h}`}
        width="100%"
        height="100%"
        className="w-full h-full block"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <image
          href={crop.sheet}
          width={crop.sheetW}
          height={crop.sheetH}
          preserveAspectRatio="none"
        />
      </svg>
    </div>
  );
};

interface CommanderDuelBannerProps {
  difficulty: Difficulty;
  playerMood: AvatarMood;
  enemyMood: AvatarMood;
  playerFleet: PlacedShip[];
  aiFleet: PlacedShip[];
  isPlayerTurn: boolean;
  playerLabelOverride?: string;
  enemyLabelOverride?: string;
}

export const CommanderDuelBanner: React.FC<CommanderDuelBannerProps> = ({
  difficulty,
  playerMood,
  enemyMood,
  playerFleet,
  aiFleet,
  isPlayerTurn,
  playerLabelOverride,
  enemyLabelOverride,
}) => {
  const playerProfile = COMMANDER_PROFILES.navy_seal;
  const enemyCharId = getOpponentCharacterByDifficulty(difficulty);
  const enemyProfile = COMMANDER_PROFILES[enemyCharId];

  const playerAlive = playerFleet.filter((s) => !s.isSunk).length;
  const enemyAlive = aiFleet.filter((s) => !s.isSunk).length;

  const getMoodBadgeStyle = (mood: AvatarMood) => {
    switch (mood) {
      case 'victory':
        return 'text-emerald-300';
      case 'under_attack':
        return 'text-rose-400 font-bold';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-4">
      {/* Left Card: Player Commander (Navy SEAL) */}
      <div
        className={`p-3 sm:p-4 rounded-2xl bg-slate-900/85 border transition-all flex items-center gap-3.5 shadow-xl ${
          playerMood === 'under_attack'
            ? 'border-rose-500/70 bg-rose-950/20'
            : playerMood === 'victory'
            ? 'border-emerald-500/70 bg-emerald-950/15'
            : isPlayerTurn
            ? 'border-cyan-500/60'
            : 'border-slate-800'
        }`}
      >
        <CommanderAvatar character="navy_seal" mood={playerMood} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-1 mb-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-extrabold text-white truncate">
                {playerLabelOverride || playerProfile.name}
              </span>
              <span className="text-xs text-cyan-400 font-medium">· Tú</span>
            </div>
            <span className={`text-[11px] font-mono ${getMoodBadgeStyle(playerMood)}`}>
              {playerProfile.moodLabels[playerMood]}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-2 font-mono tabular-nums">
            <span>{playerProfile.rankTitle}</span>
            <span>·</span>
            <span className="text-slate-300">Flota: {playerAlive}/5 a flote</span>
          </div>

          <p className="text-xs text-slate-200 italic leading-snug whitespace-normal break-words bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            "{playerProfile.quotes[playerMood]}"
          </p>
        </div>
      </div>

      {/* Right Card: Enemy Commander (Pirate / Battleship Captain / Iron Admiral) */}
      <div
        className={`p-3 sm:p-4 rounded-2xl bg-slate-900/85 border transition-all flex items-center gap-3.5 shadow-xl md:flex-row-reverse md:text-right ${
          enemyMood === 'under_attack'
            ? 'border-rose-500/70 bg-rose-950/20'
            : enemyMood === 'victory'
            ? 'border-amber-500/70 bg-amber-950/15'
            : !isPlayerTurn
            ? 'border-amber-500/60'
            : 'border-slate-800'
        }`}
      >
        <CommanderAvatar character={enemyCharId} mood={enemyMood} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center justify-between md:flex-row-reverse gap-1 mb-0.5">
            <div className="flex items-center gap-2 md:flex-row-reverse">
              <span className="text-sm sm:text-base font-extrabold text-white">
                {enemyLabelOverride || enemyProfile.name}
              </span>
              <span
                className="text-xs font-semibold"
                style={{ color: enemyProfile.accentColor }}
              >
                · Rival
              </span>
            </div>
            <span className={`text-[11px] font-mono ${getMoodBadgeStyle(enemyMood)}`}>
              {enemyProfile.moodLabels[enemyMood]}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 mb-1.5 flex items-center md:justify-end gap-2 font-mono tabular-nums">
            <span>{enemyProfile.rankTitle}</span>
            <span>·</span>
            <span className="text-slate-300">Flota: {enemyAlive}/5 a flote</span>
          </div>

          <p className="text-xs text-slate-200 italic leading-snug whitespace-normal break-words bg-slate-950/60 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            "{enemyProfile.quotes[enemyMood]}"
          </p>
        </div>
      </div>
    </div>
  );
};

interface CommanderSidebarCardProps {
  character: AvatarCharacterId;
  mood: AvatarMood;
  fleet: PlacedShip[];
  isActiveTurn: boolean;
  isEnemy?: boolean;
  labelOverride?: string;
}

export const CommanderSidebarCard: React.FC<CommanderSidebarCardProps> = ({
  character,
  mood,
  fleet,
  isActiveTurn,
  isEnemy = false,
  labelOverride,
}) => {
  const profile = COMMANDER_PROFILES[character];
  const aliveCount = fleet.filter((s) => !s.isSunk).length;

  const getMoodColor = (m: AvatarMood) => {
    switch (m) {
      case 'victory':
        return 'text-emerald-400 font-bold';
      case 'under_attack':
        return 'text-rose-400 font-bold';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div
      className={`p-3 rounded-xl bg-slate-900/90 border transition-all shadow-lg ${
        mood === 'under_attack'
          ? 'border-rose-500/70 bg-rose-950/20'
          : mood === 'victory'
          ? 'border-emerald-500/70 bg-emerald-950/15'
          : isActiveTurn
          ? isEnemy
            ? 'border-amber-500/60'
            : 'border-cyan-500/60'
          : 'border-slate-800'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <CommanderAvatar character={character} mood={mood} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-extrabold text-white leading-tight">
              {labelOverride || profile.name}
            </span>
            <span
              className="text-[10px] font-semibold shrink-0"
              style={{ color: profile.accentColor }}
            >
              {isEnemy ? 'Rival' : 'Tú'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 text-[10px] font-mono mt-0.5">
            <span className={getMoodColor(mood)}>{profile.moodLabels[mood]}</span>
            <span className="text-slate-400 tabular-nums shrink-0">{aliveCount}/5 flote</span>
          </div>
        </div>
      </div>
      <div className="mt-2 bg-slate-950/80 px-2.5 py-2 rounded-lg border border-slate-800/90">
        <p className="text-[11px] text-slate-200 italic leading-snug whitespace-normal break-words">
          "{profile.quotes[mood]}"
        </p>
      </div>
    </div>
  );
};

