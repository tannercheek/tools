import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { logoMark, logoMarkTwoTone, HEADER_LOGO, headerLogo } from '../js/icons.js';

const root = new URL('../', import.meta.url);

test('index.html: every file the <head> points to exists', () => {
  const head = readFileSync(new URL('index.html', root), 'utf8').split(/<\/head>/i)[0];
  const refs = [...head.matchAll(/<(?:link|script)\b[^>]*\b(?:href|src)="([^"]+)"/gi)].map(m => m[1]);
  assert.ok(refs.includes('brand/favicon.svg') && refs.includes('brand/apple-touch-icon.png'), 'the icons are missing from <head>');
  for (const ref of refs) {
    assert.ok(!/^(\/|[a-z]+:)/i.test(ref), `${ref} isn’t a relative path`);
    assert.ok(existsSync(fileURLToPath(new URL(ref, root))), `${ref} doesn’t exist`);
  }
});

test('logo mark: inlined in currentColor, with no hex colors', () => {
  const svg = logoMark();
  assert.match(svg, /^<svg [^>]*fill="currentColor"/);
  assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b/i);
  for (const [, color] of svg.matchAll(/\b(?:fill|stroke)="([^"]*)"/g)) assert.equal(color, 'currentColor');
  assert.match(svg, /aria-hidden="true"/);
});

test('two-tone logo: a squares path and an arrow path, colored by class, with no fills or hex colors', () => {
  const svg = logoMarkTwoTone();
  const paths = [...svg.matchAll(/<path class="([^"]+)" d="([^"]+)"\/>/g)];
  assert.deepEqual(paths.map(p => p[1]), ['logo-squares', 'logo-arrow']);
  assert.doesNotMatch(svg, /\bfill=/);
  assert.doesNotMatch(svg, /#[0-9a-f]{3,8}\b/i);
  assert.match(svg, /aria-hidden="true"/);
  // the same drawing as the original, split in two
  assert.equal(paths[0][2] + paths[1][2], logoMark().match(/<path d="([^"]+)"/)[1]);
});

test('header logo: HEADER_LOGO picks one of the two marks', () => {
  assert.ok(['original', 'two-tone'].includes(HEADER_LOGO), `unknown HEADER_LOGO: ${HEADER_LOGO}`);
  assert.equal(headerLogo(), HEADER_LOGO === 'two-tone' ? logoMarkTwoTone() : logoMark());
});
