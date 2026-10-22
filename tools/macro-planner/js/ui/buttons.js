// Buttons (DESIGN §9): primary, secondary and icon buttons, and text links.

import { icon } from '../icons.js';

function textButton(variant, label, { onClick, disabled = false, block = false } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn btn--${variant}${block ? ' btn--block' : ''}`;
  button.textContent = label;
  button.disabled = disabled;
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

// One primary per screen or sheet; everything else is secondary.
export function primaryButton(label, options) {
  return textButton('primary', label, options);
}

export function secondaryButton(label, options) {
  return textButton('secondary', label, options);
}

// An icon over an xs label, like a tab bar item, for a row too narrow for secondary buttons'
// padding and labels, such as Today's quick actions. It fills its column, and presses and
// disables like a secondary button.
export function compactButton(iconName, label, { onClick, disabled = false } = {}) {
  const button = textButton('secondary', '', { onClick, disabled, block: true });
  button.classList.add('btn--compact');
  const text = document.createElement('span');
  text.className = 'btn__label';
  text.textContent = label;
  button.innerHTML = icon(iconName);
  button.append(text);
  return button;
}

export function iconButton(iconName, label, { onClick, disabled = false } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-btn';
  button.setAttribute('aria-label', label);
  button.innerHTML = icon(iconName);
  button.disabled = disabled;
  if (onClick) button.addEventListener('click', onClick);
  return button;
}

// Same look as an icon button, for navigation (e.g. Settings in the header).
export function iconLink(iconName, label, href) {
  const link = document.createElement('a');
  link.className = 'icon-btn';
  link.href = href;
  link.setAttribute('aria-label', label);
  link.innerHTML = icon(iconName);
  return link;
}

// Underlined text that navigates, like "Set your targets in Settings" under rings with no targets.
export function textLink(label, href) {
  const link = document.createElement('a');
  link.className = 'text-link';
  link.href = href;
  link.textContent = label;
  return link;
}
