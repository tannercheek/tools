import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_EMOJI } from '../js/data.js';
import { CATEGORY_EMOJI, isSingleEmoji } from '../scripts/build-foods.mjs';

const pickerEmoji = JSON.parse(readFileSync(new URL('../data/emoji-picker.json', import.meta.url), 'utf8'));

// 🍽️ and 🍽 (without the variation selector) are the same emoji, so they count as a duplicate.
function bare(char) {
  return char.replaceAll('️', '');
}

test('every entry is one emoji character and a name, nothing else', () => {
  for (const entry of pickerEmoji) {
    assert.deepEqual(Object.keys(entry), ['char', 'name'], JSON.stringify(entry));
    assert.ok(isSingleEmoji(entry.char), `"${entry.char}" isn't a single emoji character`);
    assert.equal(typeof entry.name, 'string', `${entry.char} has no name`);
    assert.notEqual(entry.name.trim(), '', `${entry.char} has an empty name`);
  }
});

test('no character appears twice', () => {
  const seen = new Set();
  for (const { char } of pickerEmoji) {
    assert.ok(!seen.has(bare(char)), `${char} appears twice`);
    seen.add(bare(char));
  }
});

// Names are the tiles' aria-labels, so two alike would sound the same to a screen reader.
test('no name appears twice', () => {
  const names = pickerEmoji.map(({ name }) => name.trim().toLowerCase());
  assert.equal(new Set(names).size, names.length);
});

test('the grid has every category default and 🍽️ (SPEC §5.1)', () => {
  const chars = pickerEmoji.map(({ char }) => char);
  for (const [category, emoji] of Object.entries(CATEGORY_EMOJI)) {
    assert.ok(chars.includes(emoji), `${category} default ${emoji} is missing`);
  }
  assert.ok(chars.includes('🍽️'), '🍽️ is missing');
});

// The picker marks the current pick by exact match, so the default must be spelled the same.
test('the default emoji for custom foods and meals is the grid’s 🍽️', () => {
  assert.equal(DEFAULT_EMOJI, '🍽️');
  assert.ok(pickerEmoji.some(({ char }) => char === DEFAULT_EMOJI));
});
