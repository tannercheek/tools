// dom.js — one small helper for building elements.
// Text children are added as text nodes, so anything the person typed is never
// parsed as HTML. The `html` prop is only for LiftBoard's own markup (icons).

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key === 'html') el.innerHTML = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...present(children));
  return el;
}

/** Replaces an element's contents. Like h(), it skips null and false, which
 *  replaceChildren() would otherwise print as the text "null" / "false". */
export function fill(el, ...children) {
  el.replaceChildren(...present(children));
  return el;
}

const present = children => children.flat().filter(c => c != null && c !== false);
