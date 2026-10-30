import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, continueStreak, currentStreak, dayMark, lastSevenDayMarks, onTarget, profileTargets } from '../js/calc.js';
import {
  DAYS_DOC_ID,
  WEIGHT_DOC_ID,
  addEntry,
  createCoreDoc,
  createDays,
  emptyDay,
  foldPrunedDays,
  removeEntry,
  targetsOn,
} from '../js/data.js';
import { lockInPastDays, lockPastDays } from '../js/lock-in.js';
import { CORE_DOC_ID, createLocalStore } from '../js/store.js';
import { createFakeStorage } from './fake-storage.js';

const TODAY = '2026-10-16';
// What the functions read from calc.js's targets(): only kcal counts here.
const TARGETS = { kcal: 2500, protein: 180, fat: 70, carbs: 280 };

// A complete profile with the calorie target overridden to 2,500, so it's easy to check against.
// Started on 1 September, with every slot flex, so lock-in adds nothing to a day.
function targetDoc(kcal = 2500) {
  const doc = createCoreDoc('2026-09-01');
  return {
    ...doc,
    profile: { sex: 'male', birthDate: '1990-04-12', heightCm: 180, activity: 'moderate', goal: 'maintain', rateKgPerWeek: null },
    overrides: { ...doc.overrides, kcal },
  };
}

const WEIGH_INS = [{ date: '2026-09-01', kg: 80 }];

let entryCount = 0;
function entry(kcal) {
  entryCount += 1;
  return { id: `e${entryCount}`, slotId: 's1', slotName: 'Dinner', label: 'Dinner', emoji: '🍽️', kcal, protein: 0, fat: 0, carbs: 0, source: 'quick' };
}

// A locked day of these entries' kcal, judged against 2,500, as lock-in leaves it.
function ate(...kcals) {
  return { ...emptyDay(), entries: kcals.map(entry), locked: true, kcalTarget: 2500 };
}

// days[0] on from, days[1] the day after, and so on.
function daysFrom(from, days) {
  return Object.fromEntries(days.map((day, i) => [addDays(from, i), day]));
}

const hits = (n) => Array.from({ length: n }, () => ate(2500));

async function storeWith(daysDoc, doc = targetDoc()) {
  const store = createLocalStore(createFakeStorage());
  await store.save(CORE_DOC_ID, doc);
  await store.save(DAYS_DOC_ID, daysDoc);
  await store.save(WEIGHT_DOC_ID, { weighIns: WEIGH_INS });
  return store;
}

// The streak as Stats would show it from what's stored.
async function storedStreak(store, today) {
  const doc = await store.load(CORE_DOC_ID);
  return currentStreak(doc.streak, await store.load(DAYS_DOC_ID), today, TARGETS);
}

// --- On target ---

test('within ±10% of the target is on target: 2,250 and 2,750 hit 2,500, and 2,240 and 2,760 miss', () => {
  assert.equal(onTarget(ate(2250), 2500), true);
  assert.equal(onTarget(ate(2750), 2500), true);
  assert.equal(onTarget(ate(2240), 2500), false);
  assert.equal(onTarget(ate(2760), 2500), false);
});

test('a day’s entries are added up, and compared as shown, in whole kcal', () => {
  assert.equal(onTarget(ate(1800, 449.6), 2500), true, '2,249.6 shows as 2,250');
  assert.equal(onTarget(ate(1800, 449.4), 2500), false, '2,249.4 shows as 2,249');
});

test('a day is judged by its own kcalTarget first, else by the current target', () => {
  assert.equal(onTarget(ate(2300), 3000), true, 'its own 2,500');
  const lockedBefore = { ...emptyDay(), entries: [entry(2300)], locked: true };
  assert.equal(onTarget(lockedBefore, 3000), false);
  assert.equal(onTarget(lockedBefore, 2500), true);
});

test('a day with no entries, or with no target to judge it by, is uncounted', () => {
  assert.equal(dayMark(ate(), 2500), 'uncounted');
  assert.equal(dayMark({}, 2500), 'uncounted');
  assert.equal(dayMark({ ...ate(2500), kcalTarget: undefined }, null), 'uncounted');
  assert.equal(dayMark(ate(2500), null), 'hit', 'its own target still counts');
  assert.equal(dayMark(ate(3000), 2500), 'miss');
});

test('the marks are the 7 days before today, oldest first; today and a day with no record don’t count', () => {
  const daysDoc = {
    ...daysFrom('2026-10-09', [ate(2500), ate(1000), ate(), ate(2400), ate(2600), ate(2500), ate(2500)]),
    [TODAY]: ate(5000),
  };
  delete daysDoc['2026-10-12'];
  assert.deepEqual(lastSevenDayMarks(daysDoc, TODAY, TARGETS), ['hit', 'miss', 'uncounted', 'uncounted', 'hit', 'hit', 'hit']);
});

// --- The day's target, kept at lock-in ---

test('lock-in keeps the day’s target, so it stays on target after the profile’s target changes', async () => {
  const store = await storeWith({ '2026-10-15': { ...emptyDay(), entries: [entry(2300)] } });
  await lockInPastDays(store, TODAY, []);
  const daysDoc = await store.load(DAYS_DOC_ID);
  assert.equal(daysDoc['2026-10-15'].kcalTarget, 2500);

  const raised = targetsOn(targetDoc(3000), WEIGH_INS, TODAY);
  assert.equal(raised.kcal, 3000);
  assert.equal(lastSevenDayMarks(daysDoc, TODAY, raised)[6], 'hit');

  const lockedBefore = { ...daysDoc['2026-10-15'], kcalTarget: undefined };
  assert.equal(dayMark(lockedBefore, raised.kcal), 'miss', 'a day locked before this step uses the current target');
});

test('lock-in works the target out on the day, from the latest weigh-in up to it', () => {
  const doc = { ...targetDoc(), overrides: { kcal: null, protein: null, fat: null, carbs: null } };
  const weighIns = [{ date: '2026-10-01', kg: 80 }, { date: '2026-10-15', kg: 90 }];
  const locked = lockPastDays({}, TODAY, doc, [], weighIns);
  const expected = (kg, date) => profileTargets(doc.profile, kg, doc.overrides, undefined, date).kcal;
  assert.equal(locked['2026-10-14'].kcalTarget, expected(80, '2026-10-14'));
  assert.equal(locked['2026-10-15'].kcalTarget, expected(90, '2026-10-15'));
  assert.notEqual(locked['2026-10-14'].kcalTarget, locked['2026-10-15'].kcalTarget);
});

test('a day locked with no targets keeps none', () => {
  const locked = lockPastDays({}, TODAY, createCoreDoc('2026-09-01'), [], WEIGH_INS);
  assert.equal(locked['2026-10-15'].locked, true);
  assert.equal('kcalTarget' in locked['2026-10-15'], false);
  assert.equal('kcalTarget' in lockPastDays({}, TODAY, targetDoc(), [])['2026-10-15'], false, 'no weigh-ins, no targets');
});

// --- Streak ---

test('the streak counts back from yesterday, and a miss starts it again', () => {
  const daysDoc = { ...daysFrom('2026-10-09', [...hits(3), ate(1000), ...hits(3)]), [TODAY]: ate(5000) };
  assert.equal(currentStreak(undefined, daysDoc, TODAY, TARGETS), 3);
  daysDoc['2026-10-15'] = ate(1000);
  assert.equal(currentStreak(undefined, daysDoc, TODAY, TARGETS), 0);
});

test('a day with no entries is uncounted, and neither breaks the streak nor adds to it', () => {
  const daysDoc = daysFrom('2026-10-09', [...hits(3), ate(), ...hits(3)]);
  assert.equal(currentStreak(undefined, daysDoc, TODAY, TARGETS), 6);
});

test('no targets give no marks and no streak', () => {
  const daysDoc = daysFrom('2026-10-09', hits(7));
  assert.equal(lastSevenDayMarks(daysDoc, TODAY, null), null);
  assert.equal(currentStreak({ count: 4, through: '2026-10-08' }, daysDoc, TODAY, null), 0);
});

test('a streak of 10 survives the pruning of its first 3, and carries on save after save', async () => {
  const store = await storeWith(daysFrom('2026-10-06', hits(10)));
  await createDays(store).saveDay(TODAY, emptyDay(), TODAY);
  assert.deepEqual((await store.load(CORE_DOC_ID)).streak, { count: 3, through: '2026-10-08' });
  assert.equal(Object.keys(await store.load(DAYS_DOC_ID)).sort()[0], '2026-10-09');
  assert.equal(await storedStreak(store, TODAY), 10);

  // The next day, 16 October was on target too, and 9 October is pruned.
  await createDays(store).saveDay(TODAY, ate(2500), '2026-10-17');
  assert.deepEqual((await store.load(CORE_DOC_ID)).streak, { count: 4, through: '2026-10-09' });
  assert.equal(await storedStreak(store, '2026-10-17'), 11);
});

test('removing an entry on a locked day breaks the streak, and adding it back restores it', async () => {
  const store = await storeWith(daysFrom('2026-10-06', [...hits(6), ate(2000, 500), ...hits(3)]));
  const days = createDays(store);
  await days.saveDay(TODAY, emptyDay(), TODAY);
  assert.equal(await storedStreak(store, TODAY), 10);

  const day = await days.getDay('2026-10-12');
  const [, side] = day.entries;
  await days.saveDay('2026-10-12', removeEntry(day, side.id), TODAY);
  assert.equal(await storedStreak(store, TODAY), 3, '2,000 kcal is a miss');

  await days.saveDay('2026-10-12', addEntry(await days.getDay('2026-10-12'), side), TODAY);
  assert.equal(await storedStreak(store, TODAY), 10);
});

test('a gap of more than 7 days with no days starts the streak again', async () => {
  // 10 days on target, then the app isn't opened from 11 October until 25 October, when lock-in
  // writes the 7 days before it.
  const store = await storeWith(daysFrom('2026-10-01', hits(10)));
  await createDays(store).updateDays((daysDoc) => ({ ...daysDoc, ...daysFrom('2026-10-18', hits(7)) }), '2026-10-25');
  assert.deepEqual((await store.load(CORE_DOC_ID)).streak, { count: 0, through: '2026-10-17' });
  assert.equal(await storedStreak(store, '2026-10-25'), 7);
});

test('taking the same days into the streak twice changes nothing, so a failed days save loses none', () => {
  const daysDoc = daysFrom('2026-10-06', hits(10));
  const once = foldPrunedDays(targetDoc(), daysDoc, TODAY, WEIGH_INS);
  assert.deepEqual(once.streak, { count: 3, through: '2026-10-08' });
  assert.deepEqual(foldPrunedDays(once, daysDoc, TODAY, WEIGH_INS).streak, once.streak);
  assert.deepEqual(continueStreak(once.streak, daysDoc, '2026-10-08', 2500), once.streak);
});

test('a save that prunes nothing leaves the core doc as it was', async () => {
  const store = await storeWith(daysFrom('2026-10-09', hits(7)));
  const before = await store.load(CORE_DOC_ID);
  await createDays(store).saveDay(TODAY, ate(2500), TODAY);
  assert.deepEqual(await store.load(CORE_DOC_ID), before);
  const doc = targetDoc();
  assert.equal(foldPrunedDays(doc, daysFrom('2026-10-09', hits(7)), TODAY, WEIGH_INS), doc);
});

test('a day pruned with no targets, locked before days kept theirs, is uncounted and keeps the run', () => {
  const lockedBefore = { ...emptyDay(), entries: [entry(1000)], locked: true };
  const doc = { ...createCoreDoc('2026-09-01'), streak: { count: 4, through: '2026-10-07' } };
  assert.deepEqual(foldPrunedDays(doc, { '2026-10-08': lockedBefore }, '2026-10-16', []).streak, { count: 4, through: '2026-10-08' });
});
