// The weight trend on Stats (SPEC §3.7, DESIGN §7): the weigh-ins from the last 12 weeks placed
// on a chart by date, the goal pace from the first of them, and the rate line under the chart.
// Pure: no DOM, so it can be tested in Node. Chart positions are in the plot's 0–100 units: x from
// the window's first day to today, y down from the top.

import { addDays, daysBetween, goalRate, kgToLb, weightRate } from './calc.js';
import { TREND_WINDOW_DAYS } from './data.js';
import { rateOption, weightText } from './profile.js';

const WEIGHT_UNIT = { metric: 'kg', imperial: 'lb' };
const MINUS = '−';

// A line needs two weigh-ins; with fewer in the window, Stats shows the empty state.
export const MIN_TREND_WEIGH_INS = 2;

// The window's first day: it and the days up to today make 12 weeks.
export function trendStart(today) {
  return addDays(today, 1 - TREND_WINDOW_DAYS);
}

// The weigh-ins the chart plots, oldest first: those from the window's first day to today.
export function trendWeighIns(weighIns, today) {
  const start = trendStart(today);
  return weighIns
    .filter(({ date }) => date >= start && date <= today)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// The profile's goal rate in kg/week, signed, or null with no goal yet, or lose or gain with no
// rate. Maintain is 0, so its goal pace is flat.
export function profileGoalRate({ goal, rateKgPerWeek } = {}) {
  if (goal == null || (goal !== 'maintain' && rateKgPerWeek == null)) return null;
  return goalRate(goal, rateKgPerWeek);
}

function toUnits(kg, units) {
  return units === 'imperial' ? kgToLb(kg) : kg;
}

// Weights closer together than this, in the display unit, still get this much height, so a
// steady weight doesn't stretch a few grams of noise across the chart.
const MIN_SPAN = 1;

// Labels whose points are closer than this, in plot units, would overlap on the same side: about
// a label and its gap at --chart-height.
const LABEL_CLEARANCE = 20;

// At most three gridlines (DESIGN §7), at the multiples of the smallest round step (0.5, 1, 2,
// 2.5, 5, 10…) that has no more than three between lo and hi. Top first, with labels.
function gridlineValues(lo, hi) {
  for (let power = 1; ; power *= 10) {
    for (const multiple of [5, 10, 20, 25]) {
      // Over 10, so 0.5 and 2.5 come out exact.
      const step = (multiple * power) / 10;
      const first = Math.ceil(lo / step);
      const last = Math.floor(hi / step);
      if (last - first < 3) {
        return Array.from({ length: last - first + 1 }, (_, i) => {
          const value = (last - i) * step;
          return { value, label: value.toFixed(Number.isInteger(step) ? 0 : 1) };
        });
      }
    }
  }
}

// The chart for the weigh-ins (the log, any order), or null with fewer than two in the window.
// goalKgPerWeek: profileGoalRate's, or null for no goal pace. units: 'metric' or 'imperial'.
// - line: [{ x, y }], the weigh-ins in date order, so the gaps between them show.
// - latest: { x, y, date, label, labelBelow }, the latest weigh-in, labelled with its weight.
// - goal: { from, to, labelBelow } from the first weigh-in to today at the goal rate, or null.
// - gridlines: [{ y, label }], top to bottom, at round values between the lowest and highest.
// - dates: the window's first, middle and last days, for the x-axis labels.
// The weigh-ins and goal pace fill the middle two thirds of the plot's height, leaving a sixth
// above and below for labels.
export function trendChart(weighIns, today, goalKgPerWeek, units) {
  const plotted = trendWeighIns(weighIns, today);
  if (plotted.length < MIN_TREND_WEIGH_INS) return null;

  const start = trendStart(today);
  const days = TREND_WINDOW_DAYS - 1;
  const xOf = (date) => (daysBetween(start, date) / days) * 100;

  const first = plotted[0];
  const goalEndKg = goalKgPerWeek == null ? null : first.kg + (goalKgPerWeek * daysBetween(first.date, today)) / 7;

  const kgs = plotted.map(({ kg }) => kg);
  if (goalEndKg != null) kgs.push(goalEndKg);
  const values = kgs.map((kg) => toUnits(kg, units));
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi - lo < MIN_SPAN) {
    const middle = (lo + hi) / 2;
    lo = middle - MIN_SPAN / 2;
    hi = middle + MIN_SPAN / 2;
  }
  const span = hi - lo;
  const top = hi + span / 4;
  const yOf = (value) => ((top - value) / (span * 1.5)) * 100;
  const yOfKg = (kg) => yOf(toUnits(kg, units));

  const line = plotted.map(({ date, kg }) => ({ x: xOf(date), y: yOfKg(kg) }));
  const goalEnd = goalEndKg == null ? null : { x: 100, y: yOfKg(goalEndKg) };
  const sides = labelSides(line, goalEnd);

  return {
    line,
    latest: { ...line.at(-1), date: plotted.at(-1).date, label: weightText(plotted.at(-1).kg, units), labelBelow: sides.latestBelow },
    goal: goalEnd && { from: line[0], to: goalEnd, labelBelow: sides.goalBelow },
    gridlines: gridlineValues(lo, hi).map(({ value, label }) => ({ y: yOf(value), label })),
    dates: [start, addDays(start, Math.round(days / 2)), today],
  };
}

// Which side of its point each label goes, so no line runs through it. y grows downwards, so a
// smaller y is higher. Each label sits away from the line coming into its point: under a falling
// one, over a rising one. A flat goal pace's label sits away from the latest weigh-in. Two points
// too close to keep their own sides split them instead: the higher one's label above, the lower's below.
function labelSides(line, goalEnd) {
  const latest = line.at(-1);
  let latestBelow = line.at(-2).y < latest.y;
  if (!goalEnd) return { latestBelow, goalBelow: null };

  const start = line[0];
  let goalBelow = goalEnd.y === start.y ? latest.y <= goalEnd.y : goalEnd.y > start.y;
  if (Math.abs(goalEnd.y - latest.y) < LABEL_CLEARANCE) {
    goalBelow = goalEnd.y >= latest.y;
    latestBelow = !goalBelow;
  }
  return { latestBelow, goalBelow };
}

// One decimal, signed, so a loss reads −0.3 and a gain +0.2. One that rounds to 0 has no sign.
function signedRate(value) {
  const text = Math.abs(value).toFixed(1);
  if (Number(text) === 0) return text;
  return (value < 0 ? MINUS : '+') + text;
}

// The goal as its option (0.5 / 1 / 1.5 lb), never a converted value (SPEC §5.2). null with no goal.
function goalText(profile, units) {
  const rate = profileGoalRate(profile);
  if (rate === null) return null;
  if (rate === 0) return '0';
  return (rate < 0 ? MINUS : '+') + rateOption(profile.rateKgPerWeek, units).amount;
}

// The rate line under the chart: "−0.3 kg/week · goal −0.5", or lb/week in imperial. The actual
// rate is calc.js's weightRate; with no goal yet, the line is the rate alone. null while
// weightRate has none (SPEC §3.1).
export function rateSummary(weighIns, today, profile, units) {
  const rate = weightRate(weighIns, today);
  if (rate === null) return null;
  const actual = `${signedRate(toUnits(rate, units))} ${WEIGHT_UNIT[units]}/week`;
  const goal = goalText(profile, units);
  return goal === null ? actual : `${actual} · goal ${goal}`;
}
