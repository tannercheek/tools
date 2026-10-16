// Stand-in for persist.js's syncedState in tests. Docs live in a shared "cloud" map, so
// two stores made from one fake behave like two browsers. Like persist.js, set() saves at
// once and reports 'saved-locally'; the cloud write lands when the test calls finishWrites().
export function createFakePersist() {
  const cloud = new Map();
  const pending = [];
  const opens = [];
  let online = true;

  async function openDoc(docId) {
    opens.push(docId);
    // Offline, the cloud read fails and this device has no cache of the doc.
    const data = online ? structuredClone(cloud.get(docId) ?? {}) : {};
    const listeners = new Set();
    let status = online ? 'synced' : 'offline';

    function setStatus(next) {
      status = next;
      listeners.forEach((fn) => fn(status));
    }

    return {
      get(key) {
        return data[key];
      },
      set(key, value) {
        data[key] = value;
        setStatus('saved-locally');
        pending.push({
          docId,
          finish(result) {
            if (result === 'synced') cloud.set(docId, { ...cloud.get(docId), [key]: value });
            setStatus(result);
          },
        });
      },
      onStatus(fn) {
        listeners.add(fn);
        fn(status);
        return () => listeners.delete(fn);
      },
    };
  }

  return {
    openDoc,
    cloud,
    opens,
    // Docs opened while offline start empty and report 'offline'. Like Firestore, writes
    // made offline stay in flight ('saved-locally') until finishWrites().
    setOnline(isOnline) {
      online = isOnline;
    },
    // Lands the writes in flight, or only docId's: 'synced', or 'offline' for a failed write.
    finishWrites(result = 'synced', docId) {
      const landing = pending.filter((write) => docId === undefined || write.docId === docId);
      landing.forEach((write) => pending.splice(pending.indexOf(write), 1));
      landing.forEach((write) => write.finish(result));
    },
  };
}
