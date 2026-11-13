// The "idea": one saved result. See SPEC.md for the full shape.
// v1 always has exactly one section and arrangement ["A"]; the shape is
// ready for verse/chorus sections, per-section meters and tunings later.
import { MODES, TONICS, parseNumeral } from './theory.js';
import { METERS, DRUM_TRACKS, meterInfo, sumBars } from './loop.js';
import { strumFrom, validStrum } from './strum-editor.js';

// v2 dropped melodyPrompts. validateIdea() builds from blankIdea(), so a v1
// idea's prompts are simply left behind. v3 stores the strum's pattern in
// place of its id (PLAN step 14), and v4 the groove itself (PLAN step 16).
export const IDEA_VERSION = 4;

export function blankIdea() {
  return {
    version: IDEA_VERSION,
    tempo: 100,
    meter: '4/4',
    feel: { type: 'straight', swing: 0 },
    key: { tonic: 'C', mode: 'ionian' },
    tuning: null,
    sections: [{
      id: 'A', name: 'Loop', bars: 4, meter: null,
      groove: null, strum: null, progression: null,
      color: { level: 1, seed: 1 },
    }],
    arrangement: ['A'],
  };
}

export const sectionOf = (idea) => idea.sections[0];

export function withSection(idea, patch) {
  return { ...idea, sections: [{ ...idea.sections[0], ...patch }, ...idea.sections.slice(1)] };
}

// Set the progression; the section's bars always follow it.
export function withProgression(idea, progression) {
  return withSection(idea, { progression, bars: sumBars(progression.bars) });
}

const isNum = (n) => typeof n === 'number' && Number.isFinite(n);

// ---------- the idea's groove (v4) ----------
// { source, meter, res, bars, tempo, tracks }, in the idea's meter. source is
// the id it was picked or rolled from (a My groove's too), or null.

export const GROOVE_BARS = [1, 2, 4, 8];

// A library entry (built-in or My groove) as the idea stores it.
export function grooveFrom(entry) {
  const tracks = {};
  for (const t of DRUM_TRACKS) if (typeof entry.tracks[t] === 'string') tracks[t] = entry.tracks[t];
  return {
    source: entry.id, meter: entry.meter, res: entry.res, bars: entry.bars,
    tempo: { min: entry.tempo.min, max: entry.tempo.max }, tracks,
  };
}

export const sameGroove = (a, b) => !!a && !!b && a.meter === b.meter && a.res === b.res && a.bars === b.bars
  && DRUM_TRACKS.every((t) => (a.tracks[t] || '') === (b.tracks[t] || ''));

// A groove from a link, a favourite or storage, cleaned up; null if it doesn't
// fit the meter. source is kept only if it's a string (it may name a My groove
// from another device, which still plays).
export function validGroove(raw, meter) {
  if (!raw || typeof raw !== 'object' || raw.meter !== meter || raw.res !== 16 || !GROOVE_BARS.includes(raw.bars)) return null;
  const { min, max } = raw.tempo || {};
  if (!isNum(min) || !isNum(max) || min < 40 || max > 220 || min > max) return null;
  if (!raw.tracks || typeof raw.tracks !== 'object') return null;
  const names = Object.keys(raw.tracks);
  const len = raw.bars * meterInfo(meter).stepsPerBar;
  if (!names.length || names.some((t) => !DRUM_TRACKS.includes(t))) return null;
  if (names.some((t) => typeof raw.tracks[t] !== 'string' || raw.tracks[t].length !== len || !/^[xXo.]+$/.test(raw.tracks[t]))) return null;
  return grooveFrom({ ...raw, id: typeof raw.source === 'string' ? raw.source : null });
}

// The library entry with the same meter, res, bars and tracks, or null.
// Matched by content, so it stays right as My grooves come and go.
export const findGroove = (lib, groove) => (groove && lib.grooves.find((g) => sameGroove(g, groove))) || null;

// Clean up an idea from a link, a favourite or localStorage. Anything bad is
// reset and reported in `missing` (layer names) so the app can re-roll just
// those layers. Returns null if it isn't an idea at all.
export function validateIdea(raw, lib) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sections) || !raw.sections[0]) return null;
  const idea = blankIdea();
  const missing = new Set();
  const src = raw.sections[0];
  const sec = idea.sections[0];

  if (TONICS.includes(raw.key?.tonic)) idea.key.tonic = raw.key.tonic; else missing.add('tonic');
  if (MODES[raw.key?.mode]) idea.key.mode = raw.key.mode; else missing.add('mode');
  if (raw.feel?.type === 'swing') idea.feel = { type: 'swing', swing: isNum(raw.feel.swing) ? Math.min(0.7, Math.max(0, raw.feel.swing)) : 0.55 };
  if (isNum(raw.tempo) && raw.tempo >= 40 && raw.tempo <= 220) idea.tempo = Math.round(raw.tempo); else missing.add('tempo');

  // Only meters with grooves and strums; anything else falls back to 4/4,
  // and a groove or strum that doesn't match is rerolled below.
  const meter = METERS.includes(raw.meter) ? raw.meter : '4/4';
  idea.meter = meter;
  // v1–v3 held a built-in groove id; v4 holds the groove itself.
  const oldGroove = typeof src.groove === 'string' ? lib.builtInGrooves.find((g) => g.id === src.groove) : null;
  const groove = oldGroove ? (oldGroove.meter === meter ? grooveFrom(oldGroove) : null) : validGroove(src.groove, meter);
  if (groove) sec.groove = groove; else missing.add('groove');
  // v1/v2 held a built-in strum id; v3 holds the pattern itself.
  const old = typeof src.strum === 'string' ? lib.builtInStrums.find((s) => s.id === src.strum) : null;
  const strum = old ? (old.meter === meter ? strumFrom(old) : null) : validStrum(src.strum, meter);
  if (strum) sec.strum = strum; else missing.add('strum');

  const p = src.progression;
  const stepsPerBar = meterInfo(meter).stepsPerBar;
  // Each length is snapped to the nearest step first: a length edited in the
  // Loop can be a third of a bar, which floating point only gets close to.
  const bars = Array.isArray(p?.bars) && p.bars.every(isNum)
    ? p.bars.map((b) => Math.round(b * stepsPerBar) / stepsPerBar) : null;
  const progOk = bars && Array.isArray(p.chords)
    && p.chords.length > 0 && p.chords.length <= 16 && p.chords.length === bars.length
    && p.chords.every((c) => parseNumeral(c))
    && bars.every((b) => b > 0)
    && sumBars(bars) <= 16;
  if (progOk) {
    sec.progression = {
      source: typeof p.source === 'string' ? p.source : 'generated',
      mode: MODES[p.mode] ? p.mode : idea.key.mode,
      chords: [...p.chords],
      bars,
    };
    sec.bars = sumBars(bars);
  } else missing.add('chords');

  if ([0, 1, 2].includes(src.color?.level) && Number.isInteger(src.color?.seed)) sec.color = { ...src.color };
  else missing.add('color');

  return { idea, missing: [...missing] };
}

// Share links: the whole idea, as base64url JSON in the URL hash.
export function encodeIdea(idea) {
  const bytes = new TextEncoder().encode(JSON.stringify(idea));
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeIdea(str) {
  try {
    const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return null;
  }
}

export const keyName = (idea) => `${idea.key.tonic} ${MODES[idea.key.mode].name}`;

// Saved names: "Eb Phrygian · 131 · motorik". The groove word is the matching
// library groove's first tag, or the last word of its id (or of the groove's
// source, when nothing matches) if it has no tags.
export function ideaTitle(idea, lib) {
  const groove = sectionOf(idea).groove;
  const g = findGroove(lib, groove);
  const id = g?.id ?? groove?.source ?? '';
  const word = g?.tags?.[0] || id.replace(/^groove_|_\d+$/g, '').split('_').pop();
  return [keyName(idea), idea.tempo, word].filter(Boolean).join(' · ');
}
