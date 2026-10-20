// Meals segment of the Meals tab: the saved meals (SPEC §3.3; DESIGN §8 saved meal, §9 filter
// row, §13). Each row opens the meal's own screen; "New meal" names a meal, then opens it.

import { loadBundledFoods } from '../bundled-foods.js';
import { mealTotals } from '../calc.js';
import { hashFor, mealRoute } from '../routes.js';
import { allTags, filterMeals, foodLookup } from '../saved-meals.js';
import { CORE_DOC_ID } from '../store.js';
import { secondaryButton } from '../ui/buttons.js';
import { tagFilterRow } from '../ui/controls.js';
import { emptyState } from '../ui/empty-state.js';
import { listRow, rowActionIcon, rowList } from '../ui/row.js';
import { newMealSheet } from './new-meal-sheet.js';

function mealRow(meal, getFood) {
  return listRow({
    emoji: meal.emoji,
    title: meal.name,
    numbers: mealTotals(meal, getFood),
    trailing: rowActionIcon('chevron-right'),
    href: hashFor(mealRoute(meal.id)),
  });
}

function noMeals(onBuild) {
  return emptyState({
    iconName: 'soup',
    heading: 'No saved meals yet',
    message: 'Build the meals you eat most, then plan your days with them.',
    action: { label: 'Build a meal', onClick: onBuild },
  });
}

// Meal totals need every food the meals use, bundled ones included.
function loadFailed() {
  const note = document.createElement('p');
  note.className = 'meals__note';
  note.textContent = 'Your meals didn’t load, because the food list didn’t. Check your connection, then reload.';
  return note;
}

// store: the app's store; meals and custom foods live in the core doc.
export function render(container, { store }) {
  const build = async () => {
    const meal = await newMealSheet({ store });
    if (meal) location.hash = hashFor(mealRoute(meal.id));
  };
  // Secondary, because the empty state holds the screen's one primary (DESIGN §9).
  const newMeal = secondaryButton('New meal', { block: true, onClick: build });
  const results = document.createElement('div');
  results.className = 'meals-list';
  container.replaceChildren(newMeal, results);

  // In the order they were made, so a new meal or a copy goes at the end.
  Promise.all([loadBundledFoods(), store.load(CORE_DOC_ID)]).then(
    ([bundled, doc]) => {
      const meals = doc.meals ?? [];
      if (meals.length === 0) {
        results.replaceChildren(noMeals(build));
        return;
      }
      const getFood = foodLookup([...(doc.foods ?? []), ...bundled]);
      // Each row is built once; the filter only picks which ones show.
      const rows = new Map(meals.map((meal) => [meal, mealRow(meal, getFood)]));
      const list = rowList([...rows.values()]);
      // Hidden while no meal has a tag. Built with each visit, so it starts on All, and a tag
      // that's gone since the last visit has no pill (SPEC §3.3).
      const tags = allTags(meals);
      const filter = tagFilterRow({
        tags,
        onChange: (tag) => list.replaceChildren(...filterMeals(meals, tag).map((meal) => rows.get(meal))),
      });
      results.replaceChildren(...(tags.length > 0 ? [filter.element] : []), list);
    },
    (error) => {
      console.error('[macro-planner] meals failed to load:', error);
      results.replaceChildren(loadFailed());
    },
  );
}
