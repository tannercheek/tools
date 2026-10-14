// Focus-trap helpers. Pure: no DOM access, so they can be tested in Node.

export const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

// Where Tab should send focus inside a trap of `count` focusable elements.
// `index` is the focused element's position, or -1 if focus is on none of them.
// Returns the index to focus, or null to let the browser move focus normally.
// Radio groups count as one stop (only the checked radio is tabbable), which the
// caller handles by passing only tabbable elements.
export function focusWrapIndex(index, count, backwards) {
  if (count === 0) return null;
  if (index === -1) return backwards ? count - 1 : 0;
  if (backwards && index === 0) return count - 1;
  if (!backwards && index === count - 1) return 0;
  return null;
}
