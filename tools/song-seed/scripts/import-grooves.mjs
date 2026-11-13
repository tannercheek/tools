// Turns Logic drum MIDI files into data/grooves.js entries, so the app's
// library and the MIDI pack stay the same. Prints the entries; pasting them
// into grooves.js is left to you. The reading itself is in js/midi-import.js,
// shared with the app's Import MIDI dialog.
//
//   node scripts/import-grooves.mjs <folder>
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { grooveFromMidi, formatGroove } from '../js/midi-import.js';
import { GROOVES } from '../js/data/grooves.js';

function main(folder) {
  if (!folder) {
    console.error('Usage: node scripts/import-grooves.mjs <folder of .mid files>');
    process.exit(1);
  }
  const files = readdirSync(folder).filter((f) => /\.mid$/i.test(f)).sort();
  if (!files.length) {
    console.error(`No .mid files in ${folder}`);
    process.exit(1);
  }
  const existing = new Set(GROOVES.map((g) => g.id));
  let made = 0;
  for (const file of files) {
    try {
      console.log(formatGroove(grooveFromMidi(file.replace(/\.mid$/i, ''), readFileSync(join(folder, file))), existing));
      made++;
    } catch (err) {
      console.log(`  // ${file}: skipped (${err.message})`);
    }
  }
  console.error(`${made} of ${files.length} files turned into grooves.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv[2]);
