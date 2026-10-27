// Nutrition math. Pure: no DOM, so it can be tested in Node.
// Inputs and results are metric and unrounded; convert and round only for display.

import { toServings } from './portions.js';

// Both exact by definition.
const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;
const IN_PER_FT = 12;

export function lbToKg(lb) {
  return lb * KG_PER_LB;
}

export function kgToLb(kg) {
  return kg / KG_PER_LB;
}

export function ftInToCm(ft, inches) {
  return (ft * IN_PER_FT + inches) * CM_PER_IN;
}

// 180 → { ft: 5, inches: 10.87… }. Inches stay unrounded: to show whole inches,
// round the total before splitting, or 182 cm would read as 5 ft 12 in.
export function cmToFtIn(cm) {
  const totalInches = cm / CM_PER_IN;
  const ft = Math.floor(totalInches / IN_PER_FT);
  return { ft, inches: totalInches - ft * IN_PER_FT };
}

const BMR_SEX_OFFSET = { male: 5, female: -161 };

// Mifflin-St Jeor, in kcal/day. sex is 'male' or 'female'.
export function bmr({ sex, age, heightCm, weightKg }) {
  if (!Object.hasOwn(BMR_SEX_OFFSET, sex)) throw new RangeError(`Unknown sex: ${sex}`);
  return 10 * weightKg + 6.25 * heightCm - 5 * age + BMR_SEX_OFFSET[sex];
}

// Keys are the stored activity values, in the order the UI lists them.
export const ACTIVITY_MULTIPLIERS = Object.freeze({
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  'very-active': 1.725,
  extreme: 1.9,
});

export function tdee(bmrKcal, activity) {
  if (!Object.hasOwn(ACTIVITY_MULTIPLIERS, activity)) {
    throw new RangeError(`Unknown activity level: ${activity}`);
  }
  return bmrKcal * ACTIVITY_MULTIPLIERS[activity];
}

const KCAL_PER_KG = 7700;
const GOAL_SIGN = { lose: -1, maintain: 0, gain: 1 };

// The goal's rate in kg/week, signed: negative for lose, positive for gain, 0 for maintain,
// which needs no rate.
export function goalRate(goal, rateKgPerWeek) {
  if (!Object.hasOwn(GOAL_SIGN, goal)) throw new RangeError(`Unknown goal: ${goal}`);
  return GOAL_SIGN[goal] === 0 ? 0 : GOAL_SIGN[goal] * rateKgPerWeek;
}

// kcal/day added to TDEE. The rate is always kg/week; imperial options are
// converted from lb first, so 1 lb/week gives ≈ 499 kcal/day, not 500.
export function goalAdjustment(goal, rateKgPerWeek) {
  return (goalRate(goal, rateKgPerWeek) * KCAL_PER_KG) / 7;
}

const PROTEIN_G_PER_KG = 1.8;
const FAT_SHARE_OF_KCAL = 0.25;
const KCAL_PER_G = { protein: 4, fat: 9, carbs: 4 };
const MACRO_KEYS = ['protein', 'fat', 'carbs'];

export const TARGET_WARNINGS = Object.freeze({
  BELOW_BMR: 'below-bmr',
  CARBS_CLAMPED: 'carbs-clamped',
});

// Daily targets: kcal, and macros in grams, keyed like a totals object.
// overrides: { kcal, protein, fat, carbs }, each a number or absent/null
// (null = use the calculated value). An override replaces only its own target; nothing is
// rebalanced. macroSplit: the core doc's (SPEC §3.1); without one, macros are by bodyweight.
// Macros are worked out from the final kcal, so overriding kcal moves every one calculated from
// it: fat and carbs by bodyweight, all three by percent.
export function targets(profile, overrides = {}, macroSplit) {
  const bmrKcal = bmr(profile);
  const calculatedKcal = tdee(bmrKcal, profile.activity) + goalAdjustment(profile.goal, profile.rateKgPerWeek);
  const kcal = overrides.kcal ?? calculatedKcal;

  const warnings = [];
  if (kcal < bmrKcal) warnings.push(TARGET_WARNINGS.BELOW_BMR);

  // By percent, carbs are their own share of the calories, not what's left, so they can't go
  // negative and are never clamped.
  if (macroSplit?.by === 'percent') {
    const grams = (key) => overrides[key] ?? (macroSplit.percent[key] * kcal) / (100 * KCAL_PER_G[key]);
    return { kcal, protein: grams('protein'), fat: grams('fat'), carbs: grams('carbs'), warnings };
  }

  const protein = overrides.protein ?? PROTEIN_G_PER_KG * profile.weightKg;
  const fat = overrides.fat ?? (FAT_SHARE_OF_KCAL * kcal) / KCAL_PER_G.fat;

  let carbs = overrides.carbs;
  if (carbs == null) {
    carbs = (kcal - protein * KCAL_PER_G.protein - fat * KCAL_PER_G.fat) / KCAL_PER_G.carbs;
    if (carbs < 0) {
      carbs = 0;
      warnings.push(TARGET_WARNINGS.CARBS_CLAMPED);
    }
  }

  return { kcal, protein, fat, carbs, warnings };
}

// Whether a percent split can be saved (SPEC §3.1): { protein, fat, carbs } as whole numbers
// from 0 to 100 adding up to 100.
export function validSplit(percent) {
  const values = MACRO_KEYS.map((key) => percent?.[key]);
  return (
    values.every((value) => Number.isInteger(value) && value >= 0 && value <= 100) &&
    values.reduce((sum, value) => sum + value, 0) === 100
  );
}

// The targets as a percent split, for filling the fields on switching to percent (SPEC §3.1):
// each macro's share of the calorie target in whole percents, carbs taking up the rounding, so
// the targets barely move. Protein and fat can pass the calorie target, as when carbs are
// clamped by bodyweight; they're capped then, so the split still adds up to 100.
export function splitFromTargets(targetValues) {
  const percentOf = (key) => Math.round((targetValues[key] * KCAL_PER_G[key] * 100) / targetValues.kcal);
  const capped = (value, max) => Math.min(Math.max(value, 0), max);
  const protein = capped(percentOf('protein'), 100);
  const fat = capped(percentOf('fat'), 100 - protein);
  return { protein, fat, carbs: 100 - protein - fat };
}

// --- Age (SPEC §3.1) ---

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Age in whole years on date, both 'YYYY-MM-DD'. A 29 February birthday counts from 1 March in
// years without one.
export function ageOn(birthDate, date) {
  const year = Number(date.slice(0, 4));
  const birthday = birthDate.slice(5) === '02-29' && !isLeapYear(year) ? '03-01' : birthDate.slice(5);
  return year - Number(birthDate.slice(0, 4)) - (date.slice(5) < birthday ? 1 : 0);
}

// The age the targets use on today: the birthday's, else an age saved before birthdays, else
// null. Nothing guesses a birthday from a saved age.
export function profileAge(profile, today) {
  if (profile.birthDate != null) return ageOn(profile.birthDate, today);
  return profile.age ?? null;
}

// What targets need from the core doc's profile (SPEC §3.1). The age and rate are checked apart:
// the age comes from the birthday, and maintain doesn't use a rate.
const PROFILE_KEYS = ['sex', 'heightCm', 'activity', 'goal'];

// Targets from the saved profile, the current weight (the latest weigh-in, or null before
// the first), overrides and the core doc's macroSplit, on today ('YYYY-MM-DD'), which the age
// is worked out for. null until the profile is complete: until then there are no targets,
// calculated or overridden.
export function profileTargets(profile, weightKg, overrides = {}, macroSplit, today) {
  const age = profileAge(profile, today);
  const incomplete =
    PROFILE_KEYS.some((key) => profile[key] == null) ||
    age == null ||
    weightKg == null ||
    (profile.goal !== 'maintain' && profile.rateKgPerWeek == null);
  if (incomplete) return null;
  return targets({ ...profile, age, weightKg }, overrides, macroSplit);
}

// --- Totals ---
// A totals object is { kcal, protein, fat, carbs }: kcal and grams, unrounded.

const TOTAL_KEYS = ['kcal', 'protein', 'fat', 'carbs'];

function sumTotals(list) {
  const sum = { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  for (const totals of list) {
    for (const key of TOTAL_KEYS) sum[key] += totals[key];
  }
  return sum;
}

export function scaleTotals(totals, multiplier) {
  return Object.fromEntries(TOTAL_KEYS.map((key) => [key, totals[key] * multiplier]));
}

// A food's numbers are per serving; qty is in unit, one of portions.js's foodUnits, or in the
// serving's unit without one. So 150 of a { qty: 100, unit: 'g' } serving is 1.5 servings, and
// 1 cup of cooked rice counts as its 158 g.
export function foodTotals(food, qty, unit) {
  return scaleTotals(food, toServings(food, qty, unit));
}

// getFood(id) must also resolve archived foods, since meals keep using them. An item without a
// unit is in its food's serving unit, as in meals saved before portions.
export function mealTotals(meal, getFood) {
  return sumTotals(
    meal.items.map(({ foodId, qty, unit }) => {
      const food = getFood(foodId);
      if (!food) throw new RangeError(`Unknown food: ${foodId}`);
      return foodTotals(food, qty, unit);
    }),
  );
}

// Entries carry their own snapshot numbers, so they add up alone. No entries total zero. For a
// day's whole total, plan included, use dayTotal.
export function entriesTotals(entries = []) {
  return sumTotals(entries);
}

// A day's version of a meal (ingredients.js). Like entries, each ingredient carries its own
// snapshot numbers, so they add up with no food lookup.
export function ingredientsTotals(ingredients) {
  return sumTotals(ingredients);
}

// What a slot's meal adds (SPEC §3.5): the day's ingredients for it, or else the meal's, at the
// slot's portion. Its planned foods aren't part of it. plan: one of slots.js's daySlots, with a
// meal.
export function slotMealTotals(plan, getFood) {
  const meal = plan.ingredients ? ingredientsTotals(plan.ingredients) : mealTotals(plan.meal, getFood);
  return scaleTotals(meal, plan.portion);
}

// What one slot adds to the day (SPEC §3.5): its meal at its portion, or a food or quick numbers
// swapped in for it, and its planned foods at their own amounts; or an open flex slot's pinned
// budget. A skipped slot, an open flex slot with no budget and a filled flex slot add nothing of
// their own; what's added to a slot counts in dayTotal. plan: one of slots.js's daySlots.
export function slotTotals(plan, getFood) {
  if (plan.skipped) return sumTotals([]);
  const foods = ingredientsTotals(plan.foods);
  if (plan.swapEntry) return sumTotals([plan.swapEntry, foods]);
  if (plan.meal) return sumTotals([slotMealTotals(plan, getFood), foods]);
  if (!plan.flex) return foods;
  const open = plan.entries.length === 0;
  return open && plan.budget ? sumTotals([plan.budget]) : sumTotals([]);
}

// The day's total (SPEC §3.5): the planned meals after swaps, skips, portions and ingredient
// changes, the planned foods after the day's changes, the pinned budgets of open flex slots, and
// every added entry, Other's and any whose slot is gone too. Off plan, the plan is ignored;
// locked, it's already written into the entries. Either way only the entries count. plans:
// slots.js's daySlots for the same day.
export function dayTotal(day, plans, getFood) {
  const entries = entriesTotals(day.entries);
  if (day.offPlan || day.locked) return entries;
  return sumTotals([...plans.map((plan) => slotTotals(plan, getFood)), entries]);
}

// The gap a flex slot shows (SPEC §3.4): the targets minus the rest of the day, which is the
// day's total without what the slot adds itself, its pinned budget or its own entries. Every
// flex slot shows the whole gap, so nothing is split between them. Each key is
// displayRemaining's { amount, over }, so it agrees with the rings. null with no targets.
export function flexGap(targetValues, day, plans, slotId, getFood) {
  if (!targetValues) return null;
  const others = plans.filter((plan) => plan.id !== slotId);
  const entries = (day.entries ?? []).filter((entry) => entry.slotId !== slotId);
  const rest = dayTotal({ ...day, entries }, others, getFood);
  return displayRemainingTotals(targetValues, rest);
}

// Plan's "left for flex" (SPEC §3.4): the targets minus what the template adds up to, its meals,
// planned foods and pinned budgets. One figure for every flex slot together, never split between
// them. Each key is displayRemaining's { amount, over }, so a plan over target shows "over", never
// a negative. null with no targets.
export function leftForFlex(targetValues, templateTotals) {
  if (!targetValues) return null;
  return displayRemainingTotals(targetValues, templateTotals);
}

// Negative means over target. targets is the result of targets().
export function remaining(targetValues, eaten) {
  return Object.fromEntries(TOTAL_KEYS.map((key) => [key, targetValues[key] - eaten[key]]));
}

// --- Display rounding ---
// Only for showing numbers. Sum, compare and store the raw values.

export function roundTotals(totals) {
  return Object.fromEntries(TOTAL_KEYS.map((key) => [key, Math.round(totals[key])]));
}

// "N left" / "N over" for one number: the shown target minus the shown eaten,
// so a ring's three numbers always agree. amount is a whole number ≥ 0.
export function displayRemaining(target, eaten) {
  const left = Math.round(target) - Math.round(eaten);
  return { amount: Math.abs(left), over: left < 0 };
}

function displayRemainingTotals(targetValues, totals) {
  return Object.fromEntries(TOTAL_KEYS.map((key) => [key, displayRemaining(targetValues[key], totals[key])]));
}

// How much of a ring's arc to draw, from 0 to 1 (DESIGN §6): the shown total over the shown
// target, so the arc agrees with the numbers beside it. Over target stays full. A total that
// shows as 0 draws nothing, and anything above a target of 0 is over it.
export function ringFill(total, target) {
  const shownTotal = Math.round(total);
  const shownTarget = Math.round(target);
  if (shownTotal <= 0) return 0;
  if (shownTarget <= 0) return 1;
  return Math.min(shownTotal / shownTarget, 1);
}

// --- Stats ---
// Stats cover the 7 days before today. A day is the shape in data.js; only its
// entries count. One with no entries (or no record at all) is empty: left out, not counted as zero.

function isLogged(day) {
  return (day.entries?.length ?? 0) > 0;
}

export function averageDailyTotals(days) {
  const logged = days.filter(isLogged);
  if (logged.length === 0) return { average: null, loggedDays: 0 };
  const sum = sumTotals(logged.map((day) => entriesTotals(day.entries)));
  const average = Object.fromEntries(TOTAL_KEYS.map((key) => [key, sum[key] / logged.length]));
  return { average, loggedDays: logged.length };
}

// Stats' daily averages (SPEC §3.7) from the days doc: over the 7 days before today, so today,
// still in progress, doesn't count, and neither does an older day the doc hasn't pruned yet.
export function lastSevenDaysAverage(daysDoc, today) {
  return averageDailyTotals(lastSevenDates(today).map((date) => daysDoc[date] ?? {}));
}

// --- Dates ---
// Dates are local 'YYYY-MM-DD' strings. The math runs on whole UTC days,
// so DST never makes a day 23 or 25 hours.

const MS_PER_DAY = 86_400_000;

function dayNumber(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Not a YYYY-MM-DD date: ${date}`);
  const [year, month, day] = match.slice(1).map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

function dateFromDayNumber(dayNum) {
  return new Date(dayNum * MS_PER_DAY).toISOString().slice(0, 10);
}

// The date `days` days after `date`; negative goes back.
export function addDays(date, days) {
  return dateFromDayNumber(dayNumber(date) + days);
}

// Whole days from `from` to `to`; negative when `to` is earlier.
export function daysBetween(from, to) {
  return dayNumber(to) - dayNumber(from);
}

// The 7 days before today, oldest first. Today is still in progress, so it isn't one of them.
export function lastSevenDates(today) {
  const todayNum = dayNumber(today);
  return Array.from({ length: 7 }, (_, i) => dateFromDayNumber(todayNum - 7 + i));
}

// --- Weight rate ---

const RATE_WINDOW_DAYS = 28;
const MIN_RATE_SPAN_DAYS = 7;

// Least-squares slope through the weigh-ins from the last 28 days (today and
// the 27 before it), in kg/week. A slope uses every point, so one heavy morning
// moves it less than a first-to-last difference would. null unless the window
// holds two weigh-ins at least 7 days apart. weighIns: [{ date, kg }], any order.
export function weightRate(weighIns, today) {
  const todayNum = dayNumber(today);
  const points = weighIns
    .map(({ date, kg }) => ({ x: dayNumber(date), y: kg }))
    .filter(({ x }) => x > todayNum - RATE_WINDOW_DAYS && x <= todayNum);
  if (points.length < 2) return null;

  const xs = points.map(({ x }) => x);
  if (Math.max(...xs) - Math.min(...xs) < MIN_RATE_SPAN_DAYS) return null;

  const meanX = xs.reduce((a, b) => a + b, 0) / points.length;
  const meanY = points.reduce((a, { y }) => a + y, 0) / points.length;
  let covariance = 0;
  let variance = 0;
  for (const { x, y } of points) {
    covariance += (x - meanX) * (y - meanY);
    variance += (x - meanX) ** 2;
  }
  return (covariance / variance) * 7;
}
