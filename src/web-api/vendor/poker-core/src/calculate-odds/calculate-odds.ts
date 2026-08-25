import { Round } from '../round/round.js';

import { Calculator} from './calculator/Calculator.js';
import { Input } from './calculator/types.js';

const transformRoundToInput = (round: Round, iterations: number): Input => {
  const input = {} as Input;
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
export function calculateOdds(round: Round, iterations: number): number {
  const input = transformRoundToInput(round, iterations);
  const calculator = new Calculator(input);
  const results = calculator.simulate();
  const result = results[round.myHand.join(',')].winPercent as number;
  return parseFloat(result.toFixed(2));
}
