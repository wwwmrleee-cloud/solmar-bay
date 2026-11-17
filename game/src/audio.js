// Synthesized WebAudio only — no audio files. Engine hum, siren, gunshot,
// pickup chime, mission jingle, crash thud. M toggles mute.
// Every sound is built at runtime from oscillators and noise bursts, so
// there are no audio files to load, fail, or fetch.
export function createAudio() {
  return { ctx: null, muted: false, engineOsc: null, engineGain: null, sirenOn: false, sirenNodes: null };
}

function ensureCtx(audio) {
  if (!audio.ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new AC();
    } catch { return null; }
  }
  if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
  return audio.ctx;
}

export function unlockAudio(audio) { ensureCtx(audio); }

export function setMuted(audio, muted) {
  audio.muted = muted;
  if (audio.engineGain) audio.engineGain.gain.value = muted ? 0 : 0.05;
}

function blip(audio, freq, dur, type, vol, slideTo) {
  if (audio.muted) return;
  const ctx = ensureCtx(audio);
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  gain.gain.setValueAtTime(vol || 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t); osc.stop(t + dur + 0.02);
}

function noiseBurst(audio, dur, vol, lowpass) {
  if (audio.muted) return;
  const ctx = ensureCtx(audio);
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol || 0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = lowpass || 3000;
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t);
}

export const sfx = {
  shoot(audio) { noiseBurst(audio, 0.12, 0.3, 2400); blip(audio, 180, 0.08, 'square', 0.08, 60); },
  enemyShoot(audio) { noiseBurst(audio, 0.1, 0.14, 1800); },
  pickup(audio) { blip(audio, 660, 0.1, 'sine', 0.14); setTimeout(() => blip(audio, 990, 0.14, 'sine', 0.14), 90); },
  crash(audio) { noiseBurst(audio, 0.25, 0.35, 900); blip(audio, 90, 0.2, 'sine', 0.2, 40); },
  jingle(audio) {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(audio, f, 0.18, 'triangle', 0.16), i * 110));
  },
  busted(audio) { blip(audio, 220, 0.5, 'sawtooth', 0.12, 110); },
  click(audio) { blip(audio, 440, 0.05, 'square', 0.06); },
};

export function updateEngine(audio, speed, inCar) {
  if (audio.muted) return;
  const ctx = ensureCtx(audio);
  if (!ctx) return;
  if (!inCar) {
    if (audio.engineOsc) { try { audio.engineOsc.stop(); } catch {} audio.engineOsc = null; }
    return;
  }
  if (!audio.engineOsc) {
    audio.engineOsc = ctx.createOscillator();
    audio.engineGain = ctx.createGain();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 60;
    audio.engineGain.gain.value = 0.05;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 500;
    audio.engineOsc.connect(filter).connect(audio.engineGain).connect(ctx.destination);
    audio.engineOsc.start();
  }
  audio.engineOsc.frequency.value = 55 + Math.abs(speed) * 0.35;
}

export function setSiren(audio, on) {
  if (on === audio.sirenOn) return;
  audio.sirenOn = on;
  if (audio.muted) return;
  const ctx = ensureCtx(audio);
  if (!ctx) return;
  if (!on) {
    if (audio.sirenNodes) {
      try { audio.sirenNodes.osc.stop(); } catch {}
      audio.sirenNodes = null;
    }
    return;
  }
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  osc.type = 'triangle'; osc.frequency.value = 750;
  lfo.type = 'square'; lfo.frequency.value = 1.6;
  lfoGain.gain.value = 250;
  gain.gain.value = 0.045;
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
  osc.connect(gain).connect(ctx.destination);
  osc.start(); lfo.start();
  audio.sirenNodes = { osc, lfo };
}
