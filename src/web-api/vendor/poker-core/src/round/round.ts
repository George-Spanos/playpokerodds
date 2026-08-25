import { BoardState } from '../board/boardState.js';
import { validateBoard } from '../board/board.js';

import { Board } from '../board/board.js';
import { Card, UnknownCard } from '../card/card.js';
import { Hand, validateHand } from '../hand/hand.js';

export interface Round {
  myHand: Hand;
  opponentsHands: Hand[];
  board: Board;
}
export interface CreateRoundInputs {
  totalHands: number;
  totalKnownHands: number;
  boardState: BoardState;
}
function _validateRound(payload: unknown): payload is Round {
  const isObject = typeof payload === 'object' && !!payload;
  if (!isObject) return false;
  const p = payload as Record<string, unknown>;
  return (
    'myHand' in p &&
    validateHand(p.myHand) &&
    'opponentsHands' in payload &&
    Array.isArray(p.opponentsHands) &&
    p.opponentsHands.length <= 8 &&
    p.opponentsHands.length > 0 &&
    p.opponentsHands.reduce(
      (accumulator: boolean, currentValue: Hand) =>
        accumulator && validateHand(currentValue),
      true
    ) &&
    'board' in p &&
    validateBoard(p.board)
  );
}
function roundHasDuplicateCard(round: Round): boolean {
  const cards: Card[] = [
    ...round.myHand,
    ...round.opponentsHands.flat(),
  ].filter((c) => c !== UnknownCard);
  return cards.length !== new Set(cards).size;
}
export function validateRound(payload: unknown): payload is Round {
  return _validateRound(payload) && !roundHasDuplicateCard(payload);
}
