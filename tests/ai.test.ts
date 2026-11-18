import { describe, it, expect } from 'vitest';
import { getAiShot, getAvailableCoordinates, getUnresolvedHits } from '../src/ai/brain';
import { Coordinate, PlacedShip } from '../src/types';
import { areCoordinatesEqual, isInBounds } from '../src/utils/coordinates';

describe('AI: Tactical Decision Engine', () => {
  it('EASY AI selects valid in-bounds coordinates and never repeats shots', () => {
    const previousShots: Coordinate[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
    ];

    for (let i = 0; i < 20; i++) {
      const shot = getAiShot({
        previousShots,
        hits: [],
        sunkShips: [],
        difficulty: 'EASY',
      });

      expect(isInBounds(shot)).toBe(true);
      const isDuplicate = previousShots.some((p) => areCoordinatesEqual(p, shot));
      expect(isDuplicate).toBe(false);
    }
  });

  it('MEDIUM AI prioritizes orthogonal neighbors after an unresolved hit', () => {
    const hitCoord: Coordinate = { row: 4, col: 4 };
    const previousShots: Coordinate[] = [hitCoord];
    const hits: Coordinate[] = [hitCoord];

    // Orthogonal neighbors of (4,4) are (3,4), (5,4), (4,3), (4,5)
    const expectedNeighbors = [
      { row: 3, col: 4 },
      { row: 5, col: 4 },
      { row: 4, col: 3 },
      { row: 4, col: 5 },
    ];

    for (let i = 0; i < 10; i++) {
      const shot = getAiShot({
        previousShots,
        hits,
        sunkShips: [],
        difficulty: 'MEDIUM',
      });

      const isNeighbor = expectedNeighbors.some((n) => areCoordinatesEqual(n, shot));
      expect(isNeighbor).toBe(true);
    }
  });

  it('MEDIUM & HARD AI follows collinear direction when 2 hits align', () => {
    // Two hits in a horizontal line at (4,4) and (4,5)
    const hits: Coordinate[] = [
      { row: 4, col: 4 },
      { row: 4, col: 5 },
    ];
    const previousShots: Coordinate[] = [
      { row: 4, col: 4 },
      { row: 4, col: 5 },
    ];

    // Left end is (4,3), right end is (4,6)
    const validEnds = [
      { row: 4, col: 3 },
      { row: 4, col: 6 },
    ];

    const shot = getAiShot({
      previousShots,
      hits,
      sunkShips: [],
      difficulty: 'HARD',
    });

    const isCollinearEnd = validEnds.some((end) => areCoordinatesEqual(end, shot));
    expect(isCollinearEnd).toBe(true);
  });

  it('HARD AI clears hunt hypotheses once the ship has sunk', () => {
    const sunkShip: PlacedShip = {
      id: 'patrol_1',
      type: 'patrol',
      name: 'Patrullera',
      length: 2,
      orientation: 'horizontal',
      coordinates: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      hits: [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
      ],
      isSunk: true,
    };

    const hits: Coordinate[] = [
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ];

    const unresolved = getUnresolvedHits(hits, [sunkShip]);
    expect(unresolved).toHaveLength(0);

    // AI should not obsess over neighbors of the sunk ship
    const shot = getAiShot({
      previousShots: hits,
      hits,
      sunkShips: [sunkShip],
      difficulty: 'HARD',
    });

    expect(isInBounds(shot)).toBe(true);
  });
});
