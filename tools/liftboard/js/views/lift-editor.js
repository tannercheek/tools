// views/lift-editor.js — the Lift Editor sheet, for creating a lift (empty or
// prefilled from the library) and for editing one. Tags arrive in Phase 4.

import { h } from '../dom.js';
import { openSheet, confirmDialog } from '../dialogs.js';
import { patternIcon } from '../icons.js';
import { PATTERNS } from '../library.js';

let nextId = 0;

/** "Delete Bench Press and its 34 logged sessions?" */
function deleteMessage(lift) {
  const n = lift.sessions.length;
  if (n === 0) return `Delete ${lift.name}? It has no logged sessions.`;
  return `Delete ${lift.name} and its ${n} logged session${n === 1 ? '' : 's'}?`;
}

/**
 * Opens the editor.
 *   liftId  — edit this lift, or
 *   prefill — { name, pattern, isBodyweight } for a new lift (from the library)
 * With neither, it's an empty "custom lift" editor.
 */
export function openLiftEditor(store, { liftId = null, prefill = null } = {}) {
  const existing = liftId ? store.lift(liftId) : null;
  const start = existing ?? { name: '', pattern: 'accessory', isBodyweight: false, notes: '', ...prefill };
  const id = `editor-${++nextId}`;
  const sheet = openSheet({ title: existing ? 'Edit Lift' : 'New Lift' });

  const name = h('input', {
    id: `${id}-name`, type: 'text', class: 'field t-row-label', value: start.name,
    autocomplete: 'off', autocapitalize: 'words', maxlength: '60', enterkeyhint: 'done',
  });

  const patterns = h('fieldset', { class: 'editor-group' },
    h('legend', { class: 't-section' }, 'Movement pattern'),
    h('div', { class: 'pattern-grid' },
      Object.entries(PATTERNS).map(([key, label]) =>
        h('label', { class: 'pattern-tile' },
          h('input', { type: 'radio', name: `${id}-pattern`, value: key, checked: key === start.pattern }),
          h('span', { class: 'pattern-icon', html: patternIcon(key) }),
          h('span', { class: 't-chip-small' }, label)))));

  const bodyweight = h('input', { id: `${id}-bw`, type: 'checkbox', role: 'switch', class: 'switch', checked: start.isBodyweight });
  const notes = h('textarea', { id: `${id}-notes`, class: 'field field-multiline t-row-label', rows: '3' }, start.notes);

  const save = h('button', { type: 'submit', class: 'btn-primary btn-wide t-button' }, existing ? 'Save' : 'Add Lift');
  const syncSave = () => { save.disabled = name.value.trim() === ''; };
  name.addEventListener('input', syncSave);
  syncSave();

  const form = h('form', { class: 'editor' },
    h('div', { class: 'editor-group' },
      h('label', { class: 't-section', for: name.id }, 'Name'),
      name),
    patterns,
    h('label', { class: 'switch-row', for: bodyweight.id },
      h('span', { class: 'switch-text' },
        h('span', { class: 't-row-label' }, 'Bodyweight movement'),
        h('span', { class: 't-subtitle' }, 'The weight field records added load')),
      bodyweight),
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
      isBodyweight: bodyweight.checked,
      notes: notes.value,
    };
    if (existing) store.updateLift(existing.id, fields);
    else store.addLift(fields);
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
