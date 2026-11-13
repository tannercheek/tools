// Drum grooves. Ids match the filenames in the Logic MIDI pack
// (groove_straight_basic_01 ↔ groove_straight_basic_01.mid).
//
// res 16: one character per 16th note, so a 4/4 bar is 16 characters and a
// 3/4 or 6/8 bar is 12.
//   x = hit   X = accent   o = ghost (soft)   . = rest
// tempo: the BPM range the groove feels right in; Randomize picks inside it.
// Tracks: kick, snare and cymbal. Any may be left out or empty.

export const GROOVES = [
  {
    id: 'groove_straight_basic_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 80, max: 130 }, tags: ['basic', 'steady'],
    tracks: {
      kick:      'x.......x.......',
      snare:     '....x.......x...',
      cymbal:    'x.x.x.x.x.x.x.x.',
    },
  },
  {
    id: 'groove_straight_driving_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 110, max: 150 }, tags: ['driving', 'upbeat'],
    tracks: {
      kick:      'x.......x.x.....',
      snare:     '....x.......x...',
      cymbal:    'X.x.X.x.X.x.X.x.',
    },
  },
  {
    id: 'groove_straight_push_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 95, max: 125 }, tags: ['push'],
    tracks: {
      kick:      'x.......x..x....',
      snare:     '....x.......x...',
      cymbal:    'x.x.x.x.x.x.x.x.',
    },
  },
  {
    id: 'groove_motorik_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 120, max: 150 }, tags: ['motorik', 'krautrock', 'driving'],
    tracks: {
      kick:      'x...x...x...x...',
      snare:     '....x.......x...',
      cymbal:    'X.x.X.x.X.x.X.x.',
    },
  },
  {
    id: 'groove_four_floor_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 100, max: 128 }, tags: ['dance', 'synthwave'],
    tracks: {
      kick:      'x...x...x...x...',
      snare:     '....x.......x...',
      cymbal:    '..x...x...x...x.',
    },
  },
  {
    id: 'groove_halftime_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 120, max: 160 }, tags: ['halftime', 'heavy', 'slow-feel'],
    tracks: {
      kick:      'x.........x.....',
      snare:     '........X.......',
      cymbal:    'x.x.x.x.x.x.x.x.',
    },
  },
  {
    id: 'groove_slowcore_01', meter: '4/4', res: 16, bars: 2,
    tempo: { min: 58, max: 80 }, tags: ['slowcore', 'sparse'],
    tracks: {
      kick:      'x.........x.....x.......x.......',
      snare:     '....x.......x.......x.......x...',
      cymbal:    'x...x...x...x...x...x...x...x.x.',
    },
  },
  {
    id: 'groove_ballad_soft_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 65, max: 90 }, tags: ['soft', 'ballad'],
    tracks: {
      kick:      'x.......x.......',
      snare:     '....o.......o...',
      cymbal:    'x.o.x.o.x.o.x.o.',
    },
  },
  {
    id: 'groove_sparse_offbeat_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 70, max: 100 }, tags: ['sparse', 'offbeat'],
    tracks: {
      kick:      'x...............',
      snare:     '........x.......',
      cymbal:    '..x...x...x...x.',
    },
  },
  {
    id: 'groove_sixteenth_hat_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 85, max: 110 }, tags: ['busy', 'groove', 'sixteenths'],
    tracks: {
      kick:      'x.....x...x.....',
      snare:     '....x.......x..o',
      cymbal:    'xoxoxoxoxoxoxoxo',
    },
  },
  {
    id: 'groove_lofi_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 70, max: 92 }, tags: ['lofi', 'laid-back'],
    tracks: {
      kick:      'x......x..x.....',
      snare:     '....x.......x...',
      cymbal:    'x.x.x.x.x.x.x.x.',
    },
  },
  {
    id: 'groove_shuffle_01', meter: '4/4', res: 16, bars: 1,
    tempo: { min: 90, max: 120 }, tags: ['shuffle', 'swing-friendly'],
    tracks: {
      kick:      'x.....x.x.......',
      snare:     '....x.......x...',
      cymbal:    'x.x.x.x.x.x.x.x.',
    },
  },

  // ---- 3/4 ----
  {
    id: 'groove_waltz_basic_01', meter: '3/4', res: 16, bars: 1,
    tempo: { min: 90, max: 150 }, tags: ['waltz', 'basic'],
    tracks: {
      kick:      'x...........',
      snare:     '....x...x...',
      cymbal:    'x.x.x.x.x.x.',
    },
  },
  {
    id: 'groove_waltz_soft_01', meter: '3/4', res: 16, bars: 1,
    tempo: { min: 60, max: 92 }, tags: ['soft', 'ballad'],
    tracks: {
      kick:      'x...........',
      snare:     '....o...o...',
      cymbal:    'x...x...x...',
    },
  },
  {
    id: 'groove_waltz_indie_01', meter: '3/4', res: 16, bars: 1,
    tempo: { min: 92, max: 130 }, tags: ['indie', 'push'],
    tracks: {
      kick:      'x.....x.....',
      snare:     '........x...',
      cymbal:    'x.x.x.x.x.x.',
    },
  },
  {
    id: 'groove_waltz_slowcore_01', meter: '3/4', res: 16, bars: 2,
    tempo: { min: 56, max: 80 }, tags: ['slowcore', 'sparse'],
    tracks: {
      kick:      'x...........x...x.......',
      snare:     '........x...........x...',
      cymbal:    'x...x...x...x...x...x.x.',
    },
  },
  // ---- 6/8: two dotted-quarter pulses a bar, on characters 1 and 7 ----
  {
    id: 'groove_six_eight_basic_01', meter: '6/8', res: 16, bars: 1,
    tempo: { min: 66, max: 100 }, tags: ['basic', 'ballad'],
    tracks: {
      kick:      'x...........',
      snare:     '......x.....',
      cymbal:    'x.x.x.x.x.x.',
    },
  },
  {
    id: 'groove_six_eight_soft_01', meter: '6/8', res: 16, bars: 1,
    tempo: { min: 60, max: 90 }, tags: ['soft', 'lilting'],
    tracks: {
      kick:      'x...........',
      snare:     '......o.....',
      cymbal:    'x.o.o.x.o.o.',
    },
  },
  {
    id: 'groove_six_eight_rolling_01', meter: '6/8', res: 16, bars: 1,
    tempo: { min: 96, max: 132 }, tags: ['rolling', 'driving'],
    tracks: {
      kick:      'x.......x...',
      snare:     '......x.....',
      cymbal:    'X.x.x.X.x.x.',
    },
  },
  {
    id: 'groove_six_eight_open_01', meter: '6/8', res: 16, bars: 2,
    tempo: { min: 80, max: 115 }, tags: ['swaying'],
    tracks: {
      kick:      'x...........x...x.......',
      snare:     '......x...........x.....',
      cymbal:    'x.x.x.x.x.x.x.x.x.x.x.x.',
    },
  },
];
