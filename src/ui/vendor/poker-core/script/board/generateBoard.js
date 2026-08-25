"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBoard = generateBoard;
const generateCard_js_1 = require("../card/generateCard.js");
const range_js_1 = require("../helpers/range.js");
const boardState_js_1 = require("./boardState.js");
function generateBoard(boardState, deck) {
    if (boardState == boardState_js_1.BoardState.PreFlop)
        return [];
    return (0, range_js_1.range)(1, (0, boardState_js_1.openBoardCardsFromState)(boardState)).map(() => (0, generateCard_js_1.generateCardAndRemoveFromDeck)(deck));
}
