// views/settings.js — the Settings tab. So far: a read-only list of tags, and
// with ?debug in the URL, Data → Load sample data. The rest arrives in Phase 6.

import { h, fill } from '../dom.js';
import { confirmDialog } from '../dialogs.js';
import { plural } from '../format.js';
import { sampleData } from '../sample-data.js';

const debug = () => new URLSearchParams(location.search).has('debug');

async function loadSample(store) {
  const { lifts, tags } = store.state;
  const yours = [lifts, tags].map((list, i) => list.length && plural(list.length, i ? 'tag' : 'lift')).filter(Boolean);
  const message = yours.length
    ? `Replace everything with the sample data? Your ${yours.join(' and ')} will be removed.`
    : 'Load the sample data?';
  if (!(await confirmDialog(message, 'Load sample data', { destructive: lifts.length > 0 }))) return;
  store.replaceAll(sampleData());
  location.hash = '#board';
}

export function renderSettings(root, store) {
  const tags = [...store.state.tags].sort((a, b) => a.sortOrder - b.sortOrder);
  fill(root,
    h('h1', { class: 't-sheet-title page-title' }, 'Settings'),
    h('section', { class: 'group', 'aria-labelledby': 'tags-heading' },
      h('h2', { class: 't-section', id: 'tags-heading' }, 'Tags'),
      tags.length
        ? h('ul', { class: 'rows' }, tags.map(t => h('li', { class: 'row t-row-label' }, t.name)))
        : h('p', { class: 't-subtitle' }, 'No tags yet')),
    debug()
      ? h('section', { class: 'group', 'aria-labelledby': 'data-heading' },
          h('h2', { class: 't-section', id: 'data-heading' }, 'Data'),
          h('button', { type: 'button', class: 'btn-secondary btn-wide t-button', onclick: () => loadSample(store) }, 'Load sample data'))
      : null,
  );
}
