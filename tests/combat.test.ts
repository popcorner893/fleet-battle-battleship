import { describe, it, expect } from 'vitest';
import { processShot, checkFleetEliminated, calculateAccuracy } from '../src/engine/combat';
import { PlacedShip } from '../src/types';

describe('Engine: Combat & Damage Resolution', () => {
  const sampleFleet: PlacedShip[] = [
    {
      id: 'patrol_1',
      type: 'patrol',
      name: 'Patrullera',
      length: 2,
      orientation: 'horizontal',
      coordinates: [
        { row: 0, col: 0 },
        { row: 0, col: 1 },
      ],
      hits: [],
      isSunk: false,
    },
    {
      id: 'destroyer_1',
      type: 'destroyer',
      name: 'Destructor',
      length: 3,
      orientation: 'vertical',
      coordinates: [
        { row: 2, col: 5 },
        { row: 3, col: 5 },
        { row: 4, col: 5 },
      ],
      hits: [],
      isSunk: false,
    },
  ];

  it('resolves a miss shot correctly', () => {
    const result = processShot({ row: 5, col: 5 }, sampleFleet, [], 'player');
    expect(result.isValid).toBe(true);
    expect(result.isDuplicate).toBe(false);
    expect(result.outcome.result).toBe('miss');
    expect(result.outcome.isSunk).toBeFalsy();
  });

  it('rejects duplicate shots', () => {
    const previous = [{ row: 0, col: 0 }];
    const result = processShot({ row: 0, col: 0 }, sampleFleet, previous, 'player');
    expect(result.isDuplicate).toBe(true);
  });

  it('resolves a hit on an unsunk ship', () => {
    const result = processShot({ row: 0, col: 0 }, sampleFleet, [], 'player');
    expect(result.outcome.result).toBe('hit');
    expect(result.outcome.shipName).toBe('Patrullera');
    expect(result.outcome.isSunk).toBe(false);

    const updatedShip = result.updatedShips.find((s) => s.id === 'patrol_1');
    expect(updatedShip?.hits).toHaveLength(1);
    expect(updatedShip?.isSunk).toBe(false);
  });

  it('resolves a sunk ship when all segments are damaged', () => {
    // First shot hits (0, 0)
    const firstShot = processShot({ row: 0, col: 0 }, sampleFleet, [], 'player');

    // Second shot hits (0, 1) -> Sunk!
    const secondShot = processShot(
      { row: 0, col: 1 },
      firstShot.updatedShips,
      [{ row: 0, col: 0 }],
      'player'
    );

    expect(secondShot.outcome.result).toBe('sunk');
    expect(secondShot.outcome.isSunk).toBe(true);
    expect(secondShot.outcome.shipName).toBe('Patrullera');

    const sunkShip = secondShot.updatedShips.find((s) => s.id === 'patrol_1');
    expect(sunkShip?.isSunk).toBe(true);
  });

  it('detects fleet elimination and victory condition', () => {
    // Only one ship in this miniature fleet
    const miniFleet: PlacedShip[] = [
      {
        id: 'patrol_mini',
        type: 'patrol',
        name: 'Patrullera',
        length: 2,
        orientation: 'horizontal',
        coordinates: [
          { row: 1, col: 1 },
          { row: 1, col: 2 },
        ],
        hits: [{ row: 1, col: 1 }],
        isSunk: false,
      },
    ];

    expect(checkFleetEliminated(miniFleet)).toBe(false);

    // Final shot sinks last ship
    const finalShot = processShot(
      { row: 1, col: 2 },
      miniFleet,
      [{ row: 1, col: 1 }],
      'player'
    );

    expect(finalShot.outcome.isGameOver).toBe(true);
    expect(finalShot.outcome.winner).toBe('player');
    expect(checkFleetEliminated(finalShot.updatedShips)).toBe(true);
  });

  it('calculates accuracy percentage accurately', () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
    expect(calculateAccuracy(5, 10)).toBe(50);
    expect(calculateAccuracy(1, 3)).toBe(33.3);
    expect(calculateAccuracy(17, 34)).toBe(50);
  });

  it('correctly reports game over and defeat state upon fleet annihilation', () => {
    const singleShipFleet: PlacedShip[] = [
      {
        id: 'patrol_test',
        type: 'patrol',
        name: 'Patrullera',
        length: 2,
        orientation: 'horizontal',
        coordinates: [
          { row: 3, col: 3 },
          { row: 3, col: 4 },
        ],
        hits: [{ row: 3, col: 3 }],
        isSunk: false,
      },
    ];

    const finalShot = processShot(
      { row: 3, col: 4 },
      singleShipFleet,
      [{ row: 3, col: 3 }],
      'ai'
    );

    expect(finalShot.outcome.result).toBe('sunk');
    expect(finalShot.outcome.isGameOver).toBe(true);
    expect(finalShot.outcome.winner).toBe('ai');
  });
});

