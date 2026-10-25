// The add sheet (SPEC §3.5): what goes in a slot for the day, as a snapshot entry. A Recent entry
// added again in one tap, a saved meal, a food and its amount, or quick numbers, one at a time
// under a segmented control. Opened by an open flex slot's Log button, by Add or Add to this slot
// in a slot's sheet, by a locked day's Add, and by Today's Add food and Quick numbers.

import { addDays } from '../calc.js';
import { foodEntry, mealEntry, quickEntry, repeatEntry } from '../data.js';
import { hashFor, mealRoute } from '../routes.js';
import { iconButton } from '../ui/buttons.js';
import { segmentedPanes } from '../ui/controls.js';
import { emptyState } from '../ui/empty-state.js';
import { listRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { foodPicker } from './add-food-sheet.js';
import { mealPicker } from './meal-picker.js';
import { newMealSheet } from './new-meal-sheet.js';
import { quickNumbersForm } from './numbers-fields.js';

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

// slot: { id, name }, the slot the entry goes in. meals: the saved meals. foods: bundled and
// custom foods together. getFood: saved-meals.js's foodLookup over every food. store: the app's
// store, for a custom food or a meal made from here. recent: data.js's recentEntries, as of
// today. kind: the segment to open on, 'food' or 'quick', for Today's quick actions; otherwise it
// opens on Recent when it has anything, else on Meal. Resolves to the new entry, or null if the
// sheet closes without one. With no saved meals, "Build a meal" closes it and opens a new meal.
export async function addEntrySheet({ slot, meals, foods, getFood, store, recent, today, kind }) {
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
      foodPicker({
        foods,
        store,
        submitLabel: 'Log food',
        onAdd: (food, qty, unit) => done(foodEntry(slot, food, qty, unit)),
      }).element,
    quick: () =>
      quickNumbersForm({ submitLabel: 'Log numbers', onSubmit: (numbers, label) => done(quickEntry(slot, numbers, label)) }),
  };

  // Recent first, unless asked for another, so adding one again stays one tap.
  const kinds = segmentedPanes({
    label: 'What to log',
    options: [
      { value: 'recent', label: 'Recent' },
      { value: 'meal', label: 'Meal' },
      { value: 'food', label: 'Food' },
      { value: 'quick', label: 'Quick' },
    ],
    value: kind ?? (recent.length > 0 ? 'recent' : 'meal'),
    panes,
  });

  const body = document.createElement('div');
  body.className = 'add-entry';
  body.append(kinds.control, kinds.pane);
  sheet = openSheet({ title: `${slot.name} · Log`, content: body });
  await sheet.closed;

  if (buildMeal) {
    const meal = await newMealSheet({ store });
    if (meal) location.hash = hashFor(mealRoute(meal.id));
  }
  return added;
}
