// Editing the groove in the Loop (PLAN step 19).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { LAYERS, rollAll, seededRng } from '../js/randomize.js';
import {
  GROOVE_BARS, blankIdea, validateIdea, encodeIdea, decodeIdea, sectionOf, withSection, grooveFrom, validGroove, findGroove, sameGroove,
} from '../js/idea.js';
import { METERS, VELOCITY, DRUM_TRACKS, compileLoop, meterInfo } from '../js/loop.js';
import { MARKS, setHit, moveHit, resizeGroove, patternIndex } from '../js/groove-editor.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const groove = (tracks, bars = 1) => ({ source: 'groove_test_01', meter: '4/4', res: 16, bars, tempo: { min: 80, max: 120 }, tracks });
const BASIC = groove({ kick: 'x.......x.......', snare: '....x.......x...' });

test('setHit puts any mark on one cell and ignores anything else', () => {
  assert.equal(setHit(BASIC, 'kick', 2, 'X').tracks.kick, 'x.X.....x.......');
  assert.equal(setHit(BASIC, 'snare', 4, 'o').tracks.snare, '....o.......x...');
  assert.equal(setHit(BASIC, 'kick', 0, '.').tracks.kick, '........x.......');
  assert.equal(setHit(BASIC, 'kick', 0, 'x'), BASIC, 'the same mark is no edit');
  for (const i of [16, -1, 1.5]) assert.equal(setHit(BASIC, 'kick', i, 'x'), BASIC, `cell ${i}`);
  assert.equal(setHit(BASIC, 'kick', 1, 'D'), BASIC);
  assert.equal(setHit(BASIC, 'cowbell', 1, 'x'), BASIC, 'only kick, snare and cymbal');
  assert.equal(BASIC.tracks.kick, 'x.......x.......', 'the groove is not mutated');
  const edited = setHit(BASIC, 'kick', 2, 'X');
  assert.equal(edited.source, BASIC.source, 'an edit keeps the groove it came from');
  assert.deepEqual(edited.tempo, BASIC.tempo, 'and its tempo range');
});

test('a hit on a missing track adds it, and a track left with no hits goes', () => {
  const added = setHit(BASIC, 'cymbal', 2, 'x');
  assert.equal(added.tracks.cymbal, '..x.............');
  assert.equal(setHit(BASIC, 'cymbal', 2, '.'), BASIC, 'a rest adds nothing');
  const back = setHit(added, 'cymbal', 2, '.');
  assert.deepEqual(back, BASIC);
  assert.ok(sameGroove(back, BASIC), 'so it matches the groove it came from again');
  // A groove keeps its tracks once none has a hit, since it needs one.
  const one = groove({ kick: 'x...............' });
  const silent = setHit(one, 'kick', 0, '.');
  assert.deepEqual(silent.tracks, { kick: '................' });
  assert.deepEqual(validGroove(silent, '4/4'), silent);
});

test('moveHit moves a hit, with its mark, onto an empty cell only', () => {
  assert.equal(moveHit(BASIC, 'kick', 0, 3).tracks.kick, '...x....x.......');
  assert.equal(moveHit(setHit(BASIC, 'kick', 0, 'X'), 'kick', 0, 15).tracks.kick, '........x......X');
  assert.equal(moveHit(BASIC, 'kick', 0, 8), BASIC, 'onto a hit');
  assert.equal(moveHit(BASIC, 'kick', 0, 0), BASIC);
  assert.equal(moveHit(BASIC, 'kick', 1, 3), BASIC, 'from a rest');
  for (const to of [16, -1, 2.5]) assert.equal(moveHit(BASIC, 'kick', 0, to), BASIC, `to ${to}`);
  assert.equal(moveHit(BASIC, 'cymbal', 0, 1), BASIC, 'a track it doesn’t have');
});

test('resizeGroove repeats what’s there going longer and drops the later bars going shorter', () => {
  const two = resizeGroove(BASIC, '4/4', 2);
  assert.equal(two.bars, 2);
  assert.deepEqual(two.tracks, { kick: BASIC.tracks.kick.repeat(2), snare: BASIC.tracks.snare.repeat(2) });
  const varied = setHit(two, 'snare', 31, 'o');
  assert.equal(resizeGroove(varied, '4/4', 8).tracks.snare, varied.tracks.snare.repeat(4));
  assert.deepEqual(resizeGroove(varied, '4/4', 1), BASIC);
  assert.equal(resizeGroove(BASIC, '4/4', 1), BASIC);
  assert.equal(resizeGroove(BASIC, '4/4', 3), BASIC);
  // A track whose hits were all in the dropped bars goes.
  const late = groove({ kick: 'x'.padEnd(32, '.'), cymbal: '.'.repeat(16) + 'x'.padEnd(16, '.') }, 2);
  assert.deepEqual(resizeGroove(late, '4/4', 1).tracks, { kick: 'x...............' });
  // 3/4 and 6/8 bars are 12 steps.
  const waltz = grooveFrom(LIB.grooves.find((g) => g.meter === '3/4' && g.bars === 1));
  assert.equal(resizeGroove(waltz, '3/4', 4).tracks.kick, waltz.tracks.kick.repeat(4));
});

test('patternIndex maps a loop cell to the pattern cell it repeats, as compileLoop plays it', () => {
  assert.equal(patternIndex(5, 16), 5);
  assert.equal(patternIndex(16, 16), 0);
  assert.equal(patternIndex(20, 16), 4);
  assert.equal(patternIndex(13, 12), 1, 'a bar of 3/4');
  assert.equal(patternIndex(9, 8), 1, 'a 1-bar strum in 8ths');
  for (const meter of METERS) {
    const idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, seededRng(7));
    const { groove: g, strum } = sectionOf(idea);
    const loop = compileLoop(idea, LIB);
    for (let s = 0; s < loop.totalSteps; s++) {
      for (const t of DRUM_TRACKS) {
        const track = g.tracks[t];
        assert.equal(loop.drums[t][s], track ? VELOCITY[track[patternIndex(s, track.length)]] || 0 : 0, `${meter} ${t} ${s}`);
      }
      const stride = 16 / strum.res;
      if (s % stride === 0) {
        const c = strum.pattern[patternIndex(s / stride, strum.pattern.length)];
        assert.equal(loop.strum[s], c === '.' ? null : c, `${meter} strum ${s}`);
      }
    }
  }
});

test('every edit and length in every meter is a groove the idea can hold', () => {
  const rng = seededRng(196);
  for (const meter of METERS) {
    for (const entry of LIB.grooves.filter((g) => g.meter === meter)) {
      let g = grooveFrom(entry);
      for (let k = 0; k < 40; k++) {
        const len = g.bars * meterInfo(meter).stepsPerBar;
        const track = DRUM_TRACKS[Math.floor(rng() * 3)];
        const cell = () => Math.floor(rng() * len);
        const r = rng();
        g = r < 0.5 ? setHit(g, track, cell(), MARKS[Math.floor(rng() * 4)])
          : r < 0.85 ? moveHit(g, track, cell(), cell())
          : resizeGroove(g, meter, GROOVE_BARS[Math.floor(rng() * 4)]);
        assert.deepEqual(validGroove(g, meter), g, `${entry.id} in ${meter}`);
        assert.equal(g.source, entry.id);
        assert.deepEqual(g.tempo, entry.tempo);
      }
    }
  }
});

test('an idea with an edited groove passes validateIdea() unchanged', () => {
  for (const meter of METERS) {
    let idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, seededRng(8));
    const g0 = sectionOf(idea).groove;
    const g = resizeGroove(setHit(g0, 'cymbal', 1, g0.tracks.cymbal?.[1] === 'o' ? 'X' : 'o'), meter, g0.bars === 2 ? 4 : 2);
    idea = withSection(idea, { groove: g });
    assert.deepEqual(validateIdea(decodeIdea(encodeIdea(idea)), LIB), { idea, missing: [] }, meter);
    assert.equal(findGroove(LIB, g), null, 'an edited groove shows Custom');
  }
});
