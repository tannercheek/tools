// A bar of fields (PLAN steps 26–27, DESIGN §5.6): each field is a button
// showing its value over a small label, like a DAW's LCD; a click opens a
// small menu under it. The settings toolbar and the Drums, Strum and Chords
// rows are field bars. What each field shows, and what its menu holds, is the
// caller's: this module draws the fields and runs the menus.
import { createLaneMenu } from './lane-menu.js';
import { ICONS } from './icons.js';

const COMPACT = '(max-width: 599px)'; // a menu spans its bar
let current = null; // the bar whose menu is open; opening another closes it

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function icon(name, className) {
  const span = el('span', className);
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = ICONS[name];
  return span;
}

// A menu item. A choice has a key; picking it closes the menu. An action
// (act: true) keeps it open: Lock, Reroll, Start over…
export function menuItem(key, {
  sym, name, iconName, act = false, role = act ? 'menuitem' : 'menuitemradio', on = false, disabled = false, label, armed = false,
}) {
  const b = el('button', armed ? 'ed-item is-armed' : 'ed-item');
  b.type = 'button';
  b.dataset.key = key;
  if (act) b.dataset.act = '1';
  b.setAttribute('role', role);
  if (role !== 'menuitem') b.setAttribute('aria-checked', String(on));
  b.disabled = disabled;
  if (label) b.setAttribute('aria-label', label);
  if (iconName) b.append(icon(iconName, 'menu-icon'));
  if (sym) b.append(el('span', 'menu-sym', sym));
  if (name) b.append(el('span', 'ed-name', name));
  return b;
}

// Items in fixed columns (a choice grid, or the actions line).
export function menuGrid(cols, items) {
  const g = el('div', `menu-grid is-${cols}`);
  g.append(...items);
  return g;
}

// A scrolling list of choices, in labelled groups: [{ label, items }].
export function menuList(groups) {
  const list = el('div', 'menu-list');
  for (const { label, items } of groups) {
    if (!items.length) continue;
    if (label) list.append(el('span', 'label menu-label', label));
    list.append(...items);
  }
  return list;
}

// box: the bar (position: relative) holding a .field button per field
// (data-field) and the menu element. fields[name]:
//   label, cue ('chevron' | 'chevronsUpDown'), value() → string,
//   locked() → bool, said() → the field's accessible name (optional),
//   menu() → { nodes, role, label, wide }, pick(key), act(key, field),
//   manual: true when the caller handles the field's clicks (Tempo).
// onClose() runs however a menu closes.
export function createFieldBar({ box, menuEl, fields, onClose = () => {} }) {
  const field = (name) => box.querySelector(`.field[data-field="${name}"]`);
  let openFor = null;

  const menu = createLaneMenu({
    menu: menuEl,
    box,
    fullWidth: () => matchMedia(COMPACT).matches,
    onClose: () => {
      openFor = null;
      if (current === api) current = null;
      onClose();
    },
  });

  function menuNodes(name) {
    const { nodes, role = 'menu', label, wide = false } = fields[name].menu();
    menuEl.setAttribute('role', role);
    menuEl.setAttribute('aria-label', label ?? fields[name].label);
    menuEl.classList.toggle('is-wide', wide);
    return nodes;
  }

  function render() {
    for (const [name, spec] of Object.entries(fields)) {
      const node = field(name);
      const locked = !!spec.locked?.();
      const value = spec.value();
      node.classList.toggle('is-locked', locked);
      node.querySelector('.field-value').textContent = value;
      const label = node.querySelector('.field-label');
      label.replaceChildren(spec.label);
      if (locked) label.append(icon('lock', 'field-lock'));
      label.append(icon(spec.cue ?? 'chevron', 'field-cue'));
      node.setAttribute('aria-label', `${spec.said ? spec.said() : `${spec.label}: ${value}`}${locked ? ', locked' : ''}`);
    }
    // An open menu follows the idea (a reroll, a lock), keeping its focus.
    if (!openFor) return;
    const key = menu.hasFocus() ? document.activeElement.dataset.key : null;
    menu.open(() => field(openFor), menuNodes(openFor), { focusKey: key, focus: key != null });
  }

  function open(name, opts) {
    if (current && current !== api) current.close();
    current = api;
    openFor = name;
    menu.open(() => field(name), menuNodes(name), opts);
  }

  function toggle(name, opts) {
    if (openFor === name) menu.close();
    else open(name, opts);
  }

  menuEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-key]');
    if (!b || !openFor) return;
    const name = openFor;
    if (b.dataset.act) { fields[name].act(b.dataset.key, field(name)); return; }
    menu.close();
    fields[name].pick(b.dataset.key);
    field(name)?.focus();
  });

  box.addEventListener('click', (e) => {
    const node = e.target.closest('.field');
    if (!node || fields[node.dataset.field]?.manual) return;
    toggle(node.dataset.field);
  });

  const api = {
    render,
    toggle,
    field,
    close: (opts) => menu.close(opts),
    isOpen: (name) => openFor === name,
  };
  return api;
}
