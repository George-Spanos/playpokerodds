export var BoardState;
(function (BoardState) {
    BoardState[BoardState["PreFlop"] = 0] = "PreFlop";
    BoardState[BoardState["Flop"] = 1] = "Flop";
    BoardState[BoardState["Turn"] = 2] = "Turn";
    BoardState[BoardState["River"] = 3] = "River";
})(BoardState || (BoardState = {}));
export function openBoardCardsFromState(state) {
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
