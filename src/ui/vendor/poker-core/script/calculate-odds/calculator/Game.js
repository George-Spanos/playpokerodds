"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = exports.Player = void 0;
const evaluate_js_1 = require("./evaluate.js");
const types_js_1 = require("./types.js");
const util_js_1 = require("./util.js");
class Player {
    constructor(name) {
        Object.defineProperty(this, "dealt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new types_js_1.CardGroup()
        });
        Object.defineProperty(this, "bestHand", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = name;
    }
    evaluate(board) {
        const totalCardGroup = new types_js_1.CardGroup(this.dealt.cards.concat(board.cards));
        this.bestHand = (0, evaluate_js_1.evaluate)(totalCardGroup);
        return this.bestHand;
    }
    compare(p) {
        if (!p.bestHand || !this.bestHand) {
            throw new Error('Player has not been evaluated');
        }
        if (p.bestHand.handRank === this.bestHand.handRank) {
            for (let i = 0; i < this.bestHand.hand.cards.length; i++) {
                if (p.bestHand.hand.cards[i].rank !== this.bestHand.hand.cards[i].rank) {
                    return p.bestHand.hand.cards[i].rank >
                        this.bestHand.hand.cards[i].rank
                        ? 1
                        : -1;
                }
            }
            return 0;
        }
        return p.bestHand.handRank > this.bestHand.handRank ? 1 : -1;
    }
}
exports.Player = Player;
class Game {
    constructor(input) {
        Object.defineProperty(this, "input", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "board", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new types_js_1.CardGroup()
        });
        Object.defineProperty(this, "deck", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "players", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this.input = input;
        this.deck = new types_js_1.Deck(this.input.numDecks ?? 1);
        this.deck.shuffle();
        this.buildKnownBoard();
        this.dealKnownCards();
        this.buildRestOfBoard();
        this.dealRestOfCards();
    }
    static getNpcName(i) {
        return `NPC ${i}`;
    }
    play() {
        for (const p of this.players) {
            p.evaluate(this.board);
        }
        // shuffle player order. allows bias when compare() return 0 as ties
        (0, util_js_1.shuffle)(this.players);
        // compare hands
        this.players.sort((a, b) => a.compare(b));
        const winners = [this.players[0]];
        for (let i = 1; i < this.players.length; i++) {
            const res = this.players[i - 1].compare(this.players[i]);
            if (res === 0) {
                winners.push(this.players[i]);
            }
            else {
                break;
            }
        }
        return winners;
    }
    buildKnownBoard() {
        this.board = new types_js_1.CardGroup(this.input.board);
        this.board.cards.forEach((c) => this.deck.removeCard(c));
    }
    buildRestOfBoard() {
        const currentBoardSize = this.board.cards.length;
        for (let i = 0; i < this.input.boardSize - currentBoardSize; i++) {
            this.board.addCards(this.deck.pop());
        }
    }
    dealKnownCards() {
        for (const s of this.input.hands) {
            const dealtCards = new types_js_1.CardGroup(s);
            dealtCards.cards.forEach((c) => this.deck.removeCard(c));
            const p = new Player(dealtCards.toString());
            p.dealt.addCardGroup(dealtCards);
            this.players.push(p);
        }
    }
    dealRestOfCards() {
        // complete any incomplete players
        for (const p of this.players) {
            for (let i = 0; i < this.input.handSize - p.dealt.cards.length; i++) {
                p.dealt.addCards(this.deck.pop());
            }
        }
        for (let i = 0; i < this.input.numPlayers - this.input.hands.length; i++) {
            const dealtCards = new types_js_1.CardGroup();
            for (let j = 0; j < this.input.handSize; j++) {
                dealtCards.addCards(this.deck.pop());
            }
            const p = new Player(Game.getNpcName(i + 1));
            p.dealt.addCardGroup(dealtCards);
            this.players.push(p);
        }
    }
}
exports.Game = Game;
