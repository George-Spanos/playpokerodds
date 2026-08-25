"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateGuessScore = calculateGuessScore;
function calculateGuessScore(estimate, handOdds) {
    return Math.abs(Number((estimate - handOdds).toFixed(2)));
}
