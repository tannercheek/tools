// Plan (SPEC §3.4): the daily template, the same every day. A totals card shows what it adds up
// to, then each slot plans a saved meal or flex, and a flex slot can have a pinned budget.
// Tapping a slot opens a picker to change it, which saves straight away. Slots themselves are
// named and ordered in Settings.

import { loadBundledFoods } from '../bundled-foods.js';
import { dayTotal, leftForFlex, mealTotals, profileTargets } from '../calc.js';
import { CoreDocUnavailableError, createWeightLog, currentWeight, emptyDay, updateCoreDoc } from '../data.js';
import { miniRings } from '../rings.js';
import { hashFor, mealRoute } from '../routes.js';
import { foodLookup } from '../saved-meals.js';
import { daySlots, setSlotBudget, setSlotMeal, templateSlots } from '../slots.js';
import { CORE_DOC_ID } from '../store.js';
import { secondaryButton, textLink } from '../ui/buttons.js';
import { emptyState } from '../ui/empty-state.js';
import { formError } from '../ui/inputs.js';
import { listRow, rowActionIcon, rowList } from '../ui/row.js';
import { openSheet } from '../ui/sheet.js';
import { budgetSheet } from './budget-sheet.js';
import { mealPicker } from './meal-picker.js';
import { newMealSheet } from './new-meal-sheet.js';

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

// What the slot plans: a meal, or flex. Resolves to { mealId } with the meal's id or null for
// flex, to { buildMeal: true } when there are no meals yet and "Build a meal" is tapped, to
// { pinBudget: true } on a flex slot's budget button, or to null if the sheet closes with
// nothing picked. budget: the slot's pinned budget, or null.
async function slotMealSheet({ slot, budget, meals, getFood }) {
  let result = null;
  let sheet;
  const choose = (next) => {
    result = next;
    sheet.close();
  };

  const content = [];
  // Only offered when it would change something: a flex slot is flex already.
  if (slot.meal) content.push(secondaryButton('Make it flex', { block: true, onClick: () => choose({ mealId: null }) }));
  else {
    const label = budget ? 'Change budget' : 'Pin a budget';
    content.push(secondaryButton(label, { block: true, onClick: () => choose({ pinBudget: true }) }));
  }
  if (meals.length > 0) {
    content.push(mealPicker({ meals, getFood, selectedId: slot.meal?.id, onPick: (meal) => choose({ mealId: meal.id }) }));
  } else {
    content.push(
      emptyState({
        iconName: 'soup',
        heading: 'No saved meals yet',
        message: 'Build the meals you eat most, then plan your days with them.',
        action: { label: 'Build a meal', onClick: () => choose({ buildMeal: true }) },
      }),
    );
  }

  sheet = openSheet({ title: slot.name, content });
  await sheet.closed;
  return result;
}

// store: the app's store; the slots, template and meals live in the core doc.
export function render(container, { store }) {
  // Built into its own element, so a load that finishes after leaving the screen changes nothing.
  const screen = document.createElement('div');
  screen.className = 'plan';
  container.replaceChildren(screen);

  const error = formError();
  let doc;
  let getFood;
  let targets;
  let writes = Promise.resolve();
  // By slot id, so focus can go back to a slot's row after the list is rebuilt.
  let rows = new Map();
  // The card stays in place, so its rings move; the slot list is rebuilt.
  const totals = totalsCard();
  let list = rowList([]);

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

  // A planned meal shows like a saved meal, under its slot's name. A flex slot is the dashed
  // empty slot (DESIGN §8), showing its pinned budget if it has one.
  function slotRow(slot) {
    const onClick = () => choose(slot);
    const item = slot.meal
      ? listRow({
          emoji: slot.meal.emoji,
          eyebrow: slot.name,
          title: slot.meal.name,
          numbers: mealTotals(slot.meal, getFood),
          trailing: rowActionIcon('chevron-right', 'Change meal'),
          onClick,
        })
      : listRow({
          placeholderIcon: 'plus',
          eyebrow: `${slot.name} · Flex`,
          title: budgetOf(slot) ? 'Budget' : 'Add a meal',
          numbers: budgetOf(slot) ?? undefined,
          onClick,
        });
    rows.set(slot.id, item.firstElementChild);
    return item;
  }

  function budgetOf(slot) {
    return doc.template?.[slot.id]?.budget ?? null;
  }

  // Redrawn on every change, so the totals follow a slot's new meal or budget straight away. The
  // template's total is a day with nothing changed or added: its meals and pinned budgets.
  function show() {
    rows = new Map();
    const plans = daySlots(doc, emptyDay());
    totals.show(dayTotal(emptyDay(), plans, getFood), targets, plans.some((plan) => !plan.meal));
    const next = rowList(templateSlots(doc).map(slotRow));
    list.replaceWith(next);
    list = next;
  }

  // Shown straight away, then saved. Focus goes back to the slot's new row.
  async function choose(slot) {
    const result = await slotMealSheet({ slot, budget: budgetOf(slot), meals: doc.meals ?? [], getFood });
    if (!result) return;
    if (result.buildMeal) {
      const meal = await newMealSheet({ store });
      if (meal) location.hash = hashFor(mealRoute(meal.id));
      return;
    }
    let change = (d) => setSlotMeal(d, slot.id, result.mealId);
    if (result.pinBudget) {
      const pinned = await budgetSheet({ slot, budget: budgetOf(slot) });
      if (!pinned) return;
      change = (d) => setSlotBudget(d, slot.id, pinned.budget);
    }
    doc = change(doc);
    save(change);
    show();
    rows.get(slot.id).focus();
  }

  // Meal totals need every food the meals use, bundled ones included. Targets need the latest
  // weigh-in.
  Promise.all([loadBundledFoods(), store.load(CORE_DOC_ID), createWeightLog(store).list()]).then(
    ([bundled, loaded, weighIns]) => {
      if (!screen.isConnected) return;
      doc = loaded;
      getFood = foodLookup([...(doc.foods ?? []), ...bundled]);
      targets = profileTargets(doc.profile ?? {}, currentWeight(weighIns), doc.overrides ?? {}, doc.macroSplit);
      screen.replaceChildren(totals.element, list, error.element);
      show();
    },
    (err) => {
      console.error('[macro-planner] the plan failed to load:', err);
      if (!screen.isConnected) return;
      screen.replaceChildren(note('Your plan didn’t load, because the food list didn’t. Check your connection, then reload.'));
    },
  );
}
