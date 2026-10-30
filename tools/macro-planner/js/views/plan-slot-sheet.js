// Plan's slot sheet (SPEC §3.4, DESIGN §8): what a slot plans every day. Its planned items, a row
// each with a remove button, tapping the rest opening its Portion sheet (14.24, 14.25); then,
// while the slot is flex, Pin a budget; then a Meal · Food picker, laid out like the add sheet's
// (DESIGN §8), without Recent and Quick. Picking plans it in the slot and the sheet stays open,
// like the Ingredients sheet; the budget button closes it for the caller to apply.

import { foodTotals, mealTotals, scaleTotals } from '../calc.js';
import { amountLabel } from '../portions.js';
import { iconButton, secondaryButton } from '../ui/buttons.js';
import { segmentedPanes } from '../ui/controls.js';
import { emptyState } from '../ui/empty-state.js';
import { actionRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { foodPicker } from './add-food-sheet.js';
import { mealPicker } from './meal-picker.js';
import { portionSheet } from './slot-actions-sheet.js';
import { portionMark } from './today-rows.js';

// A planned item at its amount and portion (DESIGN §8): a meal at its portion, like a saved meal
// row, or a food with its portion and amount in the eyebrow, like a food search result
// ("1.5× · 1 MEDIUM · 120 G"). Tapping the row opens its Portion sheet. getFood: saved-meals.js's
// foodLookup, for the meal's totals.
function itemRow(item, getFood, remove, openPortion) {
  const onClick = () => openPortion(item);
  const row = item.meal
    ? actionRow({
        emoji: item.meal.emoji,
        eyebrow: portionMark(item.portion).join(' · ') || undefined,
        title: item.meal.name,
        numbers: scaleTotals(mealTotals(item.meal, getFood), item.portion ?? 1),
        trailing: remove,
        onClick,
      })
    : actionRow({
        emoji: item.food.emoji,
        eyebrow: [...portionMark(item.portion), amountLabel(item.food, item)].join(' · '),
        title: item.food.name,
        numbers: scaleTotals(foodTotals(item.food, item.qty, item.unit), item.portion ?? 1),
        trailing: remove,
        onClick,
      });
  // For openPortion to focus the row back once its sheet closes.
  row.querySelector('.row__content').dataset.itemId = item.id;
  return row;
}

// plan: one of slots.js's planSlots. meals: the saved meals. foods: bundled and custom foods
// together, for the food picker. getFood: saved-meals.js's foodLookup, archived foods included.
// store: the app's store, for a custom food made from the food picker. addMeal(mealId): plans
// the meal in the slot, returning its next plan; a meal already there is unchanged. addFood(food,
// qty, unit): plans the food, returning its next plan; one already there gets the amount added
// to it. removeItem(itemId): takes the item out, returning the next plan, flex again once none
// are left. setPortion(itemId, portion): sets the item's portion (14.24), returning the next plan.
// Resolves to { pinBudget: true } on a flex slot's budget button, to { buildMeal: true }
// when there are no meals yet and "Build a meal" is tapped, or to null once the sheet closes with
// neither.
export async function planSlotSheet({ plan, meals, foods, getFood, store, addMeal, addFood, removeItem, setPortion }) {
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
        return itemRow(item, getFood, button, openPortion);
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

  // Opens the item's Portion sheet (14.25): 0.5×, 1×, 1.5× or Custom, saving straight away. Focus
  // comes back to the row once it closes.
  async function openPortion(item) {
    await portionSheet({
      title: item.meal ? item.meal.name : item.food.name,
      portion: item.portion ?? 1,
      onPortion: (portion) => {
        current = setPortion(item.id, portion);
        showItems();
      },
    });
    list.querySelector(`[data-item-id="${item.id}"]`)?.focus();
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
