// store.js — the only file that calls persist.js's get, set and onStatus.
// It loads the four keys into one in-memory document, validates and migrates
// it, seeds a first run, and saves the keys each change touches. Views read
// `store.state`, call store operations, and re-render on `subscribe`.

import { KEYS, freshDoc, migrate, validate } from './schema.js';

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

    // Operations (addLift, logSession, …) arrive phase by phase, each ending
    // in commit([...the keys it changed]).
  };
}
