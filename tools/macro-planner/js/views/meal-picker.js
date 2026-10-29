// Picking a saved meal (SPEC §3.3): the meals as rows, with the tag filter row above them. Used
// wherever a saved meal is picked: a Plan slot, a swap, and later the add sheet.

import { mealTotals } from '../calc.js';
import { allTags, filterMeals } from '../saved-meals.js';
import { tagFilterRow } from '../ui/controls.js';
import { listRow, rowActionIcon, rowList } from '../ui/row.js';

// meals: the saved meals, in their own order. getFood: saved-meals.js's foodLookup over every
// food. selectedId: the meal picked now, marked with a check, or null. selectedIds: a Set of
// meal ids marked with a check instead, for a slot that can plan more than one meal (SPEC §3.4).
// onPick(meal) runs on a tap. The filter starts on All each time and is hidden while no meal has
// a tag.
export function mealPicker({ meals, getFood, selectedId = null, selectedIds, onPick }) {
  function rowFor(meal) {
    const selected = selectedIds ? selectedIds.has(meal.id) : meal.id === selectedId;
    const item = listRow({
      emoji: meal.emoji,
      title: meal.name,
      numbers: mealTotals(meal, getFood),
      trailing: selected ? rowActionIcon('check') : undefined,
      onClick: () => onPick(meal),
    });
    if (selected) item.firstElementChild.setAttribute('aria-current', 'true');
    return item;
  }

  // Each row is built once; the filter only picks which ones show.
  const rows = new Map(meals.map((meal) => [meal, rowFor(meal)]));
  const list = rowList([...rows.values()]);
  const tags = allTags(meals);
  const filter = tagFilterRow({
    tags,
    onChange: (tag) => list.replaceChildren(...filterMeals(meals, tag).map((meal) => rows.get(meal))),
  });

  const element = document.createElement('div');
  element.className = 'meal-picker';
  element.append(...(tags.length > 0 ? [filter.element] : []), list);
  return element;
}
