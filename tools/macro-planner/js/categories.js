// Food categories (SPEC §3.2): supermarket sections, in the order you'd walk a store.
// One constant, so a category can be added later in one place. Pure: no DOM, so it can be
// tested in Node.

export const CATEGORIES = Object.freeze([
  'Produce',
  'Meat & fish',
  'Dairy & eggs',
  'Tofu & plant protein',
  'Bakery',
  'Grains & pasta',
  'Beans & legumes',
  'Nuts & seeds',
  'Oils & condiments',
  'Snacks & sweets',
  'Supplements',
]);

// Every food, or only those in `category` (SPEC §3.2). null is All. A custom food without a
// category never matches a specific one.
export function filterFoods(foods, category) {
  return category === null ? foods : foods.filter((food) => food.category === category);
}

// The categories these foods use, in store order (SPEC §3.2).
export function categoriesInUse(foods) {
  const used = new Set(foods.map((food) => food.category));
  return CATEGORIES.filter((category) => used.has(category));
}
