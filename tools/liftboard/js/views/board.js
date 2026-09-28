// views/board.js — the Board tab. Phase 2: the header (logo mark, wordmark,
// sync dot, Add button), the live subtitle, the empty state, and lifts as a
// plain list showing "225 × 5 · e1RM 263". Tapping a lift opens the Log
// Session sheet. The card grid replaces the list in Phase 3.

import { h, fill } from '../dom.js';
import { plural, heroText, formatE1RM } from '../format.js';
import { latest } from '../derive.js';
import { icon, patternIcon } from '../icons.js';
import { openAddLift } from './add-lift.js';
import { openLogSheet } from './log-sheet.js';

/** "225 × 5 · e1RM 263", "BW × 12" (no e1RM for bodyweight), or "Not logged yet". */
function summaryText(lift, unit) {
  const last = latest(lift);
  const hero = heroText(last, lift, unit);
  return last && !lift.isBodyweight ? `${hero} · e1RM ${formatE1RM(last.bestE1RMKg, unit)}` : hero;
}

/** A short pop on the row just logged, found after the board re-renders. */
function pop(liftId) {
  const row = document.querySelector(`.list-row[data-lift-id="${CSS.escape(liftId)}"]`);
  if (!row) return;
  row.classList.remove('pop');
  void row.offsetWidth;   // restart the animation if it's already run
  row.classList.add('pop');
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
          h('button', {
            type: 'button', class: 'list-row', 'data-lift-id': lift.id,
            onclick: () => openLogSheet(store, lift.id, { onLogged: pop }),
          },
            h('span', { class: 'list-row-icon', html: patternIcon(lift.pattern) }),
            h('span', { class: 'list-row-text' },
              h('span', { class: 't-lift-name' }, lift.name),
              h('span', { class: 't-e1rm' }, summaryText(lift, unit)))))));

  fill(root, header, body);
  return sync.stop;
}
