// Bottom sheet (DESIGN §5, §14) and the confirm sheet built on it.
// A modal <dialog> makes the page behind it inert; we add the slide-in, scrim tap,
// a Tab loop that never leaves the sheet, and focus return on close.

import { primaryButton, secondaryButton } from './buttons.js';
import { FOCUSABLE, focusWrapIndex } from './focus.js';
import { uniqueId } from './ids.js';

// Only the checked radio in a group is a Tab stop, and hidden elements are skipped.
function tabStops(container) {
  return [...container.querySelectorAll(FOCUSABLE)].filter((element) => {
    if (element.type === 'radio' && !element.checked) {
      const group = [...container.querySelectorAll(`input[type="radio"][name="${CSS.escape(element.name)}"]`)];
      // With nothing checked, the browser stops on the group's first radio.
      if (group.some((radio) => radio.checked) || group[0] !== element) return false;
    }
    return element.getClientRects().length > 0;
  });
}

function settled(elements) {
  const animations = elements.flatMap((element) => element.getAnimations());
  return Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
}

// content: a node or an array of nodes. initialFocus: an element inside the sheet,
// otherwise the panel itself takes focus so no input pops the keyboard unasked.
// Returns { element, close, closed }; `closed` resolves once the sheet is gone.
export function openSheet({ title, content, initialFocus, role = 'dialog', describedBy }) {
  const returnFocus = document.activeElement;
  const titleId = uniqueId('sheet-title');

  const dialog = document.createElement('dialog');
  dialog.className = 'sheet';
  dialog.setAttribute('role', role);
  dialog.setAttribute('aria-labelledby', titleId);
  if (describedBy) dialog.setAttribute('aria-describedby', describedBy);

  const scrim = document.createElement('div');
  scrim.className = 'sheet__scrim';

  const panel = document.createElement('div');
  panel.className = 'sheet__panel';
  panel.tabIndex = -1;

  const heading = document.createElement('h2');
  heading.className = 'sheet__title';
  heading.id = titleId;
  heading.textContent = title;

  panel.append(heading, ...[content].flat());
  dialog.append(scrim, panel);
  document.body.append(dialog);

  let closing = false;
  let resolveClosed;
  const closed = new Promise((resolve) => {
    resolveClosed = resolve;
  });

  function finish() {
    if (dialog.open) dialog.close();
    dialog.remove();
    if (returnFocus?.isConnected) returnFocus.focus();
    resolveClosed();
  }

  async function close() {
    if (closing) return closed;
    closing = true;
    dialog.classList.remove('sheet--open');
    dialog.classList.add('sheet--closing');
    await settled([panel, scrim]);
    finish();
    return closed;
  }

  // Escape fires `cancel`; animate out instead of vanishing.
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });
  // Browsers may close a dialog without `cancel` (e.g. repeated Escape); clean up anyway.
  dialog.addEventListener('close', () => {
    if (closing) return;
    closing = true;
    finish();
  });
  scrim.addEventListener('click', close);

  dialog.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const stops = tabStops(panel);
    const target = focusWrapIndex(stops.indexOf(document.activeElement), stops.length, event.shiftKey);
    if (target === null) return;
    event.preventDefault();
    stops[target].focus();
  });

  dialog.showModal();
  // The panel still sits below the screen here; a plain focus() would scroll it into view
  // and fight the slide-in.
  (initialFocus ?? panel).focus({ preventScroll: true });
  panel.getBoundingClientRect(); // commit the off-screen start position so the slide-in transitions
  dialog.classList.add('sheet--open');

  return { element: dialog, close, closed };
}

// Resolves true only when the explicit-verb button is pressed; Cancel, scrim and Escape give false.
export async function confirmSheet({ title, message, confirmLabel, cancelLabel = 'Cancel' }) {
  let confirmed = false;
  let sheet;

  const messageId = uniqueId('sheet-message');
  const text = document.createElement('p');
  text.className = 'sheet__message';
  text.id = messageId;
  text.textContent = message;

  const confirm = primaryButton(confirmLabel, {
    block: true,
    onClick: () => {
      confirmed = true;
      sheet.close();
    },
  });
  const cancel = secondaryButton(cancelLabel, { block: true, onClick: () => sheet.close() });

  const actions = document.createElement('div');
  actions.className = 'sheet__actions';
  actions.append(confirm, cancel);

  // Focus starts on Cancel so a stray Enter never confirms.
  sheet = openSheet({ title, content: [text, actions], initialFocus: cancel, role: 'alertdialog', describedBy: messageId });
  await sheet.closed;
  return confirmed;
}
