// Custom food form in a bottom sheet (SPEC §3.2, DESIGN §10): add a custom food, edit or
// delete one, or duplicate a bundled food into a new custom food.

import {
  addCustomFood,
  createCustomFood,
  deleteCustomFood,
  isFoodInUse,
  parseAmount,
  readFoodForm,
  unitUsedBy,
  updateCustomFood,
} from '../custom-foods.js';
import { CoreDocUnavailableError, DEFAULT_EMOJI, updateCoreDoc } from '../data.js';
import { icon } from '../icons.js';
import { CORE_DOC_ID } from '../store.js';
import { iconButton, primaryButton, secondaryButton } from '../ui/buttons.js';
import { emojiField } from '../ui/emoji-picker.js';
import { numberField, textField } from '../ui/inputs.js';
import { confirmSheet, openSheet } from '../ui/sheet.js';

const MODES = {
  add: { title: 'New custom food', submit: 'Add food' },
  edit: { title: 'Edit food', submit: 'Save changes' },
  duplicate: {
    title: 'Duplicate food',
    submit: 'Add food',
    note: 'Bundled foods can’t be changed, so this adds your own copy to adjust.',
  },
};

// Stored numbers go back in as they are, at full precision.
function asText(value) {
  return value === undefined ? '' : String(value);
}

function group(className, ...children) {
  const element = document.createElement('div');
  element.className = className;
  element.append(...children);
  return element;
}

// A label for screen readers only, tied to an otherwise unlabelled field (settings.js's feet
// and inches do the same): the "Other units" heading above the list, and the "g" suffix,
// already say what each row's fields are for.
function hiddenLabel(input, text) {
  const label = document.createElement('label');
  label.className = 'visually-hidden';
  label.htmlFor = input.id;
  label.textContent = text;
  return label;
}

// An "Other units" row (SPEC §3.2, DESIGN §10): a unit's name and its weight, with a trailing
// remove button, disabled and named for what uses it once it's in a saved meal or planned in a
// slot.
function unitRow({ unit, weight, disabled, usedBy, onRemove }) {
  const unitField = textField({ value: unit, placeholder: 'e.g. cup' });
  const weightField = numberField({ unit: 'g', value: weight, placeholder: 'e.g. 158' });
  unitField.element.prepend(hiddenLabel(unitField.input, 'Unit'));
  unitField.input.setAttribute('autocapitalize', 'none');
  weightField.element.prepend(hiddenLabel(weightField.input, 'Weight in grams'));
  for (const field of [unitField, weightField]) field.input.addEventListener('input', () => field.setError(null));

  const remove = iconButton('x', `Remove unit${unit ? `, ${unit}` : ''}`, { disabled, onClick: onRemove });
  const line = group('food-form__unit-line', group('food-form__grid', unitField.element, weightField.element), remove);
  const element = document.createElement('li');
  element.className = 'food-form__unit';
  element.append(line);
  if (usedBy) {
    const hint = document.createElement('p');
    hint.className = 'food-form__unit-hint';
    hint.textContent = `Used in ${usedBy}`;
    element.append(hint);
  }
  return { element, unitField, weightField };
}

// mode: 'add', 'edit' (food is a custom food) or 'duplicate' (food is a bundled food).
// Resolves to { doc, foodId } once something is saved: the new core doc, and the saved
// food's id (null after a delete). Resolves to null if the sheet closes with nothing saved.
export async function foodFormSheet({ store, mode, food }) {
  const { title, submit, note } = MODES[mode];
  let saved = null;
  let saving = false;
  let sheet;

  const emoji = emojiField({ value: food?.emoji ?? DEFAULT_EMOJI });
  // In DESIGN §10 order. The keys match readFoodForm's.
  const inputs = {
    name: textField({ label: 'Name', value: food?.name }),
    servingQty: numberField({ label: 'Serving', value: asText(food?.serving.qty) }),
    servingUnit: textField({ label: 'Unit', value: food?.serving.unit }),
    kcal: numberField({ label: 'Calories', unit: 'kcal', macro: 'kcal', value: asText(food?.kcal) }),
    protein: numberField({ label: 'Protein', unit: 'g', macro: 'protein', value: asText(food?.protein) }),
    fat: numberField({ label: 'Fat', unit: 'g', macro: 'fat', value: asText(food?.fat) }),
    carbs: numberField({ label: 'Carbs', unit: 'g', macro: 'carbs', value: asText(food?.carbs) }),
  };
  // Units are lower case ("g", "slice"), so the keyboard shouldn't capitalise them.
  inputs.servingUnit.input.setAttribute('autocapitalize', 'none');
  // Errors show on save and clear as soon as the field changes.
  for (const field of Object.values(inputs)) field.input.addEventListener('input', () => field.setError(null));

  // Serving weight (SPEC §3.2): hidden while the serving's already counted in g, since then its
  // weight is its own quantity, known without being entered. A duplicate starts from the
  // bundled food's weight, kept as it is until this form lets you adjust it.
  const weight = numberField({ label: 'Serving weight', unit: 'g', value: asText(food?.grams) });
  weight.input.addEventListener('input', () => {
    weight.setError(null);
    syncUnits();
  });

  // A unit already in use, 'edit' only: a row from 'add' or 'duplicate' can't be, since nothing
  // yet refers to a food that doesn't exist.
  const usedByUnit = {};
  if (mode === 'edit') {
    const doc = await store.load(CORE_DOC_ID);
    for (const portion of food.portions ?? []) {
      const usedBy = unitUsedBy(food.id, portion.unit, doc);
      if (usedBy) usedByUnit[portion.unit] = usedBy;
    }
  }

  let unitRows = [];
  const unitsList = document.createElement('ul');
  unitsList.className = 'food-form__units';

  function removeUnitRow(entry) {
    unitRows = unitRows.filter((row) => row !== entry);
    entry.element.remove();
  }

  function addUnitRow({ unit = '', weight: unitWeight = '', disabled = false, usedBy = null } = {}) {
    const entry = unitRow({ unit, weight: unitWeight, disabled, usedBy, onRemove: () => removeUnitRow(entry) });
    unitRows.push(entry);
    unitsList.append(entry.element);
    return entry;
  }

  for (const portion of food?.portions ?? []) {
    addUnitRow({
      unit: portion.unit,
      weight: asText(portion.grams),
      disabled: Boolean(usedByUnit[portion.unit]),
      usedBy: usedByUnit[portion.unit] ?? null,
    });
  }

  const addUnit = secondaryButton('Add unit', { block: true, onClick: () => addUnitRow().unitField.input.focus() });
  const unitsLabel = document.createElement('p');
  unitsLabel.className = 'field__label';
  unitsLabel.textContent = 'Other units';
  const unitsSection = group('food-form__units-section', unitsLabel, unitsList, addUnit);

  // The weight field and "Other units" need the serving's weight, so they show and hide
  // together: a serving already in g needs no field of its own to show it.
  function syncUnits() {
    const gramsServing = inputs.servingUnit.input.value.trim() === 'g';
    weight.element.hidden = gramsServing;
    unitsSection.hidden = !(gramsServing || parseAmount(weight.input.value) > 0);
  }
  inputs.servingUnit.input.addEventListener('input', syncUnits);
  syncUnits();

  const formError = document.createElement('p');
  formError.className = 'field__error';
  formError.setAttribute('role', 'alert');
  formError.hidden = true;
  formError.innerHTML = icon('circle-alert');
  const formErrorText = document.createElement('span');
  formError.append(formErrorText);

  async function commit(change, foodId) {
    if (saving) return;
    saving = true;
    formError.hidden = true;
    try {
      saved = { doc: await updateCoreDoc(store, change), foodId };
      sheet.close();
    } catch (error) {
      console.error('[macro-planner] saving a custom food failed:', error);
      formErrorText.textContent =
        error instanceof CoreDocUnavailableError ? error.message : 'That didn’t save. Try again.';
      formError.hidden = false;
    } finally {
      saving = false;
    }
  }

  // The message says whether it's archived, but deleteCustomFood decides from the doc it saves.
  async function confirmDelete() {
    const inUse = isFoodInUse(await store.load(CORE_DOC_ID), food.id);
    const confirmed = await confirmSheet({
      title: `Delete “${food.name}”?`,
      message: inUse
        ? 'It leaves your foods list, but the meals that use it keep it.'
        : 'It will be removed from your foods. This can’t be undone.',
      confirmLabel: 'Delete food',
    });
    if (confirmed) await commit((doc) => deleteCustomFood(doc, food.id), null);
  }

  const form = document.createElement('form');
  form.className = 'food-form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(Object.entries(inputs).map(([key, field]) => [key, field.input.value]));
    const { fields, errors } = readFoodForm({ ...values, emoji: emoji.value });
    for (const [key, field] of Object.entries(inputs)) field.setError(errors[key] ?? null);

    // Serving weight: required above 0 when entered, but only read at all while the serving
    // isn't already in g, since the field's hidden then (SPEC §3.2).
    const gramsServing = values.servingUnit.trim() === 'g';
    let grams;
    let weightOk = true;
    if (!gramsServing && weight.input.value.trim()) {
      const parsed = parseAmount(weight.input.value);
      if (parsed > 0) grams = parsed;
      else {
        weight.setError('Enter an amount above 0');
        weightOk = false;
      }
    }

    // A row left blank (no unit typed, no weight typed) is dropped rather than reported.
    const portions = [];
    let firstInvalidUnit = null;
    for (const entry of unitRows) {
      const unit = entry.unitField.input.value.trim();
      const weightText = entry.weightField.input.value.trim();
      if (!unit && !weightText) continue;
      const parsed = parseAmount(weightText);
      let rowOk = true;
      if (!unit) {
        entry.unitField.setError('Enter a unit, like cup or scoop');
        firstInvalidUnit ??= entry.unitField;
        rowOk = false;
      }
      if (!(parsed > 0)) {
        entry.weightField.setError('Enter an amount above 0');
        firstInvalidUnit ??= entry.weightField;
        rowOk = false;
      }
      if (rowOk) portions.push({ unit, grams: parsed });
    }

    if (!fields || !weightOk || firstInvalidUnit) {
      if (!fields) inputs[Object.keys(inputs).find((key) => errors[key])].input.focus();
      else if (!weightOk) weight.input.focus();
      else firstInvalidUnit.input.focus();
      return;
    }

    // Always sent, like a bundled food's own `grams` and `portions` (SPEC §3.2): a serving in g
    // needs no weight of its own, since sanitizeUnits works it out from the serving's quantity.
    const allFields = { ...fields, grams: gramsServing ? undefined : grams, portions };
    if (mode === 'edit') {
      commit((doc) => updateCustomFood(doc, food.id, allFields), food.id);
    } else {
      const created = createCustomFood(allFields);
      commit((doc) => addCustomFood(doc, created), created.id);
    }
  });

  const save = primaryButton(submit, { block: true });
  save.type = 'submit';
  form.append(
    group('food-form__name', emoji.element, inputs.name.element),
    group('food-form__grid', inputs.servingQty.element, inputs.servingUnit.element),
    group('food-form__grid', inputs.kcal.element, inputs.protein.element, inputs.fat.element, inputs.carbs.element),
    weight.element,
    unitsSection,
    formError,
    save,
  );
  if (mode === 'edit') form.append(secondaryButton('Delete food', { block: true, onClick: confirmDelete }));

  const content = [form];
  if (note) {
    const message = document.createElement('p');
    message.className = 'sheet__message';
    message.textContent = note;
    content.unshift(message);
  }

  sheet = openSheet({ title, content });
  await sheet.closed;
  return saved;
}
