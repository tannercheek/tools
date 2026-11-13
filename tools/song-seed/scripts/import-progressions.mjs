// Turns chord-progression MIDI files into data/progressions.js entries, so my
// own progressions join the library. A MIDI file has notes but no key, so the
// tonic and mode are guessed from the chords and marked `// check`, with the
// chord names it heard. Prints the entries; pasting them into
// progressions.js is left to you. The reading itself is in js/midi-import.js,
// shared with the app's Import MIDI dialog.
//
//   node scripts/import-progressions.mjs <folder>
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { progressionFromMidi, formatProgression } from '../js/midi-import.js';
import { PROGRESSIONS } from '../js/data/progressions.js';

function main(folder) {
  if (!folder) {
    console.error('Usage: node scripts/import-progressions.mjs <folder of .mid files>');
    process.exit(1);
  }
  const files = readdirSync(folder).filter((f) => /\.mid$/i.test(f)).sort();
  if (!files.length) {
    console.error(`No .mid files in ${folder}`);
    process.exit(1);
  }
  const existing = new Set(PROGRESSIONS.map((p) => p.id));
  let made = 0;
  for (const file of files) {
    try {
      console.log(formatProgression(progressionFromMidi(file.replace(/\.mid$/i, ''), readFileSync(join(folder, file))), existing));
      made++;
    } catch (err) {
      console.log(`  // ${file}: skipped (${err.message})`);
    }
  }
  console.error(`${made} of ${files.length} files turned into progressions.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv[2]);
