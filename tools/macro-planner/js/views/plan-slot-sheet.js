// Plan's slot sheet (SPEC §3.4, DESIGN §8): what a slot plans every day. Its planned items, a row
// each with a remove button, then, while the slot is flex, Pin a budget; then a Meal · Food
// picker, laid out like the add sheet's (DESIGN §8), without Recent and Quick. Picking plans it
// in the slot and the sheet stays open, like the Ingredients sheet; the budget button closes it
// for the caller to apply.

import { foodTotals, mealTotals } from '../calc.js';
import { amountLabel } from '../portions.js';
import { iconButton, secondaryButton } from '../ui/buttons.js';
import { segmentedPanes } from '../ui/controls.js';
import { emptyState } from '../ui/empty-state.js';
import { listRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { foodPicker } from './add-food-sheet.js';
import { mealPicker } from './meal-picker.js';

// A planned item at its amount (DESIGN §8): a meal as itself, at 1×, like a saved meal row, or a
// food with its amount in the eyebrow, like a food search result. getFood: saved-meals.js's
// foodLookup, for the meal's totals.
function itemRow(item, getFood, remove) {
  if (item.meal) return listRow({ emoji: item.meal.emoji, title: item.meal.name, numbers: mealTotals(item.meal, getFood), trailing: remove });
  return listRow({
    emoji: item.food.emoji,
    eyebrow: amountLabel(item.food, item),
    title: item.food.name,
    numbers: foodTotals(item.food, item.qty, item.unit),
    trailing: remove,
  });
}

// plan: one of slots.js's planSlots. meals: the saved meals. foods: bundled and custom foods
// together, for the food picker. getFood: saved-meals.js's foodLookup, archived foods included.
// store: the app's store, for a custom food made from the food picker. addMeal(mealId): plans
// the meal in the slot, returning its next plan; a meal already there is unchanged. addFood(food,
// qty, unit): plans the food, returning its next plan; one already there gets the amount added
// to it. removeItem(itemId): takes the item out, returning the next plan, flex again once none
// are left. Resolves to { pinBudget: true } on a flex slot's budget button, to { buildMeal: true }
// when there are no meals yet and "Build a meal" is tapped, or to null once the sheet closes with
// neither.
export async function planSlotSheet({ plan, meals, foods, getFood, store, addMeal, addFood, removeItem }) {
  let current = plan;
  let result = null;
  let sheet;
  const choose = (next) => {
    result = next;
    sheet.close();
  };

  const list = rowList([]);
  const budgetArea = document.createElement('div');
  let removeButtons = [];
  let budgetButton = null;

  // The rows and the budget button follow the items: the last one gone makes the slot flex again,
  // with Pin a budget in its place.
  function showItems() {
    removeButtons = [];
    list.replaceChildren(
      ...current.items.map((item) => {
        const button = iconButton('x', `Remove ${item.meal ? item.meal.name : item.food.name}`, { onClick: () => removeOne(item.id) });
        removeButtons.push(button);
        return itemRow(item, getFood, button);
      }),
    );
    list.hidden = current.items.length === 0;
    budgetButton = current.flex
      ? secondaryButton(current.budget ? 'Change budget' : 'Pin a budget', { block: true, onClick: () => choose({ pinBudget: true }) })
      : null;
    budgetArea.replaceChildren(...(budgetButton ? [budgetButton] : []));
    budgetArea.hidden = !budgetButton;
  }

  // Focus goes to the next row's remove button, or the one before at the end, or, once none are
  // left, Pin a budget, which always shows then, since empty means flex.
  function removeOne(itemId) {
    const index = current.items.findIndex((item) => item.id === itemId);
    current = removeItem(itemId);
    showItems();
    (removeButtons[Math.min(index, removeButtons.length - 1)] ?? budgetButton)?.focus();
  }

  function pickMeal(meal) {
    current = addMeal(meal.id);
    showItems();
  }

  async function pickFood(food, qty, unit) {
    current = await addFood(food, qty, unit);
    showItems();
  }

  // Every meal already planned shows checked, as the sheet opens; picking one more doesn't
  // re-check the list, like the add sheet's search staying put when a tab is left and come back
  // to.
  const selectedIds = new Set(current.items.filter((item) => item.mealId).map((item) => item.mealId));
  const panes = {
    meal: () =>
      meals.length > 0
        ? mealPicker({ meals, getFood, selectedIds, onPick: pickMeal })
        : emptyState({
            iconName: 'soup',
            heading: 'No saved meals yet',
            message: 'Build the meals you eat most, then plan your days with them.',
            action: { label: 'Build a meal', onClick: () => choose({ buildMeal: true }) },
          }),
    food: () => foodPicker({ foods, store, submitLabel: 'Add to slot', onAdd: pickFood }).element,
  };

  const kinds = segmentedPanes({
    label: 'What to plan',
    options: [
      { value: 'meal', label: 'Meal' },
      { value: 'food', label: 'Food' },
    ],
    value: meals.length > 0 ? 'meal' : 'food',
    panes,
  });

  const body = document.createElement('div');
  body.className = 'plan-slot';
  showItems();
  body.append(list, budgetArea, kinds.control, kinds.pane);
  sheet = openSheet({ title: plan.name, content: body });
  await sheet.closed;
  return result;
}
