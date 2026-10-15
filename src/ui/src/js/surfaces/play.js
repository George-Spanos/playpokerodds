// Play surface: deal → guess on the chalk rail → lock-on-reveal → next deal.

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
import { el, handRow, cardSlot } from '../components/dom.js';

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
  ui.guessValue = el('div', { class: 'guess-value' }, '—');
  ui.rail = buildRail();
  ui.revealRow = el('div', { class: 'reveal-row' });
  ui.verdict = el('div', { class: 'verdict', 'aria-live': 'polite' });
  ui.guessPanel = el(
    'div',
    { class: 'panel guess-panel' },
    el('div', { class: 'chalk-heading', style: 'font-size:1.5rem', text: 'Your guess' }),
    ui.guessValue,
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
  }
  const thumb = el('div', { class: 'rail-thumb', style: 'left:50%' });
  wrapper.append(thumb);

  let value = 50;
  let locked = false;

  function setEstimate(v) {
    if (locked) return;
    value = Math.max(0, Math.min(100, v));
    thumb.style.left = `${value}%`;
    ui.guessValue.innerHTML = '';
    ui.guessValue.append(document.createTextNode(String(value)), el('span', { class: 'unit', text: ' %' }));
  }

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
    lock() { locked = true; thumb.classList.add('rail-thumb--locked'); },
    unlock() { locked = false; thumb.classList.remove('rail-thumb--locked'); },
    markTruth(odds) {
      const truth = el('div', { class: 'rail-truth', style: `left:${odds}%` });
      wrapper.append(truth);
    },
  };
}

async function deal() {
  state.busy = true;
  state.estimate = null;
  state.answer = null;
  renderTable(null);
  ui.rail.unlock();
  ui.rail.wrapper.setAttribute('aria-disabled', 'false');
  ui.guessValue.innerHTML = '';
  ui.guessValue.append(document.createTextNode('50'), el('span', { class: 'unit', text: ' %' }));
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
      onclick: async (e) => {
        state.playingRevealed = !state.playingRevealed;
        await deal();
      },
    }
  );
  const dealBtn = el('button', { class: 'chalk-btn', text: 'Deal again', onclick: deal });

  const boardRow = el(
    'div',
    { class: 'hand-row' },
    el('span', { class: 'hand-row__label chalk-label', text: 'Board' }),
    el(
      'div',
      { class: 'board-cards' },
      ...(round && round.board.length ? round.board.map(cardSlot) : [el('span', { class: 'chalk-label chalk-ghost', text: 'preflop — no cards yet' })])
    )
  );

  ui.tablePanel.append(
    el('div', { class: 'deal-bar' }, toggle, dealBtn),
    el(
      'div',
      { class: 'table-zone' },
      round ? handRow('Your hand', round.myHand) : el('div', { class: 'chalk-label', text: 'Dealing…' }),
      boardRow,
      ...(round
        ? round.opponentsHands.map((hand, i) =>
            handRow(`Opponent ${i + 1}`, hand, hand[0] === '..' ? 'chalk-pending' : '')
          )
        : [el('span')])
    )
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

  // circle the gap between guess and truth on the rail
  const guessPct = state.estimate ?? answer.estimate;
  const truthPct = answer.odds;
  const circle = el('div', {
    class: 'chalk-circle',
    style: `left:${Math.min(guessPct, truthPct)}%; width:${Math.max(4, Math.abs(truthPct - guessPct))}%; top:-14px; height:calc(100% + 28px)`,
  });
  ui.rail.wrapper.append(circle);

  const accurate = scoreIsAccurate(score);
  ui.verdict.textContent = accurate
    ? `Nailed it — off by ${score.toFixed(2)}`
    : `Off by ${score.toFixed(2)}`;
  ui.verdict.className = `verdict ${accurate ? 'verdict--good' : 'verdict--off'}`;

  ui.revealRow.innerHTML = '';

  const favBtn = el('button', {
    class: 'chalk-btn',
    text: '☆ Favorite',
    onclick: async () => {
      const res = await addToFavorites(answer.roundId);
      favBtn.textContent = res.status === 204 || res.status === 304 ? '★ Favorited' : 'Sign in to keep favorites';
    },
  });
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
