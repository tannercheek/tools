// The settings toolbar (PLAN step 26, DESIGN §5.6): Key · Mode · Tempo ·
// Meter · Feel on one compact line, like a DAW's LCD. A field bar
// (field-bar.js): each field's menu has the choices, then Lock and Reroll
// (Meter and Feel are lock-only). Tempo also drags up and down inside its
// field and takes the arrow keys; its menu has a number box for typing.
import { createFieldBar, el, menuItem, menuGrid } from './field-bar.js';
import { MODES, MODE_ORDER, TONICS } from './theory.js';
import { prettyChord, modeTitle } from './display.js';

const INPUT = '__input';
const TEMPO = { min: 40, max: 220 };
const clamp = (t) => Math.min(TEMPO.max, Math.max(TEMPO.min, t));

// getContext() gives { idea, locks, groove }. set(field, key) picks a choice.
// setTempo(t, { commit }) changes the tempo; one history entry per drag, key
// hold or typed value (commit ends it). toggleLock(layer) and reroll(layer).
export function createSettingsBar({ box, menuEl, getContext, set, setTempo, toggleLock, reroll }) {
  const ctx = () => getContext();
  const range = () => {
    const { idea, groove } = ctx();
    const inRange = idea.tempo >= groove.tempo.min && idea.tempo <= groove.tempo.max;
    return `Drums ${groove.tempo.min}–${groove.tempo.max}${inRange ? '' : ', outside'}`;
  };

  // Lock, then Reroll where the layer has one.
  const actions = (layer, name, roll) => {
    const locked = !!ctx().locks[layer];
    const items = [menuItem('__lock', {
      act: true, iconName: 'lock', name: locked ? 'Locked' : 'Lock', role: 'menuitemcheckbox', on: locked, label: `Lock ${name}`,
    })];
    if (roll) items.push(menuItem('__roll', { act: true, iconName: 'dice', name: 'Reroll', disabled: locked, label: `Reroll ${name}` }));
    return menuGrid(items.length, items);
  };
  const act = (layer) => (key) => (key === '__lock' ? toggleLock(layer) : reroll(layer));

  // A field whose menu is a grid of choices.
  const choiceField = (layer, label, name, roll, cols, value, choices) => ({
    label,
    value: () => value(ctx().idea),
    locked: () => ctx().locks[layer],
    menu: () => ({ nodes: [menuGrid(cols, choices(ctx().idea).map((c) => menuItem(c.key, c))), actions(layer, name, roll)] }),
    pick: (key) => set(layer, key),
    act: act(layer),
  });

  const fields = {
    tonic: choiceField('tonic', 'Key', 'key', true, 6, (idea) => prettyChord(idea.key.tonic),
      (idea) => TONICS.map((t) => ({ key: t, sym: prettyChord(t), on: t === idea.key.tonic }))),
    mode: choiceField('mode', 'Mode', 'mode', true, 2, (idea) => modeTitle(idea.key.mode),
      (idea) => MODE_ORDER.map((m) => ({ key: m, sym: modeTitle(m), name: MODES[m].feel, on: m === idea.key.mode }))),
    tempo: {
      label: 'BPM',
      cue: 'chevronsUpDown',
      manual: true,
      value: () => String(ctx().idea.tempo),
      said: () => `Tempo: ${ctx().idea.tempo} BPM`,
      locked: () => ctx().locks.tempo,
      menu: () => {
        const row = el('div', 'tempo-edit');
        const input = el('input', 'tempo-num');
        Object.assign(input, { type: 'number', min: TEMPO.min, max: TEMPO.max, value: ctx().idea.tempo, inputMode: 'numeric' });
        input.dataset.key = INPUT;
        input.setAttribute('aria-label', 'Tempo in BPM');
        const hint = el('span', 'hint', range());
        hint.id = 'tempoHint';
        input.setAttribute('aria-describedby', hint.id);
        row.append(input, el('span', 'mini-label', 'BPM'), hint);
        return { nodes: [row, actions('tempo', 'tempo', true)], role: 'dialog', label: 'Tempo' };
      },
      act: act('tempo'),
    },
    meter: choiceField('meter', 'Meter', 'meter', false, 3, (idea) => idea.meter,
      (idea) => ['4/4', '3/4', '6/8'].map((m) => ({ key: m, sym: m, on: m === idea.meter }))),
    feel: choiceField('feel', 'Feel', 'feel', false, 2, (idea) => (idea.feel.type === 'swing' ? 'Swing' : 'Straight'),
      (idea) => [['straight', 'Straight'], ['swing', 'Swing']].map(([k, s]) => ({ key: k, sym: s, on: k === idea.feel.type }))),
  };

  const bar = createFieldBar({ box, menuEl, fields });

  function render() {
    bar.render();
    bar.field('tempo').title = `Drag up or down, or use the arrow keys. ${range()}`;
  }

  // ---------- Tempo ----------

  // The number box: Enter or leaving it commits. Its own keys (arrows, Home,
  // End) stay in the box; Escape and Tab still close the menu.
  const typed = (input) => {
    const t = Math.round(Number(input.value));
    if (Number.isFinite(t) && t >= TEMPO.min && t <= TEMPO.max) setTempo(t, { commit: true });
    else render();
  };
  menuEl.addEventListener('keydown', (e) => {
    if (e.target.dataset?.key !== INPUT) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      typed(e.target);
      bar.close({ refocus: true });
    } else if (e.key !== 'Escape' && e.key !== 'Tab') e.stopPropagation();
  });
  menuEl.addEventListener('change', (e) => { if (e.target.dataset?.key === INPUT) typed(e.target); });

  function openTempo() {
    bar.toggle('tempo', { focusKey: INPUT });
    if (bar.isOpen('tempo')) menuEl.querySelector('input')?.select();
  }

  // A press that moves more than --drag-slop is a drag (up = faster, one BPM
  // per --tempo-drag-step); a press without a move opens the menu. Escape
  // during a drag puts it back. One history entry per drag.
  const tempoField = bar.field('tempo');
  const px = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 1;
  let drag = null;
  let dragged = false;

  tempoField.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, y: e.clientY, from: ctx().idea.tempo, moving: false, slop: px('--drag-slop'), step: px('--tempo-drag-step') };
  });
  tempoField.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = drag.y - e.clientY;
    if (!drag.moving) {
      if (Math.abs(dy) < drag.slop) return;
      drag.moving = true;
      tempoField.setPointerCapture(e.pointerId);
      tempoField.classList.add('is-dragging');
      bar.close();
    }
    setTempo(clamp(drag.from + Math.round(dy / drag.step)), { commit: false });
  });
  const endDrag = () => {
    if (!drag) return;
    if (drag.moving) {
      setTempo(ctx().idea.tempo, { commit: true });
      tempoField.classList.remove('is-dragging');
      dragged = true;
    }
    drag = null;
  };
  tempoField.addEventListener('pointerup', endDrag);
  tempoField.addEventListener('pointercancel', endDrag);
  tempoField.addEventListener('click', () => {
    if (dragged) { dragged = false; return; }
    openTempo();
  });

  // Up and Down change it by 1 (Shift: 5); letting go ends the history entry.
  tempoField.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drag?.moving) {
      setTempo(drag.from, { commit: true });
      tempoField.classList.remove('is-dragging');
      drag = null;
      dragged = true;
      return;
    }
    const dir = { ArrowUp: 1, ArrowDown: -1 }[e.key];
    if (!dir || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    setTempo(clamp(ctx().idea.tempo + dir * (e.shiftKey ? 5 : 1)), { commit: false });
  });
  tempoField.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') setTempo(ctx().idea.tempo, { commit: true });
  });

  return { render };
}
