// Leaderboards surface.

import { fetchLeaderboards } from '../api.js';
import { el } from '../components/dom.js';

export function render(outlet) {
  const tableWrap = el('div', { class: 'panel', style: 'padding:var(--space-4)' });
  outlet.append(
    el('h2', { class: 'chalk-heading', style: 'font-size:2rem; margin:0 0 var(--space-4)', text: 'Leaderboards' }),
    tableWrap
  );
  fetchLeaderboards().then(({ status, body }) => {
    tableWrap.innerHTML = '';
    if (status !== 200 || !Array.isArray(body)) {
      tableWrap.append(el('div', { class: 'chalk-label', text: 'Could not load leaderboards.' }));
      return;
    }
    if (body.length === 0) {
      tableWrap.append(el('div', { class: 'chalk-label', text: 'No scores yet — play a few rounds while signed in to appear here.' }));
      return;
    }
    const rows = body.map((u, i) =>
      el(
        'tr',
        {},
        el('td', { class: 'num', text: String(i + 1) }),
        el('td', { text: u.username }),
        el('td', { class: 'num', text: Number(u.score).toFixed(2) }),
        el('td', { class: 'num', text: String(u.gamesPlayed) })
      )
    );
    tableWrap.append(
      el(
        'table',
        { class: 'chalk-table' },
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            el('th', { class: 'num', text: '#' }),
            el('th', { text: 'Player' }),
            el('th', { class: 'num', text: 'Score' }),
            el('th', { class: 'num', text: 'Rounds' })
          )
        ),
        el('tbody', {}, ...rows)
      )
    );
  });
}
