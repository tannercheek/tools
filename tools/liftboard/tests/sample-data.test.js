import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleData } from '../js/sample-data.js';
import { validate } from '../js/schema.js';
import { latest, badge, isTrendingUp, showsPR, comparablePR } from '../js/derive.js';
import { heroText, prFigure, formatE1RM } from '../js/format.js';

const NOW = new Date(2026, 8, 28, 9, 0);
const { tags, lifts } = sampleData(NOW);
const byName = name => lifts.find(l => l.name === name);
const card = name => {
  const l = byName(name);
  return {
    hero: heroText(latest(l), l, 'lb'),
    badge: badge(l, NOW),
    up: isTrendingUp(l),
    pr: showsPR(l, prFigure(l, 'lb')) ? comparablePR(l) : null,
  };
};

test('sample data passes the same checks as saved data', () => {
  assert.equal(validate({ schemaVersion: 2, tags, lifts }), null);
  for (const l of lifts) assert.ok(l.equipment && !('isBodyweight' in l), l.name);
  assert.deepEqual(tags.map(t => t.name), ['Push', 'Pull', 'Legs', 'Upper', 'Lower']);
  for (const l of lifts) for (const id of l.tagIds) assert.ok(tags.some(t => t.id === id));
});

test('a lift whose latest session is a record: flame and arrow, no "· PR"', () => {
  const c = card('Back Squat');
  assert.deepEqual([c.hero, c.badge, c.up, c.pr], ['285 × 5', 'newPR', true, null]);
  assert.ok(byName('Back Squat').sessions.length >= 12, 'months of sessions for the chart');
});

test('a trending lift below its record: arrow and "· PR 263"', () => {
  const c = card('Bench Press');
  assert.deepEqual([c.hero, c.badge, c.up], ['215 × 5', 'none', true]);
  assert.equal(formatE1RM(c.pr.bestE1RMKg, 'lb'), '263');
});

test('a stale lift, a tie, and a never-logged lift', () => {
  assert.equal(card('Overhead Press').badge, 'stale');
  const dl = card('Deadlift');
  assert.deepEqual([dl.badge, dl.up, formatE1RM(dl.pr.bestE1RMKg, 'lb')], ['none', false, '405']);
  const fs = card('Front Squat');
  assert.deepEqual([fs.hero, fs.badge], ['Not logged yet', 'neverLogged']);
});

test('bodyweight lifts: plain and loaded, never an e1RM', () => {
  const pu = card('Pull-Up');
  assert.deepEqual([pu.hero, pu.badge, pu.up], ['BW+15 × 8', 'none', false]);
  assert.equal(heroText(pu.pr, byName('Pull-Up'), 'lb'), 'BW+20 × 5');
  const dip = card('Dip');
  assert.deepEqual([dip.hero, dip.badge, dip.up, dip.pr], ['BW × 12', 'newPR', true, null]);
});

test('a band lift with no weight: "Band × 20", a rep record, never an e1RM', () => {
  const c = card('Band Pull-Apart');
  assert.deepEqual([c.hero, c.badge, c.up, c.pr], ['Band × 20', 'newPR', true, null]);
});
