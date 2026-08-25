"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateOdds = calculateOdds;
const Calculator_js_1 = require("./calculator/Calculator.js");
const transformRoundToInput = (round, iterations) => {
    const input = {};
    input.hands = [
        round.myHand.join(','),
        ...round.opponentsHands
            .map((h) => h.join(','))
            .filter((flattenHand) => flattenHand !== '..,..'),
    ];
    if (round.board.length) {
        input.board = round.board.join(',');
    }
    input.numPlayers = round.opponentsHands.length + 1;
    input.iterations = iterations;
    return input;
};
function calculateOdds(round, iterations) {
    const input = transformRoundToInput(round, iterations);
    const calculator = new Calculator_js_1.Calculator(input);
    const results = calculator.simulate();
    const result = results[round.myHand.join(',')].winPercent;
    return parseFloat(result.toFixed(2));
}
