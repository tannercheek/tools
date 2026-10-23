// The totals card (DESIGN §8): what a meal adds up to, in a card that stays in view above its
// foods while they scroll. The meal editor's, and the Ingredients sheet's for a day's version of
// a meal.

import { numbersLine } from './row.js';

// show(totals) updates it, e.g. with an amount that's still being typed.
export function totalsCard() {
  const card = document.createElement('div');
  card.className = 'totals-card';
  const label = document.createElement('span');
  label.className = 'row__eyebrow';
  label.textContent = 'Total';
  let line = document.createElement('span');
  card.append(label, line);
  // The strip is what sticks: it fills the card's rounded corners with the colour behind it, so
  // rows scrolling under it don't show there.
  const strip = document.createElement('div');
  strip.className = 'totals-strip';
  strip.append(card);
  return {
    element: strip,
    show(totals) {
      const next = numbersLine(totals);
      line.replaceWith(next);
      line = next;
    },
  };
}
