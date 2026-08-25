import { generateBoard } from '../board/generateBoard.js';
import { createDeck } from '../deck/createDeck.js';
import { generateHand, generateHands } from '../hand/generateHand.js';
export function createRound(totalHands, totalKnownHands, boardState) {
    const deck = createDeck();
    const myHand = generateHand(deck);
    const opponentsHands = generateHands(totalHands - 1, totalKnownHands, deck);
    const board = generateBoard(boardState, deck);
    return { board, myHand, opponentsHands };
}
