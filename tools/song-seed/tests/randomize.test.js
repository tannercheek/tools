import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { LAYERS, rollAll, rollLayer, seededRng, generateProgression, strumFit } from '../js/randomize.js';
import { IDEA_VERSION, blankIdea, validateIdea, encodeIdea, decodeIdea, sectionOf } from '../js/idea.js';
import { compileLoop, meterInfo } from '../js/loop.js';
import { MODE_ORDER, MODES } from '../js/theory.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));

test('a fresh roll is always a valid, playable idea', () => {
  const rng = seededRng(1);
  for (let i = 0; i < 300; i++) {
    const idea = rollAll(blankIdea(), none, LIB, rng);
    const v = validateIdea(idea, LIB);
    assert.deepEqual(v.missing, [], JSON.stringify(idea));
    const sec = sectionOf(idea);
    const g = sec.groove;
    assert.ok(idea.tempo >= g.tempo.min && idea.tempo <= g.tempo.max, 'tempo inside the groove range');
    assert.equal(sec.progression.mode, idea.key.mode);
    const loop = compileLoop(idea, LIB);
    assert.equal(loop.totalSteps, sec.bars * meterInfo(idea.meter).stepsPerBar);
    assert.equal(loop.chords.at(-1).end, loop.totalSteps);
  }
});

test('locked layers never change', () => {
  const rng = seededRng(7);
  const start = rollAll(blankIdea(), none, LIB, rng);
  const locks = { ...none, tonic: true, groove: true, chords: true };
  for (let i = 0; i < 100; i++) {
    const next = rollAll(start, locks, LIB, rng);
    assert.equal(next.key.tonic, start.key.tonic);
    assert.deepEqual(sectionOf(next).groove, sectionOf(start).groove);
    assert.deepEqual(sectionOf(next).progression, sectionOf(start).progression);
    assert.equal(next.key.mode, sectionOf(start).progression.mode, 'mode follows locked chords');
  }
});

test('a locked tempo steers the groove pick toward grooves that fit it', () => {
  const rng = seededRng(3);
  let fits = 0;
  for (let i = 0; i < 200; i++) {
    const idea = { ...rollAll(blankIdea(), { ...none, meter: true }, LIB, rng), tempo: 140 };
    const g = sectionOf(rollLayer(idea, 'groove', LIB, { tempo: true }, rng)).groove;
    if (140 >= g.tempo.min && 140 <= g.tempo.max) fits++;
  }
  assert.ok(fits > 100, `only ${fits}/200 fit`);
});

test('generated progressions follow the rules', () => {
  const rng = seededRng(11);
  for (const mode of MODE_ORDER) {
    for (let i = 0; i < 200; i++) {
      const p = generateProgression(mode, rng);
      const n = p.chords.length;
      assert.ok([2, 4, 8].includes(p.bars.reduce((a, b) => a + b, 0)));
      assert.equal(n, p.bars.length);
      for (let j = 0; j < n; j++) {
        assert.ok(p.chords[j] in MODES[mode].pool, `${mode}: ${p.chords[j]}`);
        assert.notEqual(p.chords[j], p.chords[(j + 1) % n], `${mode}: repeat in ${p.chords}`);
      }
      assert.ok(p.chords.some((c) => MODES[mode].signature.includes(c)), `${mode}: no signature chord in ${p.chords}`);
    }
  }
});

test('strum fit prefers strums that hit with the drums', () => {
  const groove = LIB.grooveById.get('groove_straight_basic_01');
  const good = strumFit({ pattern: 'D.DU.UDU', res: 8 }, groove);
  const bad = strumFit({ pattern: '.U.U.U.U', res: 8 }, groove);
  assert.ok(good > bad);
});

test('share links round-trip', () => {
  const idea = rollAll(blankIdea(), none, LIB, seededRng(5));
  assert.deepEqual(decodeIdea(encodeIdea(idea)), idea);
  assert.equal(decodeIdea('not-a-real-link!!'), null);
});

test('broken ideas report only what needs re-rolling', () => {
  const idea = rollAll(blankIdea(), none, LIB, seededRng(9));
  const broken = JSON.parse(JSON.stringify(idea));
  broken.sections[0].groove = 'groove_renamed_99';
  broken.sections[0].progression.chords[0] = 'nope';
  const v = validateIdea(broken, LIB);
  assert.deepEqual(v.missing.sort(), ['chords', 'groove']);
  assert.equal(validateIdea({ hello: 1 }, LIB), null);
});

test('a v1 idea with melody prompts still loads, without them', () => {
  const idea = rollAll(blankIdea(), none, LIB, seededRng(11));
  const v1 = JSON.parse(JSON.stringify(idea));
  v1.version = 1;
  v1.sections[0].strum = idea.sections[0].strum.source; // v1 and v2 held the strum's id
  v1.sections[0].groove = idea.sections[0].groove.source; // v1–v3 held the groove's id
  v1.sections[0].melodyPrompts = ['Start on the 3rd of the chord', 'Mostly steps, with one big leap', 'Hum it first'];
  const v = validateIdea(decodeIdea(encodeIdea(v1)), LIB);
  assert.deepEqual(v.missing, []);
  assert.deepEqual(v.idea, idea);
  assert.equal(v.idea.version, IDEA_VERSION);
  assert.ok(!('melodyPrompts' in v.idea.sections[0]));
});
