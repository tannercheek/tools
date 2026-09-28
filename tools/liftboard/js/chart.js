// chart.js — the Stats chart, hand-drawn in inline SVG (no charting library).
// chartLayout() is pure geometry, tested in Node; drawChart() builds the SVG.
// Colors and fonts come from CSS classes (style.css → Chart), never from here.

const SVG = 'http://www.w3.org/2000/svg';
const HEIGHT = 180;
const PAD_X = 8;     // inner horizontal padding, so end points aren't clipped
const TOP = 32;      // room for the callout above the line
const BOTTOM = 28;   // room for the month labels
const LABEL_SPACING = 48;   // at least this many px per month label

const monthName = d => d.toLocaleDateString('en-US', { month: 'short' });

/**
 * Positions for everything on the chart.
 *   points  [{ date, value }] oldest first (at least one)
 *   start, end  the dates at the left and right edges
 * X is scaled by date, not index. Y is padded around the data's min and max
 * and doesn't start at zero.
 */
export function chartLayout(points, { start, end, width, height = HEIGHT }) {
  const t0 = start.getTime();
  const t1 = Math.max(end.getTime(), t0 + 86_400_000);
  const values = points.map(p => p.value);
  let lo = Math.min(...values), hi = Math.max(...values);
  const pad = hi > lo ? (hi - lo) * 0.15 : Math.max(Math.abs(hi) * 0.05, 1);
  lo -= pad; hi += pad;

  const plotBottom = height - BOTTOM;
  const x = t => PAD_X + ((t - t0) / (t1 - t0)) * (width - 2 * PAD_X);
  const y = v => plotBottom - ((v - lo) / (hi - lo)) * (plotBottom - TOP);

  const coords = points.map(p => ({ x: x(new Date(p.date).getTime()), y: y(p.value) }));
  const gridYs = [0, 1, 2, 3].map(i => TOP + (i / 3) * (plotBottom - TOP));

  // A label at each month boundary inside the range, thinned to fit.
  const boundaries = [];
  const d = new Date(start); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + 1);
  for (; d.getTime() <= t1; d.setMonth(d.getMonth() + 1)) boundaries.push(new Date(d));
  const step = Math.max(1, Math.ceil(boundaries.length / Math.max(1, Math.floor(width / LABEL_SPACING))));
  const labels = boundaries.filter((_, i) => i % step === 0).map(b => ({ x: x(b.getTime()), text: monthName(b) }));

  return { coords, gridYs, labels, width, height };
}

function el(tag, attrs, text) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

/**
 * Draws the chart into `container`, at the container's current width.
 *   callout    the latest value as text, e.g. "263 lb"
 *   ariaLabel  a one-sentence summary for screen readers
 */
export function drawChart(container, { points, start, end, callout, ariaLabel }) {
  const width = Math.max(200, Math.round(container.clientWidth));
  const { coords, gridYs, labels, height } = chartLayout(points, { start, end, width });
  const svg = el('svg', { class: 'chart', viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': ariaLabel });

  for (const gy of gridYs) svg.append(el('line', { class: 'chart-grid', x1: 0, x2: width, y1: gy, y2: gy }));
  svg.append(el('polyline', { class: 'chart-line', points: coords.map(c => `${c.x},${c.y}`).join(' ') }));
  coords.forEach((c, i) => {
    const latest = i === coords.length - 1;
    svg.append(el('circle', { class: 'chart-point', cx: c.x, cy: c.y, r: latest ? 6 : 4 }));
  });

  // The callout sits above the latest point, in the band over the top gridline,
  // so it never collides with the line when an earlier point is higher.
  const last = coords.at(-1);
  svg.append(el('text', {
    class: 't-chart-callout chart-text', x: Math.min(width, last.x + 6), y: gridYs[0] - 12, 'text-anchor': 'end',
  }, callout));

  for (const l of labels) {
    const anchor = l.x < 16 ? 'start' : l.x > width - 16 ? 'end' : 'middle';
    svg.append(el('text', { class: 't-axis chart-text', x: l.x, y: height - 6, 'text-anchor': anchor }, l.text));
  }
  container.replaceChildren(svg);
}
