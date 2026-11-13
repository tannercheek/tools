// The Loop's chord lane (PLAN step 20, DESIGN §5.18). Clicking a block plays
// it and opens its menu: Mode, Borrowed, Extension, then Shorter · Longer ·
// Split · Delete. With a mouse or pen, the edge between two blocks drags. Each
// pick, and each drag once let go, is one setProgression() (the app's
// setIdea()). timeline.js draws the blocks; the rules are in
// progression-editor.js.
import { chordFor, parseNumeral } from './theory.js';
import { prettyChord, prettyNumeral } from './display.js';
import { ICONS } from './icons.js';
import { createLaneMenu } from './lane-menu.js';
import {
  chordChoices, takesExtension, pickChord, pickExtension, setChord, resizeChord, splitChord, deleteChord, moveEdge,
} from './progression-editor.js';

const COMPACT = '(max-width: 599px)'; // the menu spans the Loop

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// getContext() gives { idea, loop, prog, res } for the current idea, where res
// is the grid the timeline shows (8 or 16). setProgression(prog) puts an
// edited progression in the idea, and play(i)
// plays chord i of the loop as it now is.
export function createChordLane({ grid, box, menuEl, getContext, setProgression, play }) {
  let menuFor = -1;  // the chord whose menu is open
  let focusIdx = 0;  // the lane's one Tab stop
  let drag = null;

  const menu = createLaneMenu({
    menu: menuEl,
    box,
    fullWidth: () => matchMedia(COMPACT).matches,
    onClose: () => { menuFor = -1; },
  });
  const blocks = () => [...grid.querySelectorAll('.tl-chord')];
  const blockAt = (i) => () => grid.querySelector(`.tl-chord[data-index="${i}"]`);

  // ---------- after each timeline render ----------

  function render() {
    const { loop } = getContext();
    const list = blocks();
    focusIdx = Math.max(0, Math.min(focusIdx, list.length - 1));
    list.forEach((b, i) => {
      b.tabIndex = i === focusIdx ? 0 : -1;
      b.setAttribute('aria-haspopup', 'menu');
      b.setAttribute('aria-expanded', String(i === menuFor));
    });
    // A handle on every edge but the loop's last, placed by --at (CSS).
    grid.append(...loop.chords.slice(0, -1).map((ch, i) => {
      const h = el('div', 'tl-edge');
      h.dataset.edge = i;
      h.style.setProperty('--at', ch.end / loop.totalSteps);
      h.setAttribute('aria-hidden', 'true');
      return h;
    }));
    // The menu stays open on its chord across a redraw, and keeps focus if it had it.
    if (menuFor >= list.length) menu.close();
    else if (menuFor >= 0) {
      const key = menu.hasFocus() ? document.activeElement.dataset.key : null;
      menu.open(blockAt(menuFor), menuItems(menuFor), { focusKey: key, focus: key != null });
    }
  }

  // ---------- the chord menu ----------

  function item(key, role, checked, label) {
    const b = el('button', 'ed-item');
    b.type = 'button';
    b.dataset.key = key;
    b.setAttribute('role', role);
    if (role === 'menuitemradio') b.setAttribute('aria-checked', String(checked));
    if (label) b.setAttribute('aria-label', label);
    return b;
  }

  function group(name, cols, items) {
    const wrap = el('div', 'menu-group');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', name);
    const label = el('p', 'label menu-label', name);
    label.setAttribute('aria-hidden', 'true');
    const cells = el('div', `menu-grid is-${cols}`);
    cells.append(...items);
    wrap.append(label, cells);
    return wrap;
  }

  function menuItems(i) {
    const { idea, prog } = getContext();
    const numeral = prog.chords[i];
    const now = parseNumeral(numeral);
    const { diatonic, borrowed, extensions } = chordChoices(idea.key.mode);

    const chord = (n) => {
      const sym = prettyChord(chordFor(n, idea.key.tonic).symbol);
      const b = item(`chord:${n}`, 'menuitemradio', n === now.base, `${sym}, ${prettyNumeral(n)}`);
      b.append(el('span', 'menu-sym', sym), el('span', 'menu-rn', prettyNumeral(n)));
      return b;
    };
    const extension = ({ ext, label }) => {
      const b = item(`ext:${ext ?? ''}`, 'menuitemradio', ext === now.ext, null);
      b.disabled = !takesExtension(numeral, ext);
      b.append(el('span', 'menu-ext', label));
      return b;
    };
    const action = ([key, icon, name]) => {
      const b = item(`act:${key}`, 'menuitem', false, null);
      b.disabled = edit(key, i) === prog;
      b.innerHTML = ICONS[icon];
      b.append(el('span', 'ed-name', name));
      return b;
    };
    return [
      group('Mode', 7, diatonic.map(chord)),
      borrowed.length ? group('Borrowed', 7, borrowed.map(chord)) : null,
      group('Extension', 4, extensions.map(extension)),
      group('Actions', 4, [
        ['shorter', 'minus', 'Shorter'], ['longer', 'plus', 'Longer'], ['split', 'scissors', 'Split'], ['delete', 'trash', 'Delete'],
      ].map(action)),
    ].filter(Boolean);
  }

  // The progression after a menu pick on chord i (the same one if it can't apply).
  function edit(key, i) {
    const { idea, prog } = getContext();
    const [kind, value] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    const numeral = prog.chords[i];
    if (kind === 'chord') return setChord(prog, i, pickChord(numeral, value));
    if (kind === 'ext') return setChord(prog, i, pickExtension(numeral, value || null));
    if (value === 'shorter') return resizeChord(prog, i, -1, idea.meter);
    if (value === 'longer') return resizeChord(prog, i, 1, idea.meter);
    if (value === 'split') return splitChord(prog, i, idea.meter);
    return deleteChord(prog, i);
  }

  function openMenu(i) {
    menuFor = i;
    menu.open(blockAt(i), menuItems(i));
  }

  // Each pick plays the chord. The menu stays open on it, except after Delete:
  // then the chord that took its time plays and gets focus.
  menuEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-key]');
    if (!b || menuFor < 0) return;
    const i = menuFor;
    const { prog } = getContext();
    const next = edit(b.dataset.key, i);
    if (next === prog) { play(i); return; }
    if (b.dataset.key === 'act:delete') {
      const into = i === 0 ? 0 : i - 1;
      menu.close();
      focusIdx = into;
      setProgression(next);
      play(into);
      blockAt(into)()?.focus();
      return;
    }
    setProgression(next);
    play(i);
  });

  // ---------- blocks: click, keys, roving focus ----------

  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.tl-chord');
    if (!b) return;
    const i = Number(b.dataset.index);
    focusIdx = i;
    if (menuFor === i) { menu.close(); return; }
    play(i);
    openMenu(i);
  });

  function tabStop(i) {
    const list = blocks();
    if (!list[i]) return null;
    list.forEach((b, k) => { b.tabIndex = k === i ? 0 : -1; });
    focusIdx = i;
    return list[i];
  }

  // Left and Right move along the lane, Home and End jump to its ends, and
  // Enter (a click) or Space opens the menu. Space plays and stops everywhere else.
  grid.addEventListener('keydown', (e) => {
    const b = e.target.closest('.tl-chord');
    if (!b || e.metaKey || e.ctrlKey || e.altKey) return;
    const i = Number(b.dataset.index);
    const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: blocks().length - 1 }[e.key];
    if (to != null) {
      e.preventDefault();
      tabStop(to)?.focus();
    } else if (e.code === 'Space') {
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) b.click();
    }
  });
  grid.addEventListener('focusin', (e) => {
    const b = e.target.closest('.tl-chord');
    if (b) tabStop(Number(b.dataset.index));
  });

  // ---------- edge drag (mouse and pen) ----------

  // Both blocks take their new spans, and the handle follows, without a
  // setIdea() (which would redraw the grid).
  function showEdge(d, p) {
    const { stepsPerBar } = d.loop.meter;
    const div = 16 / d.res; // steps per column, as timeline.js draws them
    const len = (k) => Math.round(p.bars[k] * stepsPerBar);
    const list = blocks();
    for (const k of [d.i, d.i + 1]) list[k].style.gridColumn = `span ${len(k) / div}`;
    d.h.style.setProperty('--at', (d.loop.chords[d.i].start + len(d.i)) / d.loop.totalSteps);
  }

  function endDrag(commit) {
    if (!drag) return;
    const d = drag;
    drag = null;
    d.h.classList.remove('is-dragging');
    if (d.h.hasPointerCapture(d.id)) d.h.releasePointerCapture(d.id);
    if (d.next === d.prog) return;
    if (commit) setProgression(d.next);
    else showEdge(d, d.prog);
  }

  grid.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('.tl-edge');
    if (!h || e.pointerType === 'touch' || e.button !== 0) return;
    e.preventDefault();
    const { idea, loop, prog, res } = getContext();
    const i = Number(h.dataset.edge);
    const labelW = grid.firstElementChild.getBoundingClientRect().width;
    const slop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--drag-slop')) || 0;
    drag = {
      i, h, loop, prog, res, next: prog, id: e.pointerId, x0: e.clientX, at: loop.chords[i].end,
      stepW: (grid.clientWidth - labelW) / loop.totalSteps, slop, meter: idea.meter, moving: false,
    };
    h.setPointerCapture(e.pointerId);
  });
  grid.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moving) {
      if (Math.abs(dx) < drag.slop) return;
      drag.moving = true;
      drag.h.classList.add('is-dragging');
      menu.close();
    }
    const next = moveEdge(drag.prog, drag.i, drag.at + dx / drag.stepW, drag.meter);
    if (next === drag.next) return;
    drag.next = next;
    showEdge(drag, next);
  });
  grid.addEventListener('pointerup', (e) => { if (drag?.id === e.pointerId) endDrag(true); });
  grid.addEventListener('pointercancel', () => endDrag(false));
  grid.addEventListener('lostpointercapture', () => endDrag(false));
  document.addEventListener('keydown', (e) => {
    if (drag && e.key === 'Escape') { e.preventDefault(); endDrag(false); }
  }, true);

  return { render };
}
