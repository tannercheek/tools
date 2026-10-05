// views/lift-editor.js — the Lift Editor sheet, for creating a lift (empty or
// prefilled from the library) and for editing one. Tag choices apply on Save.

import { h } from '../dom.js';
import { openSheet, confirmDialog } from '../dialogs.js';
import { equipmentIcon } from '../icons.js';
import { PATTERNS, EQUIPMENT } from '../library.js';
import { tagChooser } from './tag-chooser.js';

let nextId = 0;

/** "Delete Bench Press and its 34 logged sessions?" */
function deleteMessage(lift) {
  const n = lift.sessions.length;
  if (n === 0) return `Delete ${lift.name}? It has no logged sessions.`;
  return `Delete ${lift.name} and its ${n} logged session${n === 1 ? '' : 's'}?`;
}

/** A fieldset of radio tiles, one per [value, label]; `art` adds an icon. */
function choiceGroup(legend, name, entries, checked, art = null) {
  return h('fieldset', { class: 'editor-group' },
    h('legend', { class: 't-section' }, legend),
    h('div', { class: 'choice-grid' },
      entries.map(([value, label]) =>
        h('label', { class: art ? 'choice-tile' : 'choice-tile choice-tile-text' },
          h('input', { type: 'radio', name, value, checked: value === checked }),
          art ? h('span', { class: 'choice-icon', html: art(value) }) : null,
          h('span', { class: 't-chip-small' }, label)))));
}

/**
 * Opens the editor.
 *   liftId  — edit this lift, or
 *   prefill — { name, pattern, equipment } for a new lift (from the library)
 * With neither, it's an empty "custom lift" editor.
 */
export function openLiftEditor(store, { liftId = null, prefill = null } = {}) {
  const existing = liftId ? store.lift(liftId) : null;
  const start = existing ?? { name: '', pattern: 'accessory', equipment: 'other', notes: '', ...prefill };
  const id = `editor-${++nextId}`;
  const sheet = openSheet({ title: existing ? 'Edit Lift' : 'New Lift' });

  const name = h('input', {
    id: `${id}-name`, type: 'text', class: 'field t-row-label', value: start.name,
    autocomplete: 'off', autocapitalize: 'words', maxlength: '60', enterkeyhint: 'done',
  });

  const equipment = choiceGroup('Equipment', `${id}-equipment`, Object.entries(EQUIPMENT), start.equipment, equipmentIcon);
  const patterns = choiceGroup('Movement pattern', `${id}-pattern`, Object.entries(PATTERNS), start.pattern);
  let tagIds = existing ? [...existing.tagIds] : [];   // library lifts start untagged
  const tags = tagChooser(store, tagIds, ids => { tagIds = ids; });
  const notes = h('textarea', { id: `${id}-notes`, class: 'field field-multiline t-row-label', rows: '3' }, start.notes);

  const save = h('button', { type: 'submit', class: 'btn-primary btn-wide t-button' }, existing ? 'Save' : 'Add Lift');
  const syncSave = () => { save.disabled = name.value.trim() === ''; };
  name.addEventListener('input', syncSave);
  syncSave();

  const form = h('form', { class: 'editor' },
    h('div', { class: 'editor-group' },
      h('label', { class: 't-section', for: name.id }, 'Name'),
      name),
    equipment,
    patterns,
    h('div', { class: 'editor-group' },
      h('span', { class: 't-section' }, 'Tags'),
      tags),
    h('div', { class: 'editor-group' },
      h('label', { class: 't-section', for: notes.id }, 'Notes'),
      notes),
    save,
    existing
      ? h('button', { type: 'button', class: 'btn-destructive btn-wide t-button', onclick: onDelete }, 'Delete Lift')
      : null);

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (name.value.trim() === '') return;
    const fields = {
      name: name.value,
      pattern: form.querySelector(`input[name="${id}-pattern"]:checked`)?.value ?? 'accessory',
      equipment: form.querySelector(`input[name="${id}-equipment"]:checked`)?.value ?? 'other',
      notes: notes.value,
    };
    const savedId = existing ? existing.id : store.addLift(fields);
    if (existing) store.updateLift(savedId, fields);
    const before = existing ? existing.tagIds : [];
    if (tagIds.length !== before.length || tagIds.some(t => !before.includes(t))) store.setLiftTags(savedId, tagIds);
    sheet.close();
  });

  async function onDelete() {
    const lift = store.lift(existing.id);
    if (!lift) return sheet.close();
    if (await confirmDialog(deleteMessage(lift), 'Delete', { destructive: true })) {
      store.deleteLift(lift.id);
      sheet.close();
    }
  }

  sheet.body.append(form);
  if (!existing && !prefill) name.focus();   // a custom lift starts with typing its name
  return sheet.closed;
}
