// views/board.js — the Board tab. Phase 0: the header (logo mark, wordmark,
// sync dot), the live subtitle, and the empty state.

import { h } from '../dom.js';
import { plural } from '../format.js';

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
  const { lifts } = store.state;
  const sync = syncDot(store);

  const header = h('header', { class: 'board-header' },
    h('div', { class: 'brand' },
      h('span', { class: 'logo-mark', 'aria-hidden': 'true' }),
      h('h1', { class: 't-wordmark' }, 'LiftBoard'),
      sync.el),
    h('p', { class: 't-subtitle' }, plural(lifts.length, 'lift')));

  const body = lifts.length === 0
    ? h('div', { class: 'empty' },
        h('p', { class: 't-row-label' }, 'No lifts yet'),
        // Adding lifts arrives in Phase 1.
        h('button', { type: 'button', class: 'btn-primary t-button' }, 'Add your first lift'))
    : null;

  root.replaceChildren(header, ...(body ? [body] : []));
  return sync.stop;
}
