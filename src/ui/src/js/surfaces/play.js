// Play surface: deal → guess on the chalk rail → lock-on-reveal → next deal.
// Table reads as a poker table seen from your seat: opponents across the top,
// community board in a drawn center strip, your hand emphasized at the bottom.

import {
  fetchRound,
  fetchRandomRound,
  fetchRoundById,
  postNewRoundAnswer,
  postExistingRoundAnswer,
  addToFavorites,
  removeFromFavorites,
} from '../api.js';
import {
  generateRandomRoundInputs,
  calculateGuessScore,
  scoreIsAccurate,
} from '../domain/poker.js';
import { el, cardSlot } from '../components/dom.js';

const state = {
  round: null,
  roundId: '',
  estimate: null,
  answer: null,
  busy: false,
  playingRevealed: true,
};

let ui = {};

export function render(outlet, params = {}) {
  ui = {};
  outlet.append(
    el(
      'div',
      { class: 'play-grid' },
      buildTablePanel(),
      buildGuessPanel()
    )
  );
  if (params.id) {
    loadExistingRound(params.id);
  } else {
    deal();
  }
}

function buildTablePanel() {
  ui.tablePanel = el('div', { class: 'panel table-panel' });
  return ui.tablePanel;
}

function buildGuessPanel() {
  ui.guessValue = el('input', {
    class: 'guess-value-input',
    type: 'text',
    inputmode: 'decimal',
    autocomplete: 'off',
    'aria-label': 'Guess your winning chances percentage',
  });
  ui.guessValue.value = '50';
  const guessValueWrap = el(
    'div',
    { class: 'guess-value-wrap' },
    ui.guessValue,
    el('span', { class: 'guess-value-unit', text: '%' })
  );
  ui.rail = buildRail();
  ui.revealRow = el('div', { class: 'reveal-row' });
  ui.verdict = el('div', { class: 'verdict', 'aria-live': 'polite' });
  ui.guessPanel = el(
    'div',
    { class: 'panel guess-panel' },
    el('h3', { class: 'chalk-heading', style: 'font-size:1.5rem; margin:0', text: 'Your guess' }),
    guessValueWrap,
    ui.rail.wrapper,
    ui.revealRow,
    ui.verdict
  );
  return ui.guessPanel;
}

function buildRail() {
  const wrapper = el('div', { class: 'rail', role: 'group', 'aria-label': 'Guess your winning chances, 0 to 100 percent' });
  const track = el('div', { class: 'rail-track' });
  wrapper.append(track);
  for (let i = 0; i <= 100; i += 10) {
    wrapper.append(
      el('span', {
        class: `rail-tick${i % 50 === 0 ? ' rail-tick--major' : ''}`,
        style: `left:${i}%`,
      })
    );
    if (i % 50 === 0) {
      wrapper.append(el('span', { class: 'rail-numeral', style: `left:${i}%`, text: String(i) }));
    }
  }
  wrapper.append(el('span', { class: 'rail-numeral', style: 'left:100%', text: '100' }));
  const thumb = el('div', { class: 'rail-thumb', style: 'left:50%' });
  wrapper.append(thumb);

  let value = 50;
  let locked = false;

  function setEstimate(v, syncField = true) {
    if (locked) return;
    value = Math.max(0, Math.min(100, v));
    thumb.style.left = `${value}%`;
    if (syncField) ui.guessValue.value = String(value);
  }

  // Typing drives the thumb live. The field is left untouched mid-typing so the
  // caret and partial text are not rewritten; empty/partial input is ignored
  // while typing and only normalised on commit (change/blur/Enter).
  ui.guessValue.addEventListener('input', () => {
    if (locked) return;
    const digits = ui.guessValue.value.replace(/\D/g, '');
    if (digits === '') return;
    setEstimate(parseInt(digits, 10), false);
  });

  function commitGuess() {
    if (locked) return;
    const digits = ui.guessValue.value.replace(/\D/g, '');
    setEstimate(digits === '' ? 50 : parseInt(digits, 10));
  }
  ui.guessValue.addEventListener('change', commitGuess);
  ui.guessValue.addEventListener('blur', commitGuess);
  ui.guessValue.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitGuess();
      ui.guessValue.blur();
    }
  });

  function pointerToValue(e) {
    if (locked) return;
    const rect = wrapper.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    setEstimate(Math.round((x / rect.width) * 100));
  }

  wrapper.addEventListener('pointerdown', (e) => {
    if (locked) return;
    wrapper.setPointerCapture(e.pointerId);
    pointerToValue(e);
  });
  wrapper.addEventListener('pointermove', (e) => {
    if (e.buttons || e.touches?.length) pointerToValue(e);
  });
  wrapper.addEventListener('keydown', (e) => {
    if (locked) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); setEstimate(value - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); setEstimate(value + 1); }
    if (e.key === 'Home') { e.preventDefault(); setEstimate(0); }
    if (e.key === 'End') { e.preventDefault(); setEstimate(100); }
  });
  wrapper.tabIndex = 0;

  setEstimate(50);
  return {
    wrapper,
    get value() { return value; },
    lock() { locked = true; thumb.classList.add('rail-thumb--locked'); ui.guessValue.readOnly = true; },
    unlock() { locked = false; thumb.classList.remove('rail-thumb--locked'); ui.guessValue.readOnly = false; },
    reset(v = 50) { setEstimate(v); },
    markTruth(odds) {
      const truth = el('div', { class: 'rail-truth', style: `left:${odds}%` });
      wrapper.append(truth);
      wrapper.append(
        el('span', {
          class: 'rail-truth-label',
          style: `left:${odds}%`,
          text: String(odds),
          'aria-hidden': 'true',
        })
      );
    },
  };
}

async function deal() {
  state.busy = true;
  state.estimate = null;
  state.answer = null;
  renderTable(null);
  // state grammar: the committed guess becomes a ghost smudge for the last round
  const lastThumb = ui.rail.wrapper.querySelector('.rail-thumb');
  const wasLocked = lastThumb?.classList.contains('rail-thumb--locked') ?? false;
  const lastLeft = lastThumb?.style.left;
  ui.rail.wrapper.querySelectorAll('.rail-truth, .rail-truth-label, .rail-thumb--ghost').forEach((n) => n.remove());
  ui.rail.unlock();
  ui.rail.wrapper.setAttribute('aria-disabled', 'false');
  ui.rail.reset(50);
  if (lastThumb && wasLocked) {
    const ghost = el('div', { class: 'rail-thumb rail-thumb--ghost chalk-ghost', style: `left:${lastLeft}` });
    ui.rail.wrapper.append(ghost);
  }
  ui.verdict.className = 'verdict';
  ui.verdict.textContent = '';
  ui.revealRow.innerHTML = '';
  ui.revealRow.append(
    el('button', {
      class: 'chalk-btn chalk-btn--primary',
      text: 'Reveal',
      onclick: submitEstimate,
      disabled: true,
    })
  );

  const { status, body } = state.playingRevealed
    ? await fetchRound(generateRandomRoundInputs())
    : await fetchRandomRound();
  state.busy = false;
  if (status !== 200) return;
  state.round = body;
  state.roundId = '';
  renderTable(body);
  ui.revealRow.querySelector('button').disabled = false;
}

async function loadExistingRound(id) {
  const { status, body } = await fetchRoundById(id);
  if (status !== 200) {
    history.replaceState(null, '', '/play');
    deal();
    return;
  }
  state.round = body;
  state.roundId = id;
  state.playingRevealed = true;
  renderTable(body);
  ui.revealRow.innerHTML = '';
  ui.revealRow.append(
    el('button', {
      class: 'chalk-btn chalk-btn--primary',
      text: 'Reveal',
      onclick: submitEstimate,
    })
  );
}

function renderTable(round) {
  ui.tablePanel.innerHTML = '';

  const toggle = el(
    'button',
    {
      class: 'chalk-btn',
      text: state.playingRevealed ? 'Opponents: revealed' : 'Opponents: hidden',
      onclick: async () => {
        state.playingRevealed = !state.playingRevealed;
        await deal();
      },
    }
  );
  const dealBtn = el('button', { class: 'chalk-btn', text: 'Deal again', onclick: deal });

  // ---- zones: opponents (top) / board (middle strip) / your hand (bottom) ----

  // OPPONENTS: grouped section, smaller cards, per-opponent label
  const opponentsZone = el('section', { class: 'zone zone-opponents', 'aria-label': 'Opponents' });
  const opponentCount = round ? round.opponentsHands.length : 0;
  opponentsZone.append(
    el('h4', { class: 'zone-label chalk-label', text: round ? `Opponents — ${opponentCount}` : 'Opponents' })
  );
  if (round) {
    const grid = el('div', { class: 'opponents-grid' });
    round.opponentsHands.forEach((hand, i) => {
      const hidden = hand[0] === '..';
      grid.append(
        el(
          'div',
          { class: `opponent-seat${hidden ? ' chalk-pending' : ''}` },
          el('span', { class: 'seat-label chalk-label', text: `P${i + 1}` }),
          el('div', { class: 'seat-cards' }, ...hand.map(cardSlot))
        )
      );
    });
    opponentsZone.append(grid);
  } else {
    opponentsZone.append(el('div', { class: 'chalk-label chalk-ghost', text: 'dealing…' }));
  }

  // BOARD: chalk-drawn center strip — the community area
  const boardZone = el('section', { class: 'zone zone-board', 'aria-label': 'Community board' });
  boardZone.append(el('h4', { class: 'zone-label chalk-label', text: 'Board' }));
  const strip = el('div', { class: 'board-strip' });
  const shown = round ? round.board.length : 0;
  for (let i = 0; i < 5; i++) {
    if (i < shown) {
      strip.append(cardSlot(round.board[i]));
    } else {
      // empty community slot: faint chalk outline with street hint
      const street = ['', 'preflop', 'preflop', 'flop+', 'turn+', 'river+'][i];
      strip.append(el('span', { class: 'board-slot-empty', 'data-street': i <= 1 ? 'preflop' : street }));
    }
  }
  boardZone.append(strip);

  // YOUR HAND: bottom, biggest cards, amber label — the thing you act on
  const myZone = el('section', { class: 'zone zone-my-hand', 'aria-label': 'Your hand' });
  myZone.append(el('h4', { class: 'zone-label zone-label--mine chalk-label', text: 'Your hand' }));
  if (round) {
    myZone.append(el('div', { class: 'my-cards' }, ...round.myHand.map(cardSlot)));
  } else {
    myZone.append(el('div', { class: 'chalk-label chalk-ghost', text: 'dealing…' }));
  }

  ui.tablePanel.append(
    el('div', { class: 'deal-bar' }, toggle, dealBtn),
    opponentsZone,
    boardZone,
    myZone
  );
}

async function submitEstimate() {
  if (state.busy || state.round === null) return;
  state.busy = true;
  const estimate = ui.rail.value;
  state.estimate = estimate;

  const { status, body } = state.roundId
    ? await postExistingRoundAnswer(state.roundId, estimate)
    : await postNewRoundAnswer(state.round, estimate);

  state.busy = false;
  if (status !== 200 || !body) {
    ui.verdict.textContent = 'Could not calculate — try again';
    ui.verdict.className = 'verdict verdict--off';
    return;
  }
  state.answer = body;
  reveal(body);
}

function reveal(answer) {
  ui.rail.lock();
  ui.rail.markTruth(answer.odds);
  const score = calculateGuessScore(state.estimate ?? answer.estimate, answer.odds);
  const accurate = scoreIsAccurate(score);

  ui.verdict.textContent = accurate
    ? `Nailed it — off by only ${score.toFixed(2)}`
    : `Off by ${score.toFixed(2)}`;
  ui.verdict.className = `verdict ${accurate ? 'verdict--good' : 'verdict--off'}`;

  ui.revealRow.innerHTML = '';

  const starSvg = (filled) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/></svg>`;
  const favBtn = el('button', {
    class: 'chalk-btn',
    text: ' Favorite',
    'aria-label': 'Add to favorites',
    onclick: async () => {
      const res = await addToFavorites(answer.roundId);
      if (res.status === 204 || res.status === 304) {
        favBtn.innerHTML = starSvg(true) + ' Favorited';
      } else {
        favBtn.textContent = 'Sign in to keep favorites';
      }
    },
  });
  favBtn.innerHTML = starSvg(false) + favBtn.textContent;
  const shareBtn = el('button', {
    class: 'chalk-btn',
    text: 'Share round',
    onclick: () => {
      navigator.clipboard?.writeText(`${location.origin}/play/${answer.roundId}`);
      shareBtn.textContent = 'Link copied';
    },
  });
  const nextBtn = el('button', { class: 'chalk-btn chalk-btn--primary', text: 'Next round', onclick: deal });
  ui.revealRow.append(nextBtn, favBtn, shareBtn);
}
