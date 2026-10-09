'use strict';
/* ---------- 2. AUDIO (Web Audio, all synthesized) ---------- */
const Snd = {
  ctx: null, out: null, noise: null, muted: false, eng: null, scr: null, sir: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.ctx = new AC();
      this.out = c.createGain(); this.out.gain.value = this.muted ? 0 : 0.6; this.out.connect(c.destination);
      const len = Math.floor(c.sampleRate * 1.5), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      // engine: saw + square through a low-pass
      const o1 = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), eg = c.createGain();
      o1.type = 'sawtooth'; o2.type = 'square'; lp.type = 'lowpass'; lp.frequency.value = 400; eg.gain.value = 0;
      o1.connect(lp); o2.connect(lp); lp.connect(eg); eg.connect(this.out); o1.start(); o2.start();
      this.eng = { o1, o2, lp, g: eg };
      // tyre screech: looping noise through a band-pass
      const ns = c.createBufferSource(); ns.buffer = buf; ns.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 4;
      const sg = c.createGain(); sg.gain.value = 0;
      ns.connect(bp); bp.connect(sg); sg.connect(this.out); ns.start(); this.scr = { g: sg };
      // rain: looping noise, high-passed into a hiss
      const rs = c.createBufferSource(); rs.buffer = buf; rs.loop = true; const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const rlp = c.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 7000; const rg = c.createGain(); rg.gain.value = 0;
      rs.connect(hp); hp.connect(rlp); rlp.connect(rg); rg.connect(this.out); rs.start(); this.rain = { g: rg };
      // police siren
      const so = c.createOscillator(); so.type = 'triangle'; so.frequency.value = 800;
      const sgn = c.createGain(); sgn.gain.value = 0; so.connect(sgn); sgn.connect(this.out); so.start();
      this.sir = { o: so, g: sgn };
    } catch (e) { this.ctx = null; }
    if (typeof Radio !== 'undefined') Radio.init();                // the car radio (js/02b)
  },
  setEngine(on, spd, thr) {
    if (!this.ctx) return; const t = this.ctx.currentTime, e = this.eng, f = 38 + spd * 95 + Math.abs(thr) * 8;
    e.o1.frequency.setTargetAtTime(f, t, 0.05); e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    e.lp.frequency.setTargetAtTime(260 + spd * 1100, t, 0.08);
    e.g.gain.setTargetAtTime(on ? 0.07 + 0.06 * Math.abs(thr) + 0.05 * spd : 0, t, 0.08);
  },
  setRain(v) { if (this.ctx) this.rain.g.gain.setTargetAtTime(v * 0.11, this.ctx.currentTime, 0.5); },
  thunder() { this.burst(2.8, 700, 40, 0.8); this.tone(52, 26, 2.2, 0.45, 'sine'); },
  setScreech(a) { if (this.ctx) this.scr.g.gain.setTargetAtTime(a * 0.13, this.ctx.currentTime, 0.04); },
  setSiren(v, time) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.sir.o.frequency.setTargetAtTime(740 + 260 * Math.sin(time * 7), t, 0.02);
    this.sir.g.gain.setTargetAtTime(v * 0.05, t, 0.1);
  },
  burst(dur, f0, f1, vol, type) {
    if (!this.ctx || this.muted) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = type || 'lowpass';
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.out); s.start(t, Math.random() * 0.5, dur + 0.05);
  },
  tone(f0, f1, dur, vol, type) {
    if (!this.ctx || this.muted) return; const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(); o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  },
  shot(id) {
    if (id === 'sniper') { this.burst(0.5, 2200, 90, 0.8); this.tone(110, 34, 0.35, 0.4, 'sawtooth'); return; }   // a heavy crack and a long tail
    const mg = id === 'mg'; this.burst(mg ? 0.09 : 0.14, mg ? 2600 : 3400, 300, mg ? 0.35 : 0.5); this.tone(mg ? 170 : 140, 50, 0.08, 0.25, 'square');
  },
  rocket() { this.burst(0.25, 900, 300, 0.6); this.burst(1.6, 500, 2600, 0.35, 'bandpass'); this.tone(70, 140, 1.2, 0.18, 'sawtooth'); },   // the kick, then the motor's roar
  bolt() { this.tone(900, 500, 0.05, 0.12, 'square'); setTimeout(() => this.tone(600, 1100, 0.06, 0.12, 'square'), 380); },
  boom() { this.burst(1.3, 1400, 60, 0.9); this.tone(90, 28, 0.9, 0.7, 'sine'); },
  thud(v) { this.burst(0.12, 500, 120, Math.min(0.5, 0.1 + v * 0.002)); },
  smash(k, v) {                          // a car through street junk (js/12e); v: 1 close by, 0 far away
    if (k === 'box') { this.burst(0.14, 1400, 250, 0.32 * v); this.burst(0.08, 300, 90, 0.3 * v); }                 // cardboard: a dull crumple
    else if (k === 'bag') { this.burst(0.2, 700, 140, 0.36 * v); this.burst(0.06, 2400, 900, 0.12 * v, 'bandpass'); } // a soft burst
    else if (k === 'crate' || k === 'pallet') { this.burst(0.12, 3000, 700, 0.4 * v, 'bandpass'); this.tone(180, 90, 0.08, 0.14 * v, 'square'); }   // splintering wood
    else if (k === 'hydrant') { this.tone(620, 380, 0.3, 0.2 * v, 'square'); this.burst(2.4, 5000, 3000, 0.16 * v, 'highpass'); }   // a clang, then the hiss of water
    else { this.tone(460, 260, 0.22, 0.17 * v, 'square'); this.burst(0.1, 1800, 400, 0.25 * v); }                   // a bin: a hollow clang
  },
  pickup() { this.tone(660, 990, 0.12, 0.15, 'square'); },
  hurt() { this.tone(220, 90, 0.16, 0.2, 'sawtooth'); },
  toggle() { this.muted = !this.muted; if (this.out) this.out.gain.value = this.muted ? 0 : 0.6; return this.muted; }
};

