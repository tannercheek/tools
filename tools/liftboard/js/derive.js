// derive.js — every derived number in LiftBoard comes from here.
// Pure: no DOM, no storage, and no Date.now() except as default arguments,
// so it can be unit-tested in Node.

export const STALE_AFTER_DAYS = 21;

/** Scores within this of each other count as equal, so unit-conversion noise
 *  can never earn an arrow or a flame. */
export const SCORE_EPSILON = 0.01;

/** True when score a is really better than score b. The 1e-9 absorbs float
 *  error, so a difference of exactly 0.01 still counts as equal. */
export const beats = (a, b) => a - b > SCORE_EPSILON + 1e-9;

/** Every stored weight and e1RM is rounded to 2 decimals. */
export const round2 = n => Math.round(n * 100) / 100;

/** Epley estimate. Exact for a true single, since Epley overshoots ~3% at one rep. */
export const e1rm = (weightKg, reps) =>
  reps > 1 ? weightKg * (1 + reps / 30) : weightKg;

/** Boils a session's sets down to its summary (store.js adds the id). */
export function summarizeSession(sets, date = new Date()) {
  const top = sets.reduce((a, b) =>
    b.weightKg > a.weightKg || (b.weightKg === a.weightKg && b.reps > a.reps) ? b : a);
  return {
    date: date.toISOString(),
    bestE1RMKg: round2(Math.max(...sets.map(s => e1rm(s.weightKg, s.reps)))),
    topWeightKg: round2(top.weightKg),
    topReps: top.reps,
  };
}

/** Sessions oldest first. Always read through this. */
export const history = lift =>
  [...lift.sessions].sort((a, b) => a.date.localeCompare(b.date));

export const latest = lift => history(lift).at(-1) ?? null;

/** A session is "loaded" when its best set carried weight. On a normal lift every
 *  session is loaded, so the rules below collapse to one code path. */
export const isLoaded = s => s.topWeightKg > 0;

/** How good a session was, judged only against sessions of its own kind. */
export const score = s => (isLoaded(s) ? s.bestE1RMKg : s.topReps);

const sameKind = (sessions, s) => sessions.filter(x => isLoaded(x) === isLoaded(s));

/** The record (best) session of one kind. Earliest wins ties, including
 *  near-ties within SCORE_EPSILON. */
export function recordSession(lift, loaded) {
  let best = null;
  for (const s of history(lift)) {
    if (isLoaded(s) !== loaded) continue;
    if (!best || beats(score(s), score(best))) best = s;
  }
  return best;
}

/** Best session of the same kind as the latest — what the card calls the PR. */
export function comparablePR(lift) {
  const l = latest(lift);
  return l ? recordSession(lift, isLoaded(l)) : null;
}

export function previousComparable(lift) {
  const l = latest(lift);
  if (!l) return null;
  return sameKind(history(lift), l).at(-2) ?? null;
}

/** ↗ — the latest session beat the previous one of its kind. */
export function isTrendingUp(lift) {
  const l = latest(lift), p = previousComparable(lift);
  return Boolean(l && p && beats(score(l), score(p)));
}

/** 🔥 — the latest session beat every earlier session of its kind. */
export function latestIsPR(lift) {
  const l = latest(lift);
  if (!l) return false;
  const earlier = sameKind(history(lift), l).slice(0, -1);
  return earlier.length > 0 && earlier.every(e => beats(score(l), score(e)));
}

/** Whether the card appends "· PR …". It's left off when the PR and the latest
 *  session look the same on screen. `figure` maps a session to what's shown for
 *  it (format.js passes the rounded e1RM in the display unit, the reps, or the
 *  "BW+20 × 5" text); the default is the rounded score. */
export function showsPR(lift, figure = s => Math.round(score(s))) {
  const l = latest(lift), pr = comparablePR(lift);
  return Boolean(l && pr && figure(pr) !== figure(l));
}

/** Whole calendar days between two dates, in local time. */
export function daysSince(iso, now = new Date()) {
  const a = new Date(iso); a.setHours(0, 0, 0, 0);
  const b = new Date(now); b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86_400_000);
}

/** The card's corner badge. First matching rule wins. */
export function badge(lift, now = new Date()) {
  const l = latest(lift);
  if (!l) return 'neverLogged';
  if (daysSince(l.date, now) >= STALE_AFTER_DAYS) return 'stale';   // ❄️
  if (latestIsPR(lift)) return 'newPR';                               // 🔥
  return 'none';
}

/** Keep history choices, in months. */
export const RETENTION_MONTHS = { '6m': 6, '1y': 12, '2y': 24 };

/** Pure: returns the sessions to keep and how many would go. The latest session
 *  and the record of each kind are always kept, whatever their age. */
export function pruneSessions(lift, months, now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - months);
  const keep = new Set(
    [latest(lift), recordSession(lift, true), recordSession(lift, false)]
      .filter(Boolean).map(s => s.id));
  const kept = lift.sessions.filter(s => new Date(s.date) >= cutoff || keep.has(s.id));
  return { kept, removed: lift.sessions.length - kept.length };
}

/* ── The Board's filter and sort ── */

/** Lifts having any of the selected tags. No selection (or only tags that no
 *  longer exist) means all lifts. */
export function filterLifts(lifts, selectedTagIds, existingTagIds) {
  const selected = selectedTagIds.filter(id => existingTagIds.includes(id));
  if (selected.length === 0) return lifts;
  return lifts.filter(l => l.tagIds.some(id => selected.includes(id)));
}

const byCustom = (a, b) => a.sortOrder - b.sortOrder;
const byName = (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || byCustom(a, b);

/** The Board's order. In every sort, never-logged lifts go last (in custom
 *  order among themselves). "e1rm" ranks by the loaded record — a bodyweight
 *  lift's added-load record — and lifts with only plain bodyweight sessions
 *  come after every lift that has an e1RM. Ties fall back to custom order. */
export function sortLifts(lifts, sort) {
  const logged = lifts.filter(l => l.sessions.length > 0);
  const never = lifts.filter(l => l.sessions.length === 0).sort(byCustom);
  let ordered;
  if (sort === 'recent') {
    ordered = logged.sort((a, b) => latest(b).date.localeCompare(latest(a).date) || byCustom(a, b));
  } else if (sort === 'name') {
    ordered = logged.sort(byName);
  } else if (sort === 'e1rm') {
    const best = l => recordSession(l, true)?.bestE1RMKg ?? -1;   // -1: no loaded session
    ordered = logged.sort((a, b) => best(b) - best(a) || byCustom(a, b));
  } else {
    ordered = logged.sort(byCustom);
  }
  return [...ordered, ...never];
}
