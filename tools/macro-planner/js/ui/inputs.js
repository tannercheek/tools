// Text and numeric inputs (DESIGN §10): visible label, boxed input, error message below.

import { icon } from '../icons.js';
import { uniqueId } from './ids.js';

function setDescribedBy(input, ids) {
  const value = ids.filter(Boolean).join(' ');
  if (value) input.setAttribute('aria-describedby', value);
  else input.removeAttribute('aria-describedby');
}

// Shared shell for both field types.
function field({ label, input, suffix }) {
  const id = uniqueId('field');
  input.id = id;
  input.classList.add('input');

  const element = document.createElement('div');
  element.className = 'field';

  const labelEl = document.createElement('label');
  labelEl.className = 'field__label';
  labelEl.htmlFor = id;
  labelEl.textContent = label;

  const box = document.createElement('div');
  box.className = 'input-box';
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
export function numberField({ label, unit, value = '', placeholder = '' } = {}) {
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.autocomplete = 'off';
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  const result = field({ label, input, suffix: unit });
  input.classList.add('input--numeric');
  return result;
}
