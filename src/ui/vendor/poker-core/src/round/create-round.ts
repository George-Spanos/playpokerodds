import { BoardState } from '../board/boardState.js';
import { generateBoard } from '../board/generateBoard.js';
import { createDeck } from '../deck/createDeck.js';
import { generateHand, generateHands } from '../hand/generateHand.js';
import { Round } from './round.js';

export function createRound(
  totalHands: number,
  totalKnownHands: number,
  boardState: BoardState
): Round {
  const deck = createDeck();
  const myHand = generateHand(deck);
  const opponentsHands = generateHands(totalHands - 1, totalKnownHands, deck);
  const board = generateBoard(boardState, deck);
  return { board, myHand, opponentsHands };
}
