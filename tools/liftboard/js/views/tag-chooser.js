// views/tag-chooser.js — toggleable tag chips plus a "New tag" field, used by
// the Lift Editor (applied on Save) and by the log sheet's tag picker
// (applied at once). A new tag is created as soon as it's added.

import { h, fill } from '../dom.js';
import { openSheet } from '../dialogs.js';

let nextId = 0;

/**
 * @param selectedIds  the tag ids chosen to start with
 * @param onChange     called with the chosen ids after every change
 */
export function tagChooser(store, selectedIds, onChange) {
  const selected = new Set(selectedIds);
  const inputId = `new-tag-${++nextId}`;
  const chips = h('div', { class: 'chip-wrap', role: 'group', 'aria-label': 'Tags' });
  const input = h('input', {
    id: inputId, type: 'text', class: 'field t-row-label', placeholder: 'New tag',
    autocomplete: 'off', autocapitalize: 'words', maxlength: '30', enterkeyhint: 'done',
  });
  const add = h('button', { type: 'button', class: 'btn-secondary t-button', onclick: addTag }, 'Add');

  const changed = () => onChange([...selected]);

  function render() {
    const tags = [...store.state.tags].sort((a, b) => a.sortOrder - b.sortOrder);
    fill(chips, tags.length
      ? tags.map(t => h('button', {
          type: 'button', class: 'chip t-chip', 'aria-pressed': String(selected.has(t.id)),
          onclick: () => {
            if (selected.has(t.id)) selected.delete(t.id); else selected.add(t.id);
            render();
            changed();
          },
        }, t.name))
      : h('p', { class: 't-subtitle' }, 'No tags yet'));
    add.disabled = input.value.trim() === '';
  }

  function addTag() {
    if (input.value.trim() === '') return;
    selected.add(store.addTag(input.value));   // reuses a tag with the same name
    input.value = '';
    render();
    changed();
  }

  input.addEventListener('input', () => { add.disabled = input.value.trim() === ''; });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }   // never submits the editor's form
  });
  render();

  return h('div', { class: 'tag-chooser' },
    chips,
    h('div', { class: 'new-tag' },
      h('label', { class: 'visually-hidden', for: inputId }, 'New tag'),
      input,
      add));
}

/** The log sheet's tag picker: a small sheet whose changes save immediately. */
export function openTagPicker(store, liftId) {
  const lift = store.lift(liftId);
  const sheet = openSheet({ title: `Tags for ${lift.name}` });
  sheet.body.append(tagChooser(store, lift.tagIds, ids => store.setLiftTags(liftId, ids)));
  return sheet.closed;
}
