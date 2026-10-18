// New meal sheet (SPEC §3.3): an emoji and a name, saved as a meal with no foods yet.
// Foods are added on the meal's own screen (step 4.3).

import { CoreDocUnavailableError, DEFAULT_EMOJI, updateCoreDoc } from '../data.js';
import { addMeal, createMeal } from '../saved-meals.js';
import { primaryButton } from '../ui/buttons.js';
import { emojiField } from '../ui/emoji-picker.js';
import { formError, textField } from '../ui/inputs.js';
import { openSheet } from '../ui/sheet.js';

// Resolves to the new meal once it's saved, or null if the sheet closes with nothing saved.
export async function newMealSheet({ store }) {
  let created = null;
  let saving = false;
  let sheet;

  const emoji = emojiField({ value: DEFAULT_EMOJI });
  const name = textField({ label: 'Name' });
  name.input.addEventListener('input', () => name.setError(null));
  const error = formError();

  async function save(meal) {
    if (saving) return;
    saving = true;
    error.show(null);
    try {
      await updateCoreDoc(store, (doc) => addMeal(doc, meal));
      created = meal;
      sheet.close();
    } catch (err) {
      console.error('[macro-planner] saving a new meal failed:', err);
      error.show(err instanceof CoreDocUnavailableError ? err.message : 'That didn’t save. Try again.');
    } finally {
      saving = false;
    }
  }

  const form = document.createElement('form');
  form.className = 'meal-form';
  form.noValidate = true;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = name.input.value.trim();
    if (!text) {
      name.setError('Enter a name');
      name.input.focus();
      return;
    }
    save(createMeal({ name: text, emoji: emoji.value }));
  });

  const nameRow = document.createElement('div');
  nameRow.className = 'meal-form__name';
  nameRow.append(emoji.element, name.element);
  const create = primaryButton('Create meal', { block: true });
  create.type = 'submit';
  form.append(nameRow, error.element, create);

  sheet = openSheet({ title: 'New meal', content: form });
  await sheet.closed;
  return created;
}
