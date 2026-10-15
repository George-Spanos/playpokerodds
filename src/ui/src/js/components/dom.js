// DOM helpers for surfaces.

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child === null || child === undefined) continue;
    node.append(child);
  }
  return node;
}

/** Card slot: real card face image, or dashed chalk outline for unknown. */
export function cardSlot(card) {
  const known = card && card !== '..';
  const slot = el('span', {
    class: `card-slot${known ? ' card-slot--filled' : ''}`,
    role: 'img',
    'aria-label': known ? `card ${card}` : 'unknown card',
  });
  if (known) {
    const img = document.createElement('img');
    img.src = `src/assets/cards/${card}.svg`;
    img.alt = card;
    slot.append(img);
  }
  return slot;
}

export function handRow(label, cards, extraClass = '') {
  return el(
    'div',
    { class: `hand-row ${extraClass}` },
    el('span', { class: 'hand-row__label chalk-label', text: label }),
    el('div', { class: 'hand-cards' }, ...cards.map(cardSlot))
  );
}
