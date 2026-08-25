import { generateCards } from '../card/generateCard.js';
import { Deck } from '../deck/deck.js';
import { range } from '../helpers/range.js';
import { Hand, UnknownHand } from './hand.js';

export const generateHand = (deck: Deck) => generateCards(deck, 2) as Hand;
export const generateUnknownHand = () => UnknownHand;
export function generateHands(
  totalHands: number,
  totalKnownHands: number,
  deck: Deck
): Hand[] {
  return range(1, totalHands).map((index) =>
    index <= totalKnownHands ? generateHand(deck) : generateUnknownHand()
  );
}
