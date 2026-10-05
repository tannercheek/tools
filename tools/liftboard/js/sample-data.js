// sample-data.js — demo data for ?debug → Settings → Load sample data.
// Dates are counted back from `now`, so every case below stays true whenever
// it's loaded:
//   Back Squat     months of rising sessions, latest a record    🔥 ↗
//   Bench Press    beat last session, not the record             ↗ · PR 263
//   Overhead Press last logged 30 days ago                       ❄️
//   Deadlift       latest ties the one before                    · PR 405
//   Pull-Up        bodyweight: plain and loaded sessions         BW+15 × 8 · PR BW+20 × 5
//   Dip            bodyweight, plain only, a new rep record      BW × 12 🔥 ↗
//   Band Pull-Apart band, no weight, a new rep record            Band × 20 🔥 ↗
//   Front Squat    never logged                                  Not logged yet
// Back Squat, Bench Press and Pull-Up also have a few sessions from 7–10
// months ago, none of them records, so "Keep history: 6 months" has
// something to delete without changing any card.

import { summarizeSession, round2 } from './derive.js';
import { toKg } from './format.js';
import { SEED_TAGS, newLiftId, newTagId, newSessionId } from './schema.js';

const threeOf = (lb, reps) => [[lb, reps], [lb, reps], [lb, reps]];

// [name, pattern, equipment, tag names, sessions: [daysAgo, [[lb, reps], …]]]
const LIFTS = [
  ['Back Squat', 'squat', 'barbell', ['Legs', 'Lower'],
    [[250, threeOf(205, 5)], [230, threeOf(210, 5)], [210, threeOf(215, 5)],
      ...Array.from({ length: 13 }, (_, i) => [2 + (12 - i) * 14, threeOf(225 + 5 * i, 5)])]],
  ['Bench Press', 'horizontalPush', 'barbell', ['Push', 'Upper'], [
    [280, threeOf(175, 5)], [240, threeOf(180, 5)],
    [150, threeOf(185, 5)], [120, threeOf(195, 5)], [90, threeOf(205, 5)], [60, threeOf(215, 5)],
    [40, threeOf(225, 5)], [12, threeOf(205, 5)], [5, [[215, 5], [215, 5], [215, 4]]]]],
  ['Overhead Press', 'verticalPush', 'barbell', ['Push', 'Upper'], [
    [60, threeOf(125, 5)], [30, threeOf(135, 5)]]],
  ['Deadlift', 'hinge', 'barbell', ['Pull', 'Lower'], [
    [30, [[405, 1]]], [20, [[365, 3], [365, 3]]], [3, [[365, 3], [365, 3]]]]],
  ['Pull-Up', 'verticalPull', 'bodyweight', ['Pull', 'Upper'], [
    [300, [[0, 8], [0, 7]]], [70, [[0, 10], [0, 9]]], [50, [[0, 12], [0, 10]]], [30, [[20, 5], [20, 5]]], [1, [[15, 8], [15, 7]]]]],
  ['Dip', 'verticalPush', 'bodyweight', ['Push', 'Upper'], [
    [20, [[0, 10], [0, 10]]], [6, [[0, 12], [0, 11]]]]],
  ['Band Pull-Apart', 'horizontalPull', 'band', ['Pull', 'Upper'], [
    [15, [[0, 15], [0, 15]]], [8, [[0, 18], [0, 15]]], [2, [[0, 20], [0, 18]]]]],
  ['Front Squat', 'squat', 'barbell', ['Legs', 'Lower'], []],
];

function daysBefore(now, days) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(18, 0, 0, 0);
  return d;
}

/** Fresh sample tags and lifts, with new ids, in LiftBoard's stored shape. */
export function sampleData(now = new Date()) {
  const tags = SEED_TAGS.map((name, sortOrder) => ({ id: newTagId(), name, sortOrder }));
  const tagId = name => tags.find(t => t.name === name).id;

  const lifts = LIFTS.map(([name, pattern, equipment, tagNames, logs], sortOrder) => {
    const sessions = [];
    let lastSets = [];
    for (const [ago, sets] of logs) {
      lastSets = sets.map(([lb, reps]) => ({ weightKg: round2(toKg(lb, 'lb')), reps }));
      sessions.push({
        id: newSessionId(new Set(sessions.map(s => s.id))),
        ...summarizeSession(lastSets, daysBefore(now, ago)),
      });
    }
    const createdAt = (sessions[0] ? new Date(sessions[0].date) : daysBefore(now, 1)).toISOString();
    return {
      id: newLiftId(), name, pattern, equipment, notes: '', sortOrder, createdAt,
      tagIds: tagNames.map(tagId), lastSets, sessions,
    };
  });
  return { tags, lifts };
}
