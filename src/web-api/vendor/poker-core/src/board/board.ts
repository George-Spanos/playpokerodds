import { Card, validateCard } from '../card/card.js';

export type Board = Card[];
export function validateBoard(payload: unknown): payload is Board {
  return (
    Array.isArray(payload) &&
    (payload.length === 0 ||
      payload.length === 3 ||
      payload.length === 4 ||
      payload.length === 5) &&
    payload.reduce(
      (acc: boolean, currentValue: Card) => acc && validateCard(currentValue),
      true
    )
  );
}
