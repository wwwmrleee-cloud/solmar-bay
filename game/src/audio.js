// Solmar Bay — synthesised sound. Every sound is built at runtime
// from the Web Audio system: no audio files, no network. One shared
// noise buffer feeds every burst so a gunshot never allocates.

export const AUDIO = {
  ctx: null,
  master: null,
  noiseBuf: null,
  muted: false,
  engineOsc: null,
  engineGain: null,
  sirenOsc: null,
  sirenGain: null,
  sirenLfo: null,
};

function ensureCtx() {
  if (AUDIO.ctx) return AUDIO.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  AUDIO.ctx = ctx;
  AUDIO.master = ctx.createGain();
  AUDIO.master.gain.value = 0.5;
  AUDIO.master.connect(ctx.destination);
  const len = ctx.sampleRate * 0.5;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  AUDIO.noiseBuf = buf;
  return ctx;
}

// Call on the first user gesture; the context starts suspended.
export function unlockAudio() {
  const ctx = ensureCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function noiseBurst(when, dur, gainValue, filterFreq) {
  const ctx = AUDIO.ctx;
  if (!ctx || !AUDIO.noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = AUDIO.noiseBuf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(AUDIO.master);
  src.start(when);
  src.stop(when + dur + 0.02);
}

function tone(when, type, freqStart, freqEnd, dur, gainValue) {
  const ctx = AUDIO.ctx;
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, when);
  if (freqEnd !== freqStart) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), when + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainValue, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain);
  gain.connect(AUDIO.master);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

export function playGunshot() {
  const ctx = ensureCtx();
  if (!ctx || AUDIO.muted) return;
  const now = ctx.currentTime;
  noiseBurst(now, 0.09, 0.5, 3200);
  tone(now, 'square', 320, 90, 0.08, 0.22);
}

export function playEnemyShot() {
  const ctx = ensureCtx();
  if (!ctx || AUDIO.muted) return;
  const now = ctx.currentTime;
  noiseBurst(now, 0.07, 0.22, 2200);
  tone(now, 'square', 240, 80, 0.06, 0.1);
}

export function playPickup() {
  const ctx = ensureCtx();
  if (!ctx || AUDIO.muted) return;
  const now = ctx.currentTime;
  tone(now, 'sine', 660, 660, 0.09, 0.25);
  tone(now + 0.09, 'sine', 880, 880, 0.14, 0.25);
}

// A purchase gets its own sound, so buying an upgrade does not
// sound like picking up a package.
export function playBuy() {
  const ctx = ensureCtx();
  if (!ctx || AUDIO.muted) return;
  const now = ctx.currentTime;
  tone(now, 'triangle', 784, 784, 0.08, 0.25);
  tone(now + 0.08, 'triangle', 1047, 1047, 0.12, 0.25);
  tone(now + 0.2, 'triangle', 1319, 1319, 0.16, 0.22);
}

export function playCrash() {
  const ctx = ensureCtx();
  if (!ctx || AUDIO.muted) return;
  const now = ctx.currentTime;
  noiseBurst(now, 0.22, 0.5, 900);
  tone(now, 'sine', 140, 45, 0.22, 0.4);
}

export function playJingle() {
  const ctx = ensureCtx();
  if (!ctx || AUDIO.muted) return;
  const now = ctx.currentTime;
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(now + i * 0.11, 'triangle', f, f, 0.16, 0.28));
}

export function playBusted() {
  const ctx = ensureCtx();
  if (!ctx || AUDIO.muted) return;
  const now = ctx.currentTime;
  tone(now, 'sawtooth', 220, 55, 0.6, 0.3);
}

export function playClick() {
  const ctx = ensureCtx();
  if (!ctx || AUDIO.muted) return;
  tone(ctx.currentTime, 'sine', 900, 900, 0.05, 0.18);
}

export function setMuted(muted) {
  AUDIO.muted = muted;
  if (AUDIO.master) AUDIO.master.gain.value = muted ? 0 : 0.5;
  if (AUDIO.engineGain) AUDIO.engineGain.gain.value = muted ? 0 : 0.08;
  if (AUDIO.sirenGain) AUDIO.sirenGain.gain.value = muted ? 0 : 0.05;
}

// The engine hum follows the driven car's speed.
export function updateEngine(speed, driving) {
  const ctx = AUDIO.ctx;
  if (!ctx) return;
  if (!driving || AUDIO.muted) {
    if (AUDIO.engineOsc) {
      try { AUDIO.engineOsc.stop(); } catch (e) { /* already stopped */ }
      AUDIO.engineOsc = null;
      AUDIO.engineGain = null;
    }
    return;
  }
  if (!AUDIO.engineOsc) {
    AUDIO.engineOsc = ctx.createOscillator();
    AUDIO.engineOsc.type = 'sawtooth';
    AUDIO.engineGain = ctx.createGain();
    AUDIO.engineGain.gain.value = AUDIO.muted ? 0 : 0.08;
    AUDIO.engineOsc.connect(AUDIO.engineGain);
    AUDIO.engineGain.connect(AUDIO.master);
    AUDIO.engineOsc.start();
  }
  AUDIO.engineOsc.frequency.value = 55 + speed * 0.35;
}

// The siren wobbles while the wanted level is above zero.
export function updateSiren(wantedLevel, time) {
  const ctx = AUDIO.ctx;
  if (!ctx) return;
  if (wantedLevel <= 0 || AUDIO.muted) {
    if (AUDIO.sirenOsc) {
      try { AUDIO.sirenOsc.stop(); } catch (e) { /* already stopped */ }
      try { AUDIO.sirenLfo.stop(); } catch (e) { /* already stopped */ }
      AUDIO.sirenOsc = null;
      AUDIO.sirenGain = null;
      AUDIO.sirenLfo = null;
    }
    return;
  }
  if (!AUDIO.sirenOsc) {
    AUDIO.sirenOsc = ctx.createOscillator();
    AUDIO.sirenOsc.type = 'triangle';
    AUDIO.sirenOsc.frequency.value = 750;
    AUDIO.sirenGain = ctx.createGain();
    AUDIO.sirenGain.gain.value = AUDIO.muted ? 0 : 0.05;
    AUDIO.sirenLfo = ctx.createOscillator();
    AUDIO.sirenLfo.type = 'sine';
    AUDIO.sirenLfo.frequency.value = 1.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 250;
    AUDIO.sirenLfo.connect(lfoGain);
    lfoGain.connect(AUDIO.sirenOsc.frequency);
    AUDIO.sirenOsc.connect(AUDIO.sirenGain);
    AUDIO.sirenGain.connect(AUDIO.master);
    AUDIO.sirenOsc.start();
    AUDIO.sirenLfo.start();
  }
  void time;
}
