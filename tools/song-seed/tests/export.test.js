import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { LAYERS, rollAll, seededRng } from '../js/randomize.js';
import { blankIdea, withSection, grooveFrom } from '../js/idea.js';
import { compileLoop } from '../js/loop.js';
import { PPQ } from '../js/midi.js';
import { drumEvents, drumsMidi, chordEvents, chordsMidi, chordTrackName, midiFilename, DRUM_NOTES, TICKS_PER_STEP } from '../js/export.js';
import { chordFor, colorize, guitarVoicing } from '../js/theory.js';
import { readTracks } from './midi-reader.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const BAR = 4 * PPQ; // 4/4

// A D dorian idea at 112 BPM with the given groove (by id) and loop length.
function ideaWith(grooveId, bars = 4, patch = {}) {
  const groove = grooveFrom(LIB.grooveById.get(grooveId));
  const base = rollAll(blankIdea(), { ...none, meter: true }, LIB, seededRng(7));
  const progression = { source: 'generated', mode: 'dorian', chords: Array(bars).fill(0).map((_, i) => (i % 2 ? 'IV' : 'i')), bars: Array(bars).fill(1) };
  return withSection({ ...base, tempo: 112, key: { tonic: 'D', mode: 'dorian' }, feel: { type: 'straight', swing: 0 }, ...patch }, { groove, progression, bars });
}

const hitsOf = (events, note) => events.filter((e) => e.note === note).map((e) => e.tick);

test('drums use GM notes on channel 10, one 16th long, at the right ticks', () => {
  const idea = ideaWith('groove_straight_push_01', 1);
  const events = drumEvents(compileLoop(idea, LIB));
  const at = (...steps) => steps.map((s) => s * TICKS_PER_STEP);
  assert.equal(TICKS_PER_STEP, 120);
  assert.deepEqual(hitsOf(events, 36), at(0, 8, 11));
  assert.deepEqual(hitsOf(events, 38), at(4, 12));
  assert.deepEqual(hitsOf(events, 42), at(0, 2, 4, 6, 8, 10, 12, 14));
  assert.equal(events.length, 13);
  assert.ok(events.every((e) => e.channel === 10 && e.duration === TICKS_PER_STEP));
  const ticks = events.map((e) => e.tick);
  assert.deepEqual(ticks, [...ticks].sort((a, b) => a - b));
});

test('accent, hit and ghost velocities are 120, 96 and 45', () => {
  const driving = drumEvents(compileLoop(ideaWith('groove_straight_driving_01', 1), LIB));
  assert.deepEqual(driving.filter((e) => e.note === 42).map((e) => e.velocity), [120, 96, 120, 96, 120, 96, 120, 96]);
  const ballad = drumEvents(compileLoop(ideaWith('groove_ballad_soft_01', 1), LIB));
  assert.deepEqual(ballad.filter((e) => e.note === 38).map((e) => e.velocity), [45, 45]);
  assert.deepEqual(ballad.filter((e) => e.note === 36).map((e) => e.velocity), [96, 96]);
});

test('the groove tiles across the whole loop, and the file ends at the loop length', () => {
  // A 2-bar groove in an 8-bar loop plays four times.
  const idea = ideaWith('groove_slowcore_01', 8);
  const loop = compileLoop(idea, LIB);
  const kicks = hitsOf(drumEvents(loop), 36);
  const once = [0, 10, 16, 24].map((s) => s * TICKS_PER_STEP);
  assert.deepEqual(kicks, [0, 1, 2, 3].flatMap((n) => once.map((t) => t + n * 2 * BAR)));

  const tracks = readTracks(drumsMidi(idea, loop).bytes);
  assert.equal(tracks.length, 2);
  for (const t of tracks) assert.deepEqual([t.at(-1).meta, t.at(-1).tick], [0x2f, 8 * BAR]);
  assert.ok(tracks[1].filter((e) => e.kind === 0x80).every((e) => e.tick <= 8 * BAR));
});

test('every library groove exports only known notes and velocities', () => {
  const notes = new Set(Object.values(DRUM_NOTES));
  for (const g of LIB.grooves) {
    const loop = compileLoop(ideaWith(g.id, 4), LIB);
    const events = drumEvents(loop);
    const hits = Object.keys(DRUM_NOTES).reduce((n, t) => n + loop.drums[t].filter(Boolean).length, 0);
    assert.equal(events.length, hits, g.id);
    assert.ok(events.every((e) => notes.has(e.note) && [120, 96, 45].includes(e.velocity)), g.id);
    assert.ok(events.every((e) => e.tick < loop.totalSteps * TICKS_PER_STEP), g.id);
  }
});

test('cymbal goes out on note 42, and nothing is written on 46', () => {
  assert.deepEqual(DRUM_NOTES, { kick: 36, snare: 38, cymbal: 42 });
  for (const g of LIB.grooves) {
    const loop = compileLoop(ideaWith(g.id, 4), LIB);
    const events = drumEvents(loop);
    assert.ok(!events.some((e) => e.note === 46), g.id);
    assert.equal(hitsOf(events, 42).length, loop.drums.cymbal.filter(Boolean).length, g.id);
  }
});

test('file name, tempo and track name', () => {
  const name = (t) => new TextDecoder().decode(Uint8Array.from(t.find((e) => e.meta === 0x03).data));
  const straight = ideaWith('groove_lofi_01');
  const out = drumsMidi(straight, compileLoop(straight, LIB));
  assert.equal(out.filename, 'D-dorian_112bpm_drums.mid');
  assert.ok(out.bytes instanceof Uint8Array);
  const [tempo, drums] = readTracks(out.bytes);
  assert.equal(tempo.find((e) => e.meta === 0x51).data.reduce((n, b) => n * 256 + b, 0), Math.round(60_000_000 / 112));
  assert.deepEqual(tempo.find((e) => e.meta === 0x58).data.slice(0, 2), [4, 2]);
  assert.equal(name(drums), 'groove_lofi_01');

  const swung = ideaWith('groove_shuffle_01', 4, { feel: { type: 'swing', swing: 0.55 } });
  const [, swungDrums] = readTracks(drumsMidi(swung, compileLoop(swung, LIB)).bytes);
  assert.equal(name(swungDrums), 'groove_shuffle_01 swing');
  // Straight grid: swing doesn't move any hit off its step.
  assert.ok(swungDrums.filter((e) => e.kind).every((e) => e.tick % TICKS_PER_STEP === 0));

  assert.equal(midiFilename({ key: { tonic: 'Eb', mode: 'aeolian' }, tempo: 74 }, 'drums'), 'Eb-aeolian_74bpm_drums.mid');
});

// A C major idea at 96 BPM with the given progression (and chord colour).
function chordIdea(chords, bars, color = { level: 0, seed: 1 }) {
  const base = ideaWith('groove_straight_basic_01', 4, { tempo: 96, key: { tonic: 'C', mode: 'ionian' } });
  const total = bars.reduce((a, b) => a + b, 0);
  return withSection(base, { progression: { source: 'generated', mode: 'ionian', chords, bars }, bars: total, color });
}

// One entry per chord: [start tick, length, notes], in time order.
function blocks(events) {
  const byTick = new Map();
  for (const e of events) {
    if (!byTick.has(e.tick)) byTick.set(e.tick, { tick: e.tick, duration: e.duration, notes: [] });
    byTick.get(e.tick).notes.push(e.note);
  }
  return [...byTick.values()].map((b) => [b.tick, b.duration, b.notes]);
}

test('chords start on their bars and last their full length, half bars included', () => {
  const idea = chordIdea(['I', 'V', 'vi', 'IV', 'V'], [1, 1, 1, 0.5, 0.5]);
  const loop = compileLoop(idea, LIB);
  const events = chordEvents(loop);
  const half = BAR / 2;
  assert.deepEqual(blocks(events).map(([t, d]) => [t, d]), [[0, BAR], [BAR, BAR], [2 * BAR, BAR], [3 * BAR, half], [3 * BAR + half, half]]);
  assert.ok(events.every((e) => e.channel === 1 && e.velocity === 90));
  // Each block is the chord's guitar voicing, the same notes the app plays.
  const voice = (n) => { const c = chordFor(n, 'C'); return guitarVoicing(c.rootPc, c.intervals); };
  assert.deepEqual(blocks(events).map(([, , notes]) => notes), ['I', 'V', 'vi', 'IV', 'V'].map(voice));
});

test('a long chord is one held block, not one per bar', () => {
  const loop = compileLoop(chordIdea(['I', 'IV', 'V'], [2, 1, 1]), LIB);
  assert.deepEqual(blocks(chordEvents(loop)).map(([t, d]) => [t, d]), [[0, 2 * BAR], [2 * BAR, BAR], [3 * BAR, BAR]]);
  assert.equal(chordTrackName(loop), 'C | % | F | G');
});

test('chord colour is in the exported notes, as heard', () => {
  const chords = ['I', 'vi', 'IV', 'V'];
  const seed = [...Array(200).keys()].find((n) => colorize(chords, 'ionian', 2, n).join() !== chords.join());
  assert.ok(seed !== undefined);
  const coloured = colorize(chords, 'ionian', 2, seed);
  const loop = compileLoop(chordIdea(chords, [1, 1, 1, 1], { level: 2, seed }), LIB);
  const heard = coloured.map((n) => { const c = chordFor(n, 'C'); return guitarVoicing(c.rootPc, c.intervals); });
  assert.deepEqual(blocks(chordEvents(loop)).map(([, , notes]) => notes), heard);
  assert.equal(chordTrackName(loop), coloured.map((n) => chordFor(n, 'C').symbol).join(' | '));
});

test('chords file: name, tempo, track name, and it ends where the drums file ends', () => {
  const idea = chordIdea(['I', 'V', 'vi', 'IV', 'V'], [1, 1, 1, 0.5, 0.5]);
  const loop = compileLoop(idea, LIB);
  const out = chordsMidi(idea, loop);
  assert.equal(out.filename, 'C-ionian_96bpm_chords.mid');
  const [tempo, chords] = readTracks(out.bytes);
  assert.equal(tempo.find((e) => e.meta === 0x51).data.reduce((n, b) => n * 256 + b, 0), Math.round(60_000_000 / 96));
  const name = new TextDecoder().decode(Uint8Array.from(chords.find((e) => e.meta === 0x03).data));
  assert.equal(name, 'C | G | Am | F G');
  assert.equal(chords.filter((e) => e.kind === 0x90).length, chordEvents(loop).length);

  const drums = readTracks(drumsMidi(idea, loop).bytes);
  const ends = (tracks) => tracks.map((t) => t.at(-1).tick);
  assert.deepEqual(ends(readTracks(out.bytes)), ends(drums));
  assert.deepEqual(ends(drums), [4 * BAR, 4 * BAR]);

  const flat = { ...idea, key: { tonic: 'Bb', mode: 'mixolydian' } };
  assert.equal(chordTrackName(compileLoop(flat, LIB)), 'Bb | F | Gm | Eb F');
});
