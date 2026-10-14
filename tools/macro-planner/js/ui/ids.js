// Element ids for label / aria wiring. Page-local only, never persisted.

let counter = 0;

export function uniqueId(prefix) {
  counter += 1;
  return `${prefix}-${counter}`;
}
