import { ShipConfig, Coordinate } from '../types';

export const BOARD_SIZE = 10;
export const TOTAL_FLEET_SEGMENTS = 17;

export const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
export const ROW_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] as const;

export const CLASSIC_FLEET_CONFIG: ShipConfig[] = [
  {
    id: 'carrier',
    name: 'Portaaviones',
    length: 5,
    description: 'El buque insignia de la armada. Gran resistencia y longitud.',
  },
  {
    id: 'battleship',
    name: 'Acorazado',
    length: 4,
    description: 'Armadura pesada con 4 secciones tácticas de combate.',
  },
  {
    id: 'cruiser',
    name: 'Crucero',
    length: 3,
    description: 'Embarcación versátil de interdicción y escolta naval.',
  },
  {
    id: 'destroyer',
    name: 'Destructor',
    length: 3,
    description: 'Unidad ágil de guerra antisubmarina y asalto rápido.',
  },
  {
    id: 'patrol',
    name: 'Patrullera',
    length: 2,
    description: 'Lancha patrullera rápida para reconocimiento costero.',
  },
];

/**
 * Formats row, col into visible format (e.g. {row: 3, col: 2} -> "C-4")
 */
export function formatCoordinate(coord: Coordinate): string {
  const colLetter = COLUMN_LABELS[coord.col] ?? '?';
  const rowNum = coord.row + 1;
  return `${colLetter}-${rowNum}`;
}

/**
 * Parses "C-4" or "C4" into { row: 3, col: 2 }
 */
export function parseCoordinate(str: string): Coordinate | null {
  const clean = str.trim().toUpperCase().replace('-', '');
  if (clean.length < 2) return null;
  const colChar = clean[0];
  const rowStr = clean.slice(1);
  const col = COLUMN_LABELS.indexOf(colChar as (typeof COLUMN_LABELS)[number]);
  const row = parseInt(rowStr, 10) - 1;
  if (col < 0 || col >= BOARD_SIZE || isNaN(row) || row < 0 || row >= BOARD_SIZE) {
    return null;
  }
  return { row, col };
}

export function isInBounds(coord: Coordinate): boolean {
  return coord.row >= 0 && coord.row < BOARD_SIZE && coord.col >= 0 && coord.col < BOARD_SIZE;
}

export function areCoordinatesEqual(a: Coordinate, b: Coordinate): boolean {
  return a.row === b.row && a.col === b.col;
}

export function containsCoordinate(list: Coordinate[], target: Coordinate): boolean {
  return list.some((c) => areCoordinatesEqual(c, target));
}

/**
 * Returns orthogonal neighboring coordinates within board boundaries.
 */
export function getOrthogonalNeighbors(coord: Coordinate): Coordinate[] {
  const deltas = [
    { row: -1, col: 0 }, // Up
    { row: 1, col: 0 },  // Down
    { row: 0, col: -1 }, // Left
    { row: 0, col: 1 },  // Right
  ];

  return deltas
    .map((d) => ({ row: coord.row + d.row, col: coord.col + d.col }))
    .filter(isInBounds);
}
