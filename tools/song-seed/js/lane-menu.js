// The small menus that open under a cell (PLAN step 20): the Strum row's
// stroke menu and the Loop's chord menu (DESIGN §5.16, §5.18). Opens under its
// cell, centred and kept inside its box; arrow keys move, Escape closes and
// refocuses the cell, and a tap outside closes it. What's in it is the
// caller's: open() takes the items.

// menu: the [role="menu"] element, a child of `box` (position: relative).
// fullWidth(): true when the menu should span the box instead (the chord
// menu in compact). onKey(e): the caller's own keys (D U X . on strums);
// true if it handled one. onClose(): however it closed.
export function createLaneMenu({ menu, box, fullWidth = () => false, onKey = () => false, onClose = () => {} }) {
  let cellOf = null; // () => the cell the menu is open for, as now drawn

  const items = () => [...menu.querySelectorAll('button:not(:disabled)')];

  // getCell returns the live cell, so a redraw while open doesn't lose it.
  // focusKey picks the item (by data-key) to focus; otherwise the checked one.
  // focus: false redraws it without moving focus.
  function open(getCell, nodes, { focusKey, focus = true } = {}) {
    const cell = getCell();
    if (!cell) return;
    if (cellOf && cellOf() !== cell) cellOf()?.setAttribute('aria-expanded', 'false');
    cellOf = getCell;
    cell.setAttribute('aria-expanded', 'true');
    menu.replaceChildren(...nodes);
    menu.hidden = false;
    place(cell);
    if (!focus) return;
    const want = focusKey != null && menu.querySelector(`[data-key="${CSS.escape(focusKey)}"]:not(:disabled)`);
    (want || menu.querySelector('[aria-checked="true"]:not(:disabled)') || items()[0])?.focus();
  }

  // Centred under the cell and kept inside the box; or the box's full width.
  function place(cell) {
    const c = cell.getBoundingClientRect(), b = box.getBoundingClientRect();
    const full = fullWidth();
    menu.classList.toggle('is-full', full);
    menu.style.top = `${c.bottom - b.top}px`;
    if (full) { menu.style.left = ''; return; }
    const left = c.left - b.left + c.width / 2 - menu.offsetWidth / 2;
    menu.style.left = `${Math.max(0, Math.min(left, box.clientWidth - menu.offsetWidth))}px`;
  }

  function close({ refocus = false } = {}) {
    if (!cellOf) return;
    const cell = cellOf();
    cellOf = null;
    cell?.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    onClose();
    if (refocus) cell?.focus();
  }

  const isOpen = () => !!cellOf;
  const hasFocus = () => menu.contains(document.activeElement);

  // Up and Down go to the nearest item on the next line that way, falling
  // back to the next item in order (a one-line menu).
  function vertical(from, dir) {
    const r = from.getBoundingClientRect();
    const x = r.left + r.width / 2;
    let best = null, bestScore = Infinity;
    for (const item of items()) {
      const q = item.getBoundingClientRect();
      const dy = dir > 0 ? q.top - r.bottom : r.top - q.bottom;
      if (dy < -1) continue;
      const score = dy * 1000 + Math.abs(q.left + q.width / 2 - x);
      if (score < bestScore) { best = item; bestScore = score; }
    }
    return best;
  }

  menu.addEventListener('keydown', (e) => {
    const list = items();
    const at = Math.max(0, list.indexOf(document.activeElement));
    const step = (d) => list[(at + d + list.length) % list.length];
    if (!list.length && e.key !== 'Escape' && e.key !== 'Tab') return;
    if (e.key === 'ArrowRight') step(1).focus();
    else if (e.key === 'ArrowLeft') step(-1).focus();
    else if (e.key === 'ArrowDown') (vertical(list[at], 1) || step(1)).focus();
    else if (e.key === 'ArrowUp') (vertical(list[at], -1) || step(-1)).focus();
    else if (e.key === 'Home') list[0].focus();
    else if (e.key === 'End') list[list.length - 1].focus();
    else if (e.key === 'Escape' || e.key === 'Tab') close({ refocus: true });
    else if (!(e.metaKey || e.ctrlKey || e.altKey) && onKey(e)) { /* handled */ } else return;
    e.preventDefault();
  });

  // A tap outside closes it. A tap on its own cell is left to the caller,
  // which closes it (a second tap toggles).
  document.addEventListener('pointerdown', (e) => {
    if (!cellOf || menu.contains(e.target) || cellOf()?.contains(e.target)) return;
    close();
  });

  return { open, close, isOpen, hasFocus };
}
