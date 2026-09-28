// library.js — the built-in lifts. Never stored: picking one only prefills the
// Lift Editor with its name, pattern and bodyweight flag.

export const PATTERNS = {
  squat: 'Squat', hinge: 'Hinge', lunge: 'Lunge',
  horizontalPush: 'Horizontal Push', verticalPush: 'Vertical Push',
  horizontalPull: 'Horizontal Pull', verticalPull: 'Vertical Pull',
  core: 'Core', accessory: 'Accessory',
};

// [name, pattern, category, isBodyweight?]
export const LIBRARY = [
  ['Back Squat', 'squat', 'Barbell'],               ['Front Squat', 'squat', 'Barbell'],
  ['Bench Press', 'horizontalPush', 'Barbell'],     ['Incline Bench Press', 'horizontalPush', 'Barbell'],
  ['Overhead Press', 'verticalPush', 'Barbell'],    ['Deadlift', 'hinge', 'Barbell'],
  ['Romanian Deadlift', 'hinge', 'Barbell'],        ['Barbell Row', 'horizontalPull', 'Barbell'],
  ['Hip Thrust', 'hinge', 'Barbell'],               ['Power Clean', 'hinge', 'Barbell'],
  ['Barbell Curl', 'accessory', 'Barbell'],

  ['Dumbbell Bench Press', 'horizontalPush', 'Dumbbell'], ['Dumbbell Shoulder Press', 'verticalPush', 'Dumbbell'],
  ['Dumbbell Row', 'horizontalPull', 'Dumbbell'],   ['Dumbbell Fly', 'horizontalPush', 'Dumbbell'],
  ['Goblet Squat', 'squat', 'Dumbbell'],            ['Walking Lunge', 'lunge', 'Dumbbell'],
  ['Dumbbell Curl', 'accessory', 'Dumbbell'],       ['Hammer Curl', 'accessory', 'Dumbbell'],
  ['Lateral Raise', 'accessory', 'Dumbbell'],

  ['Lat Pulldown', 'verticalPull', 'Machine & Cable'],     ['Seated Cable Row', 'horizontalPull', 'Machine & Cable'],
  ['Leg Press', 'squat', 'Machine & Cable'],               ['Chest Press Machine', 'horizontalPush', 'Machine & Cable'],
  ['Cable Fly', 'horizontalPush', 'Machine & Cable'],      ['Leg Extension', 'accessory', 'Machine & Cable'],
  ['Leg Curl', 'accessory', 'Machine & Cable'],            ['Calf Raise', 'accessory', 'Machine & Cable'],
  ['Tricep Pushdown', 'accessory', 'Machine & Cable'],

  ['Pull-Up', 'verticalPull', 'Bodyweight', true],         ['Chin-Up', 'verticalPull', 'Bodyweight', true],
  ['Push-Up', 'horizontalPush', 'Bodyweight', true],       ['Dip', 'verticalPush', 'Bodyweight', true],
  ['Inverted Row', 'horizontalPull', 'Bodyweight', true],  ['Bulgarian Split Squat', 'lunge', 'Bodyweight', true],
  ['Nordic Curl', 'accessory', 'Bodyweight', true],        ['Plank', 'core', 'Bodyweight', true],
  ['Hanging Leg Raise', 'core', 'Bodyweight', true],
];

/** The library grouped by category, in the order above:
 *  [{ category, lifts: [{ name, pattern, isBodyweight }] }]. */
export function libraryGroups() {
  const groups = new Map();
  for (const [name, pattern, category, isBodyweight = false] of LIBRARY) {
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ name, pattern, isBodyweight });
  }
  return [...groups].map(([category, lifts]) => ({ category, lifts }));
}
