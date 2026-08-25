"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnknownHand = void 0;
exports.validateHand = validateHand;
const card_js_1 = require("../card/card.js");
exports.UnknownHand = ['..', '..'];
function validateHand(payload) {
    return (Array.isArray(payload) &&
        payload.length === 2 &&
        (0, card_js_1.validateCard)(payload[0]) &&
        (0, card_js_1.validateCard)(payload[1]) &&
        (payload[0] !== payload[1] ||
            (payload[0] === card_js_1.UnknownCard && payload[1] === card_js_1.UnknownCard)));
}
