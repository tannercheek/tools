// In-memory stand-in for localStorage in tests. Like the real thing, it keeps
// values as strings and returns null for missing keys.
export function createFakeStorage(initial = {}) {
  const items = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    get length() {
      return items.size;
    },
    key(index) {
      return [...items.keys()][index] ?? null;
    },
    getItem(key) {
      return items.has(key) ? items.get(key) : null;
    },
    setItem(key, value) {
      items.set(key, String(value));
    },
    removeItem(key) {
      items.delete(key);
    },
    clear() {
      items.clear();
    },
  };
}
