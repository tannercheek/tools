// Song Seed — UI wiring. Pure logic lives in theory/loop/randomize/idea/display.js.
import { LIB, withMine } from './library.js';
import { MODES, scaleNotes, nameInKey, circleOfFifths } from './theory.js';
import { compileLoop } from './loop.js';
import { drumsMidi, chordsMidi } from './export.js';
import { LAYERS, SHAPE_LAYERS, rollAll, rollLayer, withMeter, withShape, shapeOf } from './randomize.js';
import {
  blankIdea, validateIdea, encodeIdea, decodeIdea, ideaTitle, sectionOf, withSection, withProgression, keyName,
} from './idea.js';
import { pretty, prettyChord, degreeLabel, modeTitle, fingerprint, circleKey } from './display.js';
import { createEngine } from './audio.js';
import { createTimeline } from './timeline.js';
import { createStrumLane } from './strum-lane.js';
import { createChordLane } from './chord-lane.js';
import { createDrumLane } from './drum-lane.js';
import { droppedOnMeter } from './progression-editor.js';
import { cleanMyStrums, addMyStrum, removeMyStrum } from './strum-editor.js';
import { cleanMine, addMine, removeMine, LIST_OF, addedText, pickImported } from './my-library.js';
import { createImportPanel } from './import-panel.js';
import { createSettingsBar } from './settings-bar.js';
import { createLaneBars } from './lane-bars.js';
import { ICONS, paintIcons } from './icons.js';

const TOOL_ID = 'song-seed';
const KEYS = { last: `${TOOL_ID}:last`, locks: `${TOOL_ID}:locks`, prefs: `${TOOL_ID}:prefs` };
const OLD_KEYS = [`${TOOL_ID}:strum-draft`]; // step 12's editor draft, no longer read
const HISTORY_MAX = 50;
const DELETE_ARM_MS = 3000;
const SVG_NS = 'http://www.w3.org/2000/svg';

const $ = (sel) => document.querySelector(sel);
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const local = {
  get(k, fallback) {
    try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage full or blocked */ } },
  remove(k) { try { localStorage.removeItem(k); } catch { /* blocked */ } },
};

// The built-in library plus My strums, grooves and progressions, once they
// load from the synced store.
let lib = LIB;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

const state = {
  idea: null,
  loop: null,
  past: [],
  future: [],
  locks: { ...Object.fromEntries([...LAYERS, ...SHAPE_LAYERS].map((l) => [l, false])), ...local.get(KEYS.locks, {}) },
  prefs: { sound: 'guitar', muteDrums: false, muteChords: false, grid: 8, ...local.get(KEYS.prefs, {}) },
  favorites: [],
  mine: { strums: [], grooves: [], progressions: [] }, // synced, like favourites
  store: null,
  currentChord: -1,
};

const engine = createEngine({
  getState: () => ({
    loop: state.loop,
    tempo: state.idea.tempo,
    swing: state.idea.feel.swing,
    sound: state.prefs.sound,
    muteDrums: state.prefs.muteDrums,
    muteChords: state.prefs.muteChords,
  }),
});

const timeline = createTimeline({ scroller: $('#tlScroll'), grid: $('#tl') });

// The timeline lanes a lock marks (DESIGN §5.10): Drums owns the three drum lanes.
const lockedLanes = () => ({ chords: !!state.locks.chords, strum: !!state.locks.strum, drums: !!state.locks.groove });

// The timeline's grid (the Grid control): 8ths or 16ths as set, but 16ths
// while anything sits on a 16th.
const gridRes = () => (state.prefs.grid === 16 || state.loop.usesSixteenths ? 16 : 8);

// Chords are edited in the Loop (PLAN step 20): each pick or drag is a new idea.
const chordLane = createChordLane({
  grid: $('#tl'),
  box: $('.loop'),
  menuEl: $('#chordMenu'),
  getContext: () => ({ idea: state.idea, loop: state.loop, prog: sectionOf(state.idea).progression, res: gridRes() }),
  setProgression: (progression) => setIdea(withProgression(state.idea, progression)),
  play: (i) => { if (state.loop.chords[i]) engine.preview(state.loop.chords[i], state.prefs.sound); },
});

// So are drum hits (PLAN step 21). Hits go on the grid the timeline shows, so
// an edit made on 16ths keeps the grid there once the last 16th goes.
const drumLane = createDrumLane({
  grid: $('#tl'),
  box: $('.loop'),
  menuEl: $('#drumMenu'),
  getContext: () => ({ loop: state.loop, groove: sectionOf(state.idea).groove, res: gridRes() }),
  setGroove: (groove) => {
    if (gridRes() === 16 && state.prefs.grid !== 16) { state.prefs.grid = 16; savePrefs(); }
    setIdea(withSection(state.idea, { groove }));
  },
});

// And strokes (PLAN step 22), on the strum's own grid whatever the Grid shows.
const strumLane = createStrumLane({
  grid: $('#tl'),
  box: $('.loop'),
  menuEl: $('#strumMenu'),
  getContext: () => ({ strum: sectionOf(state.idea).strum }),
  setStrum: (strum) => setIdea(withSection(state.idea, { strum })),
});

const compile = (idea) => compileLoop(idea, lib);

// The settings toolbar (PLAN step 26): Key, Mode, Tempo, Meter and Feel.
const settingsBar = createSettingsBar({
  box: $('.strip'),
  menuEl: $('#stripMenu'),
  getContext: () => ({ idea: state.idea, locks: state.locks, groove: sectionOf(state.idea).groove }),
  set: setSetting,
  setTempo,
  toggleLock,
  reroll: (layer) => rollOne(layer),
});

// The Drums, Strum and Chords rows (PLAN step 27): field bars, like the toolbar.
const laneBars = createLaneBars($('.lanes'), {
  getContext: () => ({ idea: state.idea, lib, locks: state.locks }),
  setGroove: (groove) => setIdea(withSection(state.idea, { groove })),
  setStrum: (strum) => setIdea(withSection(state.idea, { strum })),
  setProgression: (progression) => setIdea(withProgression(state.idea, progression)),
  // Bars and Count by hand roll a new progression with that value fixed;
  // a locked Progression blocks them (SPEC §1).
  setShape: (change) => {
    const now = shapeOf(sectionOf(state.idea).progression);
    if (Object.entries(change).every(([k, v]) => now[k] === v) || shapeHeld()) return;
    setIdea(withShape(state.idea, change, lib));
  },
  setColour: (level) => {
    const sec = sectionOf(state.idea);
    if (level !== sec.color.level) setIdea(withSection(state.idea, { color: { ...sec.color, level } }));
  },
  toggleLock,
  reroll: (layer) => rollOne(layer),
  openImport: (kind, opener) => importPanel.open(kind, opener),
  removeMine: (list, id) => {
    setMine(list, list === 'strums' ? removeMyStrum(state.mine.strums, id) : removeMine(state.mine[list], id));
    toast('Removed');
  },
  addMyStrum: (entry) => { setMine('strums', addMyStrum(state.mine.strums, entry)); toast('Added to My strums'); },
  // An edited groove or progression from the Loop (PLAN step 24).
  addMine: (list, entry) => { setMine(list, addMine(state.mine[list], entry, lib, list)); toast(`Added to My ${list}`); },
  toast,
});

// Import MIDI (PLAN step 18): the dialog reads and reviews the files, and
// hands over the ones to add.
const importPanel = createImportPanel({ getLib: () => lib, onAdd: addImported, pageOpener: $('#importMidi') });

// tokens.css sets --motion to 0 under reduced motion and zeroes the durations.
const motion = { reduced: false, slowMs: 0, toastMs: 0 };
function readMotion() {
  const css = getComputedStyle(document.documentElement);
  motion.reduced = css.getPropertyValue('--motion').trim() === '0';
  motion.slowMs = parseFloat(css.getPropertyValue('--dur-slow')) || 0;
  motion.toastMs = parseFloat(css.getPropertyValue('--toast-hold')) || 0;
}

// ---------- state changes ----------

function setIdea(next, { record = true } = {}) {
  if (record && state.idea) {
    state.past.push(state.idea);
    if (state.past.length > HISTORY_MAX) state.past.shift();
    state.future = [];
  }
  state.idea = next;
  state.loop = compile(next);
  local.set(KEYS.last, next);
  updateHash();
  render();
}

// Keep the address bar shareable. Debounced: Safari limits replaceState calls.
let hashTimer;
function updateHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => history.replaceState(null, '', `#i=${encodeIdea(state.idea)}`), 250);
}

const rollEverything = () => setIdeaNoting(rollAll(state.idea, state.locks, lib));
function rollOne(layer) {
  if (layer === 'meter' && meterHeld()) return;
  if (SHAPE_LAYERS.includes(layer) && shapeHeld()) return;
  setIdeaNoting(rollLayer(state.idea, layer, lib, state.locks));
}

// setIdea(), saying so if a meter change kept the progression but had to
// merge chords that missed the new grid (SPEC §1, Meter).
function setIdeaNoting(next) {
  const dropped = droppedOnMeter(sectionOf(state.idea).progression, next.meter, sectionOf(next).progression);
  setIdea(next);
  if (dropped) toast(`Dropped ${plural(dropped, 'chord')}`, { ok: false });
}

// A pick in the settings toolbar.
function setSetting(field, value) {
  const { idea } = state;
  if (field === 'tonic' && value !== idea.key.tonic) setIdea({ ...idea, key: { ...idea.key, tonic: value } });
  else if (field === 'mode' && value !== idea.key.mode) setIdea({ ...idea, key: { ...idea.key, mode: value } });
  else if (field === 'feel' && value !== idea.feel.type) {
    setIdea({ ...idea, feel: value === 'swing' ? { type: 'swing', swing: 0.55 } : { type: 'straight', swing: 0 } });
  } else if (field === 'meter' && value !== idea.meter && !meterHeld()) {
    setIdeaNoting(withMeter(idea, value, lib, state.locks));
  }
}

// Tempo: one history entry per drag, key hold or typed value, not one per
// step. commit ends the entry.
let tempoDirty = false;
function setTempo(t, { commit = true } = {}) {
  if (Number.isFinite(t) && t >= 40 && t <= 220 && t !== state.idea.tempo) {
    if (!tempoDirty) {
      state.past.push(state.idea);
      if (state.past.length > HISTORY_MAX) state.past.shift();
      state.future = [];
      tempoDirty = true;
    }
    setIdea({ ...state.idea, tempo: t }, { record: false });
  }
  if (commit) tempoDirty = false;
}

function toggleLock(layer) {
  state.locks[layer] = !state.locks[layer];
  local.set(KEYS.locks, state.locks);
  renderLayers();
}

// A locked groove or strum is written in the current meter, so it blocks a
// meter change. Says why in a toast.
function meterHeld() {
  const by = state.locks.groove ? 'Drums are' : state.locks.strum ? 'Strum is' : null;
  if (by) toast(`${by} locked in ${state.idea.meter}`, { ok: false });
  return !!by;
}

// A locked Progression fixes Bars and Chords. Says why in a toast.
function shapeHeld() {
  if (state.locks.chords) toast('Progression is locked', { ok: false });
  return !!state.locks.chords;
}

function goBack() {
  if (!state.past.length) return;
  state.future.push(state.idea);
  setIdea(state.past.pop(), { record: false });
}
function goForward() {
  if (!state.future.length) return;
  state.past.push(state.idea);
  setIdea(state.future.pop(), { record: false });
}

// Load an idea from a link/favourite/storage, re-rolling only broken layers.
function loadIdea(raw, { record = true } = {}) {
  const v = validateIdea(raw, lib);
  if (!v) return false;
  let idea = v.idea;
  if (v.missing.length) {
    const keep = Object.fromEntries(LAYERS.map((l) => [l, !v.missing.includes(l)]));
    idea = rollAll(idea, keep, lib);
  }
  setIdea(idea, { record });
  return true;
}

function savePrefs() { local.set(KEYS.prefs, state.prefs); }

// ---------- rendering ----------

function render() {
  renderLayers();
  renderLoop();
  renderMelody();
  renderTransport();
}

// The settings toolbar and the lane rows, and which timeline lanes show locked.
function renderLayers() {
  settingsBar.render();
  laneBars.render();
  timeline.setLocked(lockedLanes());
}

function setPressed(groupSel, value) {
  document.querySelectorAll(`${groupSel} button`).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === value)));
}
function renderLoop() {
  const { idea, loop } = state;
  const feel = idea.feel.type === 'swing' ? 'Swing' : 'Straight';
  $('#loopMeta').textContent = `${plural(loop.bars, 'bar')} · ${idea.meter} · ${idea.tempo} BPM · ${feel}`;
  const res = gridRes();
  setPressed('#grid', String(res));
  const eighths = $('#grid [data-value="8"]');
  eighths.disabled = loop.usesSixteenths;
  // A disabled button gets no hover, so the group carries its title too.
  for (const node of [eighths, $('#grid')]) node.title = loop.usesSixteenths ? 'Hits on 16ths' : '';
  timeline.render(loop, res, lockedLanes());
  chordLane.render();
  drumLane.render();
  strumLane.render();
  state.currentChord = -1;
}

function renderMelody() {
  const { idea, loop } = state;
  const { tonic, mode: modeKey } = idea.key;
  const colour = MODES[modeKey].colour;
  const notes = scaleNotes(tonic, modeKey);
  $('#scale').replaceChildren(...notes.map((n, i) => {
    const li = el('li', colour === i + 1 ? 'tile is-colour' : 'tile');
    li.append(el('span', 'note', prettyChord(n)), el('span', 'deg', degreeLabel(modeKey, i)));
    return li;
  }));
  const hint = $('#colourHint');
  hint.hidden = !colour;
  if (colour) {
    hint.textContent = `Ringed: ${prettyChord(notes[colour - 1])}, the ${degreeLabel(modeKey, colour - 1)}, the colour note of ${modeTitle(modeKey)}`;
  }

  $('#tones').replaceChildren(...loop.chords.map((ch, i) => {
    const li = el('li', 'tone');
    li.dataset.index = i;
    const names = ch.pcs.map((pc) => prettyChord(nameInKey(pc, tonic, modeKey))).join(' ');
    li.append(el('span', 'sym', prettyChord(ch.symbol)), el('span', 'notes', names), el('span', 'tag-mini', 'Now'));
    return li;
  }));
  renderCircle();
}

// Circle of fifths (DESIGN §5.11). Sizes come from the --circle-* tokens; the
// viewBox is --circle-size wide, so 1 unit = 1px until the svg scales down.
const circleSize = { size: 0, noteR: 0, tonicRing: 0, dot: 0, dotNow: 0, colourRing: 0, colourDot: 0, swatch: 0 };
function readCircleSizes() {
  const css = getComputedStyle(document.documentElement);
  const px = (name) => parseFloat(css.getPropertyValue(name)) || 0;
  Object.assign(circleSize, {
    size: px('--circle-size'), noteR: px('--circle-note-r'), tonicRing: px('--circle-tonic-ring'),
    dot: px('--circle-dot'), dotNow: px('--circle-dot-now'),
    colourRing: px('--colour-ring'), colourDot: px('--colour-dot'), swatch: px('--cof-key-swatch'),
  });
}

function renderCircle() {
  const { idea, loop } = state;
  const { tonic, mode: modeKey } = idea.key;
  const { size, noteR, tonicRing, dot, dotNow, colourRing, colourDot } = circleSize;
  const entries = circleOfFifths(tonic, modeKey, loop.chords);
  const half = size / 2;
  // Outward from the centre: note, then its chord dot, which can grow to the edge.
  const dotAt = half - dotNow / 2;
  const ring = dotAt - dotNow / 2 - tonicRing - noteR;
  const at = (i, r) => {
    const a = (i * Math.PI) / 6; // clockwise from the top
    return [half + r * Math.sin(a), half - r * Math.cos(a)];
  };

  const roots = [...new Set(loop.chords.map((ch) => entries.find((e) => e.pc === ch.rootPc).name))];
  const svg = svgNode('svg', {
    class: 'cof', viewBox: `0 0 ${size} ${size}`, role: 'img',
    'aria-label': `Circle of fifths: ${pretty(keyName(idea))}, scale notes ${pretty(scaleNotes(tonic, modeKey).join(' '))}, `
      + `chords on ${pretty(roots.join(' '))}`,
  });
  svg.append(svgNode('circle', { class: 'cof-ring', cx: half, cy: half, r: ring }));
  entries.forEach((e, i) => {
    const [x, y] = at(i, ring);
    const g = svgNode('g', { class: ['cof-note', e.inScale && 'in-scale', e.isTonic && 'is-tonic'].filter(Boolean).join(' ') });
    g.append(svgNode('circle', { class: 'cof-disc', cx: x, cy: y, r: noteR }));
    if (e.isColour) {
      const off = noteR * Math.SQRT1_2; // top-right, as on the scale tile
      g.append(
        svgNode('circle', { class: 'cof-colour-ring', cx: x, cy: y, r: noteR - colourRing / 2 }),
        svgNode('circle', { class: 'cof-colour-dot', cx: x + off, cy: y - off, r: colourDot / 2 }),
      );
    }
    const name = svgNode('text', { class: 'cof-name', x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    name.textContent = prettyChord(e.name);
    g.append(name);
    if (e.chordIdx.length) {
      g.dataset.chords = e.chordIdx.join(' ');
      const [dx, dy] = at(i, dotAt);
      g.append(svgNode('circle', { class: 'cof-dot', cx: dx, cy: dy, r: dot / 2 }));
    }
    svg.append(g);
  });
  $('#circle').replaceChildren(svg, circleKeyList(tonic, modeKey));
}

// The key under the circle (step 28, DESIGN §5.11): each line's swatch is the
// circle's own mark, drawn with the same classes, so it matches in both themes.
function circleKeyList(tonic, modeKey) {
  const { swatch: s, tonicRing, dot, colourRing, colourDot } = circleSize;
  const half = s / 2;
  const r = half - colourDot / 2; // room for the colour dot inside the swatch
  const disc = (cls) => {
    const g = svgNode('g', { class: cls });
    g.append(svgNode('circle', { class: 'cof-disc', cx: half, cy: half, r: cls.includes('is-tonic') ? r - tonicRing / 2 : r }));
    return g;
  };
  const marks = {
    tonic: () => [disc('cof-note in-scale is-tonic')],
    scale: () => [disc('cof-note in-scale')],
    colour: () => {
      const off = r * Math.SQRT1_2;
      return [
        disc('cof-note in-scale'),
        svgNode('circle', { class: 'cof-colour-ring', cx: half, cy: half, r: r - colourRing / 2 }),
        svgNode('circle', { class: 'cof-colour-dot', cx: half + off, cy: half - off, r: colourDot / 2 }),
      ];
    },
    root: () => [svgNode('circle', { class: 'cof-dot', cx: half, cy: half, r: dot / 2 })],
  };
  const list = el('ul', 'cof-key');
  list.setAttribute('aria-label', 'Circle of fifths key');
  for (const { mark, text } of circleKey(tonic, modeKey)) {
    const svg = svgNode('svg', { class: 'cof-swatch', viewBox: `0 0 ${s} ${s}`, 'aria-hidden': 'true', focusable: 'false' });
    svg.append(...marks[mark]());
    const li = el('li', 'cof-key-line');
    li.append(svg, el('span', null, text));
    list.append(li);
  }
  return list;
}

function renderTransport() {
  const playing = engine.playing;
  const play = $('#play');
  play.setAttribute('aria-pressed', String(playing));
  play.setAttribute('aria-label', playing ? 'Stop' : 'Play');
  play.querySelector('[data-icon]').innerHTML = playing ? ICONS.stop : ICONS.play;
  play.querySelector('.btn-label').textContent = playing ? 'Stop' : 'Play';
  $('#back').disabled = !state.past.length;
  $('#fwd').disabled = !state.future.length;
  for (const [id, key] of [['#muteDrums', 'muteDrums'], ['#muteChords', 'muteChords']]) {
    const on = !state.prefs[key];
    $(id).setAttribute('aria-pressed', String(on));
    $(id).querySelector('[data-icon]').innerHTML = on ? ICONS.speaker : ICONS.speakerOff;
  }
  setPressed('#sound', state.prefs.sound);
  timeline.setPlaying(playing);
}

// Playhead and current chord, every animation frame while playing.
function frame(now) {
  const pos = engine.position();
  if (pos != null) {
    timeline.update(pos, now, motion);
    const idx = state.loop.chordIndexAt[Math.floor(pos % state.loop.totalSteps)];
    if (idx !== state.currentChord) markCurrent(idx);
  }
  requestAnimationFrame(frame);
}

function markCurrent(idx) {
  state.currentChord = idx;
  document.querySelectorAll('.tl-chord, .tone').forEach((node) => {
    node.classList.toggle('is-current', Number(node.dataset.index) === idx);
  });
  document.querySelectorAll('.cof-note[data-chords]').forEach((node) => {
    const on = node.dataset.chords.split(' ').includes(String(idx));
    node.classList.toggle('is-current', on);
    node.querySelector('.cof-dot').setAttribute('r', (on ? circleSize.dotNow : circleSize.dot) / 2);
  });
}

// ---------- favourites (synced through shared/persist.js) ----------

// persist.js reports 'synced', 'saved-locally' (a write is on its way) or 'offline'
// (no connection, or the passphrase was refused or dismissed).
const SYNC_STATE = { synced: 'synced', 'saved-locally': 'syncing', offline: 'local' };
const SYNC_TEXT = { synced: 'Synced', syncing: 'Syncing…', local: 'This device' };

async function initStore() {
  try {
    const { syncedState } = await import('../../../shared/persist.js');
    const store = await syncedState(TOOL_ID);
    return {
      get: (k) => store.get(k),
      set: (k, v) => store.set(k, v),
      onStatus: (fn) => store.onStatus((s) => fn(SYNC_STATE[s] || 'local')),
    };
  } catch {
    return {
      get: (k) => local.get(`${TOOL_ID}:${k}`, null),
      set: (k, v) => local.set(`${TOOL_ID}:${k}`, v),
      onStatus: (fn) => fn('local'),
    };
  }
}

function showSync(syncState) {
  $('#sync').dataset.state = syncState;
  $('#syncText').textContent = SYNC_TEXT[syncState];
}

// My strums, grooves and progressions share the synced doc with favourites,
// and join the library so the selects and rolls see them. key is the store
// key: 'strums', 'grooves' or 'progressions'.
function setMine(key, list) {
  state.mine[key] = list;
  lib = withMine(lib, { [key]: list });
  renderLayers();
  writeMine(key);
}

async function writeMine(key) {
  try {
    await state.store.set(key, state.mine[key]);
  } catch {
    toast('Couldn’t save. Try again.', { ok: false });
  }
}

// Import MIDI's Add: saves to My grooves and My progressions. After a row
// import (kind set), the first file added becomes the current pick, in one
// setIdea() (one undo step), unless a lock stands in the way. Returns what
// to focus once the dialog closes: that row's main field, or null for the link.
function addImported(items, kind) {
  const addedAt = new Date().toISOString();
  for (const k of Object.keys(LIST_OF)) {
    const key = LIST_OF[k];
    const entries = items.filter((i) => i.kind === k).map((i) => ({ ...i.entry, addedAt }));
    // In reverse, so the batch keeps its order at the top (newest first).
    if (entries.length) setMine(key, entries.reduceRight((mine, e) => addMine(mine, e, lib, key), state.mine[key]));
  }
  if (!kind) { toast(addedText(items)); return null; }
  const picked = pickImported(state.idea, lib, items[0], kind, state.locks);
  if (picked.reason) { toast(picked.reason, { ok: false }); return null; }
  setIdea(picked.idea);
  toast(addedText(items));
  return laneBars.mainField(kind);
}

async function writeFavorites() {
  try {
    await state.store.set('favorites', state.favorites);
  } catch {
    toast('Couldn’t save. Try again.', { ok: false });
  }
}

function saveFavorite() {
  const json = JSON.stringify(state.idea);
  if (state.favorites.some((f) => JSON.stringify(f.idea) === json)) { toast('Already saved', { ok: false }); return; }
  state.favorites.unshift({
    id: `fav-${Date.now().toString(36)}`,
    name: ideaTitle(state.idea, lib),
    savedAt: new Date().toISOString(),
    idea: state.idea,
  });
  renderFavorites();
  writeFavorites();
  toast('Saved');
}

function svgNode(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Drums along the bottom, chord roots across the top (DESIGN §5.13).
function fingerprintSvg(idea) {
  const svg = svgNode('svg', { class: 'fp', viewBox: '0 0 64 32', 'aria-hidden': 'true', focusable: 'false' });
  const fp = fingerprint(idea, lib);
  if (fp) {
    svg.append(...fp.hits.map((h) => svgNode('path', { class: `fp-${h.kind}`, d: h.d })));
    svg.append(svgNode('path', { class: 'fp-chords', d: fp.chords }));
  }
  return svg;
}

function shortDate(iso) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderFavorites() {
  disarm();
  const list = $('#favs');
  list.replaceChildren(...state.favorites.map((f) => {
    const li = el('li', 'fav');
    li.dataset.id = f.id;
    const name = pretty(f.name);
    const load = el('button', 'fav-load');
    load.type = 'button';
    const text = el('span', 'fav-text');
    text.append(el('span', 'fav-name', name), el('span', 'fav-date', shortDate(f.savedAt)));
    load.append(fingerprintSvg(f.idea), text);
    const del = el('button', 'icon-btn fav-del');
    del.type = 'button';
    del.dataset.label = `Delete ${name}`;
    del.dataset.armedText = 'Tap to delete';
    setArmed(del, false);
    li.append(load, del);
    return li;
  }));
  const n = state.favorites.length;
  $('#favsEmpty').hidden = n > 0;
  $('#favCount').textContent = n ? plural(n, 'idea') : '';
}

// Two-tap delete in Saved: the first tap turns the trash button into "Tap to
// delete". It reverts after 3s, on Escape, or when a tap or focus goes
// elsewhere. Only one button is armed at a time. (The lane rows' Remove has
// its own, in lane-bars.js.)
let armed = null;
let armTimer;

// data-label names the action, and data-armed-text is the pill's text.
function setArmed(btn, on) {
  btn.classList.toggle('is-armed', on);
  btn.innerHTML = ICONS.trash;
  const text = on ? btn.dataset.armedText : btn.dataset.text;
  if (text) btn.append(el('span', on ? '' : 'text-link-label', text));
  btn.setAttribute('aria-label', on ? btn.dataset.armedText : btn.dataset.label);
}

function arm(btn) {
  disarm();
  armed = btn;
  setArmed(btn, true);
  armTimer = setTimeout(disarm, DELETE_ARM_MS);
}

function disarm() {
  clearTimeout(armTimer);
  if (armed?.isConnected) setArmed(armed, false);
  armed = null;
}

function onFavClick(e) {
  const li = e.target.closest('li[data-id]');
  if (!li) return;
  const fav = state.favorites.find((f) => f.id === li.dataset.id);
  if (!fav) return;
  if (e.target.closest('.fav-load')) {
    if (loadIdea(fav.idea)) toast(`Loaded ${pretty(keyName(state.idea))}`);
    return;
  }
  const del = e.target.closest('.fav-del');
  if (!del) return;
  if (armed !== del) { arm(del); return; }
  const hadFocus = document.activeElement === del;
  const next = li.nextElementSibling || li.previousElementSibling;
  state.favorites = state.favorites.filter((f) => f.id !== fav.id);
  renderFavorites();
  writeFavorites();
  toast('Deleted');
  if (hadFocus) ((next && $(`li[data-id="${CSS.escape(next.dataset.id)}"] .fav-load`)) || $('#save')).focus();
}

// ---------- misc ----------

let toastTimer;
function toast(msg, { ok = true } = {}) {
  const box = $('#toast');
  box.innerHTML = ok ? ICONS.check : '';
  box.append(el('span', '', msg));
  box.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => box.classList.remove('is-on'), motion.toastMs);
}

async function togglePlay() {
  if (engine.playing) {
    engine.stop();
    markCurrent(-1);
  } else {
    await engine.start();
    engine.setMute('drums', state.prefs.muteDrums);
    engine.setMute('chords', state.prefs.muteChords);
  }
  renderTransport();
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href);
    toast('Link copied');
  } catch {
    toast('Couldn’t copy. The link is in the address bar.', { ok: false });
  }
}

// Save bytes as a file: a Blob behind a temporary link.
function download(filename, bytes, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function exportMidi(build) {
  const { filename, bytes } = build(state.idea, state.loop);
  download(filename, bytes, 'audio/midi');
}

// ---------- wiring ----------

function wire() {
  paintIcons();

  $('#play').addEventListener('click', togglePlay);
  $('#rollAll').addEventListener('click', rollEverything);
  $('#back').addEventListener('click', goBack);
  $('#fwd').addEventListener('click', goForward);
  $('#save').addEventListener('click', saveFavorite);
  $('#copyLink').addEventListener('click', copyLink);
  $('#exportDrums').addEventListener('click', () => exportMidi(drumsMidi));
  $('#exportChords').addEventListener('click', () => exportMidi(chordsMidi));
  $('#importMidi').addEventListener('click', (e) => importPanel.open(null, e.currentTarget));
  $('#favs').addEventListener('click', onFavClick);
  $('#favs').addEventListener('focusout', (e) => { if (e.target === armed) disarm(); });
  document.addEventListener('pointerdown', (e) => { if (armed && !armed.contains(e.target)) disarm(); });

  $('#muteDrums').addEventListener('click', () => toggleMute('muteDrums', 'drums'));
  $('#muteChords').addEventListener('click', () => toggleMute('muteChords', 'chords'));
  $('#grid').addEventListener('click', (e) => {
    const v = Number(e.target.closest('button')?.dataset.value);
    if (!v || v === state.prefs.grid) return;
    state.prefs.grid = v;
    savePrefs();
    renderLoop();
  });
  $('#sound').addEventListener('click', (e) => {
    const v = e.target.closest('button')?.dataset.value;
    if (!v) return;
    state.prefs.sound = v;
    savePrefs();
    renderTransport();
  });

  // Space plays/stops even when a button has focus (like a DAW); Enter still
  // presses buttons. Typing in a field, and the import dialog, are left alone.
  const typing = (e) => e.target.closest('input, select, textarea, dialog');
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') disarm();
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) togglePlay();
    } else if ((e.key === 'r' || e.key === 'R') && !e.repeat) rollEverything();
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && !typing(e)) e.preventDefault();
  });

  window.addEventListener('hashchange', () => {
    const raw = readHash();
    if (raw && JSON.stringify(raw) !== JSON.stringify(state.idea)) loadIdea(raw);
  });
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', readMotion);
}

function toggleMute(key, bus) {
  state.prefs[key] = !state.prefs[key];
  engine.setMute(bus, state.prefs[key]);
  savePrefs();
  renderTransport();
}

function readHash() {
  const m = /[#&]i=([^&]+)/.exec(location.hash);
  return m ? decodeIdea(m[1]) : null;
}

async function init() {
  OLD_KEYS.forEach((k) => local.remove(k));
  readMotion();
  readCircleSizes();
  wire();
  // A shared link wins, then the last idea on this device, then a fresh roll.
  if (!loadIdea(readHash(), { record: false }) && !loadIdea(local.get(KEYS.last, null), { record: false })) {
    setIdea(rollAll(blankIdea(), {}, lib), { record: false });
  }
  requestAnimationFrame(frame);

  state.store = await initStore();
  state.store.onStatus(showSync);
  const favs = await state.store.get('favorites');
  state.favorites = Array.isArray(favs) ? favs.filter((f) => f && f.id && f.idea) : [];
  renderFavorites();
  // Until these arrive, rolls use the built-ins only.
  state.mine = {
    strums: cleanMyStrums(await state.store.get('strums')),
    grooves: cleanMine('grooves', await state.store.get('grooves')),
    progressions: cleanMine('progressions', await state.store.get('progressions')),
  };
  lib = withMine(lib, state.mine);
  renderLayers();
}

init();
