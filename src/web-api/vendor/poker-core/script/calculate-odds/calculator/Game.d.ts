import { BestHand, CardGroup, Input } from './types.js';
export declare class Player {
    dealt: CardGroup;
    bestHand: BestHand;
    readonly name: string;
    constructor(name: string);
    evaluate(board: CardGroup): BestHand;
    compare(p: Player): 0 | 1 | -1;
}
export declare class Game {
    private input;
    private board;
    private deck;
    players: Player[];
    constructor(input: Input);
    static getNpcName(i: number): string;
    play(): Player[];
    private buildKnownBoard;
    private buildRestOfBoard;
    private dealKnownCards;
    private dealRestOfCards;
}
//# sourceMappingURL=Game.d.ts.map