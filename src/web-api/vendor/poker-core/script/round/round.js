"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRound = validateRound;
const board_js_1 = require("../board/board.js");
const card_js_1 = require("../card/card.js");
const hand_js_1 = require("../hand/hand.js");
function _validateRound(payload) {
    const isObject = typeof payload === 'object' && !!payload;
    if (!isObject)
        return false;
    const p = payload;
    return ('myHand' in p &&
        (0, hand_js_1.validateHand)(p.myHand) &&
        'opponentsHands' in payload &&
        Array.isArray(p.opponentsHands) &&
        p.opponentsHands.length <= 8 &&
        p.opponentsHands.length > 0 &&
        p.opponentsHands.reduce((accumulator, currentValue) => accumulator && (0, hand_js_1.validateHand)(currentValue), true) &&
        'board' in p &&
        (0, board_js_1.validateBoard)(p.board));
}
function roundHasDuplicateCard(round) {
    const cards = [
        ...round.myHand,
        ...round.opponentsHands.flat(),
    ].filter((c) => c !== card_js_1.UnknownCard);
    return cards.length !== new Set(cards).size;
}
function validateRound(payload) {
    return _validateRound(payload) && !roundHasDuplicateCard(payload);
}
