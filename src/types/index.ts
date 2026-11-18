/**
 * Fleet Battle — Type Definitions
 */

export type Orientation = 'horizontal' | 'vertical';

export type ShipTypeId = 'carrier' | 'battleship' | 'cruiser' | 'destroyer' | 'patrol';

export interface Coordinate {
  row: number; // 0-9
  col: number; // 0-9
}

export interface ShipConfig {
  id: ShipTypeId;
  name: string;
  length: number;
  description: string;
}

export interface PlacedShip {
  id: string; // unique instance ID (e.g. 'carrier_1')
  type: ShipTypeId;
  name: string;
  length: number;
  orientation: Orientation;
  coordinates: Coordinate[];
  hits: Coordinate[];
  isSunk: boolean;
  shielded?: boolean; // Battleship defensive fortification shield
}

export type MoveDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type SalvoOrientation = 'horizontal' | 'vertical';

export interface SonarSectorOverlay {
  center: Coordinate;
  cells: Coordinate[];
  detected: boolean; // true = CONTACTO (Red), false = DESPEJADO (Green)
  timestamp: number;
}

export type CellState = 'empty' | 'ship' | 'hit' | 'miss';

export interface BoardCell {
  row: number;
  col: number;
  hasShip: boolean;
  shipId?: string;
  isHit: boolean;
  isMiss: boolean;
  isSunkShip: boolean;
  isLastTarget: boolean;
}

export type ShotResultType = 'miss' | 'hit' | 'sunk';

export interface ShotOutcome {
  coordinate: Coordinate;
  result: ShotResultType;
  shipId?: string;
  shipName?: string;
  isSunk?: boolean;
  sunkShip?: PlacedShip;
  isGameOver?: boolean;
  winner?: 'player' | 'ai';
}

export interface ShotRecord {
  id: string;
  shooter: 'player' | 'ai' | 'host' | 'guest';
  coordinate: Coordinate;
  result: ShotResultType;
  timestamp: number;
  shipName?: string;
  sunk?: boolean;
}

export type GamePhase =
  | 'MENU'
  | 'PLACEMENT'
  | 'COMBAT'
  | 'RESULTS'
  | 'MULTIPLAYER_LOBBY'
  | 'MULTIPLAYER_PLACEMENT'
  | 'MULTIPLAYER_COMBAT'
  | 'TOURNAMENT_HUB';

export type TurnOwner = 'player' | 'ai';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface GameSettings {
  soundEnabled: boolean;
  sfxVolume: number; // 0 to 1
  difficulty: Difficulty;
  showCoordinates: boolean;
  radarPulseEnabled: boolean;
  screenShakeEnabled: boolean;
}

export type TacticalAbilityType =
  | 'attack'
  | 'double_shot'
  | 'repair'
  | 'special'
  | 'move'
  | 'sonar'
  | 'airstrike'
  | 'smoke';

export interface TacticalAbilitiesState {
  hitsCharged: number;
  hitsRequired: number;
  isUnlocked: boolean;
  usedAbility: TacticalAbilityType | null;
  activeTargeting: TacticalAbilityType | null;
  sonarScanResult: { center: Coordinate; detected: boolean; count?: number; timestamp: number } | null;
  smokeActiveQuadrant: { row: number; col: number } | null;
}

export type MultiplayerRole = 'host' | 'guest';

export interface MultiplayerRoomState {
  code: string;
  status: 'waiting' | 'placement' | 'combat' | 'finished';
  role: MultiplayerRole;
  hostName: string;
  guestName: string | null;
  hostReady: boolean;
  guestReady: boolean;
  hostFleetHash?: string;
  guestFleetHash?: string;
  currentTurn: MultiplayerRole;
  turnExpiresAt: number;
  myShots: Coordinate[];
  myHits: Coordinate[];
  opponentShots: Coordinate[];
  opponentHits: Coordinate[];
  opponentSunkShips: PlacedShip[];
  myFleet: PlacedShip[];
  combatLogs: ShotRecord[];
  currentAp: number;
  maxAp: number;
  maneuverCooldown: number;
  winner: MultiplayerRole | null;
  winReason?: 'annihilation' | 'surrender' | 'timeout';
  serverTime: number;
  lastActivity?: number;
  tournamentCode?: string;
  tournamentMatchId?: string;
}

export type TournamentStatus = 'lobby' | 'drawn' | 'in_progress' | 'completed';

export type TournamentMatchStatus = 'pending' | 'bye' | 'ready' | 'in_progress' | 'finished';

export interface TournamentParticipant {
  id: string;
  name: string;
  joinedAt: number;
  lastActive: number;
  isHost?: boolean;
}

export interface TournamentMatchSlot {
  id: string;
  roundIndex: number;
  matchIndex: number;
  player1: { id: string; name: string } | null;
  player2: { id: string; name: string } | null;
  isBye?: boolean;
  status: TournamentMatchStatus;
  roomCode: string | null;
  winnerId: string | null;
  winnerName: string | null;
  liveStatus?: {
    roomStatus: 'waiting' | 'placement' | 'combat' | 'finished';
    hostReady: boolean;
    guestReady: boolean;
    hostShipsAlive: number;
    guestShipsAlive: number;
    currentTurnName: string;
    totalShots: number;
  };
}

export interface TournamentRound {
  roundIndex: number;
  title: string;
  matches: TournamentMatchSlot[];
}

export interface TournamentSpectatorView {
  roomCode: string;
  matchId: string;
  roundTitle: string;
  status: 'waiting' | 'placement' | 'combat' | 'finished';
  hostName: string;
  guestName: string;
  hostReady: boolean;
  guestReady: boolean;
  currentTurn: 'host' | 'guest';
  turnExpiresAt: number;
  hostShots: Coordinate[];
  hostHits: Coordinate[];
  guestShots: Coordinate[];
  guestHits: Coordinate[];
  hostSunkShips: PlacedShip[];
  guestSunkShips: PlacedShip[];
  hostShipsAlive: number;
  guestShipsAlive: number;
  combatLogs: ShotRecord[];
  winner: 'host' | 'guest' | null;
}

export interface TournamentState {
  code: string;
  name: string;
  createdAt: number;
  status: TournamentStatus;
  hostId: string;
  hostName: string;
  participants: TournamentParticipant[];
  rounds: TournamentRound[];
  champion: { id: string; name: string } | null;
  drawnAt?: number;
  startedAt?: number;
  completedAt?: number;
}

export interface MatchHistoryItem {
  id: string;
  date: string;
  result: 'victory' | 'defeat';
  difficulty: Difficulty | 'MULTIPLAYER';
  turns: number;
  shots: number;
  hits: number;
  misses: number;
  accuracy: number;
  durationSeconds: number;
}

export interface MatchStatistics {
  gamesPlayed: number;
  wins: number;
  losses: number;
  totalShots: number;
  totalHits: number;
  totalMisses: number;
  currentStreak: number;
  bestStreak: number;
  history: MatchHistoryItem[];
}

export type AchievementCategory = 'combat' | 'tactical' | 'difficulty' | 'multiplayer';

export type AchievementId =
  | 'first_sunk'
  | 'first_victory'
  | 'sharpshooter_60'
  | 'flawless_fleet'
  | 'win_streak_3'
  | 'sea_hunter_20'
  | 'evasive_helmsman'
  | 'combat_engineer'
  | 'sky_of_fire'
  | 'ironclad_shield'
  | 'acoustic_eye'
  | 'coordinated_salvo'
  | 'rank_commander'
  | 'rank_admiral'
  | 'war_veteran_10'
  | 'p2p_first_match'
  | 'p2p_champion';

export interface AchievementStateItem {
  id: AchievementId;
  category: AchievementCategory;
  title: string;
  description: string;
  iconName: string;
  target: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: string;
}


