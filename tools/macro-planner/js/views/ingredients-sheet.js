// The Ingredients sheet (SPEC §3.5, DESIGN §8): a slot's meal, or a meal added to a slot, changed
// for that day only. The meal editor's totals card, a row per food with its amount, Add food, then
// Reset to original meal once something has changed, and for an added meal, Remove from slot.
// Each change is passed on as it's made, so there's no Save button. A row's swap button opens a
// sheet to swap its food for another, or to remove it.

import { ingredientsTotals } from '../calc.js';
import { parseAmount } from '../custom-foods.js';
import {
  addIngredient,
  amountText,
  removeIngredient,
  setIngredientQty,
  setIngredientUnit,
  swapIngredient,
} from '../ingredients.js';
import { foodUnits } from '../portions.js';
import { iconButton, secondaryButton } from '../ui/buttons.js';
import { ingredientRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { totalsCard } from '../ui/totals-card.js';
import { amountField } from '../ui/unit-choice.js';
import { addFoodSheet, foodPicker } from './add-food-sheet.js';

// The swap button's sheet: "Remove from meal", disabled on the meal's last ingredient, since a
// meal keeps at least one (SPEC §3.5), then food search to swap another food in at the same
// amount, if the food has the same unit, else at its default amount. item: the ingredient as the
// sheet shows it. Resolves to { remove: true }, to { food, qty, unit } for the food to swap in, or
// to null.
async function swapIngredientSheet({ item, canRemove, foods, store }) {
  let picked = null;
  let sheet;
  const choose = (result) => {
    picked = result;
    sheet.close();
  };

  const remove = secondaryButton('Remove from meal', {
    block: true,
    disabled: !canRemove,
    onClick: () => choose({ remove: true }),
  });
  const search = foodPicker({
    foods,
    store,
    submitLabel: 'Swap food',
    startAmount: { qty: Number(amountText(item.qty)), unit: item.unit },
    onAdd: (food, qty, unit) => choose({ food, qty, unit }),
  });
  sheet = openSheet({
    title: `${item.name} · Swap`,
    content: [remove, search.element],
    initialFocus: search.searchInput,
  });
  await sheet.closed;
  return picked;
}

// name: the meal's name, for the title. items: the ingredients the slot eats now, at its portion
// (ingredients.js's slotIngredients). edited: whether they're already the day's own, so Reset
// shows from the start. foods: bundled and custom foods together, for Add food and a swap's
// search. getFood: saved-meals.js's foodLookup over them, for the units an ingredient's amount
// can be switched to. store: the app's store, for a custom food made from either. onChange(items)
// runs with the whole new list after each change, for the caller to save. removable: an added
// meal, which ends in Remove from slot. Resolves to { action: 'reset' } when Reset to original
// meal is tapped, or { action: 'remove' } for Remove from slot, for the caller to apply or
// confirm, or to null.
export async function ingredientsSheet({ name, items, edited, foods, getFood, store, onChange, removable = false }) {
  let current = items;
  let picked = null;
  let sheet;
  // Each row's swap button by food id, so focus can go back to a row once the list is rebuilt.
  let swapButtons = new Map();

  const totals = totalsCard();
  const list = rowList([]);
  const choose = (action) => {
    picked = { action };
    sheet.close();
  };
  const addFood = secondaryButton('Add food', { block: true, onClick: add });
  const reset = secondaryButton('Reset to original meal', { block: true, onClick: () => choose('reset') });
  reset.hidden = !edited;
  const remove = removable ? [secondaryButton('Remove from slot', { block: true, onClick: () => choose('remove') })] : [];

  // Shown straight away, then passed on to be saved.
  function change(next) {
    current = next;
    totals.show(ingredientsTotals(current));
    reset.hidden = false;
    onChange(current);
  }

  function showList() {
    swapButtons = new Map();
    list.replaceChildren(...current.map(rowFor));
    totals.show(ingredientsTotals(current));
  }

  // The amount's unit can be switched to any its food has, while the food is there and still has
  // the unit the ingredient is in; otherwise the unit is plain text.
  function rowFor(item) {
    const { foodId } = item;
    const food = getFood(foodId);
    const units = food && foodUnits(food).includes(item.unit) ? foodUnits(food) : [item.unit];
    const quantity = amountField({ units, unit: item.unit, value: amountText(item.qty), onUnitChange: changeUnit });
    const swap = iconButton('arrow-left-right', `Swap ${item.name}`, { onClick: () => swapOrRemove(foodId) });
    swapButtons.set(foodId, swap);
    const row = ingredientRow({ emoji: item.emoji, title: item.name, numbers: item, quantity, trailing: swap });

    // Live: the row and the totals follow what's typed, and show what's saved until it's an
    // amount above 0.
    quantity.input.addEventListener('input', () => {
      quantity.setError(null);
      const typed = parseAmount(quantity.input.value);
      const shown = typed ? setIngredientQty(current, foodId, typed) : current;
      row.setNumbers(shown.find((own) => own.foodId === foodId));
      totals.show(ingredientsTotals(shown));
    });

    // The same amount typed again, like "3.0" for 3, changes nothing, so it doesn't count as
    // an edit.
    quantity.input.addEventListener('change', () => {
      const typed = parseAmount(quantity.input.value);
      if (!typed) {
        quantity.setError('Enter an amount above 0');
        return;
      }
      quantity.input.value = String(typed);
      const saved = current.find((own) => own.foodId === foodId);
      if (quantity.input.value !== amountText(saved.qty)) change(setIngredientQty(current, foodId, typed));
    });

    // The number in the field stays, now in the new unit (DESIGN §10), or the saved amount does
    // while the field doesn't read as one.
    function changeUnit(unit) {
      const qty = parseAmount(quantity.input.value) || current.find((own) => own.foodId === foodId).qty;
      change(setIngredientUnit(current, food, qty, unit));
      row.setNumbers(current.find((own) => own.foodId === foodId));
    }

    return row.element;
  }

  // Focus goes to the row now in its place: the food swapped in, or the one it merged into;
  // after a remove, the next row, or the one before it at the end of the list.
  async function swapOrRemove(foodId) {
    const index = current.findIndex((item) => item.foodId === foodId);
    const result = await swapIngredientSheet({ item: current[index], canRemove: current.length > 1, foods, store });
    if (!result) return;
    change(
      result.remove
        ? removeIngredient(current, foodId)
        : swapIngredient(current, foodId, result.food, result.qty, result.unit),
    );
    showList();
    const focusId = result.remove ? current[Math.min(index, current.length - 1)].foodId : result.food.id;
    swapButtons.get(focusId).focus();
  }

  // Focus comes back to "Add food" when its sheet closes, ready for the next one.
  async function add() {
    const result = await addFoodSheet({ foods, store });
    if (!result) return;
    change(addIngredient(current, result.food, result.qty, result.unit));
    showList();
  }

  showList();
  sheet = openSheet({ title: `${name} · Ingredients`, content: [totals.element, list, addFood, reset, ...remove] });
  await sheet.closed;
  return picked;
}
