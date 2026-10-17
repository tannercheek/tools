// The bundled food database, data/foods.json: fetched once, then kept in memory (SPEC §3.2).

let request = null;

// Resolves to the bundled food records. A failed fetch isn't kept, so the next call tries again.
export function loadBundledFoods() {
  request ??= fetch(new URL('../data/foods.json', import.meta.url))
    .then((response) => {
      if (!response.ok) throw new Error(`foods.json: HTTP ${response.status}`);
      return response.json();
    })
    .catch((error) => {
      request = null;
      throw error;
    });
  return request;
}
