import { range } from '../helpers/range.js';
export const generateCardAndRemoveFromDeck = (deck) => {
    const randomIndex = Math.floor(Math.random() * deck.length);
    const card = deck[randomIndex];
    deck.splice(randomIndex, 1);
    return card;
};
export function generateCards(deck, numberOfCards) {
    return range(1, numberOfCards).map(() => generateCardAndRemoveFromDeck(deck));
}
