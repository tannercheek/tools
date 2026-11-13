// My grooves and My progressions (PLAN step 17): imported patterns kept in the
// synced store, like My strums. Pure (no DOM), so Node tests can run it.
//
// Each is the same shape as a built-in, plus addedAt. The id is the MIDI
// filename, so it must not clash with any id in either library.
//
// Also the Import MIDI dialog's logic (PLAN step 18), and adding an edited
// groove or progression from the Loop (PLAN step 24), at the bottom.
import { MODES, TONICS, parseNumeral } from './theory.js';
import { METERS, BAR_GRID, sumBars } from './loop.js';
import { validGroove, GROOVE_BARS, grooveFrom, withSection, withProgression, sectionOf } from './idea.js';
import { withMeter, shapeOf } from './randomize.js';
import { readMidi, detectKind, grooveFromMidi, progressionFromMidi, renumber } from './midi-import.js';
import { chartText, prettyChord } from './display.js';

const MAX_ID = 120;
const goodId = (id) => typeof id === 'string' && id.length > 0 && id.length <= MAX_ID;
const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

// A length on the 1/48-bar grid sumBars() rounds to: half bars from a MIDI
// file, or beats edited in the Loop (a third of a bar in 3/4; step 24).
const onGrid = (b) => isNum(b) && b > 0 && Math.abs(b * BAR_GRID - Math.round(b * BAR_GRID)) < 1e-6;

// The same limits validateIdea() puts on an idea's progression, so anything
// kept here can be picked and played.
function goodProgression(p) {
  return MODES[p.mode] && Array.isArray(p.chords) && Array.isArray(p.bars)
    && p.chords.length > 0 && p.chords.length <= 16 && p.chords.length === p.bars.length
    && p.chords.every((c) => typeof c === 'string' && parseNumeral(c))
    && p.bars.every(onGrid) && sumBars(p.bars) <= 16;
}

const CLEAN = {
  grooves(g) {
    if (!METERS.includes(g.meter)) return null;
    const groove = validGroove({ ...g, source: g.id }, g.meter);
    if (!groove) return null;
    const tags = Array.isArray(g.tags) ? g.tags.filter((t) => typeof t === 'string') : [];
    const { meter, res, bars, tempo, tracks } = groove;
    return { id: g.id, meter, res, bars, tempo, tags, tracks, addedAt: g.addedAt };
  },
  progressions(p) {
    if (!goodProgression(p)) return null;
    return { id: p.id, mode: p.mode, chords: [...p.chords], bars: [...p.bars], addedAt: p.addedAt };
  },
};

// A list from the synced store: anything malformed or repeated is dropped.
// kind is 'grooves' or 'progressions'.
export function cleanMine(kind, raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || !goodId(item.id) || seen.has(item.id) || typeof item.addedAt !== 'string') continue;
    const clean = CLEAN[kind](item);
    if (!clean) continue;
    seen.add(item.id);
    out.push(clean);
  }
  return out;
}

// Is this id already a built-in or My entry of that kind?
export const idTaken = (lib, kind, id, mine = []) =>
  lib[kind].some((x) => x.id === id) || mine.some((x) => x.id === id);

// Newest first, like Saved. The list comes back unchanged if the id is taken.
export function addMine(mine, entry, lib, kind) {
  if (idTaken(lib, kind, entry.id, mine)) return mine;
  return [entry, ...mine];
}

export const removeMine = (mine, id) => mine.filter((x) => x.id !== id);

// ---------- Import MIDI (PLAN step 18) ----------
// The dialog's logic: reading each file for review, the review rows, what
// Add saves, and which import becomes the current pick after a row import.
// kind is 'groove' or 'progression' here (as detectKind says it); the
// stored lists are LIST_OF[kind].

export const LIST_OF = { groove: 'grooves', progression: 'progressions' };
const MAX_KEYS = 5; // Key select: the best guesses
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The id is the filename without .mid (or .midi).
export const idOf = (filename) => String(filename).replace(/\.midi?$/i, '');

const REASONS = {
  'not a MIDI file': 'Not a MIDI file',
  'no notes': 'No usable notes',
  'no kick, snare or cymbal notes': 'No kick, snare or cymbal notes',
};
function reason(err) {
  const msg = String(err?.message ?? '');
  const meter = /^Bad meter: (.*)$/.exec(msg);
  if (meter) return `Can’t read the time signature (${meter[1]})`;
  return REASONS[msg] ?? 'Can’t read this file';
}

// One file, read both ways so a mixed batch can switch its kind. Never
// throws: anything that goes wrong becomes an `error` on the file or on one
// of its readings.
export function readImport(filename, bytes) {
  const id = idOf(filename);
  let mid;
  try {
    mid = readMidi(bytes);
  } catch (err) {
    return { filename, id, detected: null, error: reason(err) };
  }
  const attempt = (read) => { try { return read(id, bytes); } catch (err) { return { error: reason(err) }; } };
  return { filename, id, detected: detectKind(filename, mid), groove: attempt(grooveFromMidi), progression: attempt(progressionFromMidi) };
}

// Why an entry can't be kept in My grooves or My progressions, or null.
// Anything kept has to survive cleanMine() when it loads again.
function keepProblem(kind, entry) {
  if (!goodId(entry.id)) return 'The filename is too long';
  if (kind === 'groove') {
    if (!METERS.includes(entry.meter)) return `In ${entry.meter}; grooves can be 4/4, 3/4 or 6/8`;
    if (!GROOVE_BARS.includes(entry.bars)) return `${plural(entry.bars, 'bar')}; grooves can be 1, 2, 4 or 8 bars`;
  }
  const kept = cleanMine(LIST_OF[kind], [{ ...entry, addedAt: 'check' }]);
  if (kept.length) return null;
  return kind === 'progression' ? 'Too long; up to 16 bars and 16 chords' : 'Can’t be kept as a groove';
}

const WRONG_KIND = { groove: 'This looks like a chord file', progression: 'This looks like a drum file' };

// One review row. `row` is what the dialog holds: { file, kind, keyIdx }.
// The result says what to show, and `item` ({ entry, key }) is what Add saves
// (null when the file can't be added, with the reason in `error`).
function reviewRow({ file, kind, keyIdx = 0 }, lib, fixed) {
  const out = {
    id: file.id, filename: file.filename, kind, showKind: !fixed && !file.error,
    summary: null, keys: null, keyIdx: 0, warnings: [], error: null, item: null,
  };
  if (fixed && file.detected && file.detected !== fixed) out.warnings.push(WRONG_KIND[fixed]);
  const read = file.error ? file : file[kind];
  if (read.error) return { ...out, error: read.error };

  let entry, key = null;
  const warnings = read.warnings.map(cap);
  if (kind === 'groove') {
    const { meter, res, bars, tempo, tracks } = read.groove;
    entry = { id: file.id, meter, res, bars, tempo: { ...tempo }, tags: [], tracks: { ...tracks } };
    out.summary = `${meter} · ${plural(bars, 'bar')} · ${tempo.min}–${tempo.max} BPM`;
    if (read.skipped.size) {
      const list = [...read.skipped].sort((a, b) => a[0] - b[0]).map(([note, n]) => `${note} ×${n}`);
      warnings.push(`Skipped notes ${list.join(', ')}`);
    }
  } else {
    const cands = read.candidates.slice(0, MAX_KEYS);
    out.keyIdx = Math.min(Math.max(0, keyIdx), cands.length - 1);
    const pick = cands[out.keyIdx];
    const r = renumber(read, pick.tonicPc, pick.mode);
    const { mode, chords, bars } = r.progression;
    entry = { id: file.id, mode, chords: [...chords], bars: [...bars] };
    key = { tonicPc: pick.tonicPc, mode: pick.mode };
    out.summary = chartText(r.symbols, bars, '4/4', prettyChord);
    out.keys = cands.map((c, i) => ({ label: `${c.tonic} ${MODES[c.mode].name}`, value: String(i) }));
  }
  const problem = keepProblem(kind, entry) ?? (idTaken(lib, LIST_OF[kind], entry.id) ? 'Already in your library' : null);
  if (problem) return { ...out, summary: null, keys: null, error: problem }; // a reason only, no Key select
  return { ...out, warnings: [...out.warnings, ...warnings], item: { entry, key } };
}

// Every row in list order. fixed is the row's kind ('groove' or
// 'progression') from a row's Import, or null for a mixed batch. A second
// file with the same id as one above it can't be added.
export function reviewRows(rows, lib, fixed = null) {
  const seen = new Set();
  return rows.map((row) => {
    const out = reviewRow(row, lib, fixed);
    if (out.item && seen.has(out.id)) return { ...out, summary: null, keys: null, warnings: [], error: 'Same name as a file above', item: null };
    if (out.item) seen.add(out.id);
    return out;
  });
}

// The rows a file starts with: its row's kind, or the one detectKind read.
export const newRow = (file, fixed = null) => ({ file, kind: fixed ?? file.detected ?? 'groove', keyIdx: 0 });

// "Add N" counts only the rows that can be added.
export const addCount = (reviewed) => reviewed.filter((r) => r.item).length;

// "Added 2 grooves, 1 progression". items: [{ kind }].
export function addedText(items) {
  const n = (kind) => items.filter((i) => i.kind === kind).length;
  const parts = [['groove', n('groove')], ['progression', n('progression')]].filter(([, c]) => c).map(([k, c]) => plural(c, k));
  return `Added ${parts.join(', ')}`;
}

// After a row import, the first file added becomes the current groove or
// progression, as if picked from its select. Returns { idea } or { reason }
// when a lock stands in the way. Locks on Drums and Progression don't:
// locks only hold against Randomize.
// - A groove in another meter switches the meter (an unlocked strum is
//   rerolled), unless Meter, or a Strum in the old meter, is locked.
// - A progression sets Key and Mode to the key chosen for it, except where
//   they're locked, and is refused by a locked Bars or Chords it doesn't fit.
export function pickImported(idea, lib, item, kind, locks = {}, rng = Math.random) {
  const { entry, key } = item;
  if (kind === 'groove') {
    const next = withSection(idea, { groove: grooveFrom(entry) });
    if (entry.meter === idea.meter) return { idea: next };
    if (locks.meter || locks.strum) return { reason: `Added. Switch to ${entry.meter} to use it` };
    return { idea: withMeter(next, entry.meter, lib, locks, rng) };
  }
  const now = shapeOf(sectionOf(idea).progression);
  const shape = shapeOf(entry);
  if (locks.bars && shape.bars !== now.bars) return { reason: 'Added. Doesn’t fit the locked bars' };
  if (locks.count && shape.count !== now.count) return { reason: 'Added. Doesn’t fit the locked chords' };
  const tonic = locks.tonic ? idea.key.tonic : TONICS[key.tonicPc];
  const mode = locks.mode ? idea.key.mode : key.mode;
  return {
    idea: withProgression({ ...idea, key: { tonic, mode } }, { source: entry.id, mode: entry.mode, chords: [...entry.chords], bars: [...entry.bars] }),
  };
}

// ---------- Add to library from the Loop (PLAN step 24) ----------
// An edited groove or progression saved to My grooves or My progressions.
// The id is the one it came from plus "edit" and the next free number in
// either library: groove_straight_push_01 → groove_straight_push_edit_01,
// and an edit of that → groove_straight_push_edit_02. A progression with no
// library id to go on (generated, or a custom one) uses its mode
// (prog_dorian_edit_01); a groove with none, groove_edit_01. Ids come from
// content, never list positions, and stay readable in the menus.

const PREFIX = { grooves: 'groove', progressions: 'prog' };
const WORDS_RE = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

// The id's words without its number and any "_edit", or null if it isn't a
// library-style id of that kind (an imported filename can be anything).
function baseOf(kind, source) {
  if (typeof source !== 'string' || !WORDS_RE.test(source) || !source.startsWith(`${PREFIX[kind]}_`)) return null;
  const base = source.replace(/_\d+$/, '').replace(/_edit$/, '');
  return base === PREFIX[kind] ? null : base;
}

export function editedId(lib, kind, source, fallback = PREFIX[kind]) {
  const base = baseOf(kind, source) ?? fallback;
  for (let n = 1; ; n++) {
    const id = `${base}_edit_${String(n).padStart(2, '0')}`;
    if (!idTaken(lib, kind, id)) return id;
  }
}

// The idea's groove as a My groove. It keeps the tags of the groove it came
// from, so Saved names still read "… · push".
export function makeMyGroove(groove, lib, now = Date.now()) {
  const { meter, res, bars, tempo, tracks } = groove;
  const tags = lib.grooveById.get(groove.source)?.tags ?? [];
  return {
    id: editedId(lib, 'grooves', groove.source), meter, res, bars, tempo: { ...tempo }, tags: [...tags],
    tracks: { ...tracks }, addedAt: new Date(now).toISOString(),
  };
}

// The idea's progression as a My progression, in the mode it was written for.
export function makeMyProgression(prog, lib, now = Date.now()) {
  return {
    id: editedId(lib, 'progressions', prog.source, `prog_${prog.mode}`),
    mode: prog.mode, chords: [...prog.chords], bars: [...prog.bars], addedAt: new Date(now).toISOString(),
  };
}

export const hasHit = (groove) => Object.values(groove.tracks).some((t) => /[xXo]/.test(t));
