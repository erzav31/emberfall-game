// All sound is synthesised with WebAudio: no audio files, no network.
// A soft pad hums underneath; every action has its own little voice.

export function createAudio() {
  let ctx = null;
  let master = null;
  let padNodes = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    /** Call from the first user gesture; browsers block audio before one. */
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
      this.startPad();
    },
    startPad() {
      if (!ctx || muted || padNodes) return;
      const gain = ctx.createGain();
      gain.gain.value = 0.045;
      gain.connect(master);
      const oscs = [110, 164.81, 220].map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i === 2 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = i * 4 - 4;
        o.connect(gain);
        o.start();
        return o;
      });
      padNodes = { gain, oscs };
    },
    stopPad() {
      if (!padNodes) return;
      try {
        padNodes.gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
        padNodes.oscs.forEach((o) => o.stop(ctx.currentTime + 0.5));
      } catch { /* already stopped */ }
      padNodes = null;
    },
    pickup(combo) {
      if (!ensure()) return;
      // Pitch climbs with the combo: chaining embers sounds brighter.
      const base = 520 * Math.pow(2, Math.min(combo, 24) / 24);
      tone(base, 0.14, 'sine', 0.22);
      tone(base * 1.5, 0.18, 'sine', 0.14, 0.03);
    },
    dash() {
      if (!ensure()) return;
      noise(0.16, 0.25, 1800);
      tone(320, 0.14, 'sine', 0.1, 0, 640);
    },
    hit() {
      if (!ensure()) return;
      tone(180, 0.28, 'sawtooth', 0.22, 0, 60);
      noise(0.2, 0.3, 300);
    },
    powerup() {
      if (!ensure()) return;
      [660, 880, 1320].forEach((f, i) => tone(f, 0.16, 'triangle', 0.16, i * 0.06));
    },
    levelUp() {
      if (!ensure()) return;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.22, 'triangle', 0.18, i * 0.07));
    },
    gameOver() {
      if (!ensure()) return;
      [392, 311, 233, 175].forEach((f, i) => tone(f, 0.34, 'triangle', 0.18, i * 0.16));
    },
    victory() {
      if (!ensure()) return;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
        tone(f, 0.3, 'triangle', 0.18, i * 0.09));
      tone(261.63, 0.9, 'sine', 0.12, 0.45);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      if (muted) this.stopPad();
      else this.startPad();
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
