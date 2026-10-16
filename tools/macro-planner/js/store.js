// Storage adapter. Every adapter has the same four async methods:
//   load(docId)        → the stored object, or {} if there is none
//   save(docId, data)  → full-document write
//   remove(docId)      → delete a document
//   list(prefix)       → docIds starting with prefix, sorted
//   loaded(docId)      → whether this page read the doc from its source of truth. A doc
//                        that wasn't may be missing what's stored elsewhere, so building a
//                        write on it can overwrite the real doc.
// Pure: Storage and persist.js are passed in, so this never touches window and runs in Node.

export const CORE_DOC_ID = 'macro-planner';

// Same key scheme as shared/persist.js's local cache.
const KEY_PREFIX = 'toolState:';

function keyFor(docId) {
  return KEY_PREFIX + docId;
}

// localStorage only. This app doesn't use it: it's kept, tested, for a future public
// version ported to its own repo without Firestore (SPEC §4.1).
// storage: anything with the Web Storage API (localStorage, or a fake in tests).
export function createLocalStore(storage) {
  return {
    async load(docId) {
      try {
        return JSON.parse(storage.getItem(keyFor(docId))) || {};
      } catch {
        // Missing, corrupt or blocked storage all read as an empty doc.
        return {};
      }
    },

    // Throws if storage is full or blocked, so a failed write is never silent.
    async save(docId, data) {
      storage.setItem(keyFor(docId), JSON.stringify(data));
    },

    async remove(docId) {
      storage.removeItem(keyFor(docId));
    },

    async list(prefix) {
      const docIds = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key !== null && key.startsWith(keyFor(prefix))) docIds.push(key.slice(KEY_PREFIX.length));
      }
      return docIds.sort();
    },

    // localStorage is the only copy, so every read reaches it.
    async loaded() {
      return true;
    },
  };
}

// persist.js writes each key with Firestore's merge, which merges nested objects, so a
// key deleted inside one would come back on the next load. Keeping the whole doc as one
// JSON string under one key makes save a true full-document replace.
const DOC_KEY = 'json';
// persist.js can't delete or list docs (SPEC §4.1), so the core doc keeps an index of
// every docId saved, and remove blanks a doc instead of deleting it.
const INDEX_KEY = 'docIds';

// openDoc: persist.js's syncedState, or createLocalPersist below.
// Opens the core doc before resolving, so the sync status is known before first render.
export async function createPersonalStore(openDoc) {
  const opened = new Map();
  // docId → whether its first read this page reached the cloud.
  const readFromCloud = new Map();
  const inFlight = new Set();
  const listeners = new Set();
  let settled;
  let status;

  // Saving while any doc has a cloud write in flight, otherwise whatever settled last.
  function report(docId, docStatus) {
    if (docStatus === 'saved-locally') {
      inFlight.add(docId);
    } else {
      inFlight.delete(docId);
      settled = docStatus;
    }
    const next = inFlight.size ? 'saved-locally' : settled;
    if (next === status) return;
    status = next;
    listeners.forEach((fn) => fn(status));
  }

  // syncedState fetches from the cloud on every call, so each doc is opened once.
  function open(docId) {
    if (!opened.has(docId)) {
      opened.set(
        docId,
        openDoc(docId).then((state) => {
          // syncedState reports its open's outcome first: 'synced' if the cloud read worked.
          state.onStatus((docStatus) => {
            if (!readFromCloud.has(docId)) readFromCloud.set(docId, docStatus === 'synced');
            report(docId, docStatus);
          });
          return state;
        }),
      );
    }
    return opened.get(docId);
  }

  async function setIndexed(docId, isIndexed) {
    const index = await open(CORE_DOC_ID);
    const docIds = index.get(INDEX_KEY) ?? [];
    if (docIds.includes(docId) === isIndexed) return;
    const next = isIndexed ? [...docIds, docId].sort() : docIds.filter((id) => id !== docId);
    index.set(INDEX_KEY, next);
  }

  await open(CORE_DOC_ID);

  return {
    async load(docId) {
      try {
        return JSON.parse((await open(docId)).get(DOC_KEY)) || {};
      } catch {
        return {};
      }
    },

    async save(docId, data) {
      (await open(docId)).set(DOC_KEY, JSON.stringify(data));
      await setIndexed(docId, true);
    },

    async remove(docId) {
      (await open(docId)).set(DOC_KEY, null);
      await setIndexed(docId, false);
    },

    async list(prefix) {
      const docIds = (await open(CORE_DOC_ID)).get(INDEX_KEY) ?? [];
      return docIds.filter((id) => id.startsWith(prefix));
    },

    // Per doc and never refreshed, since syncedState only reads the cloud when it opens.
    async loaded(docId) {
      await open(docId);
      return readFromCloud.get(docId);
    },

    // persist.js's status: 'synced' | 'saved-locally' | 'offline'.
    // Calls fn now and on every change; returns an unsubscribe function.
    onStatus(fn) {
      listeners.add(fn);
      fn(status);
      return () => listeners.delete(fn);
    },
  };
}

// Stands in for syncedState when persist.js fails to import. It uses persist.js's local
// cache keys and shape, so it reads what persist.js last cached on this device. It never
// reaches the cloud, so it always reports offline (SPEC §4.1).
export function createLocalPersist(storage) {
  return async function openDoc(docId) {
    let data;
    try {
      data = JSON.parse(storage.getItem(keyFor(docId))) || {};
    } catch {
      data = {};
    }
    return {
      get(key) {
        return data[key];
      },
      // Throws if storage is full or blocked, like createLocalStore's save.
      set(key, value) {
        data[key] = value;
        storage.setItem(keyFor(docId), JSON.stringify(data));
      },
      onStatus(fn) {
        fn('offline');
        return () => {};
      },
    };
  };
}
