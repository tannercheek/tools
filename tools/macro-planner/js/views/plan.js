// Plan (SPEC §3.4): the daily template, the same every day. A totals card shows what it adds up
// to, then each slot, under its name, plans a saved meal, foods, both, or neither, which is flex,
// and a flex slot can have a pinned budget.
// Tapping a slot opens its sheet to change it, which saves straight away. Slots themselves are
// named and ordered in Settings.

import { loadBundledFoods } from '../bundled-foods.js';
import { dayTotal, leftForFlex, mealTotals, profileTargets } from '../calc.js';
import { CoreDocUnavailableError, createWeightLog, currentWeight, emptyDay, localDate, updateCoreDoc } from '../data.js';
import { miniRings } from '../rings.js';
import { hashFor, mealRoute } from '../routes.js';
import { foodLookup } from '../saved-meals.js';
import { addSlotFood, daySlots, removeSlotFood, setSlotBudget, setSlotMeal } from '../slots.js';
import { CORE_DOC_ID } from '../store.js';
import { textLink } from '../ui/buttons.js';
import { formError } from '../ui/inputs.js';
import { listRow, rowGroup } from '../ui/row.js';
import { addFoodSheet } from './add-food-sheet.js';
import { budgetSheet } from './budget-sheet.js';
import { newMealSheet } from './new-meal-sheet.js';
import { planSlotSheet } from './plan-slot-sheet.js';
import { itemsRow } from './today-rows.js';

const integer = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function note(text) {
  const element = document.createElement('p');
  element.className = 'plan__note';
  element.textContent = text;
  return element;
}

// What's left, in kcal only, since the rings show the macros. One figure however many flex slots
// there are (SPEC §3.4). Over target there's nothing left, never a negative; without a flex slot,
// the Calories ring's "over" already says so. With no targets, the link to set them (DESIGN §13).
function leftLine(total, targets, hasFlex) {
  if (!targets) return [textLink('Set your targets in Settings', hashFor('settings'))];
  const { amount, over } = leftForFlex(targets, total).kcal;
  if (over) return hasFlex ? ['Nothing left for flex'] : [];
  const kcal = document.createElement('span');
  kcal.className = 'plan-totals__kcal';
  kcal.textContent = `${integer.format(amount)} kcal`;
  return [kcal, hasFlex ? ' left for flex' : ' left'];
}

// What the template adds up to against the targets, on four equal mini rings, then what's left
// for flex. Built once and redrawn by show(total, targets, hasFlex), so the arcs move to new
// totals rather than drawing in on load (DESIGN §14). total: calc.js totals; targets:
// profileTargets' result, or null; hasFlex: whether any slot is flex.
function totalsCard() {
  const card = document.createElement('div');
  card.className = 'plan-totals';
  const eyebrow = document.createElement('span');
  eyebrow.className = 'row__eyebrow';
  eyebrow.textContent = 'Plan total';
  const left = document.createElement('p');
  left.className = 'plan-totals__left';
  let rings = null;

  return {
    element: card,
    show(total, targets, hasFlex) {
      if (rings) rings.show({ totals: total, targets });
      else {
        rings = miniRings({ totals: total, targets });
        card.append(eyebrow, rings.element, left);
      }
      left.replaceChildren(...leftLine(total, targets, hasFlex));
      left.hidden = !left.hasChildNodes();
    },
  };
}

// store: the app's store; the slots, template and meals live in the core doc.
export function render(container, { store }) {
  // Built into its own element, so a load that finishes after leaving the screen changes nothing.
  const screen = document.createElement('div');
  screen.className = 'plan';
  container.replaceChildren(screen);

  const error = formError();
  let doc;
  // The bundled foods; then custom and bundled foods together, for Add food, and a lookup over them.
  let bundled;
  let foods;
  let getFood;
  let targets;
  let writes = Promise.resolve();
  // By slot id, so focus can go back to a slot's row after the list is rebuilt.
  let rows = new Map();
  // The card stays in place, so its rings move; the slots under it are rebuilt.
  const totals = totalsCard();
  const slotsArea = document.createElement('div');
  slotsArea.className = 'plan__slots';

  // One write at a time, in order. A failure says so on the screen.
  function save(change) {
    writes = writes.then(async () => {
      error.show(null);
      try {
        await updateCoreDoc(store, change);
      } catch (err) {
        console.error('[macro-planner] saving the plan failed:', err);
        error.show(err instanceof CoreDocUnavailableError ? err.message : 'That didn’t save. Try again.');
        error.element.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function useFoods(custom) {
    foods = [...custom, ...bundled];
    getFood = foodLookup(foods);
  }

  // What a planned slot plans, as Today's slot rows list what a slot holds (SPEC §3.4, §3.6): the
  // meal first, then its foods.
  function plannedItems(plan) {
    const meal = plan.meal ? [{ emoji: plan.meal.emoji, label: plan.meal.name, ...mealTotals(plan.meal, getFood) }] : [];
    const planned = plan.foods.map(({ emoji, name, kcal, protein, fat, carbs }) => ({ emoji, label: name, kcal, protein, fat, carbs }));
    return [...meal, ...planned];
  }

  // A planned slot shows what it plans like a Today slot: one thing as itself, more than one as
  // "N items". A flex slot is the dashed empty slot (DESIGN §8), showing its pinned budget if it
  // has one. The row button keeps the name as hidden text, so it still says which slot it is.
  function slotGroup(plan) {
    const onClick = () => choose(plan);
    const eyebrow = plan.flex ? `${plan.name} · Flex` : plan.name;
    const item = plan.flex
      ? listRow({
          placeholderIcon: 'plus',
          hiddenEyebrow: eyebrow,
          title: plan.budget ? 'Budget' : 'Add a meal',
          numbers: plan.budget ?? undefined,
          onClick,
        })
      : itemsRow(eyebrow, plannedItems(plan), onClick);
    rows.set(plan.id, item.firstElementChild);
    return rowGroup({ eyebrow, rows: [item], card: false });
  }

  // The template is a day with nothing changed or added.
  function templatePlans() {
    return daySlots(doc, emptyDay(), getFood);
  }

  // Redrawn on every change, so the totals follow a slot's new meal, foods or budget straight
  // away: the template's meals, planned foods and pinned budgets.
  function show() {
    rows = new Map();
    const plans = templatePlans();
    totals.show(dayTotal(emptyDay(), plans, getFood), targets, plans.some((plan) => plan.flex));
    slotsArea.replaceChildren(...plans.map(slotGroup));
  }

  // Shown straight away, then saved. Returns the slot's next plan, for its sheet.
  function apply(slotId, change) {
    doc = change(doc);
    save(change);
    show();
    return templatePlans().find((plan) => plan.id === slotId);
  }

  // Custom foods are read again after Add food, since one may have been made in its sheet.
  async function addFood(slotId) {
    const picked = await addFoodSheet({ foods, store, submitLabel: 'Add to slot' });
    useFoods((await store.load(CORE_DOC_ID)).foods ?? []);
    if (!picked) return null;
    return apply(slotId, (d) => addSlotFood(d, slotId, picked.food, picked.qty, picked.unit));
  }

  // Focus goes back to the slot's new row, once anything has changed.
  async function choose(plan) {
    let changed = false;
    const result = await planSlotSheet({
      plan,
      meals: doc.meals ?? [],
      getFood,
      addFood: async () => {
        const next = await addFood(plan.id);
        changed ||= Boolean(next);
        return next;
      },
      removeFood: (foodId) => {
        changed = true;
        return apply(plan.id, (d) => removeSlotFood(d, plan.id, foodId));
      },
    });
    if (result?.buildMeal) {
      const meal = await newMealSheet({ store });
      if (meal) location.hash = hashFor(mealRoute(meal.id));
      return;
    }
    if (result?.pinBudget) {
      const budget = doc.template?.[plan.id]?.budget ?? null;
      const pinned = await budgetSheet({ slot: plan, budget });
      if (pinned) apply(plan.id, (d) => setSlotBudget(d, plan.id, pinned.budget));
      else if (!changed) return;
    } else if (result) apply(plan.id, (d) => setSlotMeal(d, plan.id, result.mealId));
    else if (!changed) return;
    rows.get(plan.id).focus();
  }

  // Meal totals need every food the meals use, bundled ones included. Targets need the latest
  // weigh-in.
  Promise.all([loadBundledFoods(), store.load(CORE_DOC_ID), createWeightLog(store).list()]).then(
    ([loadedBundled, loaded, weighIns]) => {
      if (!screen.isConnected) return;
      doc = loaded;
      bundled = loadedBundled;
      useFoods(doc.foods ?? []);
      const today = localDate(new Date());
      targets = profileTargets(doc.profile ?? {}, currentWeight(weighIns), doc.overrides ?? {}, doc.macroSplit, today);
      screen.replaceChildren(totals.element, slotsArea, error.element);
      show();
    },
    (err) => {
      console.error('[macro-planner] the plan failed to load:', err);
      if (!screen.isConnected) return;
      screen.replaceChildren(note('Your plan didn’t load, because the food list didn’t. Check your connection, then reload.'));
    },
  );
}
