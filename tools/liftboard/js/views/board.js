// views/board.js — the Board tab. Phase 1: the header (logo mark, wordmark,
// sync dot, Add button), the live subtitle, the empty state, and lifts as a
// plain list. Tapping a lift opens the Lift Editor for now; from Phase 2 it
// opens the Log Session sheet instead.

import { h, fill } from '../dom.js';
import { plural } from '../format.js';
import { icon, patternIcon } from '../icons.js';
import { openAddLift } from './add-lift.js';
import { openLiftEditor } from './lift-editor.js';

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
  const sync = syncDot(store);
  const add = () => openAddLift(store);

  const header = h('header', { class: 'board-header' },
    h('div', { class: 'board-header-row' },
      h('div', { class: 'brand' },
        h('span', { class: 'logo-mark', 'aria-hidden': 'true' }),
        h('h1', { class: 't-wordmark' }, 'LiftBoard'),
        sync.el),
      h('button', { type: 'button', class: 'btn-icon', 'aria-label': 'Add lift', onclick: add, html: icon('plus') })),
    h('p', { class: 't-subtitle' }, plural(lifts.length, 'lift')));

  const body = lifts.length === 0
    ? h('div', { class: 'empty' },
        h('p', { class: 't-row-label' }, 'No lifts yet'),
        h('button', { type: 'button', class: 'btn-primary t-button', onclick: add }, 'Add your first lift'))
    : h('ul', { class: 'lift-list' }, lifts.map(lift =>
        h('li', {},
          h('button', { type: 'button', class: 'list-row', onclick: () => openLiftEditor(store, { liftId: lift.id }) },
            h('span', { class: 'list-row-icon', html: patternIcon(lift.pattern) }),
            h('span', { class: 't-lift-name' }, lift.name)))));

  fill(root, header, body);
  return sync.stop;
}
