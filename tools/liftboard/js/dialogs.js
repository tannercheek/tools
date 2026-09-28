// dialogs.js — sheets, confirmations and text prompts, all built on <dialog>
// with showModal(). Never the browser's confirm(), alert() or prompt().

import { h } from './dom.js';
import { icon } from './icons.js';

let nextId = 0;

/** Closes a dialog when a press both starts and ends on its backdrop, so
 *  dragging out of a text field doesn't count as a backdrop tap. */
function onBackdropTap(dialog, fn) {
  let downOnBackdrop = false;
  dialog.addEventListener('pointerdown', e => { downOnBackdrop = e.target === dialog; });
  dialog.addEventListener('click', e => {
    if (downOnBackdrop && e.target === dialog) fn();
    downOnBackdrop = false;
  });
}

/** Removes a dialog from the page once it has closed. */
function removeOnClose(dialog, then) {
  dialog.addEventListener('close', () => { dialog.remove(); then?.(); }, { once: true });
}

/**
 * Opens a sheet: slides up on phones, centered on desktop.
 *   title     — the sheet's heading
 *   actions   — extra elements for the title row, before the close button
 *   canClose  — optional async () => boolean, asked before × / Escape / backdrop
 * Returns { body, close, closed }: fill `body`; `close()` closes without asking;
 * `closed` is a Promise that resolves once the sheet is gone.
 */
export function openSheet({ title, actions = [], canClose = null }) {
  const titleId = `sheet-title-${++nextId}`;
  const body = h('div', { class: 'sheet-content' });
  let resolveClosed;
  const closed = new Promise(r => { resolveClosed = r; });

  const dialog = h('dialog', { class: 'sheet', 'aria-labelledby': titleId },
    h('div', { class: 'sheet-inner' },
      h('div', { class: 'sheet-header' },
        h('h2', { class: 't-sheet-title', id: titleId }, title),
        ...actions,
        h('button', { type: 'button', class: 'btn-close', 'aria-label': 'Close', onclick: () => requestClose(), html: icon('x') })),
      body));

  const close = () => { if (dialog.open) dialog.close(); };
  async function requestClose() {
    if (canClose && !(await canClose())) return;
    close();
  }

  dialog.addEventListener('cancel', e => { e.preventDefault(); requestClose(); });   // Escape
  onBackdropTap(dialog, requestClose);
  removeOnClose(dialog, resolveClosed);
  document.body.append(dialog);
  dialog.showModal();
  return { body, close, closed };
}

/** A small centered dialog with a message, Cancel, and one action.
 *  Resolves true when the action is chosen, false otherwise. */
export function confirmDialog(message, actionLabel, { destructive = false } = {}) {
  return new Promise(resolve => {
    let result = false;
    const dialog = h('dialog', { class: 'alert', 'aria-label': message },
      h('p', { class: 't-row-label' }, message),
      h('div', { class: 'alert-actions' },
        h('button', { type: 'button', class: 'btn-secondary t-button', onclick: () => dialog.close() }, 'Cancel'),
        h('button', {
          type: 'button',
          class: `${destructive ? 'btn-destructive' : 'btn-primary'} t-button`,
          onclick: () => { result = true; dialog.close(); },
        }, actionLabel)));
    onBackdropTap(dialog, () => dialog.close());
    removeOnClose(dialog, () => resolve(result));
    document.body.append(dialog);
    dialog.showModal();
  });
}

/** A small dialog asking for one line of text. Resolves the trimmed text, or
 *  null when cancelled. Save is disabled while the field is blank. */
export function promptDialog(title, initialValue = '') {
  return new Promise(resolve => {
    let result = null;
    const inputId = `prompt-${++nextId}`;
    const input = h('input', { id: inputId, type: 'text', class: 'field t-row-label', autocomplete: 'off', value: initialValue });
    const save = h('button', { type: 'submit', class: 'btn-primary t-button' }, 'Save');
    const sync = () => { save.disabled = input.value.trim() === ''; };
    input.addEventListener('input', sync);
    sync();

    const form = h('form', { class: 'alert-form' },
      h('label', { class: 't-row-label', for: inputId }, title),
      input,
      h('div', { class: 'alert-actions' },
        h('button', { type: 'button', class: 'btn-secondary t-button', onclick: () => dialog.close() }, 'Cancel'),
        save));
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (input.value.trim() === '') return;
      result = input.value.trim();
      dialog.close();
    });

    const dialog = h('dialog', { class: 'alert', 'aria-label': title }, form);
    onBackdropTap(dialog, () => dialog.close());
    removeOnClose(dialog, () => resolve(result));
    document.body.append(dialog);
    dialog.showModal();
    input.select();
  });
}
