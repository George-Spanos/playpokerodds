"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRandomRound = createRandomRound;
const randomInt_js_1 = require("../helpers/randomInt.js");
const create_round_js_1 = require("./create-round.js");
function createRandomRound() {
    const totalHands = (0, randomInt_js_1.randomInt)(1, 8);
    const totalKnownHands = 0;
    const boardState = (0, randomInt_js_1.randomInt)(0, 3);
    return (0, create_round_js_1.createRound)(totalHands, totalKnownHands, boardState);
}
