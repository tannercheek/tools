// log-rows.js — the Log Session sheet's rows as plain data, so the rules can be
// tested in Node: prefilling from lastSets, reading typed text, keeping the
// original kg for rows left as prefilled, and noticing edits. Pure.
//
// A row is { weight: string, reps: string, prefill: { weight, kg } | null }:
// the text in its two fields, plus what its weight field was prefilled with.

import { formatWeight, parseDecimal, parseReps, toKg } from './format.js';

/** Rows copied from lastSets in the display unit, or one empty row for a first
 *  session. A bodyweight set with no added load prefills as an empty field. */
export function prefillRows(lift, unit) {
  if (lift.lastSets.length === 0) return [{ weight: '', reps: '', prefill: null }];
  return lift.lastSets.map(s => {
    const weight = lift.isBodyweight && s.weightKg === 0 ? '' : formatWeight(s.weightKg, unit);
    return { weight, reps: String(s.reps), prefill: { weight, kg: s.weightKg } };
  });
}

/** "Add set": a copy of the last row, including what it was prefilled with. */
export const copyRow = row => ({ ...row, prefill: row.prefill && { ...row.prefill } });

/** The typed weight in the display unit, or NaN when it isn't allowed.
 *  Empty means 0 on a bodyweight lift; everywhere else weight must be above 0. */
export function readWeight(text, isBodyweight) {
  const n = parseDecimal(text);
  if (n === null) return isBodyweight ? 0 : NaN;
  if (Number.isNaN(n) || (!isBodyweight && n <= 0)) return NaN;
  return n;
}

export const weightValid = (text, isBodyweight) => !Number.isNaN(readWeight(text, isBodyweight));
export const repsValid = text => Number.isInteger(parseReps(text));

/** A row as a set in kg, or null when either field is invalid. A weight left
 *  exactly as prefilled keeps its original kg, so repeating last session never
 *  drifts through unit rounding. */
export function readRow(row, unit, isBodyweight) {
  const w = readWeight(row.weight, isBodyweight);
  const reps = parseReps(row.reps);
  if (Number.isNaN(w) || !Number.isInteger(reps)) return null;
  const unchanged = row.prefill && row.weight.trim() === row.prefill.weight;
  return { weightKg: unchanged ? row.prefill.kg : toKg(w, unit), reps };
}

/** All rows as sets, or null if any row is invalid. */
export function readRows(rows, unit, isBodyweight) {
  const sets = rows.map(r => readRow(r, unit, isBodyweight));
  return sets.every(Boolean) ? sets : null;
}

/** True once anything differs from how the sheet opened: a field's text, or
 *  the number of rows. Used to decide whether closing asks to discard. */
export function rowsDiffer(initial, rows) {
  return rows.length !== initial.length ||
    rows.some((r, i) => r.weight !== initial[i].weight || r.reps !== initial[i].reps);
}
