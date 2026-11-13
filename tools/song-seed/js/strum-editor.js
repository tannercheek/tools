// Strum patterns as the idea holds them (PLAN step 14): editing, resizing,
// matching a pattern to a library entry, and My strums. Pure (no DOM), so Node
// tests can run it. The page side is lane-bars.js (the Strum row) and
// strum-lane.js (the Loop's strum lane, step 22).
//
// The idea's strum is { source, res, bars, pattern }, in the idea's meter.
// source is the id it was picked or rolled from ('mine-…' for a My strum), or null.
import { METERS, meterInfo } from './loop.js';

export const STROKES = ['D', 'U', 'x', '.'];
export const STROKE_NAMES = { D: 'Down', U: 'Up', x: 'Mute', '.': 'Rest' };
export const STRUM_BARS = [1, 2];
export const STRUM_RES = [8, 16];
const MINE_ID_RE = /^mine-[a-z0-9]+$/;

// Characters in one bar: a 4/4 bar is 8 in 8ths, 16 in 16ths; 3/4 and 6/8 are 6 / 12.
export const cellsPerBar = (meter, res) => (meterInfo(meter).stepsPerBar * res) / 16;

// A library entry (built-in or My strum) as the idea stores it.
export const strumFrom = (entry) => ({ source: entry.id, res: entry.res, bars: entry.bars, pattern: entry.pattern });

export const sameStrum = (a, b) => !!a && !!b && a.res === b.res && a.bars === b.bars && a.pattern === b.pattern;
export const hasStroke = (strum) => /[DUx]/.test(strum.pattern);
export const isMine = (id) => typeof id === 'string' && id.startsWith('mine-');

// A strum from a link, a favourite or storage, cleaned up; null if it doesn't
// fit the meter. source is kept only if it's a string (it may name a My strum
// from another device, which still plays).
export function validStrum(raw, meter) {
  if (!raw || typeof raw !== 'object') return null;
  const { source, res, bars, pattern } = raw;
  if (!STRUM_RES.includes(res) || !STRUM_BARS.includes(bars)) return null;
  if (typeof pattern !== 'string' || pattern.length !== bars * cellsPerBar(meter, res) || !/^[DUx.]+$/.test(pattern)) return null;
  return { source: typeof source === 'string' ? source : null, res, bars, pattern };
}

// The library entry with the same meter, res, bars and pattern, or null.
// Matched by content, so it stays right as My strums come and go.
export const findStrum = (lib, strum, meter) =>
  (strum && lib.strums.find((s) => s.meter === meter && sameStrum(s, strum))) || null;

// The pattern cell that loop step s (a 16th) plays, since the pattern tiles
// across the loop: editing a repeat edits the pattern.
export const strumCellAt = (strum, s) => ((s * strum.res) / 16) % strum.pattern.length;

export function setStroke(strum, i, c) {
  if (!STROKES.includes(c) || i < 0 || i >= strum.pattern.length) return strum;
  return { ...strum, pattern: strum.pattern.slice(0, i) + c + strum.pattern.slice(i + 1) };
}

// Change bars, grid or meter, keeping every stroke that still has a place. Each
// bar keeps its start (a 4/4 bar cut to 3/4 loses its last beat), extra bars
// repeat the ones there (as playback tiles them), and 16ths between 8ths are
// dropped going to 8ths. `dropped` counts the strokes that were lost.
export function resizeStrum(strum, meter, { to = meter, res = strum.res, bars = strum.bars } = {}) {
  const oldPer = cellsPerBar(meter, strum.res);
  const newPer = cellsPerBar(to, res);
  const out = new Array(bars * newPer).fill('.');
  let dropped = 0;
  [...strum.pattern].forEach((c, i) => {
    if (c === '.') return;
    const bar = Math.floor(i / oldPer);
    const j = ((i % oldPer) * res) / strum.res;
    if (bar >= bars || !Number.isInteger(j) || j >= newPer) { dropped++; return; }
    for (let b = bar; b < bars; b += strum.bars) out[b * newPer + j] = c;
  });
  return { strum: { ...strum, res, bars, pattern: out.join('') }, dropped };
}

// ---------- My strums ----------

// A new My strum from the idea's pattern. The id comes from the time it was
// added, never a list position.
export function makeMyStrum(strum, meter, now = Date.now()) {
  return {
    id: `mine-${now.toString(36)}`, meter, res: strum.res, bars: strum.bars, pattern: strum.pattern,
    addedAt: new Date(now).toISOString(),
  };
}

// Newest first, like Saved. Nothing is added if the pattern is already there.
export function addMyStrum(mine, entry) {
  if (mine.some((s) => s.meter === entry.meter && sameStrum(s, entry))) return mine;
  return [entry, ...mine];
}

export const removeMyStrum = (mine, id) => mine.filter((s) => s.id !== id);

// My strums from the synced store: anything malformed or repeated is dropped.
export function cleanMyStrums(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.filter((s) => {
    if (!s || !MINE_ID_RE.test(s.id) || seen.has(s.id) || !METERS.includes(s.meter)) return false;
    if (!validStrum(s, s.meter) || typeof s.addedAt !== 'string') return false;
    seen.add(s.id);
    return true;
  }).map(({ id, meter, res, bars, pattern, addedAt }) => ({ id, meter, res, bars, pattern, addedAt }));
}

// ---------- counts ----------

// How a musician counts cell i of a bar: 1 & 2 & in 8ths, 1 e & a in 16ths.
// In 6/8 the 8th is the beat, so 8ths count 1 2 3 4 5 6 and 16ths 1 & 2 &.
const SUBDIVISIONS = { 1: [''], 2: ['', '&'], 4: ['', 'e', '&', 'a'] };
export function countLabel(meter, res, i) {
  const perBeat = res / meterInfo(meter).unit;
  const pos = i % cellsPerBar(meter, res);
  const sub = SUBDIVISIONS[perBeat][pos % perBeat];
  return sub || String(Math.floor(pos / perBeat) + 1);
}

// Is cell i the start of a felt beat (the dotted quarter in 6/8)?
export function isPulse(meter, res, i) {
  const pulseCells = (meterInfo(meter).pulse * res) / 16;
  return (i % cellsPerBar(meter, res)) % pulseCells === 0;
}
