// Passphrase-gated, cross-device persistent state via Firebase Firestore,
// with an instant localStorage fallback so the UI never waits on the network.
//
// Usage:
//   import { syncedState } from '../shared/persist.js';
//   const state = await syncedState('my-tool');
//   state.get('some-key');
//   state.set('some-key', value);
//   state.onStatus(status => ...); // 'synced' | 'saved-locally' | 'offline'

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdfY7Qy8pqImo3iLyGWx5Z8bOeILIZiC8",
  authDomain: "tanners-tools.firebaseapp.com",
  projectId: "tanners-tools",
  storageBucket: "tanners-tools.firebasestorage.app",
  messagingSenderId: "575534576510",
  appId: "1:575534576510:web:182c7167d2398c66ed792f",
};

const PASSPHRASE_KEY = "toolsPassphrase";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// One sign-in per page session, shared by every syncedState() instance.
let signInPromise = null;
function ensureSignedIn() {
  if (!signInPromise) signInPromise = signInAnonymously(auth);
  return signInPromise;
}

// Only asked once per browser (cached), and only right before it's needed.
function passphrase() {
  let p = localStorage.getItem(PASSPHRASE_KEY);
  if (!p) {
    p = window.prompt("Passphrase to save changes:") || "";
    if (p) localStorage.setItem(PASSPHRASE_KEY, p);
  }
  return p;
}

function writeRemote(docId, key, value) {
  const ref = doc(db, "toolState", docId);
  return setDoc(ref, { [key]: value, passphrase: passphrase() }, { merge: true });
}

function localKey(docId) {
  return `toolState:${docId}`;
}

function readLocal(docId) {
  try {
    return JSON.parse(localStorage.getItem(localKey(docId))) || {};
  } catch {
    return {};
  }
}

function writeLocal(docId, data) {
  try {
    localStorage.setItem(localKey(docId), JSON.stringify(data));
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — in-memory
    // state still works for the rest of this page view.
  }
}

export async function syncedState(docId) {
  const data = readLocal(docId);
  const listeners = new Set();
  let status = "offline";

  function setStatus(next) {
    status = next;
    listeners.forEach((fn) => fn(status));
  }

  try {
    await ensureSignedIn();
    const ref = doc(db, "toolState", docId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const remote = snap.data();
      delete remote.passphrase;
      Object.assign(data, remote);
      writeLocal(docId, data);
    }
    setStatus("synced");
  } catch {
    setStatus("offline");
  }

  return {
    get(key) {
      return data[key];
    },

    set(key, value) {
      data[key] = value;
      writeLocal(docId, data);
      setStatus("saved-locally");

      (async () => {
        try {
          await ensureSignedIn();
          await writeRemote(docId, key, value);
          setStatus("synced");
        } catch (err) {
          if (err && err.code !== "permission-denied") {
            setStatus("offline");
            return;
          }

          // Stale passphrase — drop it, ask once more, retry once.
          localStorage.removeItem(PASSPHRASE_KEY);
          try {
            await writeRemote(docId, key, value);
            setStatus("synced");
          } catch {
            setStatus("offline");
          }
        }
      })();
    },

    // fn is called immediately with the current status, then on every change.
    // Returns an unsubscribe function.
    onStatus(fn) {
      listeners.add(fn);
      fn(status);
      return () => listeners.delete(fn);
    },
  };
}
