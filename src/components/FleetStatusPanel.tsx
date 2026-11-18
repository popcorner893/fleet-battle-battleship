import React from 'react';
import { PlacedShip } from '../types';
import { CLASSIC_FLEET_CONFIG } from '../utils/coordinates';
import { ShipGraphic } from './ShipGraphic';
import { sound } from '../services/audio';

interface FleetStatusPanelProps {
  title: string;
  ships: PlacedShip[];
  isEnemy?: boolean;
  compact?: boolean;
  commandShipId?: string | null;
  onSelectCommandShip?: (shipId: string) => void;
}

export const FleetStatusPanel: React.FC<FleetStatusPanelProps> = ({
  title,
  ships,
  isEnemy = false,
  compact = false,
  commandShipId = null,
  onSelectCommandShip,
}) => {
  // Map config to placed ships or fallback info
  const fleetRows = CLASSIC_FLEET_CONFIG.map((cfg) => {
    const placed = ships.find((s) => s.type === cfg.id);
    const isSunk = placed ? placed.isSunk : false;
    const hitCount = placed
      ? Array.isArray(placed.hits)
        ? placed.hits.length
        : isSunk
        ? cfg.length
        : 0
      : 0;
    const totalSegments = cfg.length;

    return {
      config: cfg,
      placed,
      isSunk,
      hitCount,
      totalSegments,
    };
  });

  const survivingCount = fleetRows.filter((r) => !r.isSunk).length;

  return (
    <div
      className={`bg-slate-900/85 border border-slate-800 rounded-xl ${
        compact ? 'p-2.5' : 'p-4'
      } shadow-xl backdrop-blur`}
    >
      <div
        className={`flex items-center justify-between ${
          compact ? 'pb-1.5 mb-2' : 'pb-3 mb-3'
        } border-b border-slate-800`}
      >
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-300 truncate">
          {title}
        </h4>
        <div className="text-[11px] font-mono font-medium text-slate-400 shrink-0">
          <span className="text-cyan-400 font-bold">{survivingCount}</span>/5 A flote
        </div>
      </div>

      <div className={compact ? 'space-y-1.5' : 'space-y-3'}>
        {fleetRows.map(({ config, placed, isSunk, hitCount, totalSegments }) => {
          const isCommanded = !isEnemy && placed && placed.id === commandShipId && !isSunk;
          const canSelect = !isEnemy && Boolean(onSelectCommandShip && placed && !isSunk);

          return (
            <div
              key={config.id}
              onClick={() => {
                if (canSelect && placed && onSelectCommandShip) {
                  sound.playClick();
                  onSelectCommandShip(placed.id);
                }
              }}
              className={`${
                compact ? 'py-1.5 px-2' : 'p-2'
              } rounded-lg border transition-all ${
                canSelect ? 'cursor-pointer' : ''
              } ${
                isSunk
                  ? 'bg-rose-950/20 border-rose-900/40 opacity-70'
                  : isCommanded
                  ? 'bg-cyan-950/50 border-cyan-400/80 ring-1 ring-cyan-400/40 shadow-sm'
                  : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`${
                      compact ? 'text-[11px]' : 'text-xs'
                    } font-semibold truncate ${
                      isSunk
                        ? 'text-rose-400 line-through'
                        : isCommanded
                        ? 'text-cyan-200 font-bold'
                        : 'text-slate-200'
                    }`}
                  >
                    {config.name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    ({config.length})
                  </span>
                  {placed?.shielded && !isSunk && (
                    <span
                      className="text-[9px] px-1 py-0.2 rounded bg-cyan-900/80 border border-cyan-500/60 text-cyan-200 font-bold"
                      title="Escudo Blindado activo"
                    >
                      🛡️
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider shrink-0 ${
                    isSunk
                      ? 'text-rose-400 font-bold'
                      : isCommanded
                      ? 'text-amber-300 font-extrabold'
                      : 'text-cyan-400'
                  }`}
                >
                  {isSunk ? 'Hundido' : isCommanded ? '★ Al Mando' : 'Activo'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                {/* Ship mini SVG preview */}
                <div
                  className={`${
                    compact ? 'w-14 h-3.5' : 'w-16 h-4.5'
                  } opacity-85 shrink-0 flex items-center justify-center overflow-hidden`}
                >
                  <ShipGraphic
                    type={config.id}
                    length={config.length}
                    isSunk={isSunk}
                    className="w-full h-full"
                  />
                </div>

                {/* Segment health pips */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalSegments }).map((_, idx) => {
                    // For enemy, only reveal hits or sunk
                    const isDamaged = isEnemy
                      ? isSunk || idx < hitCount
                      : idx < hitCount;

                    return (
                      <span
                        key={idx}
                        className={`${
                          compact ? 'w-2.5 h-1.5' : 'w-3.5 h-2'
                        } rounded-xs border transition-colors ${
                          isSunk
                            ? 'bg-rose-600 border-rose-500'
                            : isDamaged
                            ? 'bg-amber-500 border-amber-400'
                            : 'bg-cyan-900/50 border-cyan-700/60'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

