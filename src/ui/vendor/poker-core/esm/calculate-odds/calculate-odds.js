import { Calculator } from './calculator/Calculator.js';
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
export function calculateOdds(round, iterations) {
    const input = transformRoundToInput(round, iterations);
    const calculator = new Calculator(input);
    const results = calculator.simulate();
    const result = results[round.myHand.join(',')].winPercent;
    return parseFloat(result.toFixed(2));
}
