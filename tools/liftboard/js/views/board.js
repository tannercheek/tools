// views/board.js — the Board tab: the header (logo mark, wordmark, sync dot,
// Sort and Add buttons, live subtitle), the tag filter chips, the empty
// states, and the grid of lift cards. Tapping a card opens the Log Session
// sheet. Sort and the selected filters are saved in settings.

import { h, fill } from '../dom.js';
import { plural } from '../format.js';
import { badge, filterLifts, sortLifts } from '../derive.js';
import { icon, logoMark } from '../icons.js';
import { openAddLift } from './add-lift.js';
import { openLogSheet } from './log-sheet.js';
import { liftCard } from './card.js';

/** A short pop on the card just logged, found after the board re-renders.
 *  Focus goes to it too, so a keyboard or screen reader user isn't left at the
 *  top of the page. */
function pop(liftId) {
  const card = document.querySelector(`.card[data-lift-id="${CSS.escape(liftId)}"]`);
  if (!card) return;
  card.focus({ preventScroll: true });
  card.classList.remove('pop');
  void card.offsetWidth;   // restart the animation if it's already run
  card.classList.add('pop');
}

const SORTS = [
  ['custom', 'Custom order'],
  ['recent', 'Recently logged'],
  ['name', 'Name'],
  ['e1rm', 'Best e1RM'],
];

/** Sort: a native <select>, invisible, laid over the icon button so phones
 *  show their own picker. */
function sortControl(store) {
  const { sort } = store.state.settings;
  const select = h('select', {
    class: 'sort-select', 'aria-label': 'Sort lifts',
    onchange: e => store.setSetting('sort', e.target.value),
  }, SORTS.map(([value, label]) => h('option', { value, selected: value === sort }, label)));
  return h('span', { class: 'btn-icon sort-control', html: icon('arrow-up-down') }, select);
}

/** "All" first, then every tag. Several selected tags show lifts having any of them. */
function filterChips(store, active) {
  const tags = [...store.state.tags].sort((a, b) => a.sortOrder - b.sortOrder);
  const chip = (label, pressed, onclick) =>
    h('button', { type: 'button', class: 'chip t-chip', 'aria-pressed': String(pressed), onclick }, label);
  return h('div', { class: 'chip-row', role: 'group', 'aria-label': 'Filter by tag' },
    chip('All', active.length === 0, () => store.setSetting('filterTagIds', [])),
    tags.map(t => chip(t.name, active.includes(t.id), () =>
      store.setSetting('filterTagIds', active.includes(t.id) ? active.filter(id => id !== t.id) : [...active, t.id]))));
}

const SYNC_TEXT = {
  synced: 'Synced',
  'saved-locally': 'Saving…',
  offline: 'Offline — saved on this device',
};

/** The sync dot is made once and reused by every render, so its live region
 *  survives re-renders and screen readers hear each status change. */
let syncEl = null;
function syncDot(store) {
  if (syncEl) return syncEl;
  const spoken = h('span', { class: 'visually-hidden' });
  const label = h('span', { class: 't-subtitle sync-label', 'aria-hidden': 'true' }, 'Offline');
  syncEl = h('span', { class: 'sync', role: 'status' }, h('span', { class: 'sync-dot' }), label, spoken);
  store.onSyncStatus(status => {   // for the life of the page
    syncEl.dataset.status = status;
    spoken.textContent = SYNC_TEXT[status] ?? '';
  });
  return syncEl;
}

/** Renders the Board into root. */
export function renderBoard(root, store) {
  const all = store.state.lifts;
  const { unit, sort, filterTagIds } = store.state.settings;
  const tagIds = store.state.tags.map(t => t.id);
  const active = filterTagIds.filter(id => tagIds.includes(id));   // ignore deleted tags
  const lifts = sortLifts(filterLifts(all, active, tagIds), sort);
  const now = new Date();
  const flames = all.filter(l => badge(l, now) === 'newPR').length;
  const chipScroll = root.querySelector('.chip-row')?.scrollLeft ?? 0;
  const sync = syncDot(store);
  const add = () => openAddLift(store);

  const header = h('header', { class: 'board-header' },
    h('div', { class: 'board-header-row' },
      h('div', { class: 'brand' },
        h('span', { class: 'logo-mark', html: logoMark() }),
        h('h1', { class: 't-wordmark' }, 'LiftBoard'),
        sync),
      h('div', { class: 'header-actions' },
        sortControl(store),
        h('button', { type: 'button', class: 'btn-icon', 'aria-label': 'Add lift', onclick: add, html: icon('plus') }))),
    h('p', { class: 't-subtitle' }, plural(all.length, 'lift') + (flames ? ` · ${flames} 🔥` : '')));

  const body = all.length === 0
    ? h('div', { class: 'empty' },
        h('p', { class: 't-row-label' }, 'No lifts yet'),
        h('button', { type: 'button', class: 'btn-primary t-button', onclick: add }, 'Add your first lift'))
    : lifts.length === 0
    ? h('div', { class: 'empty' }, h('p', { class: 't-row-label' }, 'No lifts match these tags'))
    : h('ul', { class: 'card-grid' }, lifts.map(lift =>
        h('li', {}, liftCard(lift, unit, now, () => openLogSheet(store, lift.id, { onLogged: pop })))));

  fill(root, header, all.length ? filterChips(store, active) : null, body);
  const chips = root.querySelector('.chip-row');
  if (chips) chips.scrollLeft = chipScroll;   // tapping a chip re-renders; keep the row where it was
}
