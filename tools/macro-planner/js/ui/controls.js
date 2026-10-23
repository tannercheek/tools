// Segmented control, switch and tag pills (DESIGN §9). The segmented control and switch are
// native inputs underneath, so arrow keys, Space and screen readers behave as the platform
// expects; tag pills are toggle buttons.

import { icon } from '../icons.js';
import { uniqueId } from './ids.js';

// options: [{ value, label }]. Native radios give arrow-key movement within the group.
// value: the selected option's value, or null for nothing selected yet, like a profile field
// not filled in: then there's no pill (DESIGN §9). showLabel puts the label above the control,
// like a form field's; otherwise only screen readers get it.
export function segmentedControl({ label, options, value = null, showLabel = false, onChange }) {
  const name = uniqueId('segmented');
  const group = document.createElement('div');
  group.className = 'segmented';
  group.setAttribute('role', 'radiogroup');
  group.style.setProperty('--segment-count', options.length);

  const pill = document.createElement('span');
  pill.className = 'segmented__pill';
  pill.setAttribute('aria-hidden', 'true');
  group.append(pill);

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
    group.append(input, optionLabel);
    return input;
  });

  // The pill shows up at the first pick rather than sliding in from somewhere.
  function select(next) {
    const index = options.findIndex((option) => option.value === next);
    inputs.forEach((input, i) => (input.checked = i === index));
    pill.hidden = index === -1;
    if (index !== -1) group.style.setProperty('--segment-index', index);
  }

  group.addEventListener('change', (event) => {
    select(event.target.value);
    onChange?.(event.target.value);
  });
  select(value);

  let element = group;
  if (showLabel) {
    const labelEl = document.createElement('span');
    labelEl.className = 'field__label';
    labelEl.id = uniqueId('segmented-label');
    labelEl.textContent = label;
    group.setAttribute('aria-labelledby', labelEl.id);
    element = document.createElement('div');
    element.className = 'field';
    element.append(labelEl, group);
  } else {
    group.setAttribute('aria-label', label);
  }

  return {
    element,
    get value() {
      return inputs.find((input) => input.checked)?.value ?? null;
    },
    set value(next) {
      select(next);
    },
  };
}

// A segmented control over panes, one showing at a time, like the add and swap sheets' (DESIGN
// §8). panes: { [option value]: () => element }. Each pane is built when first shown and kept, so
// switching back finds it as it was left. value: the option to open on. Returns the control and
// the area its panes show in, as { control, pane }, for the caller to lay out.
export function segmentedPanes({ label, options, value, panes }) {
  const built = new Map();
  const pane = document.createElement('div');
  function show(next) {
    if (!built.has(next)) built.set(next, panes[next]());
    pane.replaceChildren(built.get(next));
  }
  const control = segmentedControl({ label, options, value, onChange: show });
  show(value);
  return { control: control.element, pane };
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

function pillButton(className) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  const label = document.createElement('span');
  label.className = 'tag-pill__label';
  button.append(label);
  return { button, label };
}

// A meal tag (SPEC §3.3) as a toggle button. pressed: whether it shows as on.
export function tagPill({ label, pressed = false, onClick }) {
  const pill = pillButton('tag-pill');
  pill.label.textContent = label;
  pill.button.setAttribute('aria-pressed', String(pressed));
  if (onClick) pill.button.addEventListener('click', onClick);
  return pill.button;
}

// The dashed "New tag" pill at the end of a meal's tags. It opens a sheet rather than
// toggling, so it has no aria-pressed.
export function newTagPill({ label = 'New tag', onClick }) {
  const pill = pillButton('tag-pill tag-pill--new');
  pill.label.textContent = label;
  pill.button.insertAdjacentHTML('afterbegin', icon('plus'));
  if (onClick) pill.button.addEventListener('click', onClick);
  return pill.button;
}

// Tag pills on a wrapping row, like a meal's tags in the meal editor. label names the group
// for screen readers.
export function tagGroup({ label, pills = [] }) {
  const group = document.createElement('div');
  group.className = 'tag-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  group.append(...pills);
  return group;
}

// The single-select tag filter over a list of meals: "All", then each tag, on one line that
// scrolls sideways in its own strip. One pill is always on, and it starts on All, since the
// filter isn't saved (SPEC §3.3). onChange gets the picked tag, or null for All.
export function tagFilterRow({ tags, onChange }) {
  const choices = [{ value: null, label: 'All' }, ...tags.map((tag) => ({ value: tag, label: tag }))];
  let selected = null;

  const pills = choices.map(({ value, label }) =>
    tagPill({ label, pressed: value === selected, onClick: () => select(value) }),
  );

  function select(value) {
    if (value === selected) return;
    selected = value;
    pills.forEach((pill, i) => pill.setAttribute('aria-pressed', String(choices[i].value === value)));
    onChange?.(value);
  }

  const strip = document.createElement('div');
  strip.className = 'tag-filter';
  strip.setAttribute('role', 'group');
  strip.setAttribute('aria-label', 'Filter by tag');
  strip.append(...pills);

  return {
    element: strip,
    get value() {
      return selected;
    },
  };
}
