// The Loop's drum lanes (PLAN step 21, DESIGN §5.18). Clicking an empty cell
// adds a hit, and clicking a hit opens its menu: Accent · Hit · Ghost · Delete
// · Earlier · Later. With a mouse or pen, a hit drags along its lane onto an
// empty step. Each pick, and each drag once let go, is one setGroove() (the
// app's setIdea()). Cells past the groove's length are its repeats: editing
// one edits the groove. timeline.js draws the cells; the rules are in
// groove-editor.js.
import { DRUM_TRACKS } from './loop.js';
import { ICONS } from './icons.js';
import { createLaneMenu } from './lane-menu.js';
import { hitMark } from './timeline.js';
import { setHit, moveHit, shiftHit, cellAt } from './groove-editor.js';

const COMPACT = '(max-width: 599px)'; // the menu spans the Loop
const MARKS = [['X', 'Accent'], ['x', 'Hit'], ['o', 'Ghost']];
const ACTIONS = [['delete', 'trash', 'Delete'], ['earlier', 'arrowLeft', 'Earlier'], ['later', 'arrowRight', 'Later']];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// getContext() gives { loop, groove, res } for the current idea, where res is
// the grid the timeline shows (8 or 16). setGroove(groove) puts an edited
// groove in the idea.
export function createDrumLane({ grid, box, menuEl, getContext, setGroove }) {
  let menuFor = null; // { track, step } of the hit whose menu is open
  const focusStep = Object.fromEntries(DRUM_TRACKS.map((t) => [t, 0])); // each lane's one Tab stop
  let drag = null;
  let dragged = false; // a drag just ended, so the click it makes opens nothing

  const menu = createLaneMenu({
    menu: menuEl,
    box,
    fullWidth: () => matchMedia(COMPACT).matches,
    onClose: () => { menuFor = null; },
  });
  const cellsOf = (track) => [...grid.querySelectorAll(`.tl-drum[data-track="${track}"]`)];
  const cellFor = (track, step) => () => grid.querySelector(`.tl-drum[data-track="${track}"][data-step="${step}"]`);
  const markAt = (groove, track, step) => groove.tracks[track]?.[cellAt(groove, step)] ?? '.';

  // ---------- after each timeline render ----------

  function render() {
    for (const track of DRUM_TRACKS) {
      const list = cellsOf(track);
      // The Tab stop keeps its step, or the next one drawn if the grid changed.
      const stop = list.find((c) => Number(c.dataset.step) >= focusStep[track]) ?? list[list.length - 1];
      for (const c of list) {
        c.tabIndex = c === stop ? 0 : -1;
        if (c.classList.contains('has-hit')) {
          c.setAttribute('aria-haspopup', 'menu');
          c.setAttribute('aria-expanded', 'false');
        }
      }
    }
    // The menu stays open on its hit across a redraw, and keeps focus if it had it.
    if (!menuFor) return;
    const at = cellFor(menuFor.track, menuFor.step);
    if (!at()?.classList.contains('has-hit')) { menu.close(); return; }
    const key = menu.hasFocus() ? document.activeElement.dataset.key : null;
    menu.open(at, menuItems(), { focusKey: key, focus: key != null });
  }

  // Draw a lane's marks from a groove without a setIdea(), which would redraw
  // the grid (and lose the drag's pointer capture).
  function paint(track, groove) {
    for (const c of cellsOf(track)) {
      const hit = hitMark(markAt(groove, track, Number(c.dataset.step)));
      c.replaceChildren(...(hit ? [hit] : []));
      c.classList.toggle('has-hit', !!hit);
    }
  }

  // ---------- the hit menu ----------

  function item(key, role) {
    const b = el('button', 'ed-item');
    b.type = 'button';
    b.dataset.key = key;
    b.setAttribute('role', role);
    return b;
  }

  // Accent, Hit and Ghost show their own mark, sized for the lane.
  function menuItems() {
    const { groove } = getContext();
    const { track, step } = menuFor;
    const now = markAt(groove, track, step);
    return [
      ...MARKS.map(([mark, name]) => {
        const b = item(`mark:${mark}`, 'menuitemradio');
        b.setAttribute('aria-checked', String(mark === now));
        const box = el('span', `menu-mark k-${track}`);
        box.append(hitMark(mark));
        b.append(box, el('span', 'ed-name', name));
        return b;
      }),
      ...ACTIONS.map(([key, icon, name]) => {
        const b = item(`act:${key}`, 'menuitem');
        b.disabled = edit(`act:${key}`) === groove;
        b.innerHTML = ICONS[icon];
        b.append(el('span', 'ed-name', name));
        return b;
      }),
    ];
  }

  // The groove after a menu pick (the same one if it can't apply).
  function edit(key) {
    const { loop, groove, res } = getContext();
    const { track, step } = menuFor;
    const [kind, value] = key.split(':');
    if (kind === 'mark') return setHit(groove, track, cellAt(groove, step), value);
    if (value === 'delete') return setHit(groove, track, cellAt(groove, step), '.');
    return shiftHit(groove, track, step, value === 'earlier' ? -1 : 1, 16 / res, loop.totalSteps);
  }

  // The menu stays open on its hit, and goes with it on Earlier and Later.
  // After Delete it closes, and focus goes back to the cell.
  menuEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-key]');
    if (!b || !menuFor) return;
    const { groove, res } = getContext();
    const next = edit(b.dataset.key);
    if (next === groove) return;
    const { track, step } = menuFor;
    if (b.dataset.key === 'act:delete') {
      menu.close();
      focusStep[track] = step;
      setGroove(next);
      cellFor(track, step)()?.focus();
      return;
    }
    const dir = { 'act:earlier': -1, 'act:later': 1 }[b.dataset.key] ?? 0;
    menuFor = { track, step: step + dir * (16 / res) };
    focusStep[track] = menuFor.step;
    setGroove(next);
  });

  // ---------- cells: click, keys, roving focus ----------

  grid.addEventListener('click', (e) => {
    const c = e.target.closest('.tl-drum');
    if (!c || dragged) return;
    const { track } = c.dataset;
    const step = Number(c.dataset.step);
    focusStep[track] = step;
    if (c.classList.contains('has-hit')) {
      if (menuFor?.track === track && menuFor.step === step) menu.close();
      else {
        menuFor = { track, step };
        menu.open(cellFor(track, step), menuItems());
      }
      return;
    }
    // An empty cell gets a hit, and keeps focus if it had it.
    const { groove } = getContext();
    const refocus = document.activeElement === c;
    setGroove(setHit(groove, track, cellAt(groove, step), 'x'));
    if (refocus) cellFor(track, step)()?.focus();
  });

  function tabStop(cell) {
    for (const c of cellsOf(cell.dataset.track)) c.tabIndex = c === cell ? 0 : -1;
    focusStep[cell.dataset.track] = Number(cell.dataset.step);
    return cell;
  }

  // Left and Right move along the lane, Home and End jump to its ends, and
  // Enter (a click) or Space adds a hit or opens its menu. Space plays and
  // stops everywhere else.
  grid.addEventListener('keydown', (e) => {
    const c = e.target.closest('.tl-drum');
    if (!c || e.metaKey || e.ctrlKey || e.altKey) return;
    const list = cellsOf(c.dataset.track);
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
    const c = e.target.closest('.tl-drum');
    if (c) tabStop(c);
  });

  // ---------- dragging a hit (mouse and pen) ----------

  // The step under the pointer, on the grid the timeline shows.
  function stepUnder(x, d) {
    const labelW = grid.firstElementChild.getBoundingClientRect().width;
    const cols = d.total / d.stride;
    const col = Math.floor(((x - grid.getBoundingClientRect().left - labelW) / (grid.clientWidth - labelW)) * cols);
    return Math.max(0, Math.min(cols - 1, col)) * d.stride;
  }

  function endDrag(commit) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.cell.hasPointerCapture(d.id)) d.cell.releasePointerCapture(d.id);
    if (!d.moving) return; // a press without a move: its click opens the menu
    dragged = true;
    setTimeout(() => { dragged = false; }, 0);
    if (commit && d.next !== d.groove) {
      focusStep[d.track] = d.at;
      setGroove(d.next);
    } else if (d.cell.isConnected) paint(d.track, d.groove);
  }

  grid.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('.tl-drum.has-hit');
    if (!cell || e.pointerType === 'touch' || e.button !== 0) return;
    e.preventDefault(); // no text selection; the click still comes
    const { loop, groove, res } = getContext();
    const step = Number(cell.dataset.step);
    const slop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--drag-slop')) || 0;
    drag = {
      cell, id: e.pointerId, track: cell.dataset.track, groove, next: groove, from: cellAt(groove, step), at: step,
      x0: e.clientX, slop, stride: 16 / res, total: loop.totalSteps, moving: false, cancelled: false,
    };
    cell.setPointerCapture(e.pointerId);
  });
  // The mark follows the pointer, snapped to empty cells: over a taken one it
  // stays at the last free one. Every repeat moves with it.
  grid.addEventListener('pointermove', (e) => {
    const d = drag;
    if (!d || e.pointerId !== d.id || d.cancelled) return;
    if (!d.moving) {
      if (Math.abs(e.clientX - d.x0) < d.slop) return;
      d.moving = true;
      menu.close();
    }
    const step = stepUnder(e.clientX, d);
    const to = cellAt(d.groove, step);
    if (step === d.at || (to !== d.from && markAt(d.groove, d.track, step) !== '.')) return;
    d.at = step;
    d.next = moveHit(d.groove, d.track, d.from, to);
    paint(d.track, d.next);
  });
  grid.addEventListener('pointerup', (e) => { if (drag?.id === e.pointerId) endDrag(!drag.cancelled); });
  grid.addEventListener('pointercancel', () => endDrag(false));
  grid.addEventListener('lostpointercapture', () => endDrag(false));
  // Escape puts the hit back, and letting go afterwards changes nothing.
  document.addEventListener('keydown', (e) => {
    if (!drag?.moving || drag.cancelled || e.key !== 'Escape') return;
    e.preventDefault();
    drag.cancelled = true;
    drag.next = drag.groove;
    paint(drag.track, drag.groove);
  }, true);

  return { render };
}
