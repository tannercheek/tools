import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  e1rm, round2, beats, summarizeSession, history, latest, isLoaded, score,
  recordSession, comparablePR, previousComparable, isTrendingUp, latestIsPR,
  showsPR, daysSince, badge, pruneSessions, STALE_AFTER_DAYS, filterLifts, sortLifts,
} from '../js/derive.js';

const NOW = new Date(2026, 8, 22, 12, 0);   // Sep 22 2026, noon local
const daysAgo = n => { const d = new Date(NOW); d.setDate(d.getDate() - n); return d.toISOString(); };

let n = 0;
/** A session summary. topWeightKg 0 makes it a plain bodyweight session. */
const sess = (ago, bestE1RMKg, topWeightKg = bestE1RMKg, topReps = 5) =>
  ({ id: `s-${String(++n).padStart(8, '0')}`, date: daysAgo(ago), bestE1RMKg, topWeightKg, topReps });
const bw = (ago, reps) => sess(ago, 0, 0, reps);
const lift = (sessions, isBodyweight = false) => ({ isBodyweight, sessions });

test('e1rm: Epley above one rep, exact for a single', () => {
  assert.equal(e1rm(100, 1), 100);
  assert.ok(Math.abs(e1rm(100, 5) - 116.6667) < 1e-4);
  assert.equal(e1rm(0, 12), 0);
});

test('round2 and beats: ties within 0.01', () => {
  assert.equal(round2(102.058283), 102.06);
  assert.equal(beats(100.01, 100), false);
  assert.equal(beats(100.02, 100), true);
  assert.equal(beats(100, 100), false);
  assert.equal(beats(99, 100), false);
  assert.equal(beats(13, 12), true);
});

test('summarizeSession: top set and best e1RM can come from different sets', () => {
  const s = summarizeSession([
    { weightKg: 100, reps: 5 }, { weightKg: 110, reps: 1 }, { weightKg: 90, reps: 10 },
  ], NOW);
  assert.equal(s.topWeightKg, 110);
  assert.equal(s.topReps, 1);
  assert.equal(s.bestE1RMKg, 120);   // 90 × (1 + 10/30)
  assert.equal(s.date, NOW.toISOString());
});

test('summarizeSession: equal weights pick the most reps; values rounded to 2 decimals', () => {
  const s = summarizeSession([
    { weightKg: 102.0583, reps: 4 }, { weightKg: 102.0583, reps: 5 },
  ], NOW);
  assert.equal(s.topReps, 5);
  assert.equal(s.topWeightKg, 102.06);
  assert.equal(s.bestE1RMKg, 119.07);
});

test('summarizeSession: a mixed bodyweight session counts as loaded', () => {
  const s = summarizeSession([{ weightKg: 0, reps: 10 }, { weightKg: 10, reps: 5 }], NOW);
  assert.equal(isLoaded(s), true);
  assert.equal(s.topWeightKg, 10);
});

test('history sorts oldest first; latest is null with no sessions', () => {
  const a = sess(1, 100), b = sess(10, 90);
  assert.deepEqual(history(lift([a, b])).map(s => s.id), [b.id, a.id]);
  assert.equal(latest(lift([a, b])), a);
  assert.equal(latest(lift([])), null);
  assert.equal(comparablePR(lift([])), null);
  assert.equal(previousComparable(lift([])), null);
});

test('score: e1RM when loaded, reps when not', () => {
  assert.equal(score(sess(0, 120)), 120);
  assert.equal(score(bw(0, 12)), 12);
});

test('recordSession: earliest wins exact ties and near-ties', () => {
  const first = sess(10, 100), tie = sess(5, 100), near = sess(1, 100.01);
  assert.equal(recordSession(lift([first, tie, near]), true), first);
  const better = sess(0, 100.5);
  assert.equal(recordSession(lift([first, tie, better]), true), better);
});

test('trend and flame', () => {
  // Trending up and a new record
  const up = lift([sess(14, 100), sess(7, 105), sess(0, 110)]);
  assert.equal(isTrendingUp(up), true);
  assert.equal(latestIsPR(up), true);

  // Beat the last session but not the best: arrow, no flame
  const recovering = lift([sess(14, 120), sess(7, 100), sess(0, 110)]);
  assert.equal(isTrendingUp(recovering), true);
  assert.equal(latestIsPR(recovering), false);
  assert.equal(comparablePR(recovering).bestE1RMKg, 120);

  // Tie the best: no flame; equal to last: no arrow
  const tied = lift([sess(7, 110), sess(0, 110)]);
  assert.equal(isTrendingUp(tied), false);
  assert.equal(latestIsPR(tied), false);

  // Within 0.01 is a tie; 0.02 is better
  assert.equal(isTrendingUp(lift([sess(7, 110), sess(0, 110.01)])), false);
  assert.equal(latestIsPR(lift([sess(7, 110), sess(0, 110.01)])), false);
  assert.equal(isTrendingUp(lift([sess(7, 110), sess(0, 110.02)])), true);
  assert.equal(latestIsPR(lift([sess(7, 110), sess(0, 110.02)])), true);

  // Going down: neither
  const down = lift([sess(7, 110), sess(0, 100)]);
  assert.equal(isTrendingUp(down), false);
  assert.equal(latestIsPR(down), false);

  // A first session is trivially a record, so it gets neither
  const first = lift([sess(0, 100)]);
  assert.equal(isTrendingUp(first), false);
  assert.equal(latestIsPR(first), false);
});

test('showsPR: left off when the PR would read the same as the latest', () => {
  assert.equal(showsPR(lift([sess(7, 100), sess(0, 110)])), false);    // latest is the PR
  assert.equal(showsPR(lift([sess(7, 120), sess(0, 110)])), true);     // PR is higher
  assert.equal(showsPR(lift([sess(7, 110), sess(0, 110)])), false);    // exact tie
  assert.equal(showsPR(lift([sess(7, 263.4), sess(0, 262.6)])), false); // both read 263
  assert.equal(showsPR(lift([])), false);
  // A custom figure: compare in pounds, rounded
  const toLb = s => Math.round(s.bestE1RMKg / 0.45359237);
  assert.equal(showsPR(lift([sess(7, 100.4), sess(0, 100.3)]), toLb), false);  // 221.3 and 221.1 both read 221
  assert.equal(showsPR(lift([sess(7, 101), sess(0, 100)]), toLb), true);     // 223 vs 220
});

test('bodyweight: plain and loaded sessions are never compared', () => {
  const plainUp = lift([bw(14, 10), sess(10, 20, 15, 8), bw(0, 12)], true);
  assert.equal(previousComparable(plainUp).topReps, 10);
  assert.equal(isTrendingUp(plainUp), true);    // 12 reps beats 10 reps
  assert.equal(latestIsPR(plainUp), true);
  assert.equal(comparablePR(plainUp).topReps, 12);

  // The first loaded session: nothing of its kind to beat, despite earlier plain ones
  const firstLoaded = lift([bw(14, 20), bw(7, 18), sess(0, 24, 15, 8)], true);
  assert.equal(isTrendingUp(firstLoaded), false);
  assert.equal(latestIsPR(firstLoaded), false);
  assert.equal(comparablePR(firstLoaded).topWeightKg, 15);

  // Loaded sessions judged on e1RM, with a plain session in between
  const loadedUp = lift([sess(14, 20, 15, 8), bw(7, 30), sess(0, 22, 17, 8)], true);
  assert.equal(isTrendingUp(loadedUp), true);
  assert.equal(latestIsPR(loadedUp), true);
  assert.equal(recordSession(loadedUp, false).topReps, 30);
  assert.equal(recordSession(loadedUp, true).topWeightKg, 17);

  // Fewer reps than the plain record doesn't matter to a loaded session
  const plainDown = lift([bw(14, 20), bw(0, 15)], true);
  assert.equal(isTrendingUp(plainDown), false);
  assert.equal(showsPR(plainDown), true);
});

test('daysSince counts local calendar days, not 24-hour spans', () => {
  const lateLastNight = new Date(2026, 8, 21, 23, 0);
  const thisMorning = new Date(2026, 8, 22, 7, 0);
  assert.equal(daysSince(lateLastNight.toISOString(), thisMorning), 1);
  assert.equal(daysSince(new Date(2026, 8, 22, 0, 5).toISOString(), new Date(2026, 8, 22, 23, 55)), 0);
  assert.equal(daysSince(daysAgo(5), NOW), 5);
});

test('badge: every case, stale checked before the flame', () => {
  assert.equal(badge(lift([]), NOW), 'neverLogged');
  assert.equal(badge(lift([sess(30, 100), sess(STALE_AFTER_DAYS, 110)]), NOW), 'stale');
  assert.equal(badge(lift([sess(30, 100), sess(STALE_AFTER_DAYS - 1, 110)]), NOW), 'newPR');
  assert.equal(badge(lift([sess(7, 110), sess(0, 100)]), NOW), 'none');
  assert.equal(badge(lift([sess(0, 100)]), NOW), 'none');
});

test('pruneSessions: removes old sessions but keeps the latest and each record', () => {
  const record = sess(500, 150);       // old loaded record
  const oldPlain = bw(450, 25);        // old plain record (bodyweight lift)
  const oldOrdinary = sess(400, 100);  // old, not a record → removed
  const oldPlainLesser = bw(420, 10);  // old, not a record → removed
  const recent = sess(30, 120);
  const l = lift([record, oldPlain, oldOrdinary, oldPlainLesser, recent], true);
  const { kept, removed } = pruneSessions(l, 12, NOW);
  assert.equal(removed, 2);
  assert.deepEqual(new Set(kept.map(s => s.id)), new Set([record.id, oldPlain.id, recent.id]));
  assert.equal(l.sessions.length, 5, 'pure: the lift is untouched');
});

test('pruneSessions: an old latest session is kept; everything in the window stays', () => {
  const stale = lift([sess(900, 100), sess(800, 90), sess(700, 95)]);
  const { kept, removed } = pruneSessions(stale, 6, NOW);
  assert.deepEqual(kept.map(s => s.bestE1RMKg).sort(), [100, 95]);   // record + latest
  assert.equal(removed, 1);
  const fresh = lift([sess(10, 100), sess(5, 90)]);
  assert.equal(pruneSessions(fresh, 6, NOW).removed, 0);
});


const L = (name, sortOrder, sessions, tagIds = [], isBodyweight = false) => ({ name, sortOrder, sessions, tagIds, isBodyweight });

test('filterLifts: any of the selected tags; none selected means all', () => {
  const lifts = [L('A', 0, [], ['push']), L('B', 1, [], ['legs']), L('C', 2, [], ['push', 'upper']), L('D', 3, [])];
  const names = r => r.map(l => l.name).join('');
  const all = ['push', 'legs', 'upper'];
  assert.equal(names(filterLifts(lifts, [], all)), 'ABCD');
  assert.equal(names(filterLifts(lifts, ['push'], all)), 'AC');
  assert.equal(names(filterLifts(lifts, ['push', 'legs'], all)), 'ABC');
  assert.equal(names(filterLifts(lifts, ['gone'], all)), 'ABCD', 'deleted tags are ignored');
});

test('sortLifts: every order, with never-logged lifts last', () => {
  const lifts = [
    L('bench', 0, [sess(10, 120)]),
    L('Squat', 1, [sess(2, 150)]),
    L('Curl', 2, []),                               // never logged
    L('Dip', 3, [bw(1, 12)], [], true),             // plain bodyweight only
    L('pull-up', 4, [bw(20, 10), sess(5, 30, 20, 5)], [], true),
    L('Apple', 5, []),                              // never logged
  ];
  const order = sort => sortLifts(lifts, sort).map(l => l.name).join(',');
  assert.equal(order('custom'), 'bench,Squat,Dip,pull-up,Curl,Apple');
  assert.equal(order('recent'), 'Dip,Squat,pull-up,bench,Curl,Apple');
  assert.equal(order('name'), 'bench,Dip,pull-up,Squat,Curl,Apple');
  assert.equal(order('e1rm'), 'Squat,bench,pull-up,Dip,Curl,Apple');
  assert.equal(lifts[0].name, 'bench', 'pure: the input order is untouched');
});
