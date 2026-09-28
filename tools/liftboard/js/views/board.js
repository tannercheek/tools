// views/board.js — the Board tab: the header (logo mark, wordmark, sync dot,
// Add button, live subtitle), the empty state, and the grid of lift cards.
// Tapping a card opens the Log Session sheet. Sort and filters: Phase 4.

import { h, fill } from '../dom.js';
import { plural } from '../format.js';
import { badge } from '../derive.js';
import { icon } from '../icons.js';
import { openAddLift } from './add-lift.js';
import { openLogSheet } from './log-sheet.js';
import { liftCard } from './card.js';

/** A short pop on the card just logged, found after the board re-renders. */
function pop(liftId) {
  const card = document.querySelector(`.card[data-lift-id="${CSS.escape(liftId)}"]`);
  if (!card) return;
  card.classList.remove('pop');
  void card.offsetWidth;   // restart the animation if it's already run
  card.classList.add('pop');
}

const SYNC_TEXT = {
  synced: 'Synced',
  'saved-locally': 'Saving…',
  offline: 'Offline — saved on this device',
};

function syncDot(store) {
  const spoken = h('span', { class: 'visually-hidden' });
  const label = h('span', { class: 't-subtitle sync-label', 'aria-hidden': 'true' }, 'Offline');
  const el = h('span', { class: 'sync', role: 'status' }, h('span', { class: 'sync-dot' }), label, spoken);
  const stop = store.onSyncStatus(status => {
    el.dataset.status = status;
    spoken.textContent = SYNC_TEXT[status] ?? '';
  });
  return { el, stop };
}

/** Renders into root; returns a cleanup function for when the view is left. */
export function renderBoard(root, store) {
  const lifts = [...store.state.lifts].sort((a, b) => a.sortOrder - b.sortOrder);
  const { unit } = store.state.settings;
  const now = new Date();
  const flames = lifts.filter(l => badge(l, now) === 'newPR').length;
  const sync = syncDot(store);
  const add = () => openAddLift(store);

  const header = h('header', { class: 'board-header' },
    h('div', { class: 'board-header-row' },
      h('div', { class: 'brand' },
        h('span', { class: 'logo-mark', 'aria-hidden': 'true' }),
        h('h1', { class: 't-wordmark' }, 'LiftBoard'),
        sync.el),
      h('button', { type: 'button', class: 'btn-icon', 'aria-label': 'Add lift', onclick: add, html: icon('plus') })),
    h('p', { class: 't-subtitle' }, plural(lifts.length, 'lift') + (flames ? ` · ${flames} 🔥` : '')));

  const body = lifts.length === 0
    ? h('div', { class: 'empty' },
        h('p', { class: 't-row-label' }, 'No lifts yet'),
        h('button', { type: 'button', class: 'btn-primary t-button', onclick: add }, 'Add your first lift'))
    : h('ul', { class: 'card-grid' }, lifts.map(lift =>
        h('li', {}, liftCard(lift, unit, now, () => openLogSheet(store, lift.id, { onLogged: pop })))));

  fill(root, header, body);
  return sync.stop;
}
