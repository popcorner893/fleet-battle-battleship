import { Coordinate, Difficulty, PlacedShip } from '../types';
import {
  BOARD_SIZE,
  CLASSIC_FLEET_CONFIG,
  areCoordinatesEqual,
  containsCoordinate,
  getOrthogonalNeighbors,
  isInBounds,
} from '../utils/coordinates';

export interface AiDecisionContext {
  previousShots: Coordinate[];
  hits: Coordinate[];
  sunkShips: PlacedShip[];
  difficulty: Difficulty;
}

function coordKey(c: Coordinate): string {
  return `${c.row},${c.col}`;
}

/**
 * Gets all board coordinates that have not yet been attacked
 */
export function getAvailableCoordinates(previousShots: Coordinate[]): Coordinate[] {
  const shotSet = new Set(previousShots.map(coordKey));
  const available: Coordinate[] = [];

  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (!shotSet.has(`${r},${c}`)) {
        available.push({ row: r, col: c });
      }
    }
  }

  return available;
}

/**
 * Identifies hits that do not belong to already sunk ships.
 * These are the current tactical targets for Hunt & Target mode.
 */
export function getUnresolvedHits(hits: Coordinate[], sunkShips: PlacedShip[]): Coordinate[] {
  const sunkCoordSet = new Set<string>();
  for (const ship of sunkShips) {
    for (const c of ship.coordinates) {
      sunkCoordSet.add(coordKey(c));
    }
  }

  return hits.filter((h) => !sunkCoordSet.has(coordKey(h)));
}

/**
 * Calculates remaining unsunk enemy ship lengths based on announced sunk ships
 */
export function getRemainingShipLengths(sunkShips: PlacedShip[]): number[] {
  const allLengths = CLASSIC_FLEET_CONFIG.map((c) => c.length);
  const sunkLengths = sunkShips.map((s) => s.length);

  const remaining = [...allLengths];
  for (const len of sunkLengths) {
    const idx = remaining.indexOf(len);
    if (idx !== -1) {
      remaining.splice(idx, 1);
    }
  }

  return remaining.length > 0 ? remaining : [2];
}

/**
 * Evaluates whether a ship of `length` can fit horizontally or vertically through `cell`
 * without colliding with existing shots (misses or sunk ships).
 */
function canShipFitThroughCell(
  cell: Coordinate,
  length: number,
  shotSet: Set<string>
): boolean {
  // Horizontal check
  for (let offset = 0; offset < length; offset++) {
    const startCol = cell.col - offset;
    const endCol = startCol + length - 1;
    if (startCol >= 0 && endCol < BOARD_SIZE) {
      let canFit = true;
      for (let c = startCol; c <= endCol; c++) {
        if (shotSet.has(`${cell.row},${c}`) && c !== cell.col) {
          canFit = false;
          break;
        }
      }
      if (canFit) return true;
    }
  }

  // Vertical check
  for (let offset = 0; offset < length; offset++) {
    const startRow = cell.row - offset;
    const endRow = startRow + length - 1;
    if (startRow >= 0 && endRow < BOARD_SIZE) {
      let canFit = true;
      for (let r = startRow; r <= endRow; r++) {
        if (shotSet.has(`${r},${cell.col}`) && r !== cell.row) {
          canFit = false;
          break;
        }
      }
      if (canFit) return true;
    }
  }

  return false;
}

/**
 * Target mode: determines next shot when there are unresolved hits on the board
 */
function selectTargetShot(
  unresolvedHits: Coordinate[],
  previousShots: Coordinate[]
): Coordinate | null {
  const shotSet = new Set(previousShots.map(coordKey));

  // Case 1: Multiple unresolved hits -> check for directional alignment
  if (unresolvedHits.length >= 2) {
    // Try to find two hits in the same row or column
    for (let i = 0; i < unresolvedHits.length; i++) {
      for (let j = i + 1; j < unresolvedHits.length; j++) {
        const h1 = unresolvedHits[i];
        const h2 = unresolvedHits[j];

        // Horizontal line
        if (h1.row === h2.row) {
          const row = h1.row;
          const minCol = Math.min(h1.col, h2.col);
          const maxCol = Math.max(h1.col, h2.col);

          // Check left end
          const leftCandidate: Coordinate = { row, col: minCol - 1 };
          if (isInBounds(leftCandidate) && !shotSet.has(coordKey(leftCandidate))) {
            return leftCandidate;
          }

          // Check right end
          const rightCandidate: Coordinate = { row, col: maxCol + 1 };
          if (isInBounds(rightCandidate) && !shotSet.has(coordKey(rightCandidate))) {
            return rightCandidate;
          }
        }

        // Vertical line
        if (h1.col === h2.col) {
          const col = h1.col;
          const minRow = Math.min(h1.row, h2.row);
          const maxRow = Math.max(h1.row, h2.row);

          // Check top end
          const topCandidate: Coordinate = { row: minRow - 1, col };
          if (isInBounds(topCandidate) && !shotSet.has(coordKey(topCandidate))) {
            return topCandidate;
          }

          // Check bottom end
          const bottomCandidate: Coordinate = { row: maxRow + 1, col };
          if (isInBounds(bottomCandidate) && !shotSet.has(coordKey(bottomCandidate))) {
            return bottomCandidate;
          }
        }
      }
    }
  }

  // Case 2: One hit or multiple hits without open collinear ends
  // Check orthogonal neighbors of the most recent unresolved hit first
  const reversedHits = [...unresolvedHits].reverse();
  for (const hit of reversedHits) {
    const neighbors = getOrthogonalNeighbors(hit);
    // Shuffle neighbors for less robotic predictability
    const shuffled = [...neighbors].sort(() => Math.random() - 0.5);
    for (const n of shuffled) {
      if (!shotSet.has(coordKey(n))) {
        return n;
      }
    }
  }

  return null;
}

/**
 * EASY: pure random unattacked cell
 */
function decideEasyShot(available: Coordinate[]): Coordinate {
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

/**
 * MEDIUM: Hunt and target mode
 */
function decideMediumShot(
  available: Coordinate[],
  unresolvedHits: Coordinate[],
  previousShots: Coordinate[]
): Coordinate {
  if (unresolvedHits.length > 0) {
    const targetShot = selectTargetShot(unresolvedHits, previousShots);
    if (targetShot) return targetShot;
  }
  return decideEasyShot(available);
}

/**
 * HARD: Advanced hunt and target with parity spacing, fit probability and dead space avoidance
 */
function decideHardShot(
  available: Coordinate[],
  unresolvedHits: Coordinate[],
  previousShots: Coordinate[],
  sunkShips: PlacedShip[]
): Coordinate {
  // 1. If we have active unresolved hits, prioritize finishing the wounded ship
  if (unresolvedHits.length > 0) {
    const targetShot = selectTargetShot(unresolvedHits, previousShots);
    if (targetShot) return targetShot;
  }

  // 2. Parity Search: calculate smallest surviving ship length
  const remainingLengths = getRemainingShipLengths(sunkShips);
  const minLength = Math.min(...remainingLengths);

  const shotSet = new Set(previousShots.map(coordKey));

  // Filter available cells by parity pattern (checkerboard if minLength is 2, or spaced grid)
  const parityCandidates = available.filter(
    (c) => (c.row + c.col) % minLength === 0 && canShipFitThroughCell(c, minLength, shotSet)
  );

  if (parityCandidates.length > 0) {
    // Pick the candidate with the highest density (most orientations of remaining ships fitting)
    let bestCandidates: Coordinate[] = [];
    let maxFitCount = -1;

    for (const candidate of parityCandidates) {
      let fitScore = 0;
      for (const len of remainingLengths) {
        if (canShipFitThroughCell(candidate, len, shotSet)) {
          fitScore += len;
        }
      }
      if (fitScore > maxFitCount) {
        maxFitCount = fitScore;
        bestCandidates = [candidate];
      } else if (fitScore === maxFitCount) {
        bestCandidates.push(candidate);
      }
    }

    const chosen = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
    return chosen;
  }

  // Fallback: any available cell where at least the smallest ship fits
  const viableCells = available.filter((c) => canShipFitThroughCell(c, minLength, shotSet));
  if (viableCells.length > 0) {
    return viableCells[Math.floor(Math.random() * viableCells.length)];
  }

  // Absolute fallback
  return decideEasyShot(available);
}

/**
 * Main AI decision entry point.
 * Guarantees never repeating a shot and respecting tournament secrecy.
 */
export function getAiShot(context: AiDecisionContext): Coordinate {
  const { previousShots, hits, sunkShips, difficulty } = context;
  const available = getAvailableCoordinates(previousShots);

  if (available.length === 0) {
    throw new Error('No hay casillas disponibles para disparar.');
  }

  const unresolvedHits = getUnresolvedHits(hits, sunkShips);

  switch (difficulty) {
    case 'EASY':
      return decideEasyShot(available);
    case 'MEDIUM':
      return decideMediumShot(available, unresolvedHits, previousShots);
    case 'HARD':
      return decideHardShot(available, unresolvedHits, previousShots, sunkShips);
    default:
      return decideMediumShot(available, unresolvedHits, previousShots);
  }
}
