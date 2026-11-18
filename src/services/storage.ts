import {
  AchievementCategory,
  AchievementId,
  AchievementStateItem,
  Difficulty,
  GameSettings,
  MatchHistoryItem,
  MatchStatistics,
} from '../types';

const SETTINGS_KEY = 'fleet_battle_settings_v1';
const STATS_KEY = 'fleet_battle_stats_v1';
const ACHIEVEMENTS_KEY = 'fleet_battle_achievements_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  sfxVolume: 0.6,
  difficulty: 'MEDIUM',
  showCoordinates: true,
  radarPulseEnabled: true,
  screenShakeEnabled: true,
};

export const DEFAULT_STATISTICS: MatchStatistics = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  totalShots: 0,
  totalHits: 0,
  totalMisses: 0,
  currentStreak: 0,
  bestStreak: 0,
  history: [],
};

export const ACHIEVEMENTS_CATALOG: Omit<
  AchievementStateItem,
  'current' | 'unlocked' | 'unlockedAt'
>[] = [
  // COMBATE Y PRECISIÓN
  {
    id: 'first_sunk',
    category: 'combat',
    title: 'Bautismo de Fuego',
    description: 'Hunde tu primer buque de guerra enemigo en combate.',
    iconName: 'Flame',
    target: 1,
  },
  {
    id: 'first_victory',
    category: 'combat',
    title: 'Primera Victoria Naval',
    description: 'Gana tu primera batalla naval asegurando el control del mar.',
    iconName: 'Trophy',
    target: 1,
  },
  {
    id: 'sharpshooter_60',
    category: 'combat',
    title: 'Francotirador Balístico',
    description: 'Obtén la victoria en una partida con una precisión igual o superior al 60%.',
    iconName: 'Crosshair',
    target: 1,
  },
  {
    id: 'flawless_fleet',
    category: 'combat',
    title: 'Flota Intacta',
    description: 'Gana una batalla naval conservando tus 5 buques a flote sin bajas.',
    iconName: 'ShieldCheck',
    target: 1,
  },
  {
    id: 'win_streak_3',
    category: 'combat',
    title: 'Racha Imparable',
    description: 'Alcanza una racha de 3 victorias consecutivas.',
    iconName: 'Zap',
    target: 3,
  },
  {
    id: 'sea_hunter_20',
    category: 'combat',
    title: 'Cazador de los Mares',
    description: 'Hunde un total acumulado de 20 buques enemigos.',
    iconName: 'Anchor',
    target: 20,
  },

  // HABILIDADES TÁCTICAS Y MANIOBRA
  {
    id: 'evasive_helmsman',
    category: 'tactical',
    title: 'Timonel Evasivo',
    description: 'Desplaza tus buques 5 veces usando la habilidad táctica de Maniobra.',
    iconName: 'Navigation',
    target: 5,
  },
  {
    id: 'combat_engineer',
    category: 'tactical',
    title: 'Ingeniero de Combate',
    description: 'Repara 3 compartimientos dañados en tus buques durante la batalla.',
    iconName: 'Wrench',
    target: 3,
  },
  {
    id: 'sky_of_fire',
    category: 'tactical',
    title: 'Cielo de Fuego',
    description: 'Ejecuta 3 Ataques Aéreos con el Portaaviones o Salvas de Misiles con el Destructor.',
    iconName: 'Plane',
    target: 3,
  },
  {
    id: 'ironclad_shield',
    category: 'tactical',
    title: 'Acorazado Impenetrable',
    description: 'Activa 3 veces el Escudo Blindado de fortificación del Acorazado.',
    iconName: 'Shield',
    target: 3,
  },
  {
    id: 'acoustic_eye',
    category: 'tactical',
    title: 'Ojo Acústico',
    description: 'Detecta firmas enemigas 3 veces con el Reconocimiento Sonar 3×3 de la Patrullera.',
    iconName: 'Radio',
    target: 3,
  },
  {
    id: 'coordinated_salvo',
    category: 'tactical',
    title: 'Fuego Coordinado',
    description: 'Ejecuta 5 Disparos Dobles o Interdicciones Rápidas con el Crucero.',
    iconName: 'Target',
    target: 5,
  },

  // MAESTRÍA CONTRA IA
  {
    id: 'rank_commander',
    category: 'difficulty',
    title: 'Ascenso a Comandante',
    description: 'Derrota a la IA en dificultad Media (Algoritmo Hunt-and-Target).',
    iconName: 'Award',
    target: 1,
  },
  {
    id: 'rank_admiral',
    category: 'difficulty',
    title: 'Estratega Almirante',
    description: 'Derrota a la IA en dificultad Difícil (Matriz Bayesiana Probabilística).',
    iconName: 'Crown',
    target: 1,
  },
  {
    id: 'war_veteran_10',
    category: 'difficulty',
    title: 'Veterano de Guerra',
    description: 'Completa un total de 10 partidas navales.',
    iconName: 'Medal',
    target: 10,
  },

  // MULTIJUGADOR P2P
  {
    id: 'p2p_first_match',
    category: 'multiplayer',
    title: 'Canal P2P Abierto',
    description: 'Completa una batalla naval en el modo Multijugador en Tiempo Real.',
    iconName: 'Users',
    target: 1,
  },
  {
    id: 'p2p_champion',
    category: 'multiplayer',
    title: 'Dominio en Red',
    description: 'Logra la victoria contra un comandante rival en Multijugador P2P.',
    iconName: 'Wifi',
    target: 1,
  },
];

function formatUnlockDate(): string {
  return new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (err) {
    console.warn('Fleet Battle: No se pudo leer la configuración local.', err);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Fleet Battle: No se pudo guardar la configuración local.', err);
  }
}

export function loadStatistics(): MatchStatistics {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return DEFAULT_STATISTICS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATISTICS,
      ...parsed,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (err) {
    console.warn('Fleet Battle: No se pudieron leer las estadísticas locales.', err);
    return DEFAULT_STATISTICS;
  }
}

export function recordMatchResult(
  result: 'victory' | 'defeat',
  difficulty: Difficulty,
  turns: number,
  shots: number,
  hits: number,
  misses: number,
  durationSeconds: number
): MatchStatistics {
  const current = loadStatistics();
  const isWin = result === 'victory';

  const newCurrentStreak = isWin ? current.currentStreak + 1 : 0;
  const newBestStreak = Math.max(current.bestStreak, newCurrentStreak);
  const accuracy = shots > 0 ? Math.round((hits / shots) * 1000) / 10 : 0;

  const historyItem: MatchHistoryItem = {
    id: `match_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }),
    result,
    difficulty,
    turns,
    shots,
    hits,
    misses,
    accuracy,
    durationSeconds,
  };

  const updated: MatchStatistics = {
    gamesPlayed: current.gamesPlayed + 1,
    wins: current.wins + (isWin ? 1 : 0),
    losses: current.losses + (isWin ? 0 : 1),
    totalShots: current.totalShots + shots,
    totalHits: current.totalHits + hits,
    totalMisses: current.totalMisses + misses,
    currentStreak: newCurrentStreak,
    bestStreak: newBestStreak,
    // Keep last 25 games
    history: [historyItem, ...current.history].slice(0, 25),
  };

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Fleet Battle: No se pudieron guardar las estadísticas.', err);
  }

  return updated;
}

export function clearStatistics(): MatchStatistics {
  try {
    localStorage.removeItem(STATS_KEY);
  } catch (err) {
    console.warn('Fleet Battle: Error al borrar estadísticas.', err);
  }
  return DEFAULT_STATISTICS;
}

export function loadAchievements(stats?: MatchStatistics): AchievementStateItem[] {
  const currentStats = stats || loadStatistics();
  let storedMap: Record<
    string,
    { current: number; unlocked: boolean; unlockedAt?: string }
  > = {};

  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (raw) {
      storedMap = JSON.parse(raw) || {};
    }
  } catch (err) {
    console.warn('Fleet Battle: No se pudieron leer los logros.', err);
  }

  const nowLabel = formatUnlockDate();

  return ACHIEVEMENTS_CATALOG.map((def) => {
    const saved = storedMap[def.id];
    let current = saved?.current ?? 0;

    // Backfill baseline from existing statistics if higher
    if (def.id === 'first_victory' && currentStats.wins > 0) {
      current = Math.max(current, 1);
    } else if (def.id === 'win_streak_3') {
      current = Math.max(current, Math.min(def.target, currentStats.bestStreak));
    } else if (def.id === 'war_veteran_10') {
      current = Math.max(current, Math.min(def.target, currentStats.gamesPlayed));
    } else if (
      def.id === 'rank_commander' &&
      currentStats.history.some((h) => h.result === 'victory' && h.difficulty === 'MEDIUM')
    ) {
      current = Math.max(current, 1);
    } else if (
      def.id === 'rank_admiral' &&
      currentStats.history.some((h) => h.result === 'victory' && h.difficulty === 'HARD')
    ) {
      current = Math.max(current, 1);
    } else if (
      def.id === 'sharpshooter_60' &&
      currentStats.history.some((h) => h.result === 'victory' && h.accuracy >= 60)
    ) {
      current = Math.max(current, 1);
    }

    const clampedCurrent = Math.min(def.target, Math.max(0, current));
    const unlocked = Boolean(saved?.unlocked || clampedCurrent >= def.target);

    return {
      ...def,
      current: unlocked ? def.target : clampedCurrent,
      unlocked,
      unlockedAt: unlocked ? saved?.unlockedAt || nowLabel : undefined,
    };
  });
}

function saveAchievementsState(items: AchievementStateItem[]): void {
  try {
    const map: Record<string, { current: number; unlocked: boolean; unlockedAt?: string }> = {};
    for (const item of items) {
      map[item.id] = {
        current: item.current,
        unlocked: item.unlocked,
        unlockedAt: item.unlockedAt,
      };
    }
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(map));
  } catch (err) {
    console.warn('Fleet Battle: No se pudieron guardar los logros.', err);
  }
}

export function updateAchievementProgress(
  updates: Partial<Record<AchievementId, { add?: number; setMax?: number }>>
): {
  achievements: AchievementStateItem[];
  newlyUnlocked: AchievementStateItem[];
} {
  const currentList = loadAchievements();
  const newlyUnlocked: AchievementStateItem[] = [];
  const nowLabel = formatUnlockDate();

  const updatedList = currentList.map((item) => {
    const rule = updates[item.id];
    if (!rule) return item;

    let nextVal = item.current;
    if (typeof rule.add === 'number') {
      nextVal += rule.add;
    }
    if (typeof rule.setMax === 'number') {
      nextVal = Math.max(nextVal, rule.setMax);
    }

    const clamped = Math.min(item.target, Math.max(0, nextVal));
    const isNowUnlocked = item.unlocked || clamped >= item.target;
    const justUnlocked = !item.unlocked && isNowUnlocked;

    const updatedItem: AchievementStateItem = {
      ...item,
      current: isNowUnlocked ? item.target : clamped,
      unlocked: isNowUnlocked,
      unlockedAt: isNowUnlocked ? item.unlockedAt || nowLabel : undefined,
    };

    if (justUnlocked) {
      newlyUnlocked.push(updatedItem);
    }

    return updatedItem;
  });

  saveAchievementsState(updatedList);
  return { achievements: updatedList, newlyUnlocked };
}

export function evaluateMatchEndAchievements(params: {
  isVictory: boolean;
  isMultiplayer: boolean;
  difficulty?: Difficulty;
  accuracy: number;
  survivingPlayerShips: number;
  currentStreak: number;
  totalGamesPlayed: number;
}): {
  achievements: AchievementStateItem[];
  newlyUnlocked: AchievementStateItem[];
} {
  const updates: Partial<Record<AchievementId, { add?: number; setMax?: number }>> = {
    war_veteran_10: { setMax: params.totalGamesPlayed },
    win_streak_3: { setMax: params.currentStreak },
  };

  if (params.isMultiplayer) {
    updates.p2p_first_match = { add: 1 };
    if (params.isVictory) {
      updates.p2p_champion = { add: 1 };
    }
  }

  if (params.isVictory) {
    updates.first_victory = { setMax: 1 };
    if (params.accuracy >= 60) {
      updates.sharpshooter_60 = { setMax: 1 };
    }
    if (params.survivingPlayerShips >= 5) {
      updates.flawless_fleet = { setMax: 1 };
    }
    if (!params.isMultiplayer && params.difficulty === 'MEDIUM') {
      updates.rank_commander = { setMax: 1 };
    }
    if (!params.isMultiplayer && params.difficulty === 'HARD') {
      updates.rank_admiral = { setMax: 1 };
    }
  }

  return updateAchievementProgress(updates);
}

