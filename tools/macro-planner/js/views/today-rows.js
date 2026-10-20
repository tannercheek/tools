// Today's slot rows (DESIGN §8): a planned meal, an open flex slot and a filled one, each with
// the slot's name and any change in its eyebrow.

import { entriesTotals, slotTotals } from '../calc.js';
import { DEFAULT_EMOJI } from '../data.js';
import { listRow, rowActionIcon } from '../ui/row.js';

const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// The slot's name and any change (DESIGN §8): "Lunch · Skipped", "Dinner · Swapped · 1.5×".
function eyebrow(plan) {
  const marks = [plan.name];
  if (!plan.meal) marks.push('Flex');
  else if (plan.skipped) marks.push('Skipped');
  else {
    if (plan.swapped) marks.push('Swapped');
    if (plan.portion !== 1) marks.push(`${portionFormat.format(plan.portion)}×`);
  }
  return marks.join(' · ');
}

// An open flex slot (DESIGN §8): dashed, with its pinned budget, or else the gap to fill, the
// targets minus the rest of the day, which never shows negative: a day already over shows "over"
// and nothing left. With no targets, or on a day that's passed, it's just open (SPEC §3.4).
// gap: calc.js's flexGap, or null. log: the Log button, on a day that takes changes.
export function openFlexRow(plan, gap, log) {
  let title = 'Open';
  let numbers;
  if (plan.budget) {
    title = 'Budget';
    numbers = plan.budget;
  } else if (gap) {
    title = `${integer.format(gap.kcal.amount)} kcal ${gap.kcal.over ? 'over' : 'to fill'}`;
    numbers = Object.fromEntries(Object.entries(gap).map(([key, { amount, over }]) => [key, over ? 0 : amount]));
  }
  return listRow({ placeholderIcon: 'plus', eyebrow: eyebrow(plan), title, numbers, trailing: log });
}

// A flex slot with something in it is done, so it shows what's in it, like a planned meal
// (DESIGN §8): one entry as itself, several as a count with each listed under it. onClick: opens
// what's in it, on a day that takes changes.
export function filledFlexRow(plan, onClick) {
  const [first, ...more] = plan.entries;
  return listRow({
    emoji: more.length > 0 ? DEFAULT_EMOJI : first.emoji,
    eyebrow: eyebrow(plan),
    title: more.length > 0 ? `${plan.entries.length} items` : first.label,
    numbers: entriesTotals(plan.entries),
    extras: more.length > 0 ? plan.entries : [],
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}

// A planned meal with what it adds to the day, and anything added alongside it listed under it.
// A skipped one keeps its meal, quietened, with "Skipped" for numbers. onClick: opens the slot's
// actions, on a day that takes changes.
export function plannedRow(plan, getFood, onClick) {
  return listRow({
    emoji: plan.meal.emoji,
    eyebrow: eyebrow(plan),
    title: plan.meal.name,
    numbers: plan.skipped ? 'Skipped' : slotTotals(plan, getFood),
    extras: plan.entries,
    muted: plan.skipped,
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}
