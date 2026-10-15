// Domain logic ported from @moby-it/poker-core (client-side subset).

export const UNKNOWN_CARD = '..';

export const BoardState = Object.freeze({
  PreFlop: 0,
  Flop: 1,
  Turn: 2,
  River: 3,
});

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['s', 'h', 'c', 'd'];

export function isValidCard(card) {
  if (card === UNKNOWN_CARD) return true;
  if (typeof card !== 'string' || card.length !== 2) return false;
  return RANKS.includes(card[0]) && SUITS.includes(card[1]);
}

export function isValidHand(hand) {
  return (
    Array.isArray(hand) &&
    hand.length === 2 &&
    isValidCard(hand[0]) &&
    isValidCard(hand[1]) &&
    (hand[0] !== hand[1] || (hand[0] === UNKNOWN_CARD && hand[1] === UNKNOWN_CARD))
  );
}

export function isValidBoard(board) {
  return (
    Array.isArray(board) &&
    (board.length === 0 || board.length === 3 || board.length === 4 || board.length === 5) &&
    board.every(isValidCard)
  );
}

export function validateRound(round) {
  const p = round;
  if (typeof p !== 'object' || p === null) return false;
  if (!isValidHand(p.myHand)) return false;
  if (!Array.isArray(p.opponentsHands) || p.opponentsHands.length === 0 || p.opponentsHands.length > 8) return false;
  if (!p.opponentsHands.every(isValidHand)) return false;
  if (!isValidBoard(p.board)) return false;
  const cards = [p.myHand, ...p.opponentsHands].flat().filter((c) => c !== UNKNOWN_CARD);
  return new Set(cards).size === cards.length;
}

/** generateRandomRoundInputs: boardState 0..=2 (exclusive max), totalHands 2..=5, all known. */
export function generateRandomRoundInputs() {
  const boardState = rng(BoardState.PreFlop, BoardState.Turn);
  const totalHands = rng(2, 5);
  const totalKnownHands = totalHands;
  return { boardState, totalHands, totalKnownHands };
}

function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** calculateGuessScore: |estimate − odds| at 2-dp. */
export function calculateGuessScore(estimate, handOdds) {
  return Math.abs(Number((estimate - handOdds).toFixed(2)));
}

/** scoreIsAccurate: within 5 points. */
export function scoreIsAccurate(score) {
  return Math.abs(score) < 5;
}
