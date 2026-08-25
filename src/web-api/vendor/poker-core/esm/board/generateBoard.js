import { generateCardAndRemoveFromDeck } from '../card/generateCard.js';
import { range } from '../helpers/range.js';
import { BoardState, openBoardCardsFromState } from './boardState.js';
export function generateBoard(boardState, deck) {
    if (boardState == BoardState.PreFlop)
        return [];
    return range(1, openBoardCardsFromState(boardState)).map(() => generateCardAndRemoveFromDeck(deck));
}
