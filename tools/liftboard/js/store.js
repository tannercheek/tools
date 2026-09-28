// store.js — the only file that calls persist.js's get, set and onStatus.
// It loads the four keys into one in-memory document, validates and migrates
// it, seeds a first run, and saves the keys each change touches. Views read
// `store.state`, call store operations, and re-render on `subscribe`.

import { KEYS, freshDoc, migrate, validate, newLiftId, newSessionId } from './schema.js';
import { PATTERNS } from './library.js';
import { round2, summarizeSession } from './derive.js';

/** The editable fields of a lift, tidied: a trimmed, non-empty name and a
 *  known pattern. Throws on an empty name — the editor never allows one. */
function liftFields({ name, pattern, isBodyweight, notes }) {
  const clean = {
    name: String(name ?? '').trim(),
    pattern: pattern in PATTERNS ? pattern : 'accessory',
    isBodyweight: Boolean(isBodyweight),
    notes: String(notes ?? ''),
  };
  if (clean.name === '') throw new Error('A lift needs a name');
  return clean;
}

/** @param persist  what syncedState('liftboard') returned (or a test fake) */
export function createStore(persist) {
  let doc = null;
  let loadError = null;
  const subscribers = new Set();

  /** Saves the given keys. Copies go to persist.js, which keeps what it's handed. */
  function write(keys) {
    if (loadError) return;   // never overwrite data that failed to load
    for (const key of keys) persist.set(key, structuredClone(doc[key]));
  }

  /** Every operation ends here: save what changed, then tell the views. */
  function commit(keys) {
    write(keys);
    subscribers.forEach(fn => fn(doc));
  }

  // ── Load ──
  const raw = Object.fromEntries(KEYS.map(k => [k, persist.get(k)]));
  if (KEYS.every(k => raw[k] === undefined)) {
    doc = freshDoc();   // first run: default settings and the seeded tags
    write(KEYS);
  } else {
    loadError = validate(raw);
    if (!loadError) {
      const loadedVersion = raw.schemaVersion;
      doc = migrate(structuredClone(raw));
      if (loadedVersion !== undefined && loadedVersion !== doc.schemaVersion) write(KEYS);
    }
  }

  return {
    /** Why saved data couldn't be read, or null. When set, nothing is saved. */
    get loadError() { return loadError; },

    /** The current document. Read it; never change it — use an operation. */
    get state() { return doc; },

    /** Calls fn after every change. Returns an unsubscribe function. */
    subscribe(fn) {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },

    /** persist.js's save status: 'synced' | 'saved-locally' | 'offline'.
     *  Calls fn now and on every change; returns an unsubscribe function. */
    onSyncStatus(fn) {
      return persist.onStatus(fn);
    },

    /** The lift with this id, or null. */
    lift(id) {
      return doc.lifts.find(l => l.id === id) ?? null;
    },

    // ── Operations: each changes the document, then commit()s the keys it touched ──

    /** Adds a lift at the end of the custom order, untagged, never logged.
     *  Returns its id. */
    addLift(fields) {
      const lift = {
        id: newLiftId(),
        ...liftFields(fields),
        sortOrder: Math.max(-1, ...doc.lifts.map(l => l.sortOrder)) + 1,
        createdAt: new Date().toISOString(),
        tagIds: [],
        lastSets: [],
        sessions: [],
      };
      doc.lifts.push(lift);
      commit(['lifts']);
      return lift.id;
    },

    /** Changes a lift's name, pattern, bodyweight flag or notes. */
    updateLift(id, changes) {
      const lift = this.lift(id);
      if (!lift) return;
      Object.assign(lift, liftFields({ ...lift, ...changes }));
      commit(['lifts']);
    },

    /**
     * The only way a session is created. Does exactly two things: replaces the
     * lift's lastSets with these sets, and appends one session summary.
     * `sets` are [{ weightKg, reps }]; weights are rounded to 2 decimals.
     * Returns the new session's id.
     */
    logSession(liftId, sets, now = new Date()) {
      const lift = this.lift(liftId);
      if (!lift) throw new Error('No such lift');
      if (!Array.isArray(sets) || sets.length === 0) throw new Error('A session needs at least one set');
      const clean = sets.map(s => ({ weightKg: round2(s.weightKg), reps: s.reps }));
      for (const s of clean) {
        const minWeightOk = lift.isBodyweight ? s.weightKg >= 0 : s.weightKg > 0;
        if (!Number.isFinite(s.weightKg) || !minWeightOk) throw new Error('Invalid weight');
        if (!Number.isInteger(s.reps) || s.reps < 1 || s.reps > 100) throw new Error('Invalid reps');
      }
      const session = {
        id: newSessionId(new Set(lift.sessions.map(s => s.id))),
        ...summarizeSession(clean, now),
      };
      lift.lastSets = clean;
      lift.sessions.push(session);
      commit(['lifts']);
      return session.id;
    },

    /** Replaces every tag and lift (the sample-data loader; import will use it
     *  too). Settings are kept, except the tag filter, since tag ids change.
     *  Refuses anything that wouldn't pass the load-time checks. */
    replaceAll({ tags, lifts }) {
      const problem = validate({ tags, lifts });
      if (problem) throw new Error(`Can't replace the data: ${problem}`);
      doc = migrate({ ...doc, tags: structuredClone(tags), lifts: structuredClone(lifts) });
      doc.settings.filterTagIds = [];
      commit(['settings', 'tags', 'lifts']);
    },

    /** Deletes a lift and its sessions. Tags are left alone. */
    deleteLift(id) {
      doc.lifts = doc.lifts.filter(l => l.id !== id);
      commit(['lifts']);
    },
  };
}
