// Editing the idea's progression in the Loop (PLAN step 19): changing,
// moving, splitting and deleting chords, the chords the menu offers, matching
// a progression to a library entry, and keeping it on the grid when the meter
// changes. Pure (no DOM), so Node tests can run it. The page side is
// chord-lane.js (step 20).
//
// Lengths stay in bars. An edited length is a whole number of the meter's
// pulses (a 3/4 beat is a third of a bar), so totals go through sumBars().
// Every edit returns a new progression, or the same one when it can't apply.
import { MODES, MAJOR, mod12, parseNumeral, formatNumeral } from './theory.js';
import { BAR_GRID, meterInfo, sumBars } from './loop.js';

const MAX_CHORDS = 16; // as many as validateIdea() takes
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const inRange = (prog, i) => Number.isInteger(i) && i >= 0 && i < prog.chords.length;

// An edit keeps a library id as source, and a generated progression becomes 'custom'.
const edited = (prog, chords, bars) =>
  ({ ...prog, source: prog.source === 'generated' ? 'custom' : prog.source, chords, bars });

// Where each chord starts, then where the loop ends: one more edge than chords.
// `per` is how many units make a bar (stepsPerBar for steps).
function edgesOf(prog, per) {
  const edges = [0];
  let at = 0;
  for (const b of prog.bars) {
    at = sumBars([at, b]);
    edges.push(Math.round(at * per));
  }
  return edges;
}

// The pulses an edge between `from` and `to` can sit on, so that both sides
// keep at least one pulse; null if there are none.
function room(from, to, pulse) {
  const lo = Math.ceil((from + pulse) / pulse) * pulse;
  const hi = Math.floor((to - pulse) / pulse) * pulse;
  return lo <= hi ? { lo, hi } : null;
}
const clamp = (n, { lo, hi }) => Math.min(hi, Math.max(lo, n));

export function setChord(prog, i, numeral) {
  if (!inRange(prog, i) || !parseNumeral(numeral) || prog.chords[i] === numeral) return prog;
  return edited(prog, prog.chords.map((c, j) => (j === i ? numeral : c)), [...prog.bars]);
}

// Move the edge after chord i to step `to` (from the loop's start; a pointer
// can land between steps), snapped to the pulse. Both chords keep at least one
// pulse, and the loop's last edge doesn't move: Bars sets the length.
export function moveEdge(prog, i, to, meter) {
  if (!inRange(prog, i) || i === prog.chords.length - 1 || !Number.isFinite(to)) return prog;
  const { stepsPerBar, pulse } = meterInfo(meter);
  const edges = edgesOf(prog, stepsPerBar);
  const fits = room(edges[i], edges[i + 2], pulse);
  if (!fits) return prog;
  const at = clamp(Math.round(to / pulse) * pulse, fits);
  if (at === edges[i + 1]) return prog;
  const bars = [...prog.bars];
  bars[i] = (at - edges[i]) / stepsPerBar;
  bars[i + 1] = (edges[i + 2] - at) / stepsPerBar;
  return edited(prog, [...prog.chords], bars);
}

// The chord before takes over chord i's time (the first chord's goes to the
// next one). The only chord can't be deleted.
export function deleteChord(prog, i) {
  if (!inRange(prog, i) || prog.chords.length < 2) return prog;
  const into = i === 0 ? 1 : i - 1;
  const bars = prog.bars.map((b, j) => (j === into ? sumBars([b, prog.bars[i]]) : b));
  return edited(prog, prog.chords.filter((_, j) => j !== i), bars.filter((_, j) => j !== i));
}

// Two of chord i, cut on the pulse nearest its middle (the earlier one if
// tied). Each half keeps at least one pulse, so the chord needs two.
export function splitChord(prog, i, meter) {
  if (!inRange(prog, i) || prog.chords.length >= MAX_CHORDS) return prog;
  const { stepsPerBar, pulse } = meterInfo(meter);
  const edges = edgesOf(prog, stepsPerBar);
  const [start, end] = [edges[i], edges[i + 1]];
  const fits = room(start, end, pulse);
  if (!fits) return prog;
  const cut = clamp(Math.ceil((start + end) / 2 / pulse - 0.5) * pulse, fits);
  return edited(
    prog,
    [...prog.chords.slice(0, i + 1), ...prog.chords.slice(i)],
    [...prog.bars.slice(0, i), (cut - start) / stepsPerBar, (end - cut) / stepsPerBar, ...prog.bars.slice(i + 1)],
  );
}

// The chord menu's Shorter (-1) and Longer (+1): chord i's end moves to the
// next pulse that way. The last chord's end is the loop's, so its start moves
// instead. An edge between pulses goes to the nearest pulse that way, never
// the other way (it stays put if that's all there's room for).
export function resizeChord(prog, i, delta, meter) {
  if (!inRange(prog, i) || prog.chords.length < 2 || (delta !== 1 && delta !== -1)) return prog;
  const { stepsPerBar, pulse } = meterInfo(meter);
  const last = i === prog.chords.length - 1;
  const k = last ? i : i + 1; // the edge that moves
  const at = edgesOf(prog, stepsPerBar)[k];
  const dir = last ? -delta : delta;
  const to = dir > 0 ? Math.floor(at / pulse + 1) * pulse : Math.ceil(at / pulse - 1) * pulse;
  const next = moveEdge(prog, k - 1, to, meter);
  const moved = edgesOf(next, stepsPerBar)[k] - at;
  return moved * dir > 0 ? next : prog;
}

// ---------- the chord menu ----------

// The triad on each degree of a mode, as numerals against the tonic's major
// scale: Dorian → i ii bIII IV v vi° bVII.
function triads(modeKey) {
  const st = MODES[modeKey].steps;
  return st.map((root, d) => {
    const third = mod12(st[(d + 2) % 7] - root);
    const fifth = mod12(st[(d + 4) % 7] - root);
    const acc = root < MAJOR[d] ? 'b' : root > MAJOR[d] ? '#' : '';
    return acc + (third === 4 ? ROMAN[d] : ROMAN[d].toLowerCase()) + (fifth === 6 ? '°' : '');
  });
}

// Auto stores the plain numeral, so Colour may still add to it at playback.
export const EXTENSIONS = [null, '7', 'maj7', 'sus2', 'sus4', 'add9', '6', '9'];
const DIM_EXTENSIONS = [null, '7'];

// What the chord menu offers in a mode: its 7 chords; the chords of the
// parallel major and minor keys that it doesn't have, without diminished
// ones, in degree order; and the extensions. `dim` marks the extensions a
// diminished chord takes.
export function chordChoices(modeKey) {
  const diatonic = triads(modeKey);
  const order = (n) => { const p = parseNumeral(n); return p.degree * 3 + p.alter; };
  const borrowed = [...new Set([...triads('ionian'), ...triads('aeolian')])]
    .filter((n) => !diatonic.includes(n) && parseNumeral(n).quality !== 'dim')
    .sort((a, b) => order(a) - order(b));
  const extensions = EXTENSIONS.map((ext) => ({ ext, label: ext ?? 'Auto', dim: DIM_EXTENSIONS.includes(ext) }));
  return { diatonic, borrowed, extensions };
}

// The extensions a chord takes: all of them, or Auto and 7 on a diminished one.
export const takesExtension = (numeral, ext) =>
  parseNumeral(numeral)?.quality !== 'dim' || DIM_EXTENSIONS.includes(ext);

// Picking a chord keeps the extension (Auto if the new chord can't take it),
// and picking an extension keeps the chord.
export function pickChord(numeral, base) {
  const ext = parseNumeral(numeral)?.ext ?? null;
  const next = parseNumeral(base);
  if (!next) return numeral;
  return formatNumeral(next, takesExtension(next.base, ext) ? ext : null);
}

export function pickExtension(numeral, ext) {
  const p = parseNumeral(numeral);
  return p && takesExtension(numeral, ext) ? formatNumeral(p, ext) : numeral;
}

// ---------- matching ----------

export const sameProgression = (a, b) => !!a && !!b && a.mode === b.mode
  && a.chords.length === b.chords.length && a.chords.every((c, i) => c === b.chords[i])
  && a.bars.length === b.bars.length && a.bars.every((x, i) => sumBars([x]) === sumBars([b.bars[i]]));

// The library entry with the same mode, chords and lengths, or null. Matched
// by content, like grooves and strums, so an edit shows Custom.
export const findProgression = (lib, prog) => (prog && lib.progressions.find((p) => sameProgression(p, prog))) || null;

// What the Progression select shows: the matching entry's id, or a disabled
// placeholder, Generated for a rolled progression and Custom for anything else.
export function progressionPick(lib, prog) {
  const match = findProgression(lib, prog);
  if (match) return { id: match.id, placeholder: null };
  return { id: null, placeholder: prog.source === 'generated' ? 'Generated' : 'Custom' };
}

// The My progression this one is, unchanged, or null. Remove shows only then.
export function myProgression(lib, prog) {
  const match = findProgression(lib, prog);
  return lib.myProgressions.find((p) => p === match) ?? null;
}

// Start over: the library progression this one came from, if it's still
// there and something has changed since.
export function startOverFrom(lib, prog) {
  const from = lib.progressionById.get(prog.source);
  return from && !sameProgression(from, prog) ? from : null;
}

// A library entry as the idea stores it.
export const progressionFrom = (entry) =>
  ({ source: entry.id, mode: entry.mode, chords: [...entry.chords], bars: [...entry.bars] });

// ---------- meter changes ----------

// The progression in another meter. An edge that misses a whole step there
// (a third of a bar in 4/4) moves to the nearest pulse, and a chord squeezed
// to nothing merges into the one before. Edges already on a step stay, so
// half-bar progressions come through unchanged. `dropped` counts the merges.
export function snapToMeter(prog, meter) {
  const { stepsPerBar, pulse } = meterInfo(meter);
  const step = BAR_GRID / stepsPerBar; // edges are in 1/48 bars here
  const beat = pulse * step;
  const edges = edgesOf(prog, BAR_GRID);
  const n = prog.chords.length;
  if (edges.slice(1, n).every((e) => e % step === 0)) return { progression: prog, dropped: 0 };
  for (let k = 1; k < n; k++) {
    const at = edges[k] % step === 0 ? edges[k] : Math.round(edges[k] / beat) * beat;
    edges[k] = Math.min(edges[n], Math.max(edges[k - 1], at));
  }
  const chords = [];
  const bars = [];
  prog.chords.forEach((c, k) => {
    if (edges[k + 1] === edges[k]) return;
    chords.push(c);
    bars.push((edges[k + 1] - edges[k]) / BAR_GRID);
  });
  return { progression: edited(prog, chords, bars), dropped: n - chords.length };
}

// Does every chord change land on a whole step in this meter? Library
// progressions are in whole and half bars, so they fit every meter. A My
// progression saved from the Loop may hold beats (a third of a bar from 3/4,
// which misses the 4/4 grid); it's listed and rolled only where it fits
// (PLAN step 24).
export function fitsMeter(prog, meter) {
  const step = BAR_GRID / meterInfo(meter).stepsPerBar;
  return edgesOf(prog, BAR_GRID).every((e) => e % step === 0);
}

// How many chords a meter change merged away: prog was the progression
// before, and next the one the idea has now in `meter`. 0 unless it was kept
// (snapped) rather than rolled again.
export function droppedOnMeter(prog, meter, next) {
  const { progression, dropped } = snapToMeter(prog, meter);
  return dropped && sameProgression(progression, next) ? dropped : 0;
}
