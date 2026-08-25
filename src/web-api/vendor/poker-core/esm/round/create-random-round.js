import { randomInt } from '../helpers/randomInt.js';
import { createRound } from './create-round.js';
export function createRandomRound() {
    const totalHands = randomInt(1, 8);
    const totalKnownHands = 0;
    const boardState = randomInt(0, 3);
    return createRound(totalHands, totalKnownHands, boardState);
}
