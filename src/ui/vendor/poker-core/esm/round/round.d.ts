import { BoardState } from '../board/boardState.js';
import { Board } from '../board/board.js';
import { Hand } from '../hand/hand.js';
export interface Round {
    myHand: Hand;
    opponentsHands: Hand[];
    board: Board;
}
export interface CreateRoundInputs {
    totalHands: number;
    totalKnownHands: number;
    boardState: BoardState;
}
export declare function validateRound(payload: unknown): payload is Round;
//# sourceMappingURL=round.d.ts.map