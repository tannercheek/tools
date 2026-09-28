// views/stats.js — the Stats tab. Phase 0: the empty state only.

import { h } from '../dom.js';

export function renderStats(root, store) {
  const { lifts } = store.state;
  root.replaceChildren(
    h('h1', { class: 't-sheet-title page-title' }, 'Stats'),
    lifts.length === 0
      ? h('div', { class: 'empty' },
          h('p', { class: 't-row-label' }, 'No lifts yet'),
          h('p', { class: 't-subtitle' }, 'Add a lift on the Board to see its progress here.'))
      : null,
  );
}
