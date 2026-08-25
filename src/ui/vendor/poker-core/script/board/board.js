"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBoard = validateBoard;
const card_js_1 = require("../card/card.js");
function validateBoard(payload) {
    return (Array.isArray(payload) &&
        (payload.length === 0 ||
            payload.length === 3 ||
            payload.length === 4 ||
            payload.length === 5) &&
        payload.reduce((acc, currentValue) => acc && (0, card_js_1.validateCard)(currentValue), true));
}
