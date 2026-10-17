// Custom food form in a bottom sheet (SPEC §3.2, DESIGN §10): add a custom food, edit or
// delete one, or duplicate a bundled food into a new custom food.

import {
  addCustomFood,
  createCustomFood,
  deleteCustomFood,
  isFoodInUse,
  readFoodForm,
  updateCustomFood,
} from '../custom-foods.js';
import { CoreDocUnavailableError, DEFAULT_EMOJI, updateCoreDoc } from '../data.js';
import { icon } from '../icons.js';
import { CORE_DOC_ID } from '../store.js';
import { primaryButton, secondaryButton } from '../ui/buttons.js';
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
    if (!fields) {
      inputs[Object.keys(inputs).find((key) => errors[key])].input.focus();
      return;
    }
    if (mode === 'edit') {
      commit((doc) => updateCustomFood(doc, food.id, fields), food.id);
    } else {
      const created = createCustomFood(fields);
      commit((doc) => addCustomFood(doc, created), created.id);
    }
  });

  const save = primaryButton(submit, { block: true });
  save.type = 'submit';
  form.append(
    group('food-form__name', emoji.element, inputs.name.element),
    group('food-form__grid', inputs.servingQty.element, inputs.servingUnit.element),
    group('food-form__grid', inputs.kcal.element, inputs.protein.element, inputs.fat.element, inputs.carbs.element),
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
