// Today's slot rows (DESIGN §8): a planned slot, an open flex slot and a filled one, each under
// the slot's name and any change, its eyebrow, which today.js puts above the row. Each slot is one
// of day-plan.js's dayPlan: what it holds is its planned items after the day's changes, then
// what's been added (SPEC §3.6). A filled flex slot shows what's in it the same way, and so does
// Other, after the slots. A row that's a button keeps its eyebrow as hidden text, so it still says
// which slot it is. Plan's planned slots show what they plan with itemsRow too.

import { entriesTotals } from '../calc.js';
import { DEFAULT_EMOJI, OTHER } from '../data.js';
import { amountText, scaleIngredients } from '../ingredients.js';
import { listRow, rowActionIcon } from '../ui/row.js';

const portionFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

// A planned item's changes for the day (SPEC §3.5), in the order swapped, edited, portion:
// ["Swapped", "Edited", "1.5×"]. item: one of dayPlan's day items. The slot actions sheet's item
// rows show them too.
export function itemMarks(item) {
  const marks = [];
  if (item.swapped) marks.push('Swapped');
  if (item.originalIngredients) marks.push('Edited');
  if (item.source === 'meal' && item.portion !== 1) marks.push(`${portionFormat.format(item.portion)}×`);
  return marks;
}

// The slot's name and any change (SPEC §3.6, DESIGN §8): "Lunch · Skipped", "Dinner · Flex", and,
// while it plans one item, that item's: "Breakfast · Swapped · Edited · 1.5×". With several, each
// item's line shows its own. slot: one of dayPlan's.
export function slotEyebrow(slot) {
  const marks = [slot.name];
  if (slot.flex) marks.push('Flex');
  else if (slot.skipped) marks.push('Skipped');
  else if (slot.items.length === 1) marks.push(...itemMarks(slot.items[0]));
  return marks.join(' · ');
}

// An edited meal's ingredients as lines under its row (SPEC §3.6, DESIGN §8): each food with its
// amount as its Ingredients sheet shows it ("3 egg"), in place of kcal.
function ingredientLines(items) {
  return items.map(({ emoji, name, qty, unit }) => ({ emoji, label: name, amount: `${amountText(qty)} ${unit}` }));
}

// Something added to a slot, as one of the things the slot holds: { emoji, label, kcal, protein,
// fat, carbs, ingredients }, its line under the row and its share of the slot's total. An added
// meal changed since it was added (it has originalIngredients) lists its ingredients at its
// portion, as they are in its Ingredients sheet (SPEC §3.6, DESIGN §8 edited extra). The rest stay
// one line.
function entryItem({ emoji, label, kcal, protein, fat, carbs, ingredients, originalIngredients, portion = 1 }) {
  const edited = originalIngredients ? ingredientLines(scaleIngredients(ingredients, portion)) : [];
  return { emoji, label, kcal, protein, fat, carbs, ingredients: edited };
}

// A planned item as one of the things the slot holds, like entryItem: a meal at its portion, a
// food at its amount, or quick numbers swapped in. An edited meal lists its ingredients at its
// portion, as its Ingredients sheet opens with them. marks: whether its line shows its own changes,
// as it does in a slot planning several items. item: one of dayPlan's day items.
function plannedItem(item, marks) {
  const { emoji, label, kcal, protein, fat, carbs, ingredients, originalIngredients, portion } = item;
  const edited = originalIngredients ? ingredientLines(scaleIngredients(ingredients, portion)) : [];
  return { emoji, label, kcal, protein, fat, carbs, ingredients: edited, marks: marks ? itemMarks(item) : [] };
}

// What a slot holds (SPEC §3.6, DESIGN §8): one thing as itself, an edited meal's ingredients
// under the row; several as 🍽️ "N items" with the whole slot's total, then a line each in order,
// an edited meal's ingredients indented under its own line. eyebrowText: the slot's eyebrow, or
// Other's, kept in the button's name. onClick: opens the slot's sheet, on a day that takes changes.
export function itemsRow(eyebrowText, items, onClick) {
  const [first, ...more] = items;
  const several = more.length > 0;
  return listRow({
    emoji: several ? DEFAULT_EMOJI : first.emoji,
    hiddenEyebrow: eyebrowText,
    title: several ? `${items.length} items` : first.label,
    numbers: entriesTotals(items),
    lines: several ? items : first.ingredients,
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}

// An open flex slot (DESIGN §8): dashed, with its pinned budget, or else the gap to fill, the
// targets minus the rest of the day, which never shows negative: a day already over shows "over"
// and nothing left. With no targets, or on a day that's passed, it's just open (SPEC §3.4).
// gap: calc.js's dayPlanFlexGap, or null. log: the Log button, on a day that takes changes, which names
// the slot itself ("Log to Snack").
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
  return listRow({ placeholderIcon: 'plus', title, numbers, trailing: log });
}

// Other (SPEC §3.6, DESIGN §8): what's eaten outside the slots, as a filled flex row with "Other"
// as its whole eyebrow. entries: slots.js's otherEntries, not empty. onClick: opens the Other
// sheet, on a day that takes changes.
export function otherRow(entries, onClick) {
  return itemsRow(OTHER.name, entries.map(entryItem), onClick);
}

// What a slot holds (SPEC §3.6): its planned items after the day's changes, then what's been
// added, one thing as itself or several as "N items". A flex slot plans nothing, so once filled
// it shows what's been added. A skipped slot's planned items aren't among what it holds: with
// anything added, it shows that, still marked skipped; with nothing, it stays, quietened, as what
// it plans, its one item or "N items", with "Skipped". slot: one of dayPlan's. planned: the
// template's items in the slot, planSlots' items, for that quiet row. onClick: opens the slot's
// sheet, on a day that takes changes.
export function slotRow(slot, onClick, planned = []) {
  const several = slot.items.length > 1;
  const items = [...slot.items.map((item) => plannedItem(item, several)), ...slot.entries.map(entryItem)];
  if (items.length > 0) return itemsRow(slotEyebrow(slot), items, onClick);
  const [first, ...more] = planned.map((item) => item.meal ?? item.food);
  return listRow({
    emoji: more.length > 0 ? DEFAULT_EMOJI : first.emoji,
    hiddenEyebrow: slotEyebrow(slot),
    title: more.length > 0 ? `${planned.length} items` : first.name,
    numbers: 'Skipped',
    muted: true,
    trailing: onClick ? rowActionIcon('chevron-right') : undefined,
    onClick,
  });
}
