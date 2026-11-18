import React, { useEffect } from 'react';
import { Coordinate, Difficulty, Orientation, PlacedShip, ShipTypeId } from '../types';
import { CLASSIC_FLEET_CONFIG, TOTAL_FLEET_SEGMENTS } from '../utils/coordinates';
import { BoardGrid } from './BoardGrid';
import { ShipGraphic } from './ShipGraphic';
import {
  COMMANDER_PROFILES,
  CommanderAvatar,
  getOpponentCharacterByDifficulty,
} from './CommanderAvatar';
import { RotateCcw, Shuffle, Trash2, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

interface PlacementViewProps {
  playerFleet: PlacedShip[];
  selectedShipType: ShipTypeId | null;
  onSelectShipType: (id: ShipTypeId | null) => void;
  orientation: Orientation;
  onToggleOrientation: () => void;
  onPlaceShip: (coord: Coordinate) => void;
  onRightClickCell?: (coord: Coordinate) => void;
  onRemoveShip: (shipId: string) => void;
  onRandomizeFleet: () => void;
  onClearFleet: () => void;
  onConfirmFleet: () => void;
  onBackToMenu: () => void;
  hoverCoord: Coordinate | null;
  onHoverCoordChange: (coord: Coordinate | null) => void;
  showCoordinates: boolean;
  radarPulse: boolean;
  difficulty?: Difficulty;
}

export const PlacementView: React.FC<PlacementViewProps> = ({
  playerFleet,
  selectedShipType,
  onSelectShipType,
  orientation,
  onToggleOrientation,
  onPlaceShip,
  onRightClickCell,
  onRemoveShip,
  onRandomizeFleet,
  onClearFleet,
  onConfirmFleet,
  onBackToMenu,
  hoverCoord,
  onHoverCoordChange,
  showCoordinates,
  radarPulse,
  difficulty = 'MEDIUM',
}) => {
  // Listen for keyboard 'R' to rotate orientation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        onToggleOrientation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleOrientation]);

  const placedTypes = new Set(playerFleet.map((s) => s.type));
  const isFleetComplete = playerFleet.length === CLASSIC_FLEET_CONFIG.length;
  const currentSegmentsPlaced = playerFleet.reduce((sum, s) => sum + s.length, 0);

  const selectedConfig = selectedShipType
    ? CLASSIC_FLEET_CONFIG.find((c) => c.id === selectedShipType) || null
    : null;

  const enemyCharId = getOpponentCharacterByDifficulty(difficulty);
  const enemyProfile = COMMANDER_PROFILES[enemyCharId];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMenu}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Volver al Menú"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Despliegue Estratégico de Flota
            </h2>
            <p className="text-xs text-slate-400">
              Coloca tus 5 unidades navales antes de iniciar el combate. Pulsa [R] para rotar.
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRandomizeFleet}
            className="py-2 px-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Shuffle className="w-4 h-4 text-cyan-400" />
            <span>Aleatorio</span>
          </button>

          <button
            type="button"
            onClick={onClearFleet}
            disabled={playerFleet.length === 0}
            className="py-2 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 disabled:pointer-events-none text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      {/* Commander Briefing Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <CommanderAvatar
            character="navy_seal"
            mood={isFleetComplete ? 'victory' : 'calm'}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Navy SEAL · Tú</span>
              <span className="text-[10px] font-mono text-cyan-400">
                {isFleetComplete ? '¡Flota Lista!' : `${playerFleet.length}/5 desplegados`}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-snug whitespace-normal break-words mt-0.5">
              {isFleetComplete
                ? '¡Todas las unidades en posición de combate!'
                : 'Posiciona tus buques estratégicamente en el cuadrante.'}
            </p>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center sm:flex-row-reverse sm:text-right gap-3">
          <CommanderAvatar character={enemyCharId} mood="calm" size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between sm:flex-row-reverse">
              <span className="text-xs font-bold text-white">{enemyProfile.name}</span>
              <span
                className="text-[10px] font-mono"
                style={{ color: enemyProfile.accentColor }}
              >
                {enemyProfile.rankTitle}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-snug whitespace-normal break-words italic mt-0.5">
              "{enemyProfile.quotes.calm}"
            </p>
          </div>
        </div>
      </div>

      {/* Main placement layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left column: Shipyard selector and orientation */}
        <div className="lg:col-span-5 space-y-4">
          {/* Orientation switch */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Orientación del Buque
              </span>
              <button
                type="button"
                onClick={onToggleOrientation}
                className="py-1 px-2.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-medium flex items-center gap-1.5 hover:bg-cyan-900/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rotar [R]</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => orientation !== 'horizontal' && onToggleOrientation()}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  orientation === 'horizontal'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Horizontal (➔)
              </button>
              <button
                type="button"
                onClick={() => orientation !== 'vertical' && onToggleOrientation()}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                  orientation === 'vertical'
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-500/40'
                    : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Vertical (⬇)
              </button>
            </div>
          </div>

          {/* Ship Selection list */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Unidades Navales ({playerFleet.length}/5)
              </h3>
              <span className="text-xs font-mono text-cyan-400">
                {currentSegmentsPlaced}/{TOTAL_FLEET_SEGMENTS} casillas
              </span>
            </div>

            {CLASSIC_FLEET_CONFIG.map((shipConfig) => {
              const isPlaced = placedTypes.has(shipConfig.id);
              const isSelected = selectedShipType === shipConfig.id;

              return (
                <div
                  key={shipConfig.id}
                  onClick={() => onSelectShipType(shipConfig.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer overflow-hidden ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 ring-1 ring-cyan-400 shadow-lg shadow-cyan-950/50'
                      : isPlaced
                      ? 'bg-slate-950/50 border-emerald-900/50 hover:border-slate-700'
                      : 'bg-slate-950/30 border-slate-800 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{shipConfig.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {shipConfig.length} casillas
                      </span>
                    </div>

                    {isPlaced ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Desplegado
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-amber-400">
                        Pendiente
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                    {shipConfig.description}
                  </p>

                  <div className="h-8 w-full flex items-center justify-center px-3 py-0.5 bg-slate-950/80 rounded-lg border border-slate-800/80 overflow-hidden">
                    <ShipGraphic
                      type={shipConfig.id}
                      length={shipConfig.length}
                      orientation="horizontal"
                      className="h-6 w-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confirm Deployment CTA */}
          <button
            type="button"
            onClick={onConfirmFleet}
            disabled={!isFleetComplete}
            className={`w-full py-4 px-6 rounded-xl font-bold text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isFleetComplete
                ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-600/30'
                : 'bg-slate-800/50 border border-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>
              {isFleetComplete
                ? 'Confirmar Despliegue y Comenzar Batalla'
                : `Coloca todos los barcos para combatir (${playerFleet.length}/5)`}
            </span>
          </button>
        </div>

        {/* Right column: Placement Grid */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur w-full flex flex-col items-center">
            <BoardGrid
              title="Cuadrícula Táctica de Despliegue"
              subtitle={
                selectedConfig
                  ? `Colocando: ${selectedConfig.name} (${selectedConfig.length} casillas) · ${orientation}`
                  : 'Flota completa lista para combate'
              }
              ships={playerFleet}
              shots={[]}
              hits={[]}
              interactive={true}
              placementMode={true}
              selectedShipConfig={selectedConfig}
              placementOrientation={orientation}
              onCellClick={onPlaceShip}
              onCellContextMenu={onRightClickCell}
              hoverCoord={hoverCoord}
              onHoverCoordChange={onHoverCoordChange}
              showCoordinates={showCoordinates}
              radarPulse={radarPulse}
            />

            <div className="mt-4 text-center max-w-lg bg-slate-950/40 border border-slate-800/80 rounded-xl p-2.5">
              <p className="text-xs text-slate-300">
                <strong className="text-cyan-400">Clic izquierdo:</strong> colocar buque ·{' '}
                <strong className="text-cyan-400">Clic derecho:</strong> rotar orientación o girar buques ya colocados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
