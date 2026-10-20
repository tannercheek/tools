// Swapping a planned slot's meal (SPEC §3.4): the saved meals to pick from, with the tag filter
// row (SPEC §3.3), and "Make this the default" to plan the pick in the template, not just that day.

import { switchControl } from '../ui/controls.js';
import { openSheet } from '../ui/sheet.js';
import { mealPicker } from './meal-picker.js';

// plan: the slot as slots.js's daySlots plans it, with a meal, which is checked in the list.
// Resolves to { mealId, makeDefault } once a meal is picked, or null if the sheet closes first.
// The switch starts off each time, so the template only changes when that's asked for.
export async function swapSheet({ plan, meals, getFood }) {
  let picked = null;
  let sheet;
  const makeDefault = switchControl({ label: 'Make this the default' });
  const picker = mealPicker({
    meals,
    getFood,
    selectedId: plan.meal.id,
    onPick: (meal) => {
      picked = { mealId: meal.id, makeDefault: makeDefault.input.checked };
      sheet.close();
    },
  });

  sheet = openSheet({ title: `${plan.name} · Swap`, content: [makeDefault.element, picker] });
  await sheet.closed;
  return picked;
}
