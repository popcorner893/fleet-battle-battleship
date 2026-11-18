import { useState, useEffect, useCallback, useRef } from 'react';
import {
  AchievementId,
  AchievementStateItem,
  Coordinate,
  Difficulty,
  GamePhase,
  GameSettings,
  MatchStatistics,
  MoveDirection,
  Orientation,
  PlacedShip,
  SalvoOrientation,
  ShipTypeId,
  ShotOutcome,
  ShotRecord,
  SonarSectorOverlay,
  TacticalAbilityType,
  TournamentState,
  TurnOwner,
} from '../types';
import {
  CLASSIC_FLEET_CONFIG,
  areCoordinatesEqual,
  containsCoordinate,
  formatCoordinate,
  isInBounds,
} from '../utils/coordinates';
import {
  calculateActionCost,
  calculateMaxAp,
  calculateShipCoordinates,
  canMoveShip,
  canPlayerAffordAnyAction,
  generateRandomFleet,
  isValidPlacement,
  moveShipInFleet,
  validateFleet,
} from '../engine/board';
import { calculateAccuracy, processShot } from '../engine/combat';
import { getAiShot } from '../ai/brain';
import { sound } from '../services/audio';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATISTICS,
  loadSettings,
  loadStatistics,
  recordMatchResult,
  saveSettings,
  clearStatistics,
  loadAchievements,
  updateAchievementProgress,
  evaluateMatchEndAchievements,
} from '../services/storage';
import { multiplayerService } from '../services/multiplayer';

let hasIntroVideoPlayedOnce = false;

export function useGameEngine() {
  // Persistence states
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [statistics, setStatistics] = useState<MatchStatistics>(DEFAULT_STATISTICS);
  const [achievements, setAchievements] = useState<AchievementStateItem[]>(() =>
    loadAchievements()
  );
  const [unlockedAchievementsQueue, setUnlockedAchievementsQueue] = useState<
    AchievementStateItem[]
  >([]);

  // App Phase
  const [phase, setPhase] = useState<GamePhase>('MENU');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isSurrenderModalOpen, setIsSurrenderModalOpen] = useState(false);
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [initialTournamentCodeParam, setInitialTournamentCodeParam] = useState<string | null>(null);

  // Placement Phase
  const [playerFleet, setPlayerFleet] = useState<PlacedShip[]>([]);
  const [selectedShipType, setSelectedShipType] = useState<ShipTypeId | null>('carrier');
  const [placementOrientation, setPlacementOrientation] = useState<Orientation>('horizontal');
  const [hoverCoord, setHoverCoord] = useState<Coordinate | null>(null);

  // Combat Phase
  const [aiFleet, setAiFleet] = useState<PlacedShip[]>([]);
  const [playerShots, setPlayerShots] = useState<Coordinate[]>([]);
  const [playerHits, setPlayerHits] = useState<Coordinate[]>([]);
  const [aiShots, setAiShots] = useState<Coordinate[]>([]);
  const [aiHits, setAiHits] = useState<Coordinate[]>([]);
  const [currentTurn, setCurrentTurn] = useState<TurnOwner>('player');
  const [isProcessingTurn, setIsProcessingTurn] = useState(false);

  // Screen shake & visual impact feedback
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  // Action Points (AP) & Command Ship (Puesto de Mando)
  const [currentAp, setCurrentAp] = useState<number>(6);
  const [maxAp, setMaxAp] = useState<number>(6);
  const [commandShipId, setCommandShipId] = useState<string | null>(null);
  const [salvoOrientation, setSalvoOrientation] = useState<SalvoOrientation>('horizontal');
  const [sonarOverlay, setSonarOverlay] = useState<SonarSectorOverlay | null>(null);
  const [maneuverCooldown, setManeuverCooldown] = useState<number>(0);
  const aiManeuverCooldownRef = useRef<number>(0);

  // Tactical abilities
  const [activeAbility, setActiveAbility] = useState<TacticalAbilityType | null>('attack');
  const [usedAbility, setUsedAbility] = useState<TacticalAbilityType | null>(null);
  const [sonarNotice, setSonarNotice] = useState<string | null>(null);

  const [lastPlayerShot, setLastPlayerShot] = useState<ShotOutcome | null>(null);
  const [lastAiShot, setLastAiShot] = useState<ShotOutcome | null>(null);
  const [combatLogs, setCombatLogs] = useState<ShotRecord[]>([]);

  const [combatStartTime, setCombatStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [winner, setWinner] = useState<TurnOwner | null>(null);
  const [isPlayingOutroVideo, setIsPlayingOutroVideo] = useState<boolean>(false);
  const [isPlayingIntroVideo, setIsPlayingIntroVideo] = useState<boolean>(
    () => !hasIntroVideoPlayedOnce
  );
  const [hasJustFinishedIntro, setHasJustFinishedIntro] = useState<boolean>(false);

  const completeIntroVideo = useCallback(() => {
    hasIntroVideoPlayedOnce = true;
    setIsPlayingIntroVideo(false);
    setHasJustFinishedIntro(true);
  }, []);

  const dismissAchievementToast = useCallback((id: AchievementId | string) => {
    setUnlockedAchievementsQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const enqueueUnlockedAchievements = useCallback((newlyUnlocked: AchievementStateItem[]) => {
    if (newlyUnlocked.length === 0) return;
    sound.playAchievement();
    setUnlockedAchievementsQueue((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const fresh = newlyUnlocked.filter((a) => !existingIds.has(a.id));
      return [...prev, ...fresh];
    });
    newlyUnlocked.forEach((item) => {
      window.setTimeout(() => {
        setUnlockedAchievementsQueue((prev) => prev.filter((a) => a.id !== item.id));
      }, 5200);
    });
  }, []);

  const applyAchievementUpdates = useCallback(
    (updates: Partial<Record<AchievementId, { add?: number; setMax?: number }>>) => {
      const res = updateAchievementProgress(updates);
      setAchievements(res.achievements);
      enqueueUnlockedAchievements(res.newlyUnlocked);
    },
    [enqueueUnlockedAchievements]
  );

  const applyMatchEndAchievements = useCallback(
    (params: {
      isVictory: boolean;
      isMultiplayer: boolean;
      difficulty?: Difficulty;
      accuracy: number;
      survivingPlayerShips: number;
      currentStreak: number;
      totalGamesPlayed: number;
    }) => {
      const res = evaluateMatchEndAchievements(params);
      setAchievements(res.achievements);
      enqueueUnlockedAchievements(res.newlyUnlocked);
    },
    [enqueueUnlockedAchievements]
  );

  // Multiplayer session states
  const [multiplayerRoomCode, setMultiplayerRoomCode] = useState<string | null>(null);
  const [multiplayerId, setMultiplayerId] = useState<string | null>(null);
  const [multiplayerRole, setMultiplayerRole] = useState<'host' | 'guest'>('host');
  const [multiplayerName, setMultiplayerName] = useState<string>('Comandante');

  // Classroom Tournament session states
  const [activeTournamentCode, setActiveTournamentCode] = useState<string | null>(null);
  const [tournamentPlayerId, setTournamentPlayerId] = useState<string | null>(null);
  const [tournamentPlayerName, setTournamentPlayerName] = useState<string>('Comandante');
  const [initialTournamentData, setInitialTournamentData] = useState<TournamentState | null>(null);

  // AI turn timer ref
  const aiTimerRef = useRef<number | null>(null);

  // Load storage once on mount
  useEffect(() => {
    const s = loadSettings();
    const st = loadStatistics();
    setSettings(s);
    setStatistics(st);
    setAchievements(loadAchievements(st));
    sound.setConfig(s.soundEnabled, s.sfxVolume);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tournamentParam = params.get('tournament');
      const roomParam = params.get('room');
      if (tournamentParam) {
        setInitialTournamentCodeParam(tournamentParam);
        setIsTournamentModalOpen(true);
      } else if (roomParam) {
        setIsMultiplayerModalOpen(true);
      }
    }
  }, []);

  // Update sound service whenever audio settings change
  useEffect(() => {
    sound.setConfig(settings.soundEnabled, settings.sfxVolume);
    saveSettings(settings);
  }, [settings]);

  // Play Main Menu music on 'MENU' (after intro completes) and In-Game music ('Iron Undercurrent') when inside singleplayer or multiplayer game phases
  useEffect(() => {
    if (isPlayingIntroVideo || isPlayingOutroVideo) {
      sound.setMusicTrack('none');
    } else if (phase === 'MENU') {
      sound.setMusicTrack('menu');
    } else {
      sound.setMusicTrack('ingame');
    }
  }, [phase, isPlayingIntroVideo, isPlayingOutroVideo]);

  useEffect(() => {
    return () => {
      sound.setMusicTrack('none');
    };
  }, []);

  // Keep commandShipId pointing to a living ship during combat
  useEffect(() => {
    if (phase === 'COMBAT' && playerFleet.length > 0) {
      const currentCmd = playerFleet.find((s) => s.id === commandShipId && !s.isSunk);
      if (!currentCmd) {
        const firstAlive = playerFleet.find((s) => !s.isSunk);
        setCommandShipId(firstAlive ? firstAlive.id : null);
      }
    }
  }, [phase, playerFleet, commandShipId]);

  // Elapsed game timer during combat
  useEffect(() => {
    let timer: number | null = null;
    if (phase === 'COMBAT' && !winner) {
      timer = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [phase, winner]);

  // Clean up any pending AI timeout when leaving combat
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
    };
  }, []);

  // Toggle orientation for ship placement
  const toggleOrientation = useCallback(() => {
    sound.playRotate();
    setPlacementOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  }, []);

  // Toggle salvo orientation for Cruiser/Destroyer special abilities
  const toggleSalvoOrientation = useCallback(() => {
    setSalvoOrientation((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'));
  }, []);

  // Keyboard shortcut listener for [R] rotate and preventing scroll on space/arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        if (phase === 'PLACEMENT' || phase === 'MULTIPLAYER_PLACEMENT') {
          e.preventDefault();
          toggleOrientation();
        } else if (phase === 'COMBAT') {
          e.preventDefault();
          toggleSalvoOrientation();
        }
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        if (phase === 'PLACEMENT' || phase === 'COMBAT' || phase === 'MULTIPLAYER_COMBAT') {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, toggleOrientation, toggleSalvoOrientation]);

  // Settings update
  const updateSettings = useCallback((partial: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  // Wipe stats
  const handleClearStats = useCallback(() => {
    const fresh = clearStatistics();
    setStatistics(fresh);
  }, []);

  // Start from menu into placement
  const startPlacement = useCallback(
    (diff?: Difficulty) => {
      sound.playClick();
      if (diff) {
        updateSettings({ difficulty: diff });
      }
      setPlayerFleet([]);
      setSelectedShipType('carrier');
      setPlacementOrientation('horizontal');
      setHoverCoord(null);
      setIsPlayingOutroVideo(false);
      setHasJustFinishedIntro(false);
      setPhase('PLACEMENT');
    },
    [updateSettings]
  );

  // Randomize player fleet
  const randomizePlayerFleet = useCallback(() => {
    try {
      const fleet = generateRandomFleet(CLASSIC_FLEET_CONFIG);
      setPlayerFleet(fleet);
      setSelectedShipType(null);
      sound.playRotate();
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Clear player fleet
  const clearPlayerFleet = useCallback(() => {
    sound.playClick();
    setPlayerFleet([]);
    setSelectedShipType('carrier');
  }, []);

  // Remove a single placed ship
  const removePlacedShip = useCallback((shipId: string) => {
    sound.playClick();
    setPlayerFleet((prev) => prev.filter((s) => s.id !== shipId));
  }, []);

  // Place ship manually on grid
  const placeShipAt = useCallback(
    (origin: Coordinate) => {
      if (!selectedShipType) return;
      const config = CLASSIC_FLEET_CONFIG.find((c) => c.id === selectedShipType);
      if (!config) return;

      const existing = playerFleet.find((s) => s.type === selectedShipType);
      const shipsWithoutCurrent = playerFleet.filter((s) => s.type !== selectedShipType);

      if (!isValidPlacement(origin, config.length, placementOrientation, shipsWithoutCurrent)) {
        sound.playSplash();
        return;
      }

      const coords = calculateShipCoordinates(origin, config.length, placementOrientation);
      const newShip: PlacedShip = {
        id: existing ? existing.id : `${config.id}_${Date.now()}`,
        type: config.id,
        name: config.name,
        length: config.length,
        orientation: placementOrientation,
        coordinates: coords,
        hits: [],
        isSunk: false,
        shielded: false,
      };

      const updated = [...shipsWithoutCurrent, newShip];
      setPlayerFleet(updated);
      sound.playRotate();

      const placedTypes = new Set(updated.map((s) => s.type));
      const nextUnplaced = CLASSIC_FLEET_CONFIG.find((c) => !placedTypes.has(c.id));
      setSelectedShipType(nextUnplaced ? nextUnplaced.id : null);
    },
    [selectedShipType, playerFleet, placementOrientation]
  );

  // Right click handler during placement to rotate in place or toggle orientation
  const handleRightClickPlacement = useCallback(
    (coord: Coordinate) => {
      const shipAtCoord = playerFleet.find((s) => containsCoordinate(s.coordinates, coord));

      if (shipAtCoord) {
        const nextOrientation: Orientation =
          shipAtCoord.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        const otherShips = playerFleet.filter((s) => s.id !== shipAtCoord.id);
        const origin = shipAtCoord.coordinates[0];

        if (isValidPlacement(origin, shipAtCoord.length, nextOrientation, otherShips)) {
          const newCoords = calculateShipCoordinates(origin, shipAtCoord.length, nextOrientation);
          const updated: PlacedShip = {
            ...shipAtCoord,
            orientation: nextOrientation,
            coordinates: newCoords,
          };
          setPlayerFleet([...otherShips, updated]);
          sound.playRotate();
        } else {
          setPlayerFleet(otherShips);
          setSelectedShipType(shipAtCoord.type);
          setPlacementOrientation(nextOrientation);
          sound.playRotate();
        }
        return;
      }

      toggleOrientation();
    },
    [playerFleet, toggleOrientation]
  );

  // Confirm fleet and enter combat (vs AI)
  const confirmFleetAndStartCombat = useCallback(() => {
    const validation = validateFleet(playerFleet);
    if (!validation.valid) {
      sound.playSplash();
      return;
    }

    try {
      const generatedAiFleet = generateRandomFleet(CLASSIC_FLEET_CONFIG);
      setAiFleet(generatedAiFleet);

      const initialMaxAp = calculateMaxAp(playerFleet);
      const firstShip = playerFleet.find((s) => s.type === 'carrier') || playerFleet[0] || null;

      setCurrentAp(initialMaxAp);
      setMaxAp(initialMaxAp);
      setCommandShipId(firstShip ? firstShip.id : null);
      setSalvoOrientation('horizontal');
      setSonarOverlay(null);
      setManeuverCooldown(0);
      aiManeuverCooldownRef.current = 0;

      setPlayerShots([]);
      setPlayerHits([]);
      setAiShots([]);
      setAiHits([]);
      setCurrentTurn('player');
      setIsProcessingTurn(false);
      setLastPlayerShot(null);
      setLastAiShot(null);
      setCombatLogs([]);
      setCombatStartTime(Date.now());
      setElapsedSeconds(0);
      setWinner(null);
      setIsPlayingOutroVideo(false);
      setActiveAbility('attack');
      setUsedAbility(null);
      setSonarNotice(null);

      sound.playSonar();
      setPhase('COMBAT');
    } catch (e) {
      console.error('Error generating AI fleet:', e);
    }
  }, [playerFleet]);

  // Restart match with current fleet (quick rematch)
  const rematchWithSameFleet = useCallback(() => {
    try {
      const generatedAiFleet = generateRandomFleet(CLASSIC_FLEET_CONFIG);
      setAiFleet(generatedAiFleet);

      const healedFleet = playerFleet.map((ship) => ({
        ...ship,
        hits: [],
        isSunk: false,
        shielded: false,
      }));
      setPlayerFleet(healedFleet);

      const initialMaxAp = calculateMaxAp(healedFleet);
      const firstShip = healedFleet.find((s) => s.type === 'carrier') || healedFleet[0] || null;

      setCurrentAp(initialMaxAp);
      setMaxAp(initialMaxAp);
      setCommandShipId(firstShip ? firstShip.id : null);
      setSalvoOrientation('horizontal');
      setSonarOverlay(null);
      setManeuverCooldown(0);
      aiManeuverCooldownRef.current = 0;

      setPlayerShots([]);
      setPlayerHits([]);
      setAiShots([]);
      setAiHits([]);
      setCurrentTurn('player');
      setIsProcessingTurn(false);
      setLastPlayerShot(null);
      setLastAiShot(null);
      setCombatLogs([]);
      setCombatStartTime(Date.now());
      setElapsedSeconds(0);
      setWinner(null);
      setIsPlayingOutroVideo(false);
      setActiveAbility('attack');
      setUsedAbility(null);
      setSonarNotice(null);

      sound.playSonar();
      setPhase('COMBAT');
    } catch (e) {
      console.error(e);
    }
  }, [playerFleet]);

  // Return to menu
  const returnToMenu = useCallback(() => {
    sound.playClick();
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
    }
    setPhase('MENU');
    setWinner(null);
    setIsPlayingOutroVideo(false);
    setHasJustFinishedIntro(false);
    setIsSurrenderModalOpen(false);
  }, []);

  // Confirm Surrender Handler
  const handleConfirmSurrender = useCallback(() => {
    sound.playDefeat();
    setWinner('ai');
    setIsSurrenderModalOpen(false);

    const duration = Math.max(1, Math.round((Date.now() - combatStartTime) / 1000));
    const updatedStats = recordMatchResult(
      'defeat',
      settings.difficulty,
      aiShots.length,
      playerShots.length,
      playerHits.length,
      playerShots.length - playerHits.length,
      duration
    );
    setStatistics(updatedStats);

    applyMatchEndAchievements({
      isVictory: false,
      isMultiplayer: false,
      difficulty: settings.difficulty,
      accuracy: calculateAccuracy(playerHits.length, playerShots.length),
      survivingPlayerShips: playerFleet.filter((s) => !s.isSunk).length,
      currentStreak: updatedStats.currentStreak,
      totalGamesPlayed: updatedStats.gamesPlayed,
    });

    const logRecord: ShotRecord = {
      id: `surrender_${Date.now()}`,
      shooter: 'player',
      coordinate: { row: -1, col: -1 },
      result: 'miss',
      timestamp: Date.now(),
      shipName: 'Comando Aliado declara retirada táctica. Enfrentamiento concluido.',
    };
    setCombatLogs((prev) => [logRecord, ...prev]);
    setIsPlayingOutroVideo(true);
    setPhase('RESULTS');
  }, [
    combatStartTime,
    settings.difficulty,
    aiShots.length,
    playerShots.length,
    playerHits.length,
    playerFleet,
    applyMatchEndAchievements,
  ]);

  // Process AI's turn + start next Player Round with persistent shot history & AP replenishment
  const executeAiTurn = useCallback(
    (
      currentAiShots: Coordinate[],
      currentAiHits: Coordinate[],
      currentPlayerFleet: PlacedShip[],
      currentAiFleet: PlacedShip[],
      currentPlayerHits: Coordinate[],
      currentPlayerShots: Coordinate[]
    ) => {
      const sunkPlayerShips = currentPlayerFleet.filter((s) => s.isSunk);

      const targetCoord = getAiShot({
        previousShots: currentAiShots,
        hits: currentAiHits,
        sunkShips: sunkPlayerShips,
        difficulty: settings.difficulty,
      });

      sound.playCannonShot();

      const shotResult = processShot(targetCoord, currentPlayerFleet, currentAiShots, 'ai');

      const nextAiShots = [...currentAiShots, targetCoord];
      setAiShots(nextAiShots);

      const isHit = shotResult.outcome.result === 'hit' || shotResult.outcome.result === 'sunk';
      const nextAiHits = isHit ? [...currentAiHits, targetCoord] : currentAiHits;
      if (isHit) {
        setAiHits(nextAiHits);

        if (settings.screenShakeEnabled) {
          setIsScreenShaking(true);
          setTimeout(() => setIsScreenShaking(false), 450);
        }

        const damagedShip = shotResult.updatedShips.find((s) =>
          containsCoordinate(s.coordinates, targetCoord)
        );
        if (damagedShip && !damagedShip.isSunk && damagedShip.length - damagedShip.hits.length === 1) {
          sound.playCombatAlarm();
        }
      } else if (shotResult.shieldAbsorbed) {
        setSonarNotice(shotResult.outcome.shipName || '🛡️ Escudo Blindado absorbió el impacto.');
        setTimeout(() => setSonarNotice(null), 4000);
      }

      setPlayerFleet(shotResult.updatedShips);
      setLastAiShot(shotResult.outcome);

      const logRecord: ShotRecord = {
        id: `ai_${Date.now()}_${Math.random()}`,
        shooter: 'ai',
        coordinate: targetCoord,
        result: shotResult.outcome.result,
        timestamp: Date.now(),
        shipName: shotResult.outcome.shipName,
        sunk: shotResult.outcome.isSunk,
      };
      setCombatLogs((prev) => [logRecord, ...prev].slice(0, 50));
      sound.playRadioStatic();

      if (shotResult.outcome.result === 'sunk') {
        sound.playSunk();
      } else if (shotResult.outcome.result === 'hit') {
        sound.playHit();
      } else {
        sound.playSplash();
      }

      if (shotResult.outcome.isGameOver) {
        setWinner('ai');
        sound.playDefeat();

        const duration = Math.max(1, Math.round((Date.now() - combatStartTime) / 1000));
        const updatedStats = recordMatchResult(
          'defeat',
          settings.difficulty,
          nextAiShots.length,
          currentPlayerShots.length,
          currentPlayerHits.length,
          Math.max(0, currentPlayerShots.length - currentPlayerHits.length),
          duration
        );
        setStatistics(updatedStats);
        applyMatchEndAchievements({
          isVictory: false,
          isMultiplayer: false,
          difficulty: settings.difficulty,
          accuracy: calculateAccuracy(currentPlayerHits.length, currentPlayerShots.length),
          survivingPlayerShips: 0,
          currentStreak: updatedStats.currentStreak,
          totalGamesPlayed: updatedStats.gamesPlayed,
        });
        setIsPlayingOutroVideo(true);
        setPhase('RESULTS');
        setIsProcessingTurn(false);
        return;
      }

      // Optional AI ship maneuver (restricted by cooldown so AI cannot maneuver every turn,
      // and blocked from entering any cell where the player has already fired)
      if (aiManeuverCooldownRef.current > 0) {
        aiManeuverCooldownRef.current -= 1;
      } else {
        const undamagedAiShips = currentAiFleet.filter((s) => !s.isSunk && s.hits.length === 0);
        if (undamagedAiShips.length > 0 && Math.random() < 0.35) {
          const candidate = undamagedAiShips[Math.floor(Math.random() * undamagedAiShips.length)];
          const dirs: MoveDirection[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
          const validDirs = dirs.filter((d) =>
            canMoveShip(candidate, d, currentAiFleet, currentPlayerShots)
          );
          if (validDirs.length > 0) {
            const chosenDir = validDirs[Math.floor(Math.random() * validDirs.length)];
            const movedRes = moveShipInFleet(
              candidate.id,
              chosenDir,
              currentAiFleet,
              currentPlayerShots
            );
            if (movedRes.moved) {
              setAiFleet(movedRes.updatedFleet);
              aiManeuverCooldownRef.current = 1;
            }
          }
        }
      }

      // Start new Player Round:
      // 1) Keep all playerShots permanently saved on the radar so the player knows which cells remain available
      setSonarOverlay(null);
      setManeuverCooldown((prev) => Math.max(0, prev - 1));

      // 2) Replenish Action Points (5 Base + 1 if Carrier is alive = 6 AP)
      const nextRoundMaxAp = calculateMaxAp(shotResult.updatedShips);
      setMaxAp(nextRoundMaxAp);
      setCurrentAp(nextRoundMaxAp);
      setActiveAbility((prev) => prev || 'attack');

      setCurrentTurn('player');
      setIsProcessingTurn(false);
    },
    [
      settings.difficulty,
      settings.screenShakeEnabled,
      combatStartTime,
      applyMatchEndAchievements,
    ]
  );

  // Trigger AI turn helper
  const triggerAiTurnTransition = useCallback(
    (
      nextAiShots: Coordinate[],
      nextAiHits: Coordinate[],
      nextPlayerFleet: PlacedShip[],
      nextAiFleet: PlacedShip[],
      nextPlayerHits: Coordinate[],
      nextPlayerShots: Coordinate[] = playerShots
    ) => {
      setIsProcessingTurn(true);
      setCurrentTurn('ai');
      if (aiTimerRef.current) {
        clearTimeout(aiTimerRef.current);
      }
      aiTimerRef.current = window.setTimeout(() => {
        executeAiTurn(
          nextAiShots,
          nextAiHits,
          nextPlayerFleet,
          nextAiFleet,
          nextPlayerHits,
          nextPlayerShots
        );
      }, 750);
    },
    [executeAiTurn, playerShots]
  );

  // End Player Turn manually ("Finalizar Turno" button)
  const handleEndPlayerTurn = useCallback(() => {
    if (phase !== 'COMBAT' || currentTurn !== 'player' || isProcessingTurn || winner) {
      return;
    }
    triggerAiTurnTransition(aiShots, aiHits, playerFleet, aiFleet, playerHits);
  }, [
    phase,
    currentTurn,
    isProcessingTurn,
    winner,
    triggerAiTurnTransition,
    aiShots,
    aiHits,
    playerFleet,
    aiFleet,
    playerHits,
  ]);

  // ACTION 5: Move Commanded Ship 1 cell orthogonally (Cruceta Flotante / Cruceta Puesto de Mando)
  const handleMoveCommandShip = useCallback(
    (dir: MoveDirection) => {
      if (
        phase !== 'COMBAT' ||
        currentTurn !== 'player' ||
        isProcessingTurn ||
        winner ||
        maneuverCooldown > 0
      ) {
        return;
      }
      const cmdShip =
        playerFleet.find((s) => s.id === commandShipId && !s.isSunk) ||
        playerFleet.find((s) => !s.isSunk);
      if (!cmdShip) return;

      const cost = calculateActionCost('move', cmdShip);
      if (currentAp < cost) return;

      const moveRes = moveShipInFleet(cmdShip.id, dir, playerFleet, aiShots);
      if (!moveRes.moved || !moveRes.movedShip) return;

      // Sync damaged compartment coordinates on the player defense board so hit markers move with the hull
      const oldHitKeys = new Set(cmdShip.hits.map((h) => `${h.row},${h.col}`));
      const waterMisses = aiShots.filter(
        (shot) => !containsCoordinate(aiHits, shot) && !oldHitKeys.has(`${shot.row},${shot.col}`)
      );
      const syncedHits = moveRes.updatedFleet.flatMap((s) => s.hits);
      const syncedShots = [...waterMisses, ...syncedHits];

      setPlayerFleet(moveRes.updatedFleet);
      setAiHits(syncedHits);
      setAiShots(syncedShots);

      const nextAp = currentAp - cost;
      setCurrentAp(nextAp);
      // Set maneuver cooldown to 2 (blocks any additional move this turn + 1 full turn cooldown next round)
      setManeuverCooldown(2);
      applyAchievementUpdates({ evasive_helmsman: { add: 1 } });

      const dirNames: Record<MoveDirection, string> = {
        UP: 'Norte (↑)',
        DOWN: 'Sur (↓)',
        LEFT: 'Oeste (←)',
        RIGHT: 'Este (→)',
      };

      const logRecord: ShotRecord = {
        id: `move_${Date.now()}`,
        shooter: 'player',
        coordinate: moveRes.movedShip.coordinates[0],
        result: 'miss',
        timestamp: Date.now(),
        shipName: `Maniobra: ${cmdShip.name} desplazado 1 casilla al ${dirNames[dir]} (-${cost} AP)`,
      };
      setCombatLogs((prev) => [logRecord, ...prev].slice(0, 50));

      if (!canPlayerAffordAnyAction(nextAp, moveRes.updatedFleet, cmdShip.id, syncedShots, false)) {
        triggerAiTurnTransition(
          syncedShots,
          syncedHits,
          moveRes.updatedFleet,
          aiFleet,
          playerHits,
          playerShots
        );
      }
    },
    [
      phase,
      currentTurn,
      isProcessingTurn,
      winner,
      maneuverCooldown,
      playerFleet,
      commandShipId,
      currentAp,
      aiShots,
      aiHits,
      aiFleet,
      playerHits,
      playerShots,
      triggerAiTurnTransition,
      applyAchievementUpdates,
    ]
  );

  // ACTION 3: Repair 1 damaged compartment of the Commanded Ship
  const handleRepairCommandShip = useCallback(() => {
    if (phase !== 'COMBAT' || currentTurn !== 'player' || isProcessingTurn || winner) {
      return;
    }
    const cmdShip =
      playerFleet.find((s) => s.id === commandShipId && !s.isSunk) ||
      playerFleet.find((s) => !s.isSunk);
    if (!cmdShip || cmdShip.isSunk || cmdShip.hits.length === 0) return;

    const cost = calculateActionCost('repair', cmdShip);
    if (currentAp < cost) return;

    const repairedCoord = cmdShip.hits[cmdShip.hits.length - 1];
    const remainingHits = cmdShip.hits.slice(0, -1);

    const updatedFleet = playerFleet.map((s) =>
      s.id === cmdShip.id ? { ...s, hits: remainingHits } : s
    );

    // Remove the repaired hit mark from the player board
    const nextAiHits = aiHits.filter((h) => !areCoordinatesEqual(h, repairedCoord));
    const nextAiShots = aiShots.filter((s) => !areCoordinatesEqual(s, repairedCoord));

    setPlayerFleet(updatedFleet);
    setAiHits(nextAiHits);
    setAiShots(nextAiShots);

    const nextAp = currentAp - cost;
    setCurrentAp(nextAp);
    applyAchievementUpdates({ combat_engineer: { add: 1 } });

    setSonarNotice(
      `🔧 Compartimiento de ${cmdShip.name} reparado en ${formatCoordinate(repairedCoord)} (-${cost} AP).`
    );
    setTimeout(() => setSonarNotice(null), 4000);

    const logRecord: ShotRecord = {
      id: `repair_${Date.now()}`,
      shooter: 'player',
      coordinate: repairedCoord,
      result: 'miss',
      timestamp: Date.now(),
      shipName: `Reparación: ${cmdShip.name} restauró 1 compartimiento (-${cost} AP)`,
    };
    setCombatLogs((prev) => [logRecord, ...prev].slice(0, 50));

    if (
      !canPlayerAffordAnyAction(
        nextAp,
        updatedFleet,
        cmdShip.id,
        nextAiShots,
        maneuverCooldown === 0
      )
    ) {
      triggerAiTurnTransition(
        nextAiShots,
        nextAiHits,
        updatedFleet,
        aiFleet,
        playerHits,
        playerShots
      );
    }
  }, [
    phase,
    currentTurn,
    isProcessingTurn,
    winner,
    playerFleet,
    commandShipId,
    currentAp,
    aiHits,
    aiShots,
    aiFleet,
    playerHits,
    playerShots,
    maneuverCooldown,
    triggerAiTurnTransition,
    applyAchievementUpdates,
  ]);

  // ACTION 4 (Immediate): Battleship Defensive Fortification (Escudo Blindado)
  const handleActivateSpecialImmediate = useCallback(() => {
    if (phase !== 'COMBAT' || currentTurn !== 'player' || isProcessingTurn || winner) {
      return;
    }
    const cmdShip =
      playerFleet.find((s) => s.id === commandShipId && !s.isSunk) ||
      playerFleet.find((s) => !s.isSunk);
    if (!cmdShip || cmdShip.type !== 'battleship' || cmdShip.shielded) return;

    const cost = calculateActionCost('special', cmdShip);
    if (currentAp < cost) return;

    const updatedFleet = playerFleet.map((s) =>
      s.id === cmdShip.id ? { ...s, shielded: true } : s
    );
    setPlayerFleet(updatedFleet);

    const nextAp = currentAp - cost;
    setCurrentAp(nextAp);
    setActiveAbility('attack');
    applyAchievementUpdates({ ironclad_shield: { add: 1 } });

    sound.playSonar();
    setSonarNotice(
      `🛡️ Fortificación Defensiva: Escudo Blindado activo sobre ${cmdShip.name} (-${cost} AP). Absorberá el próximo impacto directo.`
    );
    setTimeout(() => setSonarNotice(null), 4500);

    const logRecord: ShotRecord = {
      id: `shield_${Date.now()}`,
      shooter: 'player',
      coordinate: cmdShip.coordinates[0],
      result: 'miss',
      timestamp: Date.now(),
      shipName: `🛡️ ${cmdShip.name} activó Escudo Blindado (-${cost} AP)`,
    };
    setCombatLogs((prev) => [logRecord, ...prev].slice(0, 50));

    if (
      !canPlayerAffordAnyAction(nextAp, updatedFleet, cmdShip.id, aiShots, maneuverCooldown === 0)
    ) {
      triggerAiTurnTransition(aiShots, aiHits, updatedFleet, aiFleet, playerHits, playerShots);
    }
  }, [
    phase,
    currentTurn,
    isProcessingTurn,
    winner,
    playerFleet,
    commandShipId,
    currentAp,
    aiShots,
    aiHits,
    aiFleet,
    playerHits,
    playerShots,
    maneuverCooldown,
    triggerAiTurnTransition,
    applyAchievementUpdates,
  ]);

  // Player fires or executes targeted tactical action on Enemy Radar
  const handlePlayerFire = useCallback(
    (target: Coordinate) => {
      if (phase !== 'COMBAT' || currentTurn !== 'player' || isProcessingTurn || winner) {
        return;
      }

      const cmdShip =
        playerFleet.find((s) => s.id === commandShipId && !s.isSunk) ||
        playerFleet.find((s) => !s.isSunk);
      if (!cmdShip) return;

      const mode: TacticalAbilityType = activeAbility || 'attack';

      // =========================================================================
      // PATROL BOAT SPECIAL (OR LEGACY SONAR): Reconocimiento de Radar 3x3
      // =========================================================================
      if (mode === 'sonar' || (mode === 'special' && cmdShip.type === 'patrol')) {
        const cost = calculateActionCost('special', cmdShip);
        if (currentAp < cost) return;

        sound.playTacticalSonar();
        const cells: Coordinate[] = [];
        let detected = false;

        for (let r = target.row - 1; r <= target.row + 1; r++) {
          for (let c = target.col - 1; c <= target.col + 1; c++) {
            const cell = { row: r, col: c };
            if (isInBounds(cell)) {
              cells.push(cell);
              for (const enemyShip of aiFleet) {
                if (!enemyShip.isSunk && containsCoordinate(enemyShip.coordinates, cell)) {
                  detected = true;
                }
              }
            }
          }
        }

        setSonarOverlay({
          center: target,
          cells,
          detected,
          timestamp: Date.now(),
        });

        if (detected) {
          applyAchievementUpdates({ acoustic_eye: { add: 1 } });
        }

        const msg = detected
          ? `🚨 ALERTA ROJA (CONTACTO) en sector 3×3 (${formatCoordinate(target)}): ¡Firma de buque enemigo detectada!`
          : `✅ SECTOR DESPEJADO en 3×3 (${formatCoordinate(target)}): Sin presencia naval enemiga.`;

        setSonarNotice(msg);
        setTimeout(() => setSonarNotice(null), 5000);

        const nextAp = currentAp - cost;
        setCurrentAp(nextAp);
        setActiveAbility('attack');

        const logRecord: ShotRecord = {
          id: `sonar_${Date.now()}`,
          shooter: 'player',
          coordinate: target,
          result: detected ? 'hit' : 'miss',
          timestamp: Date.now(),
          shipName: msg,
        };
        setCombatLogs((prev) => [logRecord, ...prev].slice(0, 50));

        if (
          !canPlayerAffordAnyAction(
            nextAp,
            playerFleet,
            cmdShip.id,
            aiShots,
            maneuverCooldown === 0
          )
        ) {
          triggerAiTurnTransition(aiShots, aiHits, playerFleet, aiFleet, playerHits, playerShots);
        }
        return;
      }

      // =========================================================================
      // OFFENSIVE SALVOS:
      // - Disparo Normal ('attack')
      // - Disparo Doble ('double_shot')
      // - Habilidad Especial Ofensiva ('special': Carrier 5x+, Cruiser 2x, Destroyer 3x)
      // =========================================================================
      let actionTypeForCost: 'attack' | 'double_shot' | 'special' = 'attack';
      let targetCells: Coordinate[] = [target];
      let actionLabel = 'Disparo Normal';

      if (mode === 'double_shot') {
        actionTypeForCost = 'double_shot';
        targetCells = [target, { row: target.row, col: target.col + 1 }].filter(isInBounds);
        actionLabel = 'Disparo Doble (2×)';
      } else if (mode === 'special' || mode === 'airstrike') {
        actionTypeForCost = 'special';
        if (cmdShip.type === 'carrier' || mode === 'airstrike') {
          actionLabel = 'Ataque Aéreo (+)';
          targetCells = [
            target,
            { row: target.row - 1, col: target.col },
            { row: target.row + 1, col: target.col },
            { row: target.row, col: target.col - 1 },
            { row: target.row, col: target.col + 1 },
          ].filter(isInBounds);
        } else if (cmdShip.type === 'cruiser') {
          actionLabel = `Interdicción Rápida (2× ${salvoOrientation === 'horizontal' ? '→' : '↓'})`;
          targetCells = [
            target,
            salvoOrientation === 'horizontal'
              ? { row: target.row, col: target.col + 1 }
              : { row: target.row + 1, col: target.col },
          ].filter(isInBounds);
        } else if (cmdShip.type === 'destroyer') {
          actionLabel = `Salva de Misiles (3× ${salvoOrientation === 'horizontal' ? '→' : '↓'})`;
          targetCells = [
            target,
            salvoOrientation === 'horizontal'
              ? { row: target.row, col: target.col + 1 }
              : { row: target.row + 1, col: target.col },
            salvoOrientation === 'horizontal'
              ? { row: target.row, col: target.col + 2 }
              : { row: target.row + 2, col: target.col },
          ].filter(isInBounds);
        }
      } else {
        // Single normal shot: prevent firing on an already revealed cell
        if (containsCoordinate(playerShots, target)) {
          return;
        }
      }

      const cost = calculateActionCost(actionTypeForCost, cmdShip);
      if (currentAp < cost) return;

      // Filter out cells already shot in this round
      const unshotCells = targetCells.filter((c) => !containsCoordinate(playerShots, c));
      if (unshotCells.length === 0) {
        return;
      }

      if (targetCells.length > 1) {
        sound.playArtilleryWhistle();
      } else {
        sound.playCannonShot();
      }

      let runningFleet = [...aiFleet];
      let runningShots = [...playerShots];
      let runningHits = [...playerHits];
      let lastOutcome: ShotOutcome | null = null;
      let anyHit = false;
      let anySunk = false;
      let sunkCount = 0;
      let matchOver = false;

      for (const cell of unshotCells) {
        const res = processShot(cell, runningFleet, runningShots, 'player');
        runningShots.push(cell);
        if (res.outcome.result === 'hit' || res.outcome.result === 'sunk') {
          if (!containsCoordinate(runningHits, cell)) {
            runningHits.push(cell);
          }
          anyHit = true;
        }
        if (res.outcome.result === 'sunk') {
          anySunk = true;
          sunkCount += 1;
        }
        if (res.outcome.isGameOver) {
          matchOver = true;
        }
        runningFleet = res.updatedShips;
        lastOutcome = res.outcome;
      }

      setPlayerShots(runningShots);
      setPlayerHits(runningHits);
      setAiFleet(runningFleet);
      if (lastOutcome) {
        setLastPlayerShot(lastOutcome);
      }

      // Update tactical salvo & sunk achievements in real time
      const salvoAchievementUpdates: Partial<
        Record<AchievementId, { add?: number; setMax?: number }>
      > = {};
      if (mode === 'double_shot' || (mode === 'special' && cmdShip.type === 'cruiser')) {
        salvoAchievementUpdates.coordinated_salvo = { add: 1 };
      } else if (
        (mode === 'special' || mode === 'airstrike') &&
        (cmdShip.type === 'carrier' || cmdShip.type === 'destroyer')
      ) {
        salvoAchievementUpdates.sky_of_fire = { add: 1 };
      }
      if (sunkCount > 0) {
        salvoAchievementUpdates.first_sunk = { setMax: 1 };
        salvoAchievementUpdates.sea_hunter_20 = { add: sunkCount };
      }
      if (Object.keys(salvoAchievementUpdates).length > 0) {
        applyAchievementUpdates(salvoAchievementUpdates);
      }

      const nextAp = currentAp - cost;
      setCurrentAp(nextAp);
      // Reset back to normal attack targeting after executing a special or double shot
      if (mode !== 'attack') {
        setActiveAbility('attack');
      }

      if (anySunk) {
        sound.playSunk();
      } else if (anyHit) {
        sound.playHit();
      } else {
        sound.playSplash();
      }
      sound.playRadioStatic();

      const logRecord: ShotRecord = {
        id: `pl_${Date.now()}_${Math.random()}`,
        shooter: 'player',
        coordinate: target,
        result: anySunk ? 'sunk' : anyHit ? 'hit' : 'miss',
        timestamp: Date.now(),
        shipName:
          unshotCells.length > 1
            ? `${actionLabel} (${cmdShip.name}, -${cost} AP)`
            : lastOutcome?.shipName,
        sunk: anySunk,
      };
      setCombatLogs((prev) => [logRecord, ...prev].slice(0, 50));

      if (matchOver) {
        setWinner('player');
        sound.playVictory();

        const duration = Math.max(1, Math.round((Date.now() - combatStartTime) / 1000));
        const updatedStats = recordMatchResult(
          'victory',
          settings.difficulty,
          runningShots.length,
          runningShots.length,
          runningHits.length,
          Math.max(0, runningShots.length - runningHits.length),
          duration
        );
        setStatistics(updatedStats);
        applyMatchEndAchievements({
          isVictory: true,
          isMultiplayer: false,
          difficulty: settings.difficulty,
          accuracy: calculateAccuracy(runningHits.length, runningShots.length),
          survivingPlayerShips: playerFleet.filter((s) => !s.isSunk).length,
          currentStreak: updatedStats.currentStreak,
          totalGamesPlayed: updatedStats.gamesPlayed,
        });
        setIsPlayingOutroVideo(true);
        setPhase('RESULTS');
        setIsProcessingTurn(false);
        return;
      }

      if (
        !canPlayerAffordAnyAction(
          nextAp,
          playerFleet,
          cmdShip.id,
          aiShots,
          maneuverCooldown === 0
        )
      ) {
        triggerAiTurnTransition(
          aiShots,
          aiHits,
          playerFleet,
          runningFleet,
          runningHits,
          runningShots
        );
      }
    },
    [
      phase,
      currentTurn,
      isProcessingTurn,
      winner,
      playerFleet,
      commandShipId,
      activeAbility,
      currentAp,
      aiFleet,
      salvoOrientation,
      playerShots,
      playerHits,
      combatStartTime,
      settings.difficulty,
      aiShots,
      aiHits,
      maneuverCooldown,
      triggerAiTurnTransition,
      applyAchievementUpdates,
      applyMatchEndAchievements,
    ]
  );

  // Multiplayer start from modal or tournament bracket
  const handleEnterMultiplayerLobby = useCallback(
    (
      code: string,
      id: string,
      role: 'host' | 'guest',
      name: string,
      skipPlacement: boolean = false
    ) => {
      setMultiplayerRoomCode(code);
      setMultiplayerId(id);
      setMultiplayerRole(role);
      setMultiplayerName(name);
      setIsMultiplayerModalOpen(false);
      if (!skipPlacement) {
        setPlayerFleet([]);
      }
      setSelectedShipType('carrier');
      setPlacementOrientation('horizontal');
      setHoverCoord(null);
      setIsPlayingOutroVideo(false);
      setHasJustFinishedIntro(false);
      setPhase(skipPlacement ? 'MULTIPLAYER_COMBAT' : 'MULTIPLAYER_PLACEMENT');
    },
    []
  );

  // Enter Classroom Tournament Hub from modal
  const handleEnterTournament = useCallback(
    (
      tournamentCode: string,
      playerId: string,
      playerName: string,
      tournamentState: TournamentState
    ) => {
      setActiveTournamentCode(tournamentCode);
      setTournamentPlayerId(playerId);
      setTournamentPlayerName(playerName);
      setInitialTournamentData(tournamentState);
      setIsTournamentModalOpen(false);
      setIsPlayingOutroVideo(false);
      setHasJustFinishedIntro(false);
      setPhase('TOURNAMENT_HUB');
    },
    []
  );

  // Return from a tournament 1v1 match back to the Tournament Bracket Hub
  const handleReturnToTournamentHub = useCallback(() => {
    sound.playClick();
    setWinner(null);
    setIsPlayingOutroVideo(false);
    setIsSurrenderModalOpen(false);
    setPhase('TOURNAMENT_HUB');
  }, []);

  // Confirm fleet for multiplayer
  const confirmMultiplayerFleet = useCallback(async () => {
    const validation = validateFleet(playerFleet);
    if (!validation.valid || !multiplayerRoomCode || !multiplayerId) {
      sound.playSplash();
      return;
    }

    try {
      sound.playSonar();
      await multiplayerService.submitReady(multiplayerRoomCode, multiplayerId, playerFleet);
      setPhase('MULTIPLAYER_COMBAT');
    } catch (err) {
      console.error('Error submitting multiplayer fleet:', err);
    }
  }, [playerFleet, multiplayerRoomCode, multiplayerId]);

  return {
    phase,
    setPhase,
    startPlacement,
    returnToMenu,
    rematchWithSameFleet,

    settings,
    updateSettings,
    statistics,
    handleClearStats,

    achievements,
    isAchievementsOpen,
    setIsAchievementsOpen,
    unlockedAchievementsQueue,
    dismissAchievementToast,
    applyAchievementUpdates,
    applyMatchEndAchievements,

    isSettingsOpen,
    setIsSettingsOpen,
    isInstructionsOpen,
    setIsInstructionsOpen,
    isStatsOpen,
    setIsStatsOpen,
    isSurrenderModalOpen,
    setIsSurrenderModalOpen,
    handleConfirmSurrender,

    isMultiplayerModalOpen,
    setIsMultiplayerModalOpen,
    multiplayerRoomCode,
    multiplayerId,
    multiplayerRole,
    multiplayerName,
    handleEnterMultiplayerLobby,
    confirmMultiplayerFleet,

    isTournamentModalOpen,
    setIsTournamentModalOpen,
    initialTournamentCodeParam,
    activeTournamentCode,
    setActiveTournamentCode,
    tournamentPlayerId,
    tournamentPlayerName,
    initialTournamentData,
    handleEnterTournament,
    handleReturnToTournamentHub,

    playerFleet,
    selectedShipType,
    setSelectedShipType,
    placementOrientation,
    toggleOrientation,
    placeShipAt,
    handleRightClickPlacement,
    removePlacedShip,
    randomizePlayerFleet,
    clearPlayerFleet,
    confirmFleetAndStartCombat,
    hoverCoord,
    setHoverCoord,

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
    winner,
    isPlayingIntroVideo,
    hasJustFinishedIntro,
    completeIntroVideo,
    isPlayingOutroVideo,
    setIsPlayingOutroVideo,
    handlePlayerFire,

    isScreenShaking,
    activeAbility,
    setActiveAbility,
    usedAbility,
    sonarNotice,

    // Action Points & Command Ship
    currentAp,
    maxAp,
    commandShipId,
    setCommandShipId,
    salvoOrientation,
    toggleSalvoOrientation,
    sonarOverlay,
    maneuverCooldown,
    handleMoveCommandShip,
    handleRepairCommandShip,
    handleActivateSpecialImmediate,
    handleEndPlayerTurn,
  };
}

