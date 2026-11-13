// Melody prompt cards. Randomize picks one card from two of the first four
// groups, plus one seed. Add or edit freely; plain sentences only.

export const PROMPTS = {
  start: [
    'Start on the 3rd of the chord',
    'Start on the 5th of the chord',
    'Start on the mode’s colour note',
    'Start with a pickup before beat 1',
    'Start on the “and” of beat 2',
    'Start on the highest note you’ll use',
  ],
  contour: [
    'Rise through the first half, fall in the second',
    'Mostly steps, with one big leap',
    'Repeat one note longer than feels comfortable',
    'Phrase, then answer it',
    'Hold one note while the chords move under it',
    'End each phrase lower than it started',
  ],
  range: [
    'Stay within a 5th',
    'Stay within an octave',
    'Sing lower than you normally would',
    'Use only 3 different notes',
  ],
  rhythm: [
    'Use longer notes than the chords',
    'Leave beat 1 empty',
    'Same rhythm every bar, different notes',
    'Start every phrase off the beat',
    'Leave a whole bar of silence',
    'Talk-sing it first, then add pitch',
  ],
  seed: [
    'Seed: porch light',
    'Seed: the last bus home',
    'Seed: a room you used to live in',
    'Seed: static on the radio',
    'Seed: winter coat pockets',
    'Seed: a hallway at 3am',
    'Seed: salt on the windshield',
    'Seed: someone else’s handwriting',
    'Seed: the long way round',
    'Seed: a song you can’t remember the name of',
  ],
};
