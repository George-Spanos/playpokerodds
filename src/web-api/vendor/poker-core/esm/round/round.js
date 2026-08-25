import { validateBoard } from '../board/board.js';
import { UnknownCard } from '../card/card.js';
import { validateHand } from '../hand/hand.js';
function _validateRound(payload) {
    const isObject = typeof payload === 'object' && !!payload;
    if (!isObject)
        return false;
    const p = payload;
    return ('myHand' in p &&
        validateHand(p.myHand) &&
        'opponentsHands' in payload &&
        Array.isArray(p.opponentsHands) &&
        p.opponentsHands.length <= 8 &&
        p.opponentsHands.length > 0 &&
        p.opponentsHands.reduce((accumulator, currentValue) => accumulator && validateHand(currentValue), true) &&
        'board' in p &&
        validateBoard(p.board));
}
function roundHasDuplicateCard(round) {
    const cards = [
        ...round.myHand,
        ...round.opponentsHands.flat(),
    ].filter((c) => c !== UnknownCard);
    return cards.length !== new Set(cards).size;
}
export function validateRound(payload) {
    return _validateRound(payload) && !roundHasDuplicateCard(payload);
}
