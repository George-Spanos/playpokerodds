"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardState = void 0;
exports.openBoardCardsFromState = openBoardCardsFromState;
var BoardState;
(function (BoardState) {
    BoardState[BoardState["PreFlop"] = 0] = "PreFlop";
    BoardState[BoardState["Flop"] = 1] = "Flop";
    BoardState[BoardState["Turn"] = 2] = "Turn";
    BoardState[BoardState["River"] = 3] = "River";
})(BoardState || (exports.BoardState = BoardState = {}));
function openBoardCardsFromState(state) {
    switch (state) {
        case BoardState.PreFlop:
            return 0;
        case BoardState.Flop:
            return 3;
        case BoardState.Turn:
            return 4;
        case BoardState.River:
            return 5;
    }
}
