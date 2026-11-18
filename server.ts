import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

import {
  calculateActionCost,
  calculateMaxAp,
  canMoveShip,
  moveShipInFleet,
  canPlayerAffordAnyAction,
} from './src/engine/board';
import { formatCoordinate, isInBounds } from './src/utils/coordinates';
import {
  PlacedShip,
  Coordinate,
  ShotRecord,
  MoveDirection,
  SalvoOrientation,
  TacticalAbilityType,
  TournamentState,
  TournamentRound,
  TournamentMatchSlot,
  TournamentParticipant,
  TournamentSpectatorView,
} from './src/types';

interface ServerRoom {
  code: string;
  createdAt: number;
  status: 'waiting' | 'placement' | 'combat' | 'finished';
  hostId: string;
  hostName: string;
  guestId: string | null;
  guestName: string | null;
  hostReady: boolean;
  guestReady: boolean;
  hostFleetHash?: string;
  guestFleetHash?: string;
  hostFleet?: PlacedShip[];
  guestFleet?: PlacedShip[];
  currentTurn: 'host' | 'guest';
  turnExpiresAt: number;
  hostShots: Coordinate[];
  hostHits: Coordinate[];
  guestShots: Coordinate[];
  guestHits: Coordinate[];
  combatLogs: ShotRecord[];
  winner: 'host' | 'guest' | null;
  winReason?: 'annihilation' | 'surrender' | 'timeout';
  hostAbilitiesUsed: number;
  guestAbilitiesUsed: number;
  hostLastActive: number;
  guestLastActive: number;
  signals: { from: string; type: string; payload: any; timestamp: number }[];
  hostAp: number;
  hostMaxAp: number;
  guestAp: number;
  guestMaxAp: number;
  hostManeuverCooldown: number;
  guestManeuverCooldown: number;
  tournamentCode?: string;
  tournamentMatchId?: string;
}

const rooms = new Map<string, ServerRoom>();
const ROOMS_FILE = path.resolve(__dirname, '.multiplayer_rooms.json');

const tournaments = new Map<string, TournamentState>();
const TOURNAMENTS_FILE = path.resolve(__dirname, '.multiplayer_tournaments.json');

function normalizeRoomCode(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();
  try {
    if (str.includes('room=')) {
      const match = str.match(/[?&]room=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        str = match[1];
      }
    }
  } catch {}
  str = str.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
  if (!str) return '';
  if (str.startsWith('NAV-')) return str;
  if (str.startsWith('NAV')) return 'NAV-' + str.substring(3).replace(/^-+/, '');
  return 'NAV-' + str;
}

function normalizeTournamentCode(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();
  try {
    if (str.includes('tournament=')) {
      const match = str.match(/[?&]tournament=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        str = match[1];
      }
    }
  } catch {}
  str = str.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
  if (!str) return '';
  if (str.startsWith('TOR-')) return str;
  if (str.startsWith('TOR')) return 'TOR-' + str.substring(3).replace(/^-+/, '');
  return 'TOR-' + str;
}

function loadRoomsFromDisk() {
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        const now = Date.now();
        for (const r of data) {
          if (r && r.code && now - r.createdAt < 6 * 60 * 60 * 1000) {
            rooms.set(r.code.toUpperCase(), r);
          }
        }
        console.log(`[Fleet Battle] Loaded ${rooms.size} active rooms from persistent storage.`);
      }
    }
  } catch (e) {
    console.error('[Fleet Battle] Error reading rooms store:', e);
  }
}

function persistRoomsToDisk() {
  try {
    const list = Array.from(rooms.values());
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Fleet Battle] Error saving rooms store:', e);
  }
}

function loadTournamentsFromDisk() {
  try {
    if (fs.existsSync(TOURNAMENTS_FILE)) {
      const raw = fs.readFileSync(TOURNAMENTS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        const now = Date.now();
        for (const t of data) {
          if (t && t.code && now - t.createdAt < 12 * 60 * 60 * 1000) {
            tournaments.set(t.code.toUpperCase(), t);
          }
        }
        console.log(`[Fleet Battle] Loaded ${tournaments.size} active tournaments.`);
      }
    }
  } catch (e) {
    console.error('[Fleet Battle] Error reading tournaments store:', e);
  }
}

function persistTournamentsToDisk() {
  try {
    const list = Array.from(tournaments.values());
    fs.writeFileSync(TOURNAMENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Fleet Battle] Error saving tournaments store:', e);
  }
}

function findTournament(raw: string): TournamentState | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const direct = tournaments.get(trimmed.toUpperCase());
  if (direct) return direct;

  const normalized = normalizeTournamentCode(trimmed);
  const byNorm = tournaments.get(normalized);
  if (byNorm) return byNorm;

  const cleanInput = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  for (const t of tournaments.values()) {
    const tCode = t.code.toUpperCase();
    const tClean = tCode.replace(/[^a-zA-Z0-9]/g, '');
    if (
      tCode === normalized ||
      tCode === cleanInput ||
      tClean === cleanInput ||
      tCode.endsWith('-' + cleanInput) ||
      tClean.endsWith(cleanInput)
    ) {
      return t;
    }
  }
  return undefined;
}

function findRoom(raw: string): ServerRoom | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  const direct = rooms.get(trimmed.toUpperCase());
  if (direct) return direct;

  const normalized = normalizeRoomCode(trimmed);
  const byNorm = rooms.get(normalized);
  if (byNorm) return byNorm;

  const cleanInput = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  for (const r of rooms.values()) {
    const rCode = r.code.toUpperCase();
    const rClean = rCode.replace(/[^a-zA-Z0-9]/g, '');
    if (rCode === normalized || rCode === cleanInput || rClean === cleanInput) {
      return r;
    }
    if (rCode.endsWith('-' + cleanInput) || rClean.endsWith(cleanInput)) {
      return r;
    }
  }

  // Fallback: reload from disk in case another container or restart wrote it
  try {
    if (fs.existsSync(ROOMS_FILE)) {
      const diskData = JSON.parse(fs.readFileSync(ROOMS_FILE, 'utf-8'));
      if (Array.isArray(diskData)) {
        for (const r of diskData) {
          const rCode = r.code.toUpperCase();
          const rClean = rCode.replace(/[^a-zA-Z0-9]/g, '');
          if (
            rCode === normalized ||
            rCode === cleanInput ||
            rClean === cleanInput ||
            rCode.endsWith('-' + cleanInput) ||
            rClean.endsWith(cleanInput)
          ) {
            rooms.set(r.code.toUpperCase(), r);
            return r;
          }
        }
      }
    }
  } catch {}

  return undefined;
}

// Clean up stale rooms older than 6 hours
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [code, room] of rooms.entries()) {
    if (now - room.createdAt > 6 * 60 * 60 * 1000) {
      rooms.delete(code);
      changed = true;
    }
  }
  if (changed) persistRoomsToDisk();
}, 10 * 60 * 1000);

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'NAV-';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateTournamentCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TOR-';
  for (let i = 0; i < 3; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRoundTitle(roundIndex: number, totalRounds: number): string {
  const remainingFromEnd = totalRounds - 1 - roundIndex;
  if (remainingFromEnd === 0) return 'Gran Final';
  if (remainingFromEnd === 1) return 'Semifinal';
  if (remainingFromEnd === 2) return 'Cuartos de Final';
  if (remainingFromEnd === 3) return 'Octavos de Final';
  if (remainingFromEnd === 4) return 'Dieciseisavos de Final';
  return `Ronda ${roundIndex + 1}`;
}

function createRoomForTournamentMatch(
  tournamentCode: string,
  matchId: string,
  p1: { id: string; name: string },
  p2: { id: string; name: string }
): ServerRoom {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room: ServerRoom = {
    code,
    createdAt: Date.now(),
    status: 'placement',
    hostId: p1.id,
    hostName: p1.name,
    guestId: p2.id,
    guestName: p2.name,
    hostReady: false,
    guestReady: false,
    currentTurn: 'host',
    turnExpiresAt: 0,
    hostShots: [],
    hostHits: [],
    guestShots: [],
    guestHits: [],
    combatLogs: [],
    winner: null,
    hostAbilitiesUsed: 0,
    guestAbilitiesUsed: 0,
    hostLastActive: Date.now(),
    guestLastActive: Date.now(),
    signals: [],
    hostAp: 6,
    hostMaxAp: 6,
    guestAp: 6,
    guestMaxAp: 6,
    hostManeuverCooldown: 0,
    guestManeuverCooldown: 0,
    tournamentCode,
    tournamentMatchId: matchId,
  };

  rooms.set(code, room);
  return room;
}

function buildBracketFromParticipants(participants: TournamentParticipant[]): TournamentRound[] {
  const n = participants.length;
  if (n < 2) return [];

  // Fisher-Yates shuffle
  const shuffled = [...participants];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const totalRounds = Math.ceil(Math.log2(n));
  const bracketSize = Math.pow(2, totalRounds); // Next power of 2 >= n
  const firstRoundMatchCount = bracketSize / 2;

  const rounds: TournamentRound[] = [];

  for (let r = 0; r < totalRounds; r++) {
    const matchCount = bracketSize / Math.pow(2, r + 1);
    const matches: TournamentMatchSlot[] = [];
    for (let m = 0; m < matchCount; m++) {
      matches.push({
        id: `R${r}_M${m}`,
        roundIndex: r,
        matchIndex: m,
        player1: null,
        player2: null,
        isBye: false,
        status: 'pending',
        roomCode: null,
        winnerId: null,
        winnerName: null,
      });
    }
    rounds.push({
      roundIndex: r,
      title: getRoundTitle(r, totalRounds),
      matches,
    });
  }

  // Assign first firstRoundMatchCount players as player1 of each match in Round 0
  for (let m = 0; m < firstRoundMatchCount; m++) {
    const p = shuffled[m];
    rounds[0].matches[m].player1 = { id: p.id, name: p.name };
  }

  // Distribute the remaining (n - firstRoundMatchCount) players across player2 slots
  // Spread even match indices first so BYEs are balanced across both halves of the bracket
  const matchOrderForP2: number[] = [];
  for (let m = 0; m < firstRoundMatchCount; m += 2) matchOrderForP2.push(m);
  for (let m = 1; m < firstRoundMatchCount; m += 2) matchOrderForP2.push(m);

  const remainingPlayers = shuffled.slice(firstRoundMatchCount);
  const hasP2Set = new Set<number>();

  for (let i = 0; i < remainingPlayers.length; i++) {
    const targetMatchIdx = matchOrderForP2[i];
    const p = remainingPlayers[i];
    rounds[0].matches[targetMatchIdx].player2 = { id: p.id, name: p.name };
    hasP2Set.add(targetMatchIdx);
  }

  // Mark remaining Round 0 slots without player2 as automatic BYEs
  for (let m = 0; m < firstRoundMatchCount; m++) {
    const slot = rounds[0].matches[m];
    if (!hasP2Set.has(m) && slot.player1) {
      slot.isBye = true;
      slot.status = 'bye';
      slot.winnerId = slot.player1.id;
      slot.winnerName = slot.player1.name;
    } else if (slot.player1 && slot.player2) {
      slot.status = 'ready';
    }
  }

  return rounds;
}

function syncTournamentProgression(tournament: TournamentState): boolean {
  let roomsCreatedOrUpdated = false;
  const totalRounds = tournament.rounds.length;
  if (totalRounds === 0) return false;

  // Iterate multiple passes so BYEs or newly finished matches cascade immediately to the next round
  for (let pass = 0; pass < totalRounds + 1; pass++) {
    for (let r = 0; r < totalRounds; r++) {
      const round = tournament.rounds[r];
      for (let m = 0; m < round.matches.length; m++) {
        const match = round.matches[m];

        // 1. Sync from existing ServerRoom if one is assigned
        if (match.roomCode) {
          const room = rooms.get(match.roomCode);
          if (room) {
            const hostShipsAlive = room.hostFleet
              ? room.hostFleet.filter((s) => !s.isSunk).length
              : 5;
            const guestShipsAlive = room.guestFleet
              ? room.guestFleet.filter((s) => !s.isSunk).length
              : 5;

            match.liveStatus = {
              roomStatus: room.status,
              hostReady: room.hostReady,
              guestReady: room.guestReady,
              hostShipsAlive,
              guestShipsAlive,
              currentTurnName:
                room.currentTurn === 'host'
                  ? room.hostName
                  : room.guestName || 'Invitado',
              totalShots: room.hostShots.length + room.guestShots.length,
            };

            if (room.status === 'combat' && !room.winner) {
              match.status = 'in_progress';
            } else if (room.status === 'finished' && room.winner && !match.winnerId) {
              match.status = 'finished';
              match.winnerId = room.winner === 'host' ? room.hostId : room.guestId!;
              match.winnerName =
                room.winner === 'host' ? room.hostName : room.guestName || 'Ganador';
              roomsCreatedOrUpdated = true;
            }
          }
        }

        // 2. If this match has a winner (either by BYE or finished combat), promote winner to next round
        if (match.winnerId && match.winnerName) {
          if (r + 1 < totalRounds) {
            const nextRound = tournament.rounds[r + 1];
            const nextMatchIndex = Math.floor(m / 2);
            const nextMatch = nextRound.matches[nextMatchIndex];
            if (nextMatch) {
              const isFirstSlot = m % 2 === 0;
              if (isFirstSlot) {
                if (!nextMatch.player1 || nextMatch.player1.id !== match.winnerId) {
                  nextMatch.player1 = { id: match.winnerId, name: match.winnerName };
                  roomsCreatedOrUpdated = true;
                }
              } else {
                if (!nextMatch.player2 || nextMatch.player2.id !== match.winnerId) {
                  nextMatch.player2 = { id: match.winnerId, name: match.winnerName };
                  roomsCreatedOrUpdated = true;
                }
              }
            }
          } else {
            // Final round finished! Crown the champion!
            if (!tournament.champion || tournament.champion.id !== match.winnerId) {
              tournament.champion = { id: match.winnerId, name: match.winnerName };
              tournament.status = 'completed';
              tournament.completedAt = Date.now();
              roomsCreatedOrUpdated = true;
            }
          }
        }

        // 3. When both player1 & player2 are present in ANY round:
        //    - Mark as 'ready' if tournament is 'drawn'
        //    - Automatically spin up its simultaneous ServerRoom if tournament is 'in_progress'
        if (match.player1 && match.player2 && !match.winnerId && !match.isBye) {
          if (match.status === 'pending') {
            match.status = 'ready';
          }
          if (tournament.status === 'in_progress' && !match.roomCode) {
            const newRoom = createRoomForTournamentMatch(
              tournament.code,
              match.id,
              match.player1,
              match.player2
            );
            match.roomCode = newRoom.code;
            match.status = 'ready';
            match.liveStatus = {
              roomStatus: newRoom.status,
              hostReady: false,
              guestReady: false,
              hostShipsAlive: 5,
              guestShipsAlive: 5,
              currentTurnName: newRoom.hostName,
              totalShots: 0,
            };
            roomsCreatedOrUpdated = true;
          }
        }
      }
    }
  }

  return roomsCreatedOrUpdated;
}

function buildSpectatorViewForRoom(
  room: ServerRoom,
  matchId: string,
  roundTitle: string
): TournamentSpectatorView {
  const hostSunkShips = (room.hostFleet || [])
    .filter((s) => s.isSunk)
    .map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      length: s.length,
      orientation: s.orientation,
      coordinates: s.coordinates,
      hits: s.hits && s.hits.length > 0 ? s.hits : [...s.coordinates],
      isSunk: true,
      shielded: false,
    }));

  const guestSunkShips = (room.guestFleet || [])
    .filter((s) => s.isSunk)
    .map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      length: s.length,
      orientation: s.orientation,
      coordinates: s.coordinates,
      hits: s.hits && s.hits.length > 0 ? s.hits : [...s.coordinates],
      isSunk: true,
      shielded: false,
    }));

  return {
    roomCode: room.code,
    matchId,
    roundTitle,
    status: room.status,
    hostName: room.hostName,
    guestName: room.guestName || 'Invitado',
    hostReady: room.hostReady,
    guestReady: room.guestReady,
    currentTurn: room.currentTurn,
    turnExpiresAt: room.turnExpiresAt,
    hostShots: room.hostShots,
    hostHits: room.hostHits,
    guestShots: room.guestShots,
    guestHits: room.guestHits,
    hostSunkShips,
    guestSunkShips,
    hostShipsAlive: room.hostFleet ? room.hostFleet.filter((s) => !s.isSunk).length : 5,
    guestShipsAlive: room.guestFleet ? room.guestFleet.filter((s) => !s.isSunk).length : 5,
    combatLogs: room.combatLogs.slice(0, 30),
    winner: room.winner,
  };
}

function sanitizeRoomForPlayer(room: ServerRoom, playerId: string) {
  const isHost = playerId === room.hostId;
  const isGuest = playerId === room.guestId;

  // Determine opponent sunk ships
  const opponentFleet = isHost ? room.guestFleet : room.hostFleet;
  const opponentSunkShips = (opponentFleet || [])
    .filter((s) => s.isSunk)
    .map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      length: s.length,
      orientation: s.orientation,
      coordinates: s.coordinates,
      hits: s.hits && s.hits.length > 0 ? s.hits : [...s.coordinates],
      isSunk: true,
      shielded: false,
    }));

  return {
    code: room.code,
    status: room.status,
    role: isHost ? 'host' : isGuest ? 'guest' : 'spectator',
    hostName: room.hostName,
    guestName: room.guestName,
    hostReady: room.hostReady,
    guestReady: room.guestReady,
    hostFleetHash: room.hostFleetHash,
    guestFleetHash: room.guestFleetHash,
    currentTurn: room.currentTurn,
    turnExpiresAt: room.turnExpiresAt,
    myShots: isHost ? room.hostShots : room.guestShots,
    myHits: isHost ? room.hostHits : room.guestHits,
    opponentShots: isHost ? room.guestShots : room.hostShots,
    opponentHits: isHost ? room.guestHits : room.hostHits,
    combatLogs: room.combatLogs.slice(0, 40),
    winner: room.winner,
    winReason: room.winReason,
    opponentSunkShips,
    myFleet: isHost ? room.hostFleet || [] : room.guestFleet || [],
    currentAp: isHost ? room.hostAp : room.guestAp,
    maxAp: isHost ? room.hostMaxAp : room.guestMaxAp,
    maneuverCooldown: isHost ? room.hostManeuverCooldown : room.guestManeuverCooldown,
    serverTime: Date.now(),
    tournamentCode: room.tournamentCode,
    tournamentMatchId: room.tournamentMatchId,
  };
}

function containsCoord(list: Coordinate[], target: Coordinate): boolean {
  return list.some((c) => c.row === target.row && c.col === target.col);
}

function areAllShipsSunk(fleet: PlacedShip[]): boolean {
  return fleet.length > 0 && fleet.every((s) => s.isSunk);
}

async function startServer() {
  loadRoomsFromDisk();
  loadTournamentsFromDisk();

  const app = express();
  app.use(express.json());

  // 1. Create Room
  app.post('/api/multiplayer/create', (req: Request, res: Response) => {
    const { playerName } = req.body;
    let code = generateRoomCode();
    while (rooms.has(code)) {
      code = generateRoomCode();
    }

    const hostId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const room: ServerRoom = {
      code,
      createdAt: Date.now(),
      status: 'waiting',
      hostId,
      hostName: playerName?.trim() || 'Comandante Alfa',
      guestId: null,
      guestName: null,
      hostReady: false,
      guestReady: false,
      currentTurn: 'host',
      turnExpiresAt: 0,
      hostShots: [],
      hostHits: [],
      guestShots: [],
      guestHits: [],
      combatLogs: [],
      winner: null,
      hostAbilitiesUsed: 0,
      guestAbilitiesUsed: 0,
      hostLastActive: Date.now(),
      guestLastActive: Date.now(),
      signals: [],
      hostAp: 6,
      hostMaxAp: 6,
      guestAp: 6,
      guestMaxAp: 6,
      hostManeuverCooldown: 0,
      guestManeuverCooldown: 0,
    };

    rooms.set(code, room);
    persistRoomsToDisk();
    console.log(`[Fleet Battle] Created room ${code} by ${room.hostName} (${hostId})`);

    res.json({
      success: true,
      roomCode: code,
      playerId: hostId,
      role: 'host',
    });
  });

  // 2. Join Room
  app.post('/api/multiplayer/join', (req: Request, res: Response) => {
    const { roomCode, playerName, playerId: existingPlayerId } = req.body;
    const room = findRoom(roomCode);

    if (!room) {
      return res.status(404).json({
        success: false,
        error: `Código de sala "${roomCode || ''}" no encontrado. Verifica el código (ej. NAV-XXX) e intenta de nuevo.`,
      });
    }

    // Reconnection handling
    const isHost = existingPlayerId && existingPlayerId === room.hostId;
    const isGuest = existingPlayerId && existingPlayerId === room.guestId;

    if (isHost) {
      room.hostLastActive = Date.now();
      persistRoomsToDisk();
      return res.json({
        success: true,
        roomCode: room.code,
        playerId: room.hostId,
        role: 'host',
      });
    }

    if (isGuest) {
      room.guestLastActive = Date.now();
      persistRoomsToDisk();
      return res.json({
        success: true,
        roomCode: room.code,
        playerId: room.guestId,
        role: 'guest',
      });
    }

    // If match already concluded
    if (room.status === 'finished') {
      return res.status(400).json({ success: false, error: 'Esta partida ya ha finalizado.' });
    }

    // If combat active and already occupied by a different guest
    if (room.status === 'combat' && room.guestId) {
      return res.status(400).json({ success: false, error: 'Esta partida ya está en curso y la sala está completa.' });
    }

    const guestId = existingPlayerId || `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    room.guestId = guestId;
    room.guestName = playerName?.trim() || room.guestName || 'Comandante Bravo';
    room.guestLastActive = Date.now();
    if (room.status === 'waiting') {
      room.status = 'placement';
    }
    persistRoomsToDisk();
    console.log(`[Fleet Battle] Guest ${room.guestName} (${guestId}) joined room ${room.code}`);

    res.json({
      success: true,
      roomCode: room.code,
      playerId: guestId,
      role: 'guest',
    });
  });

  // 3. Get Room State
  app.get('/api/multiplayer/room/:code', (req: Request, res: Response) => {
    const { code } = req.params;
    const playerId = req.query.playerId as string;
    const room = findRoom(code);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Sala no encontrada' });
    }

    // Check timeout if in combat
    if (room.status === 'combat' && !room.winner) {
      const now = Date.now();
      // Turn countdown timeout (35 seconds)
      if (room.turnExpiresAt > 0 && now > room.turnExpiresAt) {
        // Current player ran out of turn time: flip turn to opponent!
        room.currentTurn = room.currentTurn === 'host' ? 'guest' : 'host';
        room.turnExpiresAt = now + 35000;

        if (room.currentTurn === 'host') {
          room.hostMaxAp = calculateMaxAp(room.hostFleet || []);
          room.hostAp = room.hostMaxAp;
          room.hostManeuverCooldown = Math.max(0, room.hostManeuverCooldown - 1);
        } else {
          room.guestMaxAp = calculateMaxAp(room.guestFleet || []);
          room.guestAp = room.guestMaxAp;
          room.guestManeuverCooldown = Math.max(0, room.guestManeuverCooldown - 1);
        }

        const nextPlayerName = room.currentTurn === 'host' ? room.hostName : (room.guestName || 'Invitado');
        room.combatLogs.unshift({
          id: `timeout_${Date.now()}`,
          shooter: room.currentTurn === 'host' ? 'guest' : 'host',
          coordinate: { row: -1, col: -1 },
          result: 'miss',
          timestamp: Date.now(),
          shipName: `Tiempo agotado (35s) — Turno cedido a ${nextPlayerName}`,
        });

        if (room.tournamentCode) {
          const tournament = findTournament(room.tournamentCode);
          if (tournament) {
            syncTournamentProgression(tournament);
            persistTournamentsToDisk();
          }
        }
        persistRoomsToDisk();
      }
    }

    res.json({
      success: true,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 4. Submit Fleet & Ready
  app.post('/api/multiplayer/room/:code/ready', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId, fleet, fleetHash } = req.body;
    const room = findRoom(code);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Sala no encontrada' });
    }

    const isHost = playerId === room.hostId;
    const isGuest = playerId === room.guestId;

    if (!isHost && !isGuest) {
      return res.status(403).json({ success: false, error: 'No autorizado en esta sala' });
    }

    // If combat is already underway or finished, do not overwrite active fleets or reset combat state
    if (room.status === 'combat' || room.status === 'finished') {
      return res.json({
        success: true,
        room: sanitizeRoomForPlayer(room, playerId),
      });
    }

    if (isHost) {
      room.hostFleet = fleet;
      room.hostFleetHash = fleetHash;
      room.hostReady = true;
      room.hostLastActive = Date.now();
    } else {
      room.guestFleet = fleet;
      room.guestFleetHash = fleetHash;
      room.guestReady = true;
      room.guestLastActive = Date.now();
    }

    // If both ready, start combat!
    if (room.hostReady && room.guestReady) {
      room.status = 'combat';
      room.currentTurn = 'host';
      room.turnExpiresAt = Date.now() + 35000;
      room.hostMaxAp = calculateMaxAp(room.hostFleet!);
      room.hostAp = room.hostMaxAp;
      room.guestMaxAp = calculateMaxAp(room.guestFleet!);
      room.guestAp = room.guestMaxAp;
      room.hostManeuverCooldown = 0;
      room.guestManeuverCooldown = 0;

      room.combatLogs.unshift({
        id: `sys_start_${Date.now()}`,
        shooter: 'host',
        coordinate: { row: -1, col: -1 },
        result: 'miss',
        timestamp: Date.now(),
        shipName: '¡Sistemas en línea! Canal de combate táctico abierto.',
      });
    }

    if (room.tournamentCode) {
      const tournament = findTournament(room.tournamentCode);
      if (tournament) {
        syncTournamentProgression(tournament);
        persistTournamentsToDisk();
      }
    }

    persistRoomsToDisk();

    res.json({
      success: true,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 5. Fire Shot & Offensive Abilities (Normal 1-cell, Double 2-cell, Air Strike / Salvo)
  app.post('/api/multiplayer/room/:code/fire', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId, coordinate, abilityType = 'attack', shipId, orientation = 'horizontal' } = req.body;
    const room = findRoom(code);

    if (!room || room.status !== 'combat' || room.winner) {
      return res.status(400).json({ success: false, error: 'Combate no disponible o concluido' });
    }

    const isHost = playerId === room.hostId;
    const shooterRole = isHost ? 'host' : 'guest';

    if (room.currentTurn !== shooterRole) {
      return res.status(400).json({ success: false, error: 'No es tu turno de disparo' });
    }

    const myFleet = isHost ? room.hostFleet! : room.guestFleet!;
    const targetFleet = isHost ? room.guestFleet! : room.hostFleet!;
    const currentShots = isHost ? room.hostShots : room.guestShots;
    const currentHits = isHost ? room.hostHits : room.guestHits;
    const currentAp = isHost ? room.hostAp : room.guestAp;

    const cmdShip =
      myFleet.find((s) => s.id === shipId && !s.isSunk) ||
      myFleet.find((s) => !s.isSunk) ||
      null;

    if (!cmdShip) {
      return res.status(400).json({ success: false, error: 'Flota eliminada' });
    }

    // Determine target coordinates and AP cost based on ability
    let targetCoords: Coordinate[] = [coordinate];
    let actionCost = calculateActionCost('attack', cmdShip);
    let actionLabel = 'Disparo';

    if (abilityType === 'double_shot') {
      actionCost = calculateActionCost('double_shot', cmdShip);
      actionLabel = 'Disparo Doble';
      const secondCoord: Coordinate =
        orientation === 'vertical'
          ? { row: coordinate.row + 1, col: coordinate.col }
          : { row: coordinate.row, col: coordinate.col + 1 };
      targetCoords = [coordinate, secondCoord].filter(isInBounds);
    } else if (abilityType === 'special' || abilityType === 'airstrike') {
      actionCost = calculateActionCost('special', cmdShip);
      if (cmdShip.type === 'carrier' || abilityType === 'airstrike') {
        actionLabel = 'Ataque Aéreo (+ 5 casillas)';
        targetCoords = [
          coordinate,
          { row: coordinate.row - 1, col: coordinate.col },
          { row: coordinate.row + 1, col: coordinate.col },
          { row: coordinate.row, col: coordinate.col - 1 },
          { row: coordinate.row, col: coordinate.col + 1 },
        ].filter(isInBounds);
      } else if (cmdShip.type === 'cruiser') {
        actionLabel = `Interdicción Rápida (${orientation === 'horizontal' ? '→' : '↓'})`;
        targetCoords = [
          coordinate,
          orientation === 'horizontal'
            ? { row: coordinate.row, col: coordinate.col + 1 }
            : { row: coordinate.row + 1, col: coordinate.col },
        ].filter(isInBounds);
      } else if (cmdShip.type === 'destroyer') {
        actionLabel = `Salva de Misiles (${orientation === 'horizontal' ? '→' : '↓'})`;
        targetCoords = [
          coordinate,
          orientation === 'horizontal'
            ? { row: coordinate.row, col: coordinate.col + 1 }
            : { row: coordinate.row + 1, col: coordinate.col },
          orientation === 'horizontal'
            ? { row: coordinate.row, col: coordinate.col + 2 }
            : { row: coordinate.row + 2, col: coordinate.col },
        ].filter(isInBounds);
      }
    }

    if (currentAp < actionCost) {
      return res.status(400).json({
        success: false,
        error: `AP insuficiente (${currentAp}/${actionCost})`,
      });
    }

    // Filter to cells not already shot
    const unshotCells = targetCoords.filter((c) => !containsCoord(currentShots, c));
    if (unshotCells.length === 0) {
      return res.status(400).json({ success: false, error: 'Todas las casillas ya fueron atacadas' });
    }

    // Process hits
    let anyHit = false;
    let anySunk = false;
    let lastHitShip: PlacedShip | null = null;

    for (const cell of unshotCells) {
      currentShots.push(cell);

      let cellHitShip: PlacedShip | null = null;
      for (const ship of targetFleet) {
        if (!ship.isSunk && containsCoord(ship.coordinates, cell)) {
          cellHitShip = ship;
          break;
        }
      }

      if (cellHitShip) {
        // Check for battleship fortification shield
        if (cellHitShip.shielded) {
          cellHitShip.shielded = false;
          room.combatLogs.unshift({
            id: `shield_absorb_${Date.now()}_${Math.random()}`,
            shooter: shooterRole === 'host' ? 'guest' : 'host',
            coordinate: cell,
            result: 'miss',
            timestamp: Date.now(),
            shipName: `🛡️ El Escudo Blindado de ${cellHitShip.name} absorbió el impacto en (${formatCoordinate(cell)})!`,
          });
        } else {
          if (!containsCoord(cellHitShip.hits, cell)) {
            cellHitShip.hits.push(cell);
          }
          if (!containsCoord(currentHits, cell)) {
            currentHits.push(cell);
          }
          anyHit = true;
          lastHitShip = cellHitShip;

          if (cellHitShip.hits.length >= cellHitShip.length) {
            cellHitShip.isSunk = true;
            anySunk = true;
          }
        }
      }
    }

    // Deduct AP
    if (isHost) room.hostAp -= actionCost;
    else room.guestAp -= actionCost;

    const remainingAp = isHost ? room.hostAp : room.guestAp;

    // Check game over
    const allSunk = areAllShipsSunk(targetFleet);
    if (allSunk) {
      room.winner = shooterRole;
      room.status = 'finished';
      room.winReason = 'annihilation';
    }

    // Create combat log
    const resultType: 'miss' | 'hit' | 'sunk' = anySunk ? 'sunk' : anyHit ? 'hit' : 'miss';
    room.combatLogs.unshift({
      id: `log_${Date.now()}_${Math.random()}`,
      shooter: shooterRole,
      coordinate,
      result: resultType,
      timestamp: Date.now(),
      shipName:
        unshotCells.length > 1
          ? `${actionLabel} (-${actionCost} AP)`
          : lastHitShip
          ? lastHitShip.name
          : undefined,
      sunk: anySunk,
    });

    // Check if player can afford ANY more actions this turn
    const oppShots = isHost ? room.guestShots : room.hostShots;
    const mCooldown = isHost ? room.hostManeuverCooldown : room.guestManeuverCooldown;
    const canContinue = canPlayerAffordAnyAction(
      remainingAp,
      myFleet,
      cmdShip.id,
      oppShots,
      mCooldown === 0
    );

    if (!room.winner && !canContinue) {
      // Auto switch turn when AP is exhausted
      room.currentTurn = isHost ? 'guest' : 'host';
      room.turnExpiresAt = Date.now() + 35000;
      if (isHost) {
        room.guestMaxAp = calculateMaxAp(room.guestFleet!);
        room.guestAp = room.guestMaxAp;
        room.guestManeuverCooldown = Math.max(0, room.guestManeuverCooldown - 1);
      } else {
        room.hostMaxAp = calculateMaxAp(room.hostFleet!);
        room.hostAp = room.hostMaxAp;
        room.hostManeuverCooldown = Math.max(0, room.hostManeuverCooldown - 1);
      }

      const nextPlayerName = isHost ? room.guestName || 'Invitado' : room.hostName;
      room.combatLogs.unshift({
        id: `auto_turn_${Date.now()}`,
        shooter: shooterRole,
        coordinate: { row: -1, col: -1 },
        result: 'miss',
        timestamp: Date.now(),
        shipName: `AP agotados. Turno cedido automáticamente a ${nextPlayerName}.`,
      });
    }

    if (room.tournamentCode) {
      const tournament = findTournament(room.tournamentCode);
      if (tournament) {
        syncTournamentProgression(tournament);
        persistTournamentsToDisk();
      }
    }

    persistRoomsToDisk();

    res.json({
      success: true,
      result: resultType,
      coordinate,
      isSunk: anySunk,
      shipName: lastHitShip?.name,
      isGameOver: allSunk,
      winner: room.winner,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 6. End Turn Manually (Boton FIN TURNO)
  app.post('/api/multiplayer/room/:code/end-turn', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId } = req.body;
    const room = findRoom(code);

    if (!room || room.status !== 'combat' || room.winner) {
      return res.status(400).json({ success: false, error: 'Combate no activo' });
    }

    const isHost = playerId === room.hostId;
    const shooterRole = isHost ? 'host' : 'guest';

    if (room.currentTurn !== shooterRole) {
      return res.status(400).json({ success: false, error: 'No es tu turno' });
    }

    // Switch turn to opponent
    room.currentTurn = isHost ? 'guest' : 'host';
    room.turnExpiresAt = Date.now() + 35000;

    if (isHost) {
      room.guestMaxAp = calculateMaxAp(room.guestFleet!);
      room.guestAp = room.guestMaxAp;
      room.guestManeuverCooldown = Math.max(0, room.guestManeuverCooldown - 1);
    } else {
      room.hostMaxAp = calculateMaxAp(room.hostFleet!);
      room.hostAp = room.hostMaxAp;
      room.hostManeuverCooldown = Math.max(0, room.hostManeuverCooldown - 1);
    }

    const nextPlayerName = isHost ? room.guestName || 'Invitado' : room.hostName;
    room.combatLogs.unshift({
      id: `turn_${Date.now()}`,
      shooter: shooterRole,
      coordinate: { row: -1, col: -1 },
      result: 'miss',
      timestamp: Date.now(),
      shipName: `Comando ${isHost ? 'Alfa' : 'Bravo'} finalizó su turno. Turno de ${nextPlayerName}.`,
    });

    persistRoomsToDisk();

    res.json({
      success: true,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 7. Repair Ship Compartment (Habilidad 3: Reparar)
  app.post('/api/multiplayer/room/:code/repair', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId, shipId } = req.body;
    const room = findRoom(code);

    if (!room || room.status !== 'combat' || room.winner) {
      return res.status(400).json({ success: false, error: 'Combate no activo' });
    }

    const isHost = playerId === room.hostId;
    const shooterRole = isHost ? 'host' : 'guest';

    if (room.currentTurn !== shooterRole) {
      return res.status(400).json({ success: false, error: 'No es tu turno' });
    }

    const myFleet = isHost ? room.hostFleet! : room.guestFleet!;
    const currentAp = isHost ? room.hostAp : room.guestAp;
    const targetShip =
      myFleet.find((s) => s.id === shipId && !s.isSunk) ||
      myFleet.find((s) => !s.isSunk && s.hits.length > 0);

    if (!targetShip || targetShip.hits.length === 0) {
      return res.status(400).json({ success: false, error: 'El buque no tiene daños para reparar' });
    }

    const cost = calculateActionCost('repair', targetShip);
    if (currentAp < cost) {
      return res.status(400).json({ success: false, error: `AP insuficiente (${currentAp}/${cost})` });
    }

    const repairedCoord = targetShip.hits.pop()!;

    if (isHost) {
      room.hostAp -= cost;
      room.guestHits = room.guestHits.filter(
        (c) => !(c.row === repairedCoord.row && c.col === repairedCoord.col)
      );
      room.guestShots = room.guestShots.filter(
        (c) => !(c.row === repairedCoord.row && c.col === repairedCoord.col)
      );
    } else {
      room.guestAp -= cost;
      room.hostHits = room.hostHits.filter(
        (c) => !(c.row === repairedCoord.row && c.col === repairedCoord.col)
      );
      room.hostShots = room.hostShots.filter(
        (c) => !(c.row === repairedCoord.row && c.col === repairedCoord.col)
      );
    }

    room.combatLogs.unshift({
      id: `repair_${Date.now()}`,
      shooter: shooterRole,
      coordinate: repairedCoord,
      result: 'miss',
      timestamp: Date.now(),
      shipName: `🔧 Buque ${targetShip.name} restauró 1 compartimiento en (${formatCoordinate(repairedCoord)}) (-${cost} AP)`,
    });

    const newAp = isHost ? room.hostAp : room.guestAp;
    const oppShots = isHost ? room.guestShots : room.hostShots;
    const mCooldown = isHost ? room.hostManeuverCooldown : room.guestManeuverCooldown;
    const canAct = canPlayerAffordAnyAction(newAp, myFleet, targetShip.id, oppShots, mCooldown === 0);

    if (!canAct) {
      room.currentTurn = isHost ? 'guest' : 'host';
      room.turnExpiresAt = Date.now() + 35000;
      if (isHost) {
        room.guestMaxAp = calculateMaxAp(room.guestFleet!);
        room.guestAp = room.guestMaxAp;
        room.guestManeuverCooldown = Math.max(0, room.guestManeuverCooldown - 1);
      } else {
        room.hostMaxAp = calculateMaxAp(room.hostFleet!);
        room.hostAp = room.hostMaxAp;
        room.hostManeuverCooldown = Math.max(0, room.hostManeuverCooldown - 1);
      }
    }

    res.json({
      success: true,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 8. Maneuver Ship (Habilidad 5: Maniobra 1 casilla)
  app.post('/api/multiplayer/room/:code/maneuver', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId, shipId, direction } = req.body;
    const room = findRoom(code);

    if (!room || room.status !== 'combat' || room.winner) {
      return res.status(400).json({ success: false, error: 'Combate no activo' });
    }

    const isHost = playerId === room.hostId;
    const shooterRole = isHost ? 'host' : 'guest';

    if (room.currentTurn !== shooterRole) {
      return res.status(400).json({ success: false, error: 'No es tu turno' });
    }

    const mCooldown = isHost ? room.hostManeuverCooldown : room.guestManeuverCooldown;
    if (mCooldown > 0) {
      return res.status(400).json({ success: false, error: 'Maniobra en enfriamiento' });
    }

    const myFleet = isHost ? room.hostFleet! : room.guestFleet!;
    const currentAp = isHost ? room.hostAp : room.guestAp;
    const targetShip =
      myFleet.find((s) => s.id === shipId && !s.isSunk) ||
      myFleet.find((s) => !s.isSunk);

    if (!targetShip) {
      return res.status(400).json({ success: false, error: 'Buque no encontrado o hundido' });
    }

    const cost = calculateActionCost('move', targetShip);
    if (currentAp < cost) {
      return res.status(400).json({ success: false, error: `AP insuficiente (${currentAp}/${cost})` });
    }

    const oppShots = isHost ? room.guestShots : room.hostShots;
    const oppHits = isHost ? room.guestHits : room.hostHits;
    const moveRes = moveShipInFleet(targetShip.id, direction as MoveDirection, myFleet, oppShots);
    if (!moveRes.moved || !moveRes.movedShip) {
      return res.status(400).json({ success: false, error: 'Movimiento bloqueado por aguas batidas o colisión' });
    }

    // Sync damaged compartment coordinates on the defense board so hit markers move with the hull
    const oldHitKeys = new Set((targetShip.hits || []).map((h) => `${h.row},${h.col}`));
    const waterMisses = oppShots.filter(
      (shot) => !containsCoord(oppHits, shot) && !oldHitKeys.has(`${shot.row},${shot.col}`)
    );
    const syncedHits = moveRes.updatedFleet.flatMap((s) => s.hits || []);
    const syncedShots = [...waterMisses, ...syncedHits];

    if (isHost) {
      room.hostFleet = moveRes.updatedFleet;
      room.guestHits = syncedHits;
      room.guestShots = syncedShots;
      room.hostAp -= cost;
      room.hostManeuverCooldown = 2;
    } else {
      room.guestFleet = moveRes.updatedFleet;
      room.hostHits = syncedHits;
      room.hostShots = syncedShots;
      room.guestAp -= cost;
      room.guestManeuverCooldown = 2;
    }

    const dirNames: Record<string, string> = {
      UP: 'Norte (↑)',
      DOWN: 'Sur (↓)',
      LEFT: 'Oeste (←)',
      RIGHT: 'Este (→)',
    };

    room.combatLogs.unshift({
      id: `move_${Date.now()}`,
      shooter: shooterRole,
      coordinate: moveRes.movedShip.coordinates[0],
      result: 'miss',
      timestamp: Date.now(),
      shipName: `Maniobra: ${targetShip.name} desplazado 1 casilla al ${dirNames[direction] || direction} (-${cost} AP)`,
    });

    const newAp = isHost ? room.hostAp : room.guestAp;
    const canAct = canPlayerAffordAnyAction(newAp, moveRes.updatedFleet, targetShip.id, syncedShots, false);
    if (!canAct) {
      room.currentTurn = isHost ? 'guest' : 'host';
      room.turnExpiresAt = Date.now() + 35000;
      if (isHost) {
        room.guestMaxAp = calculateMaxAp(room.guestFleet!);
        room.guestAp = room.guestMaxAp;
        room.guestManeuverCooldown = Math.max(0, room.guestManeuverCooldown - 1);
      } else {
        room.hostMaxAp = calculateMaxAp(room.hostFleet!);
        room.hostAp = room.hostMaxAp;
        room.hostManeuverCooldown = Math.max(0, room.hostManeuverCooldown - 1);
      }
    }

    persistRoomsToDisk();

    res.json({
      success: true,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 9. Battleship Shield Fortification (Habilidad 4: Acorazado)
  app.post('/api/multiplayer/room/:code/shield', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId, shipId } = req.body;
    const room = findRoom(code);

    if (!room || room.status !== 'combat' || room.winner) {
      return res.status(400).json({ success: false, error: 'Combate no activo' });
    }

    const isHost = playerId === room.hostId;
    const shooterRole = isHost ? 'host' : 'guest';

    if (room.currentTurn !== shooterRole) {
      return res.status(400).json({ success: false, error: 'No es tu turno' });
    }

    const myFleet = isHost ? room.hostFleet! : room.guestFleet!;
    const currentAp = isHost ? room.hostAp : room.guestAp;
    const targetShip = myFleet.find(
      (s) => s.id === shipId && !s.isSunk && s.type === 'battleship'
    );

    if (!targetShip || targetShip.shielded) {
      return res.status(400).json({ success: false, error: 'Acorazado no válido o escudo ya activo' });
    }

    const cost = calculateActionCost('special', targetShip);
    if (currentAp < cost) {
      return res.status(400).json({ success: false, error: `AP insuficiente (${currentAp}/${cost})` });
    }

    targetShip.shielded = true;
    if (isHost) room.hostAp -= cost;
    else room.guestAp -= cost;

    room.combatLogs.unshift({
      id: `shield_${Date.now()}`,
      shooter: shooterRole,
      coordinate: targetShip.coordinates[0],
      result: 'miss',
      timestamp: Date.now(),
      shipName: `🛡️ ${targetShip.name} activó Escudo Blindado (-${cost} AP)`,
    });

    const newAp = isHost ? room.hostAp : room.guestAp;
    const oppShots = isHost ? room.guestShots : room.hostShots;
    const mCooldown = isHost ? room.hostManeuverCooldown : room.guestManeuverCooldown;
    const canAct = canPlayerAffordAnyAction(newAp, myFleet, targetShip.id, oppShots, mCooldown === 0);

    if (!canAct) {
      room.currentTurn = isHost ? 'guest' : 'host';
      room.turnExpiresAt = Date.now() + 35000;
      if (isHost) {
        room.guestMaxAp = calculateMaxAp(room.guestFleet!);
        room.guestAp = room.guestMaxAp;
        room.guestManeuverCooldown = Math.max(0, room.guestManeuverCooldown - 1);
      } else {
        room.hostMaxAp = calculateMaxAp(room.hostFleet!);
        room.hostAp = room.hostMaxAp;
        room.hostManeuverCooldown = Math.max(0, room.hostManeuverCooldown - 1);
      }
    }

    persistRoomsToDisk();

    res.json({
      success: true,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 10. Sonar Sector Reconnaissance (Habilidad 4: Lancha Patrullera)
  app.post('/api/multiplayer/room/:code/sonar', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId, coordinate, shipId } = req.body;
    const room = findRoom(code);

    if (!room || room.status !== 'combat' || room.winner) {
      return res.status(400).json({ success: false, error: 'Combate no activo' });
    }

    const isHost = playerId === room.hostId;
    const shooterRole = isHost ? 'host' : 'guest';

    if (room.currentTurn !== shooterRole) {
      return res.status(400).json({ success: false, error: 'No es tu turno' });
    }

    const myFleet = isHost ? room.hostFleet! : room.guestFleet!;
    const targetFleet = isHost ? room.guestFleet! : room.hostFleet!;
    const currentAp = isHost ? room.hostAp : room.guestAp;

    const cmdShip =
      myFleet.find((s) => s.id === shipId && !s.isSunk) ||
      myFleet.find((s) => !s.isSunk && s.type === 'patrol') ||
      myFleet.find((s) => !s.isSunk);

    const cost = cmdShip ? calculateActionCost('special', cmdShip) : 5;
    if (currentAp < cost) {
      return res.status(400).json({ success: false, error: `AP insuficiente (${currentAp}/${cost})` });
    }

    if (isHost) room.hostAp -= cost;
    else room.guestAp -= cost;

    // Scan 3x3 sector
    let detected = false;
    let count = 0;
    const cells: Coordinate[] = [];
    for (let r = coordinate.row - 1; r <= coordinate.row + 1; r++) {
      for (let c = coordinate.col - 1; c <= coordinate.col + 1; c++) {
        const cell = { row: r, col: c };
        if (isInBounds(cell)) {
          cells.push(cell);
          for (const ship of targetFleet) {
            if (!ship.isSunk && containsCoord(ship.coordinates, cell)) {
              detected = true;
              count++;
            }
          }
        }
      }
    }

    room.combatLogs.unshift({
      id: `sonar_${Date.now()}`,
      shooter: shooterRole,
      coordinate,
      result: detected ? 'hit' : 'miss',
      timestamp: Date.now(),
      shipName: detected
        ? `🚨 ¡Pulso Sonar positivo en (${formatCoordinate(coordinate)})! (${count} firmas detectadas, -${cost} AP)`
        : `✅ Pulso Sonar en (${formatCoordinate(coordinate)}): Sector despejado (-${cost} AP)`,
    });

    const newAp = isHost ? room.hostAp : room.guestAp;
    const oppShots = isHost ? room.guestShots : room.hostShots;
    const mCooldown = isHost ? room.hostManeuverCooldown : room.guestManeuverCooldown;
    const canAct = canPlayerAffordAnyAction(
      newAp,
      myFleet,
      cmdShip?.id,
      oppShots,
      mCooldown === 0
    );

    if (!canAct) {
      room.currentTurn = isHost ? 'guest' : 'host';
      room.turnExpiresAt = Date.now() + 35000;
      if (isHost) {
        room.guestMaxAp = calculateMaxAp(room.guestFleet!);
        room.guestAp = room.guestMaxAp;
        room.guestManeuverCooldown = Math.max(0, room.guestManeuverCooldown - 1);
      } else {
        room.hostMaxAp = calculateMaxAp(room.hostFleet!);
        room.hostAp = room.hostMaxAp;
        room.hostManeuverCooldown = Math.max(0, room.hostManeuverCooldown - 1);
      }
    }

    persistRoomsToDisk();

    res.json({
      success: true,
      detected,
      count,
      cells,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 7. Surrender
  app.post('/api/multiplayer/room/:code/surrender', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId } = req.body;
    const room = findRoom(code);

    if (!room) {
      return res.status(404).json({ success: false, error: 'Sala no encontrada' });
    }

    const isHost = playerId === room.hostId;
    room.winner = isHost ? 'guest' : 'host';
    room.status = 'finished';
    room.winReason = 'surrender';

    room.combatLogs.unshift({
      id: `surrender_${Date.now()}`,
      shooter: isHost ? 'host' : 'guest',
      coordinate: { row: -1, col: -1 },
      result: 'miss',
      timestamp: Date.now(),
      shipName: `Comando ${isHost ? 'Alfa (Anfitrión)' : 'Bravo (Invitado)'} se ha rendido`,
    });

    if (room.tournamentCode) {
      const tournament = findTournament(room.tournamentCode);
      if (tournament) {
        syncTournamentProgression(tournament);
        persistTournamentsToDisk();
      }
    }

    persistRoomsToDisk();

    res.json({
      success: true,
      room: sanitizeRoomForPlayer(room, playerId),
    });
  });

  // 8. Heartbeat
  app.post('/api/multiplayer/room/:code/heartbeat', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId } = req.body;
    const room = findRoom(code);

    if (room) {
      if (playerId === room.hostId) room.hostLastActive = Date.now();
      if (playerId === room.guestId) room.guestLastActive = Date.now();
    }
    res.json({ success: true });
  });

  // 9. WebRTC Signaling Relay
  app.post('/api/multiplayer/room/:code/signal', (req: Request, res: Response) => {
    const { code } = req.params;
    const { playerId, type, payload } = req.body;
    const room = findRoom(code);

    if (room) {
      room.signals.push({ from: playerId, type, payload, timestamp: Date.now() });
      if (room.signals.length > 50) room.signals.shift();
    }
    res.json({ success: true });
  });

  app.get('/api/multiplayer/room/:code/signals', (req: Request, res: Response) => {
    const { code } = req.params;
    const playerId = req.query.playerId as string;
    const since = parseInt(req.query.since as string, 10) || 0;
    const room = findRoom(code);

    if (!room) return res.json({ signals: [] });

    const newSignals = room.signals.filter((s) => s.from !== playerId && s.timestamp > since);
    res.json({ signals: newSignals });
  });

  // ===========================================================================
  // CLASSROOM TOURNAMENT ENDPOINTS (/api/tournament/*)
  // ===========================================================================

  // T1. Create Tournament
  app.post('/api/tournament/create', (req: Request, res: Response) => {
    const { tournamentName, playerName, hostParticipates = true } = req.body;
    let code = generateTournamentCode();
    while (tournaments.has(code)) {
      code = generateTournamentCode();
    }

    const hostId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanHostName = playerName?.trim() || 'Profesor / Anfitrión';
    const cleanTournamentName = tournamentName?.trim() || 'Copa Naval del Salón';

    const participants: TournamentParticipant[] = [];
    if (hostParticipates) {
      participants.push({
        id: hostId,
        name: cleanHostName,
        joinedAt: Date.now(),
        lastActive: Date.now(),
        isHost: true,
      });
    }

    const tournament: TournamentState = {
      code,
      name: cleanTournamentName,
      createdAt: Date.now(),
      status: 'lobby',
      hostId,
      hostName: cleanHostName,
      participants,
      rounds: [],
      champion: null,
    };

    tournaments.set(code, tournament);
    persistTournamentsToDisk();
    console.log(`[Fleet Battle] Created tournament ${code} (${cleanTournamentName}) by ${cleanHostName}`);

    res.json({
      success: true,
      tournamentCode: code,
      playerId: hostId,
      playerName: cleanHostName,
      tournament,
    });
  });

  // T2. Join Tournament by Code
  app.post('/api/tournament/join', (req: Request, res: Response) => {
    const { tournamentCode, playerName, playerId: existingPlayerId } = req.body;
    const tournament = findTournament(tournamentCode);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: `Código de torneo "${tournamentCode || ''}" no encontrado. Verifica el código (ej. TOR-XXX).`,
      });
    }

    const cleanName = (playerName || '').trim();
    if (!cleanName && !existingPlayerId) {
      return res.status(400).json({
        success: false,
        error: 'Debes ingresar tu nombre para registrarte en el torneo.',
      });
    }

    // Check if reconnecting by ID or exact name
    const existingById = existingPlayerId
      ? tournament.participants.find((p) => p.id === existingPlayerId)
      : undefined;
    const existingByName = cleanName
      ? tournament.participants.find((p) => p.name.toLowerCase() === cleanName.toLowerCase())
      : undefined;

    if (existingPlayerId === tournament.hostId) {
      return res.json({
        success: true,
        tournamentCode: tournament.code,
        playerId: tournament.hostId,
        playerName: tournament.hostName,
        tournament,
      });
    }

    if (existingById) {
      existingById.lastActive = Date.now();
      if (cleanName) existingById.name = cleanName;
      persistTournamentsToDisk();
      return res.json({
        success: true,
        tournamentCode: tournament.code,
        playerId: existingById.id,
        playerName: existingById.name,
        tournament,
      });
    }

    if (existingByName) {
      existingByName.lastActive = Date.now();
      persistTournamentsToDisk();
      return res.json({
        success: true,
        tournamentCode: tournament.code,
        playerId: existingByName.id,
        playerName: existingByName.name,
        tournament,
      });
    }

    if (tournament.status !== 'lobby') {
      return res.status(400).json({
        success: false,
        error:
          'El sorteo del torneo ya se realizó. Si ya estabas inscrito, ingresa exactamente el mismo nombre con el que te registraste.',
      });
    }

    const newPlayerId =
      existingPlayerId || `player_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const participant: TournamentParticipant = {
      id: newPlayerId,
      name: cleanName || `Comandante ${tournament.participants.length + 1}`,
      joinedAt: Date.now(),
      lastActive: Date.now(),
      isHost: false,
    };

    tournament.participants.push(participant);
    persistTournamentsToDisk();
    console.log(`[Fleet Battle] Player ${participant.name} joined tournament ${tournament.code}`);

    res.json({
      success: true,
      tournamentCode: tournament.code,
      playerId: participant.id,
      playerName: participant.name,
      tournament,
    });
  });

  // T3. Get Tournament State (+ Optional Live Spectator Room Snapshot)
  app.get('/api/tournament/:code', (req: Request, res: Response) => {
    const { code } = req.params;
    const playerId = req.query.playerId as string | undefined;
    const spectateRoomCode = req.query.spectateRoom as string | undefined;

    const tournament = findTournament(code);
    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Torneo no encontrado' });
    }

    if (playerId) {
      const p = tournament.participants.find((item) => item.id === playerId);
      if (p) {
        p.lastActive = Date.now();
      }
    }

    if (tournament.status === 'drawn' || tournament.status === 'in_progress' || tournament.status === 'completed') {
      const changed = syncTournamentProgression(tournament);
      if (changed) {
        persistRoomsToDisk();
        persistTournamentsToDisk();
      }
    }

    let spectatorView: TournamentSpectatorView | null = null;
    if (spectateRoomCode) {
      const room = findRoom(spectateRoomCode);
      if (room) {
        let roundTitle = 'Duelo del Torneo';
        let matchId = room.tournamentMatchId || 'match';
        for (const r of tournament.rounds) {
          const found = r.matches.find((m) => m.roomCode === room.code);
          if (found) {
            roundTitle = r.title;
            matchId = found.id;
            break;
          }
        }
        spectatorView = buildSpectatorViewForRoom(room, matchId, roundTitle);
      }
    }

    res.json({
      success: true,
      tournament,
      spectatorView,
    });
  });

  // T4. Remove Participant (Host only, in Lobby)
  app.post('/api/tournament/:code/remove-player', (req: Request, res: Response) => {
    const { code } = req.params;
    const { hostId, targetPlayerId } = req.body;
    const tournament = findTournament(code);

    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Torneo no encontrado' });
    }
    if (tournament.hostId !== hostId) {
      return res.status(403).json({ success: false, error: 'Solo el anfitrión puede gestionar jugadores' });
    }
    if (tournament.status !== 'lobby') {
      return res.status(400).json({ success: false, error: 'No se pueden eliminar jugadores tras el sorteo' });
    }

    tournament.participants = tournament.participants.filter((p) => p.id !== targetPlayerId);
    persistTournamentsToDisk();

    res.json({
      success: true,
      tournament,
    });
  });

  // T5. Draw Bracket (Host only: Shuffles players, assigns BYEs, builds all rounds)
  app.post('/api/tournament/:code/draw', (req: Request, res: Response) => {
    const { code } = req.params;
    const { hostId } = req.body;
    const tournament = findTournament(code);

    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Torneo no encontrado' });
    }
    if (tournament.hostId !== hostId) {
      return res.status(403).json({ success: false, error: 'Solo el anfitrión puede realizar el sorteo' });
    }
    if (tournament.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'No se puede volver a sortear mientras hay combates en curso.',
      });
    }
    if (tournament.participants.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Se necesitan al menos 2 jugadores registrados en el lobby para realizar el sorteo.',
      });
    }

    tournament.rounds = buildBracketFromParticipants(tournament.participants);
    tournament.status = 'drawn';
    tournament.drawnAt = Date.now();
    tournament.champion = null;

    syncTournamentProgression(tournament);
    persistTournamentsToDisk();

    res.json({
      success: true,
      tournament,
    });
  });

  // T6. Start Tournament Combats (Spins up simultaneous ServerRooms for all ready matches)
  app.post('/api/tournament/:code/start', (req: Request, res: Response) => {
    const { code } = req.params;
    const { hostId } = req.body;
    const tournament = findTournament(code);

    if (!tournament) {
      return res.status(404).json({ success: false, error: 'Torneo no encontrado' });
    }
    if (tournament.hostId !== hostId) {
      return res.status(403).json({ success: false, error: 'Solo el anfitrión puede iniciar las batallas' });
    }
    if (tournament.rounds.length === 0) {
      return res.status(400).json({ success: false, error: 'Primero debes realizar el sorteo de llaves' });
    }

    tournament.status = 'in_progress';
    tournament.startedAt = Date.now();

    syncTournamentProgression(tournament);
    persistRoomsToDisk();
    persistTournamentsToDisk();

    res.json({
      success: true,
      tournament,
    });
  });

  // Mount Vite or static
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Fleet Battle] Server active on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Fleet Battle] Server start error:', err);
});
