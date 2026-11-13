// Strumming patterns. res 8: one character per 8th note, so a 4/4 bar is 8
// and a 3/4 or 6/8 bar is 6.
//   D = down   U = up   x = muted chuck   . = rest (let it ring)
// The app scores how well each strum fits the current groove; no hand tags needed.

export const STRUMS = [
  { id: 'strum_whole_01',     meter: '4/4', res: 8, bars: 1, pattern: 'D.......', tags: ['sparse', 'let-ring'] },
  { id: 'strum_halves_01',    meter: '4/4', res: 8, bars: 1, pattern: 'D...D...', tags: ['sparse'] },
  { id: 'strum_quarters_01',  meter: '4/4', res: 8, bars: 1, pattern: 'D.D.D.D.', tags: ['steady'] },
  { id: 'strum_eighths_01',   meter: '4/4', res: 8, bars: 1, pattern: 'DUDUDUDU', tags: ['busy'] },
  { id: 'strum_classic_01',   meter: '4/4', res: 8, bars: 1, pattern: 'D.DU.UDU', tags: ['classic'] },
  { id: 'strum_classic_02',   meter: '4/4', res: 8, bars: 1, pattern: 'D.DUDUDU', tags: ['classic'] },
  { id: 'strum_dotted_01',    meter: '4/4', res: 8, bars: 1, pattern: 'D..D..D.', tags: ['3-3-2', 'push'] },
  { id: 'strum_dotted_02',    meter: '4/4', res: 8, bars: 1, pattern: 'D..D..DU', tags: ['3-3-2', 'push'] },
  { id: 'strum_chuck_01',     meter: '4/4', res: 8, bars: 1, pattern: 'D.x.D.x.', tags: ['chuck', 'backbeat'] },
  { id: 'strum_chuck_02',     meter: '4/4', res: 8, bars: 1, pattern: 'D.xUDUxU', tags: ['chuck', 'busy'] },
  { id: 'strum_twobar_01',    meter: '4/4', res: 8, bars: 2, pattern: 'D.DU.UDUD...D.D.', tags: ['classic', 'breathing'] },
  // 3/4
  { id: 'strum_waltz_quarters_01', meter: '3/4', res: 8, bars: 1, pattern: 'D.D.D.', tags: ['steady'] },
  { id: 'strum_waltz_classic_01',  meter: '3/4', res: 8, bars: 1, pattern: 'D.DUDU', tags: ['classic'] },
  { id: 'strum_waltz_sparse_01',   meter: '3/4', res: 8, bars: 1, pattern: 'D...DU', tags: ['sparse', 'let-ring'] },
  { id: 'strum_waltz_chuck_01',    meter: '3/4', res: 8, bars: 1, pattern: 'D.x.x.', tags: ['chuck', 'oom-pah'] },
  // 6/8: pulses on characters 1 and 4
  { id: 'strum_six_eight_pulse_01',   meter: '6/8', res: 8, bars: 1, pattern: 'D..D..', tags: ['steady'] },
  { id: 'strum_six_eight_classic_01', meter: '6/8', res: 8, bars: 1, pattern: 'DDUDDU', tags: ['classic', 'rolling'] },
  { id: 'strum_six_eight_sparse_01',  meter: '6/8', res: 8, bars: 1, pattern: 'D.....', tags: ['sparse', 'let-ring'] },
  { id: 'strum_six_eight_chuck_01',   meter: '6/8', res: 8, bars: 1, pattern: 'D..x.U', tags: ['chuck', 'backbeat'] },
];
