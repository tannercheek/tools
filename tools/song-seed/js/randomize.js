// Rolling layers. Every function returns a NEW idea; nothing is mutated.
// rng is injectable so tests can use a seeded generator.
import { MODES, MODE_ORDER, TONICS } from './theory.js';
import { METERS, meterInfo, patternSteps, sumBars } from './loop.js';
import { withSection, withProgression, sectionOf, grooveFrom, sameGroove } from './idea.js';
import { strumFrom, sameStrum } from './strum-editor.js';
import { snapToMeter, fitsMeter } from './progression-editor.js';

// Roll order matters: later layers read earlier ones. Meter comes first
// because grooves and strums are written in one meter.
export const LAYERS = ['meter', 'tonic', 'mode', 'feel', 'groove', 'tempo', 'chords', 'strum', 'color'];
// Bars and chord count are read from the progression, so Randomize doesn't
// roll them on their own. They still have locks and dice.
export const SHAPE_LAYERS = ['bars', 'count'];

export function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted(items, weightOf, rng) {
  const weights = items.map((it) => Math.max(0, weightOf(it)));
  const total = weights.reduce((a, b) => a + b, 0);
  if (!items.length) return undefined;
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

const randInt = (min, max, rng) => min + Math.floor(rng() * (max - min + 1));
// Rerolling should land somewhere new: the current choice is rarely re-picked.
const fresh = (isCurrent) => (isCurrent ? 0.05 : 1);

const TONIC_WEIGHT = { C: 2, D: 2, E: 2, G: 2, A: 2 };
const METER_WEIGHT = { '4/4': 8, '3/4': 1, '6/8': 1 };

// ---------- progressions ----------

// How a loop's bars are shared between chords. Duplicates act as weights.
const RHYTHMS = {
  2: [[1, 1], [1, 1], [1, 0.5, 0.5], [0.5, 0.5, 1]],
  4: [[2, 2], [1, 1, 1, 1], [1, 1, 1, 1], [1, 1, 1, 1], [2, 1, 1], [1, 1, 2], [3, 1], [1, 1, 1, 0.5, 0.5]],
  8: [[2, 2, 2, 2], [2, 2, 2, 2], [4, 4], [2, 2, 2, 1, 1], [1, 1, 1, 1, 1, 1, 1, 1]],
};
// Only used when the chord count is fixed, so every count offered has a
// rhythm without changing how often unlocked rolls land on each count.
const MORE_RHYTHMS = {
  2: [[0.5, 0.5, 0.5, 0.5]],
  4: [[1, 1, 0.5, 0.5, 0.5, 0.5], [1, 0.5, 0.5, 1, 0.5, 0.5], [1, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]],
  8: [[4, 2, 2], [2, 2, 4], [2, 1, 1, 2, 1, 1], [2, 2, 1, 1, 1, 1], [2, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 2]],
};
const LOOP_LENGTHS = [[2, 1], [4, 5], [8, 1.5]];
export const LOOP_BARS = LOOP_LENGTHS.map(([b]) => b);
const MAX_CHORDS = 8;

// Chord counts that fit a loop: 2 up to one chord per half bar, capped at 8.
export function chordCounts(bars) {
  const out = [];
  for (let n = 2; n <= Math.min(MAX_CHORDS, Math.floor(2 * bars)); n++) out.push(n);
  return out;
}

// Bars and chord count, read from a progression. Neither is stored.
export const shapeOf = (progression) => ({ bars: sumBars(progression.bars), count: progression.chords.length });

// The values locked Bars and Chords hold the next Progression roll to.
export function lockedShape(idea, locks = {}) {
  const prog = sectionOf(idea).progression;
  if (!prog) return {};
  const { bars, count } = shapeOf(prog);
  return { bars: locks.bars ? bars : undefined, count: locks.count ? count : undefined };
}

export const fitsShape = (p, { bars, count } = {}) =>
  (bars == null || sumBars(p.bars) === bars) && (count == null || p.chords.length === count);

// Drop any part of a shape the generator can't make (a link can hold odd
// lengths), so it's left free instead.
function cleanShape({ bars, count } = {}) {
  const b = LOOP_BARS.includes(bars) ? bars : undefined;
  const c = (b ? [b] : LOOP_BARS).some((l) => chordCounts(l).includes(count)) ? count : undefined;
  return { bars: b, count: c };
}

const nearest = (options, n) => options.reduce((best, o) => (Math.abs(o - n) < Math.abs(best - n) ? o : best));

// shape: optional { bars, count }; either can be fixed.
export function generateProgression(modeKey, rng = Math.random, shape = {}) {
  const mode = MODES[modeKey];
  const pool = Object.entries(mode.pool);
  const fixed = cleanShape(shape);
  const lengths = LOOP_LENGTHS.filter(([len]) => (fixed.bars == null || len === fixed.bars)
    && (fixed.count == null || chordCounts(len).includes(fixed.count)));
  const length = pickWeighted(lengths, ([, w]) => w, rng)[0];
  const rhythms = fixed.count == null ? RHYTHMS[length]
    : [...RHYTHMS[length], ...MORE_RHYTHMS[length]].filter((r) => r.length === fixed.count);
  const bars = [...pickWeighted(rhythms, () => 1, rng)];
  const n = bars.length;

  const chords = [];
  chords[0] = rng() < 0.75
    ? mode.tonic
    : pickWeighted(pool.filter(([c]) => c !== mode.tonic), ([, w]) => w, rng)[0];
  for (let i = 1; i < n; i++) {
    const last = i === n - 1;
    const options = pool.filter(([c]) => c !== chords[i - 1] && !(last && c === chords[0]));
    chords[i] = pickWeighted(options, ([c, w]) => {
      const used = chords.filter((x) => x === c).length;
      return w * 0.5 ** used * (last && c === mode.tonic ? 0.3 : 1);
    }, rng)[0];
  }

  // Make sure the mode's signature chord shows up.
  if (!chords.some((c) => mode.signature.includes(c))) {
    const sig = mode.signature[Math.floor(rng() * mode.signature.length)];
    const spots = [];
    for (let i = 1; i < n; i++) {
      if (chords[i - 1] !== sig && chords[(i + 1) % n] !== sig) spots.push(i);
    }
    if (spots.length) chords[spots[Math.floor(rng() * spots.length)]] = sig;
  }
  return { source: 'generated', mode: modeKey, chords, bars };
}

// Half library (same mode, same shape if one is fixed, chord changes on the
// meter's grid), half generated. Generated when nothing in the library fits.
function rollProgression(idea, lib, rng, shape = {}) {
  const mode = idea.key.mode;
  const fixed = cleanShape(shape);
  const current = sectionOf(idea).progression;
  const fromLib = lib.progressions.filter((p) => p.mode === mode && p.id !== current?.source
    && fitsShape(p, fixed) && fitsMeter(p, idea.meter));
  if (fromLib.length && rng() < 0.5) {
    const p = pickWeighted(fromLib, (x) => x.weight ?? 1, rng);
    return { source: p.id, mode, chords: [...p.chords], bars: [...p.bars] };
  }
  return generateProgression(mode, rng, fixed);
}

// Set Bars or Chords (by hand or with their dice): roll a new progression with
// that value fixed. The other value is kept if it still fits, otherwise the
// nearest one that does. The app blocks this while Progression is locked.
export function withShape(idea, change, lib, rng = Math.random) {
  let { bars, count } = { ...shapeOf(sectionOf(idea).progression), ...change };
  if (change.bars != null) count = nearest(chordCounts(bars), count);
  else bars = nearest(LOOP_BARS.filter((b) => chordCounts(b).includes(count)), bars);
  return withProgression(idea, rollProgression(idea, lib, rng, { bars, count }));
}

// ---------- strum ↔ groove fit ----------

// Higher = the strum sits better on the groove. Down-strums on kicks and
// snares score, up-strums on kicks and chucks off the backbeat cost, and the
// strum's density should roughly match how busy the groove is.
export function strumFit(strum, groove, meter = '4/4') {
  const { pulse } = meterInfo(meter);
  const kick = patternSteps(groove.tracks.kick || '', groove.res);
  const snare = patternSteps(groove.tracks.snare || '', groove.res);
  const cymbal = patternSteps(groove.tracks.cymbal || '', groove.res);
  const st = patternSteps(strum.pattern, strum.res);
  const at = (arr, s) => (arr.length ? arr[s % arr.length] : null);
  const len = Math.max(st.length, kick.length || 0, snare.length || 0);

  let score = 0, hits = 0, busy = 0, slots = 0;
  for (let s = 0; s < len; s += 2) {
    const k = !!at(kick, s);
    const sn = ['x', 'X'].includes(at(snare, s));
    slots++;
    if (k || sn || at(cymbal, s)) busy++;
    const c = at(st, s);
    if (!c) continue;
    hits++;
    const onBeat = s % pulse === 0;
    if (c === 'D') score += (k ? 2 : 0) + (sn ? 1.5 : 0) + (onBeat ? 0.5 : 0);
    else if (c === 'U') score += (k ? -1 : 0) + (onBeat ? 0 : 0.5);
    else if (c === 'x') score += (sn ? 2 : 0) + (k ? -1 : 0);
  }
  const avg = hits ? score / hits : 0;
  return avg - 1.5 * Math.abs(hits / slots - busy / slots);
}

export const fitLabel = (score) => (score >= 1.4 ? 'tight' : score >= 0.9 ? 'good' : 'loose');

// Built-in and My strums in the meter, scored on the groove. Returns the
// strum as the idea stores it, avoiding the current pattern (not the id, since
// an edited pattern may still carry the id it came from).
function rollStrum(idea, lib, rng) {
  const sec = sectionOf(idea);
  const meter = sec.meter || idea.meter;
  const groove = sec.groove;
  const cands = lib.strums.filter((s) => s.meter === meter);
  if (!groove) return strumFrom(cands[Math.floor(rng() * cands.length)]);
  const scored = cands
    .map((s) => ({ s, score: strumFit(s, groove, meter) }))
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.max(3, Math.ceil(scored.length / 2)));
  const floor = top[top.length - 1].score;
  return strumFrom(pickWeighted(top, (o) => (o.score - floor + 0.25) * fresh(sameStrum(o.s, sec.strum)), rng).s);
}

// ---------- layers ----------

export function rollLayer(idea, layer, lib, locks = {}, rng = Math.random) {
  const sec = sectionOf(idea);
  const meter = sec.meter || idea.meter;
  switch (layer) {
    case 'meter':
      return rollMeter(idea, lib, locks, rng, true);
    case 'tonic': {
      const tonic = pickWeighted(TONICS, (t) => (TONIC_WEIGHT[t] || 1) * fresh(t === idea.key.tonic), rng);
      return { ...idea, key: { ...idea.key, tonic } };
    }
    case 'mode': {
      // Locked chords decide the mode, so they keep sounding right.
      if (locks.chords && sec.progression) return { ...idea, key: { ...idea.key, mode: sec.progression.mode } };
      const mode = pickWeighted(MODE_ORDER, (m) => MODES[m].weight * fresh(m === idea.key.mode), rng);
      return { ...idea, key: { ...idea.key, mode } };
    }
    case 'feel': {
      const feel = rng() < 0.75 ? { type: 'straight', swing: 0 } : { type: 'swing', swing: 0.55 };
      return { ...idea, feel };
    }
    case 'groove': {
      // Avoids the current groove by content, since the idea holds the groove.
      const cands = lib.grooves.filter((g) => g.meter === meter);
      const tempoFits = (g) => idea.tempo >= g.tempo.min && idea.tempo <= g.tempo.max;
      const g = pickWeighted(cands, (c) => (locks.tempo && tempoFits(c) ? 4 : 1) * fresh(sameGroove(c, sec.groove)), rng);
      return withSection(idea, { groove: grooveFrom(g) });
    }
    case 'tempo': {
      const g = sec.groove;
      return { ...idea, tempo: g ? randInt(g.tempo.min, g.tempo.max, rng) : randInt(70, 130, rng) };
    }
    case 'chords':
      return withProgression(idea, rollProgression(idea, lib, rng, lockedShape(idea, locks)));
    case 'bars':
    case 'count':
      return rollShape(idea, layer, lib, locks, rng);
    case 'strum':
      return withSection(idea, { strum: rollStrum(idea, lib, rng) });
    case 'color': {
      const level = pickWeighted([0, 1, 2], (l) => [0.25, 0.45, 0.3][l], rng);
      return withSection(idea, { color: { level, seed: Math.floor(rng() * 1e9) } });
    }
    default:
      throw new Error(`Unknown layer: ${layer}`);
  }
}

// Bars and Chords dice: always land on a different value. A locked chord
// count limits Bars to lengths it fits; a locked Progression holds both.
function rollShape(idea, layer, lib, locks, rng) {
  if (locks.chords) return idea;
  const { bars, count } = shapeOf(sectionOf(idea).progression);
  if (layer === 'bars') {
    const opts = LOOP_BARS.filter((b) => b !== bars && (!locks.count || chordCounts(b).includes(count)));
    if (!opts.length) return idea;
    return withShape(idea, { bars: pickWeighted(opts, (b) => LOOP_LENGTHS.find(([l]) => l === b)[1], rng) }, lib, rng);
  }
  const opts = chordCounts(bars).filter((n) => n !== count);
  if (!opts.length) return idea;
  return withShape(idea, { count: opts[Math.floor(rng() * opts.length)] }, lib, rng);
}

// A locked groove or strum keeps the meter it's written in (the strum is
// always in the idea's meter). Randomize uses the plain weights (4/4 most of
// the time); the meter's own reroll avoids the current meter like any other reroll.
function rollMeter(idea, lib, locks, rng, reroll) {
  const sec = sectionOf(idea);
  const held = (locks.groove && sec.groove?.meter) || (locks.strum && sec.strum && idea.meter);
  const meter = held
    || pickWeighted(METERS, (m) => METER_WEIGHT[m] * (reroll ? fresh(m === idea.meter) : 1), rng);
  return withMeter(idea, meter, lib, locks, rng);
}

// Move the idea to another meter. A groove written in a different meter is
// rerolled, and so is the strum, whose pattern is in the old meter. The
// progression is kept, with any edge that misses the new grid moved to the
// pulse (snapToMeter). Locks aren't checked here: the meter layer keeps a
// locked groove's or strum's meter, and the app blocks a hand change.
export function withMeter(idea, meter, lib, locks = {}, rng = Math.random) {
  let next = { ...idea, meter };
  const prog = sectionOf(next).progression;
  const snapped = prog && snapToMeter(prog, meter).progression;
  if (snapped && snapped !== prog) next = withProgression(next, snapped);
  if (sectionOf(next).groove?.meter !== meter) next = rollLayer(next, 'groove', lib, locks, rng);
  if (!sectionOf(next).strum || meter !== idea.meter) next = rollLayer(next, 'strum', lib, locks, rng);
  return next;
}

export function rollAll(idea, locks, lib, rng = Math.random) {
  let next = idea;
  for (const layer of LAYERS) {
    if (locks[layer]) continue;
    next = layer === 'meter' ? rollMeter(next, lib, locks, rng, false) : rollLayer(next, layer, lib, locks, rng);
  }
  return next;
}
