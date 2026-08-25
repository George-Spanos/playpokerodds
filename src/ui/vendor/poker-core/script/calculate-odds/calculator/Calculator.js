"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Calculator = void 0;
const Game_js_1 = require("./Game.js");
const types_js_1 = require("./types.js");
const util_js_1 = require("./util.js");
class Calculator {
    constructor(input) {
        Object.defineProperty(this, "stats", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {}
        });
        Object.defineProperty(this, "input", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "boardScenarios", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        Object.defineProperty(this, "iterations", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        (0, util_js_1.validateInput)(input);
        (0, util_js_1.cleanInput)(input);
        this.input = input;
        for (const e of this.input.hands) {
            this.setupStatsObj(e);
        }
        for (let i = 0; i < this.input.numPlayers - this.input.hands.length; i++) {
            this.setupStatsObj(Game_js_1.Game.getNpcName(i + 1));
        }
    }
    simulate() {
        const maxIterations = (0, util_js_1.calculateMaxIterations)(this.input);
        if (maxIterations < this.input.iterations) {
            this.createBoardScenarions();
            this.evaluateBoardScenarios();
        }
        else {
            for (let i = 0; i < this.input.iterations; i++) {
                const g = new Game_js_1.Game(this.input);
                const winners = g.play();
                this.addToCount(winners);
                this.iterations++;
            }
        }
        this.calculateStats();
        return this.stats;
    }
    addToCount(winners) {
        if (winners.length > 1) {
            for (const winner of winners) {
                this.stats[winner.name].tieCount++;
                if (this.input.returnTieHandStats)
                    this.stats[winner.name].tieHandStats[types_js_1.HandRanks[winner.bestHand.handRank]].count++;
            }
        }
        else {
            for (const winner of winners) {
                this.stats[winner.name].winCount++;
                if (this.input.returnHandStats)
                    this.stats[winner.name].handStats[types_js_1.HandRanks[winner.bestHand.handRank]]
                        .count++;
            }
        }
    }
    calculateStats() {
        for (const name in this.stats) {
            // winner percent
            this.stats[name].winPercent = this.calculatePercent(this.stats[name].winCount);
            this.stats[name].tiePercent = this.calculatePercent(this.stats[name].tieCount);
            // hand percent
            if (this.input.returnHandStats) {
                for (const rank in this.stats[name].handStats) {
                    this.stats[name].handStats[rank].percent = this.calculatePercent(this.stats[name].handStats[rank].count);
                }
            }
            if (this.input.returnTieHandStats) {
                for (const rank in this.stats[name].tieHandStats) {
                    this.stats[name].tieHandStats[rank].percent = this.calculatePercent(this.stats[name].tieHandStats[rank].count);
                }
            }
        }
    }
    setupStatsObj(name) {
        this.stats[name] = { winCount: 0, tieCount: 0 };
        if (this.input.returnHandStats)
            this.stats[name].handStats = {};
        if (this.input.returnTieHandStats)
            this.stats[name].tieHandStats = {};
        for (const r in types_js_1.HandRanks) {
            if (typeof types_js_1.HandRanks[r] !== 'number')
                continue;
            if (this.input.returnHandStats)
                this.stats[name].handStats[r] = { count: 0 };
            if (this.input.returnTieHandStats)
                this.stats[name].tieHandStats[r] = { count: 0 };
        }
    }
    createBoardScenarions() {
        const deck = new types_js_1.Deck(this.input.numDecks);
        new types_js_1.CardGroup(this.input.board).cards.forEach((c) => deck.removeCard(c));
        this.input.hands.forEach((h) => new types_js_1.CardGroup(h).cards.forEach((c) => deck.removeCard(c)));
        const remainingCards = 5 - this.input.board.split(',').length;
        const cardGroups = [];
        if (remainingCards === 1) {
            for (let i = 0; i < deck.cards.length; i++) {
                cardGroups.push(new types_js_1.CardGroup([deck.cards[i]]));
            }
        }
        else if (remainingCards === 2) {
            for (let i = 0; i < deck.cards.length; i++) {
                for (let j = 0; j < deck.cards.length; j++) {
                    if (i === j)
                        continue;
                    cardGroups.push(new types_js_1.CardGroup([deck.cards[i], deck.cards[j]]));
                }
            }
        }
        else {
            throw new Error('Cannot handle more than 2 remaining cards');
        }
        this.boardScenarios.push(...cardGroups);
    }
    evaluateBoardScenarios() {
        // create players out of input
        const players = [];
        for (const s of this.input.hands) {
            const dealtCards = new types_js_1.CardGroup(s);
            const p = new Game_js_1.Player(dealtCards.toString());
            p.dealt.addCardGroup(dealtCards);
            players.push(p);
        }
        for (const scenario of this.boardScenarios) {
            const game = new Game_js_1.Game({
                ...this.input,
                board: [...this.input.board.split(','), ...scenario.cards].join(','),
            });
            const winners = game.play();
            this.addToCount(winners);
            this.iterations++;
        }
    }
    calculatePercent(count) {
        return +((count / this.iterations) * 100).toFixed(4);
    }
}
exports.Calculator = Calculator;
