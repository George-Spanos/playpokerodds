import { UnknownCard, validateCard } from '../card/card.js';
export const UnknownHand = ['..', '..'];
export function validateHand(payload) {
    return (Array.isArray(payload) &&
        payload.length === 2 &&
        validateCard(payload[0]) &&
        validateCard(payload[1]) &&
        (payload[0] !== payload[1] ||
            (payload[0] === UnknownCard && payload[1] === UnknownCard)));
}
