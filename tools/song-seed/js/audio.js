// Placeholder sounds and the step scheduler, using the plain Web Audio API.
// Drums are synthesized; the guitar is a Karplus–Strong plucked string.
// Swap in samples later by replacing the voice functions (kick, snare, pluck…).
import { DRUM_TRACKS, swingSteps } from './loop.js';

const LOOKAHEAD = 0.12; // seconds scheduled ahead
const TICK_MS = 25;

export function createEngine({ getState }) {
  let ctx = null;
  let master, buses, session, noise;
  let timer = null, step = 0, nextTime = 0, queue = [];
  let ringing = [];   // guitar strings currently sounding
  const pluckCache = new Map();

  function ensure() {
    if (ctx) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 3;
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(comp).connect(ctx.destination);
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 4200;
    tone.connect(master);
    buses = { drums: ctx.createGain(), chords: ctx.createGain() };
    buses.drums.connect(master);
    buses.chords.connect(tone);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    newSession();
    return ctx;
  }

  // Every play run gets its own gates, so Stop can silence notes that were
  // already scheduled a moment ahead.
  function newSession() {
    session = { drums: ctx.createGain(), chords: ctx.createGain() };
    session.drums.connect(buses.drums);
    session.chords.connect(buses.chords);
  }

  function env(g, t, peak, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  }

  function noiseHit(t, { type = 'highpass', freq, q = 0.7, peak, decay, out }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    env(g, t, peak, decay);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.05);
    return g;
  }

  // ---- drums ----
  const DRUMS = {
    kick(t, v) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      env(g, t, v, 0.45);
      o.connect(g).connect(session.drums);
      o.start(t);
      o.stop(t + 0.5);
    },
    snare(t, v) {
      noiseHit(t, { freq: 900, peak: v * 0.55, decay: 0.18, out: session.drums });
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      env(g, t, v * 0.35, 0.1);
      o.connect(g).connect(session.drums);
      o.start(t);
      o.stop(t + 0.15);
    },
    cymbal(t, v) {
      noiseHit(t, { freq: 7000, peak: v * 0.28, decay: 0.05, out: session.drums });
    },
  };

  // ---- guitar ----
  function pluckBuffer(midi) {
    if (pluckCache.has(midi)) return pluckCache.get(midi);
    const sr = ctx.sampleRate;
    const f = 440 * 2 ** ((midi - 69) / 12);
    const n = Math.max(2, Math.round(sr / f - 0.5));
    const len = Math.floor(sr * 2.6);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const ring = new Float32Array(n);
    let prev = 0, mean = 0;
    for (let i = 0; i < n; i++) { prev += 0.5 * (Math.random() * 2 - 1 - prev); ring[i] = prev; mean += prev / n; }
    for (let i = 0; i < n; i++) ring[i] -= mean;
    const decay = midi < 50 ? 0.998 : midi < 62 ? 0.997 : 0.996;
    for (let i = 0, k = 0; i < len; i++) {
      const a = ring[k];
      out[i] = a;
      ring[k] = decay * 0.5 * (a + ring[(k + 1) % n]);
      k = (k + 1) % n;
    }
    // The averaging filter adds half a sample of delay; correct the pitch.
    const entry = { buf, rate: f / (sr / (n + 0.5)) };
    pluckCache.set(midi, entry);
    return entry;
  }

  function damp(t, speed = 0.015) {
    for (const v of ringing) {
      v.gain.gain.setTargetAtTime(0.0001, t, speed);
      v.src.stop(t + 0.3);
    }
    ringing = [];
  }

  function pluck(midi, t, vel) {
    const { buf, rate } = pluckBuffer(midi);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vel * 0.3, t);
    src.connect(gain).connect(session.chords);
    src.start(t);
    ringing.push({ src, gain });
  }

  function strum(voicing, t, dir) {
    damp(t);
    const up = dir === 'U';
    const notes = up ? voicing.slice(-4).reverse() : voicing;
    const spread = up ? 0.008 : 0.012;
    notes.forEach((m, i) => pluck(m, t + i * spread, (up ? 0.6 : 1) * (0.92 + Math.random() * 0.08)));
  }

  function chuck(t) {
    damp(t, 0.006);
    noiseHit(t, { type: 'bandpass', freq: 1800, q: 1.2, peak: 0.35, decay: 0.05, out: session.chords });
  }

  // ---- keys (held chords) ----
  function hold(voicing, t, dur) {
    for (const m of voicing) {
      const f = 440 * 2 ** ((m - 69) / 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09, t + 0.015);
      g.gain.setTargetAtTime(0.045, t + 0.02, 0.5);
      g.gain.setTargetAtTime(0.0001, t + dur - 0.03, 0.08);
      for (const [type, mult, level] of [['triangle', 1, 1], ['sine', 2, 0.3]]) {
        const o = ctx.createOscillator();
        const og = ctx.createGain();
        o.type = type;
        o.frequency.value = f * mult;
        og.gain.value = level;
        o.connect(og).connect(g);
        o.start(t);
        o.stop(t + dur + 0.6);
      }
      g.connect(session.chords);
    }
  }

  // ---- scheduler ----
  function scheduleStep(st, s, t, stepDur) {
    const { loop } = st;
    const at = t + swingSteps(s, loop.meter.pulse, st.swing) * stepDur;
    if (!st.muteDrums) {
      for (const tr of DRUM_TRACKS) {
        const v = loop.drums[tr][s];
        if (v) DRUMS[tr](at, v);
      }
    }
    if (!st.muteChords) {
      const chord = loop.chords[loop.chordIndexAt[s]];
      if (st.sound === 'keys') {
        if (chord.start === s) hold(chord.voicing, at, (chord.end - chord.start) * stepDur);
      } else {
        const c = loop.strum[s];
        if (c === 'x') chuck(at);
        else if (c === 'D' || c === 'U') strum(chord.voicing, at, c);
      }
    }
    queue.push({ step: s, time: t, dur: stepDur });
  }

  function tick() {
    const st = getState();
    const stepDur = 60 / st.tempo / 4;
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const s = step % st.loop.totalSteps;
      scheduleStep(st, s, nextTime, stepDur);
      nextTime += stepDur;
      step = s + 1;
    }
  }

  return {
    get playing() { return timer !== null; },

    async start() {
      ensure();
      await ctx.resume();
      if (timer) return;
      step = 0;
      queue = [];
      nextTime = ctx.currentTime + 0.06;
      tick();
      timer = setInterval(tick, TICK_MS);
    },

    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
      const now = ctx.currentTime;
      session.drums.gain.setTargetAtTime(0, now, 0.02);
      session.chords.gain.setTargetAtTime(0, now, 0.02);
      ringing = [];
      queue = [];
      newSession();
    },

    setMute(kind, muted) {
      if (!ctx) return;
      buses[kind].gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.01);
    },

    // Hear one chord on its own (clicking a chord block).
    async preview(chord, sound) {
      ensure();
      await ctx.resume();
      const t = ctx.currentTime + 0.02;
      if (sound === 'keys') hold(chord.voicing, t, 1.6);
      else strum(chord.voicing, t, 'D');
    },

    // Fractional step the listener is hearing now, for the playhead.
    position() {
      if (!timer || !ctx) return null;
      const now = ctx.currentTime;
      while (queue.length > 1 && queue[1].time <= now) queue.shift();
      const e = queue[0];
      if (!e || e.time > now) return null;
      return e.step + Math.min(1, (now - e.time) / e.dur);
    },
  };
}
