import { validateCard } from '../card/card.js';
export function validateBoard(payload) {
    return (Array.isArray(payload) &&
        (payload.length === 0 ||
            payload.length === 3 ||
            payload.length === 4 ||
            payload.length === 5) &&
        payload.reduce((acc, currentValue) => acc && validateCard(currentValue), true));
}
