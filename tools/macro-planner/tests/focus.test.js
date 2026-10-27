import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusWrapIndex, revealScrollDelta } from '../js/ui/focus.js';

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

test('a field already in view needs no scroll', () => {
  assert.equal(revealScrollDelta({ top: 100, bottom: 150 }, { top: 0, bottom: 400 }, 12), 0);
});

test('a field under the bottom edge scrolls up to sit a gap above it', () => {
  // The keyboard took the bottom of the sheet: the field ends at 500, the view at 400.
  assert.equal(revealScrollDelta({ top: 450, bottom: 500 }, { top: 0, bottom: 400 }, 12), 112);
});

test('a field just inside the edge but within the gap still scrolls', () => {
  assert.equal(revealScrollDelta({ top: 340, bottom: 395 }, { top: 0, bottom: 400 }, 12), 7);
});

test('a field above the top edge scrolls back down to sit a gap below it', () => {
  assert.equal(revealScrollDelta({ top: 40, bottom: 90 }, { top: 64, bottom: 400 }, 12), -36);
});

test('a field taller than the view keeps its top in view', () => {
  assert.equal(revealScrollDelta({ top: 100, bottom: 600 }, { top: 0, bottom: 300 }, 12), 88);
});
