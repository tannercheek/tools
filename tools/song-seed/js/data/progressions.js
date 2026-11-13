// Chord progressions as Roman numerals, so they work in any key.
// Ids match the Logic MIDI pack filenames.
//
// chords: numerals relative to the MAJOR scale of the tonic (bVII is always
//         a whole step below the tonic). Upper case = major, lower = minor,
//         ° = diminished. Optional suffix: maj7, 7, 9, 6, add9, sus2, sus4.
// bars:   how long each chord lasts. 0.5 = half a bar. Must add up to 2, 4 or 8.
// mode:   the mode it was written for. Randomize only picks progressions
//         that match the current mode.
// weight: optional, default 1. Higher = picked more often.

export const PROGRESSIONS = [
  // Major (Ionian)
  { id: 'prog_ionian_anthem_01',   mode: 'ionian', chords: ['I', 'V', 'vi', 'IV'], bars: [1, 1, 1, 1], weight: 2 },
  { id: 'prog_ionian_fifties_01',  mode: 'ionian', chords: ['I', 'vi', 'IV', 'V'], bars: [1, 1, 1, 1] },
  { id: 'prog_ionian_sadturn_01',  mode: 'ionian', chords: ['vi', 'IV', 'I', 'V'], bars: [1, 1, 1, 1], weight: 2 },
  { id: 'prog_ionian_two_01',      mode: 'ionian', chords: ['I', 'IV'], bars: [2, 2] },
  { id: 'prog_ionian_lift_01',     mode: 'ionian', chords: ['IV', 'I', 'V', 'vi'], bars: [1, 1, 1, 1] },
  { id: 'prog_ionian_borrowed_01', mode: 'ionian', chords: ['I', 'iii', 'IV', 'iv'], bars: [1, 1, 1, 1], weight: 1.5 },
  { id: 'prog_ionian_push_01',     mode: 'ionian', chords: ['I', 'V', 'vi', 'IV', 'V'], bars: [1, 1, 1, 0.5, 0.5] },
  { id: 'prog_ionian_canon_01',    mode: 'ionian', chords: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'], bars: [1, 1, 1, 1, 1, 1, 1, 1] },
  { id: 'prog_ionian_twinkle_01',    mode: 'ionian', chords: ['Imaj7', 'IVmaj7', 'vi7', 'V'], bars: [1, 1, 1, 1] },
  { id: 'prog_ionian_heartbreak_01', mode: 'ionian', chords: ['Imaj7', 'IVmaj7', 'iv6', 'Iadd9'], bars: [1, 1, 1, 1] },
  { id: 'prog_ionian_spiral_01',     mode: 'ionian', chords: ['IVmaj7', 'V', 'iii7', 'vi7', 'ii7', 'V'], bars: [1, 0.5, 0.5, 1, 0.5, 0.5] },
  { id: 'prog_ionian_tapping_01',    mode: 'ionian', chords: ['IVmaj7', 'Imaj7'], bars: [1, 1] },

  // Dorian
  { id: 'prog_dorian_two_01',   mode: 'dorian', chords: ['i', 'IV'], bars: [2, 2], weight: 2 },
  { id: 'prog_dorian_float_01', mode: 'dorian', chords: ['i', 'IV', 'i', 'bVII'], bars: [1, 1, 1, 1] },
  { id: 'prog_dorian_climb_01', mode: 'dorian', chords: ['i', 'bIII', 'IV'], bars: [2, 1, 1] },
  { id: 'prog_dorian_slide_01', mode: 'dorian', chords: ['i', 'bVII', 'IV'], bars: [1, 1, 2] },
  { id: 'prog_dorian_bedroom_01', mode: 'dorian', chords: ['i7', 'IVadd9', 'bIIImaj7', 'bVII'], bars: [1, 1, 1, 1] },

  // Phrygian
  { id: 'prog_phrygian_two_01',  mode: 'phrygian', chords: ['i', 'bII'], bars: [2, 2] },
  { id: 'prog_phrygian_walk_01', mode: 'phrygian', chords: ['i', 'bII', 'bIII', 'bII'], bars: [1, 1, 1, 1] },

  // Lydian
  { id: 'prog_lydian_two_01',   mode: 'lydian', chords: ['I', 'II'], bars: [2, 2], weight: 2 },
  { id: 'prog_lydian_dream_01', mode: 'lydian', chords: ['I', 'II', 'iii', 'II'], bars: [1, 1, 1, 1] },
  { id: 'prog_lydian_math_01',  mode: 'lydian', chords: ['Imaj7', 'II', 'iii7', 'II'], bars: [1, 1, 1, 1] },
  { id: 'prog_lydian_drift_01', mode: 'lydian', chords: ['Iadd9', 'IIadd9', 'vi7', 'V'], bars: [2, 2, 2, 2] },

  // Mixolydian
  { id: 'prog_mixolydian_rock_01',  mode: 'mixolydian', chords: ['I', 'bVII', 'IV', 'I'], bars: [1, 1, 1, 1] },
  { id: 'prog_mixolydian_two_01',   mode: 'mixolydian', chords: ['I', 'bVII'], bars: [2, 2] },
  { id: 'prog_mixolydian_loose_01', mode: 'mixolydian', chords: ['I', 'v', 'IV'], bars: [2, 1, 1] },
  { id: 'prog_mixolydian_porch_01', mode: 'mixolydian', chords: ['Iadd9', 'bVIImaj7', 'IVmaj7', 'v7'], bars: [1, 1, 1, 1] },

  // Minor (Aeolian)
  { id: 'prog_aeolian_epic_01',    mode: 'aeolian', chords: ['i', 'bVI', 'bIII', 'bVII'], bars: [1, 1, 1, 1], weight: 2 },
  { id: 'prog_aeolian_descend_01', mode: 'aeolian', chords: ['i', 'bVII', 'bVI', 'bVII'], bars: [1, 1, 1, 1] },
  { id: 'prog_aeolian_two_01',     mode: 'aeolian', chords: ['i', 'bVI'], bars: [2, 2] },
  { id: 'prog_aeolian_drift_01',   mode: 'aeolian', chords: ['i', 'iv', 'bVI', 'v'], bars: [1, 1, 1, 1] },
  { id: 'prog_aeolian_slow_01',    mode: 'aeolian', chords: ['i', 'bVI', 'bIII', 'bVII'], bars: [2, 2, 2, 2] },
  { id: 'prog_aeolian_rainy_01',    mode: 'aeolian', chords: ['bVImaj7', 'bVII', 'i7', 'v7'], bars: [2, 2, 2, 2] },
  { id: 'prog_aeolian_lastshow_01', mode: 'aeolian', chords: ['i', 'bVImaj7', 'bIIIadd9', 'bVIIsus4'], bars: [2, 1, 0.5, 0.5] },
];
