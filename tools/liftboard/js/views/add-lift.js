// views/add-lift.js — the Add Lift sheet: a search field, "Create custom lift",
// then the built-in library grouped by equipment. Picking anything opens the
// Lift Editor; the library itself never creates a lift or a tag.

import { h, fill } from '../dom.js';
import { openSheet } from '../dialogs.js';
import { icon, equipmentIcon } from '../icons.js';
import { libraryGroups } from '../library.js';
import { openLiftEditor } from './lift-editor.js';

export function openAddLift(store) {
  const sheet = openSheet({ title: 'Add Lift' });

  function pick(prefill) {
    sheet.close();
    openLiftEditor(store, { prefill });
  }

  const search = h('input', {
    id: 'add-lift-search', type: 'search', class: 'field t-row-label', placeholder: 'Search lifts',
    autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search',
  });

  const custom = h('button', { type: 'button', class: 'list-row list-row-accent', onclick: () => pick(null) },
    h('span', { class: 'list-row-icon', html: icon('plus') }),
    h('span', { class: 't-row-label' }, 'Create custom lift'));

  const list = h('div', { class: 'library' });

  function renderList() {
    const q = search.value.trim().toLowerCase();
    const groups = libraryGroups()
      .map(g => ({ ...g, lifts: g.lifts.filter(l => l.name.toLowerCase().includes(q)) }))
      .filter(g => g.lifts.length > 0);
    fill(list,
      ...groups.map(g =>
        h('section', { class: 'library-group' },
          h('h3', { class: 't-section' }, g.label),
          h('ul', {}, g.lifts.map(l =>
            h('li', {},
              h('button', { type: 'button', class: 'list-row', onclick: () => pick(l) },
                h('span', { class: 'list-row-icon', html: equipmentIcon(l.equipment) }),
                h('span', { class: 't-row-label' }, l.name))))))),
      groups.length === 0 ? h('p', { class: 't-subtitle library-none' }, 'No library lifts match. Create a custom lift instead.') : null);
  }

  search.addEventListener('input', renderList);
  renderList();

  sheet.body.append(
    h('label', { class: 'visually-hidden', for: search.id }, 'Search lifts'),
    h('div', { class: 'search-wrap' }, h('span', { class: 'search-icon', html: icon('search') }), search),
    custom,
    list);
  return sheet.closed;
}
