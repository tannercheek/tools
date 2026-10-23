// Lock-in (SPEC §3.5): once a day has passed, its plan is written into its entries as snapshots
// and the day is locked, so editing a food, a meal or the template later never changes it.
// No DOM: the store and foods are passed in, so this runs in Node.

import { lastSevenDates, slotTotals } from './calc.js';
import { createDays, createEntry, emptyDay, quickEntry } from './data.js';
import { foodLookup } from './saved-meals.js';
import { daySlots } from './slots.js';
import { CORE_DOC_ID } from './store.js';

// What a slot locks in as: its meal after swaps and portions, as a meal entry, or an open flex
// slot's pinned budget, as quick numbers under the slot's name. null when it adds nothing of its
// own: skipped, open with no budget, or a flex slot something was added to.
function plannedEntry(plan, getFood) {
  if (plan.meal) {
    if (plan.skipped) return null;
    const { name, emoji } = plan.meal;
    return createEntry(plan, { label: name, emoji, source: 'meal' }, slotTotals(plan, getFood));
  }
  if (!plan.budget || plan.entries.length > 0) return null;
  return quickEntry(plan, plan.budget);
}

// What a slot writes into the locked day. The plan is marked planned: true, so the add sheet's
// Recent can leave it out. A food or quick numbers swapped in is written as it is, unmarked: it
// was chosen, not planned, so Recent lists it like anything added.
function lockedEntry(plan, getFood) {
  if (plan.swapEntry) return plan.swapEntry;
  const planned = plannedEntry(plan, getFood);
  return planned && { ...planned, planned: true };
}

// The day with its plan written into its entries and locked: { slots, template } is the core
// doc's (the doc itself will do), meals its saved meals, and foods every food they use, bundled,
// custom and archived. The slots' entries come first in slot order, then what was added. An
// off-plan day has no plan, so it keeps its entries as they are. Changes are dropped, since a
// locked day is its entries alone. A day already locked comes back as it was.
export function lockDay(day, { slots, template }, meals, foods) {
  if (day.locked) return day;
  const getFood = foodLookup(foods);
  const fromSlots = day.offPlan
    ? []
    : daySlots({ slots, template, meals }, day)
        .map((plan) => lockedEntry(plan, getFood))
        .filter(Boolean);
  return { ...day, changes: {}, entries: [...fromSlots, ...(day.entries ?? [])], locked: true };
}

// The days doc with every past day in the window (SPEC §4.3) locked, from the core doc's
// startedOn on. A day with no record was never opened and counts as on plan; days before
// startedOn don't count, so they're left alone. With nothing to lock, the same doc comes back.
export function lockPastDays(daysDoc, today, doc, foods) {
  const dates = lastSevenDates(today).filter((date) => date >= doc.startedOn && !daysDoc[date]?.locked);
  if (dates.length === 0) return daysDoc;
  const next = { ...daysDoc };
  for (const date of dates) next[date] = lockDay(daysDoc[date] ?? emptyDay(), doc, doc.meals ?? [], foods);
  return next;
}

// Locks every past day in the store, in one save, or saves nothing when there's nothing to lock.
// Rejects with data.js's DaysUnavailableError without saving when the days doc can't be trusted.
export async function lockInPastDays(store, today, bundledFoods) {
  const doc = await store.load(CORE_DOC_ID);
  const foods = [...(doc.foods ?? []), ...bundledFoods];
  await createDays(store).updateDays((daysDoc) => lockPastDays(daysDoc, today, doc, foods), today);
}

// Lock-in at most once per date: call it with today's date on app load and whenever the date may
// have changed. Runs one at a time. It resolves once every day before `today` is locked; a failure
// rejects, and the next call tries again. loadBundledFoods: bundled-foods.js's loader.
export function createLockIn(store, loadBundledFoods) {
  let lockedFor = null;
  let queue = Promise.resolve();
  return function lockIn(today) {
    const run = queue.then(async () => {
      if (lockedFor === today) return;
      await lockInPastDays(store, today, await loadBundledFoods());
      lockedFor = today;
    });
    queue = run.catch(() => {});
    return run;
  };
}
