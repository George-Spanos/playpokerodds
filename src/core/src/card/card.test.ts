import { assert, assertFalse } from "@std/assert";
import { validateCard } from "./card.ts";

Deno.test("test card validator", () => {
  assertFalse(validateCard("15A"));
  assertFalse(validateCard("10A"));
  assertFalse(validateCard(["KS", "KD"]));
  assertFalse(validateCard({}));
  assertFalse(validateCard(7));
  assertFalse(validateCard("10s"));
});
Deno.test("should test card validator with valid cards", () => {
  assert(validateCard("7d"));
  assert(validateCard("Ts"));
  assert(validateCard("3s"));
  assert(validateCard("7h"));
  assert(validateCard("5s"));
  assert(validateCard("Qc"));
});
