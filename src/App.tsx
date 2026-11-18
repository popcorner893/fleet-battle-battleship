/**
 * @license
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useGameEngine } from './hooks/useGameEngine';
import { MainMenu } from './components/MainMenu';
import { PlacementView } from './components/PlacementView';
import { CombatView } from './components/CombatView';
import { MultiplayerCombatView } from './components/MultiplayerCombatView';
import { ResultsModal } from './components/ResultsModal';
import { FinalCinematicModal, preloadOutroVideo } from './components/FinalCinematicModal';
import { IntroCinematicModal } from './components/IntroCinematicModal';
import { SettingsModal } from './components/SettingsModal';
import { InstructionsModal } from './components/InstructionsModal';
import { StatsModal } from './components/StatsModal';
import { AchievementsModal, AchievementUnlockToast } from './components/AchievementsModal';
import { SurrenderModal } from './components/SurrenderModal';
import { MultiplayerModal } from './components/MultiplayerModal';
import { MultiplayerResultsModal } from './components/MultiplayerResultsModal';
import { TournamentEntryModal } from './components/TournamentEntryModal';
import { TournamentHubView } from './components/TournamentHubView';
import { Anchor, Settings as SettingsIcon, Volume2, VolumeX, BarChart2, Users, Swords } from 'lucide-react';
import { multiplayerService } from './services/multiplayer';
import { calculateAccuracy } from './engine/combat';

export default function App() {
  const {
    phase,
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
  } = useGameEngine();

  const [mpOutroWinner, setMpOutroWinner] = React.useState<'player' | 'ai' | null>(null);
  const [mpResultsData, setMpResultsData] = React.useState<{
    isVictory: boolean;
    playerName: string;
    opponentName: string;
    opponentSunkShipsCount: number;
    playerShotsCount: number;
    playerHitsCount: number;
    totalTurns: number;
    playerFleet: typeof playerFleet;
  } | null>(null);
  const [showMpResultsModal, setShowMpResultsModal] = React.useState(false);
  const hasPlayedMpOutroRef = React.useRef(false);

  // Preload final cinematic video into RAM Blob cache in the background
  React.useEffect(() => {
    preloadOutroVideo();
  }, [phase]);

  const handleToggleSound = () => {
    if (!settings.soundEnabled) {
      updateSettings({
        soundEnabled: true,
        sfxVolume: settings.sfxVolume > 0 ? settings.sfxVolume : 0.5,
      });
    } else {
      updateSettings({ soundEnabled: false });
    }
  };

  const handleVolumeChange = (vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    updateSettings({
      sfxVolume: clamped,
      soundEnabled: clamped > 0,
    });
  };

  const isMultiplayerActive = phase === 'MULTIPLAYER_COMBAT';
  const isPartOfTournament = Boolean(activeTournamentCode);

  const handleSafeReturnToMenu = () => {
    hasPlayedMpOutroRef.current = false;
    setMpOutroWinner(null);
    setMpResultsData(null);
    setShowMpResultsModal(false);
    setIsPlayingOutroVideo(false);
    setActiveTournamentCode(null);
    returnToMenu();
  };

  const handleSafeReturnToTournament = () => {
    hasPlayedMpOutroRef.current = false;
    setMpOutroWinner(null);
    setMpResultsData(null);
    setShowMpResultsModal(false);
    setIsPlayingOutroVideo(false);
    handleReturnToTournamentHub();
  };

  const handleSurrenderFromCombat = () => {
    setIsSurrenderModalOpen(true);
  };

  const handleExecuteSurrender = async () => {
    if (isMultiplayerActive && multiplayerRoomCode && multiplayerId) {
      try {
        await multiplayerService.surrender(multiplayerRoomCode, multiplayerId);
      } catch (err) {
        console.error('Error surrendering multiplayer:', err);
      }
      setIsSurrenderModalOpen(false);
      if (isPartOfTournament) {
        handleSafeReturnToTournament();
      } else {
        handleSafeReturnToMenu();
      }
    } else {
      handleConfirmSurrender();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Live Floating Tactical Achievement Unlock Toast */}
      <AchievementUnlockToast
        unlockedQueue={unlockedAchievementsQueue}
        onDismiss={dismissAchievementToast}
      />

      {/* Top Bar following 3-Zone Contract: displayed during active game phases */}
      {phase !== 'MENU' && (
        <header className="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-8 py-3.5 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur sticky top-0 z-40">
          {/* Zone 1: Wordmark with naval crest */}
          <button
            type="button"
            onClick={handleSafeReturnToMenu}
            className="flex items-center gap-2.5 text-slate-100 hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 group text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/30 text-cyan-400 flex items-center justify-center group-hover:border-cyan-400 transition-colors overflow-hidden">
              <Anchor className="w-4 h-4" />
            </div>
            <span className="text-base font-extrabold tracking-tight">FLEET BATTLE</span>
          </button>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <button
              type="button"
              onClick={handleSafeReturnToMenu}
              className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer text-cyan-400"
            >
              Puesto de Mando
            </button>
            <button
              type="button"
              onClick={() => {
                if (activeTournamentCode) {
                  handleSafeReturnToTournament();
                } else {
                  setIsTournamentModalOpen(true);
                }
              }}
              className={`hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                phase === 'TOURNAMENT_HUB' || isPartOfTournament
                  ? 'text-amber-400 border-b border-amber-400 pb-0.5'
                  : ''
              }`}
            >
              <Swords className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeTournamentCode ? `Torneo (${activeTournamentCode})` : 'Torneo de Aula'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsMultiplayerModalOpen(true)}
              className={`hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
                phase.startsWith('MULTIPLAYER') && !isPartOfTournament
                  ? 'text-emerald-400 border-b border-emerald-400 pb-0.5'
                  : ''
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multijugador P2P</span>
            </button>
            <button
              type="button"
              onClick={() => setIsInstructionsOpen(true)}
              className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Reglas del Juego
            </button>
            <button
              type="button"
              onClick={() => setIsStatsOpen(true)}
              className="hover:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Estadísticas
            </button>
          </nav>

          {/* Zone 3: Essential Controls + Interactive Volume Slider */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <button
                type="button"
                onClick={handleToggleSound}
                className="text-slate-300 hover:text-cyan-400 transition-colors cursor-pointer"
                title={settings.soundEnabled ? 'Silenciar Sonido' : 'Activar Sonido'}
              >
                {settings.soundEnabled && settings.sfxVolume > 0 ? (
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
                value={settings.soundEnabled ? settings.sfxVolume : 0}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                aria-label="Nivel de volumen"
                className="w-16 sm:w-24 h-1.5 accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
              />
              <span className="hidden sm:inline-block text-[11px] font-mono font-bold text-cyan-400 w-8 text-right tabular-nums">
                {Math.round((settings.soundEnabled ? settings.sfxVolume : 0) * 100)}%
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsStatsOpen(true)}
              className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
              title="Estadísticas"
            >
              <BarChart2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              title="Ajustes"
            >
              <SettingsIcon className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {phase === 'MENU' && isPlayingIntroVideo && (
          <IntroCinematicModal
            soundEnabled={settings.soundEnabled}
            sfxVolume={settings.sfxVolume}
            onComplete={completeIntroVideo}
          />
        )}

        {phase === 'MENU' && !isPlayingIntroVideo && (
          <div className={`relative flex-1 flex flex-col ${hasJustFinishedIntro ? 'animate-fade-from-black' : ''}`}>
            {hasJustFinishedIntro && (
              <div
                aria-hidden="true"
                className="fixed inset-0 z-40 bg-black pointer-events-none animate-black-curtain-out"
              />
            )}
            <MainMenu
              onStartGame={startPlacement}
              currentDifficulty={settings.difficulty}
              onUpdateDifficulty={(diff) => updateSettings({ difficulty: diff })}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenInstructions={() => setIsInstructionsOpen(true)}
              onOpenStats={() => setIsStatsOpen(true)}
              onOpenAchievements={() => setIsAchievementsOpen(true)}
              onOpenMultiplayer={() => setIsMultiplayerModalOpen(true)}
              onOpenTournament={() => setIsTournamentModalOpen(true)}
              statistics={statistics}
              achievements={achievements}
              soundEnabled={settings.soundEnabled}
              onToggleSound={handleToggleSound}
              sfxVolume={settings.sfxVolume}
              onUpdateVolume={handleVolumeChange}
            />
          </div>
        )}

        {/* Classroom Tournament Hub View (Lobby, Draw & Simultaneous Bracket) */}
        {phase === 'TOURNAMENT_HUB' && activeTournamentCode && tournamentPlayerId && (
          <TournamentHubView
            tournamentCode={activeTournamentCode}
            playerId={tournamentPlayerId}
            playerName={tournamentPlayerName}
            initialTournament={initialTournamentData}
            onEnterMatch={(roomCode, pId, role, pName, skipPlacement) => {
              hasPlayedMpOutroRef.current = false;
              setMpOutroWinner(null);
              setMpResultsData(null);
              setShowMpResultsModal(false);
              setIsPlayingOutroVideo(false);
              handleEnterMultiplayerLobby(roomCode, pId, role, pName, Boolean(skipPlacement));
            }}
            onBackToMenu={handleSafeReturnToMenu}
            showCoordinates={settings.showCoordinates}
            radarPulse={settings.radarPulseEnabled}
          />
        )}

        {/* Placement View: Solo vs AI */}
        {phase === 'PLACEMENT' && (
          <PlacementView
            playerFleet={playerFleet}
            selectedShipType={selectedShipType}
            onSelectShipType={setSelectedShipType}
            orientation={placementOrientation}
            onToggleOrientation={toggleOrientation}
            onPlaceShip={placeShipAt}
            onRightClickCell={handleRightClickPlacement}
            onRemoveShip={removePlacedShip}
            onRandomizeFleet={randomizePlayerFleet}
            onClearFleet={clearPlayerFleet}
            onConfirmFleet={confirmFleetAndStartCombat}
            onBackToMenu={handleSafeReturnToMenu}
            hoverCoord={hoverCoord}
            onHoverCoordChange={setHoverCoord}
            showCoordinates={settings.showCoordinates}
            radarPulse={settings.radarPulseEnabled}
            difficulty={settings.difficulty}
          />
        )}

        {/* Placement View: Multiplayer or Tournament Match */}
        {phase === 'MULTIPLAYER_PLACEMENT' && (
          <div className="flex flex-col flex-1">
            <div className="bg-emerald-950/60 border-b border-emerald-800/80 px-4 py-2 text-center text-xs text-emerald-300 font-semibold flex items-center justify-center gap-3">
              <Users className="w-4 h-4" />
              <span>
                {isPartOfTournament
                  ? `Duelo de Torneo (${activeTournamentCode}) · Sala de Combate:`
                  : 'Despliegue Multijugador en Línea · Sala:'}{' '}
                <strong className="font-mono text-white">{multiplayerRoomCode}</strong>
              </span>
              {isPartOfTournament && (
                <button
                  type="button"
                  onClick={handleSafeReturnToTournament}
                  className="ml-2 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold cursor-pointer"
                >
                  Ver Llaves del Torneo
                </button>
              )}
            </div>
            <PlacementView
              playerFleet={playerFleet}
              selectedShipType={selectedShipType}
              onSelectShipType={setSelectedShipType}
              orientation={placementOrientation}
              onToggleOrientation={toggleOrientation}
              onPlaceShip={placeShipAt}
              onRightClickCell={handleRightClickPlacement}
              onRemoveShip={removePlacedShip}
              onRandomizeFleet={randomizePlayerFleet}
              onClearFleet={clearPlayerFleet}
              onConfirmFleet={confirmMultiplayerFleet}
              onBackToMenu={isPartOfTournament ? handleSafeReturnToTournament : handleSafeReturnToMenu}
              hoverCoord={hoverCoord}
              onHoverCoordChange={setHoverCoord}
              showCoordinates={settings.showCoordinates}
              radarPulse={settings.radarPulseEnabled}
            />
          </div>
        )}

        {/* Combat View: Solo vs AI (Hidden while final video plays to free GPU resources) */}
        {(phase === 'COMBAT' || (phase === 'RESULTS' && !isMultiplayerActive && !isPlayingOutroVideo)) && (
          <CombatView
            playerFleet={playerFleet}
            aiFleet={aiFleet}
            playerShots={playerShots}
            playerHits={playerHits}
            aiShots={aiShots}
            aiHits={aiHits}
            currentTurn={currentTurn}
            isProcessingTurn={isProcessingTurn}
            lastPlayerShot={lastPlayerShot}
            lastAiShot={lastAiShot}
            combatLogs={combatLogs}
            elapsedSeconds={elapsedSeconds}
            difficulty={settings.difficulty}
            soundEnabled={settings.soundEnabled}
            sfxVolume={settings.sfxVolume}
            onToggleSound={handleToggleSound}
            onUpdateVolume={handleVolumeChange}
            onFireAtEnemy={handlePlayerFire}
            onOpenInstructions={() => setIsInstructionsOpen(true)}
            onSurrender={handleSurrenderFromCombat}
            showCoordinates={settings.showCoordinates}
            radarPulse={settings.radarPulseEnabled}
            isScreenShaking={isScreenShaking}
            activeAbility={activeAbility}
            usedAbility={usedAbility}
            sonarNotice={sonarNotice}
            onSelectAbility={setActiveAbility}
            currentAp={currentAp}
            maxAp={maxAp}
            commandShipId={commandShipId}
            onSelectCommandShip={setCommandShipId}
            onMoveCommandShip={handleMoveCommandShip}
            onRepairCommandShip={handleRepairCommandShip}
            onActivateSpecialImmediate={handleActivateSpecialImmediate}
            onEndTurn={handleEndPlayerTurn}
            salvoOrientation={salvoOrientation}
            onToggleSalvoOrientation={toggleSalvoOrientation}
            sonarOverlay={sonarOverlay}
            maneuverCooldown={maneuverCooldown}
          />
        )}

        {/* Combat View: Real-Time Multiplayer (Kept mounted during outro video to preserve match end state) */}
        {phase === 'MULTIPLAYER_COMBAT' && multiplayerRoomCode && multiplayerId && (
          <div className={mpOutroWinner !== null ? 'hidden' : 'flex flex-col flex-1'}>
            <MultiplayerCombatView
              roomCode={multiplayerRoomCode}
              playerId={multiplayerId}
              role={multiplayerRole}
              playerFleet={playerFleet}
              soundEnabled={settings.soundEnabled}
              sfxVolume={settings.sfxVolume}
              onToggleSound={handleToggleSound}
              onUpdateVolume={handleVolumeChange}
              onSurrenderClick={handleSurrenderFromCombat}
              onReturnToMenu={isPartOfTournament ? handleSafeReturnToTournament : handleSafeReturnToMenu}
              showCoordinates={settings.showCoordinates}
              radarPulse={settings.radarPulseEnabled}
              screenShakeEnabled={settings.screenShakeEnabled}
              onAchievementProgress={applyAchievementUpdates}
              onMatchEnd={(isVictory, stats) => {
                const resolvedFleet = stats?.playerFleet || playerFleet;
                const shotsCount = stats?.shots ?? 0;
                const hitsCount = stats?.hits ?? 0;
                const acc = calculateAccuracy(hitsCount, shotsCount);
                const survivingShips = resolvedFleet.filter((s: any) => !s.isSunk).length;

                applyMatchEndAchievements({
                  isVictory,
                  isMultiplayer: true,
                  accuracy: acc,
                  survivingPlayerShips: survivingShips,
                  currentStreak: isVictory ? statistics.currentStreak + 1 : 0,
                  totalGamesPlayed: statistics.gamesPlayed + 1,
                });

                setMpResultsData({
                  isVictory,
                  playerName: stats?.playerName || multiplayerName,
                  opponentName: stats?.opponentName || 'Comandante Rival',
                  opponentSunkShipsCount: stats?.opponentSunkCount ?? (isVictory ? 5 : 0),
                  playerShotsCount: shotsCount,
                  playerHitsCount: hitsCount,
                  totalTurns: stats?.turns ?? 0,
                  playerFleet: resolvedFleet,
                });
                if (!hasPlayedMpOutroRef.current) {
                  hasPlayedMpOutroRef.current = true;
                  setIsPlayingOutroVideo(true);
                  setMpOutroWinner(isVictory ? 'player' : 'ai');
                } else {
                  setShowMpResultsModal(true);
                }
              }}
              onOpenResultsModal={() => setShowMpResultsModal(true)}
            />
          </div>
        )}
      </main>

      {/* Final Cinematic Video Animation (Plays right before ending the match) */}
      {phase === 'RESULTS' && !isMultiplayerActive && isPlayingOutroVideo && (
        <FinalCinematicModal
          winner={winner}
          soundEnabled={settings.soundEnabled}
          onComplete={() => setIsPlayingOutroVideo(false)}
        />
      )}

      {/* Final Cinematic Video Animation for Multiplayer */}
      {isMultiplayerActive && mpOutroWinner !== null && (
        <FinalCinematicModal
          winner={mpOutroWinner}
          soundEnabled={settings.soundEnabled}
          onComplete={() => {
            setMpOutroWinner(null);
            setIsPlayingOutroVideo(false);
            setShowMpResultsModal(true);
          }}
        />
      )}

      {/* Results Modal for Multiplayer — Shown once the final video completes */}
      {isMultiplayerActive && mpResultsData && showMpResultsModal && mpOutroWinner === null && (
        <MultiplayerResultsModal
          isVictory={mpResultsData.isVictory}
          playerName={mpResultsData.playerName}
          opponentName={mpResultsData.opponentName}
          playerFleet={mpResultsData.playerFleet}
          opponentSunkShipsCount={mpResultsData.opponentSunkShipsCount}
          playerShotsCount={mpResultsData.playerShotsCount}
          playerHitsCount={mpResultsData.playerHitsCount}
          totalTurns={mpResultsData.totalTurns}
          onReturnToMenu={handleSafeReturnToMenu}
          onInspectBoard={() => setShowMpResultsModal(false)}
          isTournamentMatch={isPartOfTournament}
          onReturnToTournament={isPartOfTournament ? handleSafeReturnToTournament : undefined}
          onReplayCinematic={() => {
            setShowMpResultsModal(false);
            setIsPlayingOutroVideo(true);
            setMpOutroWinner(mpResultsData.isVictory ? 'player' : 'ai');
          }}
        />
      )}

      {/* Results Modal (Solo vs AI) — Shown once the final video completes */}
      {phase === 'RESULTS' && !isMultiplayerActive && !isPlayingOutroVideo && (
        <ResultsModal
          winner={winner}
          playerFleet={playerFleet}
          aiFleet={aiFleet}
          playerShotsCount={playerShots.length}
          playerHitsCount={playerHits.length}
          aiShotsCount={aiShots.length}
          elapsedSeconds={elapsedSeconds}
          difficulty={settings.difficulty}
          onRematchSameFleet={rematchWithSameFleet}
          onNewPlacement={() => startPlacement()}
          onReturnToMenu={handleSafeReturnToMenu}
          onReplayCinematic={() => setIsPlayingOutroVideo(true)}
        />
      )}

      {/* Surrender Confirmation Modal (REQ-013) */}
      <SurrenderModal
        isOpen={isSurrenderModalOpen}
        onCancel={() => setIsSurrenderModalOpen(false)}
        onConfirmSurrender={handleExecuteSurrender}
        isMultiplayer={isMultiplayerActive}
      />

      {/* Multiplayer Setup Modal (REQ-111) */}
      <MultiplayerModal
        isOpen={isMultiplayerModalOpen && !isPlayingIntroVideo}
        onClose={() => setIsMultiplayerModalOpen(false)}
        onEnterLobby={(code, id, role, name) => {
          hasPlayedMpOutroRef.current = false;
          setMpOutroWinner(null);
          setMpResultsData(null);
          setShowMpResultsModal(false);
          setIsPlayingOutroVideo(false);
          setActiveTournamentCode(null);
          handleEnterMultiplayerLobby(code, id, role, name);
        }}
      />

      {/* Classroom Tournament Setup Modal */}
      <TournamentEntryModal
        isOpen={isTournamentModalOpen && !isPlayingIntroVideo}
        initialCode={initialTournamentCodeParam}
        onClose={() => setIsTournamentModalOpen(false)}
        onEnterTournament={(tCode, pId, pName, tState) => {
          handleEnterTournament(tCode, pId, pName, tState);
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
      />

      {/* Instructions Modal */}
      <InstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
      />

      {/* Statistics Modal */}
      <StatsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        statistics={statistics}
        onClearStats={handleClearStats}
      />

      {/* Achievements Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        achievements={achievements}
      />
    </div>
  );
}
