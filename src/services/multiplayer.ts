import {
  Coordinate,
  PlacedShip,
  MultiplayerRoomState,
  TournamentState,
  TournamentSpectatorView,
} from '../types';

/**
 * Computes a deterministic SHA-256 cryptographic hash of the placed fleet [REQ-114]
 * Acts as an anti-cheat commitment proof.
 */
export async function computeFleetHash(fleet: PlacedShip[]): Promise<string> {
  try {
    const simplified = fleet
      .map((s) => ({
        type: s.type,
        coords: [...s.coordinates].sort((a, b) => a.row - b.row || a.col - b.col),
      }))
      .sort((a, b) => a.type.localeCompare(b.type));

    const jsonString = JSON.stringify(simplified);
    const msgBuffer = new TextEncoder().encode(jsonString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (err) {
    console.error('Error computing fleet SHA-256:', err);
    return `hash_${Date.now()}`;
  }
}

/**
 * Normalizes user-entered room codes or URLs:
 * - "NAV-XYZ" -> "NAV-XYZ"
 * - "XYZ" -> "NAV-XYZ"
 * - "nav-xyz" -> "NAV-XYZ"
 * - "NAV XYZ" -> "NAV-XYZ"
 * - "NAVXYZ" -> "NAV-XYZ"
 * - "https://domain.com/?room=NAV-XYZ" -> "NAV-XYZ"
 */
export function normalizeRoomCode(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  // Extract room parameter if a full URL or query string was pasted
  try {
    if (str.includes('room=')) {
      const match = str.match(/[?&]room=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        str = match[1];
      }
    }
  } catch {
    // fallback
  }

  // Remove hashes, spaces, and non-alphanumeric except hyphen
  str = str.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();

  if (!str) return '';

  if (str.startsWith('NAV-')) {
    return str;
  }

  if (str.startsWith('NAV')) {
    return 'NAV-' + str.substring(3).replace(/^-+/, '');
  }

  // Suffix only (e.g. "GSQ" or "842")
  return 'NAV-' + str;
}

/**
 * Normalizes user-entered tournament codes or URLs:
 * - "TOR-XYZ" -> "TOR-XYZ"
 * - "XYZ" -> "TOR-XYZ"
 * - "https://domain.com/?tournament=TOR-XYZ" -> "TOR-XYZ"
 */
export function normalizeTournamentCode(raw: string): string {
  if (!raw) return '';
  let str = raw.trim();

  try {
    if (str.includes('tournament=')) {
      const match = str.match(/[?&]tournament=([a-zA-Z0-9_-]+)/i);
      if (match && match[1]) {
        str = match[1];
      }
    }
  } catch {
    // fallback
  }

  str = str.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();

  if (!str) return '';

  if (str.startsWith('TOR-')) {
    return str;
  }

  if (str.startsWith('TOR')) {
    return 'TOR-' + str.substring(3).replace(/^-+/, '');
  }

  return 'TOR-' + str;
}

class MultiplayerService {
  private broadcastChannels = new Map<string, BroadcastChannel>();

  private getBroadcastChannel(channelKey: string): BroadcastChannel | null {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
    if (!this.broadcastChannels.has(channelKey)) {
      this.broadcastChannels.set(channelKey, new BroadcastChannel(`fleet_${channelKey}`));
    }
    return this.broadcastChannels.get(channelKey)!;
  }

  public notifyLocalTabs(roomCode: string, event: string, payload: any) {
    const clean = normalizeRoomCode(roomCode);
    const channel = this.getBroadcastChannel(`room_${clean}`);
    if (channel) {
      channel.postMessage({ event, payload, timestamp: Date.now() });
    }
  }

  public subscribeLocalTabs(roomCode: string, callback: (event: string, payload: any) => void) {
    const clean = normalizeRoomCode(roomCode);
    const channel = this.getBroadcastChannel(`room_${clean}`);
    if (!channel) return () => {};

    const handler = (ev: MessageEvent) => {
      if (ev.data && ev.data.event) {
        callback(ev.data.event, ev.data.payload);
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
    };
  }

  public notifyTournamentLocalTabs(tournamentCode: string, event: string, payload?: any) {
    const clean = normalizeTournamentCode(tournamentCode);
    const channel = this.getBroadcastChannel(`tour_${clean}`);
    if (channel) {
      channel.postMessage({ event, payload, timestamp: Date.now() });
    }
  }

  public subscribeTournamentLocalTabs(
    tournamentCode: string,
    callback: (event: string, payload: any) => void
  ) {
    const clean = normalizeTournamentCode(tournamentCode);
    const channel = this.getBroadcastChannel(`tour_${clean}`);
    if (!channel) return () => {};

    const handler = (ev: MessageEvent) => {
      if (ev.data && ev.data.event) {
        callback(ev.data.event, ev.data.payload);
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      channel.removeEventListener('message', handler);
    };
  }

  public async createRoom(playerName: string): Promise<{ success: boolean; roomCode: string; playerId: string }> {
    const res = await fetch('/api/multiplayer/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerName }),
    });
    if (!res.ok) {
      throw new Error('Error al crear sala multijugador');
    }
    return res.json();
  }

  public async joinRoom(roomCode: string, playerName: string, playerId?: string): Promise<{ success: boolean; roomCode: string; playerId: string }> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch('/api/multiplayer/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomCode: clean, playerName, playerId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudo conectar a la sala');
    }
    return data;
  }

  public async getRoom(roomCode: string, playerId: string): Promise<MultiplayerRoomState> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}?playerId=${encodeURIComponent(playerId)}`);
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Sala no encontrada');
    }
    return data.room;
  }

  public async submitReady(roomCode: string, playerId: string, fleet: PlacedShip[]): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const fleetHash = await computeFleetHash(fleet);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/ready`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, fleet, fleetHash }),
    });
    this.notifyLocalTabs(clean, 'PLAYER_READY', { playerId });
    return res.json();
  }

  public async fireShot(
    roomCode: string,
    playerId: string,
    coordinate: Coordinate,
    options?: {
      abilityType?: string;
      shipId?: string | null;
      orientation?: string;
    }
  ): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/fire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId,
        coordinate,
        abilityType: options?.abilityType || 'attack',
        shipId: options?.shipId,
        orientation: options?.orientation || 'horizontal',
      }),
    });
    const data = await res.json();
    this.notifyLocalTabs(clean, 'SHOT_FIRED', {
      playerId,
      coordinate,
      result: data.result,
      abilityType: options?.abilityType,
    });
    return data;
  }

  public async endTurn(roomCode: string, playerId: string): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/end-turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    const data = await res.json();
    this.notifyLocalTabs(clean, 'END_TURN', { playerId });
    return data;
  }

  public async repair(roomCode: string, playerId: string, shipId: string): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/repair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, shipId }),
    });
    const data = await res.json();
    this.notifyLocalTabs(clean, 'REPAIR', { playerId, shipId });
    return data;
  }

  public async maneuver(
    roomCode: string,
    playerId: string,
    shipId: string,
    direction: string
  ): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/maneuver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, shipId, direction }),
    });
    const data = await res.json();
    this.notifyLocalTabs(clean, 'MANEUVER', { playerId, shipId, direction });
    return data;
  }

  public async activateShield(roomCode: string, playerId: string, shipId: string): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/shield`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, shipId }),
    });
    const data = await res.json();
    this.notifyLocalTabs(clean, 'SHIELD', { playerId, shipId });
    return data;
  }

  public async sonar(
    roomCode: string,
    playerId: string,
    coordinate: Coordinate,
    shipId?: string | null
  ): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/sonar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, coordinate, shipId }),
    });
    const data = await res.json();
    this.notifyLocalTabs(clean, 'SONAR', { playerId, coordinate });
    return data;
  }

  public async useAbility(roomCode: string, playerId: string, ability: string, coordinate: Coordinate): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/ability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, ability, coordinate }),
    });
    const data = await res.json();
    this.notifyLocalTabs(clean, 'ABILITY_USED', { playerId, ability, coordinate });
    return data;
  }

  public async surrender(roomCode: string, playerId: string): Promise<any> {
    const clean = normalizeRoomCode(roomCode);
    const res = await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/surrender`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    });
    this.notifyLocalTabs(clean, 'SURRENDER', { playerId });
    return res.json();
  }

  public async sendHeartbeat(roomCode: string, playerId: string): Promise<void> {
    try {
      const clean = normalizeRoomCode(roomCode);
      await fetch(`/api/multiplayer/room/${encodeURIComponent(clean)}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch {
      // ignore transient network glitches
    }
  }

  // ===========================================================================
  // CLASSROOM TOURNAMENT CLIENT METHODS
  // ===========================================================================

  public async createTournament(
    tournamentName: string,
    playerName: string,
    hostParticipates: boolean = true
  ): Promise<{
    success: boolean;
    tournamentCode: string;
    playerId: string;
    playerName: string;
    tournament: TournamentState;
  }> {
    const res = await fetch('/api/tournament/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentName, playerName, hostParticipates }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al crear el torneo');
    }
    return data;
  }

  public async joinTournament(
    tournamentCode: string,
    playerName: string,
    playerId?: string
  ): Promise<{
    success: boolean;
    tournamentCode: string;
    playerId: string;
    playerName: string;
    tournament: TournamentState;
  }> {
    const clean = normalizeTournamentCode(tournamentCode);
    const res = await fetch('/api/tournament/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tournamentCode: clean, playerName, playerId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudo ingresar al torneo');
    }
    this.notifyTournamentLocalTabs(clean, 'PLAYER_JOINED', { playerName });
    return data;
  }

  public async getTournament(
    tournamentCode: string,
    playerId?: string,
    spectateRoom?: string | null
  ): Promise<{
    tournament: TournamentState;
    spectatorView: TournamentSpectatorView | null;
  }> {
    const clean = normalizeTournamentCode(tournamentCode);
    const params = new URLSearchParams();
    if (playerId) params.set('playerId', playerId);
    if (spectateRoom) params.set('spectateRoom', spectateRoom);

    const res = await fetch(
      `/api/tournament/${encodeURIComponent(clean)}?${params.toString()}`
    );
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Torneo no encontrado');
    }
    return {
      tournament: data.tournament,
      spectatorView: data.spectatorView || null,
    };
  }

  public async removeTournamentPlayer(
    tournamentCode: string,
    hostId: string,
    targetPlayerId: string
  ): Promise<TournamentState> {
    const clean = normalizeTournamentCode(tournamentCode);
    const res = await fetch(`/api/tournament/${encodeURIComponent(clean)}/remove-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId, targetPlayerId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'No se pudo eliminar al participante');
    }
    this.notifyTournamentLocalTabs(clean, 'PLAYER_REMOVED', { targetPlayerId });
    return data.tournament;
  }

  public async drawTournamentBracket(
    tournamentCode: string,
    hostId: string
  ): Promise<TournamentState> {
    const clean = normalizeTournamentCode(tournamentCode);
    const res = await fetch(`/api/tournament/${encodeURIComponent(clean)}/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al realizar el sorteo de llaves');
    }
    this.notifyTournamentLocalTabs(clean, 'BRACKET_DRAWN', {});
    return data.tournament;
  }

  public async startTournamentMatches(
    tournamentCode: string,
    hostId: string
  ): Promise<TournamentState> {
    const clean = normalizeTournamentCode(tournamentCode);
    const res = await fetch(`/api/tournament/${encodeURIComponent(clean)}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Error al iniciar las batallas del torneo');
    }
    this.notifyTournamentLocalTabs(clean, 'TOURNAMENT_STARTED', {});
    return data.tournament;
  }
}

export const multiplayerService = new MultiplayerService();
