"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deck = exports.CardGroup = exports.Card = exports.HandRanks = exports.Ranks = exports.Suits = void 0;
const util_js_1 = require("./util.js");
var Suits;
(function (Suits) {
    Suits[Suits["club"] = 1] = "club";
    Suits[Suits["diamond"] = 2] = "diamond";
    Suits[Suits["heart"] = 3] = "heart";
    Suits[Suits["spade"] = 4] = "spade";
})(Suits || (exports.Suits = Suits = {}));
var Ranks;
(function (Ranks) {
    Ranks[Ranks["two"] = 2] = "two";
    Ranks[Ranks["three"] = 3] = "three";
    Ranks[Ranks["four"] = 4] = "four";
    Ranks[Ranks["five"] = 5] = "five";
    Ranks[Ranks["six"] = 6] = "six";
    Ranks[Ranks["seven"] = 7] = "seven";
    Ranks[Ranks["eight"] = 8] = "eight";
    Ranks[Ranks["nine"] = 9] = "nine";
    Ranks[Ranks["ten"] = 10] = "ten";
    Ranks[Ranks["jack"] = 11] = "jack";
    Ranks[Ranks["queen"] = 12] = "queen";
    Ranks[Ranks["king"] = 13] = "king";
    Ranks[Ranks["ace"] = 14] = "ace";
})(Ranks || (exports.Ranks = Ranks = {}));
var HandRanks;
(function (HandRanks) {
    HandRanks[HandRanks["highCard"] = 1] = "highCard";
    HandRanks[HandRanks["pair"] = 2] = "pair";
    HandRanks[HandRanks["twoPair"] = 3] = "twoPair";
    HandRanks[HandRanks["trips"] = 4] = "trips";
    HandRanks[HandRanks["straight"] = 5] = "straight";
    HandRanks[HandRanks["flush"] = 6] = "flush";
    HandRanks[HandRanks["fullHouse"] = 7] = "fullHouse";
    HandRanks[HandRanks["quads"] = 8] = "quads";
    HandRanks[HandRanks["straightFlush"] = 9] = "straightFlush";
})(HandRanks || (exports.HandRanks = HandRanks = {}));
class Suit {
    static fromString(s) {
        switch (s) {
            case 'c':
                return Suits.club;
            case 'd':
                return Suits.diamond;
            case 'h':
                return Suits.heart;
            case 's':
                return Suits.spade;
            default:
                throw new Error(`Invalid card suit string: ${s}`);
        }
    }
    static toString(suit) {
        if (!(suit in Suits))
            throw new Error(`Invalid suit value: ${suit}`);
        return Suits[suit][0];
    }
    static toLongName(suit, plural) {
        if (!(suit in Suits))
            throw new Error(`Invalid suit value: ${suit}`);
        let longName = Suits[suit];
        if (plural)
            longName += 's';
        return longName;
    }
}
class Rank {
    static fromString(s) {
        switch (s) {
            case 'T':
                return Ranks.ten;
            case 'J':
                return Ranks.jack;
            case 'Q':
                return Ranks.queen;
            case 'K':
                return Ranks.king;
            case 'A':
                return Ranks.ace;
            default: {
                const n = Number(s);
                if (isNaN(n) || n < Ranks.two || n > Ranks.nine)
                    throw new Error(`Invalid card rank string: ${s}`);
                return n;
            }
        }
    }
    static toString(r) {
        switch (r) {
            case Ranks.ten:
                return 'T';
            case Ranks.jack:
                return 'J';
            case Ranks.queen:
                return 'Q';
            case Ranks.king:
                return 'K';
            case Ranks.ace:
                return 'A';
            default:
                if (isNaN(r) || r < Ranks.two || r > Ranks.ace)
                    throw new Error(`Invalid card rank value: ${r}`);
                return r.toString();
        }
    }
    static toLongName(rank) {
        if (!(rank in Ranks))
            throw new Error(`Invalid rank value: ${rank}`);
        return Ranks[rank];
    }
}
class Card {
    get rank() {
        return this._rank;
    }
    get suit() {
        return this._suit;
    }
    constructor(s) {
        Object.defineProperty(this, "_rank", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_suit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Card.validateCardString(s);
        this._rank = Rank.fromString(s[0]);
        this._suit = Suit.fromString(s[1]);
    }
    static validateCardString(s) {
        if (s.length !== 2)
            throw new Error(`Card string must have a length of 2. Invalid: ${s}`);
        if (!['T', 'J', 'Q', 'K', 'A'].includes(s[0]) && (+s[0] < 2 || +s[0] > 9))
            throw new Error(`Card string must begin with 2-9, T, J, Q, K, or A. Invalid: ${s}`);
        if (!['c', 'd', 'h', 's'].includes(s[1]))
            throw new Error(`Card string must end with c, d, h, or s. Invalid: ${s}`);
    }
    equals(card) {
        // todo: implement range card == standard card
        return this._rank === card.rank && this._suit === card.suit;
    }
    toString() {
        return Rank.toString(this._rank) + Suit.toString(this._suit);
    }
    toLongName() {
        return `${Rank.toLongName(this._rank)} of ${Suit.toLongName(this._suit, true)}`;
    }
}
exports.Card = Card;
class CardGroup {
    get cards() {
        return this._cards;
    }
    constructor(cards) {
        Object.defineProperty(this, "_cards", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        if (!cards)
            return;
        this.addCards(cards);
    }
    static validateCardGroupString(s) {
        for (const e of s.split(',')) {
            Card.validateCardString(e);
        }
    }
    toString() {
        return this._cards.map((c) => c.toString()).join(',');
    }
    addCardGroup(cardGroup) {
        this._cards.push(...cardGroup.cards);
    }
    addCards(cards) {
        if (typeof cards === 'string')
            this.addCardsString(cards);
        else if (Array.isArray(cards))
            this._cards.push(...cards);
        else
            this._cards.push(cards);
    }
    sortDesc() {
        this._cards.sort((a, b) => b.suit - a.suit);
        this._cards.sort((a, b) => b.rank - a.rank);
    }
    countBy(type) {
        const map = {};
        for (const card of this._cards) {
            const prop = type === 'rank' ? card.rank : card.suit;
            if (!(prop in map))
                map[prop] = 1;
            else
                map[prop]++;
        }
        return map;
    }
    addCardsString(s) {
        for (const e of s.split(',')) {
            const card = new Card(e);
            this.addCards(card);
        }
    }
    equals(cardGroup) {
        if (cardGroup.cards.length !== this._cards.length)
            return false;
        return this.toString() === cardGroup.toString();
    }
}
exports.CardGroup = CardGroup;
class Deck extends CardGroup {
    constructor(numDecks) {
        const deckString = '2c,2d,2h,2s,3c,3d,3h,3s,4c,4d,4h,4s,5c,5d,5h,5s,6c,6d,6h,6s,7c,7d,7h,7s,8c,8d,8h,8s,9c,9d,9h,9s,Tc,Td,Th,Ts,Jc,Jd,Jh,Js,Qc,Qd,Qh,Qs,Kc,Kd,Kh,Ks,Ac,Ad,Ah,As';
        const decksString = Array(numDecks).fill(deckString);
        super(decksString.join(','));
    }
    pop() {
        if (this._cards.length === 0)
            throw new Error('Deck is empty. There are either too many players, or the boardSize is too large');
        return this._cards.pop();
    }
    removeCard(cardToRemove) {
        let found = false;
        for (let i = 0; i < this._cards.length; i++) {
            if (this._cards[i].equals(cardToRemove)) {
                this._cards.splice(i, 1);
                found = true;
            }
        }
        if (!found)
            throw new Error(`CardGroup does not contain card string: ${cardToRemove.toString()}`);
        return cardToRemove;
    }
    shuffle() {
        (0, util_js_1.shuffle)(this._cards);
    }
}
exports.Deck = Deck;
