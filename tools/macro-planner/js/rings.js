// Rings (DESIGN §6): each draws a total against its target as an SVG arc, with the numbers as
// real text. On Today, calories is the hero ring, with what's left as the screen's hero number;
// protein, fat and carbs sit three across under it. Plan has four equal mini rings. With no
// targets yet (SPEC §3.1), the rings are tracks only and one line points to Settings (DESIGN §13).

import { displayRemaining, ringFill } from './calc.js';
import { hashFor } from './routes.js';
import { textLink } from './ui/buttons.js';

const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// In the fixed macro order (DESIGN §2). spoken: the unit as the ring's accessible name reads it.
const RINGS = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', spoken: 'kcal', size: 'hero' },
  { key: 'protein', label: 'Protein', unit: 'g', spoken: 'grams', size: 'macro' },
  { key: 'fat', label: 'Fat', unit: 'g', spoken: 'grams', size: 'macro' },
  { key: 'carbs', label: 'Carbs', unit: 'g', spoken: 'grams', size: 'macro' },
];

function span(className, text = '') {
  const element = document.createElement('span');
  element.className = className;
  element.textContent = text;
  return element;
}

// The arc's radius and length in the SVG's 0 0 100 100 units, from the size's stroke token, so
// the stroke's outer edge meets the edge of the box.
function arcGeometry(size) {
  const stroke = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--ring-${size}-stroke`));
  const radius = 50 - stroke / 2;
  return { radius, circumference: 2 * Math.PI * radius };
}

// The ring itself: a track and an arc, sized by the size's tokens. setFill(fill) draws the arc,
// from 0 to 1.
function ringDial(size) {
  const { radius, circumference } = arcGeometry(size);
  const element = span('ring__dial');
  // The arc turns a quarter back, so it starts at 12 o'clock.
  element.innerHTML =
    '<svg class="ring__svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
    `<circle class="ring__track" cx="50" cy="50" r="${radius}"/>` +
    `<circle class="ring__arc" cx="50" cy="50" r="${radius}" transform="rotate(-90 50 50)"/>` +
    '</svg>';
  const arc = element.querySelector('.ring__arc');
  // Dashes and gaps twice the circumference, so when --ease-spring overshoots past full or empty,
  // the arc stays full or empty instead of opening a gap at 12 o'clock.
  arc.style.strokeDasharray = `${2 * circumference} ${2 * circumference}`;

  return {
    element,
    setFill(fill) {
      arc.style.strokeDashoffset = circumference * (2 - fill);
      // Hidden at zero, since even an arc of no length draws its round cap as a dot.
      arc.classList.toggle('ring__arc--empty', fill === 0);
    },
  };
}

// One ring. show(total, target) draws it; a null target leaves the track and the label.
function ring({ key, label, unit, spoken, size }) {
  const dial = ringDial(size);

  const totalText = span('ring__total');
  const targetText = span('ring__target');
  const centre = span('ring__centre');
  centre.append(totalText, targetText);
  dial.element.append(centre);

  const leftAmount = span('ring__left-amount');
  const leftUnit = span('ring__left-unit');
  const left = span('ring__left');
  left.append(leftAmount, ' ', leftUnit);
  const text = span('ring__text');
  text.append(span('ring__label', label), left);

  const element = document.createElement('div');
  element.className = `ring ring--${size} ring--${key}`;
  element.append(dial.element, text);

  // Over target, the arc stays full and the text says "over" (DESIGN §6).
  function show(total, target) {
    const hasTarget = target != null;
    dial.setFill(hasTarget ? ringFill(total, target) : 0);
    centre.hidden = !hasTarget;
    left.hidden = !hasTarget;
    if (!hasTarget) {
      // Only the label shows, and it's read as plain text.
      element.removeAttribute('role');
      element.removeAttribute('aria-label');
      return;
    }

    const shownTotal = integer.format(Math.round(total));
    const shownTarget = integer.format(Math.round(target));
    const { amount, over } = displayRemaining(target, total);
    const status = over ? 'over' : 'left';
    totalText.textContent = shownTotal;
    targetText.textContent = size === 'hero' ? `of ${shownTarget}` : `/${shownTarget}${unit}`;
    leftAmount.textContent = integer.format(amount);
    leftUnit.textContent = `${unit} ${status}`;
    // One name for the whole ring, read in order rather than as laid out (DESIGN §6):
    // "Protein, 89 of 190 grams, 101 left".
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', `${label}, ${shownTotal} of ${shownTarget} ${spoken}, ${integer.format(amount)} ${status}`);
  }

  return { element, show };
}

// A mini ring (DESIGN §6), which has no centre text, so its name and total sit under it, then
// "of 148 g", or "46 g over" once over target. With no target, the track and the total alone.
function miniRing({ key, label, unit, spoken }) {
  const dial = ringDial('mini');
  const totalText = span('ring__total');
  const targetText = span('ring__target');
  const text = span('ring__text');
  text.append(span('ring__label', label), totalText, targetText);

  const element = document.createElement('div');
  element.className = `ring ring--mini ring--${key}`;
  element.append(dial.element, text);

  function show(total, target) {
    const shownTotal = integer.format(Math.round(total));
    totalText.textContent = shownTotal;
    const hasTarget = target != null;
    dial.setFill(hasTarget ? ringFill(total, target) : 0);
    targetText.hidden = !hasTarget;
    if (!hasTarget) {
      element.removeAttribute('role');
      element.removeAttribute('aria-label');
      return;
    }

    const shownTarget = integer.format(Math.round(target));
    const { amount, over } = displayRemaining(target, total);
    // Calories go without a unit, like the hero ring's "of 2,600", so they fit the column.
    const shownUnit = unit === 'kcal' ? '' : ` ${unit}`;
    targetText.textContent = over ? `${integer.format(amount)}${shownUnit} over` : `of ${shownTarget}${shownUnit}`;
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', `${label}, ${shownTotal} of ${shownTarget} ${spoken}, ${integer.format(amount)} ${over ? 'over' : 'left'}`);
  }

  return { element, show };
}

// Four equal mini rings in a row, calories first: Plan's totals against the targets. targets is
// null until the profile is complete. show({ totals, targets }) redraws them in place, so each
// arc moves to its new length (DESIGN §14).
export function miniRings({ totals, targets }) {
  const drawn = RINGS.map((options) => ({ key: options.key, ...miniRing(options) }));
  const element = document.createElement('div');
  element.className = 'rings__mini';
  element.append(...drawn.map((ringDrawn) => ringDrawn.element));

  function show(next) {
    for (const { key, show: draw } of drawn) draw(next.totals[key], next.targets?.[key] ?? null);
  }

  show({ totals, targets });
  return { element, show };
}

// The four rings in two cards: calories, then protein, fat and carbs. totals and targets are
// { kcal, protein, fat, carbs }, and targets is null until the profile is complete.
// show({ totals, targets }) redraws them in place, so each arc moves to its new length (DESIGN §14).
export function rings({ totals, targets }) {
  const drawn = RINGS.map((options) => ({ key: options.key, ...ring(options) }));
  const [calories, ...macros] = drawn.map(({ element }) => element);

  const heroCard = document.createElement('div');
  heroCard.className = 'rings__card rings__card--hero';
  heroCard.append(calories);
  const macroCard = document.createElement('div');
  macroCard.className = 'rings__card rings__card--macros';
  macroCard.append(...macros);

  const note = document.createElement('p');
  note.className = 'rings__note';
  note.append(textLink('Set your targets in Settings', hashFor('settings')));

  const element = document.createElement('div');
  element.className = 'rings';
  element.append(heroCard, macroCard, note);

  function show(next) {
    for (const { key, show: draw } of drawn) draw(next.totals[key], next.targets?.[key] ?? null);
    note.hidden = next.targets != null;
  }

  show({ totals, targets });
  return { element, show };
}
