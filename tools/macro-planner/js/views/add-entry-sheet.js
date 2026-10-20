// The add sheet (SPEC §3.5): what goes in a slot for the day, as a snapshot entry. A Recent entry
// added again in one tap, a saved meal, a food and its amount, or quick numbers, one at a time
// under a segmented control. Opened by an open flex slot's Log button, by Add to this slot in a
// slot's sheet, and by a locked day's Add.

import { addDays } from '../calc.js';
import { foodEntry, mealEntry, quickEntry, repeatEntry } from '../data.js';
import { hashFor, mealRoute } from '../routes.js';
import { iconButton, primaryButton } from '../ui/buttons.js';
import { segmentedControl } from '../ui/controls.js';
import { emptyState } from '../ui/empty-state.js';
import { textField } from '../ui/inputs.js';
import { listRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { foodPicker } from './add-food-sheet.js';
import { mealPicker } from './meal-picker.js';
import { newMealSheet } from './new-meal-sheet.js';
import { numbersFields } from './numbers-fields.js';

const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: 'long' });

// A Recent entry's eyebrow (DESIGN §8): "Yesterday", or its weekday, which can't repeat within
// the 7 days before today.
function whenEaten(date, today) {
  return date === addDays(today, -1) ? 'Yesterday' : weekdayFormat.format(new Date(`${date}T00:00`));
}

// Recent entries as rows like a food search result, each with an add button, or a note while
// there are none. recent: data.js's recentEntries. onAdd(entry) runs on a tap.
function recentPane(recent, today, onAdd) {
  if (recent.length === 0) {
    const note = document.createElement('p');
    note.className = 'add-entry__note';
    note.textContent = 'Things you add to slots show up here for the next 7 days.';
    return note;
  }
  return rowList(
    recent.map(({ entry, date }) => {
      const add = iconButton('plus', `Add ${entry.label}`, { onClick: () => onAdd(entry) });
      return listRow({ emoji: entry.emoji, eyebrow: whenEaten(date, today), title: entry.label, numbers: entry, trailing: add });
    }),
  );
}

// Quick numbers: kcal and macros, with an optional label. done(numbers, label) on submit.
function quickNumbersForm(done) {
  const label = textField({ label: 'Label (optional)' });
  const numbers = numbersFields();

  const form = document.createElement('form');
  form.className = 'quick-form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = numbers.read();
    if (values) done(values, label.input.value);
  });

  const submit = primaryButton('Log numbers', { block: true });
  submit.type = 'submit';
  form.append(label.element, numbers.element, submit);
  return form;
}

// slot: { id, name }, the slot the entry goes in. meals: the saved meals. foods: bundled and
// custom foods together. getFood: saved-meals.js's foodLookup over every food. store: the app's
// store, for a custom food or a meal made from here. recent: data.js's recentEntries, as of
// today. Opens on Recent when it has anything, otherwise on Meal. Resolves to the new entry, or
// null if the sheet closes without one. With no saved meals, "Build a meal" closes it and opens
// a new meal.
export async function addEntrySheet({ slot, meals, foods, getFood, store, recent, today }) {
  let added = null;
  let buildMeal = false;
  let sheet;
  const done = (entry) => {
    added = entry;
    sheet.close();
  };

  const panes = {
    recent: () => recentPane(recent, today, (entry) => done(repeatEntry(slot, entry))),
    meal: () =>
      meals.length > 0
        ? mealPicker({ meals, getFood, onPick: (meal) => done(mealEntry(slot, meal, getFood)) })
        : emptyState({
            iconName: 'soup',
            heading: 'No saved meals yet',
            message: 'Build the meals you eat most, then log them in a tap.',
            action: {
              label: 'Build a meal',
              onClick: () => {
                buildMeal = true;
                sheet.close();
              },
            },
          }),
    food: () =>
      foodPicker({ foods, store, submitLabel: 'Log food', onAdd: (food, qty) => done(foodEntry(slot, food, qty)) })
        .element,
    quick: () => quickNumbersForm((numbers, label) => done(quickEntry(slot, numbers, label))),
  };

  // Each pane is built when first shown and kept, so switching back finds it as it was left.
  const built = new Map();
  const pane = document.createElement('div');
  pane.className = 'add-entry__pane';
  function show(kind) {
    if (!built.has(kind)) built.set(kind, panes[kind]());
    pane.replaceChildren(built.get(kind));
  }

  // Recent first, so adding one again stays one tap.
  const first = recent.length > 0 ? 'recent' : 'meal';
  const kinds = segmentedControl({
    label: 'What to log',
    options: [
      { value: 'recent', label: 'Recent' },
      { value: 'meal', label: 'Meal' },
      { value: 'food', label: 'Food' },
      { value: 'quick', label: 'Quick' },
    ],
    value: first,
    onChange: show,
  });
  show(first);

  const body = document.createElement('div');
  body.className = 'add-entry';
  body.append(kinds.element, pane);
  sheet = openSheet({ title: `${slot.name} · Log`, content: body });
  await sheet.closed;

  if (buildMeal) {
    const meal = await newMealSheet({ store });
    if (meal) location.hash = hashFor(mealRoute(meal.id));
  }
  return added;
}
