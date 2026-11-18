import React from 'react';
import {
  Crosshair,
  Zap,
  Wrench,
  Radio,
  Plane,
  Shield,
  Navigation,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  SkipForward,
  Settings,
} from 'lucide-react';
import {
  Coordinate,
  MoveDirection,
  PlacedShip,
  SalvoOrientation,
  ShipTypeId,
  TacticalAbilityType,
} from '../types';
import { CLASSIC_FLEET_CONFIG } from '../utils/coordinates';
import { calculateActionCost, canMoveShip } from '../engine/board';
import { ShipGraphic } from './ShipGraphic';
import { sound } from '../services/audio';

interface TacticalAbilitiesBarProps {
  playerFleet?: PlacedShip[];
  aiShots?: Coordinate[];
  maneuverCooldown?: number;
  commandShipId?: string | null;
  onSelectCommandShip?: (shipId: string) => void;
  currentAp?: number;
  maxAp?: number;
  activeTargeting: TacticalAbilityType | null;
  onSelectAbility: (ability: TacticalAbilityType | null) => void;
  onMoveCommandShip?: (dir: MoveDirection) => void;
  onRepairCommandShip?: () => void;
  onActivateSpecialImmediate?: () => void;
  onEndTurn?: () => void;
  salvoOrientation?: SalvoOrientation;
  onToggleSalvoOrientation?: () => void;
  isPlayerTurn: boolean;
  disabled?: boolean;
  compact?: boolean;
  hitsCount?: number;
  hitsRequired?: number;
  usedAbility?: TacticalAbilityType | null;
}

const SPECIAL_ABILITY_META: Record<
  ShipTypeId,
  {
    shortTitle: string;
    shortDesc: string;
    hasOrientation?: boolean;
    immediate?: boolean;
  }
> = {
  carrier: {
    shortTitle: 'Aéreo',
    shortDesc: 'Bombardeo en cruz (5 cas.)',
  },
  battleship: {
    shortTitle: 'Escudo',
    shortDesc: 'Bloquea 1 impacto directo',
    immediate: true,
  },
  cruiser: {
    shortTitle: 'Salva',
    shortDesc: '2 casillas en línea',
    hasOrientation: true,
  },
  destroyer: {
    shortTitle: 'Misiles',
    shortDesc: '3 casillas en línea',
    hasOrientation: true,
  },
  patrol: {
    shortTitle: 'Sonar',
    shortDesc: 'Escaneo 3×3 (9 cas.)',
  },
};

export const TacticalAbilitiesBar: React.FC<TacticalAbilitiesBarProps> = ({
  playerFleet = [],
  aiShots = [],
  maneuverCooldown = 0,
  commandShipId = null,
  onSelectCommandShip,
  currentAp = 5,
  maxAp = 5,
  activeTargeting,
  onSelectAbility,
  onMoveCommandShip,
  onRepairCommandShip,
  onActivateSpecialImmediate,
  onEndTurn,
  salvoOrientation = 'horizontal',
  onToggleSalvoOrientation,
  isPlayerTurn,
  disabled = false,
}) => {
  const commandShip =
    playerFleet.find((s) => s.id === commandShipId && !s.isSunk) ||
    playerFleet.find((s) => !s.isSunk) ||
    null;

  const shipType: ShipTypeId = commandShip?.type || 'carrier';
  const hasAnyDamage = Boolean(commandShip && commandShip.hits.length > 0 && !commandShip.isSunk);

  // Balanced dynamic AP costs
  const attackCost = calculateActionCost('attack', commandShip);
  const doubleShotCost = calculateActionCost('double_shot', commandShip);
  const repairCost = calculateActionCost('repair', commandShip);
  const specialCost = calculateActionCost('special', commandShip);
  const moveCost = calculateActionCost('move', commandShip);

  const canAffordAttack =
    isPlayerTurn && !disabled && currentAp >= attackCost && Boolean(commandShip);
  const canAffordDouble =
    isPlayerTurn && !disabled && currentAp >= doubleShotCost && Boolean(commandShip);
  const canAffordRepair =
    isPlayerTurn && !disabled && currentAp >= repairCost && Boolean(commandShip) && hasAnyDamage;
  const canAffordSpecial =
    isPlayerTurn &&
    !disabled &&
    currentAp >= specialCost &&
    Boolean(commandShip) &&
    !(commandShip?.type === 'battleship' && commandShip.shielded);
  const canAffordMove =
    isPlayerTurn &&
    !disabled &&
    maneuverCooldown === 0 &&
    currentAp >= moveCost &&
    Boolean(commandShip);

  const canMoveUp = canAffordMove && canMoveShip(commandShip, 'UP', playerFleet, aiShots);
  const canMoveDown = canAffordMove && canMoveShip(commandShip, 'DOWN', playerFleet, aiShots);
  const canMoveLeft = canAffordMove && canMoveShip(commandShip, 'LEFT', playerFleet, aiShots);
  const canMoveRight = canAffordMove && canMoveShip(commandShip, 'RIGHT', playerFleet, aiShots);

  const specialMeta = SPECIAL_ABILITY_META[shipType];
  const carrierBonusActive = playerFleet.some((s) => s.type === 'carrier' && !s.isSunk);
  const survivingCount = playerFleet.filter((s) => !s.isSunk).length;

  const handleSelectTargeting = (mode: TacticalAbilityType, affordable: boolean) => {
    if (!affordable) return;
    sound.playClick();
    if (activeTargeting === mode) {
      onSelectAbility(null);
    } else {
      onSelectAbility(mode);
    }
  };

  return (
    <div className="w-full bg-[#0b1323]/95 border border-slate-800/90 rounded-2xl p-3 shadow-2xl flex flex-col gap-2">
      {/* 1. HEADER: SOPORTE | 6/6 AP | FIN TURNO */}
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <Settings className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-white truncate">
            SOPORTE
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="flex items-center gap-1 bg-slate-950/90 border border-cyan-500/40 px-2.5 py-0.5 rounded-full"
            title={
              carrierBonusActive
                ? '5 AP Base + 1 AP Portaaviones'
                : '5 AP Base por turno'
            }
          >
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
            <span className="text-[11px] font-mono font-extrabold text-cyan-300">
              {currentAp}/{maxAp} AP
            </span>
          </div>

          {onEndTurn && (
            <button
              type="button"
              disabled={!isPlayerTurn || disabled}
              onClick={() => {
                sound.playClick();
                onEndTurn();
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer border ${
                isPlayerTurn && !disabled
                  ? 'bg-amber-950/50 hover:bg-amber-900/60 border-amber-500/60 text-amber-300 shadow-sm'
                  : 'bg-slate-950/50 border-slate-800 text-slate-600 cursor-not-allowed'
              }`}
              title="Finalizar turno"
            >
              <span>FIN TURNO</span>
              <SkipForward className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. AP PIPS BAR */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          {Array.from({ length: maxAp }).map((_, i) => {
            const active = i < currentAp;
            const isBonusPip = i === 5;
            return (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  active
                    ? isBonusPip
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.75)]'
                      : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.75)]'
                    : 'bg-slate-800/90'
                }`}
              />
            );
          })}
        </div>
        <span className="text-[9px] font-medium text-slate-400 shrink-0">
          {carrierBonusActive ? '+1 AP Portaaviones' : 'Base 5 AP'}
        </span>
      </div>

      {/* 3. LAS 5 HABILIDADES TÁCTICAS */}
      <div className="flex flex-col gap-1 pt-0.5">
        {/* 1. DISPARO */}
        <button
          type="button"
          disabled={!canAffordAttack}
          onClick={() => handleSelectTargeting('attack', canAffordAttack)}
          className={`w-full py-1.5 px-2 rounded-xl transition-all flex items-center gap-2.5 text-left cursor-pointer ${
            activeTargeting === 'attack'
              ? 'bg-cyan-950/60 ring-1 ring-cyan-400/70'
              : canAffordAttack
              ? 'hover:bg-slate-800/50'
              : 'opacity-45 cursor-not-allowed'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
              activeTargeting === 'attack'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                : 'bg-slate-900/90 border-slate-800 text-cyan-400'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-extrabold text-white truncate">1. Disparo</span>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-cyan-950/90 border border-cyan-800/70 text-cyan-300 shrink-0">
                {attackCost} AP
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              Ataque a 1 casilla
            </p>
          </div>
        </button>

        {/* 2. DOBLE */}
        <button
          type="button"
          disabled={!canAffordDouble}
          onClick={() => handleSelectTargeting('double_shot', canAffordDouble)}
          className={`w-full py-1.5 px-2 rounded-xl transition-all flex items-center gap-2.5 text-left cursor-pointer ${
            activeTargeting === 'double_shot'
              ? 'bg-amber-950/60 ring-1 ring-amber-400/70'
              : canAffordDouble
              ? 'hover:bg-slate-800/50'
              : 'opacity-45 cursor-not-allowed'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
              activeTargeting === 'double_shot'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-900/90 border-slate-800 text-amber-400'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-extrabold text-white truncate">2. Doble</span>
              <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-amber-300 shrink-0">
                {doubleShotCost} AP
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              2 casillas contiguas (→)
            </p>
          </div>
        </button>

        {/* 3. REPARAR */}
        <button
          type="button"
          disabled={!canAffordRepair}
          onClick={() => {
            if (!canAffordRepair || !onRepairCommandShip) return;
            sound.playClick();
            onRepairCommandShip();
          }}
          className={`w-full py-1.5 px-2 rounded-xl transition-all flex items-center gap-2.5 text-left cursor-pointer ${
            canAffordRepair
              ? 'hover:bg-emerald-950/40 ring-1 ring-emerald-500/40'
              : 'opacity-45 cursor-not-allowed'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
              canAffordRepair
                ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                : 'bg-slate-900/90 border-slate-800 text-slate-500'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span
                className={`text-xs font-extrabold truncate ${
                  canAffordRepair ? 'text-white' : 'text-slate-400'
                }`}
              >
                3. Reparar
              </span>
              <span
                className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md shrink-0 ${
                  canAffordRepair
                    ? 'bg-emerald-950/90 border border-emerald-700 text-emerald-300'
                    : 'bg-slate-800/80 text-slate-400'
                }`}
              >
                {repairCost} AP
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {hasAnyDamage ? 'Restaura 1 impacto' : 'Sin daños'}
            </p>
          </div>
        </button>

        {/* 4. HABILIDAD ESPECIAL (AÉREO / ESCUDO / SALVA / MISILES / SONAR) */}
        <div
          className={`w-full py-1.5 px-2 rounded-xl transition-all flex items-center gap-2.5 ${
            activeTargeting === 'special'
              ? 'bg-rose-950/60 ring-1 ring-rose-400/70'
              : canAffordSpecial
              ? 'hover:bg-slate-800/50'
              : 'opacity-45'
          }`}
        >
          <button
            type="button"
            disabled={!canAffordSpecial}
            onClick={() => {
              if (!canAffordSpecial) return;
              if (specialMeta.immediate && onActivateSpecialImmediate) {
                sound.playClick();
                onActivateSpecialImmediate();
              } else {
                handleSelectTargeting('special', canAffordSpecial);
              }
            }}
            className="flex-1 flex items-center gap-2.5 text-left min-w-0 cursor-pointer disabled:cursor-not-allowed"
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${
                activeTargeting === 'special'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                  : 'bg-slate-900/90 border-slate-800 text-rose-400'
              }`}
            >
              {shipType === 'carrier' ? (
                <Plane className="w-3.5 h-3.5" />
              ) : shipType === 'battleship' ? (
                <Shield className="w-3.5 h-3.5" />
              ) : shipType === 'patrol' ? (
                <Radio className="w-3.5 h-3.5" />
              ) : (
                <Crosshair className="w-3.5 h-3.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-extrabold text-white truncate">
                  4. {specialMeta.shortTitle}
                </span>
                <span className="text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-amber-300 shrink-0">
                  {specialCost} AP
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                {commandShip?.type === 'battleship' && commandShip.shielded
                  ? 'Escudo activo 🛡️'
                  : specialMeta.shortDesc}
              </p>
            </div>
          </button>

          {specialMeta.hasOrientation && onToggleSalvoOrientation && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                sound.playRotate();
                onToggleSalvoOrientation();
              }}
              title="Cambiar orientación (Horizontal → / Vertical ↓)"
              className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-mono font-bold text-cyan-300 flex items-center gap-0.5 shrink-0 cursor-pointer"
            >
              <RotateCw className="w-2.5 h-2.5" />
              <span>{salvoOrientation === 'horizontal' ? '→' : '↓'}</span>
            </button>
          )}
        </div>

        {/* 5. MANIOBRA + CRUCETA MINIMALISTA */}
        <div
          className={`w-full py-1 px-2 rounded-xl flex items-center justify-between gap-2 border-t border-slate-800/60 mt-0.5 pt-1.5 ${
            maneuverCooldown > 0 ? 'opacity-55' : ''
          }`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Navigation
                className={`w-3.5 h-3.5 shrink-0 ${
                  maneuverCooldown > 0 ? 'text-slate-500' : 'text-cyan-400'
                }`}
              />
              <span className="text-xs font-extrabold text-white truncate">5. Maniobra</span>
              {maneuverCooldown > 0 ? (
                <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-700/60 text-amber-300 shrink-0">
                  ⏳ Enfriamiento
                </span>
              ) : (
                <span className="text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-md bg-slate-800/90 text-amber-300 shrink-0">
                  {moveCost} AP
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {maneuverCooldown > 0
                ? 'Disponible en próximo turno'
                : '1 casilla · Sin disparos previos'}
            </p>
          </div>

          {/* Minimalist Cross D-Pad */}
          <div className="grid grid-cols-3 gap-0.5 items-center justify-items-center shrink-0">
            <div />
            <button
              type="button"
              disabled={!canMoveUp}
              onClick={() => {
                if (canMoveUp && onMoveCommandShip) {
                  sound.playRotate();
                  onMoveCommandShip('UP');
                }
              }}
              title="Norte (↑)"
              className={`w-6 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                canMoveUp
                  ? 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80'
                  : 'text-slate-700 cursor-not-allowed'
              }`}
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <div />

            <button
              type="button"
              disabled={!canMoveLeft}
              onClick={() => {
                if (canMoveLeft && onMoveCommandShip) {
                  sound.playRotate();
                  onMoveCommandShip('LEFT');
                }
              }}
              title="Oeste (←)"
              className={`w-6 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                canMoveLeft
                  ? 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80'
                  : 'text-slate-700 cursor-not-allowed'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            <span
              className={`px-1 text-[10px] font-mono font-extrabold ${
                maneuverCooldown > 0 ? 'text-slate-600' : 'text-cyan-400'
              }`}
            >
              {maneuverCooldown > 0 ? '⏳' : `${moveCost}AP`}
            </span>

            <button
              type="button"
              disabled={!canMoveRight}
              onClick={() => {
                if (canMoveRight && onMoveCommandShip) {
                  sound.playRotate();
                  onMoveCommandShip('RIGHT');
                }
              }}
              title="Este (→)"
              className={`w-6 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                canMoveRight
                  ? 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80'
                  : 'text-slate-700 cursor-not-allowed'
              }`}
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div />
            <button
              type="button"
              disabled={!canMoveDown}
              onClick={() => {
                if (canMoveDown && onMoveCommandShip) {
                  sound.playRotate();
                  onMoveCommandShip('DOWN');
                }
              }}
              title="Sur (↓)"
              className={`w-6 h-5 rounded flex items-center justify-center transition-colors cursor-pointer ${
                canMoveDown
                  ? 'text-slate-300 hover:text-cyan-300 hover:bg-slate-800/80'
                  : 'text-slate-700 cursor-not-allowed'
              }`}
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <div />
          </div>
        </div>
      </div>

      {/* 4. PESTAÑA UNIFICADA: TU FLOTA (Selecciona embarcación para las habilidades) */}
      {playerFleet.length > 0 && (
        <div className="pt-2 mt-0.5 border-t border-slate-800/90">
          <div className="flex items-center justify-between mb-1.5 px-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">
              TU FLOTA
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              <strong className="text-cyan-400">{survivingCount}</strong>/5 A flote
            </span>
          </div>

          <div className="flex flex-col gap-1">
            {CLASSIC_FLEET_CONFIG.map((cfg) => {
              const ship = playerFleet.find((s) => s.type === cfg.id);
              if (!ship) return null;
              const isSelected = commandShip?.id === ship.id && !ship.isSunk;
              const hitCount = ship.hits.length;
              const hpRemaining = ship.length - hitCount;

              return (
                <button
                  key={ship.id}
                  type="button"
                  disabled={ship.isSunk || disabled}
                  onClick={() => {
                    if (!ship.isSunk && onSelectCommandShip) {
                      sound.playClick();
                      onSelectCommandShip(ship.id);
                    }
                  }}
                  className={`w-full py-1 px-2 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    ship.isSunk
                      ? 'bg-rose-950/20 border-rose-900/30 opacity-45 cursor-not-allowed'
                      : isSelected
                      ? 'bg-cyan-950/55 border-cyan-400/90 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Ship silhouette + Name */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-3.5 shrink-0 flex items-center justify-center opacity-90">
                      <ShipGraphic
                        type={ship.type}
                        length={ship.length}
                        isSunk={ship.isSunk}
                        className="w-full h-full"
                      />
                    </div>
                    <span
                      className={`text-[11px] font-bold truncate ${
                        ship.isSunk
                          ? 'text-rose-400 line-through'
                          : isSelected
                          ? 'text-cyan-200'
                          : 'text-slate-200'
                      }`}
                    >
                      {ship.name}
                    </span>
                    {ship.shielded && !ship.isSunk && (
                      <span className="text-[9px]" title="Escudo Blindado activo">
                        🛡️
                      </span>
                    )}
                  </div>

                  {/* Right: Health Pips + Fraction */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: ship.length }).map((_, idx) => {
                        const isDamaged = idx < hitCount;
                        return (
                          <span
                            key={idx}
                            className={`w-2 h-1.5 rounded-xs border ${
                              ship.isSunk
                                ? 'bg-rose-600 border-rose-500'
                                : isDamaged
                                ? 'bg-amber-500 border-amber-400'
                                : 'bg-cyan-400/80 border-cyan-300'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <span
                      className={`text-[9px] font-mono w-7 text-right ${
                        ship.isSunk
                          ? 'text-rose-400 font-bold'
                          : isSelected
                          ? 'text-cyan-300 font-bold'
                          : 'text-slate-400'
                      }`}
                    >
                      {hpRemaining}/{ship.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};



