// The Loop's strum lane (PLAN step 22, DESIGN §5.18). Clicking a cell opens
// the stroke menu: ↓ Down · ↑ Up · × Mute · · Rest, with D, U, X and . as
// keys. Each pick is one setStrum() (the app's setIdea()). Cells past the
// strum's length are its repeats: editing one edits the pattern. timeline.js
// draws the cells; the rules are in strum-editor.js.
import { STROKES, STROKE_NAMES, setStroke, strumCellAt } from './strum-editor.js';
import { strumGlyph } from './display.js';
import { createLaneMenu } from './lane-menu.js';

const COMPACT = '(max-width: 599px)'; // the menu spans the Loop
const KEYS = { d: 'D', u: 'U', x: 'x', '.': '.' };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// getContext() gives { strum } for the current idea. setStrum(strum) puts an
// edited pattern in the idea.
export function createStrumLane({ grid, box, menuEl, getContext, setStrum }) {
  let menuFor = -1;  // the loop step whose menu is open
  let focusStep = 0; // the lane's one Tab stop

  const menu = createLaneMenu({
    menu: menuEl,
    box,
    fullWidth: () => matchMedia(COMPACT).matches,
    onKey: (e) => {
      const key = KEYS[e.key.toLowerCase()];
      if (key) pick(key);
      return !!key;
    },
    onClose: () => { menuFor = -1; },
  });
  const cells = () => [...grid.querySelectorAll('.tl-strum')];
  const cellFor = (step) => () => grid.querySelector(`.tl-strum[data-step="${step}"]`);

  // ---------- after each timeline render ----------

  function render() {
    const list = cells();
    // The Tab stop keeps its step, or the next one drawn if the grid changed.
    const stop = list.find((c) => Number(c.dataset.step) >= focusStep) ?? list[list.length - 1];
    for (const c of list) {
      c.tabIndex = c === stop ? 0 : -1;
      c.setAttribute('aria-haspopup', 'menu');
      c.setAttribute('aria-expanded', 'false');
    }
    // The menu stays open on its cell across a redraw, and keeps focus if it had it.
    if (menuFor < 0) return;
    if (!cellFor(menuFor)()) { menu.close(); return; }
    const key = menu.hasFocus() ? document.activeElement.dataset.key : null;
    menu.open(cellFor(menuFor), menuItems(), { focusKey: key, focus: key != null });
  }

  // ---------- the stroke menu ----------

  function menuItems() {
    const { strum } = getContext();
    const now = strum.pattern[strumCellAt(strum, menuFor)];
    return STROKES.map((c) => {
      const item = el('button', 'ed-item');
      item.type = 'button';
      item.dataset.key = c;
      item.setAttribute('role', 'menuitemradio');
      item.setAttribute('aria-checked', String(c === now));
      item.setAttribute('aria-label', STROKE_NAMES[c]);
      const glyph = el('span', 'ed-glyph', strumGlyph(c));
      glyph.setAttribute('aria-hidden', 'true');
      item.append(glyph, el('span', 'ed-name', STROKE_NAMES[c]));
      return item;
    });
  }

  // A pick closes the menu, and focus goes back to the cell.
  function pick(c) {
    const step = menuFor;
    menu.close();
    const { strum } = getContext();
    const i = strumCellAt(strum, step);
    if (strum.pattern[i] !== c) setStrum(setStroke(strum, i, c));
    cellFor(step)()?.focus();
  }

  menuEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-key]');
    if (b && menuFor >= 0) pick(b.dataset.key);
  });

  // ---------- cells: click, keys, roving focus ----------

  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.tl-strum');
    if (!c) return;
    const step = Number(c.dataset.step);
    focusStep = step;
    if (menuFor === step) { menu.close(); return; }
    menuFor = step;
    menu.open(cellFor(step), menuItems());
  });

  function tabStop(cell) {
    for (const c of cells()) c.tabIndex = c === cell ? 0 : -1;
    focusStep = Number(cell.dataset.step);
    return cell;
  }

  // Left and Right move along the lane, Home and End jump to its ends, and
  // Enter (a click) or Space opens the menu. Space plays and stops everywhere else.
  grid.addEventListener('keydown', (e) => {
    const c = e.target.closest('.tl-strum');
    if (!c || e.metaKey || e.ctrlKey || e.altKey) return;
    const list = cells();
    const i = list.indexOf(c);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: list.length - 1 }[e.key];
    if (to != null) {
      e.preventDefault();
      if (list[to]) tabStop(list[to]).focus();
    } else if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) c.click();
    }
  });
  grid.addEventListener('focusin', (e) => {
    const c = e.target.closest('.tl-strum');
    if (c) tabStop(c);
  });

  return { render };
}
