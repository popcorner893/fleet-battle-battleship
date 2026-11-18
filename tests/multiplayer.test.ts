import { describe, it, expect } from 'vitest';
import { normalizeRoomCode } from '../src/services/multiplayer';

describe('Multiplayer Room Code Normalization', () => {
  it('preserves exact standard codes', () => {
    expect(normalizeRoomCode('NAV-842')).toBe('NAV-842');
    expect(normalizeRoomCode('NAV-XYZ')).toBe('NAV-XYZ');
  });

  it('normalizes lowercase codes', () => {
    expect(normalizeRoomCode('nav-842')).toBe('NAV-842');
    expect(normalizeRoomCode('nav-xyz')).toBe('NAV-XYZ');
  });

  it('adds NAV- prefix when user only enters 3 or 4 digits/characters', () => {
    expect(normalizeRoomCode('842')).toBe('NAV-842');
    expect(normalizeRoomCode('xyz')).toBe('NAV-XYZ');
    expect(normalizeRoomCode('A3B')).toBe('NAV-A3B');
  });

  it('handles spaces or missing hyphens', () => {
    expect(normalizeRoomCode('NAV 842')).toBe('NAV-842');
    expect(normalizeRoomCode('NAV842')).toBe('NAV-842');
    expect(normalizeRoomCode('nav 842')).toBe('NAV-842');
    expect(normalizeRoomCode('navxyz')).toBe('NAV-XYZ');
  });

  it('extracts room code from full invite URLs', () => {
    expect(
      normalizeRoomCode('https://ais-pre-test.run.app/?room=NAV-EZP')
    ).toBe('NAV-EZP');
    expect(
      normalizeRoomCode('https://localhost:3000/?room=EZP')
    ).toBe('NAV-EZP');
    expect(
      normalizeRoomCode('?room=NAV-777')
    ).toBe('NAV-777');
  });

  it('handles empty or whitespace strings safely', () => {
    expect(normalizeRoomCode('')).toBe('');
    expect(normalizeRoomCode('   ')).toBe('');
  });
});
