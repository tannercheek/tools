// Food search. Pure: no DOM, so it can be tested in Node.

// A word is a run of letters or digits, so "Beef, ground, 90% lean" has the
// words beef, ground, 90 and lean, and punctuation in a query is ignored too.
function words(text) {
  return text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

// Foods with a name word starting with each query word, in any order, so
// "chick bre" finds "Chicken breast, skinless, raw". Archived foods are left out
// (SPEC §3.2). Custom foods come first; within each group the input order is kept.
// A query with no words matches every food that isn't archived.
// foods: bundled and custom food records together, in any order.
export function searchFoods(foods, query) {
  const queryWords = words(query);
  const matches = foods.filter((food) => {
    if (food.archived) return false;
    const nameWords = words(food.name);
    return queryWords.every((queryWord) => nameWords.some((nameWord) => nameWord.startsWith(queryWord)));
  });
  return [...matches.filter((food) => food.custom), ...matches.filter((food) => !food.custom)];
}
