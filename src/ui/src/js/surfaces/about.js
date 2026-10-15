// About surface.

import { el } from '../components/dom.js';

export function render(outlet) {
  outlet.append(
    el(
      'div',
      { class: 'panel', style: 'padding:var(--space-5); max-width:720px; margin:0 auto' },
      el('div', { class: 'chalk-heading', style: 'font-size:2.25rem', text: 'Forget about bets. Focus on winning chances.' }),
      el(
        'p',
        { style: 'font-size:var(--text-lg); line-height:1.6; color:var(--ink-soft)' },
        'Play Poker Odds! is an equity trainer: you get a hand (and a board in later streets), you guess your chance of winning, and the app shows the calculated odds. The gap between your guess and the truth is how you learn.'
      ),
      el(
        'p',
        { style: 'line-height:1.6; color:var(--ink-soft)' },
        'Odds are computed with a 50,000-iteration Monte Carlo simulation. Sign in to keep score, favorite tricky rounds, and appear on the leaderboards.'
      )
    )
  );
}
