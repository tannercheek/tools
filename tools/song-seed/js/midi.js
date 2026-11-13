// A small Standard MIDI File writer: format 1, a tempo track, then note tracks.
// Pure: no DOM, no dependencies. Returns bytes; saving them is the caller's job.
import { meterInfo } from './loop.js';

export const PPQ = 480; // ticks per quarter note

const VLQ_MAX = 0x0fffffff; // the largest value four VLQ bytes can hold
const NOTE_OFF_VELOCITY = 64;
const text = new TextEncoder();

// Variable-length quantity: 7 bits per byte, high bit set on every byte but the last.
export function vlq(n) {
  if (!Number.isInteger(n) || n < 0 || n > VLQ_MAX) throw new RangeError(`Bad VLQ value: ${n}`);
  const out = [n & 0x7f];
  for (n >>>= 7; n > 0; n >>>= 7) out.unshift((n & 0x7f) | 0x80);
  return out;
}

const u16 = (n) => [(n >> 8) & 0xff, n & 0xff];
const u32 = (n) => [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

function meta(type, data) {
  return [0xff, type, ...vlq(data.length), ...data];
}

function checkInt(name, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) throw new RangeError(`Bad ${name}: ${value}`);
}

// Note-offs go before note-ons at the same tick, so a repeated note is re-struck,
// not cut short. Otherwise events keep their input order.
function noteMessages(events) {
  const out = [];
  events.forEach((e, i) => {
    checkInt('tick', e.tick, 0, VLQ_MAX);
    checkInt('duration', e.duration, 1, VLQ_MAX);
    checkInt('note', e.note, 0, 127);
    checkInt('velocity', e.velocity, 1, 127);
    checkInt('channel', e.channel, 1, 16); // 1–16, as Logic numbers them
    const ch = e.channel - 1;
    out.push({ tick: e.tick, order: 1, i, bytes: [0x90 | ch, e.note, e.velocity] });
    out.push({ tick: e.tick + e.duration, order: 0, i, bytes: [0x80 | ch, e.note, NOTE_OFF_VELOCITY] });
  });
  return out.sort((a, b) => a.tick - b.tick || a.order - b.order || a.i - b.i);
}

// messages: [{ tick, bytes }] in time order. The track ends at `length` ticks,
// or at its last event if that comes later.
function trackChunk(name, messages, length) {
  const data = [0, ...meta(0x03, [...text.encode(name)])];
  let now = 0;
  for (const m of messages) {
    data.push(...vlq(m.tick - now), ...m.bytes);
    now = m.tick;
  }
  data.push(...vlq(Math.max(0, length - now)), ...meta(0x2f, []));
  return [...ascii('MTrk'), ...u32(data.length), ...data];
}

// song: { bpm, meter, name, length, tracks: [{ name, events: [{ tick, note, velocity, duration, channel }] }] }
// `length` (ticks, optional) sets where every track ends, so a loop that ends in
// silence still imports at its full length.
export function writeMidi({ bpm, meter = '4/4', name = '', length = 0, tracks = [] }) {
  if (!(bpm > 0)) throw new RangeError(`Bad tempo: ${bpm}`);
  checkInt('length', length, 0, VLQ_MAX);
  const { beats, unit } = meterInfo(meter);
  const usPerQuarter = Math.round(60_000_000 / bpm);
  checkInt('tempo', usPerQuarter, 1, 0xffffff);

  const tempoTrack = trackChunk(name, [
    // beats, unit as a power of two, 24 MIDI clocks per click, 8 32nds per quarter
    { tick: 0, bytes: meta(0x58, [beats, Math.log2(unit), 24, 8]) },
    { tick: 0, bytes: meta(0x51, [(usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff]) },
  ], length);

  const header = [...ascii('MThd'), ...u32(6), ...u16(1), ...u16(tracks.length + 1), ...u16(PPQ)];
  const noteTracks = tracks.flatMap((t) => trackChunk(t.name ?? '', noteMessages(t.events ?? []), length));
  return Uint8Array.from([...header, ...tempoTrack, ...noteTracks]);
}
