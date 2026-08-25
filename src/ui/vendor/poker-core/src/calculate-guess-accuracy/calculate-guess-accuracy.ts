export function calculateGuessScore(
  estimate: number,
  handOdds: number
): number {
  return Math.abs(Number((estimate - handOdds).toFixed(2)));
}
