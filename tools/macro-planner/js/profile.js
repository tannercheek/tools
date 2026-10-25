// Profile and targets (SPEC §3.1): the goal rate options, how the profile's numbers show and
// read back in either unit system, and the core doc changes that save them. Pure: no DOM, so it
// can be tested in Node. Stored values are metric and unrounded; only what's shown is converted
// and rounded (SPEC §5.2).

import { cmToFtIn, ftInToCm, kgToLb, lbToKg, splitFromTargets, validSplit } from './calc.js';
import { parseAmount } from './custom-foods.js';

const SPLIT_KEYS = ['protein', 'fat', 'carbs'];
// Where a percent split starts with no saved percents and no targets yet (SPEC §3.1).
const DEFAULT_SPLIT = { protein: 30, fat: 25, carbs: 45 };

// --- Goal rate ---

// Per week, in each system's own unit (SPEC §3.1).
const RATE_AMOUNTS = { metric: [0.25, 0.5, 0.75], imperial: [0.5, 1, 1.5] };

// [{ amount, kg }]: amount is what's shown (1 lb), kg what's stored (0.4536).
export function rateOptions(units) {
  return RATE_AMOUNTS[units].map((amount) => ({ amount, kg: units === 'imperial' ? lbToKg(amount) : amount }));
}

// The option a stored rate shows as, or null with no rate. The nearest one, so a rate saved in
// the other system lands on its match: 0.5 lb ↔ 0.25 kg, 1 lb ↔ 0.5 kg, 1.5 lb ↔ 0.75 kg.
export function rateOption(rateKg, units) {
  if (rateKg == null) return null;
  const distance = ({ kg }) => Math.abs(kg - rateKg);
  return rateOptions(units).reduce((nearest, option) => (distance(option) < distance(nearest) ? option : nearest));
}

// --- Core doc changes ---
// Each returns a new core doc and leaves the one passed in as it was.

// key: 'sex', 'age', 'heightCm', 'activity', 'goal' or 'rateKgPerWeek', with its stored value.
export function setProfileField(doc, key, value) {
  return { ...doc, profile: { ...doc.profile, [key]: value } };
}

// key: 'kcal', 'protein', 'fat' or 'carbs'. value: the target, or null for the calculated one.
export function setOverride(doc, key, value) {
  return { ...doc, overrides: { ...doc.overrides, [key]: value } };
}

// --- Macro split (SPEC §3.1) ---

// A doc without a macro split is by bodyweight.
export function splitBy(doc) {
  return doc.macroSplit?.by ?? 'bodyweight';
}

// What switching to percent starts from: the percents saved last time, else the current targets
// as percents, so they barely move, else 30 / 25 / 45. currentTargets: calc.js's targets(), or
// null with no targets yet.
export function startingSplit(doc, currentTargets) {
  if (doc.macroSplit?.percent) return { ...doc.macroSplit.percent };
  return currentTargets ? splitFromTargets(currentTargets) : { ...DEFAULT_SPLIT };
}

// percent: a split that adds up to 100 (calc.js's validSplit).
export function setSplitPercent(doc, percent) {
  return { ...doc, macroSplit: { by: 'percent', percent: { ...percent } } };
}

// The percents are kept for switching back. A doc that never had any gets none.
export function setSplitBodyweight(doc) {
  const percent = doc.macroSplit?.percent;
  return { ...doc, macroSplit: percent ? { by: 'bodyweight', percent } : { by: 'bodyweight' } };
}

// The rate moves to the new system's matching option, so it always shows as one of them.
// That moves the calorie target by 25–77 kcal/day (SPEC §3.1).
export function setUnits(doc, units) {
  return {
    ...doc,
    settings: { ...doc.settings, units },
    profile: { ...doc.profile, rateKgPerWeek: rateOption(doc.profile?.rateKgPerWeek, units)?.kg ?? null },
  };
}

// --- Showing and reading numbers ---
// For the form's fields: stored values in, text out, and typed text back to a stored value.
// A read is null unless the text is a valid amount.

// An amount above 0, like an age or a height in cm.
export function readAmount(text) {
  return parseAmount(text) || null;
}

// One decimal. Stored unrounded, so 180 lb entered shows 180.0 lb again, never 179.9.
export function weightText(kg, units) {
  if (kg == null) return '';
  return (units === 'imperial' ? kgToLb(kg) : kg).toFixed(1);
}

export function readWeight(text, units) {
  const amount = readAmount(text);
  if (amount === null) return null;
  return units === 'imperial' ? lbToKg(amount) : amount;
}

export function heightCmText(cm) {
  return cm == null ? '' : String(Math.round(cm));
}

// Feet and whole inches, rounded before splitting, so 182 cm is 6 ft 0 in rather than 5 ft 12 in.
export function heightFtInText(cm) {
  if (cm == null) return { ft: '', inches: '' };
  const { ft, inches } = cmToFtIn(cm);
  const whole = Math.round(inches);
  return whole === 12 ? { ft: String(ft + 1), inches: '0' } : { ft: String(ft), inches: String(whole) };
}

// One part of a height in feet and inches. A blank part counts as 0, so "6" ft alone is
// 6 ft 0 in. null if it isn't a number.
export function readHeightPart(text) {
  return String(text ?? '').trim() === '' ? 0 : parseAmount(text);
}

// null if either part isn't a number, or the two come to nothing.
export function readHeightFtIn(ftText, inchesText) {
  const ft = readHeightPart(ftText);
  const inches = readHeightPart(inchesText);
  if (ft === null || inches === null) return null;
  return ftInToCm(ft, inches) || null;
}

// Calories above 0, and grams from 0, since a carbs target of 0 is a real one.
export function readTarget(key, text) {
  const amount = parseAmount(text);
  return key === 'kcal' ? amount || null : amount;
}

// One macro's percent: a whole number, with a blank as 0. null for anything else, like 30.5.
export function readPercent(text) {
  const trimmed = String(text ?? '').trim();
  if (trimmed === '') return 0;
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

// texts: the percent fields as typed, { protein, fat, carbs }. total: what they add up to, or null
// if one isn't a whole number. percent: the split, only once it can be saved (validSplit).
export function readSplit(texts) {
  const percent = Object.fromEntries(SPLIT_KEYS.map((key) => [key, readPercent(texts[key])]));
  const values = Object.values(percent);
  const total = values.includes(null) ? null : values.reduce((sum, value) => sum + value, 0);
  return { total, percent: validSplit(percent) ? percent : null };
}

// What a target's field shows: an override as it was entered, a calculated target as a whole
// number (SPEC §5.2). targetValues: the result of calc.js's targets().
export function targetText(key, targetValues, overrides) {
  return String(overrides[key] ?? Math.round(targetValues[key]));
}
