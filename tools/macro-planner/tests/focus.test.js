import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusWrapIndex } from '../js/ui/focus.js';

test('Tab on the last stop wraps to the first', () => {
  assert.equal(focusWrapIndex(2, 3, false), 0);
});

test('Shift+Tab on the first stop wraps to the last', () => {
  assert.equal(focusWrapIndex(0, 3, true), 2);
});

test('moves between middle stops are left to the browser', () => {
  assert.equal(focusWrapIndex(0, 3, false), null);
  assert.equal(focusWrapIndex(1, 3, false), null);
  assert.equal(focusWrapIndex(1, 3, true), null);
  assert.equal(focusWrapIndex(2, 3, true), null);
});

test('focus outside the stops (e.g. on the panel) enters at the start or end', () => {
  assert.equal(focusWrapIndex(-1, 3, false), 0);
  assert.equal(focusWrapIndex(-1, 3, true), 2);
});

test('a single stop keeps focus on itself both ways', () => {
  assert.equal(focusWrapIndex(0, 1, false), 0);
  assert.equal(focusWrapIndex(0, 1, true), 0);
});

test('no stops: nothing to do', () => {
  assert.equal(focusWrapIndex(-1, 0, false), null);
});
