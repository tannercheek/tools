// The weight trend card on Stats (SPEC §3.7, DESIGN §7): a line through the last 12 weeks of
// weigh-ins by date with the latest labelled, the dashed goal pace, then the latest weight and
// the rate line. The chart is hidden from assistive tech; the latest weight, the rate line and
// the list of weigh-ins under it carry the same numbers as text.

import { profileGoalRate, rateSummary, trendChart } from '../trend.js';

const WEIGHT_UNIT = { metric: 'kg', imperial: 'lb' };
const axisDates = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const latestDates = {
  thisYear: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
  otherYear: new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
};

// Within this far of either side, a label lines up with that side instead of centring on its
// point, so it stays inside the card. In the plot's 0–100 units.
const LABEL_EDGE = 15;

function toDate(date) {
  return new Date(`${date}T00:00`);
}

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

// A label or point over the plot, placed by percentages so it stays put as the card resizes.
function place(node, { x, y }) {
  node.style.left = `${x}%`;
  node.style.top = `${y}%`;
  return node;
}

function label(text, point, { below, align }) {
  const node = place(element('span', 'trend__label', text), point);
  node.classList.add(below ? 'trend__label--below' : 'trend__label--above', `trend__label--${align}`);
  return node;
}

function alignFor(x) {
  if (x < LABEL_EDGE) return 'start';
  return x > 100 - LABEL_EDGE ? 'end' : 'centre';
}

function pathData(points) {
  return points.map(({ x, y }, i) => `${i === 0 ? 'M' : 'L'}${x} ${y}`).join(' ');
}

// Gridlines and lines in one SVG stretched to the plot (DESIGN §7: preserveAspectRatio="none" on
// the plot only). Their strokes don't scale, so widths and dashes stay as the tokens say. The
// point and labels sit over it as HTML, so no text is ever stretched.
function plot(chart) {
  const box = element('div', 'trend__plot');
  const grid = chart.gridlines.map(({ y }) => `<line class="trend__grid" x1="0" x2="100" y1="${y}" y2="${y}"/>`);
  const goal = chart.goal ? `<path class="trend__goal" d="${pathData([chart.goal.from, chart.goal.to])}"/>` : '';
  box.innerHTML =
    '<svg class="trend__svg" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">' +
    `${grid.join('')}${goal}<path class="trend__line" d="${pathData(chart.line)}"/></svg>`;

  const { latest } = chart;
  const value = label(latest.label, latest, { below: latest.labelBelow, align: alignFor(latest.x) });
  value.classList.add('trend__value');
  box.append(place(element('span', 'trend__point'), latest), value);
  if (chart.goal) box.append(label('Goal pace', chart.goal.to, { below: chart.goal.labelBelow, align: 'end' }));
  return box;
}

// Each gridline's value beside it. The widest one, hidden, sizes the column, since the others are
// placed out of the flow.
function yAxis(gridlines) {
  const axis = element('div', 'trend__y-axis');
  const widest = gridlines.reduce((a, b) => (b.label.length > a.label.length ? b : a));
  axis.append(element('span', 'trend__y-sizer', widest.label));
  for (const { y, label: text } of gridlines) axis.append(place(element('span', 'trend__y-label', text), { x: 0, y }));
  return axis;
}

// The first, middle and last days only (DESIGN §7).
function xAxis(dates) {
  const axis = element('div', 'trend__x-axis');
  axis.append(...dates.map((date) => element('span', 'trend__x-label', axisDates.format(toDate(date)))));
  return axis;
}

// "81.6 kg Sun, Oct 18": the latest weigh-in, which is the profile's weight. The log keeps every
// weigh-in, so one from another year shows its year, as in the list.
function latestLine({ date, label: weight }, units, today) {
  const dates = date.slice(0, 4) === today.slice(0, 4) ? latestDates.thisYear : latestDates.otherYear;
  const amount = element('span', 'trend__weight', weight);
  amount.append(' ', element('span', 'trend__unit', WEIGHT_UNIT[units]));
  const line = element('p', 'trend__latest');
  line.append(amount, ' ', element('span', 'trend__date', dates.format(toDate(date))));
  return line;
}

// The trend card, or null with fewer than two weigh-ins in the window, where Stats shows the
// empty state instead. weighIns: the log, oldest first. profile: the core doc's, for the goal.
export function weightTrend({ weighIns, today, profile, units }) {
  const chart = trendChart(weighIns, today, profileGoalRate(profile), units);
  if (!chart) return null;

  const figure = element('div', 'trend__chart');
  figure.setAttribute('aria-hidden', 'true');
  figure.append(yAxis(chart.gridlines), plot(chart), xAxis(chart.dates));

  const card = element('div', 'trend');
  card.append(figure, latestLine(chart.latest, units, today));
  const rate = rateSummary(weighIns, today, profile, units);
  if (rate) card.append(element('p', 'trend__rate', rate));
  return card;
}
