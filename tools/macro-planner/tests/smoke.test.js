import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODE } from '../config.js';

test('config exports a valid MODE', () => {
  assert.ok(['personal', 'public'].includes(MODE));
});
