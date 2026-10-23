// Adding a food (SPEC §3.3, §3.5): search, pick a food, then enter its quantity in that food's
// serving unit. One step shows at a time, in the same sheet.

import { parseAmount } from '../custom-foods.js';
import { searchFoods } from '../search.js';
import { iconButton, primaryButton, secondaryButton } from '../ui/buttons.js';
import { emptyState } from '../ui/empty-state.js';
import { numberField, searchField } from '../ui/inputs.js';
import { listRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { foodFormSheet } from './food-form.js';

// Quantities show as entered (SPEC §5.2), so no rounding to whole numbers.
const quantity = new Intl.NumberFormat();

// The serving, with "Custom" first on a custom food, as in the foods list (DESIGN §8).
function eyebrow(food) {
  const serving = `${quantity.format(food.serving.qty)} ${food.serving.unit}`;
  return food.custom ? `Custom · ${serving}` : serving;
}

function noMatch(query, onAdd) {
  return emptyState({
    iconName: 'search',
    heading: `No match for ‘${query}’`,
    message: 'Try a shorter search, or add it as a custom food.',
    action: { label: 'Add custom food', onClick: onAdd },
  });
}

// Search, pick a food, then enter its amount, one step at a time in the same element. Used by
// the add food sheet, the add sheet on Today and the Ingredients sheet's swap sheet. foods:
// bundled and custom foods together; archived ones are left out of the search. store: the app's
// store, for a custom food made from "No match". submitLabel: the amount step's primary button.
// startAmount: { qty, unit }, where the amount starts for a food counted in that unit, like the
// amount of the food being swapped; any other food starts at one serving. onAdd(food, qty) runs
// when it's submitted. Returns { element, searchInput }.
export function foodPicker({ foods, store, submitLabel, startAmount, onAdd }) {
  let choices = foods;

  const body = document.createElement('div');
  body.className = 'add-food';

  // Step 1: search. Each food's row is built once, so a keystroke only re-orders rows.
  const search = searchField({ label: 'Search foods' });
  const list = rowList([]);
  const results = document.createElement('div');
  const rows = new Map();
  function rowFor(food) {
    if (!rows.has(food)) {
      const add = iconButton('plus', `Add ${food.name}`, { onClick: () => showAmount(food, add) });
      rows.set(food, listRow({ emoji: food.emoji, eyebrow: eyebrow(food), title: food.name, numbers: food, trailing: add }));
    }
    return rows.get(food);
  }

  // An empty query lists every food, as the foods list does.
  function update() {
    const query = search.input.value.trim();
    const matches = searchFoods(choices, query);
    if (matches.length > 0) {
      list.replaceChildren(...matches.map(rowFor));
      results.replaceChildren(list);
    } else {
      results.replaceChildren(noMatch(query, addCustomFood));
    }
  }
  search.input.addEventListener('input', update);
  update();

  // The custom food form opens over this sheet. A food made there goes straight to its
  // amount, and joins the search in case of "Back to search".
  async function addCustomFood() {
    const result = await foodFormSheet({ store, mode: 'add' });
    if (!result) return;
    const food = result.doc.foods.find(({ id }) => id === result.foodId);
    choices = [food, ...choices];
    update();
    showAmount(food, search.input);
  }

  function showSearch(focusTarget) {
    body.replaceChildren(search.element, results);
    focusTarget.focus();
  }

  // Step 2: the amount, starting at one serving, or at startAmount in the same unit, however
  // it's capitalised. pickedWith: where "Back to search" puts focus: the add button that chose
  // the food, or the search field for a new custom food.
  function showAmount(food, pickedWith) {
    const sameUnit = startAmount?.unit.toLowerCase() === food.serving.unit.toLowerCase();
    const start = sameUnit ? startAmount.qty : food.serving.qty;
    const amount = numberField({ label: 'Amount', unit: food.serving.unit, value: String(start) });
    amount.input.addEventListener('input', () => amount.setError(null));

    const form = document.createElement('form');
    form.className = 'add-food__form';
    form.noValidate = true;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const qty = parseAmount(amount.input.value);
      if (!qty) {
        amount.setError('Enter an amount above 0');
        amount.input.focus();
        return;
      }
      onAdd(food, qty);
    });

    const submit = primaryButton(submitLabel, { block: true });
    submit.type = 'submit';
    const back = secondaryButton('Back to search', { block: true, onClick: () => showSearch(pickedWith) });
    const picked = listRow({ emoji: food.emoji, eyebrow: eyebrow(food), title: food.name, numbers: food });
    form.append(rowList([picked]), amount.element, submit, back);

    body.replaceChildren(form);
    // Selected, so typing replaces the serving it starts at.
    amount.input.focus();
    amount.input.select();
  }

  body.append(search.element, results);
  return { element: body, searchInput: search.input };
}

// For the meal editor and the Ingredients sheet. Resolves to { food, qty } for the food to add,
// or null if the sheet closes without one. The food itself comes back, since it may be a custom
// food made in the sheet, which the caller's own list doesn't have yet.
export async function addFoodSheet({ foods, store }) {
  let added = null;
  let sheet;
  const picker = foodPicker({
    foods,
    store,
    submitLabel: 'Add to meal',
    onAdd: (food, qty) => {
      added = { food, qty };
      sheet.close();
    },
  });
  sheet = openSheet({ title: 'Add food', content: picker.element, initialFocus: picker.searchInput });
  await sheet.closed;
  return added;
}
