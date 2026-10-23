// A saved meal's own screen, pushed from the Meals list: the meal editor (SPEC §3.3; DESIGN §8
// ingredient row). Emoji, name and tags, live totals in a sticky card, the foods with their
// quantities, then Duplicate and Delete. Each change saves as soon as it's made, so there's no
// Save button and nothing to lose on Back.

import { loadBundledFoods } from '../bundled-foods.js';
import { foodTotals, mealTotals } from '../calc.js';
import { parseAmount } from '../custom-foods.js';
import { CoreDocUnavailableError, updateCoreDoc } from '../data.js';
import { mealRoute, routeParam } from '../routes.js';
import {
  addItem,
  addMeal,
  allTags,
  deleteMeal,
  duplicateMeal,
  foodLookup,
  isMealPlanned,
  removeItem,
  renameMeal,
  setMealEmoji,
  setMealTags,
  updateItem,
  updateMeal,
} from '../saved-meals.js';
import { CORE_DOC_ID } from '../store.js';
import { iconButton, secondaryButton } from '../ui/buttons.js';
import { newTagPill, tagGroup, tagPill } from '../ui/controls.js';
import { emojiField } from '../ui/emoji-picker.js';
import { formError, numberField, textField } from '../ui/inputs.js';
import { ingredientRow, rowList } from '../ui/row.js';
import { confirmSheet } from '../ui/sheet.js';
import { totalsCard } from '../ui/totals-card.js';
import { addFoodSheet } from './add-food-sheet.js';
import { newTagSheet } from './new-tag-sheet.js';

function group(className, ...children) {
  const element = document.createElement('div');
  element.className = className;
  element.append(...children);
  return element;
}

function note(text) {
  const element = document.createElement('p');
  element.className = 'meals__note';
  element.textContent = text;
  return element;
}

// route: 'meal/<id>'. A meal that isn't there, deleted here or on another device, goes back.
export function render(container, { route, replaceRoute, goBack, store }) {
  // Built into its own element, so a load that finishes after leaving the screen changes nothing.
  const screen = document.createElement('div');
  screen.className = 'meal-screen';
  container.replaceChildren(screen);

  const error = formError();
  let meal;
  // The bundled foods; then custom and bundled foods together, and a lookup over them.
  // All null when the food list didn't load.
  let bundled = null;
  let foods = null;
  let getFood = null;
  let writes = Promise.resolve();
  let duplicating = false;

  function useFoods(custom) {
    foods = [...custom, ...bundled];
    getFood = foodLookup(foods);
  }

  // Saves one change at a time, in order. Resolves true once saved; otherwise says so on the
  // screen and resolves false.
  function save(change) {
    writes = writes.then(async () => {
      error.show(null);
      try {
        await updateCoreDoc(store, change);
        return true;
      } catch (err) {
        console.error('[macro-planner] saving meals failed:', err);
        error.show(err instanceof CoreDocUnavailableError ? err.message : 'That didn’t save. Try again.');
        error.element.scrollIntoView({ block: 'nearest' });
        return false;
      }
    });
    return writes;
  }

  // Shown straight away, then saved. The whole meal is written each time, so an edit that
  // didn't save is made good by the next one that does.
  function edit(change) {
    meal = change(meal);
    const next = meal;
    return save((doc) => updateMeal(doc, next.id, () => next));
  }

  // A blank name isn't saved: the field says so, and the saved name stays.
  function nameRow() {
    const emoji = emojiField({ value: meal.emoji, onChange: (next) => edit((m) => setMealEmoji(m, next)) });
    const name = textField({ label: 'Name', value: meal.name });
    name.input.addEventListener('input', () => name.setError(null));
    name.input.addEventListener('change', () => {
      const text = name.input.value.trim();
      if (!text) {
        name.setError('Enter a name');
        return;
      }
      name.input.value = text;
      if (text !== meal.name) edit((m) => renameMeal(m, text));
    });
    return { element: group('meal-form__name', emoji.element, name.element), input: name.input };
  }

  // The meal's tags as "on" pills, each removing its tag when tapped, then "New tag" (SPEC §3.3).
  function tagRow() {
    const newTag = newTagPill({ onClick: addTag });
    const row = tagGroup({ label: 'Tags' });

    function showTags() {
      const pills = (meal.tags ?? []).map((tag) => tagPill({ label: tag, pressed: true, onClick: () => removeTag(tag) }));
      row.replaceChildren(...pills, newTag);
    }

    // Focus moves to the pill that takes its place, so several can go one after another; after
    // the last one, to "New tag".
    function removeTag(tag) {
      const index = meal.tags.indexOf(tag);
      edit((m) => setMealTags(m, m.tags.filter((own) => own !== tag)));
      showTags();
      row.children[index].focus();
    }

    // The tags in use are read when the sheet opens, so one added on another meal is there. A
    // typed tag that matches one takes its spelling.
    async function addTag() {
      const known = allTags((await store.load(CORE_DOC_ID)).meals ?? []);
      const tag = await newTagSheet({ tags: known.filter((own) => !(meal.tags ?? []).includes(own)) });
      if (!tag) return;
      edit((m) => setMealTags(m, [...(m.tags ?? []), tag], known));
      showTags();
      newTag.focus();
    }

    showTags();
    return row;
  }

  // The totals card, then a row per food with its quantity in the food's serving unit.
  function ingredients() {
    const totals = totalsCard();
    const list = rowList([]);
    const empty = note('No foods in this meal yet.');
    const addFood = secondaryButton('Add food', { block: true, onClick: add });

    function showCount() {
      const hasItems = meal.items.length > 0;
      list.hidden = !hasItems;
      empty.hidden = hasItems;
    }

    function showList() {
      list.replaceChildren(...meal.items.map(rowFor));
      showCount();
      totals.show(mealTotals(meal, getFood));
    }

    function rowFor({ foodId, qty }) {
      const food = getFood(foodId);
      const quantity = numberField({ unit: food.serving.unit, value: String(qty) });
      const row = ingredientRow({
        emoji: food.emoji,
        title: food.name,
        numbers: foodTotals(food, qty),
        quantity,
        trailing: iconButton('x', `Remove ${food.name}`, { onClick: remove }),
      });
      const savedQty = () => meal.items.find((item) => item.foodId === foodId).qty;

      // Live: the row and the totals follow what's typed, and show what's saved until it's an
      // amount above 0.
      quantity.input.addEventListener('input', () => {
        quantity.setError(null);
        const shownQty = parseAmount(quantity.input.value) || savedQty();
        row.setNumbers(foodTotals(food, shownQty));
        totals.show(mealTotals(updateItem(meal, foodId, shownQty), getFood));
      });

      quantity.input.addEventListener('change', () => {
        const typed = parseAmount(quantity.input.value);
        if (!typed) {
          quantity.setError('Enter an amount above 0');
          return;
        }
        quantity.input.value = String(typed);
        edit((m) => updateItem(m, foodId, typed));
      });

      // Focus moves to the next row's remove button, or the one before, so several foods can
      // go one after another; with none left, to "Add food".
      function remove() {
        const next = row.element.nextElementSibling ?? row.element.previousElementSibling;
        edit((m) => removeItem(m, foodId));
        row.element.remove();
        showCount();
        totals.show(mealTotals(meal, getFood));
        (next?.querySelector('.icon-btn') ?? addFood).focus();
      }

      return row.element;
    }

    // Focus comes back to "Add food" when the sheet closes, ready for the next one. Custom
    // foods are read again after it, since one may have been made in the sheet.
    async function add() {
      const picked = await addFoodSheet({ foods, store });
      useFoods((await store.load(CORE_DOC_ID)).foods ?? []);
      if (!picked) return;
      edit((m) => addItem(m, picked.food.id, picked.qty));
      showList();
    }

    showList();
    return group('meal-editor', totals.element, list, empty, addFood);
  }

  // Returns the name input, so a new copy can be announced by moving focus to it.
  function show() {
    const top = nameRow();
    screen.replaceChildren(
      group('meal-screen__group', top.element, tagRow()),
      getFood
        ? ingredients()
        : note('This meal’s foods need the food list, which didn’t load. Check your connection, then reload.'),
      group(
        'meal-screen__group',
        error.element,
        secondaryButton('Duplicate meal', { block: true, onClick: duplicate }),
        secondaryButton('Delete meal', { block: true, onClick: confirmDelete }),
      ),
    );
    return top.input;
  }

  // The copy replaces this screen, so Back still goes to the list, where both now show.
  async function duplicate() {
    if (duplicating) return;
    duplicating = true;
    const copy = duplicateMeal(meal);
    const saved = await save((doc) => addMeal(doc, copy));
    duplicating = false;
    if (!saved) return;
    meal = copy;
    replaceRoute(mealRoute(copy.id));
    show().focus();
  }

  // The message says whether it's planned, but deleteMeal decides from the doc it saves.
  async function confirmDelete() {
    const planned = isMealPlanned(await store.load(CORE_DOC_ID), meal.id);
    const confirmed = await confirmSheet({
      title: `Delete “${meal.name}”?`,
      message: planned
        ? 'It’s in your plan, so those slots become flex. Past days aren’t changed.'
        : 'It will be removed from your saved meals. Past days aren’t changed.',
      confirmLabel: 'Delete meal',
    });
    if (confirmed && (await save((doc) => deleteMeal(doc, meal.id)))) goBack();
  }

  const bundledFoods = loadBundledFoods().catch((err) => {
    console.error('[macro-planner] food list failed to load:', err);
    return null;
  });
  Promise.all([store.load(CORE_DOC_ID), bundledFoods]).then(([doc, loaded]) => {
    if (!screen.isConnected) return;
    meal = (doc.meals ?? []).find(({ id }) => id === routeParam(route));
    if (!meal) {
      goBack();
      return;
    }
    if (loaded) {
      bundled = loaded;
      useFoods(doc.foods ?? []);
    }
    show();
  });
}
