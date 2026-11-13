// Idea v3: the strum's pattern lives in the idea, and My strums join the
// rolls (PLAN step 14). From step 22 the strokes are edited in the Loop.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, withMine } from '../js/library.js';
import { LAYERS, rollAll, rollLayer, withMeter, seededRng } from '../js/randomize.js';
import { IDEA_VERSION, blankIdea, validateIdea, encodeIdea, decodeIdea, sectionOf, withSection, grooveFrom } from '../js/idea.js';
import { METERS, compileLoop } from '../js/loop.js';
import { strumFrom, setStroke, sameStrum, validStrum, findStrum, makeMyStrum, strumCellAt } from '../js/strum-editor.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const strumOf = (idea) => sectionOf(idea).strum;

// What the app does with an idea from a link or a favourite: validate, then
// reroll only the layers that came back broken.
function load(raw, lib = LIB, rng = seededRng(1)) {
  const v = validateIdea(raw, lib);
  const keep = Object.fromEntries(LAYERS.map((l) => [l, !v.missing.includes(l)]));
  return { ...v, loaded: v.missing.length ? rollAll(v.idea, keep, lib, rng) : v.idea };
}

const V2 = {
  version: 2, tempo: 96, meter: '3/4',
  feel: { type: 'swing', swing: 0.55 },
  key: { tonic: 'A', mode: 'aeolian' },
  tuning: null,
  sections: [{
    id: 'A', name: 'Loop', bars: 4, meter: null,
    groove: LIB.grooves.find((g) => g.meter === '3/4').id, strum: 'strum_waltz_classic_01',
    progression: { source: 'generated', mode: 'aeolian', chords: ['i', 'bVI', 'bVII', 'i'], bars: [1, 1, 1, 1] },
    color: { level: 2, seed: 42 },
  }],
  arrangement: ['A'],
};
const WALTZ = { source: 'strum_waltz_classic_01', res: 8, bars: 1, pattern: 'D.DUDU' };
const V2_GROOVE = grooveFrom(LIB.grooveById.get(V2.sections[0].groove)); // idea v4 holds the groove itself

test('a v2 link loads with the pattern of its strum id', () => {
  const v = validateIdea(decodeIdea(encodeIdea(V2)), LIB);
  assert.deepEqual(v.missing, []);
  assert.equal(v.idea.version, IDEA_VERSION);
  assert.deepEqual(strumOf(v.idea), WALTZ);
  assert.deepEqual(v.idea, { ...V2, version: IDEA_VERSION, sections: [{ ...V2.sections[0], strum: WALTZ, groove: V2_GROOVE }] });
});

test('a v2 favourite loads the same way', () => {
  const fav = { id: 'fav-lq3k9x2a', name: 'A Aeolian · 96 · waltz', savedAt: '2026-11-01T10:00:00Z', idea: V2 };
  const { missing, loaded } = load(JSON.parse(JSON.stringify(fav)).idea);
  assert.deepEqual(missing, []);
  assert.deepEqual(strumOf(loaded), WALTZ);
  assert.deepEqual(compileLoop(loaded, LIB).strum.slice(0, 12), ['D', null, null, null, 'D', null, 'U', null, 'D', null, 'U', null]);
});

test('a v2 strum id that is unknown or in another meter is rerolled', () => {
  for (const strum of ['strum_renamed_99', 'strum_classic_01']) {
    const raw = { ...V2, sections: [{ ...V2.sections[0], strum }] };
    const { missing, loaded } = load(raw);
    assert.deepEqual(missing, ['strum'], strum);
    assert.deepEqual(validStrum(strumOf(loaded), '3/4'), strumOf(loaded));
    assert.deepEqual(sectionOf(loaded).progression, V2.sections[0].progression, 'the rest is kept');
  }
});

test('broken v3 strums are rerolled, and nothing else is', () => {
  const idea = rollAll(blankIdea(), { ...none, meter: true }, LIB, seededRng(2));
  assert.equal(idea.meter, '4/4');
  const good = strumOf(idea);
  const broken = [
    { ...good, pattern: good.pattern.slice(1) },                  // wrong length
    { ...good, res: 8, bars: 1, pattern: 'D.DUDU' },              // a 3/4 bar in 4/4
    { ...good, pattern: `Q${good.pattern.slice(1)}` },            // bad characters
    { ...good, pattern: `d${good.pattern.slice(1)}` },
    { ...good, res: 4 }, { ...good, res: '8' }, { ...good, bars: 3 }, { ...good, bars: 0 },
    { source: good.source }, null, 7, [],
  ];
  const rng = seededRng(3);
  const without = (x) => ({ ...x, sections: [{ ...sectionOf(x), strum: null }] });
  for (const strum of broken) {
    const { missing, loaded } = load(withSection(idea, { strum }), LIB, rng);
    assert.deepEqual(missing, ['strum'], JSON.stringify(strum));
    assert.deepEqual(validStrum(strumOf(loaded), '4/4'), strumOf(loaded));
    assert.deepEqual(without(loaded), without(idea), 'only the strum changed');
  }
});

test('a strum from an unknown My strum still loads and plays', () => {
  const idea = rollAll(blankIdea(), { ...none, meter: true }, LIB, seededRng(4));
  const strum = { source: 'mine-zzz999', res: 16, bars: 2, pattern: 'D..U..x.D.U.x...'.repeat(2) };
  const v = validateIdea(decodeIdea(encodeIdea(withSection(idea, { strum }))), LIB);
  assert.deepEqual(v.missing, []);
  assert.deepEqual(strumOf(v.idea), strum);
  assert.equal(LIB.strumById.get(strum.source), undefined, 'so Start over has nothing to go back to');
  const loop = compileLoop(v.idea, LIB);
  assert.equal(loop.strumRes, 16);
  assert.equal(loop.strum[3], 'U');
});

test('compileLoop plays an edited pattern', () => {
  const rng = seededRng(12);
  for (let n = 0; n < 30; n++) {
    const idea = rollAll(blankIdea(), none, LIB, rng);
    const before = compileLoop(idea, LIB);
    const s = strumOf(idea);
    const i = s.pattern.indexOf('.') >= 0 ? s.pattern.indexOf('.') : 1;
    const edited = withSection(idea, { strum: setStroke(s, i, 'x') });
    const loop = compileLoop(edited, LIB);
    const at = i * (16 / s.res);
    assert.equal(loop.strum[at], 'x');
    // Tiled: the same step in every repeat of the pattern changes.
    const len = s.pattern.length * (16 / s.res);
    for (let k = at; k < loop.totalSteps; k += len) assert.equal(loop.strum[k], 'x');
    assert.deepEqual(loop.drums, before.drums);
    assert.deepEqual(loop.chords, before.chords);
  }
  // A 16th strum switches the grid to 16ths.
  const idea = rollAll(blankIdea(), { ...none, meter: true }, LIB, rng);
  const sixteenths = { source: null, res: 16, bars: 1, pattern: '...U............' };
  const loop = compileLoop(withSection(idea, { strum: sixteenths }), LIB);
  assert.ok(loop.usesSixteenths);
  assert.equal(loop.strum[3], 'U');
});

// PLAN step 22: the strokes are edited in the Loop's strum lane, where cells
// past the strum's length are its repeats.
test('compileLoop plays a pattern edited from the lane, in every repeat', () => {
  const rng = seededRng(13);
  for (const meter of METERS) {
    for (let n = 0; n < 20; n++) {
      const idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, rng);
      const before = compileLoop(idea, LIB);
      const s = strumOf(idea);
      const stride = 16 / s.res;
      assert.equal(before.strumSteps, s.pattern.length * stride, 'the strum’s own length, where its repeats start');
      // A cell in the loop's last repeat, as the lane would edit it.
      const step = before.totalSteps - stride;
      const i = strumCellAt(s, step);
      const c = s.pattern[i] === 'x' ? 'U' : 'x';
      const loop = compileLoop(withSection(idea, { strum: setStroke(s, i, c) }), LIB);
      for (let k = i * stride; k < loop.totalSteps; k += loop.strumSteps) assert.equal(loop.strum[k], c, `${meter} step ${k}`);
      const changed = loop.strum.flatMap((v, k) => (v === before.strum[k] ? [] : [k]));
      assert.equal(changed.length, loop.totalSteps / loop.strumSteps, 'one step per repeat, nothing else');
      assert.deepEqual(loop.drums, before.drums);
    }
  }
});

test('rolls in every meter return valid strum objects from the library', () => {
  const rng = seededRng(21);
  for (const meter of METERS) {
    for (let i = 0; i < 200; i++) {
      const idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, rng);
      const s = strumOf(idea);
      assert.deepEqual(validStrum(s, meter), s);
      const entry = LIB.strumById.get(s.source);
      assert.equal(entry.meter, meter);
      assert.ok(sameStrum(entry, s), 'a rolled strum is its entry\'s pattern');
      assert.equal(findStrum(LIB, s, meter), entry);
    }
  }
});

test('rolls include My strums, in their meter only', () => {
  const tight = { source: null, res: 8, bars: 1, pattern: 'D.DU.UDU' };
  // Variations on strums that sit well, so they make the top half by fit.
  const mine = [
    makeMyStrum({ ...tight, pattern: 'D.DUxUDU' }, '4/4', 1e12),
    makeMyStrum({ ...tight, pattern: 'D.DUDxDU' }, '4/4', 1e12 + 1),
    makeMyStrum({ res: 8, bars: 1, pattern: 'DxDUDU' }, '3/4', 1e12 + 2),
  ];
  const lib = withMine(LIB, { strums: mine });
  const rng = seededRng(22);
  const seen = new Set();
  for (const meter of METERS) {
    for (let i = 0; i < 400; i++) {
      const idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, lib, rng);
      const s = strumOf(idea);
      const entry = lib.strumById.get(s.source);
      assert.equal(entry.meter, meter);
      if (entry.id.startsWith('mine-')) seen.add(entry.id);
    }
  }
  assert.ok(seen.size >= 2, `My strums came up: ${[...seen]}`);
  // Without them in the library, they never do.
  for (let i = 0; i < 200; i++) assert.ok(!strumOf(rollAll(blankIdea(), none, LIB, rng)).source.startsWith('mine-'));
});

test('a strum reroll avoids the current pattern, even when it was edited from that strum', () => {
  const rng = seededRng(23);
  for (let n = 0; n < 20; n++) {
    const idea = rollAll(blankIdea(), none, LIB, rng);
    let same = 0;
    for (let i = 0; i < 50; i++) if (sameStrum(strumOf(rollLayer(idea, 'strum', LIB, {}, rng)), strumOf(idea))) same++;
    assert.ok(same <= 10, `landed on the same pattern ${same}/50`);
  }
  // An edited pattern is new to the pool, so the strum it came from can come back.
  const idea = rollAll({ ...blankIdea(), meter: '4/4' }, { ...none, meter: true }, LIB, rng);
  const s = strumOf(idea);
  const edited = withSection(idea, { strum: setStroke(s, 1, s.pattern[1] === 'x' ? 'U' : 'x') });
  let back = 0;
  for (let i = 0; i < 300; i++) if (strumOf(rollLayer(edited, 'strum', LIB, {}, rng)).source === s.source) back++;
  assert.ok(back > 0, 'the source strum is not blocked by its id');
});

test('reroll and Randomize replace an edited pattern; a locked one is kept', () => {
  const rng = seededRng(24);
  const idea = rollAll({ ...blankIdea(), meter: '4/4' }, { ...none, meter: true }, LIB, rng);
  const edited = withSection(idea, { strum: { ...strumOf(idea), pattern: 'x.x.x.x.'.padEnd(strumOf(idea).pattern.length, '.') } });
  assert.equal(findStrum(LIB, strumOf(edited), '4/4'), null, 'the edit is Custom');
  const rolled = rollLayer(edited, 'strum', LIB, {}, rng);
  assert.ok(findStrum(LIB, strumOf(rolled), '4/4'), 'a reroll lands on a library strum');
  for (let i = 0; i < 50; i++) {
    assert.deepEqual(strumOf(rollAll(edited, { ...none, strum: true }, LIB, rng)), strumOf(edited));
  }
});

test('a meter change rerolls an unlocked strum; a locked strum holds the meter', () => {
  const rng = seededRng(25);
  const start = rollAll({ ...blankIdea(), meter: '3/4' }, { ...none, meter: true }, LIB, rng);
  for (const meter of ['4/4', '6/8']) {
    const next = withMeter(start, meter, LIB, {}, rng);
    assert.deepEqual(validStrum(strumOf(next), meter), strumOf(next), meter);
    assert.equal(LIB.strumById.get(strumOf(next).source).meter, meter);
  }
  // 3/4 and 6/8 bars are the same length, but the strum is still rerolled.
  for (let i = 0; i < 30; i++) {
    assert.equal(LIB.strumById.get(strumOf(withMeter(start, '6/8', LIB, {}, rng)).source).meter, '6/8');
  }
  // A locked, edited strum keeps the meter through Randomize and the meter's dice.
  const edited = withSection(start, { strum: setStroke(strumOf(start), 1, 'x') });
  for (let i = 0; i < 100; i++) {
    const next = rollAll(edited, { ...none, strum: true }, LIB, rng);
    assert.equal(next.meter, '3/4');
    assert.deepEqual(strumOf(next), strumOf(edited));
    assert.equal(rollLayer(edited, 'meter', LIB, { strum: true }, rng).meter, '3/4');
  }
});

test('ideas store the pattern, so removing a My strum leaves them alone', () => {
  const mine = makeMyStrum({ res: 8, bars: 1, pattern: 'DxDxDUDU' }, '4/4', 1e12);
  const lib = withMine(LIB, { strums: [mine] });
  const idea = withSection(rollAll(blankIdea(), { ...none, meter: true }, lib, seededRng(26)), { strum: strumFrom(mine) });
  const saved = JSON.parse(JSON.stringify(idea));
  const after = validateIdea(saved, withMine(lib, { strums: [] }));
  assert.deepEqual(after.missing, []);
  assert.deepEqual(after.idea, idea);
  assert.deepEqual(compileLoop(after.idea, LIB).strum, compileLoop(idea, lib).strum);
});
