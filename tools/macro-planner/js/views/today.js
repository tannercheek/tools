// Today (SPEC §3.6): the four rings showing where the day will land, the quick actions, then the
// day's slots, for today or any day from 7 days ago on. Today and later days take changes:
// tapping a planned slot opens its actions, an open flex slot's Log adds to it, and tapping a
// filled flex slot lists what's in it. Other, after the slots, holds what's eaten outside them
// (SPEC §3.5). A locked past day lists its entries instead, each with remove, plus Add. An
// off-plan day has every slot as flex, under a line with "Back on plan" (SPEC §3.4).

import { loadBundledFoods } from '../bundled-foods.js';
import { addDays, dayTotal, flexGap, profileTargets } from '../calc.js';
import {
  CoreDocUnavailableError,
  DaysUnavailableError,
  OTHER,
  addEntry,
  createDays,
  createWeightLog,
  currentWeight,
  lastOffPlanDate,
  localDate,
  oldestKeptDate,
  removeEntry,
  resetEntryIngredients,
  setEntryIngredients,
  updateCoreDoc,
} from '../data.js';
import { slotIngredients } from '../ingredients.js';
import { rings } from '../rings.js';
import { hashFor } from '../routes.js';
import { foodLookup } from '../saved-meals.js';
import {
  clearSlotChange,
  daySlots,
  otherEntries,
  resetSlotIngredients,
  setSlotIngredients,
  setSlotMeal,
  setSlotPortion,
  skipSlot,
  swapSlot,
  swapSlotToEntry,
} from '../slots.js';
import { CORE_DOC_ID } from '../store.js';
import { iconButton, secondaryButton } from '../ui/buttons.js';
import { emptyState } from '../ui/empty-state.js';
import { formError } from '../ui/inputs.js';
import { hopTile, listRow, rowList } from '../ui/row.js';
import { confirmSheet } from '../ui/sheet.js';
import { addEntrySheet } from './add-entry-sheet.js';
import { chooseSlotSheet } from './choose-slot-sheet.js';
import { ingredientsSheet } from './ingredients-sheet.js';
import { offPlanLine, offPlanSheet } from './off-plan.js';
import { quickActions } from './quick-actions.js';
import { filledFlexSheet, otherSheet, slotActionsSheet } from './slot-actions-sheet.js';
import { swapSheet } from './swap-sheet.js';
import { filledFlexRow, openFlexRow, otherRow, plannedRow } from './today-rows.js';
import { logWeighInSheet } from './weigh-ins.js';

function note(text) {
  const element = document.createElement('p');
  element.className = 'today__note';
  element.textContent = text;
  return element;
}

// A locked day's entries in slot order, by today's slots: one whose slot is gone after them, and
// Other's last (SPEC §3.6). Each shows under the slot name it saved (SPEC §3.5), Other's under
// "Other".
function inSlotOrder(entries, slots) {
  const order = new Map(slots.map((slot, i) => [slot.id, i]));
  const rank = (entry) => {
    if (entry.slotId === OTHER.id) return slots.length + 1;
    return order.get(entry.slotId) ?? slots.length;
  };
  return [...entries].sort((a, b) => rank(a) - rank(b));
}

// Nothing planned: no slot has a meal or a pinned budget, and nothing's been added.
function nothingPlanned(plans, day) {
  return plans.every((plan) => !plan.meal && !plan.budget) && (day.entries ?? []).length === 0;
}

// store: the app's store. dateSwitcher: the header's previous / date / next (js/shell.js).
// lockIn: lock-in.js's createLockIn, run before a day is read so a past day is already locked.
export function render(container, { store, dateSwitcher, lockIn }) {
  // Built into its own element, so a load that finishes after leaving the screen changes nothing.
  const screen = document.createElement('div');
  screen.className = 'today';
  container.replaceChildren(screen);

  const days = createDays(store);
  const weightLog = createWeightLog(store);
  const today = () => localDate(new Date());
  const error = formError();
  let date = today();
  let day;
  // The last day of the off-plan stretch this day is in, or null when it isn't off plan.
  let offPlanEnd = null;
  let doc;
  let foods;
  let getFood;
  // The weight log, oldest first. Its latest weigh-in is the profile's weight, so it sets the
  // targets (SPEC §3.1).
  let weighIns;
  let targets;
  let dayRings;
  let writes = Promise.resolve();
  // A slot's row and its button (the row itself, or an open flex slot's Log) by slot id, and a
  // locked day's remove buttons in order, so focus can go back to the same place after the list
  // is rebuilt. A locked day's rows by entry id, so a new one can hop.
  let slotRows = new Map();
  let slotButtons = new Map();
  let removeButtons = [];
  let entryRowsById = new Map();
  // A locked day's Add (SPEC §3.6), kept across rebuilds so focus can go back to it.
  const addToDay = secondaryButton('Add', { block: true, onClick: () => addToChosenSlot(addToDay) });
  // "Back on plan" (SPEC §3.4), kept across rebuilds so focus can move to it from Off plan.
  const backOnPlanButton = secondaryButton('Back on plan', { onClick: () => backOnPlan() });
  // Between the rings and the slots, built once like the rings, so a rebuilt slot list leaves
  // focus on them.
  const actions = quickActions({
    onAddFood: () => addToChosenSlot(actions.addFood, 'food'),
    onQuickNumbers: () => addToChosenSlot(actions.quickNumbers, 'quick'),
    onWeighIn: () => weighIn(),
    onOffPlan: () => goOffPlan(),
  });
  // The rings stay in place across dates, so their arcs move to the new day's totals.
  const slotsArea = document.createElement('div');
  slotsArea.className = 'today__slots';
  // Counts day loads, so one that finishes after the date has moved on again is dropped.
  let latestLoad = 0;

  function showDate() {
    dateSwitcher.show({ date, isToday: date === today(), canGoBack: date > oldestKeptDate(today()) });
  }

  // One write at a time, in order. A failure says so on the screen.
  function queueWrite(what, write) {
    writes = writes.then(async () => {
      error.show(null);
      try {
        await write();
      } catch (err) {
        console.error(`[macro-planner] saving ${what} failed:`, err);
        const unavailable = err instanceof DaysUnavailableError || err instanceof CoreDocUnavailableError;
        error.show(unavailable ? err.message : 'That didn’t save. Try again.');
        error.element.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // Shown straight away, then saved. change takes a day and returns the changed one, and is
  // applied to what's stored, so it builds on any other change.
  function change(edit) {
    const savedDate = date;
    day = edit(day);
    show();
    queueWrite('the day', async () => days.saveDay(savedDate, edit(await days.getDay(savedDate)), today()));
  }

  // Like change, for the core doc: edit takes the doc and returns the changed one.
  function changeDoc(edit) {
    doc = edit(doc);
    queueWrite('the plan', () => updateCoreDoc(store, edit));
  }

  // For this day only, unless made the default: then the template plans the meal on every day
  // not yet locked, this one included, which then needs no swap of its own (SPEC §3.4). A food or
  // quick numbers is for the day only, kept in the slot's change (SPEC §3.5).
  async function swap(plan) {
    const picked = await swapSheet({ plan, meals: doc.meals ?? [], foods, getFood, store });
    if (!picked) return;
    if (picked.entry) {
      change((d) => swapSlotToEntry(d, plan.id, picked.entry));
      return;
    }
    const { mealId, makeDefault } = picked;
    if (makeDefault) changeDoc((d) => setSlotMeal(d, plan.id, mealId));
    const planned = doc.template?.[plan.id]?.mealId;
    change((d) => swapSlot(d, plan.id, mealId, planned));
  }

  // The day's own version of the slot's meal (SPEC §3.5), opened from the slot as it is now, so a
  // portion just picked in its actions sheet is folded into the amounts. Each change saves
  // straight away, so the rings move behind the sheet. Reset applies as it closes, like As planned.
  async function editIngredients(slotId) {
    const plan = daySlots(doc, day).find(({ id }) => id === slotId);
    const mealId = plan.meal.id;
    const picked = await ingredientsSheet({
      name: plan.meal.name,
      items: slotIngredients(plan, getFood),
      edited: plan.edited,
      foods,
      store,
      onChange: (items) => change((d) => setSlotIngredients(d, slotId, mealId, items)),
    });
    if (picked?.action === 'reset') change((d) => resetSlotIngredients(d, slotId));
  }

  // A meal added to a slot, changed for the day in the same sheet (SPEC §3.5), which ends in
  // Remove from slot. Reset goes back to the meal as it was added.
  async function editEntryIngredients(entryId) {
    const entry = (day.entries ?? []).find(({ id }) => id === entryId);
    if (!entry) return;
    const picked = await ingredientsSheet({
      name: entry.label,
      items: entry.ingredients,
      edited: Boolean(entry.originalIngredients),
      foods,
      store,
      onChange: (items) => change((d) => setEntryIngredients(d, entryId, items)),
      removable: true,
    });
    if (picked?.action === 'reset') change((d) => resetEntryIngredients(d, entryId));
    if (picked?.action === 'remove') await remove(entry);
  }

  // Shown in the slot straight away, with a hop of its tile (DESIGN §14), then saved; on a locked
  // day, the new entry's own row hops. slot: { id, name }, or OTHER. kind: the add sheet's segment
  // to open on, if not its usual one. Recent is read once this screen's own writes are in, so it
  // has them.
  async function add(slot, kind) {
    await writes;
    const recent = await days.recent(today());
    const entry = await addEntrySheet({ slot, meals: doc.meals ?? [], foods, getFood, store, recent, today: today(), kind });
    if (!entry) return;
    change((d) => addEntry(d, entry));
    hopTile(day.locked ? entryRowsById.get(entry.id) : slotRows.get(slot.id));
  }

  // Asks for the slot, or Other, first: a locked day lists entries, not slots, and Add food and
  // Quick numbers aren't in a slot. Focus goes back to the button that asked.
  async function addToChosenSlot(button, kind) {
    const slot = await chooseSlotSheet({ slots: doc.slots ?? [] });
    if (slot) await add(slot, kind);
    button.focus();
  }

  function updateTargets() {
    targets = profileTargets(doc.profile ?? {}, currentWeight(weighIns), doc.overrides ?? {});
  }

  // The new weigh-in can move the targets, so the rings and open flex slots move with them.
  async function weighIn() {
    const saved = await logWeighInSheet({ weightLog, weighIns, units: doc.settings?.units ?? 'metric' });
    if (!saved || !screen.isConnected) return;
    weighIns = saved;
    updateTargets();
    show();
  }

  // Asks first: removing takes the entry out of the day for good (CLAUDE.md, storage). Resolves
  // once it's removed or kept.
  async function remove(entry) {
    const confirmed = await confirmSheet({
      title: `Remove ${entry.label}?`,
      message: 'It won’t count toward this day any more.',
      confirmLabel: 'Remove entry',
    });
    if (confirmed) change((d) => removeEntry(d, entry.id));
  }

  // What a slot's sheet picked: slot-actions-sheet.js's { action, entry }. plan: the slot, or
  // OTHER. Focus goes back to the slot: its row, or the Log button of a flex slot that's open
  // again. Other's row goes once it's empty, so focus goes to the last slot's, where it was.
  async function act(plan, picked) {
    const { action, entry } = picked ?? {};
    if (action === 'swap') await swap(plan);
    if (action === 'skip') change((d) => skipSlot(d, plan.id));
    if (action === 'ingredients') await editIngredients(plan.id);
    if (action === 'as-planned') change((d) => clearSlotChange(d, plan.id));
    if (action === 'add') await add(plan);
    if (action === 'entry-ingredients') await editEntryIngredients(entry.id);
    if (action === 'remove') await remove(entry);
    (slotButtons.get(plan.id) ?? [...slotButtons.values()].at(-1))?.focus();
  }

  async function openActions(plan) {
    const picked = await slotActionsSheet({
      plan,
      onPortion: (portion) => change((d) => setSlotPortion(d, plan.id, portion)),
    });
    await act(plan, picked);
  }

  async function openFilled(plan) {
    await act(plan, await filledFlexSheet({ plan }));
  }

  // Other's sheet acts like a filled flex slot's, with OTHER as its slot, so Add to Other adds
  // outside the slots.
  async function openOther(entries) {
    await act(OTHER, await otherSheet({ entries }));
  }

  // This day up to the one picked. Shown straight away, then saved. The stretch runs on past the
  // day picked when the day after was already off plan, so the line shows where it really ends.
  async function goOffPlan() {
    const from = date;
    const until = await offPlanSheet({ from, today: today() });
    if (!until || date !== from) return;
    day = { ...day, offPlan: true };
    offPlanEnd = until;
    show();
    backOnPlanButton.focus();
    queueWrite('off plan', async () => {
      const stretchEnd = await days.setOffPlan(from, until, today());
      if (date !== from || stretchEnd === offPlanEnd) return;
      const refocus = document.activeElement === backOnPlanButton;
      offPlanEnd = stretchEnd;
      show();
      if (refocus) backOnPlanButton.focus();
    });
  }

  // Clears off plan from today on, this day included; an earlier day stays off plan (SPEC §3.4).
  // Focus goes to Off plan, which takes it back.
  function backOnPlan() {
    const now = today();
    day = { ...day, offPlan: false };
    offPlanEnd = null;
    show();
    (actions.offPlan.disabled ? slotsArea.querySelector('button') : actions.offPlan)?.focus();
    queueWrite('back on plan', () => days.backOnPlan(now));
  }

  // On a locked day, focus goes to the remove button now in the same place, or to Add once none
  // are left.
  async function removeLocked(entry, index) {
    await remove(entry);
    (removeButtons[Math.min(index, removeButtons.length - 1)] ?? addToDay).focus();
  }

  function entryRows() {
    return inSlotOrder(day.entries, doc.slots ?? []).map((entry, i) => {
      const button = iconButton('x', `Remove ${entry.label}, ${entry.slotName}`, { onClick: () => removeLocked(entry, i) });
      removeButtons.push(button);
      const row = listRow({ emoji: entry.emoji, eyebrow: entry.slotName, title: entry.label, numbers: entry, trailing: button });
      entryRowsById.set(entry.id, row);
      return row;
    });
  }

  // Other's row after the slots, once it holds something (SPEC §3.6): what was added outside the
  // slots, and anything whose slot has since been removed. Kept under Other's id like a slot's
  // row, so the hop and focus find it.
  function otherRows(plans, takesChanges) {
    const entries = otherEntries(day, plans);
    if (entries.length === 0) return [];
    const onClick = takesChanges ? () => openOther(entries) : undefined;
    const item = otherRow(entries, onClick);
    slotRows.set(OTHER.id, item);
    if (onClick) slotButtons.set(OTHER.id, item.firstElementChild);
    return [item];
  }

  function slotList(plans) {
    // Only today and later take changes: a past day is locked, or from before the app was used.
    const takesChanges = !day.locked && date >= today();
    const rows = plans.map((plan) => {
      let item;
      let button;
      if (plan.meal || plan.entries.length > 0) {
        const open = plan.meal ? openActions : openFilled;
        const onClick = takesChanges ? () => open(plan) : undefined;
        // A slot swapped to a food or quick numbers shows like a filled flex slot (DESIGN §8).
        item = plan.meal && !plan.swapEntry ? plannedRow(plan, getFood, onClick) : filledFlexRow(plan, onClick);
        if (onClick) button = item.firstElementChild;
      } else {
        const gap = takesChanges ? flexGap(targets, day, plans, plan.id, getFood) : null;
        if (takesChanges) {
          button = secondaryButton('Log', { onClick: () => add(plan).then(() => slotButtons.get(plan.id)?.focus()) });
          button.setAttribute('aria-label', `Log to ${plan.name}`);
        }
        item = openFlexRow(plan, gap, button);
      }
      slotRows.set(plan.id, item);
      if (button) slotButtons.set(plan.id, button);
      return item;
    });
    return [...rows, ...otherRows(plans, takesChanges)];
  }

  function show() {
    const plans = daySlots(doc, day);
    const totals = dayTotal(day, plans, getFood);
    if (dayRings) {
      dayRings.show({ totals, targets });
    } else {
      dayRings = rings({ totals, targets });
      screen.replaceChildren(dayRings.element, actions.element, slotsArea, error.element);
    }
    // Only a locked day, or today and later, take entries (SPEC §3.6). Off plan can start on any
    // day from today up to 30 days ahead that isn't already off plan (SPEC §3.4).
    const now = today();
    actions.show({
      canAdd: day.locked || date >= now,
      canGoOffPlan: date >= now && date <= lastOffPlanDate(now) && !day.offPlan,
    });

    slotRows = new Map();
    slotButtons = new Map();
    removeButtons = [];
    entryRowsById = new Map();
    if (day.locked) {
      const entries = day.entries.length > 0 ? rowList(entryRows()) : note('Nothing counts on this day.');
      slotsArea.replaceChildren(entries, addToDay);
    } else if (day.offPlan && date >= today()) {
      const line = offPlanLine({ until: offPlanEnd ?? date, today: today(), backOnPlan: backOnPlanButton });
      slotsArea.replaceChildren(line, rowList(slotList(plans)));
    } else if (nothingPlanned(plans, day)) {
      slotsArea.replaceChildren(
        emptyState({
          iconName: 'calendar',
          heading: 'No meals planned',
          message: 'Pick a meal for your slots on Plan, and every day starts from it.',
          action: { label: 'Plan today', onClick: () => (location.hash = hashFor('plan')) },
        }),
      );
    } else {
      slotsArea.replaceChildren(rowList(slotList(plans)));
    }
  }

  // Locks in first, in case the date has changed since the app opened (SPEC §3.5), and waits for
  // this screen's own writes, so the day read back has them.
  async function showDay() {
    const load = ++latestLoad;
    await lockIn(today()).catch((err) => console.error('[macro-planner] lock-in failed:', err));
    await writes;
    const [loaded, until] = await Promise.all([days.getDay(date), days.offPlanUntil(date)]);
    if (load !== latestLoad || !screen.isConnected) return;
    day = loaded;
    offPlanEnd = until;
    show();
  }

  // Back no further than 7 days ago (SPEC §3.6), which moves on if the app stays open past midnight.
  function go(next) {
    const oldest = oldestKeptDate(today());
    date = next < oldest ? oldest : next;
    showDate();
    if (doc) showDay();
  }

  dateSwitcher.connect({
    onPrevious: () => go(addDays(date, -1)),
    onNext: () => go(addDays(date, 1)),
    onToday: () => go(today()),
  });
  showDate();

  // Meal totals and the add sheet's search need every food, bundled ones included. Targets need
  // the latest weigh-in.
  Promise.all([loadBundledFoods(), store.load(CORE_DOC_ID), weightLog.list()]).then(
    ([bundled, loaded, log]) => {
      if (!screen.isConnected) return;
      doc = loaded;
      foods = [...(doc.foods ?? []), ...bundled];
      getFood = foodLookup(foods);
      weighIns = log;
      updateTargets();
      showDay();
    },
    (err) => {
      console.error('[macro-planner] today failed to load:', err);
      if (!screen.isConnected) return;
      screen.replaceChildren(note('Today didn’t load. Check your connection, then reload.'));
    },
  );
}
