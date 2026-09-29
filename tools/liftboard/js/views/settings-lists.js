// views/settings-lists.js — Settings → Lifts and Settings → Tags. One level
// deep, with a back button. Reordering is ▲/▼ buttons (no drag and drop).

import { h, fill } from '../dom.js';
import { confirmDialog, promptDialog, alertDialog } from '../dialogs.js';
import { icon, patternIcon } from '../icons.js';
import { plural } from '../format.js';
import { openLiftEditor } from './lift-editor.js';

const byOrder = (a, b) => a.sortOrder - b.sortOrder;

function header(title) {
  return h('header', { class: 'detail-header' },
    h('a', { class: 'btn-back t-button', href: '#settings', html: icon('chevron-left') }, 'Settings'),
    h('h1', { class: 't-sheet-title' }, title));
}

/** ▲ and ▼ for one row, disabled at the ends. */
function moveButtons(name, index, count, move) {
  return h('span', { class: 'move-buttons' },
    h('button', { type: 'button', class: 'btn-move', 'aria-label': `Move ${name} up`, html: icon('chevron-up'), disabled: index === 0, onclick: () => move(-1) }),
    h('button', { type: 'button', class: 'btn-move', 'aria-label': `Move ${name} down`, html: icon('chevron-down'), disabled: index === count - 1, onclick: () => move(1) }));
}

/** After a move the list re-renders; keep focus on the same button so ▲▲▲ works
 *  from the keyboard. At an end that button is disabled, so focus its partner. */
function keepFocus(root, render) {
  const label = document.activeElement?.getAttribute('aria-label');
  render();
  const button = label && root.querySelector(`[aria-label="${CSS.escape(label)}"]`);
  if (!button) return;
  (button.disabled ? button.parentElement.querySelector('button:not(:disabled)') : button)?.focus();
}

export function renderLiftsList(root, store) {
  const lifts = [...store.state.lifts].sort(byOrder);
  fill(root,
    header('Lifts'),
    h('p', { class: 't-subtitle list-hint' }, 'This is the Board’s custom order. Tap a lift to edit it.'),
    lifts.length === 0
      ? h('div', { class: 'empty' }, h('p', { class: 't-row-label' }, 'No lifts yet'))
      : h('ul', {}, lifts.map((lift, i) =>
          h('li', { class: 'row order-row' },
            h('button', { type: 'button', class: 'order-name', onclick: () => openLiftEditor(store, { liftId: lift.id }) },
              h('span', { class: 'list-row-icon', html: patternIcon(lift.pattern) }),
              h('span', { class: 't-row-label' }, lift.name)),
            moveButtons(lift.name, i, lifts.length, dir => keepFocus(root, () => store.moveLift(lift.id, dir)))))));
}

async function renameTag(store, tag) {
  const name = await promptDialog(`Rename “${tag.name}”`, tag.name);
  if (name == null || name === tag.name) return;
  try {
    store.renameTag(tag.id, name);
  } catch (err) {
    await alertDialog(err.message);
  }
}

async function deleteTag(store, tag) {
  const n = store.state.lifts.filter(l => l.tagIds.includes(tag.id)).length;
  const message = n
    ? `Delete the “${tag.name}” tag? It’s on ${plural(n, 'lift')}; the lifts stay, only the tag is removed.`
    : `Delete the “${tag.name}” tag? No lifts use it.`;
  if (await confirmDialog(message, 'Delete', { destructive: true })) store.deleteTag(tag.id);
}

async function addTag(store) {
  const name = await promptDialog('New tag');
  if (name != null) store.addTag(name);   // a name that already exists is reused
}

export function renderTagsList(root, store) {
  const tags = [...store.state.tags].sort(byOrder);
  fill(root,
    header('Tags'),
    tags.length === 0
      ? h('p', { class: 't-subtitle list-hint' }, 'No tags yet')
      : h('ul', {}, tags.map((tag, i) =>
          h('li', { class: 'row order-row' },
            h('span', { class: 't-row-label order-name' }, tag.name),
            h('button', { type: 'button', class: 'btn-text t-chip', 'aria-label': `Rename ${tag.name}`, onclick: () => renameTag(store, tag) }, 'Rename'),
            h('button', { type: 'button', class: 'btn-remove', 'aria-label': `Delete ${tag.name}`, html: icon('trash-2'), onclick: () => deleteTag(store, tag) }),
            moveButtons(tag.name, i, tags.length, dir => keepFocus(root, () => store.moveTag(tag.id, dir)))))),
    h('button', { type: 'button', class: 'btn-secondary btn-wide t-button list-add', onclick: () => addTag(store) }, 'Add tag'));
}
