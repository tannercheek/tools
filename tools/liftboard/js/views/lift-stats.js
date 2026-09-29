// views/lift-stats.js — one lift's detail (#stats/<id>): metric and range
// toggles, Current / Best / Change, the chart, and every session with delete.
// Every number comes from derive.js; this file only arranges them.

import { h, fill } from '../dom.js';
import { confirmDialog } from '../dialogs.js';
import { icon } from '../icons.js';
import { drawChart } from '../chart.js';
import { segmented } from './controls.js';
import {
  metricsFor, defaultMetric, isWeightMetric, series, rangeStart, inRange, summaryFigures, history,
} from '../derive.js';
import { formatWeight, formatE1RM, heroText, shortDate } from '../format.js';

const METRIC_LABELS = { e1rm: 'Est. 1RM', top: 'Top weight', reps: 'Reps', added: 'Added load' };
const METRIC_TITLES = { e1rm: 'Estimated 1RM', top: 'Top weight', reps: 'Reps', added: 'Added load (est. 1RM)' };
const RANGES = [['3m', '3M'], ['6m', '6M'], ['1y', '1Y'], ['all', 'All']];
const RANGE_TEXT = { '3m': 'last 3 months', '6m': 'last 6 months', '1y': 'last year', all: 'all time' };
const RANGE_SPOKEN = { '3m': '3 months', '6m': '6 months', '1y': '1 year', all: 'all time' };
const UNIT_WORDS = { lb: 'pounds', kg: 'kilograms' };

/** The chosen metric and range per lift, kept while the page is open. */
const choices = new Map();

/** "Sep 14 · 225 × 5 · e1RM 263", or "Sep 14 · BW+15 × 8" on a bodyweight lift. */
function sessionText(s, lift, unit) {
  const main = heroText(s, lift, unit);
  return lift.isBodyweight ? `${shortDate(s.date)} · ${main}` : `${shortDate(s.date)} · ${main} · e1RM ${formatE1RM(s.bestE1RMKg, unit)}`;
}

/** Renders the detail; returns a cleanup function for when the view is left. */
export function renderLiftStats(root, store, liftId) {
  let observer = null;

  function draw() {
    observer?.disconnect();
    const lift = store.lift(liftId);
    const { unit } = store.state.settings;
    const state = choices.get(liftId) ?? { metric: defaultMetric(lift), range: '6m' };
    if (!metricsFor(lift).includes(state.metric)) state.metric = defaultMetric(lift);   // bodyweight flag changed
    choices.set(liftId, state);
    const pick = changes => { Object.assign(state, changes); draw(); };

    const header = h('header', { class: 'detail-header' },
      h('a', { class: 'btn-back t-button', href: '#stats', html: icon('chevron-left') }, 'Stats'),
      h('h1', { class: 't-sheet-title' }, lift.name));

    if (lift.sessions.length === 0) {
      fill(root, header, h('div', { class: 'empty' }, h('p', { class: 't-row-label' }, 'Log a session to see stats.')));
      return;
    }

    const { metric, range } = state;
    const now = new Date();
    const points = series(lift, metric);
    const start = rangeStart(range, points, now);
    const ranged = inRange(points, start);
    const figs = summaryFigures(points, ranged);
    const weight = isWeightMetric(metric);
    const unitText = weight ? unit : 'reps';
    const num = v => (v == null ? '—' : !weight ? String(v) : metric === 'top' ? formatWeight(v, unit) : formatE1RM(v, unit));
    const change = figs.change == null ? '—'
      : figs.change === 0 ? '0'
      : `${figs.change > 0 ? '↑' : '↓'} ${num(Math.abs(figs.change))}`;

    const figure = (label, value) => h('div', { class: 'figure' },
      h('span', { class: 't-column' }, label),
      h('span', { class: 't-row-value' }, value),
      h('span', { class: 't-date' }, value === '—' ? '' : unitText));

    const chartBox = h('div', { class: 'chart-box' });
    const card = h('section', { class: 'chart-card', 'aria-label': 'Chart' },
      h('h2', { class: 't-chart-title' }, lift.name),
      h('p', { class: 't-subtitle' }, `${METRIC_TITLES[metric]} · ${RANGE_TEXT[range]}`),
      ranged.length >= 2 ? chartBox : h('p', { class: 't-row-label chart-empty' }, 'Log at least two sessions to see a chart'));

    const sessions = [...history(lift)].reverse();
    fill(root,
      header,
      segmented('Metric', metricsFor(lift).map(m => [m, METRIC_LABELS[m]]), metric, m => pick({ metric: m })),
      segmented('Range', RANGES, range, r => pick({ range: r })),
      h('div', { class: 'figures' },
        figure('Current', num(figs.current)),
        figure('Best', num(figs.best)),
        figure('Change', change)),
      card,
      weight && metric !== 'top'
        ? h('p', { class: 't-subtitle chart-note' }, 'Estimates use the Epley formula and are least reliable above 10 reps.')
        : null,
      h('section', { class: 'group', 'aria-labelledby': 'sessions-heading' },
        h('h2', { class: 't-section', id: 'sessions-heading' }, 'Sessions'),
        h('ul', { class: 'rows' }, sessions.map(s =>
          h('li', { class: 'row session-row' },
            h('span', { class: 't-row-value session-text' }, sessionText(s, lift, unit)),
            h('button', {
              type: 'button', class: 'btn-remove', 'aria-label': `Delete the ${shortDate(s.date)} session`, html: icon('trash-2'),
              onclick: async () => {
                const ok = await confirmDialog(
                  `Delete the ${shortDate(s.date)} session (${heroText(s, lift, unit)})? It can't be recovered.`,
                  'Delete', { destructive: true });
                if (ok) store.deleteSession(liftId, s.id);   // the store change re-renders this view
              },
            }))))));

    if (ranged.length >= 2) {
      const first = ranged[0].value, last = ranged.at(-1).value;
      const opts = {
        points: ranged, start, end: now,
        callout: `${num(last)} ${unitText}`,
        ariaLabel: `${METRIC_TITLES[metric]}, ${RANGE_SPOKEN[range]}, from ${num(first)} to ${num(last)} ${weight ? UNIT_WORDS[unit] : 'reps'}.`,
      };
      drawChart(chartBox, opts);
      let lastWidth = chartBox.clientWidth;
      observer = new ResizeObserver(() => {   // redraw at the new width, so strokes stay crisp
        if (chartBox.clientWidth !== lastWidth) { lastWidth = chartBox.clientWidth; drawChart(chartBox, opts); }
      });
      observer.observe(chartBox);
    }
  }

  draw();
  return () => observer?.disconnect();
}
