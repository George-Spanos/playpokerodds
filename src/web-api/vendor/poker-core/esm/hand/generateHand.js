import { generateCards } from '../card/generateCard.js';
import { range } from '../helpers/range.js';
import { UnknownHand } from './hand.js';
export const generateHand = (deck) => generateCards(deck, 2);
export const generateUnknownHand = () => UnknownHand;
export function generateHands(totalHands, totalKnownHands, deck) {
    return range(1, totalHands).map((index) => index <= totalKnownHands ? generateHand(deck) : generateUnknownHand());
}
