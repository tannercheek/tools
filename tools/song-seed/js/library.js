// Gathers the data files into one library object with id lookups.
import { GROOVES } from './data/grooves.js';
import { STRUMS } from './data/strums.js';
import { PROGRESSIONS } from './data/progressions.js';

// My strums (PLAN step 14), grooves and progressions (step 17) come from the
// synced store. Each follows its built-ins in the list and the id lookup, so
// rolls and the selects see both. A My entry whose id is now a built-in (made
// one with the scripts) is left out; the built-in wins.
export function buildLibrary({ grooves, strums, progressions, myStrums = [], myGrooves = [], myProgressions = [] }) {
  const join = (builtIn, mine) => {
    const ids = new Set(builtIn.map((x) => x.id));
    const kept = mine.filter((x) => !ids.has(x.id));
    return { all: [...builtIn, ...kept], kept };
  };
  const s = join(strums, myStrums), g = join(grooves, myGrooves), p = join(progressions, myProgressions);
  return {
    grooves: g.all, strums: s.all, progressions: p.all,
    builtInGrooves: grooves, builtInStrums: strums, builtInProgressions: progressions,
    myGrooves: g.kept, myStrums: s.kept, myProgressions: p.kept,
    grooveById: new Map(g.all.map((x) => [x.id, x])),
    strumById: new Map(s.all.map((x) => [x.id, x])),
    progressionById: new Map(p.all.map((x) => [x.id, x])),
  };
}

// The same library with these My lists in place of the last ones. A list
// that's left out is kept.
export const withMine = (lib, { strums = lib.myStrums, grooves = lib.myGrooves, progressions = lib.myProgressions } = {}) =>
  buildLibrary({
    grooves: lib.builtInGrooves, strums: lib.builtInStrums, progressions: lib.builtInProgressions,
    myStrums: strums, myGrooves: grooves, myProgressions: progressions,
  });

export const LIB = buildLibrary({ grooves: GROOVES, strums: STRUMS, progressions: PROGRESSIONS });
