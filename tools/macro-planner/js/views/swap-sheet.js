// Swapping for the day (SPEC §3.4, §3.5), under a segmented control, each laid out as in the add
// sheet (DESIGN §8): another saved meal, with the tag filter row (SPEC §3.3); a food and its
// amount; or quick numbers. A planned slot's meal is swapped this way, with "Make this the
// default" to plan the pick in the template, not just that day, and so is anything added to a
// slot or to Other.

import { foodEntry, mealEntry, quickEntry } from '../data.js';
import { segmentedPanes, switchControl } from '../ui/controls.js';
import { openSheet } from '../ui/sheet.js';
import { foodPicker } from './add-food-sheet.js';
import { mealPicker } from './meal-picker.js';
import { quickNumbersForm } from './numbers-fields.js';

// The sheet both swaps share. slot: { id, name }, the slot a food or quick numbers is made for.
// mealPane(done): the Meal segment's content, calling done(result) once a meal is picked. startOn:
// the segment to open on. Resolves to the meal pane's result, to { entry } once a food or quick
// numbers is, data.js's snapshot for the slot, or null if the sheet closes first.
async function openSwapSheet({ title, slot, mealPane, startOn, foods, store }) {
  let picked = null;
  let sheet;
  const done = (result) => {
    picked = result;
    sheet.close();
  };

  const panes = {
    meal: () => mealPane(done),
    food: () =>
      foodPicker({
        foods,
        store,
        submitLabel: 'Swap food',
        onAdd: (food, qty, unit) => done({ entry: foodEntry(slot, food, qty, unit) }),
      }).element,
    quick: () =>
      quickNumbersForm({ submitLabel: 'Swap numbers', onSubmit: (numbers, label) => done({ entry: quickEntry(slot, numbers, label) }) }),
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
  });

  const body = document.createElement('div');
  body.className = 'swap';
  body.append(kinds.control, kinds.pane);
  sheet = openSheet({ title, content: body });
  await sheet.closed;
  return picked;
}

// plan: the slot as slots.js's daySlots plans it, with a meal. The meal it shows is checked in
// the list; none is while a food or quick numbers is swapped in. meals, foods, getFood and store
// as the add sheet takes them. It opens on Meal, or on Food when there's no other saved meal to
// swap to. Resolves to { mealId, makeDefault } once a meal is picked, to { entry } once a food or
// quick numbers is, or null if the sheet closes first. The switch starts off each time, so the
// template only changes when that's asked for. It's on Meal only, since the template plans meals.
export function swapSheet({ plan, meals, foods, getFood, store }) {
  return openSwapSheet({
    title: `${plan.name} · Swap`,
    slot: plan,
    startOn: meals.some((meal) => meal.id !== plan.meal.id) ? 'meal' : 'food',
    foods,
    store,
    mealPane: (done) => {
      const makeDefault = switchControl({ label: 'Make this the default' });
      const picker = mealPicker({
        meals,
        getFood,
        selectedId: plan.swapEntry ? null : plan.meal.id,
        onPick: (meal) => done({ mealId: meal.id, makeDefault: makeDefault.input.checked }),
      });
      const element = document.createElement('div');
      element.className = 'swap__meal';
      element.append(makeDefault.element, picker);
      return element;
    },
  });
}

// Anything added to a slot or to Other, swapped for a saved meal, a food or quick numbers (SPEC
// §3.5). entry: the added entry, which titles the sheet. There's no Make this the default, since
// nothing added is part of the template, and no meal is checked, since an entry doesn't record the
// meal it came from. It opens on Meal, or on Food with no saved meals. Resolves to the new entry,
// made for the old one's slot, for data.js's swapDayEntry, or to null.
export async function swapEntrySheet({ entry, meals, foods, getFood, store }) {
  const slot = { id: entry.slotId, name: entry.slotName };
  const picked = await openSwapSheet({
    title: `${entry.label} · Swap`,
    slot,
    startOn: meals.length > 0 ? 'meal' : 'food',
    foods,
    store,
    mealPane: (done) => mealPicker({ meals, getFood, onPick: (meal) => done({ entry: mealEntry(slot, meal, getFood) }) }),
  });
  return picked?.entry ?? null;
}
