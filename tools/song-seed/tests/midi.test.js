import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeMidi, vlq, PPQ } from '../js/midi.js';
import { readTracks } from './midi-reader.js';

test('VLQ encodes the edge values', () => {
  assert.deepEqual(vlq(0), [0x00]);
  assert.deepEqual(vlq(127), [0x7f]);
  assert.deepEqual(vlq(128), [0x81, 0x00]);
  assert.deepEqual(vlq(16383), [0xff, 0x7f]);
  assert.deepEqual(vlq(16384), [0x81, 0x80, 0x00]);
  assert.deepEqual(vlq(0x0fffffff), [0xff, 0xff, 0xff, 0x7f]);
  for (const bad of [-1, 0x10000000, 1.5, NaN]) assert.throws(() => vlq(bad), RangeError, String(bad));
});

test('one note writes byte-exact', () => {
  const bytes = writeMidi({
    bpm: 120, meter: '4/4', name: 'T',
    tracks: [{ name: 'N', events: [{ tick: 0, note: 60, velocity: 100, duration: 480, channel: 1 }] }],
  });
  const want = [
    // MThd, length 6, format 1, 2 tracks, 480 ticks per quarter
    0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, 2, 0x01, 0xe0,
    // MTrk, 24 bytes
    0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 24,
    0x00, 0xff, 0x03, 0x01, 0x54, //                   track name "T"
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08, // time signature 4/4
    0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20, //       tempo 500,000 µs per quarter = 120 BPM
    0x00, 0xff, 0x2f, 0x00, //                         end of track
    // MTrk, 18 bytes
    0x4d, 0x54, 0x72, 0x6b, 0, 0, 0, 18,
    0x00, 0xff, 0x03, 0x01, 0x4e, //  track name "N"
    0x00, 0x90, 0x3c, 0x64, //        note on, channel 1, middle C, velocity 100
    0x83, 0x60, 0x80, 0x3c, 0x40, //  480 ticks later: note off
    0x00, 0xff, 0x2f, 0x00, //        end of track
  ];
  assert.deepEqual([...bytes], want);
  assert.ok(bytes instanceof Uint8Array);
});

test('events come out in time order, note-offs before note-ons on the same tick', () => {
  const events = [
    { tick: 960, note: 64, velocity: 90, duration: 240, channel: 10 },
    { tick: 0, note: 60, velocity: 90, duration: 480, channel: 10 },
    { tick: 480, note: 60, velocity: 80, duration: 480, channel: 10 }, // re-strikes 60 as the first one ends
    { tick: 480, note: 36, velocity: 120, duration: 120, channel: 10 },
  ];
  const [, track] = readTracks(writeMidi({ bpm: 100, tracks: [{ name: 'drums', events }] }));
  const notes = track.filter((e) => e.kind);
  const ticks = notes.map((e) => e.tick);
  assert.deepEqual(ticks, [...ticks].sort((a, b) => a - b));
  const at480 = notes.filter((e) => e.tick === 480).map((e) => [e.kind === 0x90 ? 'on' : 'off', e.note]);
  assert.deepEqual(at480, [['off', 60], ['on', 60], ['on', 36]]);
  assert.ok(notes.every((e) => e.channel === 10));
  assert.deepEqual(notes.filter((e) => e.kind === 0x90).map((e) => e.note), [60, 60, 36, 64]);
});

test('every track ends with end-of-track, at the loop length when given', () => {
  const bars = 4;
  const length = bars * 4 * PPQ;
  const tracks = readTracks(writeMidi({
    bpm: 90, length,
    tracks: [{ name: 'a', events: [{ tick: 0, note: 40, velocity: 64, duration: 480, channel: 1 }] }, { name: 'b', events: [] }],
  }));
  assert.equal(tracks.length, 3);
  for (const t of tracks) {
    const last = t.at(-1);
    assert.deepEqual([last.meta, last.tick], [0x2f, length]);
    assert.equal(t.filter((e) => e.meta === 0x2f).length, 1);
  }
});

test('tempo, meter and names are written', () => {
  const [tempo, notes] = readTracks(writeMidi({ bpm: 112, meter: '6/8', name: 'D dorian', tracks: [{ name: 'Gm7 · C', events: [] }] }));
  const find = (t, type) => t.find((e) => e.meta === type).data;
  const us = find(tempo, 0x51).reduce((n, b) => n * 256 + b, 0);
  assert.equal(us, Math.round(60_000_000 / 112));
  assert.deepEqual(find(tempo, 0x58).slice(0, 2), [6, 3]);
  assert.equal(new TextDecoder().decode(Uint8Array.from(find(tempo, 0x03))), 'D dorian');
  assert.equal(new TextDecoder().decode(Uint8Array.from(find(notes, 0x03))), 'Gm7 · C');
});

test('bad input is rejected', () => {
  const one = (e) => () => writeMidi({ bpm: 120, tracks: [{ name: 'x', events: [{ tick: 0, note: 60, velocity: 90, duration: 120, channel: 1, ...e }] }] });
  for (const bad of [{ note: 128 }, { velocity: 0 }, { channel: 0 }, { channel: 17 }, { duration: 0 }, { tick: -1 }, { tick: 1.5 }]) {
    assert.throws(one(bad), RangeError, JSON.stringify(bad));
  }
  assert.throws(() => writeMidi({ bpm: 0 }), RangeError);
});
