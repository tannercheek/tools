// library.js — the movement patterns, the equipment types, and the built-in
// lifts. Library lifts are never stored: picking one only prefills the Lift
// Editor with its name, pattern and equipment.

export const PATTERNS = {
  squat: 'Squat', hinge: 'Hinge', lunge: 'Lunge',
  horizontalPush: 'Horizontal Push', verticalPush: 'Vertical Push',
  horizontalPull: 'Horizontal Pull', verticalPull: 'Vertical Pull',
  core: 'Core', accessory: 'Accessory',
};

/** In display order: the Lift Editor's picker and Add Lift's groups. */
export const EQUIPMENT = {
  barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine', cable: 'Cable',
  bodyweight: 'Bodyweight', kettlebell: 'Kettlebell', band: 'Band', other: 'Other',
};

/** Bodyweight and band lifts may log a weight of 0; every other lift needs one.
 *  On a bodyweight lift the weight is added load. */
export const allowsNoWeight = lift => lift.equipment === 'bodyweight' || lift.equipment === 'band';

// [name, pattern, equipment]
export const LIBRARY = [
  ['Back Squat', 'squat', 'barbell'],               ['Front Squat', 'squat', 'barbell'],
  ['Bench Press', 'horizontalPush', 'barbell'],     ['Incline Bench Press', 'horizontalPush', 'barbell'],
  ['Overhead Press', 'verticalPush', 'barbell'],    ['Deadlift', 'hinge', 'barbell'],
  ['Romanian Deadlift', 'hinge', 'barbell'],        ['Barbell Row', 'horizontalPull', 'barbell'],
  ['Hip Thrust', 'hinge', 'barbell'],               ['Power Clean', 'hinge', 'barbell'],
  ['Barbell Curl', 'accessory', 'barbell'],

  ['Dumbbell Bench Press', 'horizontalPush', 'dumbbell'], ['Dumbbell Shoulder Press', 'verticalPush', 'dumbbell'],
  ['Dumbbell Row', 'horizontalPull', 'dumbbell'],   ['Dumbbell Fly', 'horizontalPush', 'dumbbell'],
  ['Goblet Squat', 'squat', 'dumbbell'],            ['Walking Lunge', 'lunge', 'dumbbell'],
  ['Dumbbell Curl', 'accessory', 'dumbbell'],       ['Hammer Curl', 'accessory', 'dumbbell'],
  ['Lateral Raise', 'accessory', 'dumbbell'],

  ['Leg Press', 'squat', 'machine'],                ['Chest Press Machine', 'horizontalPush', 'machine'],
  ['Leg Extension', 'accessory', 'machine'],        ['Leg Curl', 'accessory', 'machine'],
  ['Calf Raise', 'accessory', 'machine'],

  ['Lat Pulldown', 'verticalPull', 'cable'],        ['Seated Cable Row', 'horizontalPull', 'cable'],
  ['Cable Fly', 'horizontalPush', 'cable'],         ['Tricep Pushdown', 'accessory', 'cable'],

  ['Pull-Up', 'verticalPull', 'bodyweight'],        ['Chin-Up', 'verticalPull', 'bodyweight'],
  ['Push-Up', 'horizontalPush', 'bodyweight'],      ['Dip', 'verticalPush', 'bodyweight'],
  ['Inverted Row', 'horizontalPull', 'bodyweight'], ['Bulgarian Split Squat', 'lunge', 'bodyweight'],
  ['Nordic Curl', 'accessory', 'bodyweight'],       ['Plank', 'core', 'bodyweight'],
  ['Hanging Leg Raise', 'core', 'bodyweight'],
];

/** The library grouped by equipment, in EQUIPMENT's order, skipping empty groups:
 *  [{ equipment, label, lifts: [{ name, pattern, equipment }] }]. */
export function libraryGroups() {
  return Object.entries(EQUIPMENT)
    .map(([equipment, label]) => ({
      equipment, label,
      lifts: LIBRARY.filter(l => l[2] === equipment).map(([name, pattern]) => ({ name, pattern, equipment })),
    }))
    .filter(g => g.lifts.length > 0);
}

/** The library's equipment for a lift name (ignoring case and outer spaces), or null. */
export function libraryEquipment(name) {
  const key = String(name ?? '').trim().toLowerCase();
  return LIBRARY.find(([n]) => n.toLowerCase() === key)?.[2] ?? null;
}

/** Equipment for a lift saved before equipment existed, from its name and old
 *  bodyweight flag. The library's equipment is used when it agrees with the
 *  flag on "bodyweight or not"; otherwise the flag decides: bodyweight, or other. */
export function equipmentFromLegacy({ name, isBodyweight }) {
  const flag = Boolean(isBodyweight);
  const fromLibrary = libraryEquipment(name);
  if (fromLibrary && (fromLibrary === 'bodyweight') === flag) return fromLibrary;
  return flag ? 'bodyweight' : 'other';
}
