// Auth + profile surface (route: /profile — own profile; /profile/:username for others).

import {
  fetchUserProfile,
  updateUser,
  addToFavorites,
  removeFromFavorites,
} from '../api.js';
import { getState, subscribe } from '../auth.js';
import { el, cardSlot, handRow } from '../components/dom.js';

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
    el('div', { class: 'chalk-heading', style: 'font-size:1.75rem', text: 'Sign in to keep score' }),
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
      el('div', { class: 'chalk-heading', style: 'font-size:2rem', text: username }),
      el('div', { class: 'chalk-label', text: `rank ${rank}` }),
      el('div', { class: 'chalk-label', text: `score ${Number(body.score).toFixed(2)}` })
    );

    const historyList = el('div', { class: 'history-list' });
    for (const round of body.rounds ?? []) {
      const favorite = (body.roundFavoritesIds ?? []).includes(round.roundId);
      const favBtn = isOwner
        ? el('button', {
            class: 'chalk-btn',
            text: favorite ? '★' : '☆',
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

    outlet.append(header, el('div', { class: 'chalk-heading', style: 'font-size:1.5rem; margin:var(--space-4) 0 var(--space-2)', text: 'Round history' }), historyList);

    if (isOwner) outlet.append(buildSettingsForm());
  });
}

function buildSettingsForm() {
  const heading = el('div', { class: 'chalk-heading', style: 'font-size:1.5rem; margin:var(--space-5) 0 var(--space-2)', text: 'Settings' });
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
