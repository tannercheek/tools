import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalRate, kgToLb, lbToKg, weightRate } from '../js/calc.js';
import { profileGoalRate, rateSummary, trendChart, trendStart, trendWeighIns } from '../js/trend.js';

const TODAY = '2026-10-20';

// Float math: compare to within a hair, not exactly.
function assertClose(actual, expected, tolerance = 1e-9, message = '') {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} expected ${expected}, got ${actual}`);
}

// Sporadic weigh-ins over the last 12 weeks, out of date order, plus one from before the window.
const SPORADIC = [
  { date: '2026-10-18', kg: 81.6 },
  { date: '2026-08-03', kg: 84.2 },
  { date: '2026-07-01', kg: 86.0 },
  { date: '2026-09-21', kg: 82.9 },
  { date: '2026-10-04', kg: 82.4 },
  { date: '2026-09-28', kg: 82.0 },
];

// --- Window ---

test('the window is today and the 83 days before it, so 12 weeks', () => {
  assert.equal(trendStart(TODAY), '2026-07-29');
  assert.equal(trendStart('2027-01-10'), '2026-10-19');
});

test('the chart plots the weigh-ins in the window, oldest first, from its first day to today', () => {
  const weighIns = [
    { date: '2026-10-20', kg: 81.5 },
    { date: '2026-07-28', kg: 85.0 },
    { date: '2026-07-29', kg: 84.8 },
    { date: '2026-10-21', kg: 81.4 },
  ];
  assert.deepEqual(trendWeighIns(weighIns, TODAY), [
    { date: '2026-07-29', kg: 84.8 },
    { date: '2026-10-20', kg: 81.5 },
  ]);
});

// --- Goal rate ---

test('the goal rate is signed: negative to lose, positive to gain, 0 to maintain', () => {
  assert.equal(goalRate('lose', 0.5), -0.5);
  assert.equal(goalRate('gain', 0.25), 0.25);
  assert.equal(goalRate('maintain', null), 0);
  assert.throws(() => goalRate('bulk', 0.5), RangeError);
});

test('there is no goal rate until the profile has a goal, and a rate unless it is maintain', () => {
  assert.equal(profileGoalRate({}), null);
  assert.equal(profileGoalRate({ goal: 'lose', rateKgPerWeek: null }), null);
  assert.equal(profileGoalRate({ goal: 'lose', rateKgPerWeek: 0.75 }), -0.75);
  assert.equal(profileGoalRate({ goal: 'maintain' }), 0);
  assert.equal(profileGoalRate(), null);
});

// --- Chart ---

test('with fewer than two weigh-ins in the window there is no chart', () => {
  assert.equal(trendChart([], TODAY, -0.5, 'metric'), null);
  const oneInWindow = [
    { date: '2026-07-01', kg: 86.0 },
    { date: '2026-10-18', kg: 81.6 },
  ];
  assert.equal(trendChart(oneInWindow, TODAY, -0.5, 'metric'), null);
});

test('sporadic weigh-ins are joined in date order, each at its own date', () => {
  const chart = trendChart(SPORADIC, TODAY, null, 'metric');
  // Days from the window's first day (Jul 29) over the 83 days to today.
  const expectedX = [5, 54, 61, 67, 81].map((days) => (days / 83) * 100);
  assert.equal(chart.line.length, 5);
  chart.line.forEach(({ x }, i) => assertClose(x, expectedX[i], 1e-9, `point ${i}:`));
  // Heavier is higher on the chart, so a smaller y.
  const plotted = trendWeighIns(SPORADIC, TODAY);
  for (let i = 1; i < plotted.length; i++) {
    const heavier = plotted[i].kg > plotted[i - 1].kg;
    assert.equal(chart.line[i].y < chart.line[i - 1].y, heavier, `point ${i}`);
  }
});

test('the latest weigh-in in the window is labelled with its weight, in the profile units', () => {
  const metric = trendChart(SPORADIC, TODAY, null, 'metric');
  assert.deepEqual({ x: metric.latest.x, y: metric.latest.y }, metric.line.at(-1));
  assert.equal(metric.latest.label, '81.6');
  assert.equal(trendChart(SPORADIC, TODAY, null, 'imperial').latest.label, kgToLb(81.6).toFixed(1));
});

test('180 lb entered shows 180.0 again on the chart', () => {
  const weighIns = [
    { date: '2026-10-01', kg: lbToKg(182) },
    { date: '2026-10-15', kg: lbToKg(180) },
  ];
  assert.equal(trendChart(weighIns, TODAY, null, 'imperial').latest.label, '180.0');
});

test('the weigh-ins and goal pace fill the middle two thirds, leaving room above and below for labels', () => {
  for (const goal of [null, -0.75, 0.75]) {
    for (const units of ['metric', 'imperial']) {
      const chart = trendChart(SPORADIC, TODAY, goal, units);
      const ys = chart.line.map(({ y }) => y);
      if (chart.goal) ys.push(chart.goal.to.y);
      assertClose(Math.min(...ys), 100 / 6, 1e-9, `${goal} ${units} top:`);
      assertClose(Math.max(...ys), (100 * 5) / 6, 1e-9, `${goal} ${units} bottom:`);
    }
  }
});

test('up to three gridlines sit at round values in the profile units, top first', () => {
  // 81.6 to 84.2 kg.
  const metric = trendChart(SPORADIC, TODAY, null, 'metric');
  assert.deepEqual(metric.gridlines.map(({ label }) => label), ['84', '83', '82']);
  // 179.9 to 185.6 lb.
  const imperial = trendChart(SPORADIC, TODAY, null, 'imperial');
  assert.deepEqual(imperial.gridlines.map(({ label }) => label), ['184', '182', '180']);
  // A goal pace down to 75.8 kg widens it to steps of 2.5.
  const losing = trendChart(SPORADIC, TODAY, -0.75, 'metric');
  assert.deepEqual(losing.gridlines.map(({ label }) => label), ['82.5', '80.0', '77.5']);
  // Each gridline is where a weight of its value would be drawn, between the top and bottom.
  const ys = metric.gridlines.map(({ y }) => y);
  assert.ok(ys[0] < ys[1] && ys[1] < ys[2], `ys: ${ys}`);
  assertClose(ys[1] - ys[0], ys[2] - ys[1]);
});

test('weights close together still get a kilo of height, with half-kilo gridlines', () => {
  const close = [
    { date: '2026-10-10', kg: 82.2 },
    { date: '2026-10-17', kg: 82.6 },
  ];
  const chart = trendChart(close, TODAY, null, 'metric');
  assert.deepEqual(chart.gridlines.map(({ label }) => label), ['82.5', '82.0']);
  // 0.4 kg of a 1 kg span, in the middle two thirds of the height.
  assertClose(chart.line[0].y - chart.line[1].y, (0.4 / 1) * (200 / 3));
});

test('one steady weight still gets a chart, its line flat across the middle', () => {
  const steady = [
    { date: '2026-10-06', kg: 80 },
    { date: '2026-10-13', kg: 80 },
  ];
  const chart = trendChart(steady, TODAY, 0, 'metric');
  assert.deepEqual(chart.gridlines.map(({ label }) => label), ['80.5', '80.0', '79.5']);
  assert.deepEqual(chart.line.map(({ y }) => y), [50, 50]);
});

test('the goal pace starts at the first weigh-in in the window and follows the goal rate to today', () => {
  const chart = trendChart(SPORADIC, TODAY, -0.5, 'metric');
  assert.deepEqual(chart.goal.from, chart.line[0]);
  assert.equal(chart.goal.to.x, 100);
  // From 84.2 kg on Aug 3, 78 days at −0.5 kg/week reaches 84.2 − 5.571… kg.
  const expectedKg = 84.2 - (0.5 * 78) / 7;
  // Where the weight line would draw that weight, from its first and last points.
  const [first, last] = [chart.line[0], chart.line.at(-1)];
  const yPerKg = (last.y - first.y) / (81.6 - 84.2);
  assertClose(chart.goal.to.y, first.y + (expectedKg - 84.2) * yPerKg);
});

test('for maintain the goal pace is flat, and with no goal there is none', () => {
  const maintain = trendChart(SPORADIC, TODAY, 0, 'metric');
  assert.equal(maintain.goal.to.y, maintain.goal.from.y);
  assert.equal(trendChart(SPORADIC, TODAY, null, 'metric').goal, null);
});

test('each label sits on the side away from the line coming into its point', () => {
  // The weight falls to the latest weigh-in and the goal pace falls, far below it: both go under.
  const losing = trendChart(SPORADIC, TODAY, -0.5, 'metric');
  assert.deepEqual([losing.latest.labelBelow, losing.goal.labelBelow], [true, true]);
  // A rising weight puts its label over the point.
  const rising = [
    { date: '2026-10-06', kg: 80.0 },
    { date: '2026-10-13', kg: 80.5 },
  ];
  assert.equal(trendChart(rising, TODAY, null, 'metric').latest.labelBelow, false);
  // A rising goal pace puts its label over its end.
  const gaining = [
    { date: '2026-09-01', kg: 70.0 },
    { date: '2026-10-01', kg: 70.6 },
    { date: '2026-10-15', kg: 70.4 },
  ];
  const gain = trendChart(gaining, TODAY, 0.25, 'metric');
  assert.deepEqual([gain.latest.labelBelow, gain.goal.labelBelow], [true, false]);
});

test('a flat goal pace puts its label on the side away from the latest weigh-in', () => {
  // Maintain from 84.2 kg, with the latest well under it at 81.6.
  const chart = trendChart(SPORADIC, TODAY, 0, 'metric');
  assert.ok(chart.goal.to.y < chart.latest.y);
  assert.equal(chart.goal.labelBelow, false);
});

test('when the goal pace ends close to the latest weigh-in, the higher label goes above', () => {
  // −0.25 kg/week from 84.2 ends at 81.41, just under the latest 81.6.
  const chart = trendChart(SPORADIC, TODAY, -0.25, 'metric');
  assert.ok(chart.goal.to.y > chart.latest.y);
  assert.deepEqual([chart.latest.labelBelow, chart.goal.labelBelow], [false, true]);
});

test('the x-axis is labelled at the window’s first, middle and last days', () => {
  assert.deepEqual(trendChart(SPORADIC, TODAY, null, 'metric').dates, ['2026-07-29', '2026-09-09', TODAY]);
});

// --- Rate line ---

const LOSING = { goal: 'lose', rateKgPerWeek: 0.5 };

test('the rate line shows weightRate against the goal, in kg/week', () => {
  const rate = weightRate(SPORADIC, TODAY);
  const expected = `−${Math.abs(rate).toFixed(1)} kg/week · goal −0.5`;
  assert.equal(rateSummary(SPORADIC, TODAY, LOSING, 'metric'), expected);
});

test('in imperial the rate line shows lb/week and the goal as its lb option', () => {
  const rate = weightRate(SPORADIC, TODAY);
  const expected = `−${Math.abs(kgToLb(rate)).toFixed(1)} lb/week · goal −1`;
  assert.equal(rateSummary(SPORADIC, TODAY, { goal: 'lose', rateKgPerWeek: lbToKg(1) }, 'imperial'), expected);
  // A rate saved in kg shows as the matching lb option, never a converted 1.1.
  assert.match(rateSummary(SPORADIC, TODAY, LOSING, 'imperial'), / · goal −1$/);
});

test('a gain reads with a plus, maintain as goal 0, and no goal leaves the rate alone', () => {
  const gaining = [
    { date: '2026-10-06', kg: 70.0 },
    { date: '2026-10-13', kg: 70.2 },
    { date: '2026-10-20', kg: 70.4 },
  ];
  assert.equal(rateSummary(gaining, TODAY, { goal: 'gain', rateKgPerWeek: 0.25 }, 'metric'), '+0.2 kg/week · goal +0.25');
  assert.equal(rateSummary(gaining, TODAY, { goal: 'maintain' }, 'metric'), '+0.2 kg/week · goal 0');
  assert.equal(rateSummary(gaining, TODAY, {}, 'metric'), '+0.2 kg/week');
});

test('a rate that rounds to 0 has no sign', () => {
  const steady = [
    { date: '2026-10-06', kg: 80.0 },
    { date: '2026-10-20', kg: 79.98 },
  ];
  assert.equal(rateSummary(steady, TODAY, { goal: 'maintain' }, 'metric'), '0.0 kg/week · goal 0');
});

test('with no rate from weightRate there is no rate line', () => {
  const tooClose = [
    { date: '2026-10-15', kg: 82.0 },
    { date: '2026-10-18', kg: 81.8 },
  ];
  assert.equal(weightRate(tooClose, TODAY), null);
  assert.equal(rateSummary(tooClose, TODAY, LOSING, 'metric'), null);
});
