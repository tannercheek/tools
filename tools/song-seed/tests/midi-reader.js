// Test helper, not a test file. Reads back what writeMidi writes
// (no running status), with absolute ticks.
export function readTracks(bytes) {
  const tracks = [];
  let p = 14; // past the header
  while (p < bytes.length) {
    const len = (bytes[p + 4] << 24) | (bytes[p + 5] << 16) | (bytes[p + 6] << 8) | bytes[p + 7];
    let q = p + 8;
    const end = q + len;
    let tick = 0;
    const events = [];
    const readVlq = () => { let n = 0, b; do { b = bytes[q++]; n = (n << 7) | (b & 0x7f); } while (b & 0x80); return n; };
    while (q < end) {
      tick += readVlq();
      const status = bytes[q++];
      if (status === 0xff) {
        const type = bytes[q++];
        const n = readVlq();
        events.push({ tick, meta: type, data: [...bytes.slice(q, q + n)] });
        q += n;
      } else {
        events.push({ tick, kind: status & 0xf0, channel: (status & 0x0f) + 1, note: bytes[q], velocity: bytes[q + 1] });
        q += 2;
      }
    }
    tracks.push(events);
    p = end;
  }
  return tracks;
}
