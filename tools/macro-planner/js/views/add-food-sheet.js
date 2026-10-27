// Adding a food (SPEC §3.3, §3.5): search, pick a food, then enter its amount, in any unit the food
// has (SPEC §3.2). One step shows at a time, in the same sheet.

import { foodTotals } from '../calc.js';
import { parseAmount } from '../custom-foods.js';
import { amountLabel, defaultAmount, foodUnits } from '../portions.js';
import { searchFoods } from '../search.js';
import { iconButton, primaryButton, secondaryButton } from '../ui/buttons.js';
import { emptyState } from '../ui/empty-state.js';
import { searchField } from '../ui/inputs.js';
import { listRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { amountField } from '../ui/unit-choice.js';
import { foodFormSheet } from './food-form.js';

// A food's row at an amount: the amount in the eyebrow, with "Custom" first on a custom food, as
// in the foods list, and the numbers for that amount (DESIGN §8).
function foodRow(food, amount, trailing) {
  const label = amountLabel(food, amount);
  return listRow({
    emoji: food.emoji,
    eyebrow: food.custom ? `Custom · ${label}` : label,
    title: food.name,
    numbers: foodTotals(food, amount.qty, amount.unit),
    trailing,
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

// Search, pick a food, then enter its amount, one step at a time in the same element. Used by
// the add food sheet, the add sheet on Today, the swap sheet and the Ingredients sheet's swap
// sheet. Results show each food at its default amount (portions.js). foods: bundled and custom
// foods together; archived ones are left out of the search. store: the app's store, for a custom
// food made from "No match". submitLabel: the amount step's primary button. The amount can be in
// any of the food's units, with the unit button (DESIGN §10). startAmount: { qty, unit }, where the
// amount starts for a food with that unit, like the amount of the food being swapped; any other
// food starts at its default amount. onAdd(food, qty, unit) runs when it's submitted. Returns
// { element, searchInput }.
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
      rows.set(food, foodRow(food, defaultAmount(food), add));
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

  // Step 2: the amount, starting at startAmount in a unit the food has, however it's capitalised,
  // else at the default amount. The picked food's row shows the numbers for the amount as it's
  // typed or its unit changed, keeping the last one that reads as a number. pickedWith: where
  // "Back to search" puts focus: the add button that chose the food, or the search field for a
  // new custom food.
  function showAmount(food, pickedWith) {
    const units = foodUnits(food);
    const startUnit = units.find((unit) => unit.toLowerCase() === startAmount?.unit.toLowerCase());
    const start = startUnit ? { qty: startAmount.qty, unit: startUnit } : defaultAmount(food);

    const picked = rowList([foodRow(food, start)]);
    const amount = amountField({ label: 'Amount', units, unit: start.unit, value: String(start.qty), onUnitChange: showNumbers });
    amount.input.addEventListener('input', () => {
      amount.setError(null);
      showNumbers();
    });
    function showNumbers() {
      const qty = parseAmount(amount.input.value);
      if (qty) picked.replaceChildren(foodRow(food, { qty, unit: amount.unit() }));
    }

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
      onAdd(food, qty, amount.unit());
    });

    const submit = primaryButton(submitLabel, { block: true });
    submit.type = 'submit';
    const back = secondaryButton('Back to search', { block: true, onClick: () => showSearch(pickedWith) });
    form.append(picked, amount.element, submit, back);

    body.replaceChildren(form);
    // Selected, so typing replaces the amount it starts at.
    amount.input.focus();
    amount.input.select();
  }

  body.append(search.element, results);
  return { element: body, searchInput: search.input };
}

// For the meal editor, the Ingredients sheet, Plan's slot sheet and a planned food's swap on
// Today. Resolves to { food, qty, unit } for the food to add, or null if the sheet closes without
// one. The food itself comes back, since it may be a custom food made in the sheet, which the
// caller's own list doesn't have yet. submitLabel: the amount step's primary button. title and
// startAmount: for a swap, "Banana · Swap" and the old amount, as foodPicker takes it.
export async function addFoodSheet({ foods, store, submitLabel = 'Add to meal', title = 'Add food', startAmount }) {
  let added = null;
  let sheet;
  const picker = foodPicker({
    foods,
    store,
    submitLabel,
    startAmount,
    onAdd: (food, qty, unit) => {
      added = { food, qty, unit };
      sheet.close();
    },
  });
  sheet = openSheet({ title, content: picker.element, initialFocus: picker.searchInput });
  await sheet.closed;
  return added;
}
