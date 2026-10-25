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
// before the input and after everything else. suffix: the unit as text, or { control, text } for
// a control in its place, like a unit button (unit-choice.js), whose text element names the unit
// in the input's description. macro ('kcal', 'protein', 'fat' or 'carbs')
// puts that macro's dot before the label (DESIGN §10). Leave label out only when a visible
// <label> elsewhere names the input, like an ingredient row's title (row.js).
function field({ label, input, suffix, prefixIcon, trailing, macro }) {
  const id = uniqueId('field');
  input.id = id;
  input.classList.add('input');

  const element = document.createElement('div');
  element.className = 'field';

  if (label) {
    const labelEl = document.createElement('label');
    labelEl.className = 'field__label';
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    if (macro) {
      labelEl.classList.add('field__label--macro');
      labelEl.insertAdjacentHTML('afterbegin', `<span class="macro-dot macro-dot--${macro}" aria-hidden="true"></span>`);
    }
    element.append(labelEl);
  }

  const box = document.createElement('div');
  box.className = 'input-box';
  if (prefixIcon) box.insertAdjacentHTML('beforeend', icon(prefixIcon));
  box.append(input);

  let suffixId = null;
  if (typeof suffix === 'string') {
    suffixId = `${id}-unit`;
    const suffixEl = document.createElement('span');
    suffixEl.className = 'input-box__suffix';
    suffixEl.id = suffixId;
    suffixEl.textContent = suffix;
    box.append(suffixEl);
  } else if (suffix) {
    suffixId = `${id}-unit`;
    suffix.text.id = suffixId;
    box.append(suffix.control);
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

  element.append(box, error);
  setDescribedBy(input, [suffixId]);

  // Pass a message to show the error state, or null to clear it. `error` is returned too, for a
  // layout that places the message apart from the box, like an ingredient row (row.js).
  function setError(message) {
    const hasError = Boolean(message);
    element.classList.toggle('field--error', hasError);
    error.hidden = !hasError;
    errorText.textContent = hasError ? message : '';
    if (hasError) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    setDescribedBy(input, [suffixId, hasError && errorId]);
  }

  return { element, input, error, setError };
}

export function textField({ label, value = '', placeholder = '' } = {}) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  return field({ label, input });
}

// type="text" with a decimal keypad: avoids number-input spinners and locale quirks. unit: a
// suffix, as field takes it.
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

// A choice with more options than a segmented control fits at 360px, in the same box as the
// other fields. It opens the platform's own picker: a wheel on iOS. options: [{ value, label }].
// value: the selected option's value, or null for none yet, which shows the placeholder.
export function selectField({ label, options, value = null, placeholder }) {
  const select = document.createElement('select');
  // Selected from the start, so the browser doesn't pick the first real option. It can't be
  // picked again, so a choice can't be undone into nothing.
  const none = new Option(placeholder, '', true, true);
  none.disabled = true;
  none.hidden = true;
  select.append(none, ...options.map((option) => new Option(option.label, option.value)));
  if (value !== null) select.value = value;

  const chevron = document.createElement('span');
  chevron.className = 'input-box__chevron';
  chevron.innerHTML = icon('chevron-down');

  const result = field({ label, input: select, trailing: chevron });
  select.classList.add('input--select');
  result.element.classList.add('field--select');
  return result;
}

// A calendar date in the same box as the other fields. It opens the platform's own date picker:
// a wheel on iOS. value and max are 'YYYY-MM-DD'; max is the latest day the picker offers, but
// not every browser holds to it, so the caller still checks what comes back.
export function dateField({ label, value = '', max } = {}) {
  const input = document.createElement('input');
  input.type = 'date';
  input.value = value;
  if (max) input.max = max;
  const result = field({ label, input });
  input.classList.add('input--date');
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

// A message for a whole form or screen, like a save that failed: styled like a field's error
// and announced as soon as it shows. show(message) shows it; show(null) hides it.
export function formError() {
  const element = document.createElement('p');
  element.className = 'field__error';
  element.setAttribute('role', 'alert');
  element.hidden = true;
  element.innerHTML = icon('circle-alert');
  const text = document.createElement('span');
  element.append(text);
  return {
    element,
    show(message) {
      text.textContent = message ?? '';
      element.hidden = !message;
    },
  };
}
