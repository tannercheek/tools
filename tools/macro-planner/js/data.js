// Doc shapes, defaults, and the day and weigh-in helpers. Pure: the store is passed in,
// so this never touches window and runs in Node.

import { addDays, foodTotals, ingredientsTotals, lastSevenDates, roundTotals } from './calc.js';
import { mealIngredients } from './ingredients.js';
import { CORE_DOC_ID } from './store.js';

export const DAYS_DOC_ID = 'macro-planner-days';

// For custom foods, meals and quick numbers until the user picks one (SPEC §3.2, §3.3, §3.5).
export const DEFAULT_EMOJI = '🍽️';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date) {
  if (!DATE_PATTERN.test(date)) throw new RangeError(`Not a YYYY-MM-DD date: ${date}`);
}

// A Date as YYYY-MM-DD on the device's own calendar, which is what "today" means (SPEC §4.3).
export function localDate(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// --- Core doc ---

// Every field starts empty (null) and is filled in on first launch (SPEC §5).
// Weight isn't here: it always comes from the weight log (SPEC §3.1).
const EMPTY_PROFILE = Object.freeze({
  sex: null,
  age: null,
  heightCm: null,
  activity: null,
  goal: null,
  rateKgPerWeek: null,
});

const DEFAULT_SLOT_NAMES = ['Breakfast', 'Lunch', 'Dinner'];

// A fresh core doc for a first run on `today`, with an empty profile. Every slot
// starts as flex with no budget (mealId null), since there are no meals yet. Targets
// aren't stored: they depend on the latest weigh-in, so they're always worked out.
export function createCoreDoc(today) {
  assertDate(today);
  const slots = DEFAULT_SLOT_NAMES.map((name) => ({ id: crypto.randomUUID(), name }));
  return {
    schemaVersion: 1,
    startedOn: today,
    profile: { ...EMPTY_PROFILE },
    overrides: { kcal: null, protein: null, fat: null, carbs: null },
    settings: { units: 'metric' },
    slots,
    template: Object.fromEntries(slots.map(({ id }) => [id, { mealId: null, budget: null }])),
    foods: [],
    meals: [],
  };
}

// The store's current sync status, or undefined for a store without one (createLocalStore).
function currentStatus(store) {
  let status;
  store.onStatus?.((next) => (status = next))();
  return status;
}

// The core doc, or on a first run a new one, saved straight away so startedOn
// and the slot ids stay fixed from then on. An empty doc while offline may just be
// a cloud read that failed, and saving defaults then would overwrite the real doc
// on the next successful write. So offline, the defaults are returned unsaved.
export async function loadCoreDoc(store, today) {
  const doc = await store.load(CORE_DOC_ID);
  if (doc.schemaVersion) return doc;
  const fresh = createCoreDoc(today);
  if (currentStatus(store) !== 'offline') await store.save(CORE_DOC_ID, fresh);
  return fresh;
}

// Thrown by updateCoreDoc when there's no core doc on this device to build on.
export class CoreDocUnavailableError extends Error {
  constructor() {
    super('Your foods and meals haven’t loaded on this device yet and storage can’t be reached, so nothing was saved.');
    this.name = 'CoreDocUnavailableError';
  }
}

// Saves change(doc) as the core doc and returns it; change takes the stored doc and returns
// a new one. loadCoreDoc saves a first-run doc whenever that's safe, so a missing doc means
// this device never loaded it and storage can't be reached. Saving then would replace the
// real doc on the next sync, so nothing is saved.
export async function updateCoreDoc(store, change) {
  const doc = await store.load(CORE_DOC_ID);
  if (!doc.schemaVersion) throw new CoreDocUnavailableError();
  const next = change(doc);
  await store.save(CORE_DOC_ID, next);
  return next;
}

// --- Days ---
// macro-planner-days holds days by date: { "2026-10-15": day } (SPEC §4.2).

export function emptyDay() {
  return { changes: {}, entries: [], offPlan: false, locked: false };
}

// 7 days ago: the oldest day kept (SPEC §4.3), and the furthest back Today goes (SPEC §3.6).
export function oldestKeptDate(today) {
  return lastSevenDates(today)[0];
}

// Keeps 7 days ago and everything after it, including future days (SPEC §4.3).
// Dates compare as strings, since 'YYYY-MM-DD' sorts in date order.
export function pruneDays(daysDoc, today) {
  const oldestKept = oldestKeptDate(today);
  return Object.fromEntries(Object.entries(daysDoc).filter(([date]) => date >= oldestKept));
}

// --- Entries (SPEC §3.5) ---
// An entry is a snapshot: it keeps its own label, emoji and numbers, and its slot's name, so
// editing or deleting a food, a meal or a slot later never changes it. slot: { id, name }, or OTHER.

// Other, for what's eaten outside the slots: passed to the entry helpers in place of a slot, so its
// entries have no slot id. It's never part of the plan.
export const OTHER = Object.freeze({ id: null, name: 'Other' });

export function createEntry(slot, { label, emoji, source }, { kcal, protein, fat, carbs }) {
  return { id: crypto.randomUUID(), slotId: slot.id, slotName: slot.name, label, emoji, kcal, protein, fat, carbs, source };
}

// A saved meal, at one portion, with its ingredients (SPEC §3.5), so it can be changed for the day
// like a planned meal. Its numbers are their total. getFood: saved-meals.js's foodLookup over
// every food it uses.
export function mealEntry(slot, meal, getFood) {
  const ingredients = mealIngredients(meal, getFood);
  const entry = createEntry(slot, { label: meal.name, emoji: meal.emoji, source: 'meal' }, ingredientsTotals(ingredients));
  return { ...entry, ingredients };
}

// qty is in the food's serving unit.
export function foodEntry(slot, food, qty) {
  return createEntry(slot, { label: food.name, emoji: food.emoji, source: 'food' }, foodTotals(food, qty));
}

// Quick numbers use 🍽️. With no label they take the slot's name, like a pinned budget at lock-in.
export function quickEntry(slot, numbers, label = '') {
  const name = label.trim() || slot.name;
  return createEntry(slot, { label: name, emoji: DEFAULT_EMOJI, source: 'quick' }, numbers);
}

// A Recent entry added again: its label, emoji, numbers and source, as a new entry in this slot.
// An added meal's ingredients come too, as they are, but not the list it was first added with:
// this is a new add, so the meal as added is the meal as it is now.
export function repeatEntry(slot, { label, emoji, source, kcal, protein, fat, carbs, ingredients }) {
  const entry = createEntry(slot, { label, emoji, source }, { kcal, protein, fat, carbs });
  return ingredients ? { ...entry, ingredients } : entry;
}

// The add sheet's Recent (SPEC §3.5): what was added in the 7 days before today, each as
// { entry, date }, newest first: the latest day first, and on a day the last added first. The
// plan that lock-in wrote (planned: true) isn't something added, so it's left out. Entries whose
// label and numbers match as shown are one, at its newest. Entries are snapshots, so a food, meal
// or slot that's since been edited or deleted changes nothing here.
export function recentEntries(daysDoc, today) {
  const seen = new Set();
  const recent = [];
  for (const date of lastSevenDates(today).reverse()) {
    for (const entry of [...(daysDoc[date]?.entries ?? [])].reverse()) {
      if (entry.planned) continue;
      const key = JSON.stringify([entry.label, roundTotals(entry)]);
      if (seen.has(key)) continue;
      seen.add(key);
      recent.push({ entry, date });
    }
  }
  return recent;
}

// Each returns a new day, leaving the one passed in as it was.

// Added last, so a slot lists its entries in the order they were added.
export function addEntry(day, entry) {
  return { ...day, entries: [...(day.entries ?? []), entry] };
}

// Removing is how a locked day is corrected (SPEC §3.5).
export function removeEntry(day, entryId) {
  return { ...day, entries: (day.entries ?? []).filter((entry) => entry.id !== entryId) };
}

// edit takes the entry and returns the changed one. An entry that isn't in the day, say one removed
// on another device, leaves it as it was.
function withEntry(day, entryId, edit) {
  return { ...day, entries: (day.entries ?? []).map((entry) => (entry.id === entryId ? edit(entry) : entry)) };
}

// An added meal changed for the day (SPEC §3.5): items, ingredients.js's list, become its
// ingredients and its numbers their total. The list as added is kept the first time, as
// originalIngredients, for reset. Only a meal added with its ingredients has a list to change, and
// it keeps at least one: removing the entry is for eating none of it.
export function setEntryIngredients(day, entryId, items) {
  if (!items?.length) throw new RangeError('A meal keeps at least one ingredient');
  return withEntry(day, entryId, (entry) => {
    if (!entry.ingredients) throw new RangeError(`No ingredients to change: ${entry.label}`);
    const originalIngredients = entry.originalIngredients ?? entry.ingredients;
    return { ...entry, ...ingredientsTotals(items), ingredients: items, originalIngredients };
  });
}

// Reset to original meal, for an added meal: the ingredients and numbers as added. The kept list
// goes with it, so an entry counts as edited only while it has one.
export function resetEntryIngredients(day, entryId) {
  return withEntry(day, entryId, ({ originalIngredients, ...entry }) =>
    originalIngredients ? { ...entry, ...ingredientsTotals(originalIngredients), ingredients: originalIngredients } : entry,
  );
}

// --- Off plan (SPEC §3.4) ---
// Stored per day as offPlan: true. A day's changes and entries are kept, so going back on plan
// brings its changes back and its entries stay.

// The furthest ahead an off-plan stretch can end: 30 days after today.
export function lastOffPlanDate(today) {
  return addDays(today, 30);
}

// The days doc with every date from `from` to `until` off plan. from is today or later, and until
// is from or later, up to lastOffPlanDate.
export function setOffPlan(daysDoc, from, until, today) {
  for (const date of [from, until, today]) assertDate(date);
  if (from < today || until < from || until > lastOffPlanDate(today)) {
    throw new RangeError(`Not an off-plan range from ${today}: ${from} to ${until}`);
  }
  const next = { ...daysDoc };
  for (let date = from; date <= until; date = addDays(date, 1)) {
    next[date] = { ...(next[date] ?? emptyDay()), offPlan: true };
  }
  return next;
}

// Back on plan: clears off plan from today on. An earlier day stays off plan, since it's passed.
// With nothing to clear, the same doc comes back.
export function backOnPlan(daysDoc, today) {
  assertDate(today);
  const dates = Object.keys(daysDoc).filter((date) => date >= today && daysDoc[date].offPlan);
  if (dates.length === 0) return daysDoc;
  const next = { ...daysDoc };
  for (const date of dates) next[date] = { ...daysDoc[date], offPlan: false };
  return next;
}

// The last day of the off-plan stretch that `date` is in, for "Off plan until …", or null when
// `date` isn't off plan.
export function offPlanUntil(daysDoc, date) {
  assertDate(date);
  if (!daysDoc[date]?.offPlan) return null;
  let until = date;
  while (daysDoc[addDays(until, 1)]?.offPlan) until = addDays(until, 1);
  return until;
}

// Thrown by the days' writes when a write could wipe the real days doc.
export class DaysUnavailableError extends Error {
  constructor() {
    super('Your days haven’t loaded on this device yet and storage can’t be reached, so nothing was saved.');
    this.name = 'DaysUnavailableError';
  }
}

export function createDays(store) {
  // An empty days doc that wasn't read from the cloud may just be a read that failed, and building
  // a write on it would replace every other day on the next sync, like the weight log
  // (WeightLogUnavailableError). stored: the days doc the write builds on.
  async function save(stored, next, today) {
    if (Object.keys(stored).length === 0 && !(await store.loaded(DAYS_DOC_ID))) throw new DaysUnavailableError();
    await store.save(DAYS_DOC_ID, pruneDays(next, today));
  }

  async function update(change, today) {
    const daysDoc = await store.load(DAYS_DOC_ID);
    const next = change(daysDoc);
    if (next !== daysDoc) await save(daysDoc, next, today);
  }

  return {
    async getDay(date) {
      assertDate(date);
      return (await store.load(DAYS_DOC_ID))[date] ?? emptyDay();
    },

    // Every save also drops days before 7 days ago, so a day older than that
    // isn't kept even when it's the one being saved. Rejects with DaysUnavailableError without saving.
    async saveDay(date, day, today) {
      assertDate(date);
      const daysDoc = await store.load(DAYS_DOC_ID);
      await save(daysDoc, { ...daysDoc, [date]: day }, today);
    },

    // change takes the stored days doc and returns a new one, or the same one to save nothing.
    // For lock-in, which writes several days in one save. Rejects like saveDay.
    updateDays: update,

    // recentEntries over the stored days.
    async recent(today) {
      return recentEntries(await store.load(DAYS_DOC_ID), today);
    },

    // setOffPlan in the store. Resolves to the last day of the off-plan stretch from `from`,
    // which runs past `until` when the day after was already off plan. Rejects like saveDay.
    async setOffPlan(from, until, today) {
      let stretchEnd;
      await update((daysDoc) => {
        const next = setOffPlan(daysDoc, from, until, today);
        stretchEnd = offPlanUntil(next, from);
        return next;
      }, today);
      return stretchEnd;
    },

    // backOnPlan in the store, saving nothing when there's nothing to clear. Rejects like saveDay.
    async backOnPlan(today) {
      await update((daysDoc) => backOnPlan(daysDoc, today), today);
    },

    // offPlanUntil over the stored days.
    async offPlanUntil(date) {
      return offPlanUntil(await store.load(DAYS_DOC_ID), date);
    },
  };
}

// --- Weight log ---
// macro-planner-weight holds { weighIns: [{ date, kg }] }, oldest first (SPEC §4.2).
// Nothing prunes it: weigh-ins are only ever deleted by the user (SPEC §3.1).

export const WEIGHT_DOC_ID = 'macro-planner-weight';

function assertWeighIn({ date, kg }) {
  assertDate(date);
  if (!Number.isFinite(kg) || kg <= 0) throw new RangeError(`Not a weight in kg: ${kg}`);
}

function byDate(a, b) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

// One weigh-in per date, so adding one for a date that has one replaces it.
// Returns a new list, oldest first.
export function addWeighIn(weighIns, { date, kg }) {
  assertWeighIn({ date, kg });
  return [...weighIns.filter((w) => w.date !== date), { date, kg }].sort(byDate);
}

export function removeWeighIn(weighIns, date) {
  assertDate(date);
  return weighIns.filter((w) => w.date !== date);
}

// A weigh-in's date as typed into Stats' sheet: today or an earlier day, never ahead, since the
// latest weigh-in is the profile's weight (SPEC §3.1). null unless it's a YYYY-MM-DD date up to today.
export function readWeighInDate(text, today) {
  assertDate(today);
  return DATE_PATTERN.test(text ?? '') && text <= today ? text : null;
}

// The weight trend's window: today and the 83 days before it (SPEC §3.7).
export const TREND_WINDOW_DAYS = 84;

// The weigh-ins Stats lists, newest first: those in the trend's window, and the latest even when
// it's older, since it's still the profile's weight and should be there to see and delete.
// weighIns: oldest first.
export function listedWeighIns(weighIns, today) {
  const oldest = addDays(today, 1 - TREND_WINDOW_DAYS);
  return weighIns.filter((w, i) => w.date >= oldest || i === weighIns.length - 1).reverse();
}

// The profile's weight: the latest weigh-in by date, or null before the first one (SPEC §3.1).
export function currentWeight(weighIns) {
  const latest = weighIns.reduce((found, w) => (!found || w.date > found.date ? w : found), null);
  return latest ? latest.kg : null;
}

// Thrown by the weight log's add and remove when a write could wipe the real log.
export class WeightLogUnavailableError extends Error {
  constructor() {
    super('The weight log hasn’t loaded on this device yet and storage can’t be reached, so nothing was saved.');
    this.name = 'WeightLogUnavailableError';
  }
}

export function createWeightLog(store) {
  // Sorted on read too, since an imported doc (step 6.2) may not be in order.
  function sorted(doc) {
    return [...(doc.weighIns ?? [])].sort(byDate);
  }

  async function load() {
    return sorted(await store.load(WEIGHT_DOC_ID));
  }

  // A log this device has never loaded reads as empty when the cloud can't be reached,
  // and saving then would replace the real log with this one change on the next sync.
  // A doc with weighIns, even [], has been loaded or saved here, so it's safe to build on.
  // Checks the weight doc's own read, not the store's status, which another doc's
  // write can leave at 'saved-locally' or 'synced' while this read failed.
  async function loadForWrite() {
    const doc = await store.load(WEIGHT_DOC_ID);
    if (!doc.weighIns && !(await store.loaded(WEIGHT_DOC_ID))) throw new WeightLogUnavailableError();
    return sorted(doc);
  }

  async function save(weighIns) {
    await store.save(WEIGHT_DOC_ID, { weighIns });
    return weighIns;
  }

  return {
    // Oldest first.
    list: load,

    // Both return the updated list, oldest first, or reject with
    // WeightLogUnavailableError without saving.
    async add(weighIn) {
      return save(addWeighIn(await loadForWrite(), weighIn));
    },

    async remove(date) {
      return save(removeWeighIn(await loadForWrite(), date));
    },

    async currentWeight() {
      return currentWeight(await load());
    },
  };
}
