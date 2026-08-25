export declare enum Suits {
    club = 1,
    diamond = 2,
    heart = 3,
    spade = 4
}
export declare enum Ranks {
    two = 2,
    three = 3,
    four = 4,
    five = 5,
    six = 6,
    seven = 7,
    eight = 8,
    nine = 9,
    ten = 10,
    jack = 11,
    queen = 12,
    king = 13,
    ace = 14
}
export declare enum HandRanks {
    highCard = 1,
    pair = 2,
    twoPair = 3,
    trips = 4,
    straight = 5,
    flush = 6,
    fullHouse = 7,
    quads = 8,
    straightFlush = 9
}
export type Input = {
    numPlayers: number;
    numDecks: number;
    hands: string[];
    handSize: number;
    board: string;
    boardSize: number;
    iterations: number;
    returnHandStats?: boolean;
    returnTieHandStats?: boolean;
};
export type BestHand = {
    hand: CardGroup;
    handRank: HandRanks;
};
export type Stats = {
    winCount: number;
    winPercent: number;
    tieCount: number;
    tiePercent: number;
    tieHandStats: HandStats;
    handStats: HandStats;
};
type HandStats = Record<string, {
    count: number;
    percent: number;
}>;
export declare class Card {
    private _rank;
    private _suit;
    get rank(): Ranks;
    get suit(): Suits;
    constructor(s: string);
    static validateCardString(s: string): void;
    equals(card: Card): boolean;
    toString(): string;
    toLongName(): string;
}
export declare class CardGroup {
    protected _cards: Card[];
    get cards(): Card[];
    constructor(cards?: string);
    constructor(cards?: Card[]);
    constructor(cards?: Card);
    static validateCardGroupString(s: string): void;
    toString(): string;
    addCardGroup(cardGroup: CardGroup): void;
    addCards(card: string): void;
    addCards(card: Card): void;
    addCards(card: Card[]): void;
    sortDesc(): void;
    countBy(type: 'rank' | 'suit'): Record<string, number>;
    private addCardsString;
    equals(cardGroup: CardGroup): boolean;
}
export declare class Deck extends CardGroup {
    constructor(numDecks: number);
    pop(): Card;
    removeCard(cardToRemove: Card): Card;
    shuffle(): void;
}
export {};
//# sourceMappingURL=types.d.ts.map