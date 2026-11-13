// How the page writes chords, notes and progressions as text, and the
// saved-idea fingerprint. Pure (no DOM), so Node tests can run it. Data keeps
// b and #; only the page shows ♭ and ♯.
import { MODES, MAJOR, parseNumeral, scaleNotes } from './theory.js';
import { DRUM_TRACKS, meterInfo, patternSteps, sumBars } from './loop.js';

const ACC = { b: '♭', '#': '♯' };
const GLYPH = { D: '↓', U: '↑', x: '×' };

// "Eb" → "E♭", "F#m7" → "F♯m7", "Bbm7b5" → "B♭m7♭5". Works for note names too.
export const prettyChord = (sym) =>
  String(sym).replace(/^([A-G])([b#])/, (_, letter, acc) => letter + ACC[acc]).replace(/b5$/, '♭5');

// "bVII" → "♭VII". Suffixes (maj7, add9…) never contain an accidental.
export const prettyNumeral = (numeral) => String(numeral).replace(/^[b#]/, (acc) => ACC[acc]);

// Free text such as a saved name: converts note names ("Eb") and numerals
// ("bVII") word by word, and leaves every other word alone.
export function pretty(text) {
  return String(text).split(/(\s+)/).map((word) => {
    if (/^[A-G][b#]$/.test(word)) return prettyChord(word);
    if (/^[b#]/.test(word) && parseNumeral(word)) return prettyNumeral(word);
    return word;
  }).join('');
}

// "D.DU.UDU" → "↓ · ↓ ↑ · ↑ ↓ ↑"
export const strumGlyph = (c) => GLYPH[c] || '·';
export const strumGlyphs = (pattern) => [...pattern].map(strumGlyph).join(' ');

// Scale degree i (0–6) of a mode, against the major scale: "1", "♭6", "♯4".
export function degreeLabel(modeKey, i) {
  const alter = MODES[modeKey].steps[i] - MAJOR[i];
  return (alter < 0 ? '♭' : alter > 0 ? '♯' : '') + (i + 1);
}

// "Minor (Aeolian)" → "Aeolian"; "Dorian" stays "Dorian".
export const modeTitle = (modeKey) => /\(([^)]+)\)/.exec(MODES[modeKey].label)?.[1] ?? MODES[modeKey].label;

// The key under the circle of fifths (step 28): one line per mark, in the
// circle's order of importance. The colour note's line is left out in Ionian,
// which has none. mark names the swatch app.js draws beside the text.
export function circleKey(tonic, modeKey) {
  const colour = MODES[modeKey].colour;
  const lines = [
    { mark: 'tonic', text: `Tonic: ${prettyChord(tonic)}` },
    { mark: 'scale', text: 'In the scale' },
  ];
  if (colour) {
    const note = scaleNotes(tonic, modeKey)[colour - 1];
    lines.push({ mark: 'colour', text: `Colour note: ${prettyChord(note)}, the ${degreeLabel(modeKey, colour - 1)}` });
  }
  lines.push({ mark: 'root', text: 'Chord roots in the loop' });
  return lines;
}

// A progression bar by bar, for chartText() and the MIDI track name. Each bar
// lists the chords sounding in it with their length in beats; `held` marks a
// chord carried over from an earlier bar. chords: [{ start, end }] in steps,
// as compileLoop() makes them.
export function chartBars(chords, { stepsPerBar, stepsPerBeat }) {
  const total = chords.length ? chords[chords.length - 1].end : 0;
  const bars = [];
  for (let start = 0; start < total; start += stepsPerBar) {
    const end = Math.min(start + stepsPerBar, total);
    const parts = [];
    chords.forEach((c, index) => {
      const from = Math.max(c.start, start);
      const to = Math.min(c.end, end);
      if (to > from) parts.push({ index, beats: (to - from) / stepsPerBeat, held: c.start < start });
    });
    bars.push(parts);
  }
  return bars;
}

// The chart as one line of text, for select options: "I | V | vi | IV V".
// A held bar shows "%". barLengths are in bars, as progressions store them.
// `fmt` writes each label (prettyChord for chord symbols).
export function chartText(numerals, barLengths, meter = '4/4', fmt = prettyNumeral) {
  const m = meterInfo(meter);
  let at = 0; // in bars
  const spans = barLengths.map((b) => {
    const start = Math.round(at * m.stepsPerBar);
    at = sumBars([at, b]);
    return { start, end: Math.round(at * m.stepsPerBar) };
  });
  return chartBars(spans, m)
    .map((parts) => parts.map((p) => (p.held ? '%' : fmt(numerals[p.index]))).join(' '))
    .join(' | ');
}

// ---------- saved-idea fingerprint (DESIGN §5.13) ----------

const FP_SLOTS = 16;
const FP_TOP = { kick: 18, snare: 22, cymbal: 26 };
const round = (n) => Math.round(n * 100) / 100;

// Path data for a 64×32 drawing: the first two bars of drums along the
// bottom (kick tallest, then snare, then cymbal; one stroke per slot) and a
// stepped line of chord roots across the top. Null if the idea can't be read.
export function fingerprint(idea, lib) {
  const sec = idea?.sections?.[0];
  // Saved ideas are drawn as stored, so a v1–v3 one still holds a groove id.
  const groove = typeof sec?.groove === 'string' ? lib.grooveById.get(sec.groove) : sec?.groove;
  const prog = sec?.progression;
  if (!groove?.tracks || !prog?.chords?.length || prog.chords.length !== prog.bars?.length) return null;
  let meter;
  try { meter = meterInfo(sec.meter || idea.meter); } catch { return null; }

  const tracks = Object.fromEntries(DRUM_TRACKS.map((t) => [t, patternSteps(groove.tracks[t] || '', groove.res)]));
  const hitIn = (track, from, to) => {
    const src = tracks[track];
    for (let s = from; s < to && src.length; s++) if (src[s % src.length]) return true;
    return false;
  };
  const span = (2 * meter.stepsPerBar) / FP_SLOTS; // an 8th note in 4/4
  const hits = [];
  for (let i = 0; i < FP_SLOTS; i++) {
    const from = Math.round(i * span);
    const to = Math.round((i + 1) * span);
    const kind = hitIn('kick', from, to) ? 'kick'
      : hitIn('snare', from, to) ? 'snare'
      : hitIn('cymbal', from, to) ? 'cymbal' : null;
    if (kind) hits.push({ kind, d: `M${round(3 + i * 3.87)} 30V${FP_TOP[kind]}` });
  }

  const total = sumBars(prog.bars);
  let at = 0;
  let chords = '';
  for (let i = 0; i < prog.chords.length; i++) {
    const p = parseNumeral(prog.chords[i]);
    if (!p || !(total > 0)) return null;
    const x0 = round(2 + (60 * at) / total);
    at = sumBars([at, prog.bars[i]]);
    const x1 = round(2 + (60 * at) / total);
    const y = 15 - (p.degree - 1) * 2;
    chords += i ? `V${y}H${x1}` : `M${x0} ${y}H${x1}`;
  }
  return { hits, chords };
}
