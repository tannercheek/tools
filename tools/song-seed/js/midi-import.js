// MIDI file → groove or progression, shared by the import scripts and the
// app's Import MIDI dialog. Pure: no DOM, no Node modules, so it runs in the
// browser and in the tests.
import { meterInfo } from './loop.js';
import { MODES, MODE_ORDER, TONICS, chordIntervals, chordSuffix, mod12, nameInKey, parseNumeral, scaleNotes } from './theory.js';

// General MIDI drum notes → groove tracks. Anything else is skipped and listed.
export const TRACK_OF_NOTE = {
  35: 'kick', 36: 'kick',
  37: 'snare', 38: 'snare', 40: 'snare',
  42: 'cymbal', 44: 'cymbal', 46: 'cymbal', // every hi-hat; other cymbals (49, 51…) are skipped
};
const TRACK_ORDER = ['kick', 'snare', 'cymbal']; // as written in grooves.js
const TEMPO_SPREAD = 15;
const TEMPO_MIN = 40, TEMPO_MAX = 220; // the app's tempo range
const GROOVE_ID_RE = /^groove_[a-z0-9]+(_[a-z0-9]+)*_\d{2}$/;

export const markOf = (velocity) => (velocity >= 110 ? 'X' : velocity < 50 ? 'o' : 'x');

// A small Standard MIDI File reader: formats 0 and 1, running status, sysex.
// Returns every note-on (absolute ticks, with the tick its note-off lands on
// as `end`), the tempo and time-signature events, and the file length (the
// latest end of track).
export function readMidi(bytes) {
  const str = (p, n) => String.fromCharCode(...bytes.subarray(p, p + n));
  const u16 = (p) => (bytes[p] << 8) | bytes[p + 1];
  const u32 = (p) => ((bytes[p] << 24) >>> 0) + (bytes[p + 1] << 16) + (bytes[p + 2] << 8) + bytes[p + 3];
  if (bytes.length < 14 || str(0, 4) !== 'MThd') throw new Error('not a MIDI file');
  const division = u16(12);
  if (division & 0x8000) throw new Error('SMPTE timing is not supported');

  const notes = [], tempos = [], timeSigs = [];
  let length = 0;
  let p = 8 + u32(4);
  while (p + 8 <= bytes.length) {
    const id = str(p, 4);
    const end = Math.min(p + 8 + u32(p + 4), bytes.length);
    let q = p + 8, tick = 0, status = 0;
    const open = new Map(); // "channel:note" → note-ons still sounding
    const vlq = () => { let n = 0, b; do { b = bytes[q++]; n = n * 128 + (b & 0x7f); } while (b & 0x80 && q < end); return n; };
    while (id === 'MTrk' && q < end) {
      tick += vlq();
      if (bytes[q] & 0x80) status = bytes[q++];
      else if (!status) throw new Error('bad track data');
      if (status === 0xff) {
        const type = bytes[q++], n = vlq(), data = bytes.subarray(q, q + n);
        q += n;
        status = 0;
        if (type === 0x51) tempos.push({ tick, usPerQuarter: (data[0] << 16) | (data[1] << 8) | data[2] });
        if (type === 0x58) timeSigs.push({ tick, beats: data[0], unit: 2 ** data[1] });
        if (type === 0x2f) break;
      } else if (status === 0xf0 || status === 0xf7) {
        q += vlq();
        status = 0;
      } else {
        const kind = status & 0xf0;
        const note = bytes[q++];
        const velocity = kind === 0xc0 || kind === 0xd0 ? 0 : bytes[q++];
        const channel = (status & 0x0f) + 1, key = `${channel}:${note}`;
        if (kind === 0x90 && velocity > 0) {
          const n = { tick, end: null, note, velocity, channel };
          notes.push(n);
          open.set(key, [...(open.get(key) ?? []), n]);
        } else if (kind === 0x80 || kind === 0x90) {
          const n = open.get(key)?.shift();
          if (n) n.end = tick;
        }
      }
    }
    for (const list of open.values()) for (const n of list) n.end = tick; // never let go: ends with the track
    if (id === 'MTrk') length = Math.max(length, tick);
    p = end;
  }
  const first = (list) => list.sort((a, b) => a.tick - b.tick)[0] ?? null;
  return { division, notes, tempo: first(tempos), timeSig: first(timeSigs), length };
}

// One file → one groove. Hits are quantized to the nearest 16th; if two land
// on the same step, the louder one wins. Bars come from the last note-on, or
// from the end of the file when it sits on a bar line (a loop that ends in
// silence). Throws if the file has no kick, snare or cymbal notes.
export function grooveFromMidi(id, bytes) {
  const mid = readMidi(bytes);
  const warnings = [];
  const bpm = mid.tempo ? Math.round(60_000_000 / mid.tempo.usPerQuarter) : 120;
  if (!mid.tempo) warnings.push('no tempo in the file; assumed 120 BPM');
  const meter = mid.timeSig ? `${mid.timeSig.beats}/${mid.timeSig.unit}` : '4/4';
  const { stepsPerBar } = meterInfo(meter);
  const ticksPerStep = mid.division / 4;
  const ticksPerBar = stepsPerBar * ticksPerStep;

  if (!mid.notes.length) throw new Error('no notes');
  const lastOn = Math.max(...mid.notes.map((n) => n.tick));
  const endBars = Math.round(mid.length / ticksPerBar);
  const endsOnBarLine = Math.abs(mid.length - endBars * ticksPerBar) <= ticksPerStep / 2;
  const bars = Math.max(Math.floor(lastOn / ticksPerBar) + 1, endsOnBarLine ? endBars : 0);
  if (![1, 2, 4, 8].includes(bars)) warnings.push(`${bars} bars won't tile evenly into a 2, 4 or 8 bar loop`);

  const total = bars * stepsPerBar;
  const velocities = {};
  const skipped = new Map();
  for (const n of mid.notes) {
    const track = TRACK_OF_NOTE[n.note];
    if (!track) { skipped.set(n.note, (skipped.get(n.note) ?? 0) + 1); continue; }
    // A hit pushed just ahead of the loop's end belongs on its first step.
    const step = Math.round(n.tick / ticksPerStep) % total;
    velocities[track] ??= new Array(total).fill(0);
    velocities[track][step] = Math.max(velocities[track][step], n.velocity);
  }
  const tracks = {};
  for (const t of TRACK_ORDER) {
    if (velocities[t]) tracks[t] = velocities[t].map((v) => (v ? markOf(v) : '.')).join('');
  }
  if (!Object.keys(tracks).length) throw new Error('no kick, snare or cymbal notes');

  const tempo = { min: Math.max(TEMPO_MIN, bpm - TEMPO_SPREAD), max: Math.min(TEMPO_MAX, bpm + TEMPO_SPREAD) };
  return { groove: { id, meter, res: 16, bars, tempo, tags: [], tracks }, bpm, skipped, warnings };
}

// The entry as it would sit inside GROOVES, with anything to check as comments.
export function formatGroove({ groove: g, bpm, skipped, warnings }, existingIds = new Set()) {
  const notes = [...warnings];
  if (!GROOVE_ID_RE.test(g.id)) notes.push(`id doesn't match groove_words_NN; rename the file`);
  if (existingIds.has(g.id)) notes.push('this id is already in grooves.js');
  if (skipped.size) {
    const list = [...skipped].sort((a, b) => a[0] - b[0]).map(([note, n]) => `${note} ×${n}`);
    notes.push(`skipped notes: ${list.join(', ')}`);
  }
  const q = (s) => `'${String(s).replace(/['\\]/g, '\\$&')}'`;
  return [
    ...notes.map((n) => `  // ${g.id}: ${n}`),
    '  {',
    `    id: ${q(g.id)}, meter: ${q(g.meter)}, res: ${g.res}, bars: ${g.bars},`,
    `    tempo: { min: ${g.tempo.min}, max: ${g.tempo.max} }, tags: [], // check (file is ${bpm} BPM)`,
    '    tracks: {',
    ...Object.entries(g.tracks).map(([t, s]) => `      ${`${t}:`.padEnd(11)}${q(s)},`),
    '    },',
    '  },',
  ].join('\n');
}

const DRUM_CHANNEL = 10;
const MAX_CHORDS = 8; // the most the Chords layer offers
const PROG_ID_RE = /^prog_[a-z0-9]+(_[a-z0-9]+)*_\d{2}$/;

// Every chord a numeral can spell (see parseNumeral), simplest first so a
// tie goes to the plainer name. Sus chords are written upper case.
const SHAPES = [
  ['maj', null], ['min', null], ['dim', null],
  ['maj', 'sus2'], ['maj', 'sus4'],
  ['maj', '7'], ['min', '7'], ['maj', 'maj7'], ['dim', '7'],
  ['maj', '6'], ['min', '6'], ['maj', 'add9'], ['min', 'add9'],
  ['maj', '9'], ['min', '9'], ['min', 'maj7'],
].map(([quality, ext]) => {
  const intervals = chordIntervals(quality, ext).map(mod12);
  return { quality, ext, intervals, fifth: intervals.find((i) => i === 7 || i === 6) };
});

const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));
const isSubset = (a, b) => [...a].every((x) => b.has(x));

// Names a set of pitch classes as one chord a numeral can spell. An exact
// match wins; 4+ note chords may leave out the 5th. The bass note breaks ties
// (C E G A over A is Am7, over C it's C6). Anything else gets the closest
// chord rooted on one of its notes, with exact: false.
export function nameChord(pcs, bassPc) {
  let best = null;
  const consider = (c) => { if (!best || c.score > best.score) best = c; };
  SHAPES.forEach((shape, order) => {
    for (const rootPc of pcs) {
      const full = new Set(shape.intervals.map((i) => mod12(rootPc + i)));
      const noFifth = new Set(shape.intervals.filter((i) => i !== shape.fifth).map((i) => mod12(rootPc + i)));
      const tie = (rootPc === bassPc ? 1 : 0) - order / 100;
      const named = { rootPc, quality: shape.quality, ext: shape.ext };
      if (sameSet(full, pcs)) consider({ ...named, exact: true, score: 30 + tie });
      else if (shape.intervals.length >= 4 && sameSet(noFifth, pcs)) consider({ ...named, exact: true, score: 20 + tie });
      else {
        const hits = [...full].filter((x) => pcs.has(x)).length;
        consider({ ...named, exact: false, score: hits - (full.size - hits) - (pcs.size - hits) + tie });
      }
    }
  });
  const { score, ...chord } = best;
  return { ...chord, pcs: new Set(chordIntervals(chord.quality, chord.ext).map((i) => mod12(chord.rootPc + i))) };
}

// Scores every tonic × mode: mostly how much of the chords' time sits in the
// mode's scale (so one borrowed chord outweighs the bonuses), then whether the loop starts, ends and dwells on the tonic
// chord, whether the mode's signature chord is there, and the mode's weight.
// Relative keys (C major / A minor) share a scale, so the tonic-chord rules
// decide those. `candidates` lists every tonic × mode, best first (a tie keeps
// the scoring order, so the first candidate is always the main pick).
export function guessKey(chords) {
  const total = chords.reduce((a, c) => a + c.bars, 0);
  const scored = [];
  for (let tonicPc = 0; tonicPc < 12; tonicPc++) {
    for (const mode of MODE_ORDER) {
      const m = MODES[mode];
      const scale = new Set(m.steps.map((st) => mod12(tonicPc + st)));
      const tonicQuality = parseNumeral(m.tonic).quality;
      const isTonic = (c) => c.rootPc === tonicPc && (c.quality === tonicQuality || c.ext?.startsWith('sus'));
      const fit = chords.reduce((a, c) => a + (c.bars * [...c.pcs].filter((x) => scale.has(x)).length) / c.pcs.size, 0) / total;
      const tonicShare = chords.filter(isTonic).reduce((a, c) => a + c.bars, 0) / total;
      const signature = m.signature.some((num) => {
        const p = parseNumeral(num);
        return chords.some((c) => c.rootPc === mod12(tonicPc + p.offset) && c.quality === p.quality);
      });
      const score = 20 * fit + (isTonic(chords[0]) ? 2 : 0) + (isTonic(chords.at(-1)) ? 0.5 : 0)
        + 2 * tonicShare + (signature ? 1 : 0) + m.weight / 10;
      scored.push({ tonicPc, mode, score });
    }
  }
  const candidates = scored.sort((a, b) => b.score - a.score)
    .map(({ tonicPc, mode, score }) => ({ tonic: spellTonic(tonicPc, mode), tonicPc, mode, score }));
  const { tonic, tonicPc, mode } = candidates[0];
  return { tonic, tonicPc, mode, candidates };
}

// Of a tonic's two names, the one whose scale uses each letter once, then
// the one with fewer accidentals (C# minor, not Db minor). It only changes
// the names printed for checking.
const ENHARMONIC = { 1: 'C#', 3: 'D#', 6: 'Gb', 8: 'G#', 10: 'A#' };
function spellTonic(pc, mode) {
  const cost = (t) => {
    const notes = scaleNotes(t, mode);
    return 10 * (7 - new Set(notes.map((n) => n[0])).size) + notes.filter((n) => /[#b]/.test(n)).length;
  };
  const names = [TONICS[pc], ENHARMONIC[pc]].filter(Boolean);
  return names.reduce((x, y) => (cost(y) < cost(x) ? y : x));
}

// Semitones above the tonic → numeral (major-scale based, as in theory.js).
const NUMERAL_OF_OFFSET = ['I', 'bII', 'II', 'bIII', 'III', 'IV', 'bV', 'V', 'bVI', 'VI', 'bVII', 'VII'];

export function numeralFor(chord, tonicPc, mode) {
  const offset = mod12(chord.rootPc - tonicPc);
  const upper = offset === 6 && mode === 'lydian' ? '#IV' : NUMERAL_OF_OFFSET[offset];
  const base = chord.quality === 'maj' ? upper : upper.toLowerCase() + (chord.quality === 'dim' ? '°' : '');
  return base + (chord.ext ?? '');
}

const where = (half) => `bar ${Math.floor(half / 2) + 1}${half % 2 ? ' (2nd half)' : ''}`;

// One file → one progression. Notes are grouped by half bar (see halfOf) and
// each half bar is named as a chord. A half bar continues the chord before it
// if it names the same chord, has no new notes, or holds only some of its
// notes (a re-struck top voice, a bass note on its own). Bars come from the
// last note, or from the end of the file when it sits on a bar line.
export function progressionFromMidi(id, bytes) {
  const mid = readMidi(bytes);
  const warnings = [];
  const meter = mid.timeSig ? `${mid.timeSig.beats}/${mid.timeSig.unit}` : '4/4';
  const ticksPerStep = mid.division / 4;
  const ticksPerBar = meterInfo(meter).stepsPerBar * ticksPerStep;
  const ticksPerHalf = ticksPerBar / 2;

  const drums = mid.notes.filter((n) => n.channel === DRUM_CHANNEL).length;
  if (drums) warnings.push(`skipped ${drums} notes on the drum channel (10)`);
  const notes = mid.notes.filter((n) => n.channel !== DRUM_CHANNEL);
  if (!notes.length) throw new Error('no notes');

  // The half bar a note belongs to: the one it starts in, unless it starts
  // in the second half of it and rings on longer past the line than before
  // it (a pushed chord, or a strum that starts just ahead of the beat).
  const halfOf = (n) => {
    const line = (Math.floor(n.tick / ticksPerHalf) + 1) * ticksPerHalf;
    const before = line - n.tick;
    return line / ticksPerHalf - (before <= ticksPerHalf / 2 && n.end - line > before ? 0 : 1);
  };
  const lastHalf = Math.max(...notes.map(halfOf));
  const endBars = Math.round(mid.length / ticksPerBar);
  const endsOnBarLine = Math.abs(mid.length - endBars * ticksPerBar) <= ticksPerStep / 2;
  const loopBars = Math.max(Math.floor(lastHalf / 2) + 1, endsOnBarLine ? endBars : 0);
  const halves = loopBars * 2;

  const slots = new Map();
  for (const n of notes) {
    // A chord pushed just ahead of the loop's end belongs on its first beat.
    const half = halfOf(n) % halves;
    const s = slots.get(half) ?? { pcs: new Set(), bass: Infinity };
    s.pcs.add(mod12(n.note));
    s.bass = Math.min(s.bass, n.note);
    slots.set(half, s);
  }

  const chords = [];
  for (const half of [...slots.keys()].sort((a, b) => a - b)) {
    const { pcs, bass } = slots.get(half);
    const named = nameChord(pcs, mod12(bass));
    const prev = chords.at(-1);
    const same = prev && named.rootPc === prev.rootPc && named.quality === prev.quality && named.ext === prev.ext;
    if (same) prev.exact ||= named.exact; // a bass note first, then the chord
    if (same || (prev && !named.exact && isSubset(pcs, prev.heard))) continue;
    chords.push({ ...named, start: half, heard: pcs });
  }
  if (chords[0].start > 0) {
    warnings.push(`nothing starts on bar 1; the first chord was stretched back to it`);
    chords[0].start = 0;
  }
  chords.forEach((c, i) => { c.bars = ((chords[i + 1]?.start ?? halves) - c.start) / 2; });

  const key = guessKey(chords);
  const name = (c) => nameInKey(c.rootPc, key.tonic, key.mode) + chordSuffix(c.quality, c.ext);
  for (const c of chords) {
    if (c.exact) continue;
    const heard = [...c.heard].map((pc) => nameInKey(pc, key.tonic, key.mode)).join(' ');
    warnings.push(`${where(c.start)}: heard ${heard}, written as ${name(c)}`);
  }
  if (![2, 4, 8].includes(loopBars)) warnings.push(`${loopBars} bars; progressions must add up to 2, 4 or 8`);
  if (chords.length < 2) warnings.push('only one chord; the Chords layer offers 2 or more');
  if (chords.length > MAX_CHORDS) warnings.push(`${chords.length} chords; the Chords layer offers up to ${MAX_CHORDS}`);

  return {
    progression: { id, mode: key.mode, chords: chords.map((c) => numeralFor(c, key.tonicPc, key.mode)), bars: chords.map((c) => c.bars) },
    key: `${key.tonic} ${MODES[key.mode].name}`,
    symbols: chords.map(name),
    warnings,
    chords: chords.map(({ rootPc, quality, ext, bars }) => ({ rootPc, quality, ext, bars })),
    candidates: key.candidates,
  };
}

// The same progression read in another key: mode, numerals, key name and
// chord symbols re-spelled, so a misread relative key (Am F C G as A minor
// when it's C major) can be switched. Warnings are left as they were.
export function renumber(result, tonicPc, mode) {
  const tonic = spellTonic(tonicPc, mode);
  return {
    ...result,
    progression: { ...result.progression, mode, chords: result.chords.map((c) => numeralFor(c, tonicPc, mode)) },
    key: `${tonic} ${MODES[mode].name}`,
    symbols: result.chords.map((c) => nameInKey(c.rootPc, tonic, mode) + chordSuffix(c.quality, c.ext)),
  };
}

// Groove or progression, for a file dropped without saying which. A
// `groove_` or `prog_` filename prefix decides. Otherwise notes on the drum
// channel, or only GM drum notes, make it a groove; anything else (no notes
// included) is a progression. `mid` is what readMidi returns.
export function detectKind(filename, mid) {
  const name = filename.toLowerCase();
  if (name.startsWith('groove_')) return 'groove';
  if (name.startsWith('prog_')) return 'progression';
  const { notes } = mid;
  if (notes.some((n) => n.channel === DRUM_CHANNEL)) return 'groove';
  if (notes.length && notes.every((n) => TRACK_OF_NOTE[n.note])) return 'groove';
  return 'progression';
}

// The entry as it would sit inside PROGRESSIONS, with anything to check as comments.
export function formatProgression({ progression: p, key, symbols, warnings }, existingIds = new Set()) {
  const notes = [...warnings];
  if (!PROG_ID_RE.test(p.id)) notes.push(`id doesn't match prog_words_NN; rename the file`);
  if (existingIds.has(p.id)) notes.push('this id is already in progressions.js');
  const q = (s) => `'${String(s).replace(/['\\]/g, '\\$&')}'`;
  return [
    ...notes.map((n) => `  // ${p.id}: ${n}`),
    `  // ${p.id}: guessed ${key} (check): ${symbols.join(' ')}`,
    `  { id: ${q(p.id)}, mode: ${q(p.mode)}, chords: [${p.chords.map(q).join(', ')}], bars: [${p.bars.join(', ')}] },`,
  ].join('\n');
}
