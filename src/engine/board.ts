import {
  Coordinate,
  MoveDirection,
  Orientation,
  PlacedShip,
  ShipConfig,
  BoardCell,
} from '../types';
import {
  BOARD_SIZE,
  CLASSIC_FLEET_CONFIG,
  TOTAL_FLEET_SEGMENTS,
  isInBounds,
  areCoordinatesEqual,
  containsCoordinate,
} from '../utils/coordinates';

/**
 * Calculates coordinates occupied by a ship given origin, length and orientation
 */
export function calculateShipCoordinates(
  origin: Coordinate,
  length: number,
  orientation: Orientation
): Coordinate[] {
  const coordinates: Coordinate[] = [];
  for (let i = 0; i < length; i++) {
    if (orientation === 'horizontal') {
      coordinates.push({ row: origin.row, col: origin.col + i });
    } else {
      coordinates.push({ row: origin.row + i, col: origin.col });
    }
  }
  return coordinates;
}

/**
 * Checks if a proposed placement is strictly within bounds and doesn't overlap existing ships
 */
export function isValidPlacement(
  origin: Coordinate,
  length: number,
  orientation: Orientation,
  existingShips: PlacedShip[],
  ignoreShipId?: string
): boolean {
  const coords = calculateShipCoordinates(origin, length, orientation);

  // Check board boundaries
  for (const c of coords) {
    if (!isInBounds(c)) {
      return false;
    }
  }

  // Check overlap with existing ships (excluding ignored ship if re-positioning)
  const otherShips = ignoreShipId
    ? existingShips.filter((s) => s.id !== ignoreShipId)
    : existingShips;

  for (const ship of otherShips) {
    for (const c of coords) {
      if (containsCoordinate(ship.coordinates, c)) {
        return false; // Collision detected
      }
    }
  }

  return true;
}

/**
 * Validates whether a completed fleet conforms to tournament rules
 */
export function validateFleet(ships: PlacedShip[]): { valid: boolean; reason?: string } {
  if (ships.length !== CLASSIC_FLEET_CONFIG.length) {
    return {
      valid: false,
      reason: `La flota debe contener exactamente ${CLASSIC_FLEET_CONFIG.length} barcos. Actualmente hay ${ships.length}.`,
    };
  }

  let totalSegments = 0;
  const occupied = new Set<string>();

  for (const ship of ships) {
    totalSegments += ship.length;
    for (const coord of ship.coordinates) {
      if (!isInBounds(coord)) {
        return {
          valid: false,
          reason: `El barco ${ship.name} tiene coordenadas fuera del tablero.`,
        };
      }
      const key = `${coord.row},${coord.col}`;
      if (occupied.has(key)) {
        return {
          valid: false,
          reason: `Hay superposición de barcos en la casilla ${key}.`,
        };
      }
      occupied.add(key);
    }
  }

  if (totalSegments !== TOTAL_FLEET_SEGMENTS) {
    return {
      valid: false,
      reason: `La suma de segmentos de la flota debe ser ${TOTAL_FLEET_SEGMENTS}. Se encontraron ${totalSegments}.`,
    };
  }

  return { valid: true };
}

/**
 * Generates an automatic valid fleet placement using an optimized monte-carlo placement
 */
export function generateRandomFleet(
  fleetConfigs: ShipConfig[] = CLASSIC_FLEET_CONFIG,
  maxRetries: number = 200
): PlacedShip[] {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const placed: PlacedShip[] = [];
    let success = true;

    for (const config of fleetConfigs) {
      const orientation: Orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
      const maxRow = orientation === 'horizontal' ? BOARD_SIZE - 1 : BOARD_SIZE - config.length;
      const maxCol = orientation === 'horizontal' ? BOARD_SIZE - config.length : BOARD_SIZE - 1;

      // Try random positions for this ship
      let shipPlaced = false;
      const positions: Coordinate[] = [];
      for (let r = 0; r <= maxRow; r++) {
        for (let c = 0; c <= maxCol; c++) {
          positions.push({ row: r, col: c });
        }
      }
      // Shuffle positions
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      for (const pos of positions) {
        if (isValidPlacement(pos, config.length, orientation, placed)) {
          const coordinates = calculateShipCoordinates(pos, config.length, orientation);
          placed.push({
            id: `${config.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: config.id,
            name: config.name,
            length: config.length,
            orientation,
            coordinates,
            hits: [],
            isSunk: false,
          });
          shipPlaced = true;
          break;
        }
      }

      if (!shipPlaced) {
        success = false;
        break; // retry entire fleet
      }
    }

    if (success && validateFleet(placed).valid) {
      return placed;
    }
  }

  throw new Error('No se pudo generar una flota válida en los intentos máximos.');
}

/**
 * Creates an empty 10x10 board cell matrix
 */
export function createEmptyGrid(): BoardCell[][] {
  const grid: BoardCell[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push({
        row: r,
        col: c,
        hasShip: false,
        isHit: false,
        isMiss: false,
        isSunkShip: false,
        isLastTarget: false,
      });
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Constructs a fully derived 10x10 view matrix from ships, shots, and hits
 */
export function buildGridState(
  ships: PlacedShip[],
  shots: Coordinate[],
  hits: Coordinate[],
  lastTarget?: Coordinate | null,
  hideUndamagedShips: boolean = false
): BoardCell[][] {
  const grid = createEmptyGrid();

  // Mark ships
  for (const ship of ships) {
    for (const coord of ship.coordinates) {
      const cell = grid[coord.row]?.[coord.col];
      if (cell) {
        if (!hideUndamagedShips || ship.isSunk) {
          cell.hasShip = true;
          cell.shipId = ship.id;
        }
        if (ship.isSunk) {
          cell.isSunkShip = true;
        }
      }
    }
  }

  // Mark misses
  for (const shot of shots) {
    const isHit = containsCoordinate(hits, shot);
    const cell = grid[shot.row]?.[shot.col];
    if (cell) {
      if (isHit) {
        cell.isHit = true;
      } else {
        cell.isMiss = true;
      }
    }
  }

  // Mark last target
  if (lastTarget) {
    const targetCell = grid[lastTarget.row]?.[lastTarget.col];
    if (targetCell) {
      targetCell.isLastTarget = true;
    }
  }

  return grid;
}

// ============================================================================
// SISTEMA DE PUNTOS DE ACCIÓN (AP) Y MOVIMIENTOS DEL BUQUE AL MANDO
// ============================================================================

/**
 * Presupuesto Inicial por Turno:
 * Base: 5 AP.
 * Bono de Comando (Portaaviones): +1 AP si el Portaaviones sigue a flote (total 6 AP).
 */
export function calculateMaxAp(fleet: PlacedShip[]): number {
  const carrierAlive = fleet.some((s) => s.type === 'carrier' && !s.isSunk);
  return 5 + (carrierAlive ? 1 : 0);
}

/**
 * Calcula dinámicamente el costo en AP según el rol del Buque al Mando y su nivel de daño.
 * Escala balanceada de costos (Presupuesto 5-6 AP por turno):
 * - Mover 1 casilla (move): 1 AP base (+1 AP si tiene daños, excepto Patrullera)
 * - Disparo Normal (attack, 1 cas.): 2 AP base (+1 AP si daño crítico >= 50%)
 * - Disparo Doble (double_shot, 2 cas.): 3 AP base (Crucero: 2 AP; +1 AP si daño crítico >= 50%)
 * - Reparar Casco (repair, cura 1 impacto): 4 AP base (Acorazado: 3 AP)
 * - Habilidad Especial (special):
 *   · Portaaviones — Ataque Aéreo (5 casillas en cruz): 5 AP
 *   · Destructor — Salva de Misiles (3 casillas en línea): 4 AP
 *   · Acorazado — Fortificación Escudo Blindado: 4 AP
 *   · Crucero — Interdicción Rápida (2 casillas H/V): 3 AP
 *   · Patrullera — Radar / Sonar 3x3 (sin daño): 2 AP
 */
export function calculateActionCost(
  action: 'move' | 'attack' | 'double_shot' | 'repair' | 'special',
  ship: PlacedShip | null | undefined
): number {
  const hasAnyHit = Boolean(ship && ship.hits.length > 0);
  const isCriticalDamage = Boolean(ship && ship.length > 0 && ship.hits.length / ship.length >= 0.5);

  let cost = 1;

  switch (action) {
    case 'move': {
      // Base 1 AP. +1 AP si tiene algún impacto (excepto la Patrullera)
      cost = 1;
      if (hasAnyHit && ship?.type !== 'patrol') {
        cost += 1;
      }
      break;
    }
    case 'attack': {
      // Base 2 AP (1 casilla). +1 AP si tiene daños críticos (>= 50% de su casco dañado)
      cost = 2;
      if (isCriticalDamage) {
        cost += 1;
      }
      break;
    }
    case 'double_shot': {
      // Base 3 AP (2 casillas). Descuento Crucero: 2 AP. +1 AP si tiene daños críticos (>= 50%)
      cost = 3;
      if (ship?.type === 'cruiser') {
        cost -= 1;
      }
      if (isCriticalDamage) {
        cost += 1;
      }
      break;
    }
    case 'repair': {
      // Base 4 AP (restaura 1 impacto). Descuento Acorazado: 3 AP
      cost = 4;
      if (ship?.type === 'battleship') {
        cost = 3;
      }
      break;
    }
    case 'special': {
      // Balanceado según potencia táctica de cada clase:
      if (ship?.type === 'carrier') {
        cost = 5; // Ataque Aéreo en cruz (5 casillas)
      } else if (ship?.type === 'destroyer') {
        cost = 4; // Salva de Misiles (3 casillas en línea)
      } else if (ship?.type === 'battleship') {
        cost = 4; // Escudo Blindado (absorbe próximo impacto)
      } else if (ship?.type === 'cruiser') {
        cost = 3; // Interdicción Rápida (2 casillas orientables)
      } else if (ship?.type === 'patrol') {
        cost = 2; // Escaneo Sonar 3x3
      } else {
        cost = 4;
      }
      break;
    }
  }

  return Math.max(1, cost);
}

export function getDirectionDelta(dir: MoveDirection): Coordinate {
  switch (dir) {
    case 'UP':
      return { row: -1, col: 0 };
    case 'DOWN':
      return { row: 1, col: 0 };
    case 'LEFT':
      return { row: 0, col: -1 };
    case 'RIGHT':
      return { row: 0, col: 1 };
  }
}

/**
 * Valida si un barco puede desplazarse 1 casilla ortogonalmente en la dirección indicada:
 * - Un barco hundido no puede moverse.
 * - No puede salir de la cuadrícula de 10x10.
 * - No puede desplazarse a ninguna casilla donde ya hayan disparado.
 * - No puede colisionar ni superponerse con otro buque aliado.
 */
export function canMoveShip(
  ship: PlacedShip | null | undefined,
  dir: MoveDirection,
  fleet: PlacedShip[],
  shotsOnBoard: Coordinate[] = []
): boolean {
  if (!ship || ship.isSunk) return false;
  const delta = getDirectionDelta(dir);
  const nextCoords = ship.coordinates.map((c) => ({
    row: c.row + delta.row,
    col: c.col + delta.col,
  }));

  // Exclude the moving ship's own hits from blocking shots since its damaged compartments move with the hull
  const ownHits = ship.hits || [];
  const blockingShots = shotsOnBoard.filter(
    (shot) => !containsCoordinate(ownHits, shot)
  );

  for (const c of nextCoords) {
    if (!isInBounds(c)) return false;
    if (containsCoordinate(blockingShots, c)) {
      return false;
    }
  }

  const otherShips = fleet.filter((s) => s.id !== ship.id);
  for (const other of otherShips) {
    for (const c of nextCoords) {
      if (containsCoordinate(other.coordinates, c)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Desplaza 1 casilla el buque seleccionado y sincroniza las coordenadas de sus impactos
 * para que sus compartimientos dañados se muevan junto con su casco.
 */
export function moveShipInFleet(
  shipId: string,
  dir: MoveDirection,
  fleet: PlacedShip[],
  shotsOnBoard: Coordinate[] = []
): { updatedFleet: PlacedShip[]; moved: boolean; delta: Coordinate; movedShip?: PlacedShip } {
  const shipIndex = fleet.findIndex((s) => s.id === shipId);
  if (shipIndex === -1) {
    return { updatedFleet: fleet, moved: false, delta: { row: 0, col: 0 } };
  }

  const ship = fleet[shipIndex];
  if (!canMoveShip(ship, dir, fleet, shotsOnBoard)) {
    return { updatedFleet: fleet, moved: false, delta: { row: 0, col: 0 } };
  }

  const delta = getDirectionDelta(dir);
  const movedShip: PlacedShip = {
    ...ship,
    coordinates: ship.coordinates.map((c) => ({
      row: c.row + delta.row,
      col: c.col + delta.col,
    })),
    hits: ship.hits.map((h) => ({
      row: h.row + delta.row,
      col: h.col + delta.col,
    })),
  };

  const updatedFleet = [
    ...fleet.slice(0, shipIndex),
    movedShip,
    ...fleet.slice(shipIndex + 1),
  ];

  return { updatedFleet, moved: true, delta, movedShip };
}

/**
 * Verifica si el jugador tiene suficientes AP para ejecutar al menos una acción válida
 * (disparar, disparo doble, reparar si tiene daños, habilidad especial o moverse en alguna dirección válida
 * si la maniobra no está en enfriamiento).
 * Si devuelve false, el turno pasa automáticamente a la IA.
 */
export function canPlayerAffordAnyAction(
  currentAp: number,
  fleet: PlacedShip[],
  commandShipId?: string | null,
  shotsOnPlayerBoard: Coordinate[] = [],
  canManeuverThisTurn: boolean = true
): boolean {
  if (currentAp <= 0) return false;

  const livingShips = fleet.filter((s) => !s.isSunk);
  if (livingShips.length === 0) return false;

  // Check if the active ship (or any living ship in the player's fleet) can perform an action
  const targetShips = commandShipId
    ? livingShips.filter((s) => s.id === commandShipId)
    : livingShips;
  const shipsToCheck = targetShips.length > 0 ? targetShips : livingShips;

  const dirs: MoveDirection[] = ['UP', 'DOWN', 'LEFT', 'RIGHT'];

  for (const ship of shipsToCheck) {
    // 1. Normal attack
    if (currentAp >= calculateActionCost('attack', ship)) return true;

    // 2. Double shot
    if (currentAp >= calculateActionCost('double_shot', ship)) return true;

    // 3. Hull repair (only valid if ship is damaged)
    if (ship.hits.length > 0 && currentAp >= calculateActionCost('repair', ship)) {
      return true;
    }

    // 4. Special ability (for Battleship, only valid if shield not already active)
    const canUseSpecial = !(ship.type === 'battleship' && ship.shielded);
    if (canUseSpecial && currentAp >= calculateActionCost('special', ship)) {
      return true;
    }

    // 5. Orthogonal maneuver (only valid if maneuver is off cooldown and at least 1 direction is unobstructed & unshot)
    if (canManeuverThisTurn) {
      const moveCost = calculateActionCost('move', ship);
      if (
        currentAp >= moveCost &&
        dirs.some((d) => canMoveShip(ship, d, fleet, shotsOnPlayerBoard))
      ) {
        return true;
      }
    }
  }

  return false;
}


