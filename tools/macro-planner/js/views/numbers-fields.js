// The four numbers, kcal, protein, fat and carbs, as fields two to a row (DESIGN §10), for quick
// numbers and a flex slot's pinned budget, which are entered the same way (SPEC §3.4).

import { readNumbers } from '../custom-foods.js';
import { numberField } from '../ui/inputs.js';

// Stored numbers go back in as they are, at full precision.
function asText(value) {
  return value === undefined ? '' : String(value);
}

// values: the numbers to start with, or omitted for empty fields. read() returns
// { kcal, protein, fat, carbs }, or shows what's wrong, focuses the first field that is, and
// returns null.
export function numbersFields(values = {}) {
  const fields = {
    kcal: numberField({ label: 'Calories', unit: 'kcal', macro: 'kcal', value: asText(values.kcal) }),
    protein: numberField({ label: 'Protein', unit: 'g', macro: 'protein', value: asText(values.protein) }),
    fat: numberField({ label: 'Fat', unit: 'g', macro: 'fat', value: asText(values.fat) }),
    carbs: numberField({ label: 'Carbs', unit: 'g', macro: 'carbs', value: asText(values.carbs) }),
  };
  // Errors show on submit and clear as soon as the field changes.
  for (const field of Object.values(fields)) field.input.addEventListener('input', () => field.setError(null));

  const element = document.createElement('div');
  element.className = 'numbers-grid';
  element.append(...Object.values(fields).map((field) => field.element));

  return {
    element,
    firstInput: fields.kcal.input,
    read() {
      const texts = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.input.value]));
      const { numbers, errors } = readNumbers(texts);
      for (const [key, field] of Object.entries(fields)) field.setError(errors[key] ?? null);
      if (!numbers) fields[Object.keys(fields).find((key) => errors[key])].input.focus();
      return numbers;
    },
  };
}
