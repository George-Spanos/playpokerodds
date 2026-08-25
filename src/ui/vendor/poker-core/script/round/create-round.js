"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRound = createRound;
const generateBoard_js_1 = require("../board/generateBoard.js");
const createDeck_js_1 = require("../deck/createDeck.js");
const generateHand_js_1 = require("../hand/generateHand.js");
function createRound(totalHands, totalKnownHands, boardState) {
    const deck = (0, createDeck_js_1.createDeck)();
    const myHand = (0, generateHand_js_1.generateHand)(deck);
    const opponentsHands = (0, generateHand_js_1.generateHands)(totalHands - 1, totalKnownHands, deck);
    const board = (0, generateBoard_js_1.generateBoard)(boardState, deck);
    return { board, myHand, opponentsHands };
}
