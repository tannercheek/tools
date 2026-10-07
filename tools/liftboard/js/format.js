// format.js — turning stored numbers and dates into what's on screen, and typed
// text back into numbers. Pure, like derive.js. Storage is always kg; `unit`
// ('lb' | 'kg') only affects what's shown and how typed weights are read.

import { daysSince, isLoaded } from './derive.js';

/** Whether a session's best e1RM means anything to show: not on a bodyweight
 *  lift (it would ignore body weight), and not for a session with no weight. */
export const showsE1RM = (lift, s) => lift.equipment !== 'bodyweight' && isLoaded(s);

export const KG_PER_LB = 0.45359237;

export const toDisplay = (kg, unit) => (unit === 'lb' ? kg / KG_PER_LB : kg);
export const toKg = (value, unit) => (unit === 'lb' ? value * KG_PER_LB : value);

/** One decimal place at most, trailing zeros stripped: 225, 102.5. */
export const round1 = n => Math.round(n * 10) / 10;

export const formatWeight = (kg, unit) => String(round1(toDisplay(kg, unit)) + 0);   // + 0 turns -0 into 0

/** Estimated 1RMs are whole numbers. */
export const formatE1RM = (kg, unit) => String(Math.round(toDisplay(kg, unit)));

/** The card hero, with no unit: "225 × 5"; on a bodyweight lift "BW × 12" or
 *  "BW+15 × 8"; on a band lift with no weight "Band × 15". */
export function heroText(session, lift, unit) {
  if (!session) return 'Not logged yet';
  const reps = session.topReps;
  if (lift.equipment === 'bodyweight') {
    return isLoaded(session) ? `BW+${formatWeight(session.topWeightKg, unit)} × ${reps}` : `BW × ${reps}`;
  }
  if (lift.equipment === 'band' && !isLoaded(session)) return `Band × ${reps}`;
  return `${formatWeight(session.topWeightKg, unit)} × ${reps}`;
}

/** What the card shows for a session when deciding whether "· PR …" would
 *  repeat the latest (see derive.showsPR). */
export function prFigure(lift, unit) {
  return s => {
    if (!isLoaded(s)) return s.topReps;
    return lift.equipment === 'bodyweight' ? heroText(s, lift, unit) : Math.round(toDisplay(s.bestE1RMKg, unit));
  };
}

/** "Today", "Yesterday", or "5 days ago", counted in local calendar days. */
export function relativeDay(iso, now = new Date()) {
  const n = daysSince(iso, now);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  return `${n} days ago`;
}

/** "Sep 14". LiftBoard's words are English, so its dates are too. */
export const shortDate = iso =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** "Wednesday, Oct 4" — the Board's date line. Unlike LiftBoard's other dates,
 *  it follows the device's language and region. */
export const boardDate = (now = new Date(), locale = undefined) =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' }).format(now);

/** "Today, Sep 22" — the log sheet's date row. */
export const todayLabel = (now = new Date()) => `Today, ${shortDate(now.toISOString())}`;

/** "1 lift", "6 lifts". */
export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Reads a typed decimal. A comma counts as a decimal point.
 *  Returns null for an empty field and NaN for anything unreadable or negative. */
export function parseDecimal(text) {
  const t = String(text).trim().replace(',', '.');
  if (t === '') return null;
  return /^(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN;
}

/** Reps must be a whole number in this range. */
export const REPS_MIN = 1;
export const REPS_MAX = 100;

/** Reads a typed whole number of any size: null when empty, NaN when unreadable. */
export function parseWhole(text) {
  const t = String(text).trim();
  if (t === '') return null;
  return /^\d+$/.test(t) ? Number(t) : NaN;
}

/** Reads typed reps: a whole number from 1 to 100, else NaN (null when empty). */
export function parseReps(text) {
  const n = parseWhole(text);
  if (n === null) return null;
  return n >= REPS_MIN && n <= REPS_MAX ? n : NaN;
}
