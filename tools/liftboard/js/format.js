// format.js — turning stored numbers and dates into what's on screen, and typed
// text back into numbers. Pure, like derive.js. Storage is always kg; `unit`
// ('lb' | 'kg') only affects what's shown and how typed weights are read.

import { daysSince, isLoaded } from './derive.js';

export const KG_PER_LB = 0.45359237;

export const toDisplay = (kg, unit) => (unit === 'lb' ? kg / KG_PER_LB : kg);
export const toKg = (value, unit) => (unit === 'lb' ? value * KG_PER_LB : value);

/** One decimal place at most, trailing zeros stripped: 225, 102.5. */
export const round1 = n => Math.round(n * 10) / 10;

export const formatWeight = (kg, unit) => String(round1(toDisplay(kg, unit)) + 0);   // + 0 turns -0 into 0

/** Estimated 1RMs are whole numbers. */
export const formatE1RM = (kg, unit) => String(Math.round(toDisplay(kg, unit)));

/** The card hero, with no unit: "225 × 5", "BW × 12", "BW+15 × 8". */
export function heroText(session, lift, unit) {
  if (!session) return 'Not logged yet';
  const reps = session.topReps;
  if (!lift.isBodyweight) return `${formatWeight(session.topWeightKg, unit)} × ${reps}`;
  return isLoaded(session) ? `BW+${formatWeight(session.topWeightKg, unit)} × ${reps}` : `BW × ${reps}`;
}

/** What the card shows for a session when deciding whether "· PR …" would
 *  repeat the latest (see derive.showsPR). */
export function prFigure(lift, unit) {
  return s => {
    if (!lift.isBodyweight) return Math.round(toDisplay(s.bestE1RMKg, unit));
    return isLoaded(s) ? heroText(s, lift, unit) : s.topReps;
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

/** Reads typed reps: a whole number from 1 to 100, else NaN (null when empty). */
export function parseReps(text) {
  const t = String(text).trim();
  if (t === '') return null;
  const n = /^\d+$/.test(t) ? Number(t) : NaN;
  return n >= 1 && n <= 100 ? n : NaN;
}
