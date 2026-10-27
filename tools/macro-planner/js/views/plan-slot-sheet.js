// Plan's slot sheet (SPEC §3.4, DESIGN §8): what a slot plans every day. Its planned foods, a row
// each with its amount and a remove button, then Add food; then the meal's button and the meal
// picker. A food added or removed is passed on as it's made and the sheet stays open, like the
// Ingredients sheet; anything about the meal closes it for the caller to apply.

import { amountLabel } from '../portions.js';
import { iconButton, secondaryButton } from '../ui/buttons.js';
import { emptyState } from '../ui/empty-state.js';
import { listRow, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { mealPicker } from './meal-picker.js';

// The button above the meal picker, only where it would change something. A meal on its own can
// go, making the slot flex; beside foods, the slot keeps planning them. A flex slot can pin a
// budget. A slot with only foods isn't flex, so it has neither (SPEC §3.4).
function mealButton(plan, choose) {
  if (plan.meal) {
    const label = plan.foods.length > 0 ? 'Remove meal' : 'Make it flex';
    return secondaryButton(label, { block: true, onClick: () => choose({ mealId: null }) });
  }
  if (!plan.flex) return null;
  const label = plan.budget ? 'Change budget' : 'Pin a budget';
  return secondaryButton(label, { block: true, onClick: () => choose({ pinBudget: true }) });
}

// plan: the slot as slots.js's daySlots plans it on a day with no changes. meals: the saved meals.
// getFood: saved-meals.js's foodLookup, archived foods included. addFood(): opens the add food
// sheet and saves what's picked, resolving to the slot's next plan, or null with nothing added.
// removeFood(foodId): saves the food's removal and returns the next plan. Resolves to { mealId }
// with the meal's id or null for none, to { buildMeal: true } when there are no meals yet and
// "Build a meal" is tapped, to { pinBudget: true } on a flex slot's budget button, or to null if
// the sheet closes with nothing picked.
export async function planSlotSheet({ plan, meals, getFood, addFood, removeFood }) {
  let current = plan;
  let result = null;
  let sheet;
  const choose = (next) => {
    result = next;
    sheet.close();
  };

  const list = rowList([]);
  const add = secondaryButton('Add food', { block: true, onClick: addOne });
  // Holds the meal's button, if the slot has one, so it can change with the foods.
  const mealArea = document.createElement('div');
  let removeButtons = [];

  // The rows and the meal's button follow the foods: the last one gone makes the slot flex again.
  function show() {
    removeButtons = [];
    list.replaceChildren(...current.foods.map(foodRow));
    list.hidden = current.foods.length === 0;
    const button = mealButton(current, choose);
    mealArea.replaceChildren(...(button ? [button] : []));
    mealArea.hidden = !button;
  }

  // Each planned food at its amount, as a food search result shows one (DESIGN §8).
  function foodRow(item) {
    const remove = iconButton('x', `Remove ${item.name}`, { onClick: () => removeOne(item.foodId) });
    removeButtons.push(remove);
    return listRow({
      emoji: item.emoji,
      eyebrow: amountLabel(getFood(item.foodId), item),
      title: item.name,
      numbers: item,
      trailing: remove,
    });
  }

  // Focus goes to the next row's remove button, or the one before at the end, or Add food.
  function removeOne(foodId) {
    const index = current.foods.findIndex((item) => item.foodId === foodId);
    current = removeFood(foodId);
    show();
    (removeButtons[Math.min(index, removeButtons.length - 1)] ?? add).focus();
  }

  // Focus comes back to Add food when its sheet closes, ready for the next one.
  async function addOne() {
    const next = await addFood();
    if (!next) return;
    current = next;
    show();
  }

  const picker =
    meals.length > 0
      ? mealPicker({ meals, getFood, selectedId: plan.meal?.id, onPick: (meal) => choose({ mealId: meal.id }) })
      : emptyState({
          iconName: 'soup',
          heading: 'No saved meals yet',
          message: 'Build the meals you eat most, then plan your days with them.',
          action: { label: 'Build a meal', onClick: () => choose({ buildMeal: true }) },
        });

  const content = [list, add, mealArea, picker];
  show();
  sheet = openSheet({ title: plan.name, content });
  await sheet.closed;
  return result;
}
