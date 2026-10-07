// log-rows.js — the Log Session sheet's rows as plain data, so the rules can be
// tested in Node: prefilling from lastSets, reading typed text, keeping the
// original kg for rows left as prefilled, and noticing edits. Pure.
//
// A row is { weight: string, reps: string, prefill: { weight, kg } | null }:
// the text in its two fields, plus what its weight field was prefilled with.

import { formatWeight, parseDecimal, parseReps, parseWhole, round1, toKg, REPS_MIN, REPS_MAX } from './format.js';
import { allowsNoWeight } from './library.js';

/** How far one tap of a set field's − or + moves it. Weight follows the unit setting. */
export const WEIGHT_STEP = { lb: 5, kg: 2.5 };
export const REPS_STEP = 1;

/** Rows copied from lastSets in the display unit, or one empty row for a first
 *  session. On a bodyweight or band lift, a set with no weight prefills empty. */
export function prefillRows(lift, unit) {
  if (lift.lastSets.length === 0) return [{ weight: '', reps: '', prefill: null }];
  return lift.lastSets.map(s => {
    const weight = allowsNoWeight(lift) && s.weightKg === 0 ? '' : formatWeight(s.weightKg, unit);
    return { weight, reps: String(s.reps), prefill: { weight, kg: s.weightKg } };
  });
}

/** "Add set": a copy of the last row, including what it was prefilled with. */
export const copyRow = row => ({ ...row, prefill: row.prefill && { ...row.prefill } });

/** The typed weight in the display unit, or NaN when it isn't allowed.
 *  With noWeightOk (bodyweight and band lifts) empty means 0; otherwise weight
 *  must be above 0. */
export function readWeight(text, noWeightOk) {
  const n = parseDecimal(text);
  if (n === null) return noWeightOk ? 0 : NaN;
  if (Number.isNaN(n) || (!noWeightOk && n <= 0)) return NaN;
  return n;
}

export const weightValid = (text, noWeightOk) => !Number.isNaN(readWeight(text, noWeightOk));
export const repsValid = text => Number.isInteger(parseReps(text));

/** A row as a set in kg, or null when either field is invalid. A weight left
 *  exactly as prefilled keeps its original kg, so repeating last session never
 *  drifts through unit rounding. */
export function readRow(row, unit, noWeightOk) {
  const w = readWeight(row.weight, noWeightOk);
  const reps = parseReps(row.reps);
  if (Number.isNaN(w) || !Number.isInteger(reps)) return null;
  const unchanged = row.prefill && row.weight.trim() === row.prefill.weight;
  return { weightKg: unchanged ? row.prefill.kg : toKg(w, unit), reps };
}

/** All rows as sets, or null if any row is invalid. */
export function readRows(rows, unit, noWeightOk) {
  const sets = rows.map(r => readRow(r, unit, noWeightOk));
  return sets.every(Boolean) ? sets : null;
}

/** True once anything differs from how the sheet opened: a field's text, or
 *  the number of rows. Used to decide whether closing asks to discard. */
export function rowsDiffer(initial, rows) {
  return rows.length !== initial.length ||
    rows.some((r, i) => r.weight !== initial[i].weight || r.reps !== initial[i].reps);
}


/** One tap of − or +: current plus delta, rounded to one decimal (no snapping
 *  to multiples) and kept within min…max. `current` is a parsed field: null
 *  (empty) counts as 0, and NaN (unreadable) gives null, meaning the button does
 *  nothing. So does a tap that would leave the value where it is, or move it the
 *  wrong way (− on an empty reps field would otherwise jump up to 1). */
export function stepValue(current, delta, { min = -Infinity, max = Infinity } = {}) {
  if (Number.isNaN(current)) return null;
  const from = current ?? 0;
  const to = Math.min(max, Math.max(min, round1(from + delta)));
  return Math.sign(to - from) === Math.sign(delta) ? to : null;
}

/** A weight field after one tap (direction −1 or +1): its new text, or null for
 *  no change. Never below 0 where no weight is allowed (bodyweight, band), and
 *  never below one step on any other lift, which needs a weight above 0. */
export function stepWeight(text, direction, unit, noWeightOk) {
  const step = WEIGHT_STEP[unit];
  const n = stepValue(parseDecimal(text), direction * step, { min: noWeightOk ? 0 : step });
  return n === null ? null : String(n);
}

/** A reps field after one tap: its new text, or null for no change. */
export function stepReps(text, direction) {
  const n = stepValue(parseWhole(text), direction * REPS_STEP, { min: REPS_MIN, max: REPS_MAX });
  return n === null ? null : String(n);
}
