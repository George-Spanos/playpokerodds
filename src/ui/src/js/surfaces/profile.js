// Auth + profile surface (route: /profile — own profile; /profile/:username for others).

import {
  fetchUserProfile,
  updateUser,
  addToFavorites,
  removeFromFavorites,
} from '../api.js';
import { getState, subscribe } from '../auth.js';
import { el, cardSlot, handRow } from '../components/dom.js';
import { accuracyChart } from '../components/accuracyChart.js';

export function render(outlet, params = {}) {
  const auth = getState();
  const username = params.username ?? auth.user?.username;
  if (!username) {
    renderSignin(outlet);
    return;
  }
  renderProfile(outlet, username, auth.user?.username === username);
}

function renderSignin(outlet) {
  const error = el('div', { class: 'form-error', 'aria-live': 'polite' });
  const modeToggle = el('button', { class: 'chalk-btn', text: 'New here? Register' });
  let mode = 'signin';

  const email = el('input', { type: 'email', name: 'email', autocomplete: 'email', placeholder: 'you@example.com' });
  const username = el('input', { type: 'text', name: 'username', autocomplete: 'username', placeholder: 'cardsharp' });
  const password = el('input', { type: 'password', name: 'password', autocomplete: 'current-password', placeholder: '••••••' });
  const emailRow = el('label', {}, el('span', { class: 'chalk-label', text: 'Email' }), email);
  const submit = el('button', { class: 'chalk-btn chalk-btn--primary', type: 'submit', text: 'Sign in' });

  const form = el(
    'form',
    {
      class: 'panel chalk-form',
      onsubmit: async (e) => {
        e.preventDefault();
        error.textContent = '';
        submit.disabled = true;
        const { registerAction, signinAction } = window.__ppoAuth;
        const ok = mode === 'signin'
          ? await signinAction({ username: username.value, password: password.value })
          : await registerAction({ username: username.value, email: email.value, password: password.value });
        submit.disabled = false;
        if (ok) history.replaceState(null, '', '/profile') || window.dispatchEvent(new PopStateEvent('popstate'));
        else error.textContent = 'Check your details and try again.';
      },
    },
    el('h2', { class: 'chalk-heading', style: 'font-size:1.75rem; margin:0', text: 'Sign in to keep score' }),
    emailRow,
    el('label', {}, el('span', { class: 'chalk-label', text: 'Username' }), username),
    el('label', {}, el('span', { class: 'chalk-label', text: 'Password' }), password),
    error,
    submit,
    modeToggle
  );

  modeToggle.addEventListener('click', () => {
    mode = mode === 'signin' ? 'register' : 'signin';
    submit.textContent = mode === 'signin' ? 'Sign in' : 'Register';
    modeToggle.textContent = mode === 'signin' ? 'New here? Register' : 'Have an account? Sign in';
    emailRow.style.display = mode === 'register' ? '' : 'none';
    password.setAttribute('autocomplete', mode === 'register' ? 'new-password' : 'current-password');
  });
  emailRow.style.display = 'none';

  outlet.append(form);
}

function renderProfile(outlet, username, isOwner) {
  const loading = el('div', { class: 'chalk-label', text: 'Chalking up your history…' });
  outlet.append(loading);
  fetchUserProfile(username).then(({ status, body }) => {
    loading.remove();
    if (status === 404) {
      outlet.append(el('div', { class: 'chalk-label', text: `No such player: ${username}` }));
      return;
    }
    if (status !== 200) return;

    const rank = body.rank >= 0 ? `#${body.rank}` : '—';
    const header = el(
      'div',
      { class: 'panel', style: 'padding:var(--space-4); display:flex; gap:var(--space-5); align-items:baseline; flex-wrap:wrap' },
      el('h2', { class: 'chalk-heading', style: 'font-size:2rem; margin:0', text: username }),
      el('div', { class: 'chalk-label', text: `rank ${rank}` }),
      el('div', { class: 'chalk-label', text: `score ${Number(body.score).toFixed(2)}` })
    );

    const historyList = el('div', { class: 'history-list' });
    for (const round of body.rounds ?? []) {
      const favorite = (body.roundFavoritesIds ?? []).includes(round.roundId);
      const favBtn = isOwner
        ? el('button', {
            class: 'chalk-btn',
            text: '',
            'aria-label': favorite ? 'Remove from favorites' : 'Add to favorites',
            onclick: async () => {
              const res = favorite
                ? await removeFromFavorites(round.roundId)
                : await addToFavorites(round.roundId);
              if (res.status === 204 || res.status === 304) {
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            },
          })
        : null;
      if (favBtn) {
        favBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="${favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/></svg>`;
      }
      historyList.append(
        el(
          'div',
          { class: `history-item panel${isOwner ? '' : ' chalk-ghost'}` },
          el('div', { class: 'hand-cards' }, ...round.myHand.map(cardSlot)),
          el('div', { class: 'chalk-label', text: `guess ${isOwner ? round.estimate : '–'} · odds ${isOwner ? round.odds : '–'} · score ${round.score}` }),
          favBtn
        )
      );
    }
    if ((body.rounds ?? []).length === 0) {
      historyList.append(el('div', { class: 'chalk-label', text: 'No rounds yet.' }));
    }

    outlet.append(header);

    if (isOwner && (body.rounds ?? []).length > 0) {
      outlet.append(
        el('h3', { class: 'chalk-heading', style: 'font-size:1.25rem; margin:var(--space-4) 0 var(--space-2)', text: 'Accuracy by round — lower is closer' }),
        (() => { const wrap = el('div', { class: 'panel', style: 'padding:var(--space-3)' }); wrap.append(accuracyChart(body.rounds)); return wrap; })()
      );
    }

    outlet.append(el('h3', { class: 'chalk-heading', style: 'font-size:1.5rem; margin:var(--space-4) 0 var(--space-2)', text: 'Round history' }), historyList);

    if (isOwner) outlet.append(buildSettingsForm());
  });
}

function buildSettingsForm() {
  const heading = el('h3', { class: 'chalk-heading', style: 'font-size:1.5rem; margin:var(--space-5) 0 var(--space-2)', text: 'Settings' });
  const username = el('input', { type: 'text', autocomplete: 'username' });
  const email = el('input', { type: 'email', autocomplete: 'email' });
  const password = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'leave empty to keep' });
  const error = el('div', { class: 'form-error' });
  const submit = el('button', { class: 'chalk-btn chalk-btn--primary', type: 'submit', text: 'Save' });
  const form = el(
    'form',
    {
      class: 'panel chalk-form',
      onsubmit: async (e) => {
        e.preventDefault();
        error.textContent = '';
        submit.disabled = true;
        const dto = {};
        if (username.value) dto.username = username.value;
        if (email.value) dto.email = email.value;
        if (password.value) dto.password = password.value;
        const { status } = await updateUser(dto);
        submit.disabled = false;
        if (status === 204) error.textContent = 'Saved.';
        else error.textContent = 'Update failed — is the email/username taken?';
      },
    },
    heading,
    el('label', {}, el('span', { class: 'chalk-label', text: 'New username' }), username),
    el('label', {}, el('span', { class: 'chalk-label', text: 'New email' }), email),
    el('label', {}, el('span', { class: 'chalk-label', text: 'New password' }), password),
    error,
    submit
  );
  return form;
}
