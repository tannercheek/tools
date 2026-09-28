// views/settings.js — the Settings tab. Phase 0: a read-only list of tags
// (which shows the seeded tags survive a reload). The rest arrives in Phase 6.

import { h, fill } from '../dom.js';

export function renderSettings(root, store) {
  const tags = [...store.state.tags].sort((a, b) => a.sortOrder - b.sortOrder);
  fill(root,
    h('h1', { class: 't-sheet-title page-title' }, 'Settings'),
    h('section', { class: 'group', 'aria-labelledby': 'tags-heading' },
      h('h2', { class: 't-section', id: 'tags-heading' }, 'Tags'),
      tags.length
        ? h('ul', { class: 'rows' }, tags.map(t => h('li', { class: 'row t-row-label' }, t.name)))
        : h('p', { class: 't-subtitle' }, 'No tags yet')),
  );
}
