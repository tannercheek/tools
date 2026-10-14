// Buttons (DESIGN §9): primary, secondary and icon buttons.

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

export function iconButton(iconName, label, { onClick } = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-btn';
  button.setAttribute('aria-label', label);
  button.innerHTML = icon(iconName);
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
