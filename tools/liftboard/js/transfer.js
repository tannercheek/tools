// transfer.js — the export file, and reading one back for import. Pure.
// The file uses the same shape as the LiftBoard iOS app's export: tags by
// name, lifts with `tags` (names) and `history` (session summaries), no ids,
// no settings. Import validates every field; one bad record rejects the file.

import { SCHEMA_VERSION, newLiftId, newTagId, newSessionId, validate } from './schema.js';
import { PATTERNS } from './library.js';
import { history, round2 } from './derive.js';

const bySortOrder = (a, b) => a.sortOrder - b.sortOrder;

/** The export file as an object (JSON.stringify it to save). */
export function toExportFile(doc, now = new Date()) {
  const tags = [...doc.tags].sort(bySortOrder);
  const nameOf = new Map(tags.map(t => [t.id, t.name]));
  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    tags: tags.map(t => ({ name: t.name })),
    lifts: [...doc.lifts].sort(bySortOrder).map(l => ({
      name: l.name,
      pattern: l.pattern,
      isBodyweight: l.isBodyweight,
      notes: l.notes,
      tags: l.tagIds.map(id => nameOf.get(id)).filter(Boolean),
      lastSets: l.lastSets.map(({ weightKg, reps }) => ({ weightKg, reps })),
      history: history(l).map(({ date, bestE1RMKg, topWeightKg, topReps }) => ({ date, bestE1RMKg, topWeightKg, topReps })),
    })),
  };
}

/** "liftboard-2026-09-22.json", by the local date. */
export function exportFileName(now = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `liftboard-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** An import problem, worded for the person reading it. */
export class ImportError extends Error {}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isReps = v => Number.isInteger(v) && v >= 1 && v <= 100;
const isName = v => typeof v === 'string' && v.trim() !== '';

function checkLift(l) {
  if (!isObj(l)) return 'it isn’t a lift record';
  if (!isName(l.name)) return 'it has no name';
  if (!(l.pattern in PATTERNS)) return `its movement pattern "${l.pattern}" isn’t one LiftBoard knows`;
  if (l.isBodyweight !== undefined && typeof l.isBodyweight !== 'boolean') return 'its bodyweight flag isn’t true or false';
  if (l.notes !== undefined && typeof l.notes !== 'string') return 'its notes aren’t text';
  if (l.tags !== undefined && !(Array.isArray(l.tags) && l.tags.every(isName))) return 'its tags aren’t a list of names';
  if (l.lastSets !== undefined && !Array.isArray(l.lastSets)) return 'its last sets aren’t a list';
  for (const s of l.lastSets ?? []) {
    if (!isObj(s) || !isNum(s.weightKg) || s.weightKg < 0 || !isReps(s.reps)) return 'one of its last sets has a bad weight or rep count';
  }
  if (l.history !== undefined && !Array.isArray(l.history)) return 'its history isn’t a list';
  for (const s of l.history ?? []) {
    if (!isObj(s) || typeof s.date !== 'string' || Number.isNaN(Date.parse(s.date))) return 'a session in its history has a bad date';
    if (!isNum(s.bestE1RMKg) || s.bestE1RMKg < 0 || !isNum(s.topWeightKg) || s.topWeightKg < 0 || !isReps(s.topReps)) {
      return `the ${s.date.slice(0, 10)} session in its history has bad numbers`;
    }
  }
  return null;
}

/**
 * Reads an export file (already parsed from JSON) into fresh { tags, lifts }
 * with new ids, ready for store.replaceAll. Throws an ImportError saying what's
 * wrong, naming the lift, if anything in the file is off.
 */
export function fromExportFile(data, now = new Date()) {
  if (!isObj(data) || data.schemaVersion === undefined) {
    throw new ImportError('This file isn’t a LiftBoard export, so nothing was imported.');
  }
  if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1) {
    throw new ImportError('This file’s version number isn’t valid, so nothing was imported.');
  }
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new ImportError('This file is from a newer version of LiftBoard, so it can’t be imported here.');
  }
  if (!Array.isArray(data.tags) || !Array.isArray(data.lifts)) {
    throw new ImportError('This file is missing its tags or lifts, so nothing was imported.');
  }

  // Tags: names are unique ignoring case; a repeated name reuses the first.
  const tags = [];
  const tagIdByName = new Map();
  const tagFor = name => {
    const key = name.trim().toLowerCase();
    if (!tagIdByName.has(key)) {
      const tag = { id: newTagId(), name: name.trim(), sortOrder: tags.length };
      tags.push(tag);
      tagIdByName.set(key, tag.id);
    }
    return tagIdByName.get(key);
  };
  data.tags.forEach((t, i) => {
    if (!isObj(t) || !isName(t.name)) throw new ImportError(`Tag ${i + 1} in this file has no name, so nothing was imported.`);
    tagFor(t.name);
  });

  const lifts = data.lifts.map((l, i) => {
    const problem = checkLift(l);
    if (problem) {
      const which = isObj(l) && isName(l.name) ? `“${l.name.trim()}”` : `Lift ${i + 1}`;
      throw new ImportError(`${which} can’t be imported: ${problem}. Nothing was imported.`);
    }
    const sessions = [];
    const past = [...(l.history ?? [])].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    for (const s of past) {
      sessions.push({
        id: newSessionId(new Set(sessions.map(x => x.id))),
        date: new Date(s.date).toISOString(),
        bestE1RMKg: round2(s.bestE1RMKg),
        topWeightKg: round2(s.topWeightKg),
        topReps: s.topReps,
      });
    }
    return {
      id: newLiftId(),
      name: l.name.trim(),
      pattern: l.pattern,
      isBodyweight: l.isBodyweight ?? false,
      notes: l.notes ?? '',
      sortOrder: i,
      createdAt: sessions[0]?.date ?? now.toISOString(),
      tagIds: [...new Set((l.tags ?? []).map(tagFor))],
      lastSets: (l.lastSets ?? []).map(s => ({ weightKg: round2(s.weightKg), reps: s.reps })),
      sessions,
    };
  });

  const problem = validate({ tags, lifts });   // belt and braces: the same checks as saved data
  if (problem) throw new ImportError(`This file couldn’t be read (${problem}), so nothing was imported.`);
  return { tags, lifts };
}
