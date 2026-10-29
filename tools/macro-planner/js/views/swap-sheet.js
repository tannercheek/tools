// Swapping for the day (SPEC §3.4, §3.5), under a segmented control, each laid out as in the add
// sheet (DESIGN §8): another saved meal, with the tag filter row (SPEC §3.3); a food and its
// amount; or quick numbers. Any planned item in a slot is swapped this way, and so is anything
// added to a slot or to Other. A planned item's swap can also be made the default, putting a meal
// or a food in its place in the template.

import { foodDayItem, foodEntry, mealDayItem, mealEntry, quickDayItem, quickEntry } from '../data.js';
import { amountText } from '../ingredients.js';
import { segmentedPanes, switchControl } from '../ui/controls.js';
import { openSheet } from '../ui/sheet.js';
import { foodPicker } from './add-food-sheet.js';
import { mealPicker } from './meal-picker.js';
import { quickNumbersForm } from './numbers-fields.js';

// The sheet both swaps share. Resolves to what was picked, { meal }, { food, qty, unit } or
// { numbers, label }, or to null if the sheet closes first. selectedId: the meal checked in the
// list, or null. startAmount: where a food's amount starts, as foodPicker takes it. startOn: the
// segment to open on. canMakeDefault: whether Meal and Food show "Make this the default" above
// them, off each time the sheet opens. Quick doesn't, since the template plans meals and foods,
// not numbers. A meal or food picked with it on resolves with makeDefault: true.
async function openSwapSheet({ title, meals, selectedId, startAmount, startOn, foods, getFood, store, canMakeDefault = false }) {
  let picked = null;
  let sheet;
  const makeDefault = canMakeDefault ? switchControl({ label: 'Make this the default' }) : null;
  const done = (result) => {
    picked = !result.numbers && makeDefault?.input.checked ? { ...result, makeDefault: true } : result;
    sheet.close();
  };

  const panes = {
    meal: () => mealPicker({ meals, getFood, selectedId, onPick: (meal) => done({ meal }) }),
    food: () =>
      foodPicker({
        foods,
        store,
        submitLabel: 'Swap food',
        startAmount,
        onAdd: (food, qty, unit) => done({ food, qty, unit }),
      }).element,
    quick: () => quickNumbersForm({ submitLabel: 'Swap numbers', onSubmit: (numbers, label) => done({ numbers, label }) }),
  };

  const kinds = segmentedPanes({
    label: 'What to swap in',
    options: [
      { value: 'meal', label: 'Meal' },
      { value: 'food', label: 'Food' },
      { value: 'quick', label: 'Quick' },
    ],
    value: startOn,
    panes,
    onChange: (kind) => {
      if (makeDefault) makeDefault.element.hidden = kind === 'quick';
    },
  });

  const body = document.createElement('div');
  body.className = 'swap';
  body.append(...[kinds.control, makeDefault?.element, kinds.pane].filter(Boolean));
  sheet = openSheet({ title, content: body });
  await sheet.closed;
  return picked;
}

// A planned item in a slot, swapped for the day (SPEC §3.5). slot: { id, name }, for quick
// numbers with no label. item: the day item as the slot eats it now, one of day-plan.js's. A meal
// it shows is checked in the list, and a food starts at its amount when the pick has the same
// unit. meals, foods, getFood and store as the add sheet takes them. It opens on Meal, or on Food
// when there's no other saved meal to swap to. Resolves to { item, plan }, or to null if the sheet
// closes first: item, data.js's day item for what was picked, under the old item's id; plan, what
// Make this the default puts in the template, as slots.js's replacePlannedItem takes it, or null
// with the switch off.
export async function swapSheet({ title, slot, item, meals, foods, getFood, store }) {
  const mealId = item.source === 'meal' ? item.mealId : null;
  const picked = await openSwapSheet({
    title,
    meals,
    selectedId: mealId,
    startAmount: item.source === 'food' ? { qty: Number(amountText(item.qty)), unit: item.unit } : undefined,
    startOn: meals.some((meal) => meal.id !== mealId) ? 'meal' : 'food',
    foods,
    getFood,
    store,
    canMakeDefault: true,
  });
  if (!picked) return null;
  const { meal, food, qty, unit, numbers, label, makeDefault } = picked;
  if (meal) return { item: mealDayItem(item.id, meal, getFood), plan: makeDefault ? { mealId: meal.id } : null };
  if (food) return { item: foodDayItem(item.id, food, qty, unit), plan: makeDefault ? { food, qty, unit } : null };
  return { item: quickDayItem(item.id, slot, numbers, label), plan: null };
}

// Anything added to a slot or to Other, swapped for a saved meal, a food or quick numbers (SPEC
// §3.5). entry: the added entry, which titles the sheet. No meal is checked, since an entry
// doesn't record the meal it came from. It opens on Meal, or on Food with no saved meals. Resolves
// to the new entry, made for the old one's slot, for data.js's swapDayEntry, or to null.
export async function swapEntrySheet({ entry, meals, foods, getFood, store }) {
  const slot = { id: entry.slotId, name: entry.slotName };
  const picked = await openSwapSheet({
    title: `${entry.label} · Swap`,
    meals,
    selectedId: null,
    startOn: meals.length > 0 ? 'meal' : 'food',
    foods,
    getFood,
    store,
  });
  if (!picked) return null;
  const { meal, food, qty, unit, numbers, label } = picked;
  if (meal) return mealEntry(slot, meal, getFood);
  if (food) return foodEntry(slot, food, qty, unit);
  return quickEntry(slot, numbers, label);
}
