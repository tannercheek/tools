// Idea v4: the groove itself lives in the idea, so an imported groove survives
// a reload and travels in links (PLAN step 16).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { LAYERS, rollAll, rollLayer, withMeter, seededRng } from '../js/randomize.js';
import {
  IDEA_VERSION, blankIdea, validateIdea, encodeIdea, decodeIdea, sectionOf, withSection,
  grooveFrom, validGroove, findGroove, ideaTitle,
} from '../js/idea.js';
import { METERS, compileLoop } from '../js/loop.js';
import { drumsMidi } from '../js/export.js';
import { fingerprint } from '../js/display.js';
import { readTracks } from './midi-reader.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const grooveOf = (idea) => sectionOf(idea).groove;
const builtIn = (id) => LIB.grooveById.get(id);

// What the app does with an idea from a link or a favourite: validate, then
// reroll only the layers that came back broken.
function load(raw, lib = LIB, rng = seededRng(1)) {
  const v = validateIdea(raw, lib);
  const keep = Object.fromEntries(LAYERS.map((l) => [l, !v.missing.includes(l)]));
  return { ...v, loaded: v.missing.length ? rollAll(v.idea, keep, lib, rng) : v.idea };
}

// A rolled 4/4 idea, as v4 stores it.
const V4 = rollAll({ ...blankIdea(), meter: '4/4' }, { ...none, meter: true }, LIB, seededRng(5));
// The same idea as an older version stored it: the groove's id (and, before
// v3, the strum's id).
function older(version) {
  const raw = JSON.parse(JSON.stringify(V4));
  raw.version = version;
  raw.sections[0].groove = grooveOf(V4).source;
  if (version < 3) raw.sections[0].strum = sectionOf(V4).strum.source;
  return raw;
}

// A groove no library has: a My groove from another device.
const STRANGER = {
  source: 'groove_from_my_laptop_01', meter: '4/4', res: 16, bars: 1,
  tempo: { min: 70, max: 95 },
  tracks: { kick: 'X..x..x...x.....', cymbal: 'x.o.x.o.x.o.x.o.' },
};

test('IDEA_VERSION is 4, and a fresh idea holds a groove object', () => {
  assert.equal(IDEA_VERSION, 4);
  assert.equal(V4.version, 4);
  const g = grooveOf(V4);
  assert.deepEqual(Object.keys(g), ['source', 'meter', 'res', 'bars', 'tempo', 'tracks']);
  assert.deepEqual(g, grooveFrom(builtIn(g.source)));
});

test('v1, v2 and v3 links load with their groove’s tracks and tempo', () => {
  for (const version of [1, 2, 3]) {
    const raw = older(version);
    assert.equal(typeof raw.sections[0].groove, 'string');
    const v = validateIdea(decodeIdea(encodeIdea(raw)), LIB);
    assert.deepEqual(v.missing, [], `v${version}`);
    assert.deepEqual(v.idea, V4, `v${version}`);
    const g = builtIn(raw.sections[0].groove);
    assert.deepEqual(grooveOf(v.idea).tracks, g.tracks);
    assert.deepEqual(grooveOf(v.idea).tempo, g.tempo);
    assert.equal(grooveOf(v.idea).source, g.id);
    assert.deepEqual(compileLoop(v.idea, LIB).drums, compileLoop(V4, LIB).drums, 'sounds the same');
  }
});

test('v1, v2 and v3 favourites load the same way, and their fingerprints are unchanged', () => {
  for (const version of [1, 2, 3]) {
    const fav = { id: 'fav-lq3k9x2a', name: 'Saved', savedAt: '2026-11-01T10:00:00Z', idea: older(version) };
    const stored = JSON.parse(JSON.stringify(fav));
    // The Saved list draws the stored idea as it is.
    assert.deepEqual(fingerprint(stored.idea, LIB), fingerprint(V4, LIB), `v${version}`);
    const { missing, loaded } = load(stored.idea);
    assert.deepEqual(missing, [], `v${version}`);
    assert.deepEqual(loaded, V4, `v${version}`);
  }
});

test('an old groove id that is unknown or in another meter is rerolled, and the rest is kept', () => {
  const g34 = LIB.grooves.find((g) => g.meter === '3/4').id;
  for (const id of ['groove_renamed_99', g34]) {
    const raw = { ...older(3), sections: [{ ...older(3).sections[0], groove: id }] };
    const { missing, loaded } = load(raw);
    assert.deepEqual(missing, ['groove'], id);
    assert.deepEqual(validGroove(grooveOf(loaded), '4/4'), grooveOf(loaded));
    assert.deepEqual(sectionOf(loaded).strum, sectionOf(V4).strum);
    assert.deepEqual(sectionOf(loaded).progression, sectionOf(V4).progression);
  }
});

test('broken v4 grooves are rerolled', () => {
  const good = grooveOf(V4);
  const len = good.bars * 16;
  const broken = {
    'wrong track length': { ...good, tracks: { ...good.tracks, kick: 'x...' } },
    'track length for another meter': { ...good, tracks: { kick: 'x'.repeat(12 * good.bars) } },
    'bad characters': { ...good, tracks: { ...good.tracks, snare: 'D'.repeat(len) } },
    'an unknown track': { ...good, tracks: { ...good.tracks, hatOpen: '.'.repeat(len) } },
    'no tracks': { ...good, tracks: {} },
    'a track that is not a string': { ...good, tracks: { kick: 42 } },
    'res 8': { ...good, res: 8 },
    'bars 3': { ...good, bars: 3, tracks: { kick: 'x'.repeat(48) } },
    'bars 0': { ...good, bars: 0 },
    'another meter': { ...good, meter: '6/8' },
    'tempo min over max': { ...good, tempo: { min: 120, max: 90 } },
    'tempo out of range': { ...good, tempo: { min: 30, max: 90 } },
    'no tempo': { ...good, tempo: null },
    'not an object': 7,
    'missing': null,
  };
  for (const [why, groove] of Object.entries(broken)) {
    const raw = withSection(V4, { groove });
    const { missing, loaded } = load(JSON.parse(JSON.stringify(raw)));
    assert.deepEqual(missing, ['groove'], why);
    assert.deepEqual(validGroove(grooveOf(loaded), '4/4'), grooveOf(loaded), why);
    assert.deepEqual(sectionOf(loaded).strum, sectionOf(V4).strum, why);
  }
});

test('validGroove keeps a good groove, any track left out, and a string source only', () => {
  assert.deepEqual(validGroove(STRANGER, '4/4'), STRANGER);
  assert.equal(validGroove(STRANGER, '3/4'), null);
  assert.equal(validGroove({ ...STRANGER, source: 12 }, '4/4').source, null);
  const eight = { ...STRANGER, bars: 8, tracks: { snare: '....x.......x...'.repeat(8) } };
  assert.deepEqual(validGroove(eight, '4/4'), eight);
  const extra = validGroove({ ...STRANGER, tags: ['x'], addedAt: 'now' }, '4/4');
  assert.deepEqual(extra, STRANGER, 'only the idea’s fields are kept');
});

test('a groove with an unknown source loads and plays', () => {
  const raw = withSection(V4, { groove: STRANGER });
  const v = validateIdea(decodeIdea(encodeIdea(raw)), LIB);
  assert.deepEqual(v.missing, []);
  assert.deepEqual(grooveOf(v.idea), STRANGER);
  assert.equal(findGroove(LIB, grooveOf(v.idea)), null, 'shows as Custom');

  const loop = compileLoop(v.idea, LIB);
  assert.equal(loop.drums.kick[0], 1);
  assert.equal(loop.drums.cymbal[2], 0.35);
  assert.ok(loop.drums.snare.every((x) => x === 0), 'a left-out track is silent');
  assert.equal(loop.drums.kick.length, loop.totalSteps);

  const tracks = readTracks(drumsMidi(v.idea, loop).bytes);
  const name = String.fromCharCode(...tracks[1].find((e) => e.meta === 0x03).data);
  assert.equal(name, 'groove_from_my_laptop_01', 'Drums.mid track name from the source');
  assert.ok(fingerprint(v.idea, LIB).hits.length > 0);
  assert.equal(ideaTitle(v.idea, LIB).split(' · ').at(-1), 'laptop', 'saved name from the source');
});

test('findGroove matches by content, not id', () => {
  for (const g of LIB.grooves) assert.equal(findGroove(LIB, grooveFrom(g)), g, g.id);
  const g = LIB.grooves[0];
  assert.equal(findGroove(LIB, { ...grooveFrom(g), source: 'something_else_01' }), g);
  assert.equal(findGroove(LIB, { ...grooveFrom(g), source: null, tempo: { min: 40, max: 41 } }), g, 'tempo isn’t compared');
  const kick = (g.tracks.kick[0] === '.' ? 'x' : '.') + g.tracks.kick.slice(1);
  const nudged = { ...grooveFrom(g), tracks: { ...g.tracks, kick } };
  assert.equal(findGroove(LIB, nudged), null);
  assert.equal(findGroove(LIB, null), null);
});

test('rolls in every meter return valid groove objects and avoid the current groove', () => {
  const rng = seededRng(16);
  for (const meter of METERS) {
    let idea = rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, rng);
    let same = 0;
    for (let i = 0; i < 300; i++) {
      const next = rollLayer(idea, 'groove', LIB, {}, rng);
      const g = grooveOf(next);
      assert.deepEqual(validGroove(g, meter), g, meter);
      assert.ok(findGroove(LIB, g), 'rolled from the library');
      if (findGroove(LIB, g) === findGroove(LIB, grooveOf(idea))) same++;
      idea = next;
    }
    assert.ok(same < 30, `${meter}: landed on the current groove ${same}/300 times`);
  }
});

test('a reroll avoids the current groove by content, even under another source', () => {
  const rng = seededRng(8);
  const target = LIB.grooves.find((g) => g.meter === '6/8');
  const idea = withSection({ ...V4, meter: '6/8' }, { groove: { ...grooveFrom(target), source: 'mine-renamed' } });
  let same = 0;
  for (let i = 0; i < 400; i++) if (findGroove(LIB, grooveOf(rollLayer(idea, 'groove', LIB, {}, rng))) === target) same++;
  assert.ok(same < 30, `landed on it ${same}/400 times`);
});

test('tempo rolls inside the idea’s groove range, even a Custom one', () => {
  const rng = seededRng(3);
  const idea = withSection(V4, { groove: STRANGER });
  for (let i = 0; i < 200; i++) {
    const { tempo } = rollLayer(idea, 'tempo', LIB, {}, rng);
    assert.ok(tempo >= 70 && tempo <= 95, String(tempo));
  }
});

test('a locked groove holds the meter in Randomize, and a meter change rerolls an unlocked one', () => {
  const rng = seededRng(14);
  for (const groove of [grooveFrom(LIB.grooves.find((g) => g.meter === '3/4')), { ...STRANGER, source: null }]) {
    const meter = groove.meter;
    const start = rollAll(withSection({ ...V4, meter }, { groove }), { ...none, groove: true }, LIB, rng);
    assert.equal(start.meter, meter);
    for (let i = 0; i < 100; i++) {
      const next = rollAll(start, { ...none, groove: true }, LIB, rng);
      assert.equal(next.meter, meter);
      assert.deepEqual(grooveOf(next), groove);
      // The meter's own dice is held too.
      assert.equal(rollLayer(start, 'meter', LIB, { ...none, groove: true }, rng).meter, meter);
    }
  }
  // Unlocked, moving to another meter brings a groove in that meter.
  const moved = withMeter(V4, '6/8', LIB, {}, rng);
  assert.deepEqual(validGroove(grooveOf(moved), '6/8'), grooveOf(moved));
});
