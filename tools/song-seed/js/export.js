// Turns a compiled loop into MIDI files for Logic. Pure: builds events and
// bytes; downloading them is app.js's job.
import { VELOCITY } from './loop.js';
import { writeMidi, PPQ } from './midi.js';
import { chartBars } from './display.js';

export const TICKS_PER_STEP = PPQ / 4; // one 16th
export const DRUM_CHANNEL = 10;
export const DRUM_NOTES = { kick: 36, snare: 38, cymbal: 42 }; // General MIDI; cymbal goes out as closed hat
export const CHORD_CHANNEL = 1;
export const CHORD_VELOCITY = 90;
const DRUM_VELOCITY = { X: 120, x: 96, o: 45 };
// compileLoop() stores hits as 0–1 gains; map them back to MIDI velocities.
const VELOCITY_OF_GAIN = new Map(Object.entries(VELOCITY).map(([c, gain]) => [gain, DRUM_VELOCITY[c]]));

// Straight grid: swing is left to Logic, so every hit sits exactly on its step.
export function drumEvents(loop) {
  const events = [];
  for (const [track, note] of Object.entries(DRUM_NOTES)) {
    loop.drums[track].forEach((gain, step) => {
      if (!gain) return;
      events.push({ tick: step * TICKS_PER_STEP, note, velocity: VELOCITY_OF_GAIN.get(gain), duration: TICKS_PER_STEP, channel: DRUM_CHANNEL });
    });
  }
  return events.sort((a, b) => a.tick - b.tick);
}

// "D-dorian_112bpm_drums.mid"
export const midiFilename = (idea, part) => `${idea.key.tonic}-${idea.key.mode}_${idea.tempo}bpm_${part}.mid`;

export function drumsMidi(idea, loop) {
  const sec = idea.sections[0];
  const filename = midiFilename(idea, 'drums');
  const grooveName = sec.groove.source || 'drums';
  const bytes = writeMidi({
    bpm: idea.tempo,
    meter: sec.meter || idea.meter,
    name: filename.replace(/\.mid$/, ''),
    length: loop.totalSteps * TICKS_PER_STEP,
    tracks: [{ name: idea.feel.type === 'swing' ? `${grooveName} swing` : grooveName, events: drumEvents(loop) }],
  });
  return { filename, bytes };
}

// Block chords: each chord's guitar voicing, colour included (as heard),
// held from its first step to its last.
export function chordEvents(loop) {
  return loop.chords.flatMap((c) => c.voicing.map((note) => ({
    tick: c.start * TICKS_PER_STEP, note, velocity: CHORD_VELOCITY,
    duration: (c.end - c.start) * TICKS_PER_STEP, channel: CHORD_CHANNEL,
  })));
}

// The chord symbols as a bar-line chart: "Dm7 | G | C F | Dm7". A chord held
// over from the bar before shows "%". Accidentals stay b/# so any MIDI app reads them.
export const chordTrackName = (loop) =>
  chartBars(loop.chords, loop.meter)
    .map((parts) => parts.map((p) => (p.held ? '%' : loop.chords[p.index].symbol)).join(' '))
    .join(' | ');

export function chordsMidi(idea, loop) {
  const sec = idea.sections[0];
  const filename = midiFilename(idea, 'chords');
  const bytes = writeMidi({
    bpm: idea.tempo,
    meter: sec.meter || idea.meter,
    name: filename.replace(/\.mid$/, ''),
    length: loop.totalSteps * TICKS_PER_STEP,
    tracks: [{ name: chordTrackName(loop), events: chordEvents(loop) }],
  });
  return { filename, bytes };
}
