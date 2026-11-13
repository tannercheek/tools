// Checks the hand-written library files, so a typo shows up as a failing test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { meterInfo, compileLoop } from '../js/loop.js';
import { blankIdea, withSection, validateIdea, encodeIdea, decodeIdea, grooveFrom } from '../js/idea.js';
import { parseNumeral, MODES } from '../js/theory.js';

const ID_RE = /^(groove|strum|prog)_[a-z0-9]+(_[a-z0-9]+)*_\d{2}$/;

test('ids are unique and match the pack naming', () => {
  const ids = [...LIB.grooves, ...LIB.strums, ...LIB.progressions].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate id');
  for (const id of ids) assert.match(id, ID_RE);
});

test('grooves have the right length for their meter, bars and res', () => {
  for (const g of LIB.grooves) {
    const m = meterInfo(g.meter);
    const want = g.bars * m.beats * (g.res / m.unit);
    assert.ok(g.tempo.min < g.tempo.max, `${g.id}: tempo range`);
    assert.ok(Object.keys(g.tracks).length, `${g.id}: no tracks`);
    for (const [t, s] of Object.entries(g.tracks)) {
      assert.ok(['kick', 'snare', 'cymbal'].includes(t), `${g.id}: unknown track ${t}`);
      assert.equal(s.length, want, `${g.id}.${t} should be ${want} characters`);
      assert.match(s, /^[xXo.]+$/, `${g.id}.${t} has a bad character`);
    }
  }
});

// The hi-hat tracks of the three grooves that had two of them before step 13
// merged them into one cymbal track, as they were then.
const BEFORE_CYMBAL = {
  groove_straight_push_01: ['x.x.x.x.x.x.x...', '..............x.'],
  groove_four_floor_01: ['..x...x...x...x.'],
  groove_six_eight_open_01: ['x.x.x.x.x.x.x.x.x.x.x...', '......................x.'],
};

test('the merged grooves keep every hi-hat hit in cymbal', () => {
  for (const [id, old] of Object.entries(BEFORE_CYMBAL)) {
    const g = LIB.grooveById.get(id);
    assert.ok(g, `${id} is still in the library`);
    for (const s of old) {
      [...s].forEach((c, i) => { if (c !== '.') assert.equal(g.tracks.cymbal[i], c, `${id}: hit ${i} lost`); });
    }
  }
});

test('an old link to groove_four_floor_01 loads and plays cymbal hits', () => {
  const old = withSection(blankIdea(), {
    groove: 'groove_four_floor_01', strum: 'strum_classic_01',
    progression: { source: 'generated', mode: 'ionian', chords: ['I', 'IV'], bars: [1, 1] }, bars: 2,
  });
  const v = validateIdea(decodeIdea(encodeIdea(old)), LIB);
  assert.deepEqual(v.missing, []);
  const strum = { source: 'strum_classic_01', res: 8, bars: 1, pattern: 'D.DU.UDU' };
  const groove = grooveFrom(LIB.grooveById.get('groove_four_floor_01'));
  assert.deepEqual(v.idea, withSection(old, { strum, groove }));
  const loop = compileLoop(v.idea, LIB);
  assert.deepEqual(Object.keys(loop.drums), ['cymbal', 'snare', 'kick']);
  const at = loop.drums.cymbal.flatMap((hit, s) => (hit ? [s] : []));
  assert.deepEqual(at, [2, 6, 10, 14, 18, 22, 26, 30]);
});

test('strums have the right length and characters', () => {
  for (const s of LIB.strums) {
    const m = meterInfo(s.meter);
    assert.equal(s.pattern.length, s.bars * m.beats * (s.res / m.unit), s.id);
    assert.match(s.pattern, /^[DUx.]+$/, s.id);
  }
});

test('progressions parse and fill a 2, 4 or 8 bar loop', () => {
  for (const p of LIB.progressions) {
    assert.ok(MODES[p.mode], `${p.id}: unknown mode`);
    assert.equal(p.chords.length, p.bars.length, `${p.id}: chords and bars differ in length`);
    for (const c of p.chords) assert.ok(parseNumeral(c), `${p.id}: can't read ${c}`);
    assert.ok([2, 4, 8].includes(p.bars.reduce((a, b) => a + b, 0)), `${p.id}: bars must add up to 2, 4 or 8`);
    for (const b of p.bars) assert.ok(Number.isInteger(b * 2) && b > 0, `${p.id}: bars must be whole or half`);
  }
});
