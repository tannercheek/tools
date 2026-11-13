// The Drums, Strum and Chords rows under the Loop (PLAN step 27, DESIGN §5.7):
// one field bar each (field-bar.js), the settings toolbar's model. The main
// field shows the pick (groove, strum pattern, progression); its menu lists
// the library, then the row's actions: Lock, Reroll, Start over, Import (Drums
// and Chords), and Add to library or Remove (every row; step 24). The other fields (Length, Steps, Bars, Count,
// Colour) show their value; their menus hold the choices, and a lock for the
// layers that have one. Every change goes through the app (setIdea()).
import { createFieldBar, menuItem, menuGrid, menuList } from './field-bar.js';
import { sectionOf, grooveFrom, findGroove } from './idea.js';
import { resizeGroove, startOverGroove } from './groove-editor.js';
import { progressionPick, myProgression, startOverFrom, progressionFrom, findProgression, fitsMeter } from './progression-editor.js';
import { strumFrom, sameStrum, hasStroke, isMine, findStrum, resizeStrum, makeMyStrum } from './strum-editor.js';
import { chordCounts, shapeOf, lockedShape, fitsShape } from './randomize.js';
import { makeMyGroove, makeMyProgression, hasHit } from './my-library.js';
import { strumGlyphs, chartText } from './display.js';
import { MODES } from './theory.js';

const ARM_MS = 3000; // as the two-tap delete in Saved
const COLOURS = ['Plain', 'Some', 'Lots'];
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// The library strum the pattern came from, if it's still there and the
// pattern has changed since.
function startOverStrum(lib, strum, meter) {
  const from = lib.strumById.get(strum.source);
  return from && from.meter === meter && !sameStrum(from, strum) ? from : null;
}

// root: the .lanes box, holding a [data-lane] field bar per row.
// getContext() gives { idea, lib, locks }. The rest change the idea or the
// libraries: setGroove(groove), setStrum(strum), setProgression(prog),
// setShape({ bars } | { count }), setColour(level), toggleLock(layer),
// reroll(layer), openImport(kind, opener), removeMine(list, id) with list
// 'grooves' | 'progressions' | 'strums', addMyStrum(entry), addMine(list,
// entry) with list 'grooves' | 'progressions', toast(msg, opts).
export function createLaneBars(root, deps) {
  const { getContext, toggleLock, reroll } = deps;
  const ctx = () => {
    const { idea, lib, locks } = getContext();
    return { idea, lib, locks, sec: sectionOf(idea), meter: idea.meter };
  };

  // Remove's two-tap confirm: the lane whose Remove is waiting for its second tap.
  let armed = null;
  let armTimer;
  const disarm = () => { clearTimeout(armTimer); if (armed) { armed = null; render(); } };
  function arm(lane) {
    armed = lane;
    clearTimeout(armTimer);
    armTimer = setTimeout(disarm, ARM_MS);
    render();
  }

  // The actions line: Lock, Reroll, Start over, then the lane's own.
  function actions(layer, name, { startOver, extra = [] }) {
    const locked = !!ctx().locks[layer];
    const items = [
      menuItem('__lock', { act: true, iconName: 'lock', name: locked ? 'Locked' : 'Lock', role: 'menuitemcheckbox', on: locked, label: `Lock ${name}` }),
      menuItem('__roll', { act: true, iconName: 'dice', name: 'Reroll', disabled: locked, label: `Reroll ${name}` }),
      menuItem('__reset', { act: true, iconName: 'undo', name: 'Start over', disabled: !startOver }),
      ...extra,
    ];
    return menuGrid(items.length, items);
  }
  const lockOnly = (layer, name, roll = false) => {
    const locked = !!ctx().locks[layer];
    const items = [menuItem('__lock', { act: true, iconName: 'lock', name: locked ? 'Locked' : 'Lock', role: 'menuitemcheckbox', on: locked, label: `Lock ${name}` })];
    if (roll) items.push(menuItem('__roll', { act: true, iconName: 'dice', name: 'Reroll', disabled: locked, label: `Reroll ${name}` }));
    return menuGrid(items.length, items);
  };
  const removeItem = (lane, what) => menuItem('__remove', {
    act: true, iconName: 'trash', armed: armed === lane,
    name: armed === lane ? 'Tap to remove' : 'Remove', label: armed === lane ? 'Tap to remove' : `Remove from ${what}`,
  });
  const importItem = (kind) => menuItem('__import', { act: true, iconName: 'upload', name: 'Import', label: `Import ${kind}s from MIDI` });
  // Add to library, or Remove while the pick is an unchanged My item. Add is
  // disabled while the pick is already in either library.
  const addOrRemove = (lane, what, mine, match) => (mine
    ? removeItem(lane, what)
    : menuItem('__add', { act: true, iconName: 'plus', name: 'Add to library', disabled: !!match, label: `Add to ${what}` }));

  // The second tap removes it; the first arms it.
  function remove(lane, list, id) {
    if (armed !== lane) { arm(lane); return; }
    clearTimeout(armTimer);
    armed = null;
    deps.removeMine(list, id);
  }

  // A choice grid: values, each over its unit (e.g. "2" over "bars").
  const choices = (items) => menuGrid(items.length, items.map((c) => menuItem(c.key, c)));

  // ---------- Drums ----------

  const myGroove = ({ lib, sec }) => {
    const match = findGroove(lib, sec.groove);
    return lib.myGrooves.find((g) => g === match) ?? null;
  };

  const drums = createFieldBar({
    box: root.querySelector('[data-lane="drums"]'),
    menuEl: root.querySelector('[data-lane="drums"] .field-menu'),
    onClose: () => { if (armed === 'drums') disarm(); },
    fields: {
      groove: {
        label: 'Drums',
        value: () => { const c = ctx(); return findGroove(c.lib, c.sec.groove)?.id ?? 'Custom'; },
        locked: () => ctx().locks.groove,
        menu: () => {
          const c = ctx();
          const match = findGroove(c.lib, c.sec.groove);
          const item = (g) => menuItem(g.id, { sym: g.id, on: g === match });
          const mine = myGroove(c);
          return {
            wide: true,
            nodes: [
              menuList([
                { label: `Library · ${c.meter}`, items: c.lib.builtInGrooves.filter((g) => g.meter === c.meter).map(item) },
                { label: 'My grooves', items: c.lib.myGrooves.filter((g) => g.meter === c.meter).map(item) },
              ]),
              actions('groove', 'drums', {
                startOver: startOverGroove(c.lib, c.sec.groove),
                extra: [importItem('groove'), addOrRemove('drums', 'My grooves', mine, match)],
              }),
            ],
          };
        },
        pick: (id) => { const g = ctx().lib.grooveById.get(id); if (g) deps.setGroove(grooveFrom(g)); },
        act: (key, field) => {
          const c = ctx();
          if (key === '__lock') toggleLock('groove');
          else if (key === '__roll') reroll('groove');
          else if (key === '__reset') { const from = startOverGroove(c.lib, c.sec.groove); if (from) deps.setGroove(grooveFrom(from)); }
          else if (key === '__import') { drums.close(); deps.openImport('groove', field); }
          else if (key === '__add') {
            if (findGroove(c.lib, c.sec.groove)) return;
            if (!hasHit(c.sec.groove)) deps.toast('Add a hit first', { ok: false });
            else deps.addMine('grooves', makeMyGroove(c.sec.groove, c.lib));
          } else if (key === '__remove') { const g = myGroove(c); if (g) remove('drums', 'grooves', g.id); }
        },
      },
      grooveBars: {
        label: 'Length',
        value: () => plural(ctx().sec.groove.bars, 'bar'),
        menu: () => ({ nodes: [choices([1, 2, 4, 8].map((n) => ({ key: String(n), sym: String(n), name: n === 1 ? 'bar' : 'bars', on: n === ctx().sec.groove.bars })))] }),
        pick: (key) => {
          const { sec, meter } = ctx();
          const n = Number(key);
          if (n !== sec.groove.bars) deps.setGroove(resizeGroove(sec.groove, meter, n));
        },
      },
    },
  });

  // ---------- Strum ----------

  const strumMatch = ({ lib, sec, meter }) => findStrum(lib, sec.strum, meter);

  const strum = createFieldBar({
    box: root.querySelector('[data-lane="strum"]'),
    menuEl: root.querySelector('[data-lane="strum"] .field-menu'),
    onClose: () => { if (armed === 'strum') disarm(); },
    fields: {
      strum: {
        label: 'Strum',
        value: () => strumGlyphs(ctx().sec.strum.pattern),
        said: () => { const c = ctx(); return `Strum: ${strumMatch(c) ? strumGlyphs(c.sec.strum.pattern) : 'custom'}`; },
        locked: () => ctx().locks.strum,
        menu: () => {
          const c = ctx();
          const match = strumMatch(c);
          const item = (s) => menuItem(s.id, { sym: strumGlyphs(s.pattern), on: s === match, label: strumGlyphs(s.pattern) });
          const mine = match && isMine(match.id);
          const lib = mine
            ? removeItem('strum', 'My strums')
            : menuItem('__add', { act: true, iconName: 'plus', name: 'Add to library', disabled: !!match });
          return {
            wide: true,
            nodes: [
              menuList([
                { label: `Library · ${c.meter}`, items: c.lib.builtInStrums.filter((s) => s.meter === c.meter).map(item) },
                { label: 'My strums', items: c.lib.myStrums.filter((s) => s.meter === c.meter).map(item) },
              ]),
              actions('strum', 'strum', { startOver: startOverStrum(c.lib, c.sec.strum, c.meter), extra: [lib] }),
            ],
          };
        },
        pick: (id) => { const s = ctx().lib.strumById.get(id); if (s) deps.setStrum(strumFrom(s)); },
        act: (key) => {
          const c = ctx();
          if (key === '__lock') toggleLock('strum');
          else if (key === '__roll') reroll('strum');
          else if (key === '__reset') { const from = startOverStrum(c.lib, c.sec.strum, c.meter); if (from) deps.setStrum(strumFrom(from)); }
          else if (key === '__add') {
            if (!hasStroke(c.sec.strum)) deps.toast('Add a stroke first', { ok: false });
            else deps.addMyStrum(makeMyStrum(c.sec.strum, c.meter));
          } else if (key === '__remove') { const m = strumMatch(c); if (m && isMine(m.id)) remove('strum', 'strums', m.id); }
        },
      },
      strumBars: {
        label: 'Length',
        value: () => plural(ctx().sec.strum.bars, 'bar'),
        menu: () => ({ nodes: [choices([1, 2].map((n) => ({ key: String(n), sym: String(n), name: n === 1 ? 'bar' : 'bars', on: n === ctx().sec.strum.bars })))] }),
        pick: (key) => {
          const { sec, meter } = ctx();
          const n = Number(key);
          if (n !== sec.strum.bars) deps.setStrum(resizeStrum(sec.strum, meter, { bars: n }).strum);
        },
      },
      strumRes: {
        label: 'Steps',
        value: () => `${ctx().sec.strum.res}ths`,
        menu: () => ({ nodes: [choices([8, 16].map((n) => ({ key: String(n), sym: `${n}ths`, on: n === ctx().sec.strum.res })))] }),
        pick: (key) => {
          const { sec, meter } = ctx();
          const res = Number(key);
          if (res === sec.strum.res) return;
          const { strum: next, dropped } = resizeStrum(sec.strum, meter, { res });
          deps.setStrum(next);
          if (dropped) deps.toast(`Dropped ${plural(dropped, 'stroke')} between 8ths`, { ok: false });
        },
      },
    },
  });

  // ---------- Chords ----------

  const chords = createFieldBar({
    box: root.querySelector('[data-lane="chords"]'),
    menuEl: root.querySelector('[data-lane="chords"] .field-menu'),
    onClose: () => { if (armed === 'chords') disarm(); },
    fields: {
      chords: {
        label: 'Chords',
        value: () => { const c = ctx(); const p = progressionPick(c.lib, c.sec.progression); return p.id ?? p.placeholder; },
        locked: () => ctx().locks.chords,
        // The library entries in the key's mode; while Bars or Count is
        // locked, only those that fit; and only those whose chord changes
        // land on the meter's grid (step 24). Built-ins first, then My progressions.
        menu: () => {
          const c = ctx();
          const pick = progressionPick(c.lib, c.sec.progression);
          const held = lockedShape(c.idea, c.locks);
          const shown = (p) => p.id === pick.id || (p.mode === c.idea.key.mode && fitsShape(p, held) && fitsMeter(p, c.meter));
          const item = (p) => menuItem(p.id, { sym: p.id, name: chartText(p.chords, p.bars, c.meter), on: p.id === pick.id });
          const mine = myProgression(c.lib, c.sec.progression);
          return {
            wide: true,
            nodes: [
              menuList([
                { label: `Library · ${MODES[c.idea.key.mode].label}`, items: c.lib.builtInProgressions.filter(shown).map(item) },
                { label: 'My progressions', items: c.lib.myProgressions.filter(shown).map(item) },
              ]),
              actions('chords', 'progression', {
                startOver: startOverFrom(c.lib, c.sec.progression),
                extra: [importItem('progression'), addOrRemove('chords', 'My progressions', mine, pick.id)],
              }),
            ],
          };
        },
        pick: (id) => { const p = ctx().lib.progressionById.get(id); if (p) deps.setProgression(progressionFrom(p)); },
        act: (key, field) => {
          const c = ctx();
          if (key === '__lock') toggleLock('chords');
          else if (key === '__roll') reroll('chords');
          else if (key === '__reset') { const from = startOverFrom(c.lib, c.sec.progression); if (from) deps.setProgression(progressionFrom(from)); }
          else if (key === '__import') { chords.close(); deps.openImport('progression', field); }
          else if (key === '__add') { if (!findProgression(c.lib, c.sec.progression)) deps.addMine('progressions', makeMyProgression(c.sec.progression, c.lib)); }
          else if (key === '__remove') { const p = myProgression(c.lib, c.sec.progression); if (p) remove('chords', 'progressions', p.id); }
        },
      },
      // Bars and Count are read from the progression (SPEC §1).
      bars: {
        label: 'Bars',
        value: () => String(shapeOf(ctx().sec.progression).bars),
        locked: () => ctx().locks.bars,
        menu: () => {
          const { bars } = shapeOf(ctx().sec.progression);
          return { nodes: [choices([2, 4, 8].map((n) => ({ key: String(n), sym: String(n), on: n === bars }))), lockOnly('bars', 'bars')] };
        },
        pick: (key) => deps.setShape({ bars: Number(key) }),
        act: () => toggleLock('bars'),
      },
      // A link can hold a count the bars don't offer; it's listed so the menu still shows it.
      count: {
        label: 'Count',
        value: () => String(shapeOf(ctx().sec.progression).count),
        said: () => `Chord count: ${shapeOf(ctx().sec.progression).count}`,
        locked: () => ctx().locks.count,
        menu: () => {
          const { bars, count } = shapeOf(ctx().sec.progression);
          const counts = chordCounts(bars);
          if (!counts.includes(count)) counts.push(count), counts.sort((a, b) => a - b);
          return { nodes: [choices(counts.map((n) => ({ key: String(n), sym: String(n), on: n === count }))), lockOnly('count', 'chord count')] };
        },
        pick: (key) => deps.setShape({ count: Number(key) }),
        act: () => toggleLock('count'),
      },
      color: {
        label: 'Colour',
        value: () => COLOURS[ctx().sec.color.level] ?? COLOURS[0],
        said: () => `Chord colour: ${COLOURS[ctx().sec.color.level] ?? COLOURS[0]}`,
        locked: () => ctx().locks.color,
        menu: () => {
          const { level } = ctx().sec.color;
          return { nodes: [choices(COLOURS.map((s, i) => ({ key: String(i), sym: s, on: i === level }))), lockOnly('color', 'chord colour', true)] };
        },
        pick: (key) => deps.setColour(Number(key)),
        act: (key) => (key === '__lock' ? toggleLock('color') : reroll('color')),
      },
    },
  });

  const bars = { drums, strum, chords };

  function render() {
    for (const bar of Object.values(bars)) bar.render();
  }

  // The field to focus after a row import: the row's main field.
  const mainField = (kind) => (kind === 'groove' ? drums.field('groove') : chords.field('chords'));

  return { render, mainField };
}
