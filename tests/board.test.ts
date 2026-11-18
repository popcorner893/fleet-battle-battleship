import { describe, it, expect } from 'vitest';
import {
  calculateShipCoordinates,
  isValidPlacement,
  validateFleet,
  generateRandomFleet,
  canMoveShip,
  moveShipInFleet,
} from '../src/engine/board';
import { CLASSIC_FLEET_CONFIG, TOTAL_FLEET_SEGMENTS } from '../src/utils/coordinates';
import { PlacedShip } from '../src/types';

describe('Engine: Board Placement & Validation', () => {
  it('correctly calculates horizontal ship coordinates', () => {
    const coords = calculateShipCoordinates({ row: 2, col: 3 }, 4, 'horizontal');
    expect(coords).toEqual([
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 2, col: 5 },
      { row: 2, col: 6 },
    ]);
  });

  it('correctly calculates vertical ship coordinates', () => {
    const coords = calculateShipCoordinates({ row: 1, col: 5 }, 3, 'vertical');
    expect(coords).toEqual([
      { row: 1, col: 5 },
      { row: 2, col: 5 },
      { row: 3, col: 5 },
    ]);
  });

  it('detects out-of-bounds placements', () => {
    // Length 4 starting at col 7 horizontal exceeds 10 cols (0-9: 7,8,9,10)
    const valid = isValidPlacement({ row: 0, col: 7 }, 4, 'horizontal', []);
    expect(valid).toBe(false);

    // Length 3 starting at row 8 vertical exceeds 10 rows (8, 9, 10)
    const validV = isValidPlacement({ row: 8, col: 0 }, 3, 'vertical', []);
    expect(validV).toBe(false);

    // Valid placement inside bounds
    const validOk = isValidPlacement({ row: 0, col: 5 }, 4, 'horizontal', []);
    expect(validOk).toBe(true);
  });

  it('detects overlapping ships collision', () => {
    const existingShip: PlacedShip = {
      id: 'carrier_1',
      type: 'carrier',
      name: 'Portaaviones',
      length: 5,
      orientation: 'horizontal',
      coordinates: [
        { row: 3, col: 2 },
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
        { row: 3, col: 6 },
      ],
      hits: [],
      isSunk: false,
    };

    // Proposed vertical ship intersecting at (3, 4)
    const canPlaceIntersecting = isValidPlacement(
      { row: 2, col: 4 },
      3,
      'vertical',
      [existingShip]
    );
    expect(canPlaceIntersecting).toBe(false);

    // Proposed ship in empty sector
    const canPlaceSeparated = isValidPlacement(
      { row: 5, col: 0 },
      3,
      'vertical',
      [existingShip]
    );
    expect(canPlaceSeparated).toBe(true);
  });

  it('validates a complete 17-segment fleet', () => {
    const fleet = generateRandomFleet(CLASSIC_FLEET_CONFIG);
    const validation = validateFleet(fleet);

    expect(validation.valid).toBe(true);
    expect(fleet).toHaveLength(5);

    const totalSegments = fleet.reduce((acc, s) => acc + s.length, 0);
    expect(totalSegments).toBe(TOTAL_FLEET_SEGMENTS);
  });

  it('generates multiple independent random fleets without collision', () => {
    for (let i = 0; i < 15; i++) {
      const fleet = generateRandomFleet(CLASSIC_FLEET_CONFIG);
      const validation = validateFleet(fleet);
      expect(validation.valid).toBe(true);
    }
  });

  it('allows damaged ships to move along their own axis and shifts hit coordinates with the hull', () => {
    const damagedCruiser: PlacedShip = {
      id: 'cruiser_1',
      type: 'cruiser',
      name: 'Crucero',
      length: 3,
      orientation: 'horizontal',
      coordinates: [
        { row: 4, col: 3 },
        { row: 4, col: 4 },
        { row: 4, col: 5 },
      ],
      hits: [{ row: 4, col: 4 }],
      isSunk: false,
    };

    // Shots on board include the ship's own hit at (4,4) and a water miss at (4,2)
    const shotsOnBoard = [
      { row: 4, col: 4 },
      { row: 4, col: 2 },
    ];

    // Moving LEFT into the water miss at (4,2) is blocked
    expect(canMoveShip(damagedCruiser, 'LEFT', [damagedCruiser], shotsOnBoard)).toBe(false);

    // Moving RIGHT into unshot water at (4,6) is allowed even though (4,4) is in shotsOnBoard
    expect(canMoveShip(damagedCruiser, 'RIGHT', [damagedCruiser], shotsOnBoard)).toBe(true);

    const moveRes = moveShipInFleet('cruiser_1', 'RIGHT', [damagedCruiser], shotsOnBoard);
    expect(moveRes.moved).toBe(true);
    expect(moveRes.movedShip?.coordinates).toEqual([
      { row: 4, col: 4 },
      { row: 4, col: 5 },
      { row: 4, col: 6 },
    ]);
    expect(moveRes.movedShip?.hits).toEqual([{ row: 4, col: 5 }]);
  });
});
