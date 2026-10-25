// Foods segment of the Meals tab: the foods list (SPEC §3.2; DESIGN §8 food row, §10 search field).
// Tapping a custom food edits it; tapping a bundled food duplicates it into a custom one.

import { loadBundledFoods } from '../bundled-foods.js';
import { foodTotals } from '../calc.js';
import { amountLabel, defaultAmount } from '../portions.js';
import { searchFoods } from '../search.js';
import { CORE_DOC_ID } from '../store.js';
import { secondaryButton } from '../ui/buttons.js';
import { switchControl } from '../ui/controls.js';
import { emptyState } from '../ui/empty-state.js';
import { searchField } from '../ui/inputs.js';
import { listRow, rowActionIcon, rowList } from '../ui/row.js';
import { foodFormSheet } from './food-form.js';

// A food at its default amount, with its numbers for that amount (SPEC §3.2). "Custom" in the
// eyebrow tells a custom food from a bundled one of the same name, and the trailing icon says what
// a tap does: edit a custom food, duplicate a bundled one (DESIGN §8).
function foodRow(food, onClick) {
  const amount = defaultAmount(food);
  const label = amountLabel(food, amount);
  return listRow({
    emoji: food.emoji,
    eyebrow: food.custom ? `Custom · ${label}` : label,
    title: food.name,
    numbers: foodTotals(food, amount.qty, amount.unit),
    trailing: food.custom ? rowActionIcon('pencil', 'Edit') : rowActionIcon('copy', 'Duplicate'),
    onClick,
  });
}

function noMatch(query, onAdd) {
  return emptyState({
    iconName: 'search',
    heading: `No match for ‘${query}’`,
    message: 'Try a shorter search, or add it as a custom food.',
    action: { label: 'Add custom food', onClick: onAdd },
  });
}

function noCustomFoods(onAdd) {
  return emptyState({
    iconName: 'apple',
    heading: 'No custom foods yet',
    message: 'Foods you add yourself show up here.',
    action: { label: 'Add custom food', onClick: onAdd },
  });
}

function loadFailed() {
  const note = document.createElement('p');
  note.className = 'food-search__note';
  note.textContent = 'The food list didn’t load. Check your connection, then reload.';
  return note;
}

// store: the app's store; custom foods live in the core doc.
export function render(container, { store }) {
  const addNew = () => openForm('add');
  // Secondary, because the empty states hold the screen's one primary (DESIGN §9).
  // Rows have no add button of their own: here, adding a food means this (DESIGN §8).
  const addFood = secondaryButton('Add custom food', { block: true, onClick: addNew });
  const search = searchField({ label: 'Search foods' });
  // Not saved, so it starts off on every visit (SPEC §3.2).
  const customOnly = switchControl({ label: 'Custom foods only' });
  const list = rowList([]);
  const results = document.createElement('div');
  const wrapper = document.createElement('div');
  wrapper.className = 'food-search';
  wrapper.append(search.element, customOnly.element, results);
  container.replaceChildren(addFood, wrapper);

  let bundled = null;
  let custom = [];
  // Each food's row is built once, so a keystroke only re-orders existing rows. Keyed by
  // record, so an edited food, which is saved as a new record, gets a new row.
  const rows = new WeakMap();
  function rowFor(food) {
    if (!rows.has(food)) rows.set(food, foodRow(food, () => openForm(food.custom ? 'edit' : 'duplicate', food)));
    return rows.get(food);
  }

  // An empty query lists every food. A query with no words left after trimming
  // punctuation does too, so "No match" only shows for a real search. With custom
  // foods only and none to show, there's nothing to search, so that state wins.
  function update() {
    const foods = [...custom, ...bundled];
    const onlyCustom = customOnly.input.checked;
    const shown = onlyCustom ? foods.filter((food) => food.custom) : foods;
    const query = search.input.value.trim();
    const matches = searchFoods(shown, query);
    if (matches.length > 0) {
      list.replaceChildren(...matches.map(rowFor));
      results.replaceChildren(list);
    } else if (onlyCustom && searchFoods(shown, '').length === 0) {
      results.replaceChildren(noCustomFoods(addNew));
    } else {
      results.replaceChildren(noMatch(query, addNew));
    }
  }

  // Saving can replace the row or empty state that opened the form. Focus then moves to
  // the saved food's new row, or to "Add custom food", rather than dropping to the page.
  function restoreFocus(foodId) {
    if (document.activeElement !== document.body) return;
    const food = custom.find((f) => f.id === foodId);
    const row = food && rows.get(food)?.querySelector('button');
    (row?.isConnected ? row : addFood).focus();
  }

  async function openForm(mode, food) {
    const result = await foodFormSheet({ store, mode, food });
    if (!result) return;
    custom = result.doc.foods;
    if (bundled) update();
    restoreFocus(result.foodId);
  }

  const refresh = () => {
    if (bundled) update();
  };
  search.input.addEventListener('input', refresh);
  customOnly.input.addEventListener('change', refresh);

  // Anything typed while the list loads is searched as soon as it arrives.
  Promise.all([loadBundledFoods(), store.load(CORE_DOC_ID)]).then(
    ([loaded, doc]) => {
      bundled = loaded;
      custom = doc.foods ?? [];
      update();
    },
    (error) => {
      console.error('[macro-planner] food list failed to load:', error);
      results.replaceChildren(loadFailed());
    },
  );
}
