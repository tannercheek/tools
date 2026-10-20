// Settings (SPEC §3.8), pushed from the header: the profile, the targets worked out from it
// (SPEC §3.1), and the meal slots (SPEC §3.4). Every profile field starts empty (SPEC §5). Each
// change saves as soon as it's made, so there's no Save button, and the targets follow along as
// you type. Weight comes from the weight log, so entering one here logs a weigh-in for today.

import { ACTIVITY_MULTIPLIERS } from '../calc.js';
import {
  CoreDocUnavailableError,
  WeightLogUnavailableError,
  createWeightLog,
  currentWeight,
  localDate,
  updateCoreDoc,
} from '../data.js';
import {
  heightCmText,
  heightFtInText,
  rateOption,
  rateOptions,
  readAmount,
  readHeightFtIn,
  readHeightPart,
  readWeight,
  setOverride,
  setProfileField,
  setUnits,
  weightText,
} from '../profile.js';
import { CORE_DOC_ID } from '../store.js';
import { segmentedControl } from '../ui/controls.js';
import { formError, numberField, selectField } from '../ui/inputs.js';
import { slotsSection } from './slots-section.js';
import { targetsSection } from './targets-section.js';

const UNIT_OPTIONS = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
];
const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];
const ACTIVITY_LABELS = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  'very-active': 'Very active',
  extreme: 'Extreme',
};
const GOAL_OPTIONS = [
  { value: 'lose', label: 'Lose' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Gain' },
];
// Bodyweight and the goal rate share a unit.
const WEIGHT_UNIT = { metric: 'kg', imperial: 'lb' };

function section(title, ...children) {
  const element = document.createElement('section');
  element.className = 'settings__section';
  const heading = document.createElement('h2');
  heading.className = 'section-title';
  heading.textContent = title;
  element.append(heading, ...children);
  return element;
}

function labelFor(input, text, className) {
  const label = document.createElement('label');
  label.className = className;
  label.htmlFor = input.id;
  label.textContent = text;
  return label;
}

// Feet and inches side by side under one "Height" label, which names the feet; the inches have
// a label for screen readers only. Errors show under both boxes.
function feetAndInches() {
  const feet = numberField({ unit: 'ft', placeholder: 'Height' });
  const inches = numberField({ unit: 'in' });
  const pair = document.createElement('div');
  pair.className = 'settings__grid';
  pair.append(feet.element, inches.element);
  const element = document.createElement('div');
  element.className = 'field';
  element.append(
    labelFor(feet.input, 'Height', 'field__label'),
    labelFor(inches.input, 'Height, inches', 'visually-hidden'),
    pair,
    feet.error,
    inches.error,
  );

  // A part that isn't a number says so. When both are but come to nothing, the feet get message.
  function setError(message) {
    const feetWrong = Boolean(message) && readHeightPart(feet.input.value) === null;
    const inchesWrong = Boolean(message) && readHeightPart(inches.input.value) === null;
    if (message && !feetWrong && !inchesWrong) {
      feet.setError(message);
      inches.setError(null);
      return;
    }
    feet.setError(feetWrong ? 'Enter feet, like 5' : null);
    inches.setError(inchesWrong ? 'Enter inches, like 10' : null);
  }

  return { element, fields: [feet, inches], setError };
}

// A profile number (age, height or weight) typed into one or more number fields. text(value)
// gives each field's text for a saved value, and read(...texts) the value back, or null if it
// isn't valid. A valid entry saves with commit(value) once the field is left. A blank field with
// nothing saved is left alone, since every field starts empty; anything else that isn't valid
// says so, and the saved value stays. setError defaults to the first field's. live() is what the
// targets use: what's typed, once it's valid and differs from what was shown for the saved
// value, since that can show rounded.
function profileNumber({ element, fields, text, read, saved, message, commit, onInput, setError = fields[0].setError }) {
  const inputs = fields.map((field) => field.input);
  const texts = () => inputs.map((input) => input.value);
  let shown = text(saved());
  inputs.forEach((input, i) => (input.value = shown[i]));

  for (const input of inputs) {
    input.addEventListener('input', () => {
      setError(null);
      onInput();
    });
    input.addEventListener('change', () => {
      const value = read(...texts());
      if (value !== null) {
        shown = texts();
        commit(value);
      } else if (saved() != null || texts().some((t) => t.trim() !== '')) {
        setError(message);
      }
    });
  }

  return {
    element,
    live() {
      const typed = texts().some((t, i) => t !== shown[i]);
      return (typed && read(...texts())) || saved();
    },
  };
}

// The loaded core doc and current weight in, the form out. doc may be {} when this device has
// never loaded the core doc and storage can't be reached: the form then shows empty, and saving
// says why it can't.
function profileForm({ store, weightLog, doc: loaded, weightKg: loadedWeight }) {
  let doc = loaded;
  let weightKg = loadedWeight;
  const units = () => doc.settings?.units ?? 'metric';
  const profile = () => doc.profile ?? {};

  const error = formError();
  let writes = Promise.resolve();

  // One write at a time, in order. A failure says so on the screen.
  function save(write) {
    writes = writes.then(async () => {
      error.show(null);
      try {
        await write();
      } catch (err) {
        console.error('[macro-planner] saving the profile failed:', err);
        const known = err instanceof CoreDocUnavailableError || err instanceof WeightLogUnavailableError;
        error.show(known ? err.message : 'That didn’t save. Try again.');
        error.element.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  // Shown straight away, then the same change is made to the stored doc.
  function edit(change) {
    doc = change(doc);
    save(() => updateCoreDoc(store, change));
    refresh();
  }

  // Today's weigh-in is the latest, so it's the profile's weight from now on (SPEC §3.1).
  function logWeight(kg) {
    weightKg = kg;
    save(() => weightLog.add({ date: localDate(new Date()), kg }));
    refresh();
  }

  function choice(label, key, options) {
    return segmentedControl({
      label,
      showLabel: true,
      options,
      value: profile()[key] ?? null,
      onChange: (value) => edit((d) => setProfileField(d, key, value)),
    });
  }

  function ageInput() {
    const field = numberField({ label: 'Age', unit: 'years', placeholder: 'Age' });
    return profileNumber({
      element: field.element,
      fields: [field],
      text: (age) => [age == null ? '' : String(age)],
      read: readAmount,
      saved: () => profile().age,
      message: 'Enter your age, like 30',
      commit: (age) => edit((d) => setProfileField(d, 'age', age)),
      onInput: refresh,
    });
  }

  // Whole cm, or feet and whole inches (SPEC §5.2).
  function heightInput() {
    const shared = {
      saved: () => profile().heightCm,
      commit: (cm) => edit((d) => setProfileField(d, 'heightCm', cm)),
      onInput: refresh,
    };
    if (units() === 'imperial') {
      return profileNumber({
        ...feetAndInches(),
        text: (cm) => {
          const { ft, inches } = heightFtInText(cm);
          return [ft, inches];
        },
        read: readHeightFtIn,
        message: 'Enter your height, like 5 ft 10 in',
        ...shared,
      });
    }
    const field = numberField({ label: 'Height', unit: 'cm', placeholder: 'Height' });
    return profileNumber({
      element: field.element,
      fields: [field],
      text: (cm) => [heightCmText(cm)],
      read: readAmount,
      message: 'Enter your height, like 178',
      ...shared,
    });
  }

  // Shows the current weight, the latest weigh-in, to one decimal (SPEC §5.2).
  function weightInput() {
    const imperial = units() === 'imperial';
    const field = numberField({ label: 'Weight', unit: WEIGHT_UNIT[units()], placeholder: 'Weight' });
    return profileNumber({
      element: field.element,
      fields: [field],
      text: (kg) => [weightText(kg, units())],
      read: (text) => readWeight(text, units()),
      saved: () => weightKg,
      message: `Enter your weight, like ${imperial ? '180' : '82.5'}`,
      commit: logWeight,
      onInput: refresh,
    });
  }

  // Each option is shown in the current system (0.5 lb, never 0.227 kg) and stored in kg.
  function rateInput() {
    const options = rateOptions(units());
    const selected = rateOption(profile().rateKgPerWeek, units());
    return segmentedControl({
      label: 'Rate per week',
      showLabel: true,
      options: options.map(({ amount }) => ({ value: String(amount), label: `${amount} ${WEIGHT_UNIT[units()]}` })),
      value: selected ? String(selected.amount) : null,
      onChange: (value) => {
        const { kg } = options.find(({ amount }) => String(amount) === value);
        edit((d) => setProfileField(d, 'rateKgPerWeek', kg));
      },
    });
  }

  const unitsControl = segmentedControl({
    label: 'Units',
    showLabel: true,
    options: UNIT_OPTIONS,
    value: units(),
    onChange: (next) => {
      edit((d) => setUnits(d, next));
      showUnits();
    },
  });
  const sex = choice('Sex', 'sex', SEX_OPTIONS);
  const age = ageInput();
  let height = heightInput();
  let weight = weightInput();
  const activity = selectField({
    label: 'Activity',
    placeholder: 'Activity',
    value: profile().activity ?? null,
    options: Object.keys(ACTIVITY_MULTIPLIERS).map((value) => ({ value, label: ACTIVITY_LABELS[value] })),
  });
  activity.input.addEventListener('change', () => edit((d) => setProfileField(d, 'activity', activity.input.value)));
  const goal = choice('Goal', 'goal', GOAL_OPTIONS);
  let rate = rateInput();
  const targets = targetsSection({ onCommit: (key, value) => edit((d) => setOverride(d, key, value)) });

  // The fields that show a unit swap for ones in the new system.
  function showUnits() {
    const next = { height: heightInput(), weight: weightInput(), rate: rateInput() };
    height.element.replaceWith(next.height.element);
    weight.element.replaceWith(next.weight.element);
    rate.element.replaceWith(next.rate.element);
    ({ height, weight, rate } = next);
    refresh();
  }

  // Maintain needs no rate, so it's hidden; the stored one is kept for switching back.
  function refresh() {
    rate.element.hidden = profile().goal === 'maintain';
    targets.show({
      profile: { ...profile(), age: age.live(), heightCm: height.live() },
      weightKg: weight.live(),
      overrides: doc.overrides ?? {},
    });
  }

  const element = document.createElement('div');
  element.className = 'settings';
  element.append(
    section(
      'Profile',
      unitsControl.element,
      sex.element,
      age.element,
      height.element,
      weight.element,
      activity.element,
      goal.element,
      rate.element,
    ),
    section('Targets', ...targets.elements),
    error.element,
  );
  refresh();
  return element;
}

export function render(container, { store }) {
  // Built into its own element, so a load that finishes after leaving the screen changes nothing.
  const screen = document.createElement('div');
  container.replaceChildren(screen);
  const weightLog = createWeightLog(store);
  Promise.all([store.load(CORE_DOC_ID), weightLog.list()]).then(([doc, weighIns]) => {
    if (!screen.isConnected) return;
    const form = profileForm({ store, weightLog, doc, weightKg: currentWeight(weighIns) });
    form.append(section('Meal slots', ...slotsSection({ store, doc })));
    screen.replaceWith(form);
  });
}
