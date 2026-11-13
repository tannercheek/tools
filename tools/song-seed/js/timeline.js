// The Loop timeline (DESIGN §5.10): one CSS grid shared by every lane, a
// playhead moved from the audio clock, auto-follow when the grid is wider
// than its box, and the locked look of a lane (PLAN step 23). Rendering only;
// the loop itself comes from compileLoop().
import { DRUM_TRACKS } from './loop.js';
import { prettyChord, prettyNumeral, strumGlyph } from './display.js';
import { countLabel, STROKE_NAMES } from './strum-editor.js';
import { ICONS } from './icons.js';

const DRUM_LANES = {
  cymbal: ['Cymbal', 'k-cymbal'],
  snare: ['Snare', 'k-snare'],
  kick: ['Kick', 'k-kick'],
};
const LANES = ['chords', 'strum', 'drums']; // the lane groups a lock can mark
const HIT_CLASS = { X: 'hit is-accent', x: 'hit', o: 'hit is-ghost' };
const MARK_NAMES = { X: 'accent', x: 'hit', o: 'ghost', '.': 'empty' };
const FOLLOW_PAUSE_MS = 3000; // after the user scrolls the timeline by hand
const FOLLOW_LEAD = 0.1;      // keep the playhead this far (of the view) from the left edge

// A chord's length for its label: "2 bars", or in beats (the pulse) when
// it's part of a bar: "2 beats", "1.5 beats".
function lengthText(steps, { stepsPerBar, pulse }) {
  const [n, word] = steps % stepsPerBar === 0 ? [steps / stepsPerBar, 'bar'] : [Math.round((steps / pulse) * 10) / 10, 'beat'];
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

// Where step s sits, as a musician counts it on the grid (div steps a
// column): "bar 1, beat 3", "bar 2, and".
function placeText(s, { beats, unit, stepsPerBar }, div) {
  const count = countLabel(`${beats}/${unit}`, 16 / div, (s % stepsPerBar) / div);
  return `bar ${Math.floor(s / stepsPerBar) + 1}, ${/^\d/.test(count) ? `beat ${count}` : count === '&' ? 'and' : count}`;
}

// A drum mark (DESIGN §5.10): accent = bigger, ghost = outline. Null for a rest.
export const hitMark = (mark) => (HIT_CLASS[mark] ? el('span', HIT_CLASS[mark]) : null);

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function createTimeline({ scroller, grid }) {
  const head = el('div', 'tl-playhead');
  const line = el('div', 'tl-ph');
  head.append(line);
  head.hidden = true;
  head.setAttribute('aria-hidden', 'true');

  let loop = null;
  let locked = {};           // { chords, strum, drums }: which lanes are locked
  let labelW = 0;
  let expected = 0;          // scrollLeft as we last set it; anything else is the user
  let userAt = -Infinity;
  let tween = null;

  scroller.addEventListener('scroll', () => {
    if (Math.abs(scroller.scrollLeft - expected) > 1) {
      userAt = performance.now();
      tween = null;
    }
    expected = scroller.scrollLeft;
  }, { passive: true });

  function setLeft(x) {
    scroller.scrollLeft = x;
    expected = scroller.scrollLeft;
  }

  // A lane name. Those with a lane carry a closed lock after the text and a
  // spoken ", locked"; CSS and setLocked() show them while the lane is locked.
  function laneName(text, lane) {
    const node = el('div', 'tl-name', text);
    if (!lane) { node.setAttribute('aria-hidden', 'true'); return node; }
    node.dataset.lane = lane;
    const glyph = el('span', 'tl-lock');
    glyph.setAttribute('aria-hidden', 'true');
    glyph.innerHTML = ICONS.lock;
    const said = el('span', 'sr-only tl-locked', ', locked');
    said.hidden = true;
    node.append(glyph, said);
    return node;
  }

  // res: the grid to draw, 8ths or 16ths (16 whenever the loop uses 16ths).
  // lockedNow: which lane groups are locked (kept from the last render if omitted).
  function render(next, res, lockedNow = locked) {
    loop = next;
    const div = 16 / res; // steps per column
    const cols = loop.totalSteps / div;
    const { stepsPerBar, pulse } = loop.meter;
    const lineClass = (s) => (s % stepsPerBar === 0 ? ' is-bar' : s % pulse === 0 ? ' is-beat' : '');
    const quiet = (node) => { node.setAttribute('aria-hidden', 'true'); return node; };
    grid.style.setProperty('--tl-steps', cols);

    const items = [laneName('')];
    const colsPerBar = stepsPerBar / div;
    for (let c = 0, bar = 1; c < cols; c += colsPerBar, bar++) {
      const n = quiet(el('div', 'tl-bar', String(bar)));
      n.style.gridColumn = `span ${Math.min(colsPerBar, cols - c)}`;
      items.push(n);
    }

    items.push(laneName('Chords', 'chords'));
    loop.chords.forEach((ch, i) => {
      const b = el('button', 'tl-chord');
      b.type = 'button';
      b.dataset.index = i;
      b.style.gridColumn = `span ${(ch.end - ch.start) / div}`;
      // "Am, bar 2, 2 beats". chord-lane.js makes it open the chord menu.
      b.setAttribute('aria-label', `${prettyChord(ch.symbol)}, bar ${Math.floor(ch.start / stepsPerBar) + 1}, ${lengthText(ch.end - ch.start, loop.meter)}`);
      b.append(el('span', 'sym', prettyChord(ch.symbol)), el('span', 'rn', prettyNumeral(ch.numeral)));
      items.push(b);
    });

    // Strum: a button per 8th note, or per 16th for a strum written in 16ths.
    // Past the strum's length the cells are its repeats, drawn as on the drum
    // lanes. strum-lane.js makes them open the stroke menu.
    items.push(laneName('Strum', 'strum'));
    const stride = 16 / loop.strumRes;
    for (let s = 0; s < loop.totalSteps; s += stride) {
      const c = loop.strum[s];
      const repeat = s >= loop.strumSteps;
      const lines = repeat && s % loop.strumSteps === 0 ? ' is-repeat-start' : lineClass(s);
      const cell = el('button', `cell tl-strum${lines}${repeat ? ' is-repeat' : ''}${c ? '' : ' is-rest'}`, strumGlyph(c));
      cell.type = 'button';
      cell.dataset.step = s;
      cell.style.gridColumn = `span ${stride / div}`;
      // "Strum, bar 1, and: up"
      cell.setAttribute('aria-label', `Strum, ${placeText(s, loop.meter, stride)}: ${STROKE_NAMES[c ?? '.'].toLowerCase()}${repeat ? ', repeat' : ''}`);
      items.push(cell);
    }

    // Drums: a button per column. Past the groove's length the cells are its
    // repeats, lighter, with a dashed line where each one starts. drum-lane.js
    // makes them edit the groove.
    for (const track of DRUM_TRACKS) {
      const [label, kind] = DRUM_LANES[track];
      items.push(laneName(label, 'drums'));
      for (let c = 0; c < cols; c++) {
        const s = c * div;
        const v = loop.drums[track][s];
        const mark = !v ? '.' : v >= 1 ? 'X' : v < 0.5 ? 'o' : 'x';
        const repeat = s >= loop.grooveSteps;
        const lines = repeat && s % loop.grooveSteps === 0 ? ' is-repeat-start' : lineClass(s);
        const cell = el('button', `cell tl-drum ${kind}${lines}${repeat ? ' is-repeat' : ''}${v ? ' has-hit' : ''}`);
        cell.type = 'button';
        cell.dataset.track = track;
        cell.dataset.step = s;
        // "Kick, bar 1, beat 3: hit"
        cell.setAttribute('aria-label', `${label}, ${placeText(s, loop.meter, div)}: ${MARK_NAMES[mark]}${repeat ? ', repeat' : ''}`);
        if (v) cell.append(hitMark(mark));
        items.push(cell);
      }
    }

    grid.replaceChildren(...items, head);
    labelW = grid.firstElementChild.getBoundingClientRect().width;
    expected = scroller.scrollLeft;
    setLocked(lockedNow);
  }

  // Locked lanes (DESIGN §5.10): the hatch on every cell of the lane and the
  // lock after its name, both from is-locked-{lane} on the grid, plus the
  // spoken ", locked". Cheap enough to run on every lock press.
  function setLocked(next) {
    locked = next;
    for (const lane of LANES) {
      const on = !!locked[lane];
      grid.classList.toggle(`is-locked-${lane}`, on);
      grid.querySelectorAll(`.tl-name[data-lane="${lane}"] .tl-locked`).forEach((n) => { n.hidden = !on; });
    }
  }

  function setPlaying(playing) {
    if (head.hidden === !playing) return;
    head.hidden = !playing;
    tween = null;
    if (playing) line.style.transform = 'translateX(0)';
  }

  // pos: the fractional step being heard. Reduced motion moves once per beat
  // (the dotted quarter in 6/8).
  function update(pos, now, { reduced, slowMs }) {
    if (!loop || head.hidden) return;
    let p = pos % loop.totalSteps;
    if (reduced) p = Math.floor(p / loop.meter.pulse) * loop.meter.pulse;
    const x = (p / loop.totalSteps) * head.clientWidth;
    line.style.transform = `translateX(${x}px)`;
    follow(x, now, reduced ? 0 : slowMs);
  }

  // Keep the playhead in view: flip the view forward as it nears the right
  // edge, and back to the start when the loop wraps.
  function follow(x, now, dur) {
    const max = scroller.scrollWidth - scroller.clientWidth;
    if (max <= 0) return;
    if (tween) {
      const k = Math.min(1, (now - tween.t0) / tween.dur);
      setLeft(tween.from + (tween.to - tween.from) * (1 - (1 - k) ** 3));
      if (k >= 1) tween = null;
      return;
    }
    if (now - userAt < FOLLOW_PAUSE_MS) return;
    const view = scroller.clientWidth - labelW;
    const left = scroller.scrollLeft;
    const lead = view * FOLLOW_LEAD;
    if (x >= left && x <= left + view - lead) return;
    const to = Math.max(0, Math.min(max, x - lead));
    if (dur > 0) tween = { from: left, to, t0: now, dur };
    else setLeft(to);
  }

  return { render, setPlaying, update, setLocked };
}
