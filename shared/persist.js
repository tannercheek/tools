// Passphrase-gated, cross-device persistent state via Firebase Firestore,
// with an instant localStorage fallback so the UI never waits on the network.
//
// Usage:
//   import { syncedState, gate } from '../shared/persist.js';
//   await gate('#app'); // optional: keep #app hidden until the passphrase checks out
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
// sessionStorage flag: the cached passphrase already passed a check this session.
const CHECKED_KEY = "toolsPassphraseChecked";
const CHECK_TIMEOUT_MS = 10000;

const WRONG_PHRASE = "That passphrase didn't work.";
const OFFLINE = "Can't check right now — you're offline.";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// One sign-in per page session, shared by every syncedState() instance.
// A failed attempt is dropped so the next call retries (e.g. back online).
let signInPromise = null;
function ensureSignedIn() {
  if (!signInPromise) {
    signInPromise = signInAnonymously(auth).catch((err) => {
      signInPromise = null;
      throw err;
    });
  }
  return signInPromise;
}

// sessionStorage can throw when storage is blocked; then every load just checks again.
function withSession(fn) {
  try {
    return fn(sessionStorage);
  } catch {
    return null;
  }
}

// Only asked once per browser (cached), and only right before it's needed.
async function passphrase() {
  return localStorage.getItem(PASSPHRASE_KEY) || (await askPassphrase());
}

function rememberPassphrase(p) {
  localStorage.setItem(PASSPHRASE_KEY, p);
  withSession((s) => s.setItem(CHECKED_KEY, "1"));
}

// Drops a phrase the server rejected, unless it has already been replaced.
function forgetPassphrase(rejected) {
  if (localStorage.getItem(PASSPHRASE_KEY) === rejected) localStorage.removeItem(PASSPHRASE_KEY);
  withSession((s) => s.removeItem(CHECKED_KEY));
}

// A test write the rules only accept with the right phrase.
// Resolves "ok", "denied" or "offline". Firestore queues writes while offline
// instead of failing them, hence the timeout.
async function checkPhrase(p) {
  if (!navigator.onLine) return "offline";
  const write = (async () => {
    await ensureSignedIn();
    await setDoc(doc(db, "toolState", "_gate"), { passphrase: p, checkedAt: new Date() });
  })();
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timed out")), CHECK_TIMEOUT_MS),
  );
  try {
    await Promise.race([write, timeout]);
    return "ok";
  } catch (err) {
    return err && err.code === "permission-denied" ? "denied" : "offline";
  }
}

async function writeRemote(docId, key, value) {
  const p = await passphrase();
  // Form dismissed: counts as offline, with no second ask.
  if (!p) throw new Error("No passphrase");
  try {
    const ref = doc(db, "toolState", docId);
    await setDoc(ref, { [key]: value, passphrase: p }, { merge: true });
  } catch (err) {
    if (err && err.code === "permission-denied") forgetPassphrase(p);
    throw err;
  }
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

          // Stale passphrase (writeRemote dropped it) — ask once more, retry once.
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

// Keeps the element matching `selector` hidden until the passphrase checks
// out, with the unlock form in its place. Give the element `hidden` in the
// HTML too, so nothing paints before this runs, and no `display` style of its
// own (that would override `hidden`). Checks with the server at most once per
// browser session.
export async function gate(selector) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`gate(): nothing matches ${selector}`);
  el.hidden = true;

  const cached = localStorage.getItem(PASSPHRASE_KEY);
  if (cached) {
    if (withSession((s) => s.getItem(CHECKED_KEY))) {
      el.hidden = false;
      return;
    }
    const result = await checkPhrase(cached);
    if (result === "ok") {
      rememberPassphrase(cached);
      el.hidden = false;
      return;
    }
    if (result === "offline") {
      // This path trusts the device: with no way to check, a phrase cached
      // here is taken as good enough. It isn't remembered for the session,
      // so the next load with a connection checks again.
      el.hidden = false;
      return;
    }
    forgetPassphrase(cached);
  }

  await unlockForm({ target: el, message: navigator.onLine ? "" : OFFLINE });
  el.hidden = false;
}

// One overlay, however many writes are waiting on it.
let asking = null;
function askPassphrase() {
  if (!asking) asking = unlockForm().finally(() => (asking = null));
  return asking;
}

// The unlock form: in place of `target` when gating, otherwise as an overlay.
// Resolves with the phrase once a test write accepts it. The overlay can be
// dismissed like prompt()'s Cancel (Esc, or a click outside), resolving "".
function unlockForm({ target = null, message = "" } = {}) {
  addStyles();

  const form = document.createElement("form");
  form.className = "persist-unlock";

  const input = document.createElement("input");
  input.type = "password";
  input.className = "persist-input";
  input.placeholder = target ? "Passphrase" : "Passphrase to save changes";
  input.autocomplete = "current-password";
  input.setAttribute("aria-label", "Passphrase");

  const button = document.createElement("button");
  button.type = "submit";
  button.className = "persist-button";
  button.textContent = "Unlock";

  const error = document.createElement("p");
  error.className = "persist-error";
  error.setAttribute("role", "alert");
  error.textContent = message;

  form.append(input, button, error);

  let dialog = null;
  if (target) {
    target.before(form);
  } else {
    dialog = document.createElement("dialog");
    dialog.className = "persist-overlay";
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
  }
  input.focus();

  return new Promise((resolve) => {
    if (dialog) {
      // close(phrase) on success; Esc or a click outside closes with "".
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) dialog.close();
      });
      dialog.addEventListener("close", () => {
        dialog.remove();
        resolve(dialog.returnValue);
      });
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const p = input.value;
      if (!p) {
        input.focus();
        return;
      }

      input.disabled = button.disabled = true;
      error.textContent = "";
      const result = await checkPhrase(p);
      input.disabled = button.disabled = false;

      if (result === "ok") {
        rememberPassphrase(p);
        if (dialog) {
          dialog.close(p);
        } else {
          form.remove();
          resolve(p);
        }
        return;
      }
      error.textContent = result === "denied" ? WRONG_PHRASE : OFFLINE;
      input.focus();
      input.select();
    });
  });
}

// Added only once a form is shown, so tools that never show one are untouched.
// Font and colours come from the page.
const STYLES = `
.persist-unlock {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  align-self: flex-start; /* don't stretch inside a flex or grid page */
  gap: 0.5rem;
  box-sizing: border-box;
  width: 100%;
  max-width: 22rem;
  margin: 20vh auto 0;
  padding: 0 1rem;
  color: inherit;
  font: inherit;
}
.persist-input,
.persist-button {
  box-sizing: border-box;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid currentColor;
  border-radius: 0.375rem;
  background: transparent;
  color: inherit;
  font: inherit;
}
.persist-input {
  flex: 1 1 10rem;
  min-width: 0;
}
.persist-button {
  cursor: pointer;
}
.persist-input:disabled,
.persist-button:disabled {
  opacity: 0.5;
  cursor: default;
}
.persist-error {
  flex-basis: 100%;
  min-height: 1.5em;
  margin: 0;
  font-size: 0.875em;
}
.persist-overlay {
  box-sizing: border-box;
  width: min(22rem, calc(100% - 2rem));
  padding: 0;
  border: 1px solid currentColor;
  border-radius: 0.5rem;
  /* The page's own background, so the form reads on any theme. */
  background: inherit;
  color: inherit;
  font: inherit;
}
.persist-overlay .persist-unlock {
  max-width: none;
  margin: 0;
  padding: 1rem 1rem 0.5rem;
}
.persist-overlay::backdrop {
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
`;

let stylesAdded = false;
function addStyles() {
  if (stylesAdded) return;
  stylesAdded = true;
  const style = document.createElement("style");
  style.textContent = STYLES;
  document.head.append(style);
}
