// Top-right user status: signed-out prompt or username + score.

import { subscribe, logout } from '../auth.js';
import { el } from './dom.js';

export function renderUserStatus(container) {
  subscribe((state) => {
    container.innerHTML = '';
    if (state.status === 'AUTHORIZED' && state.user) {
      container.append(
        el('span', {
          text: `${state.user.username} · score ${Number(state.user.score).toFixed(2)}`,
        }),
        ' · ',
        el('a', { href: '/profile', 'data-link': '', text: 'profile' }),
        ' · ',
        el('a', { href: '#', text: 'sign out', onclick: (e) => { e.preventDefault(); logout(); } })
      );
    } else {
      container.append(
        el('a', { href: '/profile', 'data-link': '', text: 'sign in' })
      );
    }
  });
}
