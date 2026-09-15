#!/usr/bin/env node
/**
 * Scans /tools and /archive, reads the meta tags out of each tool's HTML,
 * and writes tools.json for the dashboard to read.
 *
 * A tool is either:
 *   tools/packing-checklist.html          → url: tools/packing-checklist.html
 *   tools/flow-sketcher/index.html        → url: tools/flow-sketcher/
 *
 * Run locally with:  node scripts/build-index.mjs
 * Runs automatically on push via .github/workflows/build-index.yml
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename, extname } from 'node:path';

const DIRS = [
  { dir: 'tools',   archived: false },
  { dir: 'archive', archived: true  }
];

const SYNC_MODULE = /shared\/persist\.js/;

/* ── tiny HTML head parser ──────────────────────────── */

function attr(tag, key) {
  const m = tag.match(new RegExp(`\\b${key}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4]) : null;
}

function decode(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .trim();
}

function parseHead(html) {
  // only look above </head> so stray markup in the body can't confuse us
  const head = html.split(/<\/head>/i)[0] || html;

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decode(titleMatch[1].replace(/\s+/g, ' ')) : null;

  const meta = {};
  for (const tag of head.match(/<meta\b[^>]*>/gi) || []) {
    const name = attr(tag, 'name');
    if (name) meta[name.toLowerCase()] = decode(attr(tag, 'content') ?? '');
  }
  return { title, meta };
}

/* ── helpers ────────────────────────────────────────── */

function titleFromFilename(path) {
  const stem = basename(path, extname(path)).replace(/[-_]+/g, ' ').trim();
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

// last commit date for a path — used to flag recently touched tools
function lastTouched(path) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI', '--', path], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return out || null;
  } catch { return null; }
}

function usesSync(html) {
  return SYNC_MODULE.test(html);
}

/* ── walk the folders ───────────────────────────────── */

function collect({ dir, archived }) {
  if (!existsSync(dir)) return [];
  const found = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;

    let file, url;

    if (entry.isFile() && /\.html?$/i.test(entry.name)) {
      // single-file tool
      file = join(dir, entry.name);
      url  = `${dir}/${entry.name}`;
    } else if (entry.isDirectory()) {
      // multi-file tool — must have an index.html
      const idx = join(dir, entry.name, 'index.html');
      if (!existsSync(idx)) {
        console.warn(`  skipped ${dir}/${entry.name}/ — no index.html inside`);
        continue;
      }
      file = idx;
      url  = `${dir}/${entry.name}/`;
    } else {
      continue;
    }

    const html = readFileSync(file, 'utf8');
    const { title, meta } = parseHead(html);

    if (meta.dashboard === 'ignore') continue;

    const updated = lastTouched(file);

    found.push({
      name: title || titleFromFilename(file),
      desc: meta.description || '',
      icon: meta.icon || 'folder',
      tags: (meta.tags || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean),
      url,
      updated,
      ...(usesSync(html) ? { synced: true } : {}),
      ...(archived ? { archived: true } : {})
    });
  }
  return found;
}

/* ── write it out ───────────────────────────────────── */

const tools = DIRS.flatMap(collect)
  // alphabetical, so the drawer reads like a drawer.
  // swap for  (a,b) => (b.updated||'').localeCompare(a.updated||'')  to float recent work to the top.
  .sort((a, b) => a.name.localeCompare(b.name));

writeFileSync('tools.json', JSON.stringify(tools, null, 2) + '\n');

const live = tools.filter(t => !t.archived).length;
console.log(`tools.json → ${live} live, ${tools.length - live} archived`);
for (const t of tools) {
  console.log(`  ${t.archived ? '·' : '✓'} ${t.name.padEnd(24)} ${t.url}${t.desc ? '' : '   ⚠ no description'}`);
}
