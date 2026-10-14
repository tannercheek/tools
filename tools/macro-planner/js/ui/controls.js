// Segmented control and switch (DESIGN §9). Both are native inputs underneath,
// so arrow keys, Space and screen readers behave as the platform expects.

import { uniqueId } from './ids.js';

// options: [{ value, label }]. Native radios give arrow-key movement within the group.
export function segmentedControl({ label, options, value, onChange }) {
  const name = uniqueId('segmented');
  const element = document.createElement('div');
  element.className = 'segmented';
  element.setAttribute('role', 'radiogroup');
  element.setAttribute('aria-label', label);
  element.style.setProperty('--segment-count', options.length);

  const pill = document.createElement('span');
  pill.className = 'segmented__pill';
  pill.setAttribute('aria-hidden', 'true');
  element.append(pill);

  const inputs = options.map((option) => {
    const id = uniqueId('segment');
    const input = document.createElement('input');
    input.type = 'radio';
    input.className = 'segmented__input visually-hidden';
    input.name = name;
    input.id = id;
    input.value = option.value;
    const optionLabel = document.createElement('label');
    optionLabel.className = 'segmented__label';
    optionLabel.htmlFor = id;
    optionLabel.textContent = option.label;
    element.append(input, optionLabel);
    return input;
  });

  function select(next) {
    const index = Math.max(0, options.findIndex((option) => option.value === next));
    inputs[index].checked = true;
    element.style.setProperty('--segment-index', index);
  }

  element.addEventListener('change', (event) => {
    select(event.target.value);
    onChange?.(event.target.value);
  });
  select(value);

  return {
    element,
    get value() {
      return inputs.find((input) => input.checked).value;
    },
    set value(next) {
      select(next);
    },
  };
}

// A labelled on/off switch. The whole row is the hit target.
export function switchControl({ label, checked = false, onChange }) {
  const element = document.createElement('label');
  element.className = 'switch';

  const text = document.createElement('span');
  text.className = 'switch__label';
  text.textContent = label;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'switch__input visually-hidden';
  input.setAttribute('role', 'switch');
  input.checked = checked;
  if (onChange) input.addEventListener('change', () => onChange(input.checked));

  const track = document.createElement('span');
  track.className = 'switch__track';
  track.setAttribute('aria-hidden', 'true');
  track.innerHTML = '<span class="switch__knob"></span>';

  element.append(text, input, track);
  return { element, input };
}
