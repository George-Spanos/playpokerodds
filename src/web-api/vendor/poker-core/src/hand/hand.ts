import { UnknownCard, validateCard } from '../card/card.js';

export type Hand = [string, string];
export const UnknownHand: Hand = ['..', '..'];
export function validateHand(payload: unknown): payload is Hand {
  return (
    Array.isArray(payload) &&
    payload.length === 2 &&
    validateCard(payload[0]) &&
    validateCard(payload[1]) &&
    (payload[0] !== payload[1] ||
      (payload[0] === UnknownCard && payload[1] === UnknownCard))
  );
}
