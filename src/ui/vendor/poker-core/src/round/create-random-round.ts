import { BoardState } from '../board/boardState.js';
import { randomInt } from '../helpers/randomInt.js';
import { createRound } from './create-round.js';
import { Round } from './round.js';

export function createRandomRound(): Round {
  const totalHands = randomInt(1, 8);
  const totalKnownHands = 0;
  const boardState = randomInt(0, 3) as BoardState;
  return createRound(totalHands, totalKnownHands, boardState);
}
