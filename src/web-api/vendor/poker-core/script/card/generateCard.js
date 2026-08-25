"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCardAndRemoveFromDeck = void 0;
exports.generateCards = generateCards;
const range_js_1 = require("../helpers/range.js");
const generateCardAndRemoveFromDeck = (deck) => {
    const randomIndex = Math.floor(Math.random() * deck.length);
    const card = deck[randomIndex];
    deck.splice(randomIndex, 1);
    return card;
};
exports.generateCardAndRemoveFromDeck = generateCardAndRemoveFromDeck;
function generateCards(deck, numberOfCards) {
    return (0, range_js_1.range)(1, numberOfCards).map(() => (0, exports.generateCardAndRemoveFromDeck)(deck));
}
