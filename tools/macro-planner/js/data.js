// Doc shapes, defaults, and the day and weigh-in helpers. Pure: the store is passed in,
// so this never touches window and runs in Node.

import { lastSevenDates } from './calc.js';
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

// Keeps 7 days ago and everything after it, including future days (SPEC §4.3).
// Dates compare as strings, since 'YYYY-MM-DD' sorts in date order.
export function pruneDays(daysDoc, today) {
  const oldestKept = lastSevenDates(today)[0];
  return Object.fromEntries(Object.entries(daysDoc).filter(([date]) => date >= oldestKept));
}

export function createDays(store) {
  return {
    async getDay(date) {
      assertDate(date);
      return (await store.load(DAYS_DOC_ID))[date] ?? emptyDay();
    },

    // Every save also drops days before 7 days ago, so a day older than that
    // isn't kept even when it's the one being saved.
    async saveDay(date, day, today) {
      assertDate(date);
      const daysDoc = await store.load(DAYS_DOC_ID);
      await store.save(DAYS_DOC_ID, pruneDays({ ...daysDoc, [date]: day }, today));
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
