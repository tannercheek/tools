// Today's slot rows (DESIGN §8): a planned meal, an open flex slot and a filled one, which a slot
// swapped to a food or quick numbers shows as too, each with the slot's name and any change in
// its eyebrow.

import { entriesTotals, slotTotals } from '../calc.js';
import { DEFAULT_EMOJI } from '../data.js';
import { amountText, slotIngredients } from '../ingredients.js';
import { listRow, rowActionIcon } from '../ui/row.js';

const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// The slot's name and any change (DESIGN §8): "Lunch · Skipped", "Breakfast · Swapped · Edited · 1.5×".
function eyebrow(plan) {
  const marks = [plan.name];
  if (!plan.meal) marks.push('Flex');
  else if (plan.skipped) marks.push('Skipped');
  else {
    if (plan.swapped) marks.push('Swapped');
    if (plan.edited) marks.push('Edited');
    if (plan.portion !== 1) marks.push(`${portionFormat.format(plan.portion)}×`);
  }
  return marks.join(' · ');
}

// An edited meal's ingredients as lines under its row (SPEC §3.6, DESIGN §8): each food with its
// amount as its Ingredients sheet shows it ("3 egg"), in place of kcal.
function ingredientLines(items) {
  return items.map(({ emoji, name, qty, unit }) => ({ emoji, label: name, amount: `${amountText(qty)} ${unit}` }));
}

// What's been added to a slot, a line each under its row. An added meal changed since it was
// added (it has originalIngredients) lists its ingredients indented under its own line, as they
// are in its Ingredients sheet (SPEC §3.6, DESIGN §8 edited extra). The rest stay one line.
function extraLines(entries) {
  return entries.map(({ emoji, label, kcal, ingredients, originalIngredients }) => ({
    emoji,
    label,
    kcal,
    ingredients: originalIngredients ? ingredientLines(ingredients) : [],
  }));
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
// (DESIGN §8): one entry as itself, several as a count with each listed under it. An added meal
// changed since it was added lists its ingredients, as they are in its Ingredients sheet: under
// the row when it's the one entry, or else under its own line. A slot swapped to a food or quick
// numbers shows the same way, marked swapped, with what was swapped in first, then what's been
// added to it, as one list (SPEC §3.6). onClick: opens what's in it, or the swapped slot's
// actions, on a day that takes changes.
export function filledFlexRow(plan, onClick) {
  const items = plan.swapEntry ? [plan.swapEntry, ...plan.entries] : plan.entries;
  const [first, ...more] = items;
  const edited = more.length === 0 && Boolean(first.originalIngredients);
  return listRow({
    emoji: more.length > 0 ? DEFAULT_EMOJI : first.emoji,
    eyebrow: eyebrow(plan),
    title: more.length > 0 ? `${items.length} items` : first.label,
    numbers: entriesTotals(items),
    ingredients: edited ? ingredientLines(first.ingredients) : [],
    extras: more.length > 0 ? extraLines(items) : [],
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}

// A planned meal with what it adds to the day, and anything added alongside it listed under it.
// An edited one lists its ingredients first, at the slot's portion, as its Ingredients sheet
// opens with them, so the change shows without opening it; an edited meal added beside it lists
// its own under its line. A skipped one keeps its meal, quietened, with "Skipped" for numbers.
// onClick: opens the slot's actions, on a day that takes changes.
export function plannedRow(plan, getFood, onClick) {
  return listRow({
    emoji: plan.meal.emoji,
    eyebrow: eyebrow(plan),
    title: plan.meal.name,
    numbers: plan.skipped ? 'Skipped' : slotTotals(plan, getFood),
    ingredients: plan.edited ? ingredientLines(slotIngredients(plan, getFood)) : [],
    extras: extraLines(plan.entries),
    muted: plan.skipped,
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}
