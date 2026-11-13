// Editing the idea's groove in the Loop (PLAN step 19): placing, moving and
// re-weighting hits, and the groove's length. Pure (no DOM), so Node tests can
// run it. The page side is drum-lane.js (step 21).
//
// The idea's groove is { source, meter, res, bars, tempo, tracks } (idea v4).
// An edit keeps its source and tempo range.
import { DRUM_TRACKS } from './loop.js';
import { GROOVE_BARS, sameGroove } from './idea.js';
import { cellsPerBar } from './strum-editor.js';

export const MARKS = ['X', 'x', 'o', '.']; // accent, hit, ghost, rest
const HIT_RE = /[xXo]/;

// The pattern cell a loop cell plays, since patterns tile across the loop:
// cell 20 of a loop over a 16-cell groove is cell 4. Both are counted in the
// pattern's own cells (16ths for grooves, the strum's res for strums).
export const patternIndex = (step, length) => ((step % length) + length) % length;

// The groove cell that loop step s (a 16th) plays.
export const cellAt = (groove, s) =>
  patternIndex((s * groove.res) / 16, groove.bars * cellsPerBar(groove.meter, groove.res));

// A track with no hits is left out, as if the groove never had it, so adding
// and removing a hit leaves the groove as it was. If no track has a hit, they
// all stay, since a groove needs one.
function tidy(tracks) {
  const kept = Object.fromEntries(Object.entries(tracks).filter(([, s]) => HIT_RE.test(s)));
  return Object.keys(kept).length ? kept : tracks;
}

// Put a mark on cell i of a track. A track the groove doesn't have yet (no
// cymbal) is added when a hit goes on it.
export function setHit(groove, track, i, mark) {
  const length = groove.bars * cellsPerBar(groove.meter, groove.res);
  if (!DRUM_TRACKS.includes(track) || !MARKS.includes(mark) || !Number.isInteger(i) || i < 0 || i >= length) return groove;
  const old = groove.tracks[track] ?? '.'.repeat(length);
  if (old[i] === mark) return groove;
  return { ...groove, tracks: tidy({ ...groove.tracks, [track]: old.slice(0, i) + mark + old.slice(i + 1) }) };
}

// Move a hit along its track onto an empty cell.
export function moveHit(groove, track, from, to) {
  const old = groove.tracks[track];
  if (typeof old !== 'string' || !Number.isInteger(to) || old[to] !== '.' || !HIT_RE.test(old[from] ?? '')) return groove;
  const cells = [...old];
  cells[to] = cells[from];
  cells[from] = '.';
  return { ...groove, tracks: { ...groove.tracks, [track]: cells.join('') } };
}

// Earlier (dir -1) or Later (1) on the hit at loop step s: one column of the
// timeline's grid (stride steps) that way, onto an empty step. The loop's ends
// stop it. Past the groove's end it goes on into the next repeat, which is the
// groove's start, so a hit moves the same way from any repeat.
export function shiftHit(groove, track, s, dir, stride, loopSteps) {
  const to = s + dir * stride;
  if (to < 0 || to >= loopSteps) return groove;
  return moveHit(groove, track, cellAt(groove, s), cellAt(groove, to));
}

// Start over: the library groove this one came from, if it's still there and
// something has changed since.
export function startOverGroove(lib, groove) {
  const from = lib.grooveById.get(groove.source);
  return from && from.meter === groove.meter && !sameGroove(from, groove) ? from : null;
}

// 1, 2, 4 or 8 bars. Longer repeats what's there (as playback tiles it);
// shorter drops the later bars.
export function resizeGroove(groove, meter, bars) {
  if (!GROOVE_BARS.includes(bars) || bars === groove.bars) return groove;
  const length = bars * cellsPerBar(meter, groove.res);
  const tracks = Object.fromEntries(Object.entries(groove.tracks).map(([t, s]) =>
    [t, Array.from({ length }, (_, k) => s[patternIndex(k, s.length)]).join('')]));
  return { ...groove, bars, tracks: tidy(tracks) };
}
