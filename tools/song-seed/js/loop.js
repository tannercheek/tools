// Turns an idea into a playable loop on a 16th-note grid.
// Everything is in steps; tempo is only applied by the audio engine.
import { chordFor, colorize, guitarVoicing } from './theory.js';

export const DRUM_TRACKS = ['cymbal', 'snare', 'kick']; // top → bottom
export const VELOCITY = { X: 1, x: 0.8, o: 0.35 };

// The meters the app has content for.
export const METERS = ['4/4', '3/4', '6/8'];

// "4/4" → 16 steps a bar; "6/8" → 12; "3/4" → 12.
// pulse: steps per felt beat. Compound meters (6/8, 9/8, 12/8) pulse on the
// dotted quarter (every 6 sixteenths); everything else on the beat.
export function meterInfo(meter) {
  const [beats, unit] = String(meter).split('/').map(Number);
  if (!beats || ![2, 4, 8, 16].includes(unit)) throw new Error(`Bad meter: ${meter}`);
  const stepsPerBeat = 16 / unit;
  const compound = unit === 8 && beats > 3 && beats % 3 === 0;
  return { beats, unit, stepsPerBar: (beats * 16) / unit, stepsPerBeat, pulse: compound ? 3 * stepsPerBeat : stepsPerBeat };
}

// Lengths in bars can be thirds (a 3/4 beat), and sums of thirds drift in
// floating point (3.9999… bars). Totals are rounded to the nearest 1/48 bar,
// a whole number of steps in every meter (16 a bar in 4/4, 12 in 3/4 and 6/8).
export const BAR_GRID = 48;
export const sumBars = (lengths) => Math.round(lengths.reduce((a, b) => a + b, 0) * BAR_GRID) / BAR_GRID;

// How late step s sounds under swing, in steps. Everything after the pulse
// starts is pushed late by `swing` steps (the 16ths next to the pulse by half),
// so in 4/4 the off-beat 8th is pushed, and in 6/8 the 2nd and 3rd 8ths are.
export function swingSteps(s, pulse, swing) {
  const pos = s % pulse;
  if (!swing || pos === 0) return 0;
  return pos === 1 || pos === pulse - 1 ? 0.5 * swing : swing;
}

// Expand a pattern string to one slot per 16th. res 8 → every other slot.
export function patternSteps(str, res) {
  const stride = 16 / res;
  const out = new Array(str.length * stride).fill(null);
  [...str].forEach((c, i) => { if (c !== '.') out[i * stride] = c; });
  return out;
}

export function compileLoop(idea, lib) {
  const sec = idea.sections[0];
  const meter = meterInfo(sec.meter || idea.meter);
  const totalSteps = Math.round(sec.bars * meter.stepsPerBar);
  const groove = sec.groove; // the groove itself (idea v4)
  const strum = sec.strum; // the pattern itself (idea v3)
  if (!groove?.tracks || !strum?.pattern) throw new Error('Missing groove or strum');

  const drums = {};
  let usesSixteenths = strum.res > 8;
  for (const t of DRUM_TRACKS) {
    const src = patternSteps(groove.tracks[t] || '', groove.res);
    drums[t] = Array.from({ length: totalSteps }, (_, i) => (src.length ? VELOCITY[src[i % src.length]] || 0 : 0));
    if (drums[t].some((v, i) => v && i % 2)) usesSixteenths = true;
  }

  const strumSrc = patternSteps(strum.pattern, strum.res);
  const strumAt = Array.from({ length: totalSteps }, (_, i) => strumSrc[i % strumSrc.length]);

  const prog = sec.progression;
  const numerals = colorize(prog.chords, idea.key.mode, sec.color.level, sec.color.seed);
  let start = 0;
  const chords = prog.bars.map((b, i) => {
    const len = Math.round(b * meter.stepsPerBar);
    const c = chordFor(numerals[i], idea.key.tonic);
    const chord = { ...c, base: prog.chords[i], start, end: start + len, voicing: guitarVoicing(c.rootPc, c.intervals) };
    start += len;
    return chord;
  });
  const chordIndexAt = new Array(totalSteps).fill(0);
  chords.forEach((c, i) => { for (let s = c.start; s < c.end && s < totalSteps; s++) chordIndexAt[s] = i; });

  // grooveSteps and strumSteps: each pattern's own length. Past it, its lanes
  // are its repeats.
  const grooveSteps = groove.bars * meter.stepsPerBar;
  const strumSteps = strumSrc.length;
  return { meter, totalSteps, bars: sec.bars, drums, grooveSteps, strum: strumAt, strumSteps, strumRes: strum.res, chords, chordIndexAt, usesSixteenths };
}
