import { describe, it, expect } from 'vitest';
import {
  isValidCard,
  isValidHand,
  isValidBoard,
  validateRound,
  generateRandomRoundInputs,
  calculateGuessScore,
  scoreIsAccurate,
} from './poker.js';

describe('isValidCard', () => {
  it('accepts valid cards and unknown marker', () => {
    for (const c of ['As', '2d', 'Th', 'Qc', '9h', '..']) {
      expect(isValidCard(c), c).toBe(true);
    }
  });
  it('rejects malformed cards', () => {
    for (const c of ['10s', '15A', 'Bc', '', '2hh', null, 7, ['KS']]) {
      expect(isValidCard(c), String(c)).toBe(false);
    }
  });
});

describe('isValidHand', () => {
  it('accepts valid hands and unknown pair', () => {
    expect(isValidHand(['Td', '2s'])).toBe(true);
    expect(isValidHand(['..', '..'])).toBe(true);
  });
  it('rejects invalid hands', () => {
    expect(isValidHand(['2h', '2h'])).toBe(false);
    expect(isValidHand(['2cKh'])).toBe(false);
    expect(isValidHand([1, 2])).toBe(false);
  });
});

describe('validateRound', () => {
  const base = { myHand: ['Ac', 'Kd'], opponentsHands: [['..', '..']], board: [] };
  it('accepts a valid round', () => {
    expect(validateRound(base)).toBe(true);
  });
  it('rejects duplicate cards', () => {
    expect(validateRound({ ...base, myHand: ['Ac', 'Kd'], opponentsHands: [['Ac', 'Kd']] })).toBe(false);
  });
  it('rejects three-card hand', () => {
    expect(validateRound({ ...base, myHand: ['Ac', 'Kd', '3c'] })).toBe(false);
  });
  it('rejects unparsable opponent', () => {
    expect(validateRound({ ...base, opponentsHands: [['fasolaki', '..']] })).toBe(false);
  });
  it('rejects no opponents', () => {
    expect(validateRound({ ...base, opponentsHands: [] })).toBe(false);
  });
  it('rejects oversized board', () => {
    expect(validateRound({ ...base, board: ['Qc', 'Qs', 'Td', 'As', '3d', '2s'] })).toBe(false);
  });
});

describe('generateRandomRoundInputs', () => {
  it('stays within TS ranges', () => {
    for (let i = 0; i < 500; i++) {
      const inputs = generateRandomRoundInputs();
      expect(inputs.boardState).toBeGreaterThanOrEqual(0);
      expect(inputs.boardState).toBeLessThanOrEqual(2);
      expect(inputs.totalHands).toBeGreaterThanOrEqual(2);
      expect(inputs.totalHands).toBeLessThanOrEqual(5);
      expect(inputs.totalKnownHands).toBe(inputs.totalHands);
    }
  });
});

describe('calculateGuessScore', () => {
  it('matches core 2-dp semantics', () => {
    expect(calculateGuessScore(50, 47.04)).toBe(2.96);
    expect(calculateGuessScore(13.64, 13.64)).toBe(0);
    expect(calculateGuessScore(40, 13.64)).toBe(26.36);
  });
});

describe('scoreIsAccurate', () => {
  it('is within 5 points', () => {
    expect(scoreIsAccurate(4.99)).toBe(true);
    expect(scoreIsAccurate(5)).toBe(false);
  });
});
