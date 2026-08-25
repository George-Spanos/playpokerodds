import { generateCardAndRemoveFromDeck } from '../card/generateCard.js';
import { Deck } from '../deck/deck.js';
import { range } from '../helpers/range.js';
import { Board } from './board.js';
import { BoardState, openBoardCardsFromState } from './boardState.js';

export function generateBoard(boardState: BoardState, deck: Deck): Board {
  if (boardState == BoardState.PreFlop) return [];
  return range(1, openBoardCardsFromState(boardState)).map(() =>
    generateCardAndRemoveFromDeck(deck)
  );
}
