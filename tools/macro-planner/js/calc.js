// Nutrition math. Pure: no DOM, so it can be tested in Node.
// Inputs and results are metric and unrounded; convert and round only for display.

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

// kcal/day added to TDEE. The rate is always kg/week; imperial options are
// converted from lb first, so 1 lb/week gives ≈ 499 kcal/day, not 500.
export function goalAdjustment(goal, rateKgPerWeek) {
  if (!Object.hasOwn(GOAL_SIGN, goal)) throw new RangeError(`Unknown goal: ${goal}`);
  if (GOAL_SIGN[goal] === 0) return 0;
  return (GOAL_SIGN[goal] * rateKgPerWeek * KCAL_PER_KG) / 7;
}

const PROTEIN_G_PER_KG = 1.8;
const FAT_SHARE_OF_KCAL = 0.25;
const KCAL_PER_G = { protein: 4, fat: 9, carbs: 4 };

export const TARGET_WARNINGS = Object.freeze({
  BELOW_BMR: 'below-bmr',
  CARBS_CLAMPED: 'carbs-clamped',
});

// Daily targets: kcal, and macros in grams, keyed like a totals object.
// overrides: { kcal, protein, fat, carbs }, each a number or absent/null
// (null = use the calculated value). Defaults are worked out from the final
// kcal, protein and fat, so overriding kcal also moves the fat and carbs defaults.
export function targets(profile, overrides = {}) {
  const bmrKcal = bmr(profile);
  const calculatedKcal = tdee(bmrKcal, profile.activity) + goalAdjustment(profile.goal, profile.rateKgPerWeek);

  const kcal = overrides.kcal ?? calculatedKcal;
  const protein = overrides.protein ?? PROTEIN_G_PER_KG * profile.weightKg;
  const fat = overrides.fat ?? (FAT_SHARE_OF_KCAL * kcal) / KCAL_PER_G.fat;

  const warnings = [];
  if (kcal < bmrKcal) warnings.push(TARGET_WARNINGS.BELOW_BMR);

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

// A food's numbers are per serving; qty is in the serving's unit,
// so 150 of a { qty: 100, unit: 'g' } serving is 1.5 servings.
export function foodTotals(food, qty) {
  return scaleTotals(food, qty / food.serving.qty);
}

// getFood(id) must also resolve archived foods, since meals keep using them.
export function mealTotals(meal, getFood) {
  return sumTotals(
    meal.items.map(({ foodId, qty }) => {
      const food = getFood(foodId);
      if (!food) throw new RangeError(`Unknown food: ${foodId}`);
      return foodTotals(food, qty);
    }),
  );
}

// Log entries carry their own snapshot numbers. A day with no log doc has no entries.
export function dayTotals(entries = []) {
  return sumTotals(entries);
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

// --- Stats ---
// Stats cover this week only, Monday to today. A day is { entries?, swaps? };
// one with no entries (or no log at all) is empty: left out, not counted as zero.

function isLogged(day) {
  return (day.entries?.length ?? 0) > 0;
}

export function averageDailyTotals(days) {
  const logged = days.filter(isLogged);
  if (logged.length === 0) return { average: null, loggedDays: 0 };
  const sum = sumTotals(logged.map((day) => dayTotals(day.entries)));
  const average = Object.fromEntries(TOTAL_KEYS.map((key) => [key, sum[key] / logged.length]));
  return { average, loggedDays: logged.length };
}

// Monday to today inclusive, as 'YYYY-MM-DD'. today is the local date string;
// the math runs in UTC so DST never makes a day 23 or 25 hours.
export function weekDates(today) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!match) throw new RangeError(`Not a YYYY-MM-DD date: ${today}`);
  const [year, month, day] = match.slice(1).map(Number);
  const daysSinceMonday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
  return Array.from({ length: daysSinceMonday + 1 }, (_, i) =>
    new Date(Date.UTC(year, month - 1, day - daysSinceMonday + i)).toISOString().slice(0, 10),
  );
}
