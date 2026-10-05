// schema.js — the shape of LiftBoard's saved data: its defaults, how a first
// run is seeded, how older data is upgraded (migrate), and how saved data is
// checked before it's trusted (validate). Pure; store.js does the saving.

import { PATTERNS, EQUIPMENT, equipmentFromLegacy } from './library.js';

export const SCHEMA_VERSION = 2;

/** The four persist.js keys. There's no way to list keys, so these are fixed. */
export const KEYS = ['schemaVersion', 'settings', 'tags', 'lifts'];

export const SEED_TAGS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower'];

export const CHOICES = {
  unit: ['lb', 'kg'],
  accent: ['cobalt', 'brick', 'ink'],
  retention: ['6m', '1y', '2y'],
  sort: ['custom', 'recent', 'name', 'e1rm'],
};

export const DEFAULT_SETTINGS = {
  unit: 'lb', accent: 'cobalt', retention: '1y', sort: 'custom', filterTagIds: [],
};

/* ── Ids ── */

export const newLiftId = () => `l-${crypto.randomUUID()}`;
export const newTagId = () => `t-${crypto.randomUUID()}`;

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** "s-" plus 8 random letters and digits, regenerated if `taken` (a Set of the
 *  lift's existing session ids) already has it. */
export function newSessionId(taken = new Set()) {
  for (;;) {
    let id = 's-';
    while (id.length < 10) {
      const [byte] = crypto.getRandomValues(new Uint8Array(1));
      if (byte < 252) id += ID_CHARS[byte % 36];   // 252 = 7 × 36, so every character is equally likely
    }
    if (!taken.has(id)) return id;
  }
}

/* ── Tidying and ordering (used by store.js) ── */

/** The editable fields of a lift, tidied: a trimmed, non-empty name, a known
 *  pattern and known equipment. Throws on an empty name — the editor never allows one. */
export function liftFields({ name, pattern, equipment, notes }) {
  const clean = {
    name: String(name ?? '').trim(),
    pattern: pattern in PATTERNS ? pattern : 'accessory',
    equipment: Object.hasOwn(EQUIPMENT, equipment ?? '') ? equipment : 'other',
    notes: String(notes ?? ''),
  };
  if (clean.name === '') throw new Error('A lift needs a name');
  return clean;
}

/** Moves one record up (-1) or down (+1) in custom order, then renumbers
 *  sortOrder 0, 1, 2… Returns false when it's already at that end. */
export function moveInOrder(list, id, direction) {
  const ordered = [...list].sort((a, b) => a.sortOrder - b.sortOrder);
  const i = ordered.findIndex(r => r.id === id);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= ordered.length) return false;
  [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
  ordered.forEach((r, n) => { r.sortOrder = n; });
  return true;
}

/* ── First run ── */

export function freshDoc() {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: structuredClone(DEFAULT_SETTINGS),
    tags: SEED_TAGS.map((name, sortOrder) => ({ id: newTagId(), name, sortOrder })),
    lifts: [],
  };
}

/* ── Validation ── */

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = v => typeof v === 'string' && v !== '';
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isReps = v => Number.isInteger(v) && v >= 1 && v <= 100;
const optional = (v, test) => v === undefined || test(v);

function checkSet(s) {
  return isObj(s) && isNum(s.weightKg) && s.weightKg >= 0 && isReps(s.reps);
}

function checkSession(s) {
  return isObj(s) && isStr(s.id) && isStr(s.date) && !Number.isNaN(Date.parse(s.date))
    && isNum(s.bestE1RMKg) && s.bestE1RMKg >= 0
    && isNum(s.topWeightKg) && s.topWeightKg >= 0 && isReps(s.topReps);
}

function checkLift(l) {
  if (!isObj(l)) return 'not an object';
  if (!isStr(l.id)) return 'missing id';
  if (typeof l.name !== 'string') return 'missing name';
  if (!isStr(l.pattern)) return 'missing pattern';
  if (!isNum(l.sortOrder)) return 'missing sortOrder';
  if (!isStr(l.createdAt)) return 'missing createdAt';
  if (!optional(l.equipment, v => typeof v === 'string' && Object.hasOwn(EQUIPMENT, v))) return 'unknown equipment';
  if (!optional(l.isBodyweight, v => typeof v === 'boolean')) return 'bad isBodyweight';   // version 1 only
  if (!optional(l.notes, v => typeof v === 'string')) return 'bad notes';
  if (!optional(l.tagIds, v => Array.isArray(v) && v.every(isStr))) return 'bad tagIds';
  if (!optional(l.lastSets, v => Array.isArray(v) && v.every(checkSet))) return 'bad lastSets';
  if (!optional(l.sessions, v => Array.isArray(v) && v.every(checkSession))) return 'bad sessions';
  const ids = (l.sessions ?? []).map(s => s.id);
  if (new Set(ids).size !== ids.length) return 'duplicate session ids';
  return null;
}

/** Checks raw saved values (any of which may be undefined, meaning "not saved
 *  yet"). Returns null when they can be trusted, or a short reason when not.
 *  Wrong types, missing required fields and unknown setting values all fail:
 *  guessing could let a later save erase real data. */
export function validate(raw) {
  const v = raw.schemaVersion;
  if (!optional(v, x => Number.isInteger(x) && x >= 1)) return 'schemaVersion is not a version number';
  if (v > SCHEMA_VERSION) return `schemaVersion ${v} is newer than this LiftBoard understands`;

  if (!optional(raw.settings, isObj)) return 'settings is not an object';
  for (const [key, choices] of Object.entries(CHOICES)) {
    const value = raw.settings?.[key];
    if (value !== undefined && !choices.includes(value)) return `settings.${key} is "${value}"`;
  }
  if (!optional(raw.settings?.filterTagIds, x => Array.isArray(x) && x.every(isStr))) return 'settings.filterTagIds is not a list of ids';

  if (!optional(raw.tags, Array.isArray)) return 'tags is not a list';
  for (const [i, t] of (raw.tags ?? []).entries()) {
    if (!isObj(t) || !isStr(t.id) || typeof t.name !== 'string' || !isNum(t.sortOrder)) return `tag ${i + 1} is malformed`;
  }
  if (new Set((raw.tags ?? []).map(t => t.id)).size !== (raw.tags ?? []).length) return 'duplicate tag ids';

  if (!optional(raw.lifts, Array.isArray)) return 'lifts is not a list';
  for (const [i, l] of (raw.lifts ?? []).entries()) {
    const problem = checkLift(l);
    if (problem) return `lift ${i + 1} (${typeof l?.name === 'string' ? l.name : 'unnamed'}): ${problem}`;
  }
  if (new Set((raw.lifts ?? []).map(l => l.id)).size !== (raw.lifts ?? []).length) return 'duplicate lift ids';
  return null;
}

/* ── Migration ── */

/** Upgrades validated data to the current schema, step by step, and fills a
 *  default for every field that may be missing. Takes a copy and returns it. */
export function migrate(raw) {
  const doc = {
    schemaVersion: raw.schemaVersion ?? 1,   // saved data without a version predates version 2
    settings: { ...structuredClone(DEFAULT_SETTINGS), ...raw.settings },
    tags: raw.tags ?? [],
    lifts: (raw.lifts ?? []).map(l => ({ notes: '', tagIds: [], lastSets: [], sessions: [], ...l })),
  };
  // 1 → 2: equipment replaces the bodyweight flag (see library.equipmentFromLegacy).
  if (doc.schemaVersion === 1) {
    doc.lifts = doc.lifts.map(({ isBodyweight, ...l }) => ({ ...l, equipment: equipmentFromLegacy({ ...l, isBodyweight }) }));
    doc.schemaVersion = 2;
  }
  // Later versions add their steps here, after this one.
  doc.lifts = doc.lifts.map(l => ({ equipment: 'other', ...l }));
  return doc;
}
