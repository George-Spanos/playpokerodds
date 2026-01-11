import { assert, assertAlmostEquals, assertEquals } from "@std/assert";

import { Hand } from "../hand/hand.ts";
import { calculateOdds } from "./calculate-odds.ts";
const iterations = 50_000;
Deno.test("digits length should always be 4", () => {
  const myHand: Hand = ["Ac", "Ad"];
  const opponentsHands: Hand[] = [["2c", "2d"]];
  const round = { myHand, opponentsHands, board: [] };
  const odds = calculateOdds(round, iterations);
  assert(odds.toString().length > 4);
});
Deno.test("should expect aces to win over deuces for about than 82.5% of the time", () => {
  const myHand: Hand = ["Ac", "Ad"];
  const opponentsHands: Hand[] = [["2c", "2d"]];
  const round = { myHand, opponentsHands, board: [] };
  const odds = calculateOdds(round, iterations);
  assertAlmostEquals(odds, 82.5, 1);
});
Deno.test("should expect Ace-King to win over Deuces for about than 47.4% of the time", () => {
  const myHand: Hand = ["Ac", "Kd"];
  const opponentsHands: Hand[] = [["2c", "2d"]];
  const round = { myHand, opponentsHands, board: [] };
  const odds = calculateOdds(round, iterations);
  assertAlmostEquals(odds, 47.04, 1);
});
Deno.test("should expect Ace-King to win over random hand for about 64.4% of the time", () => {
  const myHand: Hand = ["Ac", "Kd"];
  const opponentsHands: Hand[] = [["..", ".."]];
  const round = { myHand, opponentsHands, board: [] };
  const odds = calculateOdds(round, iterations);
  assertAlmostEquals(odds, 64.4, 1);
});
Deno.test("should expect Deuce-Three offsuit with a prefixed board to win over random hand for about 21.7% of the time", () => {
  const myHand: Hand = ["2d", "3c"];
  const opponentsHands: Hand[] = [["..", ".."]];
  const board = ["5s", "Ts", "4d", "Kh"];
  const round = { myHand, opponentsHands, board };
  const odds = calculateOdds(round, iterations);
  assertAlmostEquals(odds, 21.7, 1);
});
Deno.test("should expect a hand with 6/44 to win exactly 13.64% of the time", () => {
  const myHand: Hand = ["Qc", "4c"];
  const opponentsHands: Hand[] = [["3d", "2h"]];
  const board = ["9d", "5s", "7s", "2s"];
  const round = { myHand, opponentsHands, board };
  const odds = calculateOdds(round, iterations);
  assertEquals(odds, 13.64);
});
Deno.test("should expect another hand with 6/44 to win exactly 13.64% of the time", () => {
  const myHand: Hand = ["Qs", "4c"];
  const opponentsHands: Hand[] = [["8c", "Ks"]];
  const board = ["Th", "6d", "Js", "2c"];
  const round = { myHand, opponentsHands, board };
  const odds = calculateOdds(round, iterations);
  assertEquals(odds, 13.64);
});

Deno.test("should expect hand with flop to be calced", () => {
  const myHand: Hand = ["Qc", "8h"];
  const opponentsHands: Hand[] = [["9d", "Jh"]];
  const board = ["5d", "Qd", "7h"];
  const round = { myHand, opponentsHands, board };
  const odds = calculateOdds(round, iterations);
  assertEquals(odds, 90.2);
});
