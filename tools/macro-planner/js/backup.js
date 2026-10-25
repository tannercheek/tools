// Export, import and reset (SPEC §3.8). An export is every doc in one JSON file; importing one
// replaces every doc with it, and reset puts the app back to a first run. Pure: the store is
// passed in, so this never touches window and runs in Node.

import { validSplit } from './calc.js';
import { DAYS_DOC_ID, WEIGHT_DOC_ID, createCoreDoc, pruneDays } from './data.js';
import { lockPastDays } from './lock-in.js';
import { CORE_DOC_ID } from './store.js';

// Every doc the app keeps (SPEC §4.2).
export const DOC_IDS = [CORE_DOC_ID, DAYS_DOC_ID, WEIGHT_DOC_ID];

// Marks a file as ours, so importing some other JSON file is refused.
const BACKUP_APP = 'macro-planner';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// "macro-planner-2026-10-20.json". today: YYYY-MM-DD.
export function backupFileName(today) {
  return `${BACKUP_APP}-${today}.json`;
}

// Thrown by exportDocs when a doc may be missing what's stored elsewhere, so the file wouldn't
// be everything.
export class ExportUnavailableError extends Error {
  constructor() {
    super('Your data hasn’t loaded on this device yet and storage can’t be reached, so there’s nothing complete to export.');
    this.name = 'ExportUnavailableError';
  }
}

// The export: { app, exportedAt, docs } with every doc by id. now: a Date. Rejects with
// ExportUnavailableError when a doc wasn't read from its source of truth and reads as empty,
// since it may just be a read that failed, like the days' and weight log's writes.
export async function exportDocs(store, now) {
  const [core, days, weight] = await Promise.all(DOC_IDS.map((docId) => store.load(docId)));
  const unread = async (docId, empty) => empty && !(await store.loaded(docId));
  // loadCoreDoc saves a first-run doc whenever that's safe, so a missing one was never loaded.
  if (
    !core.schemaVersion ||
    (await unread(DAYS_DOC_ID, Object.keys(days).length === 0)) ||
    (await unread(WEIGHT_DOC_ID, !weight.weighIns))
  ) {
    throw new ExportUnavailableError();
  }
  return {
    app: BACKUP_APP,
    exportedAt: now.toISOString(),
    docs: { [CORE_DOC_ID]: core, [DAYS_DOC_ID]: days, [WEIGHT_DOC_ID]: weight },
  };
}

// Thrown by readBackup, with a message to show.
export class BackupError extends Error {
  constructor(message) {
    super(message);
    this.name = 'BackupError';
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A doc without a macro split is by bodyweight (SPEC §3.1). Percents are only saved once they
// add up, and by percent the targets are worked out from them.
function isMacroSplit(split) {
  if (split == null) return true;
  return (
    isObject(split) &&
    ['bodyweight', 'percent'].includes(split.by) &&
    (validSplit(split.percent) || (split.by === 'bodyweight' && split.percent === undefined))
  );
}

// Enough of the shape that the app can open on it. The core doc's schemaVersion says which
// shape it is; 1 is the only one so far.
function isCoreDoc(doc) {
  return (
    isObject(doc) &&
    doc.schemaVersion === 1 &&
    DATE_PATTERN.test(doc.startedOn) &&
    [doc.profile, doc.overrides, doc.settings, doc.template].every(isObject) &&
    [doc.slots, doc.foods, doc.meals].every(Array.isArray) &&
    isMacroSplit(doc.macroSplit)
  );
}

function isDaysDoc(doc) {
  return isObject(doc) && Object.entries(doc).every(([date, day]) => DATE_PATTERN.test(date) && isObject(day));
}

// weighIns may be missing: a log nothing was ever saved to exports as {}.
function isWeightDoc(doc) {
  if (!isObject(doc)) return false;
  if (doc.weighIns === undefined) return true;
  return (
    Array.isArray(doc.weighIns) &&
    doc.weighIns.every((w) => isObject(w) && DATE_PATTERN.test(w.date) && Number.isFinite(w.kg) && w.kg > 0)
  );
}

// The docs in an export's text, by id, or a BackupError saying why it can't be imported.
export function readBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    backup = null;
  }
  if (!isObject(backup) || backup.app !== BACKUP_APP || !isObject(backup.docs)) {
    throw new BackupError('That file isn’t a Macro Planner export, so nothing was imported.');
  }
  const docs = backup.docs;
  if (!isCoreDoc(docs[CORE_DOC_ID]) || !isDaysDoc(docs[DAYS_DOC_ID]) || !isWeightDoc(docs[WEIGHT_DOC_ID])) {
    throw new BackupError('That export is incomplete or damaged, so nothing was imported.');
  }
  return docs;
}

// Replaces every doc with readBackup's docs. The days are saved like any days save, dropping
// those before 7 days ago (SPEC §4.3), and with their past days locked, as on app load (SPEC
// §3.5), since an older export can hold days that have passed since. bundledFoods: for lock-in.
export async function importDocs(store, docs, today, bundledFoods) {
  const core = docs[CORE_DOC_ID];
  const foods = [...core.foods, ...bundledFoods];
  const days = lockPastDays(pruneDays(docs[DAYS_DOC_ID], today), today, core, foods);
  await store.save(CORE_DOC_ID, core);
  await store.save(DAYS_DOC_ID, days);
  await store.save(WEIGHT_DOC_ID, { weighIns: docs[WEIGHT_DOC_ID].weighIns ?? [] });
}

// Back to a first run on `today`: no days, no weigh-ins, and a new core doc with an empty
// profile, saved straight away like loadCoreDoc's, so startedOn is the day of the reset.
export async function resetDocs(store, today) {
  await store.remove(DAYS_DOC_ID);
  await store.remove(WEIGHT_DOC_ID);
  await store.save(CORE_DOC_ID, createCoreDoc(today));
}
