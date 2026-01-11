import { assertFalse } from "@std/assert";
import { validateRound } from "./round.ts";

Deno.test("should consider round with duplicate cards invalid ", () => {
  const round = {
    board: ["Ac", "Kd"],
    myHand: ["Ac", "Kd"],
    opponentsHands: [["..", ".."]],
  };
  assertFalse(validateRound(round));
});
Deno.test("should consider round with 3 card hand invalid", () => {
  const round = {
    board: [],
    myHand: ["Ac", "Kd", "3c"],
    opponentsHands: [["..", ".."]],
  };
  assertFalse(validateRound(round));
});
Deno.test("should consider round with non parsable opponentsHand invalid", () => {
  const round = {
    board: [],
    myHand: ["Ac", "Kd"],
    opponentsHands: [["fasolaki", ".."]],
  };
  assertFalse(validateRound(round));
});
Deno.test("should consider round with no opponents invalid", () => {
  const round = {
    board: [],
    myHand: ["Ac", "Kd"],
  };
  assertFalse(validateRound(round));
});
Deno.test("should consider round with duplicate card on board and hand invalid", () => {
  const round = {
    board: [],
    myHand: ["Ac", "Kd"],
  };
  assertFalse(validateRound(round));
});
