import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIB } from '../js/library.js';
import { LAYERS, rollAll, seededRng } from '../js/randomize.js';
import { blankIdea, ideaTitle, withSection, grooveFrom } from '../js/idea.js';
import { compileLoop, meterInfo } from '../js/loop.js';
import {
  pretty, prettyChord, prettyNumeral, strumGlyphs, degreeLabel, modeTitle,
  chartBars, chartText, fingerprint, circleKey,
} from '../js/display.js';

const none = Object.fromEntries(LAYERS.map((l) => [l, false]));
const span = (start, end) => ({ start, end });

test('accidentals render as ♭ and ♯', () => {
  assert.equal(prettyChord('Ebmaj7'), 'E♭maj7');
  assert.equal(prettyChord('F#m'), 'F♯m');
  assert.equal(prettyChord('Bbm7b5'), 'B♭m7♭5');
  assert.equal(prettyChord('Bm'), 'Bm');
  assert.equal(prettyChord('Db'), 'D♭');
  assert.equal(prettyNumeral('bVII'), '♭VII');
  assert.equal(prettyNumeral('bIIImaj7'), '♭IIImaj7');
  assert.equal(prettyNumeral('i°'), 'i°');
  assert.equal(pretty('Eb minor · 112 BPM · i – bVII – bVI'), 'E♭ minor · 112 BPM · i – ♭VII – ♭VI');
  assert.equal(pretty('Bb Dorian · 90 · laid-back'), 'B♭ Dorian · 90 · laid-back');
  assert.equal(pretty('C major · 100 · basic'), 'C major · 100 · basic');
});

test('strum glyphs, scale degrees and mode names', () => {
  assert.equal(strumGlyphs('D.DU.UDU'), '↓ · ↓ ↑ · ↑ ↓ ↑');
  assert.equal(strumGlyphs('D.x.'), '↓ · × ·');
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((i) => degreeLabel('aeolian', i)), ['1', '2', '♭3', '4', '5', '♭6', '♭7']);
  assert.equal(degreeLabel('lydian', 3), '♯4');
  assert.equal(degreeLabel('locrian', 4), '♭5');
  assert.equal(modeTitle('aeolian'), 'Aeolian');
  assert.equal(modeTitle('ionian'), 'Ionian');
  assert.equal(modeTitle('dorian'), 'Dorian');
});

test('the circle’s key names the tonic and colour note, and drops the colour note in Ionian', () => {
  assert.deepEqual(circleKey('G', 'aeolian'), [
    { mark: 'tonic', text: 'Tonic: G' },
    { mark: 'scale', text: 'In the scale' },
    { mark: 'colour', text: 'Colour note: E♭, the ♭6' },
    { mark: 'root', text: 'Chord roots in the loop' },
  ]);
  assert.equal(circleKey('Db', 'lydian')[0].text, 'Tonic: D♭');
  assert.equal(circleKey('Db', 'lydian')[2].text, 'Colour note: G, the ♯4');
  assert.deepEqual(circleKey('C', 'ionian').map((l) => l.mark), ['tonic', 'scale', 'root']);
});

test('the chart splits chords into bars, with held bars and half bars', () => {
  const m = meterInfo('4/4');
  const halves = chartBars([span(0, 16), span(16, 32), span(32, 48), span(48, 56), span(56, 64)], m);
  assert.equal(halves.length, 4);
  assert.deepEqual(halves[3], [{ index: 3, beats: 2, held: false }, { index: 4, beats: 2, held: false }]);

  const long = chartBars([span(0, 32), span(32, 64)], m);
  assert.deepEqual(long.map((b) => b.map((p) => [p.index, p.held])), [[[0, false]], [[0, true]], [[1, false]], [[1, true]]]);

  // A chord that crosses a bar line is held into the next bar.
  const crossing = chartBars([span(0, 24), span(24, 32)], m);
  assert.deepEqual(crossing[1], [{ index: 0, beats: 2, held: true }, { index: 1, beats: 2, held: false }]);
});

test('chart text for select options', () => {
  assert.equal(chartText(['I', 'V', 'vi', 'IV', 'V'], [1, 1, 1, 0.5, 0.5]), 'I | V | vi | IV V');
  assert.equal(chartText(['i', 'bVII'], [2, 2]), 'i | % | ♭VII | %');
});

test('a fingerprint draws drums along the bottom and chord roots along the top', () => {
  const idea = withSection(blankIdea(), {
    groove: grooveFrom(LIB.grooveById.get('groove_straight_basic_01')),
    progression: { source: 'generated', mode: 'ionian', chords: ['I', 'V', 'vi', 'IV'], bars: [1, 1, 1, 1] },
  });
  const fp = fingerprint(idea, LIB);
  // kick x.......x....... / snare ....x.......x... / cymbal on every 8th, over two bars
  const bar = ['kick', 'cymbal', 'snare', 'cymbal', 'kick', 'cymbal', 'snare', 'cymbal'];
  assert.deepEqual(fp.hits.map((h) => h.kind), [...bar, ...bar]);
  assert.equal(fp.hits[0].d, 'M3 30V18');
  assert.equal(fp.hits[2].d, 'M10.74 30V22');
  assert.equal(fp.hits[15].d, 'M61.05 30V26');
  assert.equal(fp.chords, 'M2 15H17V7H32V5H47V9H62');

  // A Saved idea from before v4 still holds the groove's id, and draws the same.
  assert.deepEqual(fingerprint(withSection(idea, { groove: 'groove_straight_basic_01' }), LIB), fp);
  assert.equal(fingerprint(withSection(idea, { groove: 'groove_missing_01' }), LIB), null);
  assert.equal(fingerprint(withSection(idea, { groove: null }), LIB), null);
});

test('every rolled idea splits into full bars and draws a fingerprint', () => {
  const rng = seededRng(7);
  for (let i = 0; i < 300; i++) {
    const idea = rollAll(blankIdea(), none, LIB, rng);
    const loop = compileLoop(idea, LIB);
    const bars = chartBars(loop.chords, loop.meter);
    assert.equal(bars.length, Math.ceil(loop.totalSteps / loop.meter.stepsPerBar));
    assert.ok(bars.every((parts) => parts.length > 0));
    assert.equal(bars.flat().reduce((a, p) => a + p.beats, 0), loop.totalSteps / loop.meter.stepsPerBeat);

    const fp = fingerprint(idea, LIB);
    assert.ok(fp.hits.length > 0, idea.sections[0].groove.source);
    assert.ok(fp.chords.startsWith('M2 ') && fp.chords.endsWith('H62'), fp.chords);
  }
});

test('saved names read key, tempo and groove word', () => {
  const idea = withSection({ ...blankIdea(), tempo: 131, key: { tonic: 'Eb', mode: 'phrygian' } }, { groove: grooveFrom(LIB.grooveById.get('groove_motorik_01')) });
  assert.equal(ideaTitle(idea, LIB), 'Eb Phrygian · 131 · motorik');
  assert.equal(pretty(ideaTitle(idea, LIB)), 'E♭ Phrygian · 131 · motorik');
  // No tags: the last word of the matching entry's id, or of the groove's
  // source when nothing matches (a My groove from another device).
  const dusty = { ...LIB.grooves[0], id: 'groove_lofi_dusty_02', tags: [] };
  const withDusty = withSection(idea, { groove: grooveFrom(dusty) });
  assert.equal(ideaTitle(withDusty, { grooves: [dusty] }), 'Eb Phrygian · 131 · dusty');
  assert.equal(ideaTitle(withDusty, { grooves: [] }), 'Eb Phrygian · 131 · dusty');
  const nameless = withSection(idea, { groove: { ...grooveFrom(dusty), source: null } });
  assert.equal(ideaTitle(nameless, { grooves: [] }), 'Eb Phrygian · 131');
});
