import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  AchievementId,
  Coordinate,
  PlacedShip,
  ShotRecord,
  MultiplayerRoomState,
  MultiplayerRole,
  TacticalAbilityType,
  MoveDirection,
  SalvoOrientation,
  SonarSectorOverlay,
} from '../types';
import { BoardGrid } from './BoardGrid';
import { FleetStatusPanel } from './FleetStatusPanel';
import { TacticalAbilitiesBar } from './TacticalAbilitiesBar';
import { AvatarMood, CommanderSidebarCard } from './CommanderAvatar';
import { calculateAccuracy } from '../engine/combat';
import { formatCoordinate, CLASSIC_FLEET_CONFIG } from '../utils/coordinates';
import { sound } from '../services/audio';
import { multiplayerService } from '../services/multiplayer';
import {
  Users,
  Wifi,
  Clock,
  Flag,
  Flame,
  Waves,
  ShieldCheck,
  Activity,
  Radio,
  Volume2,
  VolumeX,
  Trophy,
} from 'lucide-react';

interface MultiplayerCombatViewProps {
  roomCode: string;
  playerId: string;
  role: MultiplayerRole;
  playerFleet: PlacedShip[];
  soundEnabled: boolean;
  sfxVolume?: number;
  onToggleSound: () => void;
  onUpdateVolume?: (vol: number) => void;
  onSurrenderClick: () => void;
  onReturnToMenu: () => void;
  showCoordinates: boolean;
  radarPulse: boolean;
  screenShakeEnabled: boolean;
  onMatchEnd: (isVictory: boolean, stats: any) => void;
  onOpenResultsModal?: () => void;
  onAchievementProgress?: (
    updates: Partial<Record<AchievementId, { add?: number; setMax?: number }>>
  ) => void;
}

export const MultiplayerCombatView: React.FC<MultiplayerCombatViewProps> = ({
  roomCode,
  playerId,
  role,
  playerFleet,
  soundEnabled,
  sfxVolume = 0.5,
  onToggleSound,
  onUpdateVolume,
  onSurrenderClick,
  onReturnToMenu,
  showCoordinates,
  radarPulse,
  screenShakeEnabled,
  onMatchEnd,
  onOpenResultsModal,
  onAchievementProgress,
}) => {
  const [room, setRoom] = useState<MultiplayerRoomState | null>(null);
  const [isFiring, setIsFiring] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(35);
  const [screenShake, setScreenShake] = useState(false);
  const [latencyMs, setLatencyMs] = useState(24);
  const [activeAbility, setActiveAbility] = useState<TacticalAbilityType | null>('attack');
  const [usedAbility, setUsedAbility] = useState<TacticalAbilityType | null>(null);
  const [sonarNotice, setSonarNotice] = useState<string | null>(null);
  const [commandShipId, setCommandShipId] = useState<string | null>(null);
  const [salvoOrientation, setSalvoOrientation] = useState<SalvoOrientation>('horizontal');
  const [sonarOverlay, setSonarOverlay] = useState<SonarSectorOverlay | null>(null);

  const prevOpponentShotsLenRef = useRef(0);
  const isMatchEndedRef = useRef(false);

  // Poll room state
  const syncRoom = useCallback(async () => {
    try {
      const start = Date.now();
      const updated = await multiplayerService.getRoom(roomCode, playerId);
      const ping = Date.now() - start;
      setLatencyMs(Math.max(12, Math.min(120, ping)));
      setRoom(updated);

      // Check if opponent fired a new shot
      if (updated.opponentShots.length > prevOpponentShotsLenRef.current) {
        prevOpponentShotsLenRef.current = updated.opponentShots.length;
        const lastShot = updated.opponentShots[updated.opponentShots.length - 1];
        const isHit = updated.opponentHits.some((h) => h.row === lastShot.row && h.col === lastShot.col);

        if (isHit) {
          sound.playHit();
          if (screenShakeEnabled) {
            setScreenShake(true);
            setTimeout(() => setScreenShake(false), 450);
          }
        } else {
          sound.playSplash();
        }
      }

      // Check game over
      if (updated.status === 'finished' && updated.winner && !isMatchEndedRef.current) {
        isMatchEndedRef.current = true;
        const isWinner = updated.winner === role;
        if (isWinner) sound.playVictory();
        else sound.playDefeat();

        onMatchEnd(isWinner, {
          shots: updated.myShots.length,
          hits: updated.myHits.length,
          turns: updated.myShots.length + updated.opponentShots.length,
          opponentSunkCount: updated.opponentSunkShips?.length || 0,
          playerName: role === 'host' ? updated.hostName : (updated.guestName || 'Invitado'),
          opponentName: role === 'host' ? (updated.guestName || 'Invitado') : updated.hostName,
          playerFleet:
            updated.myFleet && updated.myFleet.length > 0 ? updated.myFleet : playerFleet,
        });
      }
    } catch (err) {
      console.error('Multiplayer polling error:', err);
    }
  }, [roomCode, playerId, role, screenShakeEnabled, onMatchEnd, playerFleet]);

  useEffect(() => {
    syncRoom();
    const interval = setInterval(syncRoom, 850);
    const heartbeat = setInterval(() => {
      multiplayerService.sendHeartbeat(roomCode, playerId);
    }, 5000);

    // Also listen to local tab broadcast events for immediate sync
    const unsubscribe = multiplayerService.subscribeLocalTabs(roomCode, () => {
      syncRoom();
    });

    return () => {
      clearInterval(interval);
      clearInterval(heartbeat);
      unsubscribe();
    };
  }, [syncRoom, roomCode, playerId]);

  // Turn countdown timer
  useEffect(() => {
    if (!room || room.status !== 'combat' || room.winner) return;

    const timer = setInterval(() => {
      if (room.turnExpiresAt > 0) {
        const diff = Math.max(0, Math.ceil((room.turnExpiresAt - Date.now()) / 1000));
        setSecondsRemaining(diff);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [room]);

  // Derive player fleet from authoritative server state (room.myFleet) with fallback to initial playerFleet
  const updatedPlayerFleet = React.useMemo(() => {
    const baseFleet =
      room?.myFleet && room.myFleet.length > 0 ? room.myFleet : playerFleet;
    const oppHits = room?.opponentHits || [];
    return baseFleet.map((ship) => {
      const hitsOnShip =
        Array.isArray(ship.hits) && ship.hits.length > 0
          ? ship.hits
          : oppHits.filter((h: Coordinate) =>
              ship.coordinates.some((sc) => sc.row === h.row && sc.col === h.col)
            );
      return {
        ...ship,
        hits: hitsOnShip,
        isSunk: Boolean(ship.isSunk || hitsOnShip.length >= ship.length),
        shielded: Boolean(ship.shielded),
      };
    });
  }, [room?.myFleet, room?.opponentHits, playerFleet]);

  // Keep commandShipId pointing to an afloat ship
  useEffect(() => {
    if (updatedPlayerFleet.length > 0) {
      const current = updatedPlayerFleet.find((s) => s.id === commandShipId && !s.isSunk);
      if (!current) {
        const firstAlive = updatedPlayerFleet.find((s) => !s.isSunk);
        if (firstAlive) {
          setCommandShipId(firstAlive.id);
        }
      }
    }
  }, [updatedPlayerFleet, commandShipId]);

  const isMyTurn =
    room?.currentTurn === role && room?.status === 'combat' && !room?.winner && !isFiring;

  const activeCommandShip =
    updatedPlayerFleet.find((s) => s.id === commandShipId && !s.isSunk) ||
    updatedPlayerFleet.find((s) => !s.isSunk) ||
    null;

  // Handle End Turn manually
  const handleEndTurn = async () => {
    if (!isMyTurn || isFiring) return;
    try {
      sound.playClick();
      setIsFiring(true);
      const res = await multiplayerService.endTurn(roomCode, playerId);
      if (res?.room) setRoom(res.room);
      await syncRoom();
    } catch (err) {
      console.error('Error ending turn:', err);
    } finally {
      setIsFiring(false);
    }
  };

  // Handle Repair Command Ship
  const handleRepairCommandShip = async () => {
    if (!isMyTurn || isFiring || !activeCommandShip) return;
    try {
      sound.playClick();
      setIsFiring(true);
      const res = await multiplayerService.repair(roomCode, playerId, activeCommandShip.id);
      if (res?.room) {
        setRoom(res.room);
        onAchievementProgress?.({ combat_engineer: { add: 1 } });
      }
      await syncRoom();
    } catch (err: any) {
      console.error('Error repairing ship:', err);
    } finally {
      setIsFiring(false);
    }
  };

  // Handle Move Command Ship
  const handleMoveCommandShip = async (dir: MoveDirection) => {
    if (!isMyTurn || isFiring || !activeCommandShip) return;
    try {
      sound.playRotate();
      setIsFiring(true);
      const res = await multiplayerService.maneuver(roomCode, playerId, activeCommandShip.id, dir);
      if (res?.room) {
        setRoom(res.room);
        onAchievementProgress?.({ evasive_helmsman: { add: 1 } });
      } else if (res && !res.success && res.error) {
        setSonarNotice(`⚠️ ${res.error}`);
        setTimeout(() => setSonarNotice(null), 3500);
      }
      await syncRoom();
    } catch (err: any) {
      console.error('Error maneuvering ship:', err);
    } finally {
      setIsFiring(false);
    }
  };

  // Handle Immediate Special (Battleship Shield)
  const handleActivateSpecialImmediate = async () => {
    if (!isMyTurn || isFiring || !activeCommandShip) return;
    try {
      sound.playClick();
      setIsFiring(true);
      const res = await multiplayerService.activateShield(roomCode, playerId, activeCommandShip.id);
      if (res?.room) {
        setRoom(res.room);
        onAchievementProgress?.({ ironclad_shield: { add: 1 } });
      }
      await syncRoom();
    } catch (err: any) {
      console.error('Error activating shield:', err);
    } finally {
      setIsFiring(false);
    }
  };

  // Handle firing / targeting on enemy board
  const handleFire = async (coord: Coordinate) => {
    if (!isMyTurn || !room || isFiring) return;

    const cmdShip =
      updatedPlayerFleet.find((s) => s.id === commandShipId && !s.isSunk) ||
      updatedPlayerFleet.find((s) => !s.isSunk);

    // Sonar check (either mode === 'sonar' or mode === 'special' on patrol boat)
    if (activeAbility === 'sonar' || (activeAbility === 'special' && cmdShip?.type === 'patrol')) {
      try {
        setIsFiring(true);
        sound.playTacticalSonar();
        const res = await multiplayerService.sonar(roomCode, playerId, coord, cmdShip?.id);
        setActiveAbility('attack');
        setSonarOverlay({
          center: coord,
          cells: res.cells || [],
          detected: res.detected,
          timestamp: Date.now(),
        });
        if (res.detected) {
          setSonarNotice(`¡Señal acústica detectada en (${formatCoordinate(coord)})! (${res.count} firmas)`);
          onAchievementProgress?.({ acoustic_eye: { add: 1 } });
        } else {
          setSonarNotice(`Cuadrante (${formatCoordinate(coord)}) despejado. Sin firmas acústicas.`);
        }
        setTimeout(() => setSonarNotice(null), 5000);
        await syncRoom();
      } catch (err: any) {
        console.error(err);
      } finally {
        setIsFiring(false);
      }
      return;
    }

    // Normal, Double, or Special Offense (Carrier cross, Cruiser line, Destroyer line)
    const isSpecialOffense = activeAbility === 'special' || activeAbility === 'airstrike';
    const isDouble = activeAbility === 'double_shot';

    if (isSpecialOffense || isDouble) {
      sound.playArtilleryWhistle();
    } else {
      // Don't fire on already shot cells
      if (room.myShots.some((s: Coordinate) => s.row === coord.row && s.col === coord.col)) {
        return;
      }
      sound.playCannonShot();
    }

    try {
      setIsFiring(true);
      const usedMode = activeAbility || 'attack';
      const res = await multiplayerService.fireShot(roomCode, playerId, coord, {
        abilityType: usedMode,
        shipId: cmdShip?.id,
        orientation: salvoOrientation,
      });

      const achUpdates: Partial<Record<AchievementId, { add?: number; setMax?: number }>> = {};
      if (usedMode === 'double_shot' || (usedMode === 'special' && cmdShip?.type === 'cruiser')) {
        achUpdates.coordinated_salvo = { add: 1 };
      } else if (
        (usedMode === 'special' || usedMode === 'airstrike') &&
        (cmdShip?.type === 'carrier' || cmdShip?.type === 'destroyer')
      ) {
        achUpdates.sky_of_fire = { add: 1 };
      }

      if (res.result === 'sunk') {
        sound.playSunk();
        achUpdates.first_sunk = { setMax: 1 };
        achUpdates.sea_hunter_20 = { add: 1 };
      } else if (res.result === 'hit') {
        sound.playHit();
      } else {
        sound.playSplash();
      }

      if (Object.keys(achUpdates).length > 0) {
        onAchievementProgress?.(achUpdates);
      }

      if (activeAbility !== 'attack') {
        setActiveAbility('attack');
      }

      await syncRoom();
    } catch (err) {
      console.error('Error firing shot:', err);
    } finally {
      setIsFiring(false);
    }
  };

  // Build clean, safe representation of opponent sunk ships for Radar grid
  const enemySunkShipsForGrid: PlacedShip[] = React.useMemo(() => {
    return (room?.opponentSunkShips || []).map((s) => ({
      id: s.id,
      type: s.type,
      name: s.name,
      length: s.length,
      orientation: s.orientation,
      coordinates: s.coordinates || [],
      hits: Array.isArray(s.hits) && s.hits.length > 0 ? s.hits : [...(s.coordinates || [])],
      isSunk: true,
      shielded: false,
    }));
  }, [room?.opponentSunkShips]);

  // Full opponent fleet status: all 5 classic ships with sunk state mapped
  const opponentFleetDisplay: PlacedShip[] = React.useMemo(() => {
    return CLASSIC_FLEET_CONFIG.map((cfg) => {
      const sunk = room?.opponentSunkShips?.find((s) => s.type === cfg.id);
      if (sunk) {
        return {
          id: sunk.id,
          type: sunk.type,
          name: sunk.name,
          length: sunk.length,
          orientation: sunk.orientation,
          coordinates: sunk.coordinates || [],
          hits: Array.isArray(sunk.hits) && sunk.hits.length > 0 ? sunk.hits : [...(sunk.coordinates || [])],
          isSunk: true,
          shielded: false,
        };
      }
      return {
        id: `opp_${cfg.id}`,
        type: cfg.id,
        name: cfg.name,
        length: cfg.length,
        orientation: 'horizontal',
        coordinates: [],
        hits: [],
        isSunk: false,
        shielded: false,
      };
    });
  }, [room?.opponentSunkShips]);

  const accuracy = room ? calculateAccuracy(room.myHits.length, room.myShots.length) : 0;
  const opponentName = role === 'host' ? room?.guestName || 'Esperando rival...' : room?.hostName;
  const myName = role === 'host' ? room?.hostName : room?.guestName;

  const latestLog = room?.combatLogs?.[0];
  let mpPlayerMood: AvatarMood = 'calm';
  let mpEnemyMood: AvatarMood = 'calm';
  if (room?.winner) {
    mpPlayerMood = room.winner === role ? 'victory' : 'under_attack';
    mpEnemyMood = room.winner === role ? 'under_attack' : 'victory';
  } else if (screenShake) {
    mpPlayerMood = 'under_attack';
    mpEnemyMood = 'victory';
  } else if (latestLog && (latestLog.result === 'hit' || latestLog.result === 'sunk')) {
    if (latestLog.shooter === role) {
      mpPlayerMood = 'victory';
      mpEnemyMood = 'under_attack';
    } else {
      mpPlayerMood = 'under_attack';
      mpEnemyMood = 'victory';
    }
  }

  return (
    <div
      className={`w-full max-w-[1720px] mx-auto px-2 sm:px-4 py-2 ${
        screenShake ? 'animate-screen-shake' : ''
      }`}
    >
      {/* Slim Unified Top Operations & Turn Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/90">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Sala P2P: {roomCode}
              </h2>
              <span className="text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                <span>{latencyMs}ms</span>
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 font-mono tabular-nums">
              <span>{myName} (Tú)</span>
              <span>vs</span>
              <span className="text-cyan-300 font-semibold">{opponentName}</span>
              <span>·</span>
              <span>
                Precisión: <strong className="text-slate-200">{accuracy}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Center Turn & Timer Badge */}
        <div
          className={`px-3 py-1.5 rounded-xl border flex items-center gap-2.5 transition-colors shadow-md ${
            room?.status === 'placement' || room?.status === 'waiting'
              ? 'bg-amber-950/75 border-amber-500/60 text-amber-200'
              : isMyTurn
              ? 'bg-cyan-950/75 border-cyan-500/60 text-cyan-200'
              : 'bg-amber-950/75 border-amber-500/60 text-amber-200'
          }`}
        >
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              room?.status === 'placement' || room?.status === 'waiting'
                ? 'bg-amber-400 animate-ping'
                : isMyTurn
                ? 'bg-cyan-400 animate-pulse'
                : 'bg-amber-400 animate-ping'
            }`}
          />
          <div className="text-xs flex items-center gap-2">
            {room?.status === 'placement' || room?.status === 'waiting' ? (
              <span className="font-bold uppercase tracking-wider">
                Esperando despliegue de flota de {opponentName}...
              </span>
            ) : (
              <>
                <span className="font-bold uppercase tracking-wider">
                  {isMyTurn ? '¡Tu Turno de Disparo!' : `Turno de ${opponentName}`}
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950/80 border border-slate-700 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>{secondsRemaining}s</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Security & Action Controls */}
        <div className="flex items-center gap-1.5">
          {room?.tournamentCode && (
            <button
              type="button"
              onClick={onReturnToMenu}
              className="py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ver cuadro de llaves del torneo en vivo"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Ver Llaves</span>
            </button>
          )}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3 h-3" />
            <span>SHA-256</span>
          </div>

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

          {room?.status === 'finished' ? (
            <button
              type="button"
              onClick={onOpenResultsModal}
              className="py-1.5 px-2.5 rounded-lg bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Trophy className="w-3.5 h-3.5 text-cyan-400" />
              <span>Resultados</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onSurrenderClick}
              className="py-1.5 px-2.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Rendirse</span>
            </button>
          )}
        </div>
      </div>

      {/* Sonar alert notice if activated */}
      {sonarNotice && (
        <div className="mb-2 py-1.5 px-3 rounded-lg bg-cyan-950 border border-cyan-500 text-xs text-cyan-200 flex items-center gap-2 shadow-md animate-fade-in">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
          <span>{sonarNotice}</span>
        </div>
      )}

      {/* 3-COLUMN SINGLE-SCREEN TACTICAL LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[235px_1fr_235px] xl:grid-cols-[255px_1fr_255px] gap-3 items-start">
        {/* LEFT SIDEBAR: Player Commander + Tactical Support + Player Fleet */}
        <div className="flex flex-col gap-2.5 order-2 lg:order-1">
          <CommanderSidebarCard
            character="navy_seal"
            mood={mpPlayerMood}
            fleet={updatedPlayerFleet}
            isActiveTurn={isMyTurn}
            isEnemy={false}
            labelOverride={myName ? `${myName} (SEAL)` : 'Navy SEAL'}
          />

          <TacticalAbilitiesBar
            playerFleet={updatedPlayerFleet}
            aiShots={room?.opponentShots || []}
            maneuverCooldown={room?.maneuverCooldown ?? 0}
            commandShipId={commandShipId}
            onSelectCommandShip={(id) => setCommandShipId(id)}
            currentAp={room?.currentAp ?? 6}
            maxAp={room?.maxAp ?? 6}
            activeTargeting={activeAbility}
            onSelectAbility={setActiveAbility}
            onMoveCommandShip={handleMoveCommandShip}
            onRepairCommandShip={handleRepairCommandShip}
            onActivateSpecialImmediate={handleActivateSpecialImmediate}
            onEndTurn={handleEndTurn}
            salvoOrientation={salvoOrientation}
            onToggleSalvoOrientation={() =>
              setSalvoOrientation((prev: SalvoOrientation) =>
                prev === 'horizontal' ? 'vertical' : 'horizontal'
              )
            }
            isPlayerTurn={isMyTurn}
            disabled={!isMyTurn || isFiring}
            compact={true}
          />

          <FleetStatusPanel
            title="Estado de Tu Flota"
            ships={updatedPlayerFleet}
            isEnemy={false}
            compact={true}
          />
        </div>

        {/* CENTER ARENA: Dual Grids + Slim Bitácora */}
        <div className="flex flex-col gap-2.5 order-1 lg:order-2 min-w-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {/* Radar 1: Enemy Radar */}
            <div className="w-full bg-slate-900/75 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-xl backdrop-blur flex flex-col items-center">
              <BoardGrid
                title="Radar Táctico Rival"
                subtitle={
                  isMyTurn
                    ? activeAbility === 'double_shot'
                      ? 'Disparo Doble: haz clic en casilla base'
                      : activeAbility === 'special' || activeAbility === 'airstrike'
                      ? 'Ataque Especial: selecciona cuadrante'
                      : activeAbility === 'sonar'
                      ? 'Sonar: haz clic para escanear sector 3×3'
                      : 'Haz clic para disparar'
                    : 'Esperando turno del rival...'
                }
                ships={enemySunkShipsForGrid}
                shots={room?.myShots || []}
                hits={room?.myHits || []}
                interactive={isMyTurn}
                onCellClick={handleFire}
                hideUndamagedShips={true}
                showCoordinates={showCoordinates}
                radarPulse={radarPulse}
                disabled={!isMyTurn || isFiring}
                compact={true}
                sonarOverlay={sonarOverlay}
              />
            </div>

            {/* Radar 2: Player Fleet */}
            <div className="w-full bg-slate-900/75 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-xl backdrop-blur flex flex-col items-center">
              <BoardGrid
                title="Mi Flota — Defensa"
                subtitle={commandShipId ? 'Puesto de Mando activo' : 'Tus buques desplegados'}
                ships={updatedPlayerFleet}
                shots={room?.opponentShots || []}
                hits={room?.opponentHits || []}
                interactive={isMyTurn}
                hideUndamagedShips={false}
                showCoordinates={showCoordinates}
                radarPulse={false}
                compact={true}
                commandShipId={commandShipId}
                onSelectCommandShip={(id) => setCommandShipId(id)}
                onMoveCommandShip={handleMoveCommandShip}
                currentAp={room?.currentAp ?? 6}
                maneuverCooldown={room?.maneuverCooldown ?? 0}
                isPlayerTurn={isMyTurn}
                disabled={!isMyTurn || isFiring}
              />
            </div>
          </div>

          {/* Slim Single-Row Military Communications Log */}
          <div className="bg-slate-900/85 border border-slate-800 rounded-xl px-3 py-2 shadow-lg flex items-center gap-2.5 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 shrink-0 pr-2 border-r border-slate-800">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bitácora P2P</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {!room || room.combatLogs.length === 0 ? (
                <span className="text-[11px] text-slate-500 italic">
                  Canal abierto. Esperando intercambio balístico...
                </span>
              ) : (
                room.combatLogs.slice(0, 6).map((log: ShotRecord) => {
                  const isMe = log.shooter === role;
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
                        <strong>{isMe ? 'TÚ' : opponentName}</strong>
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

        {/* RIGHT SIDEBAR: Opponent Commander + Opponent Fleet Status */}
        <div className="flex flex-col gap-2.5 order-3">
          <CommanderSidebarCard
            character="battleship_captain"
            mood={mpEnemyMood}
            fleet={opponentFleetDisplay}
            isActiveTurn={!isMyTurn}
            isEnemy={true}
            labelOverride={opponentName || 'Comandante Rival'}
          />

          <FleetStatusPanel
            title="Flota Rival Confirmada"
            ships={opponentFleetDisplay}
            isEnemy={true}
            compact={true}
          />
        </div>
      </div>
    </div>
  );
};

