// Pure music theory: modes, Roman numerals, note spelling, voicings.
// No DOM, no audio — safe to import from Node tests.
//
// Roman numerals are relative to the MAJOR scale of the tonic, whatever the
// mode: "bVII" is always a major chord a whole step below the tonic, "iv" is
// always a minor chord on the 4th. Case = quality (upper major, lower minor),
// "°" = diminished. Optional suffix: maj7, 7, 9, 6, add9, sus2, sus4.

export const MAJOR = [0, 2, 4, 5, 7, 9, 11];
export const TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

// pool: chords the generator may use, with weights. signature: the chord(s)
// that make the mode sound like itself; generated progressions include one.
// colour: the scale degree (1–7) that defines the mode, shown in the melody helper.
export const MODES = {
  ionian: {
    label: 'Major (Ionian)', name: 'major', feel: 'Bright and resolved',
    steps: [0, 2, 4, 5, 7, 9, 11], colour: null, tonic: 'I', weight: 3,
    pool: { I: 4, ii: 2, iii: 1, IV: 3, V: 3, vi: 3 }, signature: ['IV', 'V'],
  },
  dorian: {
    label: 'Dorian', name: 'Dorian', feel: 'Minor but hopeful',
    steps: [0, 2, 3, 5, 7, 9, 10], colour: 6, tonic: 'i', weight: 2,
    pool: { i: 4, ii: 1.5, bIII: 2, IV: 3, v: 1.5, bVII: 2.5 }, signature: ['IV'],
  },
  phrygian: {
    label: 'Phrygian', name: 'Phrygian', feel: 'Dark and tense',
    steps: [0, 1, 3, 5, 7, 8, 10], colour: 2, tonic: 'i', weight: 1,
    pool: { i: 4, bII: 3, bIII: 2, iv: 2, bVI: 1.5, bvii: 1.5 }, signature: ['bII'],
  },
  lydian: {
    label: 'Lydian', name: 'Lydian', feel: 'Floaty and dreamy',
    steps: [0, 2, 4, 6, 7, 9, 11], colour: 4, tonic: 'I', weight: 1.5,
    pool: { I: 4, II: 3, iii: 1.5, V: 1, vi: 2, vii: 1 }, signature: ['II'],
  },
  mixolydian: {
    label: 'Mixolydian', name: 'Mixolydian', feel: 'Major but loose',
    steps: [0, 2, 4, 5, 7, 9, 10], colour: 7, tonic: 'I', weight: 2,
    pool: { I: 4, ii: 1, IV: 3, v: 1.5, vi: 1.5, bVII: 3 }, signature: ['bVII'],
  },
  aeolian: {
    label: 'Minor (Aeolian)', name: 'minor', feel: 'Melancholy',
    steps: [0, 2, 3, 5, 7, 8, 10], colour: 6, tonic: 'i', weight: 3,
    pool: { i: 4, bIII: 2.5, iv: 2.5, v: 1.5, bVI: 3, bVII: 3 }, signature: ['bVI', 'bVII'],
  },
  locrian: {
    label: 'Locrian', name: 'Locrian', feel: 'Unstable and uneasy',
    steps: [0, 1, 3, 5, 6, 8, 10], colour: 5, tonic: 'i°', weight: 0.2,
    pool: { 'i°': 3, bII: 2.5, biii: 1.5, iv: 1.5, bV: 2, bVI: 2, bvii: 1.5 }, signature: ['bV'],
  },
};
export const MODE_ORDER = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const AWKWARD = ['Cb', 'Fb', 'E#', 'B#'];

export const mod12 = (n) => ((n % 12) + 12) % 12;

export function notePc(name) {
  const m = /^([A-G])([#b]?)$/.exec(name);
  if (!m) throw new Error(`Bad note name: ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return mod12(LETTER_PC[LETTERS.indexOf(m[1])] + acc);
}

// Spell scale degree 1–7 of the tonic's major scale, moved by `alter`
// semitones. Uses the right letter (D Dorian's 3rd is F, not E#), but falls
// back to the plain name for double accidentals and Cb/Fb/E#/B#.
export function spellDegree(tonic, degree, alter = 0) {
  const letterIdx = (LETTERS.indexOf(tonic[0]) + degree - 1) % 7;
  const pc = mod12(notePc(tonic) + MAJOR[degree - 1] + alter);
  let diff = mod12(pc - LETTER_PC[letterIdx]);
  if (diff > 6) diff -= 12;
  const name = LETTERS[letterIdx] + (diff === 1 ? '#' : diff === -1 ? 'b' : '');
  if (Math.abs(diff) > 1 || AWKWARD.includes(name)) return (diff > 0 ? SHARP_NAMES : FLAT_NAMES)[pc];
  return name;
}

export function scaleNotes(tonic, modeKey) {
  return MODES[modeKey].steps.map((st, d) => spellDegree(tonic, d + 1, st - MAJOR[d]));
}

// Name any pitch class the way this key would: scale notes by their scale
// spelling, anything else with flats or sharps to match the key.
export function nameInKey(pc, tonic, modeKey) {
  const scale = scaleNotes(tonic, modeKey);
  const hit = scale.find((n) => notePc(n) === mod12(pc));
  if (hit) return hit;
  return (scale.some((n) => n.includes('b')) ? FLAT_NAMES : SHARP_NAMES)[mod12(pc)];
}

const NUMERAL_RE = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|o)?(maj7|add9|sus2|sus4|7|6|9)?$/;
const DEGREE = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7 };

export function parseNumeral(str) {
  const m = NUMERAL_RE.exec(String(str));
  if (!m) return null;
  const [, acc, rn, dim, ext] = m;
  const degree = DEGREE[rn.toLowerCase()];
  const alter = acc === 'b' ? -1 : acc === '#' ? 1 : 0;
  const quality = dim ? 'dim' : rn === rn.toUpperCase() ? 'maj' : 'min';
  return {
    degree, alter, quality, ext: ext || null,
    offset: mod12(MAJOR[degree - 1] + alter), // semitones above the tonic
    base: acc + rn + (dim ? '°' : ''),        // numeral without its suffix
  };
}

export const formatNumeral = (parsed, ext) => parsed.base + (ext || '');

export function chordIntervals(quality, ext) {
  let third = quality === 'maj' ? 4 : 3;
  const fifth = quality === 'dim' ? 6 : 7;
  if (ext === 'sus2') third = 2;
  if (ext === 'sus4') third = 5;
  const iv = [0, third, fifth];
  if (ext === 'maj7') iv.push(11);
  if (ext === '7') iv.push(10);
  if (ext === '9') iv.push(10, 14);
  if (ext === 'add9') iv.push(14);
  if (ext === '6') iv.push(9);
  return iv;
}

export function chordSuffix(quality, ext) {
  if (ext === 'sus2' || ext === 'sus4') return ext;
  if (quality === 'dim') return ext === '7' ? 'm7b5' : 'dim';
  const m = quality === 'min' ? 'm' : '';
  if (!ext) return m;
  if (ext === 'maj7') return m ? 'm(maj7)' : 'maj7';
  return m + ext; // 7, 9, 6, add9 → m7, m9, m6, madd9
}

export function chordFor(numeral, tonic) {
  const p = parseNumeral(numeral);
  if (!p) throw new Error(`Can't read chord "${numeral}"`);
  const root = spellDegree(tonic, p.degree, p.alter);
  const rootPc = notePc(root);
  const intervals = chordIntervals(p.quality, p.ext);
  return {
    numeral, root, rootPc, intervals,
    quality: p.quality,
    symbol: root + chordSuffix(p.quality, p.ext),
    pcs: intervals.map((i) => mod12(rootPc + i)),
  };
}

// A guitar-ish voicing as MIDI notes: bass root between E2 and D#3, then
// 5th, root, 3rd and colour tones stacked upward (no minor 2nds), topped up
// to six notes with 5ths and roots. Gives open-chord shapes for E, Am, C…
export function guitarVoicing(rootPc, intervals) {
  const bass = 40 + mod12(rootPc - 4);
  const fifth = intervals.find((i) => i === 7 || i === 6);
  const others = intervals.filter((i) => i !== 0 && i !== fifth).sort((a, b) => a - b);
  const notes = [bass];
  const place = (iv) => {
    const target = mod12(rootPc + iv);
    let m = notes[notes.length - 1] + 2;
    while (mod12(m) !== target) m++;
    return m;
  };
  for (const iv of [...(fifth != null ? [fifth] : []), 0, ...others]) {
    const m = place(iv);
    if (m > 79) break; // chord tones may reach G5; extra doublings stop at E5
    notes.push(m);
  }
  const fill = fifth != null ? [fifth, 0] : [0];
  for (let k = 0; notes.length < 6; k++) {
    const m = place(fill[k % fill.length]);
    if (m > 76) break;
    notes.push(m);
  }
  return notes;
}

// Deterministic 0–1 hash, so colour choices stay put between renders.
export function hash01(...ints) {
  let h = 2166136261;
  for (const n of ints) {
    h ^= n | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

const COLOUR_CHANCE = [0, 0.4, 0.8]; // Plain, Some, Lots
const EXT_OPTIONS = {
  maj: ['add9', 'maj7', 'sus2', '7', '6', 'sus4'],
  min: ['7', '7', 'add9', '9'],
  dim: [],
};

// Add colour (add9, maj7, sus…) to plain numerals. Only uses extensions
// whose added notes are in the mode's scale, so colour never clashes.
// Numerals that already carry a suffix are left alone.
export function colorize(numerals, modeKey, level, seed) {
  const scale = new Set(MODES[modeKey].steps);
  return numerals.map((n, i) => {
    const p = parseNumeral(n);
    if (!p || p.ext || !level) return n;
    if (hash01(seed, i, 0) >= COLOUR_CHANCE[level]) return n;
    const opts = EXT_OPTIONS[p.quality]
      .map((ext, j) => ({ ext, r: hash01(seed, i, j + 1) }))
      .sort((a, b) => a.r - b.r)
      .map((o) => o.ext);
    const base = chordIntervals(p.quality, null);
    for (const ext of opts) {
      const added = chordIntervals(p.quality, ext).filter((x) => !base.includes(x));
      if (added.every((x) => scale.has(mod12(p.offset + x)))) return formatNumeral(p, ext);
    }
    return n;
  });
}

// The 12 notes around the circle of fifths, C at the top then clockwise
// (C G D A E B F# Db Ab Eb Bb F by pitch class), marked for a key and mode.
// `chords` are compiled chords (anything with a rootPc), so colour never
// moves a root. chordIdx lists the chords rooted on each note.
export function circleOfFifths(tonic, modeKey, chords = []) {
  const mode = MODES[modeKey];
  const tonicPc = notePc(tonic);
  const scale = mode.steps.map((st) => mod12(tonicPc + st));
  const colourPc = mode.colour ? scale[mode.colour - 1] : null;
  return Array.from({ length: 12 }, (_, i) => {
    const pc = mod12(i * 7);
    return {
      pc,
      name: nameInKey(pc, tonic, modeKey),
      inScale: scale.includes(pc),
      isTonic: pc === tonicPc,
      isColour: pc === colourPc,
      chordIdx: chords.flatMap((c, j) => (c.rootPc === pc ? [j] : [])),
    };
  });
}
