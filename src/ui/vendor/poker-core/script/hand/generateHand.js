"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUnknownHand = exports.generateHand = void 0;
exports.generateHands = generateHands;
const generateCard_js_1 = require("../card/generateCard.js");
const range_js_1 = require("../helpers/range.js");
const hand_js_1 = require("./hand.js");
const generateHand = (deck) => (0, generateCard_js_1.generateCards)(deck, 2);
exports.generateHand = generateHand;
const generateUnknownHand = () => hand_js_1.UnknownHand;
exports.generateUnknownHand = generateUnknownHand;
function generateHands(totalHands, totalKnownHands, deck) {
    return (0, range_js_1.range)(1, totalHands).map((index) => index <= totalKnownHands ? (0, exports.generateHand)(deck) : (0, exports.generateUnknownHand)());
}
