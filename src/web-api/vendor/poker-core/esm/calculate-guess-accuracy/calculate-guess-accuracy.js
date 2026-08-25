export function calculateGuessScore(estimate, handOdds) {
    return Math.abs(Number((estimate - handOdds).toFixed(2)));
}
