"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluate = evaluate;
const types_js_1 = require("./types.js");
const util_js_1 = require("./util.js");
function evaluate(cardGroup) {
    cardGroup.sortDesc();
    // group by rank
    const rankCount = cardGroup.countBy('rank');
    const quadRanks = [];
    const tripRanks = [];
    const pairRanks = [];
    let straightCardsCount = 0;
    let straightMaxCardRank = 0;
    let straightLastCardRank = 0;
    const allRanks = Object.keys(rankCount).reverse();
    for (const rank of allRanks) {
        if (rankCount[rank] === 2) {
            pairRanks.push(Number(rank));
        }
        else if (rankCount[rank] === 3) {
            tripRanks.push(Number(rank));
        }
        else if (rankCount[rank] === 4) {
            quadRanks.push(Number(rank));
        }
        if (straightCardsCount < 5) {
            if (straightLastCardRank && straightLastCardRank - 1 === Number(rank)) {
                straightCardsCount++;
                straightLastCardRank = Number(rank);
            }
            else {
                straightMaxCardRank = straightLastCardRank = Number(rank);
                straightCardsCount = 1;
            }
        }
    }
    // group by suit
    const suitCount = cardGroup.countBy('suit');
    let flushSuit = 0;
    for (const suit in suitCount) {
        if (suitCount[suit] >= 5) {
            flushSuit = Number(suit);
            break;
        }
    }
    // straight flush
    if (flushSuit) {
        if (straightCardsCount === 5) {
            const straightFlushCards = cardGroup.cards.filter(card => card.suit === flushSuit && card.rank <= straightMaxCardRank);
            if (straightFlushCards.length >= 5) {
                let index = 0;
                let count = 1;
                let isStraightFlush = false;
                for (let i = 1; i < straightFlushCards.length; i++) {
                    if (straightFlushCards[i].rank !== straightFlushCards[i - 1].rank - 1) {
                        index = i;
                        count = 1;
                    }
                    else {
                        count++;
                    }
                    if (count === 5) {
                        isStraightFlush = true;
                        break;
                    }
                }
                if (isStraightFlush)
                    return { handRank: types_js_1.HandRanks.straightFlush, hand: new types_js_1.CardGroup(straightFlushCards.slice(index, index + 5)) };
            }
        }
        else if (straightCardsCount === 4 && straightMaxCardRank === types_js_1.Ranks.five) {
            const aceCards = cardGroup.cards.filter(card => card.suit === flushSuit && card.rank === types_js_1.Ranks.ace);
            if (aceCards.length > 0) {
                const straightFlushCards = cardGroup.cards.filter(card => card.suit === flushSuit && card.rank <= straightMaxCardRank);
                if (straightFlushCards.length === 4)
                    return { handRank: types_js_1.HandRanks.straightFlush, hand: new types_js_1.CardGroup(straightFlushCards.concat(aceCards[0]).slice(0, 5)) };
            }
        }
    }
    // quads
    if (quadRanks.length >= 1) {
        const quadCards = cardGroup.cards.filter(card => card.rank === quadRanks[0]);
        const otherCards = cardGroup.cards.filter(card => card.rank !== quadRanks[0]);
        return { handRank: types_js_1.HandRanks.quads, hand: new types_js_1.CardGroup(quadCards.concat(otherCards).slice(0, 5)) };
    }
    // full house
    if (tripRanks.length === 1 && pairRanks.length >= 1) {
        const tripCards = cardGroup.cards.filter(card => card.rank === tripRanks[0]);
        const pairCards = cardGroup.cards.filter(card => card.rank === pairRanks[0]);
        return { handRank: types_js_1.HandRanks.fullHouse, hand: new types_js_1.CardGroup(tripCards.concat(pairCards)) };
    }
    else if (tripRanks.length > 1) {
        const tripCards = cardGroup.cards.filter(card => card.rank === tripRanks[0]);
        const pairCards = cardGroup.cards.filter(card => card.rank === tripRanks[1]);
        return { handRank: types_js_1.HandRanks.fullHouse, hand: new types_js_1.CardGroup(tripCards.concat(pairCards.slice(0, 2))) };
    }
    // flush
    if (flushSuit) {
        const flushCards = cardGroup.cards.filter(card => card.suit === flushSuit);
        return { handRank: types_js_1.HandRanks.flush, hand: new types_js_1.CardGroup(flushCards.slice(0, 5)) };
    }
    // straight
    if (straightCardsCount === 5) {
        const straightCards = (0, util_js_1.uniqWith)(cardGroup.cards.filter(card => card.rank <= straightMaxCardRank), (c1, c2) => c1.rank === c2.rank);
        return { handRank: types_js_1.HandRanks.straight, hand: new types_js_1.CardGroup(straightCards.slice(0, 5)) };
    }
    else if (straightCardsCount === 4 && straightMaxCardRank === types_js_1.Ranks.five) {
        const aceCards = cardGroup.cards.filter(card => card.rank === types_js_1.Ranks.ace);
        if (aceCards.length > 0) {
            const straightCards = (0, util_js_1.uniqWith)(cardGroup.cards.filter(card => card.rank <= straightMaxCardRank), (c1, c2) => c1.rank === c2.rank);
            return { handRank: types_js_1.HandRanks.straight, hand: new types_js_1.CardGroup(straightCards.concat(aceCards[0]).slice(0, 5)) };
        }
    }
    // trips
    if (tripRanks.length === 1) {
        const tripCards = cardGroup.cards.filter(card => card.rank === tripRanks[0]);
        const cards = cardGroup.cards.filter(card => card.rank !== tripRanks[0]);
        return { handRank: types_js_1.HandRanks.trips, hand: new types_js_1.CardGroup(tripCards.concat(cards).slice(0, 5)) };
    }
    // two pair
    if (pairRanks.length >= 2) {
        const pairedHigherCards = cardGroup.cards.filter(card => card.rank === pairRanks[0]);
        const pairedLowerCards = cardGroup.cards.filter(card => card.rank === pairRanks[1]);
        const unpairedCards = cardGroup.cards.filter(card => card.rank !== pairRanks[0] && card.rank !== pairRanks[1]);
        return { handRank: types_js_1.HandRanks.twoPair, hand: new types_js_1.CardGroup(pairedHigherCards.concat(pairedLowerCards)
                .concat(unpairedCards)
                .slice(0, 5)) };
    }
    // one pair
    if (pairRanks.length === 1) {
        const pairedCards = cardGroup.cards.filter(card => card.rank === pairRanks[0]);
        const unpairedCards = cardGroup.cards.filter(card => card.rank !== pairRanks[0]);
        return { handRank: types_js_1.HandRanks.pair, hand: new types_js_1.CardGroup(pairedCards.concat(unpairedCards).slice(0, 5)) };
    }
    // high card
    return { handRank: types_js_1.HandRanks.highCard, hand: new types_js_1.CardGroup(cardGroup.cards.slice(0, 5)) };
}
