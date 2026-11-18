import React from 'react';
import {
  Coordinate,
  MoveDirection,
  Orientation,
  PlacedShip,
  ShipConfig,
  ShotOutcome,
  SonarSectorOverlay,
} from '../types';
import {
  BOARD_SIZE,
  COLUMN_LABELS,
  ROW_LABELS,
  areCoordinatesEqual,
  containsCoordinate,
  formatCoordinate,
  isInBounds,
} from '../utils/coordinates';
import {
  calculateActionCost,
  calculateShipCoordinates,
  canMoveShip,
  isValidPlacement,
} from '../engine/board';
import { RealShipGraphic } from './RealShipGraphic';
import { CellImpactParticles } from './CellImpactParticles';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Shield } from 'lucide-react';
import { sound } from '../services/audio';

interface BoardGridProps {
  title: string;
  subtitle?: string;
  ships: PlacedShip[];
  shots: Coordinate[];
  hits: Coordinate[];
  lastTarget?: Coordinate | null;
  lastShot?: ShotOutcome | null;
  interactive?: boolean;
  onCellClick?: (coord: Coordinate) => void;
  onCellContextMenu?: (coord: Coordinate, e: React.MouseEvent) => void;
  showCoordinates?: boolean;
  hideUndamagedShips?: boolean; // true for enemy board in combat
  placementMode?: boolean;
  selectedShipConfig?: ShipConfig | null;
  placementOrientation?: Orientation;
  hoverCoord?: Coordinate | null;
  onHoverCoordChange?: (coord: Coordinate | null) => void;
  disabled?: boolean;
  radarPulse?: boolean;
  compact?: boolean;
  // Command Ship & Tactical Overlays
  commandShipId?: string | null;
  onSelectCommandShip?: (shipId: string) => void;
  onMoveCommandShip?: (dir: MoveDirection) => void;
  currentAp?: number;
  maneuverCooldown?: number;
  isPlayerTurn?: boolean;
  sonarOverlay?: SonarSectorOverlay | null;
}

export const BoardGrid: React.FC<BoardGridProps> = ({
  title,
  subtitle,
  ships,
  shots,
  hits,
  lastTarget,
  lastShot,
  interactive = false,
  onCellClick,
  onCellContextMenu,
  showCoordinates = true,
  hideUndamagedShips = false,
  placementMode = false,
  selectedShipConfig,
  placementOrientation = 'horizontal',
  hoverCoord,
  onHoverCoordChange,
  disabled = false,
  radarPulse = false,
  compact = false,
  commandShipId = null,
  onSelectCommandShip,
  onMoveCommandShip,
  currentAp = 0,
  maneuverCooldown = 0,
  isPlayerTurn = false,
  sonarOverlay = null,
}) => {
  // Compute ghost placement coordinates
  let ghostCoords: Coordinate[] = [];
  let isGhostPlacementValid = false;
  let ghostShip: PlacedShip | null = null;

  if (placementMode && selectedShipConfig && hoverCoord) {
    ghostCoords = calculateShipCoordinates(
      hoverCoord,
      selectedShipConfig.length,
      placementOrientation
    );
    const otherShips = ships.filter((s) => s.type !== selectedShipConfig.id);
    isGhostPlacementValid = isValidPlacement(
      hoverCoord,
      selectedShipConfig.length,
      placementOrientation,
      otherShips
    );

    // If ghost is at least partially in bounds, create ghost object
    if (isInBounds(hoverCoord)) {
      ghostShip = {
        id: 'ghost_preview',
        type: selectedShipConfig.id,
        name: selectedShipConfig.name,
        length: selectedShipConfig.length,
        orientation: placementOrientation,
        coordinates: ghostCoords,
        hits: [],
        isSunk: false,
      };
    }
  }

  // Pre-calculate sets for O(1) cell lookups
  const shotSet = new Set(shots.map((c) => `${c.row},${c.col}`));
  const hitSet = new Set(hits.map((c) => `${c.row},${c.col}`));
  const sonarCellSet = new Set(
    sonarOverlay ? sonarOverlay.cells.map((c) => `${c.row},${c.col}`) : []
  );

  // Filter which ships are visible on this board
  const visibleShips = ships.filter((ship) => {
    if (!hideUndamagedShips) return true;
    return ship.isSunk; // On enemy board, only reveal SUNK ships
  });

  // Active command ship on player defense board
  const commandedShip =
    !hideUndamagedShips && !placementMode
      ? ships.find((s) => s.id === commandShipId && !s.isSunk) ||
        ships.find((s) => !s.isSunk) ||
        null
      : null;

  const moveCost = commandedShip ? calculateActionCost('move', commandedShip) : 1;
  const canAffordMove =
    isPlayerTurn &&
    !disabled &&
    maneuverCooldown === 0 &&
    currentAp >= moveCost &&
    Boolean(commandedShip);

  const colCellSizeClass = compact
    ? 'w-8 sm:w-9 lg:w-9.5 xl:w-10.5 2xl:w-11 h-5 sm:h-6 text-[11px] sm:text-xs'
    : 'w-8 sm:w-9 md:w-10 lg:w-11 h-5 sm:h-6 text-xs';

  const rowCellSizeClass = compact
    ? 'w-5 sm:w-6 h-8 sm:h-9 lg:h-9.5 xl:h-10.5 2xl:h-11 text-[11px] sm:text-xs'
    : 'w-5 sm:w-6 h-8 sm:h-9 md:h-10 lg:h-11 text-xs';

  const cornerSizeClass = 'w-5 sm:w-6 h-5 sm:h-6';

  return (
    <div className="flex flex-col items-center">
      {/* Board Header */}
      <div className={`w-full flex items-baseline justify-between px-1 ${compact ? 'mb-1.5' : 'mb-2'}`}>
        <div>
          <h3
            className={`${
              compact ? 'text-xs sm:text-sm' : 'text-sm'
            } font-bold tracking-wide text-slate-100 uppercase flex items-center gap-2`}
          >
            {title}
            {radarPulse && (
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping opacity-75" />
            )}
          </h3>
          {subtitle && (
            <p className={`${compact ? 'text-[11px]' : 'text-xs'} text-slate-400`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Grid Canvas */}
      <div
        onContextMenu={(e) => e.preventDefault()}
        className={`relative ${
          compact ? 'p-2 rounded-xl' : 'p-2.5 rounded-xl'
        } bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur select-none`}
      >
        {/* Radar ambient sweep overlay */}
        {radarPulse && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-xl overflow-hidden opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.4)_0%,transparent_70%)]"
          />
        )}

        <div className="flex flex-col">
          {/* Column letters Header (A-J) */}
          {showCoordinates && (
            <div className="flex">
              <div className={`${cornerSizeClass} shrink-0`} /> {/* Corner Spacer */}
              {COLUMN_LABELS.map((letter) => (
                <div
                  key={letter}
                  className={`${colCellSizeClass} flex items-center justify-center font-mono font-medium text-slate-400`}
                >
                  {letter}
                </div>
              ))}
            </div>
          )}

          {/* 10x10 Grid Container with Relative Positioning for Ships & Particle Overlays */}
          <div className="flex">
            {/* Row number labels (1-10) */}
            {showCoordinates && (
              <div className="flex flex-col">
                {Array.from({ length: BOARD_SIZE }).map((_, r) => (
                  <div
                    key={r}
                    className={`${rowCellSizeClass} shrink-0 flex items-center justify-center font-mono font-medium text-slate-400`}
                  >
                    {ROW_LABELS[r]}
                  </div>
                ))}
              </div>
            )}

            {/* Tactical 10x10 Matrix Area */}
            <div className="relative">
              {/* Tactical Water Grid Background Image (Caustics & Real Sea Texture) */}
              <div
                className="absolute inset-0 pointer-events-none rounded-sm overflow-hidden z-0 shadow-inner"
                style={{
                  backgroundImage: `url('/assets/aistudio/Gemini_Generated_Image_djas3adjas3adjas_1b8c37bd.jpg')`,
                  backgroundSize: '100% 100%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              />

              {/* Layer 1: Real Ships Layer */}
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                {visibleShips.map((ship) => {
                  const minRow = Math.min(...ship.coordinates.map((c) => c.row));
                  const minCol = Math.min(...ship.coordinates.map((c) => c.col));
                  const isVert = ship.orientation === 'vertical';

                  const leftPct = (minCol / BOARD_SIZE) * 100;
                  const topPct = (minRow / BOARD_SIZE) * 100;
                  const widthPct = ((isVert ? 1 : ship.length) / BOARD_SIZE) * 100;
                  const heightPct = ((isVert ? ship.length : 1) / BOARD_SIZE) * 100;

                  const isCommanded = commandedShip?.id === ship.id;

                  return (
                    <div
                      key={ship.id}
                      className={`absolute p-0.5 transition-all duration-200 ${
                        isCommanded
                          ? 'ring-2 ring-cyan-400/90 rounded-lg bg-cyan-500/10 shadow-md shadow-cyan-500/30'
                          : ''
                      } ${
                        ship.shielded && !ship.isSunk
                          ? 'ring-2 ring-sky-300 rounded-lg bg-sky-400/15 shadow-lg shadow-sky-400/40'
                          : ''
                      }`}
                      style={{
                        left: `${leftPct}%`,
                        top: `${topPct}%`,
                        width: `${widthPct}%`,
                        height: `${heightPct}%`,
                      }}
                    >
                      <RealShipGraphic ship={ship} />
                      {ship.shielded && !ship.isSunk && (
                        <div className="absolute -top-1 -right-1 z-30 bg-sky-500 text-slate-950 rounded-full p-0.5 shadow-md">
                          <Shield className="w-3 h-3 fill-slate-950" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Ghost Ship Placement Preview */}
                {ghostShip && hoverCoord && isInBounds(hoverCoord) && (
                  <div
                    className="absolute p-0.5 transition-all duration-75"
                    style={{
                      left: `${(hoverCoord.col / BOARD_SIZE) * 100}%`,
                      top: `${(hoverCoord.row / BOARD_SIZE) * 100}%`,
                      width: `${
                        ((ghostShip.orientation === 'vertical' ? 1 : ghostShip.length) /
                          BOARD_SIZE) *
                        100
                      }%`,
                      height: `${
                        ((ghostShip.orientation === 'vertical' ? ghostShip.length : 1) /
                          BOARD_SIZE) *
                        100
                      }%`,
                    }}
                  >
                    <RealShipGraphic
                      ship={ghostShip}
                      isGhost={true}
                      isValidGhost={isGhostPlacementValid}
                    />
                  </div>
                )}
              </div>

              {/* Layer 1.5: Cruceta Flotante Contextual (Contextual Maneuver D-Pad over Commanded Ship) */}
              {commandedShip && onMoveCommandShip && isPlayerTurn && maneuverCooldown === 0 && (
                (() => {
                  const minRow = Math.min(...commandedShip.coordinates.map((c) => c.row));
                  const maxRow = Math.max(...commandedShip.coordinates.map((c) => c.row));
                  const minCol = Math.min(...commandedShip.coordinates.map((c) => c.col));
                  const maxCol = Math.max(...commandedShip.coordinates.map((c) => c.col));

                  const centerRowPct = (((minRow + maxRow + 1) / 2) / BOARD_SIZE) * 100;
                  const centerColPct = (((minCol + maxCol + 1) / 2) / BOARD_SIZE) * 100;

                  const canUp = canAffordMove && canMoveShip(commandedShip, 'UP', ships, shots);
                  const canDown = canAffordMove && canMoveShip(commandedShip, 'DOWN', ships, shots);
                  const canLeft = canAffordMove && canMoveShip(commandedShip, 'LEFT', ships, shots);
                  const canRight = canAffordMove && canMoveShip(commandedShip, 'RIGHT', ships, shots);

                  return (
                    <div
                      className="absolute z-30 pointer-events-none"
                      style={{
                        left: `${centerColPct}%`,
                        top: `${centerRowPct}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div className="relative w-20 h-20 flex items-center justify-center">
                        {/* UP Arrow */}
                        <button
                          type="button"
                          disabled={!canUp}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canUp) {
                              sound.playRotate();
                              onMoveCommandShip('UP');
                            }
                          }}
                          title="Mover al Norte (↑)"
                          className={`pointer-events-auto absolute top-0 left-1/2 -translate-x-1/2 w-6 h-5 rounded-md border flex items-center justify-center shadow-md transition-all cursor-pointer ${
                            canUp
                              ? 'bg-cyan-500/95 hover:bg-cyan-400 text-slate-950 border-cyan-200 scale-100'
                              : 'bg-slate-950/75 text-slate-600 border-slate-800 cursor-not-allowed opacity-55'
                          }`}
                        >
                          <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        {/* DOWN Arrow */}
                        <button
                          type="button"
                          disabled={!canDown}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canDown) {
                              sound.playRotate();
                              onMoveCommandShip('DOWN');
                            }
                          }}
                          title="Mover al Sur (↓)"
                          className={`pointer-events-auto absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-5 rounded-md border flex items-center justify-center shadow-md transition-all cursor-pointer ${
                            canDown
                              ? 'bg-cyan-500/95 hover:bg-cyan-400 text-slate-950 border-cyan-200 scale-100'
                              : 'bg-slate-950/75 text-slate-600 border-slate-800 cursor-not-allowed opacity-55'
                          }`}
                        >
                          <ArrowDown className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        {/* LEFT Arrow */}
                        <button
                          type="button"
                          disabled={!canLeft}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canLeft) {
                              sound.playRotate();
                              onMoveCommandShip('LEFT');
                            }
                          }}
                          title="Mover al Oeste (←)"
                          className={`pointer-events-auto absolute left-0 top-1/2 -translate-y-1/2 w-5 h-6 rounded-md border flex items-center justify-center shadow-md transition-all cursor-pointer ${
                            canLeft
                              ? 'bg-cyan-500/95 hover:bg-cyan-400 text-slate-950 border-cyan-200 scale-100'
                              : 'bg-slate-950/75 text-slate-600 border-slate-800 cursor-not-allowed opacity-55'
                          }`}
                        >
                          <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        {/* RIGHT Arrow */}
                        <button
                          type="button"
                          disabled={!canRight}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canRight) {
                              sound.playRotate();
                              onMoveCommandShip('RIGHT');
                            }
                          }}
                          title="Mover al Este (→)"
                          className={`pointer-events-auto absolute right-0 top-1/2 -translate-y-1/2 w-5 h-6 rounded-md border flex items-center justify-center shadow-md transition-all cursor-pointer ${
                            canRight
                              ? 'bg-cyan-500/95 hover:bg-cyan-400 text-slate-950 border-cyan-200 scale-100'
                              : 'bg-slate-950/75 text-slate-600 border-slate-800 cursor-not-allowed opacity-55'
                          }`}
                        >
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>

                        {/* Center AP Cost Badge */}
                        <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-cyan-400/80 text-[9px] font-mono font-extrabold text-cyan-300 shadow-md">
                          {moveCost}AP
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Layer 2: Interactive Grid Tiles & Anchored Cell Markers */}
              <div className="grid grid-cols-10 border border-cyan-800/40 bg-slate-950/20 backdrop-blur-[0.5px] relative z-20">
                {Array.from({ length: BOARD_SIZE }).map((_, r) =>
                  Array.from({ length: BOARD_SIZE }).map((_, c) => {
                    const key = `${r},${c}`;
                    const cellCoord: Coordinate = { row: r, col: c };

                    const isShot = shotSet.has(key);
                    const isHit = hitSet.has(key);
                    const isMiss = isShot && !isHit;
                    const isLast = lastTarget && areCoordinatesEqual(lastTarget, cellCoord);
                    const isSonarCell = sonarCellSet.has(key);
                    const isSonarCenter =
                      sonarOverlay && areCoordinatesEqual(sonarOverlay.center, cellCoord);

                    // Check if this exact cell is the one that just took a shot
                    const isRecentImpact =
                      lastShot && areCoordinatesEqual(lastShot.coordinate, cellCoord);

                    // Check if a player ship occupies this cell (for selecting Command Ship on defense board)
                    const shipAtCell =
                      !hideUndamagedShips && !placementMode && onSelectCommandShip
                        ? ships.find(
                            (s) => !s.isSunk && containsCoordinate(s.coordinates, cellCoord)
                          )
                        : null;

                    // Clickable criteria
                    const isClickable =
                      !disabled &&
                      ((interactive && !isShot) ||
                        Boolean(shipAtCell) ||
                        (placementMode && (selectedShipConfig !== null || ships.length > 0)));

                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!isClickable && !interactive && !placementMode}
                        onClick={() => {
                          if (shipAtCell && onSelectCommandShip) {
                            sound.playClick();
                            onSelectCommandShip(shipAtCell.id);
                            return;
                          }
                          if (isClickable && onCellClick) {
                            onCellClick(cellCoord);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (onCellContextMenu) {
                            onCellContextMenu(cellCoord, e);
                          }
                        }}
                        onMouseEnter={() => {
                          if (placementMode && onHoverCoordChange) {
                            onHoverCoordChange(cellCoord);
                          }
                        }}
                        onMouseLeave={() => {
                          if (placementMode && onHoverCoordChange) {
                            onHoverCoordChange(null);
                          }
                        }}
                        aria-label={`Casilla ${formatCoordinate(cellCoord)}`}
                        className={`
                          relative ${
                            compact
                              ? 'w-8 h-8 sm:w-9 sm:h-9 lg:w-9.5 lg:h-9.5 xl:w-10.5 xl:h-10.5 2xl:w-11 2xl:h-11'
                              : 'w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11'
                          } border
                          flex items-center justify-center transition-colors duration-150
                          focus:outline-none focus:ring-1 focus:ring-cyan-400
                          ${
                            shipAtCell
                              ? 'cursor-pointer'
                              : isClickable
                              ? 'cursor-crosshair'
                              : 'cursor-default'
                          }
                          ${
                            isSonarCell
                              ? sonarOverlay?.detected
                                ? 'bg-rose-500/35 border-rose-400/90'
                                : 'bg-emerald-500/25 border-emerald-400/90'
                              : isHit
                              ? 'bg-rose-950/40 border-slate-700/60'
                              : isMiss
                              ? 'bg-slate-950/75 border-slate-700/60'
                              : 'bg-transparent border-cyan-900/35 hover:bg-cyan-400/20'
                          }
                        `}
                      >
                        {/* Sonar 3x3 Center Sector Tag */}
                        {isSonarCenter && sonarOverlay && (
                          <span
                            className={`absolute -top-2.5 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.2 rounded text-[8px] font-mono font-extrabold uppercase tracking-wider whitespace-nowrap shadow-md pointer-events-none ${
                              sonarOverlay.detected
                                ? 'bg-rose-600 text-white border border-rose-300 animate-pulse'
                                : 'bg-emerald-600 text-white border border-emerald-300'
                            }`}
                          >
                            {sonarOverlay.detected ? '⚠ CONTACTO' : '✓ DESPEJADO'}
                          </span>
                        )}

                        {/* Anchored Particle Burst on the EXACT Clicked Cell */}
                        {isRecentImpact && (
                          <CellImpactParticles
                            key={`${r}-${c}-${lastShot.result}-${Date.now()}`}
                            result={lastShot.result}
                            isSunk={lastShot.isSunk}
                          />
                        )}

                        {/* Miss Marker (water splash droplet ring) */}
                        {isMiss && (
                          <div className="relative z-20 flex items-center justify-center animate-fade-in pointer-events-none">
                            <span className="w-3.5 h-3.5 rounded-full border border-sky-400/80 bg-sky-950/60" />
                            <span className="absolute w-1.5 h-1.5 rounded-full bg-cyan-200" />
                          </div>
                        )}

                        {/* Hit Marker (direct hit fiery crosshair) */}
                        {isHit && (
                          <div className="relative z-20 flex items-center justify-center pointer-events-none">
                            <span className="w-4 h-4 rounded-full flex items-center justify-center bg-rose-600 shadow-lg shadow-rose-600/60 animate-pulse">
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3.5"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </span>
                          </div>
                        )}

                        {/* Last Shot Highlight Halo */}
                        {isLast && (
                          <span className="absolute inset-0 border-2 border-amber-400 rounded-xs animate-ping pointer-events-none opacity-80 z-20" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

