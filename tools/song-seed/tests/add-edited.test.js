// Adding an edited groove or progression to My grooves / My progressions
// (PLAN step 24): the id rule, the entries, beat lengths and the meter filter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, withMine } from '../js/library.js';
import { cleanMine, addMine, removeMine, editedId, makeMyGroove, makeMyProgression, hasHit } from '../js/my-library.js';
import { fitsMeter, findProgression, moveEdge, progressionFrom, myProgression } from '../js/progression-editor.js';
import { setHit } from '../js/groove-editor.js';
import { LAYERS, rollLayer, seededRng } from '../js/randomize.js';
import { blankIdea, validateIdea, sectionOf, withSection, withProgression, grooveFrom, findGroove, ideaTitle } from '../js/idea.js';
import { METERS } from '../js/loop.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const NOW = Date.parse('2026-11-12T10:00:00Z');

const ideaIn = (meter, mode = 'aeolian') => {
  const g = LIB.grooves.find((x) => x.meter === meter);
  const raw = withSection({ ...blankIdea(), meter, key: { tonic: 'A', mode } }, { groove: grooveFrom(g) });
  return validateIdea(raw, LIB).idea;
};

// ---------- the id rule ----------

test('an edited item is named after the one it came from, plus edit and the next free number', () => {
  assert.equal(editedId(LIB, 'grooves', 'groove_straight_push_01'), 'groove_straight_push_edit_01');
  assert.equal(editedId(LIB, 'progressions', 'prog_dorian_float_01'), 'prog_dorian_float_edit_01');
  // An edit of an edit counts on from the same base.
  assert.equal(editedId(LIB, 'grooves', 'groove_straight_push_edit_01'), 'groove_straight_push_edit_01');
  const lib = withMine(LIB, {
    grooves: [makeMyGroove({ ...grooveFrom(LIB.grooveById.get('groove_straight_push_01')), source: 'groove_straight_push_01' }, LIB, NOW)],
  });
  assert.equal(lib.myGrooves[0].id, 'groove_straight_push_edit_01');
  assert.equal(editedId(lib, 'grooves', 'groove_straight_push_01'), 'groove_straight_push_edit_02', 'skips a taken id');
  assert.equal(editedId(lib, 'grooves', 'groove_straight_push_edit_01'), 'groove_straight_push_edit_02');
});

test('with no library id to go on, the id falls back to the kind (and a progression\'s mode)', () => {
  for (const source of [null, 'generated', 'custom', 'Lazy Beat 3', 'prog_x_01', 'groove_01', 7]) {
    assert.equal(editedId(LIB, 'grooves', source), 'groove_edit_01', String(source));
  }
  assert.equal(editedId(LIB, 'progressions', 'generated', 'prog_dorian'), 'prog_dorian_edit_01');
  assert.equal(editedId(LIB, 'progressions', 'groove_straight_push_01', 'prog_dorian'), 'prog_dorian_edit_01', 'the other kind\'s id is no help');
  // An imported My item with a library-style filename is a base too.
  assert.equal(editedId(LIB, 'grooves', 'groove_lofi_lazy_03'), 'groove_lofi_lazy_edit_01');
});

test('edited ids never clash with either library and follow the id pattern', () => {
  let lib = LIB;
  const ids = new Set();
  for (let i = 0; i < 12; i++) {
    const entry = makeMyProgression({ source: 'prog_ionian_anthem_01', mode: 'ionian', chords: ['I', 'V'], bars: [1, 1 + i] }, lib, NOW);
    assert.ok(!lib.progressionById.has(entry.id), entry.id);
    assert.match(entry.id, /^prog_[a-z0-9]+(_[a-z0-9]+)*_\d{2}$/);
    ids.add(entry.id);
    lib = withMine(lib, { progressions: addMine(lib.myProgressions, entry, lib, 'progressions') });
  }
  assert.equal(ids.size, 12);
  assert.ok(ids.has('prog_ionian_anthem_edit_12'));
});

// ---------- grooves ----------

test('an edited groove becomes a My groove that matches it, keeps its tags and survives a reload', () => {
  const idea = ideaIn('4/4');
  const sec = sectionOf(idea);
  const edited = setHit(sec.groove, 'snare', 3, 'o');
  assert.equal(findGroove(LIB, edited), null, 'the edit is Custom');
  const entry = makeMyGroove(edited, LIB, NOW);
  assert.equal(entry.id, editedId(LIB, 'grooves', sec.groove.source));
  assert.deepEqual(entry.tags, LIB.grooveById.get(sec.groove.source).tags);
  assert.equal(entry.addedAt, '2026-11-12T10:00:00.000Z');
  const stored = JSON.parse(JSON.stringify([entry]));
  assert.deepEqual(cleanMine('grooves', stored), [entry], 'kept as it is when the store loads');
  const lib = withMine(LIB, { grooves: addMine([], entry, LIB, 'grooves') });
  assert.equal(findGroove(lib, edited), lib.myGrooves[0], 'the Drums field now shows it');
  // Saved names still use the groove's word, not "edit".
  const named = withSection(idea, { groove: edited });
  assert.equal(ideaTitle(named, lib), ideaTitle(idea, LIB));
});

test('an edited groove in every meter can be added; one with no hits can\'t', () => {
  for (const meter of METERS) {
    const g = sectionOf(ideaIn(meter)).groove;
    const entry = makeMyGroove(setHit(g, 'kick', 1, 'X'), LIB, NOW);
    assert.equal(cleanMine('grooves', [entry]).length, 1, meter);
    assert.equal(entry.meter, meter);
  }
  const g = sectionOf(ideaIn('4/4')).groove;
  assert.ok(hasHit(g));
  const silent = { ...g, tracks: Object.fromEntries(Object.entries(g.tracks).map(([t, s]) => [t, '.'.repeat(s.length)])) };
  assert.ok(!hasHit(silent));
});

test('an added groove comes up in rolls, and removing it leaves the idea alone', () => {
  const idea = ideaIn('4/4');
  const edited = setHit(sectionOf(idea).groove, 'cymbal', 5, 'X');
  const entry = makeMyGroove(edited, LIB, NOW);
  const lib = withMine(LIB, { grooves: [entry] });
  const rng = seededRng(24);
  let hits = 0;
  for (let i = 0; i < 400; i++) {
    const g = sectionOf(rollLayer(idea, 'groove', lib, none, rng)).groove;
    if (findGroove(lib, g) === lib.myGrooves[0]) hits++;
  }
  assert.ok(hits > 0, 'rolled at least once');
  const using = withSection(idea, { groove: grooveFrom(entry) });
  const after = withMine(lib, { grooves: removeMine(lib.myGrooves, entry.id) });
  assert.deepEqual(validateIdea(using, after).idea, validateIdea(using, lib).idea);
});

// ---------- progressions ----------

test('an edited progression becomes a My progression, in the mode it was written for', () => {
  const p = progressionFrom(LIB.progressions.find((x) => x.mode === 'dorian'));
  const edited = moveEdge(p, 0, 12, '4/4'); // the change on beat 4
  assert.equal(edited.bars[0], 0.75);
  const entry = makeMyProgression(edited, LIB, NOW);
  assert.equal(entry.id, editedId(LIB, 'progressions', p.source));
  assert.equal(entry.mode, 'dorian');
  assert.deepEqual(cleanMine('progressions', JSON.parse(JSON.stringify([entry]))), [entry]);
  const lib = withMine(LIB, { progressions: [entry] });
  assert.equal(findProgression(lib, edited), lib.myProgressions[0]);
  assert.equal(myProgression(lib, edited), lib.myProgressions[0], 'Remove shows for it now');
  // A generated one is named after its mode.
  const gen = makeMyProgression({ source: 'custom', mode: 'phrygian', chords: ['i', 'bII'], bars: [1, 1] }, LIB, NOW);
  assert.equal(gen.id, 'prog_phrygian_edit_01');
});

test('3/4 thirds are kept through the store', () => {
  const p = progressionFrom(LIB.progressions.find((x) => x.mode === 'aeolian'));
  const edited = moveEdge(p, 0, 8, '3/4'); // two beats of a 3/4 bar
  assert.ok(Math.abs(edited.bars[0] - 2 / 3) < 1e-9);
  const entry = makeMyProgression(edited, LIB, NOW);
  const [back] = cleanMine('progressions', JSON.parse(JSON.stringify([entry])));
  assert.ok(back, 'kept');
  assert.equal(findProgression(withMine(LIB, { progressions: [back] }), edited)?.id, entry.id);
});

test('lengths must sit on the 1/48-bar grid', () => {
  const base = { id: 'prog_aeolian_edit_01', mode: 'aeolian', chords: ['i', 'bVI', 'bIII', 'bVII'], addedAt: 'x' };
  for (const bars of [[1, 1, 1, 0.25], [1, 1, 0.75, 1.25], [2 / 3, 4 / 3, 1, 1], [1, 1, 1, 1 / 12]]) {
    assert.equal(cleanMine('progressions', [{ ...base, bars }]).length, 1, bars.join());
  }
  for (const bars of [[1, 1, 1, 0.3], [1, 1, 1, 0.01], [1, 1, 1, -1]]) {
    assert.equal(cleanMine('progressions', [{ ...base, bars }]).length, 0, bars.join());
  }
});

test('a progression fits the meters where every chord change is on a whole step', () => {
  for (const p of LIB.progressions) for (const m of METERS) assert.ok(fitsMeter(p, m), `${p.id} in ${m}`);
  const quarters = { chords: ['i', 'iv'], bars: [0.75, 1.25] };
  for (const m of METERS) assert.ok(fitsMeter(quarters, m), m);
  const thirds = { chords: ['i', 'iv'], bars: [2 / 3, 4 / 3] };
  assert.ok(!fitsMeter(thirds, '4/4'));
  assert.ok(fitsMeter(thirds, '3/4'));
  assert.ok(fitsMeter(thirds, '6/8'));
});

test('a My progression in thirds rolls in 3/4 but never in 4/4', () => {
  const thirds = { id: 'prog_aeolian_edit_01', mode: 'aeolian', chords: ['i', 'bVI', 'bIII', 'bVII'], bars: [2 / 3, 4 / 3, 1, 1], addedAt: 'x' };
  const quarters = { ...thirds, id: 'prog_aeolian_edit_02', bars: [0.75, 1.25, 1, 1] };
  const lib = withMine(LIB, { progressions: [thirds, quarters] });
  const count = (meter, seed) => {
    const idea = ideaIn(meter);
    const rng = seededRng(seed);
    const seen = { [thirds.id]: 0, [quarters.id]: 0 };
    for (let i = 0; i < 600; i++) {
      const p = sectionOf(rollLayer(idea, 'chords', lib, none, rng)).progression;
      if (p.source in seen) seen[p.source]++;
    }
    return seen;
  };
  const four = count('4/4', 1);
  assert.equal(four[thirds.id], 0, 'thirds miss the 4/4 grid');
  assert.ok(four[quarters.id] > 0, 'quarter bars fit 4/4');
  const three = count('3/4', 2);
  assert.ok(three[thirds.id] > 0 && three[quarters.id] > 0);
});

test('an idea using a removed My progression is unchanged', () => {
  const entry = makeMyProgression({ source: 'generated', mode: 'aeolian', chords: ['i', 'bVII'], bars: [1.5, 0.5] }, LIB, NOW);
  const lib = withMine(LIB, { progressions: [entry] });
  const idea = withProgression(ideaIn('4/4'), progressionFrom(entry));
  const after = withMine(lib, { progressions: removeMine(lib.myProgressions, entry.id) });
  assert.deepEqual(validateIdea(idea, after).idea, validateIdea(idea, lib).idea);
});
