// Text, numeric and search inputs (DESIGN §10): visible label, boxed input, error message below.

import { icon } from '../icons.js';
import { iconButton } from './buttons.js';
import { uniqueId } from './ids.js';

function setDescribedBy(input, ids) {
  const value = ids.filter(Boolean).join(' ');
  if (value) input.setAttribute('aria-describedby', value);
  else input.removeAttribute('aria-describedby');
}

// Shared shell for every field type. prefixIcon and trailing sit inside the box,
// before the input and after everything else. macro ('kcal', 'protein', 'fat' or 'carbs')
// puts that macro's dot before the label (DESIGN §10).
function field({ label, input, suffix, prefixIcon, trailing, macro }) {
  const id = uniqueId('field');
  input.id = id;
  input.classList.add('input');

  const element = document.createElement('div');
  element.className = 'field';

  const labelEl = document.createElement('label');
  labelEl.className = 'field__label';
  labelEl.htmlFor = id;
  labelEl.textContent = label;
  if (macro) {
    labelEl.classList.add('field__label--macro');
    labelEl.insertAdjacentHTML('afterbegin', `<span class="macro-dot macro-dot--${macro}" aria-hidden="true"></span>`);
  }

  const box = document.createElement('div');
  box.className = 'input-box';
  if (prefixIcon) box.insertAdjacentHTML('beforeend', icon(prefixIcon));
  box.append(input);

  let suffixId = null;
  if (suffix) {
    suffixId = `${id}-unit`;
    const suffixEl = document.createElement('span');
    suffixEl.className = 'input-box__suffix';
    suffixEl.id = suffixId;
    suffixEl.textContent = suffix;
    box.append(suffixEl);
  }
  if (trailing) box.append(trailing);

  const errorId = `${id}-error`;
  const error = document.createElement('p');
  error.className = 'field__error';
  error.id = errorId;
  error.hidden = true;
  error.innerHTML = icon('circle-alert');
  const errorText = document.createElement('span');
  error.append(errorText);

  element.append(labelEl, box, error);
  setDescribedBy(input, [suffixId]);

  // Pass a message to show the error state, or null to clear it.
  function setError(message) {
    const hasError = Boolean(message);
    element.classList.toggle('field--error', hasError);
    error.hidden = !hasError;
    errorText.textContent = hasError ? message : '';
    if (hasError) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    setDescribedBy(input, [suffixId, hasError && errorId]);
  }

  return { element, input, setError };
}

export function textField({ label, value = '', placeholder = '' } = {}) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  return field({ label, input });
}

// type="text" with a decimal keypad: avoids number-input spinners and locale quirks.
export function numberField({ label, unit, value = '', placeholder = '', macro } = {}) {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  const result = field({ label, input, suffix: unit, macro });
  input.classList.add('input--numeric');
  return result;
}

// type="search" gives the keyboard a Search key and screen readers a search box.
// Our clear button replaces the browser's own, which components/inputs.css hides.
// Autocorrect is off because it would "fix" partial words like "chick".
export function searchField({ label }) {
  const input = document.createElement('input');
  input.type = 'search';
  input.enterKeyHint = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('autocorrect', 'off');

  // Fires `input` like typing does, so whatever listens to the field sees the clear too.
  const clear = iconButton('x', 'Clear search', {
    onClick: () => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    },
  });

  const result = field({ label, input, prefixIcon: 'search', trailing: clear });
  result.element.classList.add('field--search');

  const syncClear = () => {
    clear.hidden = input.value === '';
  };
  input.addEventListener('input', syncClear);
  syncClear();
  return result;
}
