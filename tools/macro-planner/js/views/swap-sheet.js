// Swapping a planned slot's meal for the day (SPEC §3.4, §3.5), under a segmented control, each
// laid out as in the add sheet (DESIGN §8): another saved meal, with the tag filter row (SPEC
// §3.3) and "Make this the default" to plan the pick in the template, not just that day; a food
// and its amount; or quick numbers.

import { foodEntry, quickEntry } from '../data.js';
import { segmentedPanes, switchControl } from '../ui/controls.js';
import { openSheet } from '../ui/sheet.js';
import { foodPicker } from './add-food-sheet.js';
import { mealPicker } from './meal-picker.js';
import { quickNumbersForm } from './numbers-fields.js';

// plan: the slot as slots.js's daySlots plans it, with a meal. The meal it shows is checked in
// the list; none is while a food or quick numbers is swapped in. meals, foods, getFood and store
// as the add sheet takes them. It opens on Meal, or on Food when there's no other saved meal to
// swap to. Resolves to { mealId, makeDefault } once a meal is picked, to { entry } once a food or
// quick numbers is, data.js's snapshot for the slot, or null if the sheet closes first. The
// switch starts off each time, so the template only changes when that's asked for. It's on Meal
// only, since the template plans meals.
export async function swapSheet({ plan, meals, foods, getFood, store }) {
  let picked = null;
  let sheet;
  const done = (result) => {
    picked = result;
    sheet.close();
  };

  const panes = {
    meal: () => {
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
    food: () =>
      foodPicker({
        foods,
        store,
        submitLabel: 'Swap food',
        onAdd: (food, qty, unit) => done({ entry: foodEntry(plan, food, qty, unit) }),
      }).element,
    quick: () =>
      quickNumbersForm({ submitLabel: 'Swap numbers', onSubmit: (numbers, label) => done({ entry: quickEntry(plan, numbers, label) }) }),
  };

  const kinds = segmentedPanes({
    label: 'What to swap in',
    options: [
      { value: 'meal', label: 'Meal' },
      { value: 'food', label: 'Food' },
      { value: 'quick', label: 'Quick' },
    ],
    value: meals.some((meal) => meal.id !== plan.meal.id) ? 'meal' : 'food',
    panes,
  });

  const body = document.createElement('div');
  body.className = 'swap';
  body.append(kinds.control, kinds.pane);
  sheet = openSheet({ title: `${plan.name} · Swap`, content: body });
  await sheet.closed;
  return picked;
}
