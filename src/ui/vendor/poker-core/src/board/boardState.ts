export enum BoardState {
  PreFlop,
  Flop,
  Turn,
  River,
}
export function openBoardCardsFromState(state: BoardState): number {
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
