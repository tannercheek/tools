import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chartLayout } from '../js/chart.js';

const day = (m, d) => new Date(2026, m, d, 12).toISOString();

test('x is scaled by date, inside the 8px inner padding', () => {
  const points = [{ date: day(3, 1), value: 100 }, { date: day(3, 2), value: 110 }, { date: day(8, 22), value: 120 }];
  const { coords } = chartLayout(points, { start: new Date(2026, 2, 22), end: new Date(2026, 8, 22, 12), width: 300 });
  assert.ok(coords[1].x - coords[0].x < 5, 'one day apart stays close');
  assert.ok(Math.abs(coords[2].x - 292) < 0.5, 'the latest (at the end date) sits at the right padding');
  for (const c of coords) assert.ok(c.x >= 8 && c.x <= 292);
});

test('y is padded around min and max, higher values drawn higher', () => {
  const points = [{ date: day(6, 1), value: 229 }, { date: day(8, 1), value: 263 }];
  const { coords, gridYs, height } = chartLayout(points, { start: new Date(2026, 5, 1), end: new Date(2026, 8, 1), width: 300 });
  assert.ok(coords[1].y < coords[0].y);
  assert.ok(coords[1].y > gridYs[0] && coords[0].y < gridYs[3], 'neither extreme touches the grid edges');
  assert.equal(gridYs.length, 4);
  assert.ok(gridYs[3] < height);
});

test('equal values still draw a flat line inside the plot', () => {
  const points = [{ date: day(7, 1), value: 12 }, { date: day(8, 1), value: 12 }];
  const { coords, gridYs } = chartLayout(points, { start: new Date(2026, 6, 1), end: new Date(2026, 8, 1), width: 300 });
  assert.equal(coords[0].y, coords[1].y);
  assert.ok(coords[0].y > gridYs[0] && coords[0].y < gridYs[3]);
});

test('month labels at boundaries, thinned on narrow charts', () => {
  const points = [{ date: day(3, 1), value: 1 }, { date: day(8, 20), value: 2 }];
  const wide = chartLayout(points, { start: new Date(2026, 2, 22), end: new Date(2026, 8, 22), width: 600 });
  assert.deepEqual(wide.labels.map(l => l.text), ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep']);
  const year = chartLayout(points, { start: new Date(2025, 8, 22), end: new Date(2026, 8, 22), width: 250 });
  assert.ok(year.labels.length <= 5, `${year.labels.length} labels fit in 250px`);
});
