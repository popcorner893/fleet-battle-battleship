import { Coordinate, PlacedShip, ShotOutcome } from '../types';
import { areCoordinatesEqual, containsCoordinate, isInBounds } from '../utils/coordinates';

export interface ProcessShotResult {
  outcome: ShotOutcome;
  updatedShips: PlacedShip[];
  isDuplicate: boolean;
  isValid: boolean;
  shieldAbsorbed?: boolean;
}

/**
 * Checks if all ships in a fleet are completely sunk
 */
export function checkFleetEliminated(ships: PlacedShip[]): boolean {
  if (ships.length === 0) return false;
  return ships.every((ship) => ship.isSunk);
}

/**
 * Processes an incoming shot against a defender's fleet.
 * Pure function: does not mutate inputs, returns updated state.
 */
export function processShot(
  target: Coordinate,
  defenderShips: PlacedShip[],
  previousShots: Coordinate[],
  shooter: 'player' | 'ai'
): ProcessShotResult {
  // Validate coordinates
  if (!isInBounds(target)) {
    return {
      isValid: false,
      isDuplicate: false,
      outcome: { coordinate: target, result: 'miss' },
      updatedShips: defenderShips,
    };
  }

  // Check duplicate shot
  if (containsCoordinate(previousShots, target)) {
    return {
      isValid: true,
      isDuplicate: true,
      outcome: { coordinate: target, result: 'miss' },
      updatedShips: defenderShips,
    };
  }

  // Find if a ship is hit
  let hitShipIndex = -1;
  for (let i = 0; i < defenderShips.length; i++) {
    if (containsCoordinate(defenderShips[i].coordinates, target)) {
      hitShipIndex = i;
      break;
    }
  }

  // Case 1: Miss
  if (hitShipIndex === -1) {
    return {
      isValid: true,
      isDuplicate: false,
      outcome: {
        coordinate: target,
        result: 'miss',
      },
      updatedShips: defenderShips,
    };
  }

  const targetShip = defenderShips[hitShipIndex];

  // Case 1.5: Armored Shield (Fortificación Defensiva del Acorazado) absorbs direct hit
  if (targetShip.shielded && !targetShip.isSunk) {
    const unshieldedShip: PlacedShip = {
      ...targetShip,
      shielded: false,
    };
    const updatedShips = [
      ...defenderShips.slice(0, hitShipIndex),
      unshieldedShip,
      ...defenderShips.slice(hitShipIndex + 1),
    ];
    return {
      isValid: true,
      isDuplicate: false,
      shieldAbsorbed: true,
      outcome: {
        coordinate: target,
        result: 'miss',
        shipId: unshieldedShip.id,
        shipName: `🛡️ Escudo Blindado de ${unshieldedShip.name} absorbió el impacto`,
      },
      updatedShips,
    };
  }

  // Case 2: Hit
  const alreadyHitSegment = containsCoordinate(targetShip.hits, target);
  const newHits = alreadyHitSegment ? targetShip.hits : [...targetShip.hits, target];
  const isSunk = newHits.length >= targetShip.length;

  const updatedShip: PlacedShip = {
    ...targetShip,
    hits: newHits,
    isSunk,
  };

  const updatedShips = [
    ...defenderShips.slice(0, hitShipIndex),
    updatedShip,
    ...defenderShips.slice(hitShipIndex + 1),
  ];

  const isGameOver = checkFleetEliminated(updatedShips);

  const outcome: ShotOutcome = {
    coordinate: target,
    result: isSunk ? 'sunk' : 'hit',
    shipId: updatedShip.id,
    shipName: updatedShip.name,
    isSunk,
    sunkShip: isSunk ? updatedShip : undefined,
    isGameOver,
    winner: isGameOver ? shooter : undefined,
  };

  return {
    isValid: true,
    isDuplicate: false,
    outcome,
    updatedShips,
  };
}

/**
 * Calculates shooting precision percentage with 1 decimal place
 */
export function calculateAccuracy(hits: number, totalShots: number): number {
  if (totalShots === 0) return 0;
  const ratio = (hits / totalShots) * 100;
  return Math.round(ratio * 10) / 10;
}
