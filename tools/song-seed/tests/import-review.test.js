// The Import MIDI dialog's pure helpers (PLAN step 18): review rows, the Add N
// count, the toast, and what a row import picks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB, withMine } from '../js/library.js';
import { readImport, reviewRows, newRow, addCount, addedText, pickImported, idOf } from '../js/my-library.js';
import { LAYERS, rollAll, seededRng, shapeOf } from '../js/randomize.js';
import { blankIdea, sectionOf, withProgression, grooveFrom, sameGroove } from '../js/idea.js';
import { compileLoop, meterInfo } from '../js/loop.js';
import { writeMidi, PPQ } from '../js/midi.js';
import { chordFor, guitarVoicing, notePc } from '../js/theory.js';

const STEP = PPQ / 4;
const AT = '2026-11-08T12:00:00.000Z';

// Kick, cymbal, snare, cymbal on 8ths, filling one bar of `meter`.
function drumFile({ channel = 10, meter = '4/4', bars = 1 } = {}) {
  const steps = meterInfo(meter).stepsPerBar * bars;
  const events = [];
  for (let s = 0; s < steps; s += 2) events.push({ tick: s * STEP, note: [36, 42, 38, 42][(s / 2) % 4], velocity: 96, duration: STEP, channel });
  return writeMidi({ bpm: 112, meter, length: steps * STEP, tracks: [{ name: 'drums', events }] });
}
// Block chords, one bar each, in `tonic`.
function chordFile(numerals, tonic = 'C', bars = numerals.map(() => 1)) {
  const BAR = 4 * PPQ;
  let tick = 0;
  const events = numerals.flatMap((n, i) => {
    const c = chordFor(n, tonic);
    const out = guitarVoicing(c.rootPc, c.intervals).map((note) => ({ tick, note, velocity: 90, duration: bars[i] * BAR, channel: 1 }));
    tick += bars[i] * BAR;
    return out;
  });
  return writeMidi({ bpm: 100, length: tick, tracks: [{ name: 'chords', events }] });
}
const NOT_MIDI = new TextEncoder().encode('this is a text file, not MIDI');

const rowsOf = (files, fixed = null) => files.map(([name, bytes]) => newRow(readImport(name, bytes), fixed));
const review = (files, fixed = null, lib = LIB) => reviewRows(rowsOf(files, fixed), lib, fixed);

// ---------- reading ----------

test('the id is the filename without .mid or .midi', () => {
  assert.equal(idOf('groove_lofi_lazy_03.mid'), 'groove_lofi_lazy_03');
  assert.equal(idOf('Verse chords.MIDI'), 'Verse chords');
  assert.equal(idOf('take.mid.mid'), 'take.mid');
  assert.equal(idOf('notes.txt'), 'notes.txt');
});

test('a file that isn’t MIDI, or has no notes, becomes an error, never a throw', () => {
  assert.deepEqual(readImport('notes.mid', NOT_MIDI), { filename: 'notes.mid', id: 'notes', detected: null, error: 'Not a MIDI file' });
  assert.equal(readImport('empty.mid', new Uint8Array()).error, 'Not a MIDI file');
  const silent = readImport('silent.mid', writeMidi({ bpm: 100, tracks: [{ name: 'x', events: [] }] }));
  assert.equal(silent.groove.error, 'No usable notes');
  assert.equal(silent.progression.error, 'No usable notes');
  // A header with nothing sensible after it.
  const junk = Uint8Array.from([...new TextEncoder().encode('MThd'), 0, 0, 0, 6, 0, 1, 0, 1, 1, 224, ...new TextEncoder().encode('MTrk'), 0, 0, 0, 3, 0, 0x45, 0x45]);
  assert.doesNotThrow(() => readImport('junk.mid', junk));
});

// ---------- review rows ----------

test('mixed: each file gets the kind detectKind reads, and a kind select', () => {
  const rows = review([['Beat 3.mid', drumFile()], ['Verse.mid', chordFile(['vi', 'IV', 'I', 'V'])]]);
  assert.deepEqual(rows.map((r) => [r.id, r.kind, r.showKind]), [['Beat 3', 'groove', true], ['Verse', 'progression', true]]);

  const [g, p] = rows;
  assert.equal(g.summary, '4/4 · 1 bar · 97–127 BPM');
  assert.equal(g.keys, null);
  assert.deepEqual(g.warnings, []);
  assert.deepEqual(g.item.entry, {
    id: 'Beat 3', meter: '4/4', res: 16, bars: 1, tempo: { min: 97, max: 127 }, tags: [],
    tracks: { kick: 'x.......x.......', snare: '....x.......x...', cymbal: '..x...x...x...x.' },
  });
  assert.equal(g.item.key, null);

  assert.equal(p.summary, 'Am | F | C | G');
  assert.equal(p.keys.length, 5, 'the 5 best guesses');
  assert.equal(p.keys[0].label, 'A minor');
  assert.ok(p.keys.some((k) => k.label === 'C major'), 'the relative key is offered');
  assert.deepEqual(p.item.entry, { id: 'Verse', mode: 'aeolian', chords: ['i', 'bVI', 'bIII', 'bVII'], bars: [1, 1, 1, 1] });
  assert.deepEqual(p.item.key, { tonicPc: notePc('A'), mode: 'aeolian' });
});

test('mixed: switching a row’s kind reads the file the other way', () => {
  const rows = rowsOf([['Beat 3.mid', drumFile({ channel: 1 })]]);
  const asProg = reviewRows([{ ...rows[0], kind: 'progression' }], LIB);
  assert.equal(asProg[0].kind, 'progression');
  assert.ok(asProg[0].item, 'a drum file off channel 10 still reads as chords');
  const chords = rowsOf([['Verse.mid', chordFile(['I', 'IV'])]]);
  const asGroove = reviewRows([{ ...chords[0], kind: 'groove' }], LIB);
  assert.equal(asGroove[0].error, 'No kick, snare or cymbal notes');
  assert.equal(asGroove[0].item, null);
});

test('the Key select re-spells the progression for the chosen key', () => {
  const [row] = rowsOf([['Verse.mid', chordFile(['vi', 'IV', 'I', 'V'])]]);
  const keys = reviewRows([row], LIB)[0].keys;
  const c = Number(keys.find((k) => k.label === 'C major').value);
  const [p] = reviewRows([{ ...row, keyIdx: c }], LIB);
  assert.equal(p.keyIdx, c);
  assert.deepEqual(p.item.entry.chords, ['vi', 'IV', 'I', 'V']);
  assert.equal(p.item.entry.mode, 'ionian');
  assert.deepEqual(p.item.key, { tonicPc: notePc('C'), mode: 'ionian' });
  assert.equal(p.summary, 'Am | F | C | G', 'the same chords');
  assert.equal(reviewRows([{ ...row, keyIdx: 99 }], LIB)[0].keyIdx, 4, 'an index out of range is kept to the list');
});

test('progression summaries use the bar-line chart, with ♭ and ♯', () => {
  const [p] = review([['flat.mid', chordFile(['I', 'IV', 'V'], 'Eb', [2, 1, 1])]]);
  assert.equal(p.summary, 'E♭ | % | A♭ | B♭');
});

test('fixed kind: no kind select, and a file of the other kind warns but can still be added', () => {
  const drums = drumFile({ channel: 1 });
  const chords = chordFile(['I', 'V', 'vi', 'IV']);
  const onDrums = review([['Beat.mid', drums], ['Verse.mid', chords]], 'groove');
  assert.ok(onDrums.every((r) => !r.showKind && r.kind === 'groove'));
  assert.deepEqual(onDrums[0].warnings, []);
  assert.ok(onDrums[0].item);
  assert.deepEqual(onDrums[1].warnings, ['This looks like a chord file']);
  assert.equal(onDrums[1].error, 'No kick, snare or cymbal notes', 'chords have no drum notes to keep');

  const onChords = review([['Beat.mid', drums], ['Verse.mid', chords]], 'progression');
  assert.ok(onChords.every((r) => !r.showKind && r.kind === 'progression'));
  assert.deepEqual(onChords[0].warnings.slice(0, 1), ['This looks like a drum file']);
  assert.ok(onChords[0].item, 'it can still be added');
  assert.deepEqual(onChords[1].warnings, []);
  // A prefix decides what the file looks like.
  assert.deepEqual(review([['groove_odd_01.mid', chords]], 'progression')[0].warnings, ['This looks like a drum file']);
});

test('the script’s warnings show, capitalised', () => {
  const noTempo = Uint8Array.from(drumFile());
  // Turn the tempo meta event (FF 51 03) into a text event (FF 01 03).
  const at = noTempo.findIndex((b, i) => b === 0xff && noTempo[i + 1] === 0x51);
  noTempo[at + 1] = 0x01;
  assert.deepEqual(review([['Beat.mid', noTempo]])[0].warnings, ['No tempo in the file; assumed 120 BPM']);

  const crash = writeMidi({ bpm: 100, length: 16 * STEP, tracks: [{ name: 'd', events: [
    { tick: 0, note: 36, velocity: 96, duration: STEP, channel: 10 },
    { tick: 0, note: 49, velocity: 96, duration: STEP, channel: 10 },
  ] }] });
  assert.deepEqual(review([['Beat.mid', crash]])[0].warnings, ['Skipped notes 49 ×1']);

  const three = review([['Verse.mid', chordFile(['I', 'IV', 'V'])]])[0];
  assert.ok(three.item, '3 bars can still be added');
  assert.deepEqual(three.warnings, ['3 bars; progressions must add up to 2, 4 or 8']);
});

test('a groove the app can’t keep is refused, with the reason', () => {
  const fiveFour = review([['Odd.mid', drumFile({ meter: '5/4' })]])[0];
  assert.equal(fiveFour.error, 'In 5/4; grooves can be 4/4, 3/4 or 6/8');
  assert.equal(fiveFour.item, null);
  const three = review([['Long.mid', drumFile({ bars: 3 })]])[0];
  assert.equal(three.error, '3 bars; grooves can be 1, 2, 4 or 8 bars');
  assert.deepEqual(three.warnings, [], 'the script’s own bars warning isn’t repeated');
  assert.ok(review([['Waltz.mid', drumFile({ meter: '3/4' })]])[0].item, '3/4 is fine');
  assert.ok(review([['Six.mid', drumFile({ meter: '6/8', bars: 2 })]])[0].item, '6/8 is fine');
  assert.equal(review([[`${'x'.repeat(130)}.mid`, drumFile()]])[0].error, 'The filename is too long');
});

test('error rows show the reason only: no summary, no Key select', () => {
  const rows = review([['notes.mid', NOT_MIDI], [`${LIB.progressions[0].id}.mid`, chordFile(['I', 'IV'])]]);
  assert.deepEqual(rows.map((r) => [r.id, r.error, r.summary, r.keys, r.item, r.showKind]), [
    ['notes', 'Not a MIDI file', null, null, null, false],
    [LIB.progressions[0].id, 'Already in your library', null, null, null, true],
  ]);
});

test('ids already in either library are refused, per kind', () => {
  const g = LIB.grooves[0].id;
  assert.equal(review([[`${g}.mid`, drumFile()]])[0].error, 'Already in your library');
  const mine = { id: 'groove_mine_one_01', meter: '4/4', res: 16, bars: 1, tempo: { min: 90, max: 110 }, tags: [], tracks: { kick: 'x...............' }, addedAt: AT };
  const lib = withMine(LIB, { grooves: [mine] });
  assert.equal(review([['groove_mine_one_01.mid', drumFile()]], null, lib)[0].error, 'Already in your library');
  // A groove id read as a progression doesn't clash with the groove.
  assert.ok(review([['groove_mine_one_01.mid', chordFile(['I', 'IV'])]], 'progression', lib)[0].item);
});

// ---------- Add N ----------

test('Add N counts only rows that can be added: errors and duplicates are left out', () => {
  const drums = drumFile();
  const rows = review([
    ['Beat.mid', drums],
    ['notes.mid', NOT_MIDI],
    ['Beat.midi', drums], // the same id twice in this drop
    ['Verse.mid', chordFile(['I', 'V', 'vi', 'IV'])],
    [`${LIB.grooves[0].id}.mid`, drums],
    ['Beat.mid', drums],
  ]);
  assert.deepEqual(rows.map((r) => r.error), [null, 'Not a MIDI file', 'Same name as a file above', null, 'Already in your library', 'Same name as a file above']);
  assert.equal(addCount(rows), 2);
  assert.equal(addCount([]), 0);
  // A broken first copy doesn't block a good one after it.
  const later = review([['Beat.mid', NOT_MIDI], ['Beat.mid', drums]]);
  assert.equal(later[1].error, null);
  assert.equal(addCount(later), 1);
  // Removing the first copy frees the second.
  const raw = rowsOf([['Beat.mid', drums], ['Beat.mid', drums]]);
  assert.equal(addCount(reviewRows(raw.slice(1), LIB)), 1);
});

test('the toast counts what was added', () => {
  assert.equal(addedText([{ kind: 'groove' }, { kind: 'progression' }, { kind: 'groove' }]), 'Added 2 grooves, 1 progression');
  assert.equal(addedText([{ kind: 'groove' }]), 'Added 1 groove');
  assert.equal(addedText([{ kind: 'progression' }, { kind: 'progression' }]), 'Added 2 progressions');
});

// ---------- pickImported ----------

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
function ideaIn(meter, seed = 1) {
  return rollAll({ ...blankIdea(), meter }, { ...none, meter: true }, LIB, seededRng(seed));
}
const grooveItem = (meter, id = 'groove_mine_new_01') => {
  const [r] = review([[`${id}.mid`, drumFile({ meter })]]);
  return r.item;
};
function progItem(numerals, tonic, keyLabel, bars) {
  const [row] = rowsOf([['prog_mine_new_01.mid', chordFile(numerals, tonic, bars)]]);
  const keys = reviewRows([row], LIB)[0].keys;
  const keyIdx = keyLabel ? Number(keys.find((k) => k.label === keyLabel).value) : 0;
  return reviewRows([{ ...row, keyIdx }], LIB)[0].item;
}
const withItems = (items, kind) => withMine(LIB, { [kind]: items.map((i) => ({ ...i.entry, addedAt: AT })) });

test('pickImported: a groove in the same meter is picked, nothing else changes', () => {
  const item = grooveItem('4/4');
  const lib = withItems([item], 'grooves');
  const idea = ideaIn('4/4');
  const { idea: next, reason } = pickImported(idea, lib, item, 'groove', none);
  assert.equal(reason, undefined);
  assert.deepEqual(sectionOf(next).groove, grooveFrom(item.entry));
  assert.equal(sectionOf(next).groove.source, 'groove_mine_new_01');
  assert.deepEqual({ ...next, sections: null }, { ...idea, sections: null }, 'meter, tempo and key are kept');
  assert.deepEqual(sectionOf(next).strum, sectionOf(idea).strum);
  assert.deepEqual(sectionOf(next).progression, sectionOf(idea).progression);
  assert.ok(compileLoop(next, lib).totalSteps > 0);
});

test('pickImported: a groove in another meter switches the meter and rerolls the strum', () => {
  const item = grooveItem('3/4');
  const lib = withItems([item], 'grooves');
  for (let seed = 1; seed <= 20; seed++) {
    const idea = ideaIn('4/4', seed);
    const { idea: next } = pickImported(idea, lib, item, 'groove', none, seededRng(seed));
    assert.equal(next.meter, '3/4');
    assert.ok(sameGroove(sectionOf(next).groove, grooveFrom(item.entry)), 'the imported groove is kept, not rerolled');
    const strum = sectionOf(next).strum;
    assert.equal(strum.pattern.length, strum.bars * meterInfo('3/4').stepsPerBar * strum.res / 16, 'the strum is in 3/4');
    assert.deepEqual(sectionOf(next).progression, sectionOf(idea).progression);
    assert.ok(compileLoop(next, lib).totalSteps > 0);
  }
});

test('pickImported: a locked Meter, or a locked Strum in the old meter, means nothing is picked', () => {
  const item = grooveItem('3/4');
  const lib = withItems([item], 'grooves');
  const idea = ideaIn('4/4');
  assert.deepEqual(pickImported(idea, lib, item, 'groove', { ...none, meter: true }), { reason: 'Added. Switch to 3/4 to use it' });
  assert.deepEqual(pickImported(idea, lib, item, 'groove', { ...none, strum: true }), { reason: 'Added. Switch to 3/4 to use it' });
  // In the same meter, neither lock matters.
  const same = grooveItem('4/4');
  assert.ok(pickImported(idea, withItems([same], 'grooves'), same, 'groove', { ...none, meter: true, strum: true }).idea);
});

test('pickImported: a locked Drums or Progression doesn’t block it', () => {
  const groove = grooveItem('3/4');
  const g = pickImported(ideaIn('4/4'), withItems([groove], 'grooves'), groove, 'groove', { ...none, groove: true });
  assert.equal(g.idea.meter, '3/4');
  const prog = progItem(['i', 'iv', 'bVII', 'i'], 'D');
  const p = pickImported(ideaIn('4/4'), withItems([prog], 'progressions'), prog, 'progression', { ...none, chords: true });
  assert.equal(sectionOf(p.idea).progression.source, 'prog_mine_new_01');
});

test('pickImported: a progression sets Key and Mode to its Key select', () => {
  const item = progItem(['vi', 'IV', 'I', 'V'], 'G', 'G major');
  const lib = withItems([item], 'progressions');
  const idea = ideaIn('4/4');
  const { idea: next } = pickImported(idea, lib, item, 'progression', none);
  assert.deepEqual(next.key, { tonic: 'G', mode: 'ionian' });
  assert.deepEqual(sectionOf(next).progression, { source: 'prog_mine_new_01', mode: 'ionian', chords: ['vi', 'IV', 'I', 'V'], bars: [1, 1, 1, 1] });
  assert.equal(sectionOf(next).bars, 4);
  assert.deepEqual(compileLoop(next, lib).chords.map((c) => c.symbol.replace(/(add9|maj7|sus\d|7|9|6)$/, '')), ['Em', 'C', 'G', 'D']);
  // The relative minor, read as the file's guess, is the same chords in E minor.
  const minor = progItem(['vi', 'IV', 'I', 'V'], 'G');
  assert.deepEqual(pickImported(idea, withItems([minor], 'progressions'), minor, 'progression', none).idea.key, { tonic: 'E', mode: 'aeolian' });
  // A sharp key is spelled the app's way (C♯ → D♭).
  const sharp = progItem(['i', 'bVI', 'bIII', 'bVII'], 'Db');
  assert.equal(pickImported(idea, withItems([sharp], 'progressions'), sharp, 'progression', none).idea.key.tonic, 'Db');
});

test('pickImported: a locked Key or Mode is kept, and the progression plays in it', () => {
  const item = progItem(['vi', 'IV', 'I', 'V'], 'G', 'G major');
  const lib = withItems([item], 'progressions');
  const idea = { ...ideaIn('4/4'), key: { tonic: 'D', mode: 'dorian' } };
  assert.deepEqual(pickImported(idea, lib, item, 'progression', { ...none, tonic: true }).idea.key, { tonic: 'D', mode: 'ionian' });
  assert.deepEqual(pickImported(idea, lib, item, 'progression', { ...none, mode: true }).idea.key, { tonic: 'G', mode: 'dorian' });
  const both = pickImported(idea, lib, item, 'progression', { ...none, tonic: true, mode: true }).idea;
  assert.deepEqual(both.key, idea.key);
  assert.equal(sectionOf(both).progression.source, 'prog_mine_new_01');
  assert.ok(compileLoop(both, lib).chords.length === 4);
});

test('pickImported: a locked Bars or Chords it doesn’t fit refuses it', () => {
  const item = progItem(['i', 'iv', 'bVII', 'i'], 'D'); // 4 bars, 4 chords
  const lib = withItems([item], 'progressions');
  const shaped = (bars, chords) => withProgression(ideaIn('4/4'), { source: 'generated', mode: 'aeolian', chords, bars });
  const twoBars = shaped([1, 1], ['i', 'bVII']);
  const sixChords = shaped([1, 1, 0.5, 0.5, 0.5, 0.5], ['i', 'iv', 'bVII', 'i', 'iv', 'v']);
  assert.deepEqual(pickImported(twoBars, lib, item, 'progression', { ...none, bars: true }), { reason: 'Added. Doesn’t fit the locked bars' });
  assert.deepEqual(pickImported(sixChords, lib, item, 'progression', { ...none, count: true }), { reason: 'Added. Doesn’t fit the locked chords' });
  // Locked values it does fit, or unlocked ones, don't stop it.
  assert.ok(pickImported(sixChords, lib, item, 'progression', { ...none, bars: true }).idea, '4 bars fits locked 4 bars');
  const four = shaped([1, 1, 1, 1], ['i', 'iv', 'v', 'i']);
  const { idea: next } = pickImported(four, lib, item, 'progression', { ...none, bars: true, count: true });
  assert.deepEqual(shapeOf(sectionOf(next).progression), { bars: 4, count: 4 });
  assert.ok(pickImported(twoBars, lib, item, 'progression', none).idea);
});
