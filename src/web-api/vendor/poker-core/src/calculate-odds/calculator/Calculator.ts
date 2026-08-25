import { Game, Player } from './Game.js';
import { CardGroup, Deck, HandRanks, Input } from './types.js';
import { calculateMaxIterations, cleanInput, validateInput } from './util.js';
export class Calculator {
  private stats: any = {};
  private input: Input;
  boardScenarios: CardGroup[] = [];
  iterations = 0;
  constructor(input: Input) {
    validateInput(input);
    cleanInput(input);

    this.input = input;

    for (const e of this.input.hands) {
      this.setupStatsObj(e);
    }

    for (let i = 0; i < this.input.numPlayers - this.input.hands.length; i++) {
      this.setupStatsObj(Game.getNpcName(i + 1));
    }
  }

  simulate() {
    const maxIterations = calculateMaxIterations(this.input);
    if (maxIterations < this.input.iterations) {
      this.createBoardScenarions();
      this.evaluateBoardScenarios();
    } else {
      for (let i = 0; i < this.input.iterations; i++) {
        const g = new Game(this.input);
        const winners = g.play();
        this.addToCount(winners);
        this.iterations++;
      }
    }

    this.calculateStats();

    return this.stats;
  }

  private addToCount(winners: Player[]) {
    if (winners.length > 1) {
      for (const winner of winners) {
        this.stats[winner.name].tieCount++;
        if (this.input.returnTieHandStats)
          this.stats[winner.name].tieHandStats[
            HandRanks[winner.bestHand.handRank]
          ].count++;
      }
    } else {
      for (const winner of winners) {
        this.stats[winner.name].winCount++;
        if (this.input.returnHandStats)
          this.stats[winner.name].handStats[HandRanks[winner.bestHand.handRank]]
            .count++;
      }
    }
  }

  private calculateStats() {
    for (const name in this.stats) {
      // winner percent
      this.stats[name].winPercent = this.calculatePercent(
        this.stats[name].winCount
      );
      this.stats[name].tiePercent = this.calculatePercent(
        this.stats[name].tieCount
      );

      // hand percent
      if (this.input.returnHandStats) {
        for (const rank in this.stats[name].handStats) {
          this.stats[name].handStats[rank].percent = this.calculatePercent(
            this.stats[name].handStats[rank].count
          );
        }
      }
      if (this.input.returnTieHandStats) {
        for (const rank in this.stats[name].tieHandStats) {
          this.stats[name].tieHandStats[rank].percent = this.calculatePercent(
            this.stats[name].tieHandStats[rank].count
          );
        }
      }
    }
  }

  private setupStatsObj(name: string) {
    this.stats[name] = { winCount: 0, tieCount: 0 };
    if (this.input.returnHandStats) this.stats[name].handStats = {};
    if (this.input.returnTieHandStats) this.stats[name].tieHandStats = {};

    for (const r in HandRanks) {
      if (typeof HandRanks[r] !== 'number') continue;

      if (this.input.returnHandStats)
        this.stats[name].handStats[r] = <any>{ count: 0 };
      if (this.input.returnTieHandStats)
        this.stats[name].tieHandStats[r] = <any>{ count: 0 };
    }
  }
  private createBoardScenarions() {
    const deck = new Deck(this.input.numDecks);
    new CardGroup(this.input.board).cards.forEach((c) => deck.removeCard(c));
    this.input.hands.forEach((h) =>
      new CardGroup(h).cards.forEach((c) => deck.removeCard(c))
    );
    const remainingCards = 5 - this.input.board.split(',').length;
    const cardGroups: CardGroup[] = [];
    if (remainingCards === 1) {
      for (let i = 0; i < deck.cards.length; i++) {
        cardGroups.push(new CardGroup([deck.cards[i]]));
      }
    } else if (remainingCards === 2) {
      for (let i = 0; i < deck.cards.length; i++) {
        for (let j = 0; j < deck.cards.length; j++) {
          if (i === j) continue;
          cardGroups.push(new CardGroup([deck.cards[i], deck.cards[j]]));
        }
      }
    } else {
      throw new Error('Cannot handle more than 2 remaining cards');
    }
    this.boardScenarios.push(...cardGroups);
  }

  private evaluateBoardScenarios() {
    // create players out of input
    const players: Player[] = [];
    for (const s of this.input.hands) {
      const dealtCards = new CardGroup(s);
      const p = new Player(dealtCards.toString());
      p.dealt.addCardGroup(dealtCards);
      players.push(p);
    }
    for (const scenario of this.boardScenarios) {
      const game = new Game({
        ...this.input,
        board: [...this.input.board.split(','), ...scenario.cards].join(','),
      });
      const winners = game.play();
      this.addToCount(winners);
      this.iterations++;
    }
  }
  private calculatePercent(count: number) {
    return +((count / this.iterations) * 100).toFixed(4);
  }
}
