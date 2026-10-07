// views/log-sheet.js — the Log Session sheet: last session's sets prefilled,
// adjusted, then logged. The row rules live in log-rows.js. Tag changes made
// here save at once, even if the session is then discarded.

import { h, fill } from '../dom.js';
import { openSheet, confirmDialog } from '../dialogs.js';
import { icon } from '../icons.js';
import { latest } from '../derive.js';
import { shortDate, todayLabel } from '../format.js';
import { allowsNoWeight } from '../library.js';
import {
  prefillRows, copyRow, readRows, rowsDiffer, weightValid, repsValid, stepWeight, stepReps,
} from '../log-rows.js';
import { openLiftEditor } from './lift-editor.js';
import { openTagPicker } from './tag-chooser.js';

/** A field with − on its left and + on its right. `step(direction)` returns the
 *  field's new text, or null when the button does nothing; `set(text)` applies it. */
function stepper(input, what, n, step, set) {
  const button = (direction, verb, name) => h('button', {
    type: 'button', class: 'btn-step', 'aria-label': `${verb} ${what}, set ${n}`, html: icon(name),
    onclick: () => { const text = step(direction); if (text !== null) set(text); },
  });
  return h('div', { class: 'set-stepper' }, button(-1, 'Decrease', 'minus'), input, button(1, 'Increase', 'plus'));
}

/** Opens the sheet for one lift. `onLogged(liftId)` runs after a session is saved. */
export function openLogSheet(store, liftId, { onLogged } = {}) {
  const unit = store.state.settings.unit;
  const lift = () => store.lift(liftId);
  const initial = prefillRows(lift(), unit);
  const rows = initial.map(copyRow);   // the live rows; `initial` stays as opened
  const touched = new WeakSet();       // fields the person has edited (for the invalid outline)

  const edit = h('button', { type: 'button', class: 'btn-text t-button', onclick: onEdit }, 'Edit');
  const sheet = openSheet({
    title: `Log ${lift().name}`,
    actions: [edit],
    canClose: async () => !rowsDiffer(initial, rows) ||
      confirmDialog('Discard this session?', 'Discard', { destructive: true }),
  });
  const title = sheet.body.closest('dialog').querySelector('.t-sheet-title');

  const tagSummary = h('span', { class: 'tag-summary' });
  const count = h('span', { class: 't-section' });
  const lastLabel = h('span', { class: 't-e1rm' });
  const weightColumn = h('span', { class: 't-column' });
  const rowList = h('div', { class: 'set-rows' });
  const logButton = h('button', { type: 'button', class: 'btn-log t-button', onclick: onLog }, 'Log Session');

  function renderRows() {
    // An empty weight field on a bodyweight or band lift means no weight
    const empty = allowsNoWeight(lift()) ? (lift().equipment === 'band' ? 'Band' : 'BW') : null;
    fill(rowList, rows.map((row, i) => {
      const n = i + 1;
      const weight = h('input', {
        type: 'text', inputmode: 'decimal', enterkeyhint: 'next', autocomplete: 'off',
        class: 'set-field t-field', id: `set-${n}-weight`, value: row.weight, placeholder: empty,
      });
      const reps = h('input', {
        type: 'text', inputmode: 'numeric', enterkeyhint: 'next', autocomplete: 'off',
        class: 'set-field t-field', id: `set-${n}-reps`, value: row.reps,
      });
      // Typing and the − / + buttons both edit the row the same way
      const setWeight = text => { weight.value = row.weight = text; touched.add(weight); refresh(); };
      const setReps = text => { reps.value = row.reps = text; touched.add(reps); refresh(); };
      weight.addEventListener('input', () => setWeight(weight.value));
      reps.addEventListener('input', () => setReps(reps.value));
      weight.addEventListener('blur', () => { touched.add(weight); refresh(); });
      reps.addEventListener('blur', () => { touched.add(reps); refresh(); });
      const remove = h('button', {
        type: 'button', class: 'btn-remove', 'aria-label': `Remove set ${n}`, html: icon('circle-minus'),
        disabled: rows.length === 1,
        onclick: () => { rows.splice(i, 1); renderRows(); },
      });
      const weightWord = lift().equipment === 'bodyweight' ? 'added weight' : 'weight';
      return h('div', { class: 'set-row', role: 'group', 'aria-label': `Set ${n}` },
        h('span', { class: 't-row-value set-number', 'aria-hidden': 'true' }, String(n)),
        h('label', { class: 'visually-hidden', for: weight.id }, `Set ${n} ${weightWord} in ${unit}`),
        stepper(weight, weightWord, n, d => stepWeight(row.weight, d, unit, allowsNoWeight(lift())), setWeight),
        h('label', { class: 'visually-hidden', for: reps.id }, `Set ${n} reps`),
        stepper(reps, 'reps', n, d => stepReps(row.reps, d), setReps),
        remove);
    }));
    refresh();
  }

  /** Updates everything that depends on the rows or the lift, without
   *  rebuilding the fields (so typing never loses focus). */
  function refresh() {
    const l = lift();
    if (!l) return;
    title.textContent = `Log ${l.name}`;
    const names = store.state.tags.filter(t => l.tagIds.includes(t.id)).sort((a, b) => a.sortOrder - b.sortOrder);
    fill(tagSummary, names.length
      ? names.map(t => h('span', { class: 'tag-pill t-chip-small' }, t.name))
      : h('span', { class: 't-subtitle' }, 'None'));
    count.textContent = `Sets · ${rows.length}`;
    const last = latest(l);
    lastLabel.textContent = last ? `Last: ${shortDate(last.date)}` : '';
    weightColumn.textContent = `${l.equipment === 'bodyweight' ? 'Added' : 'Weight'} (${unit})`;
    rowList.querySelectorAll('.set-row').forEach((el, i) => {
      const [weight, reps] = el.querySelectorAll('input');
      const wOk = weightValid(rows[i].weight, allowsNoWeight(l));
      const rOk = repsValid(rows[i].reps);
      weight.setAttribute('aria-invalid', String(!wOk));
      reps.setAttribute('aria-invalid', String(!rOk));
      weight.classList.toggle('show-invalid', !wOk && touched.has(weight));
      reps.classList.toggle('show-invalid', !rOk && touched.has(reps));
    });
    logButton.disabled = readRows(rows, unit, allowsNoWeight(l)) === null;
  }

  function addSet() {
    rows.push(copyRow(rows.at(-1)));
    renderRows();
  }

  function onLog() {
    const sets = readRows(rows, unit, allowsNoWeight(lift()));
    if (!sets) return;
    store.logSession(liftId, sets);
    sheet.close();
    onLogged?.(liftId);
  }

  async function onTags() {
    await openTagPicker(store, liftId);
    refresh();
  }

  async function onEdit() {
    await openLiftEditor(store, { liftId });
    if (!lift()) sheet.close();   // deleted from the editor: nothing left to log
    else renderRows();            // the name or equipment may have changed
  }

  sheet.body.append(
    h('button', { type: 'button', class: 'sheet-row sheet-row-button', onclick: onTags },
      h('span', { class: 't-row-label' }, 'Tags'),
      h('span', { class: 'sheet-row-end' }, tagSummary, h('span', { class: 'chevron', html: icon('chevron-right') }))),
    h('div', { class: 'sheet-row' },
      h('span', { class: 't-row-label' }, 'Date'),
      h('span', { class: 't-row-value' }, todayLabel())),
    h('div', { class: 'sets-header' }, count, lastLabel),
    h('div', { class: 'set-columns', 'aria-hidden': 'true' },
      h('span', { class: 't-column' }, 'Set'), weightColumn, h('span', { class: 't-column' }, 'Reps'), h('span')),
    rowList,
    h('button', { type: 'button', class: 'btn-add-set t-button', onclick: addSet },
      h('span', { class: 'btn-add-set-icon', html: icon('plus') }), 'Add set'),
    logButton);
  renderRows();
  return sheet.closed;
}
