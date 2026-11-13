// My grooves and My progressions: synced, in the roll pool, and removable
// (PLAN step 17).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, withMine } from '../js/library.js';
import { cleanMine, idTaken, addMine, removeMine } from '../js/my-library.js';
import { LAYERS, rollAll, rollLayer, seededRng, shapeOf } from '../js/randomize.js';
import { blankIdea, validateIdea, sectionOf, withSection, withProgression, grooveFrom, findGroove } from '../js/idea.js';
import { METERS, compileLoop } from '../js/loop.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const AT = '2026-11-07T18:02:11.000Z';

const myGroove = (id, meter = '4/4', cymbal = 'x.x.x.x.x.x.xxx.') => ({
  id, meter, res: 16, bars: 1, tempo: { min: 70, max: 100 }, tags: [],
  tracks: { kick: meter === '4/4' ? 'x.....x.x.......' : 'x.....x.....', cymbal: meter === '4/4' ? cymbal : 'x.x.x.x.x.xx' },
  addedAt: AT,
});
const myProg = (id, mode = 'aeolian', chords = ['i', 'bVI', 'bIII', 'bVII'], bars = [1, 1, 1, 1]) =>
  ({ id, mode, chords, bars, addedAt: AT });

// ---------- clean, add, remove ----------

test('stored My grooves are checked as they load', () => {
  const a = myGroove('groove_lofi_lazy_03');
  const b = myGroove('lazy take 2', '3/4');
  assert.deepEqual(cleanMine('grooves', [a, b]), [a, b], 'good entries are kept as they are');
  assert.deepEqual(cleanMine('grooves', [a, { ...a, extra: 1 }]), [a], 'duplicates go');
  assert.deepEqual(cleanMine('grooves', [{ ...a, extra: 1 }]), [a], 'extra fields go');
  assert.deepEqual(cleanMine('grooves', [{ ...a, tags: undefined }]), [a], 'missing tags become []');
  const bad = [
    null, 'groove', { ...a, id: '' }, { ...a, id: 7 }, { ...a, addedAt: undefined },
    { ...a, meter: '5/4' }, { ...a, res: 8 }, { ...a, bars: 3 },
    { ...a, tempo: { min: 120, max: 90 } }, { ...a, tempo: { min: 30, max: 90 } },
    { ...a, tracks: {} }, { ...a, tracks: { ...a.tracks, hatOpen: 'x...............' } },
    { ...a, tracks: { kick: 'x.......' } }, { ...a, tracks: { kick: 'x..q............' } },
    { ...b, meter: '4/4' },
  ];
  for (const g of bad) assert.deepEqual(cleanMine('grooves', [g]), [], JSON.stringify(g));
  for (const raw of [undefined, null, {}, 'x']) assert.deepEqual(cleanMine('grooves', raw), []);
});

test('stored My progressions are checked as they load', () => {
  const a = myProg('prog_aeolian_drift_02');
  const half = myProg('drift b', 'dorian', ['i7', 'IV', 'bVII'], [2, 1.5, 0.5]);
  assert.deepEqual(cleanMine('progressions', [a, half]), [a, half]);
  assert.deepEqual(cleanMine('progressions', [a, { ...a, weight: 3, tags: ['x'] }]), [a], 'duplicates and extra fields go');
  const bad = [
    { ...a, mode: 'blues' }, { ...a, chords: ['i', 'bVI', 'bIII', 'Q'] }, { ...a, chords: 'i bVI' },
    { ...a, bars: [1, 1, 1] }, { ...a, bars: [1, 1, 1, 0.3] }, { ...a, bars: [1, 1, 1, 0] },
    { ...a, chords: [], bars: [] }, { ...a, bars: [8, 8, 1, 1] }, { ...a, addedAt: 5 },
  ];
  for (const p of bad) assert.deepEqual(cleanMine('progressions', [p]), [], JSON.stringify(p));
});

test('adding puts the newest first, and removing goes by id', () => {
  const a = myGroove('groove_mine_one_01'), b = myGroove('groove_mine_two_01');
  const one = addMine([], a, LIB, 'grooves');
  const two = addMine(one, b, LIB, 'grooves');
  assert.deepEqual(two, [b, a]);
  assert.deepEqual(one, [a], 'nothing is mutated');
  assert.deepEqual(removeMine(two, a.id), [b]);
  assert.equal(removeMine(two, 'nope').length, 2);

  const p = myProg('prog_mine_one_01');
  assert.deepEqual(removeMine(addMine([], p, LIB, 'progressions'), p.id), []);
});

test('an id already in either library is refused', () => {
  const builtInGroove = LIB.grooves[0].id;
  const builtInProg = LIB.progressions[0].id;
  assert.ok(idTaken(LIB, 'grooves', builtInGroove));
  assert.ok(!idTaken(LIB, 'grooves', builtInProg), 'grooves and progressions are separate lists');

  const mine = [myGroove('groove_mine_one_01')];
  assert.equal(addMine(mine, myGroove(builtInGroove), LIB, 'grooves'), mine, 'a built-in id');
  assert.equal(addMine(mine, myGroove('groove_mine_one_01', '3/4'), LIB, 'grooves'), mine, 'a My groove id');
  // Also refused when only the library knows it (the list passed in is stale).
  const lib = withMine(LIB, { grooves: mine });
  assert.equal(addMine([], myGroove('groove_mine_one_01'), lib, 'grooves').length, 0);

  const progs = [myProg('prog_mine_one_01')];
  assert.equal(addMine(progs, myProg(builtInProg), LIB, 'progressions'), progs);
  assert.equal(addMine(progs, myProg('prog_mine_one_01', 'dorian'), LIB, 'progressions'), progs);
});

// ---------- the library ----------

test('My grooves and progressions follow the built-ins in the library', () => {
  const g = myGroove('groove_mine_one_01'), p = myProg('prog_mine_one_01');
  const lib = withMine(LIB, { grooves: [g], progressions: [p] });
  assert.deepEqual(lib.grooves, [...LIB.grooves, g]);
  assert.deepEqual(lib.progressions, [...LIB.progressions, p]);
  assert.equal(lib.grooveById.get(g.id), g);
  assert.equal(lib.progressionById.get(p.id), p);
  assert.deepEqual(lib.myGrooves, [g]);
  assert.deepEqual(lib.myProgressions, [p]);
  assert.equal(lib.builtInGrooves, LIB.builtInGrooves);
  assert.equal(lib.builtInProgressions, LIB.builtInProgressions);
  assert.equal(findGroove(lib, grooveFrom(g)), g);

  // A list that's left out is kept; one that's passed replaces the last.
  const s = { id: 'mine-abc', meter: '4/4', res: 8, bars: 1, pattern: 'D.DU.UDU', addedAt: AT };
  const more = withMine(lib, { strums: [s] });
  assert.deepEqual(more.myGrooves, [g]);
  assert.deepEqual(more.myStrums, [s]);
  const fewer = withMine(more, { grooves: [] });
  assert.deepEqual(fewer.grooves, LIB.grooves);
  assert.deepEqual(fewer.myProgressions, [p]);
  assert.deepEqual(fewer.myStrums, [s]);
  assert.equal(LIB.myGrooves.length + LIB.myProgressions.length, 0, 'the built-in library is not changed');
});

test('a My entry whose id became a built-in is left out', () => {
  const clash = myGroove(LIB.grooves[0].id);
  const lib = withMine(LIB, { grooves: [clash], progressions: [myProg(LIB.progressions[0].id)] });
  assert.deepEqual(lib.grooves, LIB.grooves);
  assert.deepEqual(lib.progressions, LIB.progressions);
  assert.equal(lib.grooveById.get(clash.id), LIB.grooves[0]);
  assert.deepEqual(lib.myGrooves, []);
});

// ---------- rolls ----------

test('rolls include My grooves, in their meter only', () => {
  const mine = [myGroove('groove_mine_four_01'), myGroove('groove_mine_three_01', '3/4')];
  const lib = withMine(LIB, { grooves: mine });
  const rng = seededRng(31);
  const seen = new Set();
  for (const meter of METERS) {
    let idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, lib, rng);
    for (let i = 0; i < 300; i++) {
      idea = rollLayer(idea, 'groove', lib, none, rng);
      const g = sectionOf(idea).groove;
      assert.equal(g.meter, meter);
      const mineHit = mine.find((m) => m.id === g.source);
      if (mineHit) {
        assert.equal(mineHit.meter, meter);
        assert.deepEqual(g, grooveFrom(mineHit));
        seen.add(g.source);
      }
    }
  }
  assert.deepEqual([...seen].sort(), mine.map((m) => m.id).sort());
});

test('rolls include My progressions, and keep the mode, Bars and Chords', () => {
  const mine = [
    myProg('prog_mine_four_01'),                                                     // aeolian, 4 bars, 4 chords
    myProg('prog_mine_eight_01', 'aeolian', ['i', 'bVII', 'bVI', 'bVII'], [2, 2, 2, 2]), // 8 bars, 4 chords
    myProg('prog_mine_three_01', 'aeolian', ['i', 'bVI', 'bVII'], [2, 1, 1]),           // 4 bars, 3 chords
    myProg('prog_mine_dorian_01', 'dorian', ['i', 'IV'], [2, 2]),
  ];
  const lib = withMine(LIB, { progressions: mine });
  const counts = (locks, seed) => {
    const rng = seededRng(seed);
    let idea = rollAll({ ...blankIdea(), key: { tonic: 'A', mode: 'aeolian' } }, { ...none, mode: true }, lib, rng);
    idea = withProgression(idea, { source: 'generated', mode: 'aeolian', chords: ['i', 'bVI', 'bIII', 'bVII'], bars: [1, 1, 1, 1] });
    const held = shapeOf(sectionOf(idea).progression);
    const hits = {};
    for (let i = 0; i < 600; i++) {
      idea = rollLayer(idea, 'chords', lib, locks, rng);
      const prog = sectionOf(idea).progression;
      assert.equal(prog.mode, 'aeolian');
      if (locks.bars) assert.equal(shapeOf(prog).bars, held.bars);
      if (locks.count) assert.equal(shapeOf(prog).count, held.count);
      const m = mine.find((x) => x.id === prog.source);
      if (m) {
        assert.equal(m.mode, 'aeolian', 'only progressions in the mode');
        assert.deepEqual(prog.chords, m.chords);
        assert.deepEqual(prog.bars, m.bars);
        hits[m.id] = (hits[m.id] || 0) + 1;
      }
    }
    return hits;
  };
  assert.deepEqual(Object.keys(counts(none, 41)).sort(), ['prog_mine_eight_01', 'prog_mine_four_01', 'prog_mine_three_01']);
  assert.deepEqual(Object.keys(counts({ ...none, bars: true }, 42)).sort(), ['prog_mine_four_01', 'prog_mine_three_01']);
  assert.deepEqual(Object.keys(counts({ ...none, count: true }, 43)).sort(), ['prog_mine_eight_01', 'prog_mine_four_01']);
  assert.deepEqual(Object.keys(counts({ ...none, bars: true, count: true }, 44)), ['prog_mine_four_01']);
});

// ---------- removing ----------

test('removing a My groove or progression leaves an idea that uses it unchanged', () => {
  const g = myGroove('groove_mine_one_01'), p = myProg('prog_mine_one_01');
  const lib = withMine(LIB, { grooves: [g], progressions: [p] });
  let idea = rollAll({ ...blankIdea(), meter: '4/4', key: { tonic: 'A', mode: 'aeolian' } }, { ...none, meter: true, mode: true }, lib, seededRng(51));
  idea = withSection(idea, { groove: grooveFrom(g) });
  idea = withProgression(idea, { source: p.id, mode: p.mode, chords: [...p.chords], bars: [...p.bars] });

  const after = withMine(lib, {
    grooves: removeMine(lib.myGrooves, g.id),
    progressions: removeMine(lib.myProgressions, p.id),
  });
  assert.equal(after.grooveById.get(g.id), undefined);
  assert.equal(after.progressionById.get(p.id), undefined);

  const saved = JSON.parse(JSON.stringify(idea));
  const v = validateIdea(saved, after);
  assert.deepEqual(v.missing, []);
  assert.deepEqual(v.idea, idea);
  const before = compileLoop(idea, lib), now = compileLoop(v.idea, after);
  assert.deepEqual(now.drums, before.drums);
  assert.deepEqual(now.chords.map((c) => c.symbol), before.chords.map((c) => c.symbol));
  assert.equal(findGroove(after, sectionOf(v.idea).groove), null, 'the Drums select shows Custom');
});

test('an old groove id still loads from the built-ins, never a My groove', () => {
  const g = myGroove('groove_mine_one_01');
  const lib = withMine(LIB, { grooves: [g] });
  const raw = withSection(rollAll(blankIdea(), { ...none, meter: true }, LIB, seededRng(52)), { groove: g.id });
  raw.version = 3;
  assert.ok(validateIdea(raw, lib).missing.includes('groove'));
});
