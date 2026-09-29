// views/controls.js — small controls shared by several views.

import { h } from '../dom.js';

/** A segmented control: one pressed button per option.
 *  options: [[value, label], …]; onPick(value) runs on tap. */
export function segmented(label, options, current, onPick) {
  return h('div', { class: 'segmented', role: 'group', 'aria-label': label },
    options.map(([value, text]) => h('button', {
      type: 'button', class: 'segment t-chip', 'aria-pressed': String(value === current), onclick: () => onPick(value),
    }, text)));
}
