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
      // the police helicopter's rotor: low noise chopped by the blades
      const ro = c.createBufferSource(); ro.buffer = buf; ro.loop = true; const rl = c.createBiquadFilter(); rl.type = 'lowpass'; rl.frequency.value = 360;
      const am = c.createGain(); am.gain.value = 0.55; const lfo = c.createOscillator(); lfo.frequency.value = 12.5; const lg = c.createGain(); lg.gain.value = 0.45;
      const rg2 = c.createGain(); rg2.gain.value = 0; lfo.connect(lg); lg.connect(am.gain); ro.connect(rl); rl.connect(am); am.connect(rg2); rg2.connect(this.out); ro.start(); lfo.start();
      this.rot = { g: rg2 };
    } catch (e) { this.ctx = null; }
    if (typeof Radio !== 'undefined') Radio.init();                // the car radio (js/02b)
  },
  setEngine(on, spd, thr) {
    if (!this.ctx) return; const t = this.ctx.currentTime, e = this.eng, f = 38 + spd * 95 + Math.abs(thr) * 8;
    e.o1.frequency.setTargetAtTime(f, t, 0.05); e.o2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
    e.lp.frequency.setTargetAtTime(260 + spd * 1100, t, 0.08);
    e.g.gain.setTargetAtTime(on ? 0.07 + 0.06 * Math.abs(thr) + 0.05 * spd : 0, t, 0.08);
  },
  setRotor(v) { if (this.ctx) this.rot.g.gain.setTargetAtTime(v * 0.7, this.ctx.currentTime, 0.2); },   // the police helicopter (js/08u)
  setRain(v) { if (this.ctx) this.rain.g.gain.setTargetAtTime(v * 0.11, this.ctx.currentTime, 0.5); },
  thunder() { this.burst(2.8, 700, 40, 0.8); this.tone(52, 26, 2.2, 0.45, 'sine'); },
  setScreech(a) { if (this.ctx) this.scr.g.gain.setTargetAtTime(a * 0.13, this.ctx.currentTime, 0.04); },
  setSiren(v, time) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.sir.o.frequency.setTargetAtTime(740 + 260 * Math.sin(time * 7), t, 0.02);
    this.sir.g.gain.setTargetAtTime(v * 0.05, t, 0.1);
  },
  burst(dur, f0, f1, vol, type, dl, q) {        // filtered noise; dl: start this much later (s); q: the filter's Q
    if (!this.ctx || this.muted || !(vol > 0.002)) return; const c = this.ctx, t = c.currentTime + (dl || 0);
    const s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = type || 'lowpass'; if (q) fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.out); s.start(t, Math.random() * 0.5, dur + 0.05);
  },
  tone(f0, f1, dur, vol, type, dl) {            // a sweeping oscillator; dl: start this much later (s)
    if (!this.ctx || this.muted || !(vol > 0.002)) return; const c = this.ctx, t = c.currentTime + (dl || 0);
    const o = c.createOscillator(); o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + dur + 0.02);
  },
  shot(id) {                             // the weapon table's Sound (js/01f)
    if (id === 'sniper') { this.burst(0.5, 2200, 90, 0.8); this.tone(110, 34, 0.35, 0.4, 'sawtooth'); return; }   // a heavy crack and a long tail
    if (id === 'shotgun') { this.burst(0.35, 1800, 120, 0.85); this.tone(90, 30, 0.25, 0.4, 'sawtooth'); return; }   // a blast with a boom under it
    if (id === 'revolver') { this.burst(0.22, 2600, 160, 0.7); this.tone(120, 40, 0.18, 0.35, 'square'); return; }
    if (id === 'lmg') { this.burst(0.1, 2200, 220, 0.42); this.tone(120, 45, 0.09, 0.3, 'square'); return; }
    const mg = id === 'mg'; this.burst(mg ? 0.09 : 0.14, mg ? 2600 : 3400, 300, mg ? 0.35 : 0.5); this.tone(mg ? 170 : 140, 50, 0.08, 0.25, 'square');
  },
  melee(id, hit) {                       // swings and throws (js/06b): a whoosh, and on a hit a thud (or a stab, a smack)
    if (id === 'throw') { this.burst(0.2, 900, 2400, 0.18, 'bandpass'); return; }
    if (!hit) { this.burst(id === 'punch' ? 0.1 : 0.18, id === 'stab' ? 3500 : 1600, id === 'stab' ? 5000 : 3200, 0.16, 'bandpass'); return; }
    if (id === 'stab') { this.burst(0.08, 1800, 600, 0.3); return; }
    this.burst(0.12, 700, 120, id === 'punch' ? 0.35 : 0.5); this.tone(id === 'punch' ? 140 : 110, 60, 0.08, 0.25, 'sine');
  },
  rocket() { this.burst(0.25, 900, 300, 0.6); this.burst(1.6, 500, 2600, 0.35, 'bandpass'); this.tone(70, 140, 1.2, 0.18, 'sawtooth'); },   // the kick, then the motor's roar
  bolt() { this.tone(900, 500, 0.05, 0.12, 'square'); setTimeout(() => this.tone(600, 1100, 0.06, 0.12, 'square'), 380); },
  boom() { this.burst(1.3, 1400, 60, 0.9); this.tone(90, 28, 0.9, 0.7, 'sine'); },
  thud(v) { this.burst(0.12, 500, 120, Math.min(0.5, 0.1 + v * 0.002)); },
  metal(f, dur, vol, dl) {               // struck metal: a few out-of-tune partials ringing down
    for (const [r, a] of [[1, 1], [2.76, 0.55], [5.4, 0.3], [8.93, 0.16]]) this.tone(f * r, f * r * 0.992, dur / (1 + r * 0.12), vol * a, 'sine', dl);
  },
  smash(k, v) {                          // street junk hit by a car or a swing (js/12e, js/06b); v: 1 close by, 0 far away. Every kind its own sound, never quite the same twice
    if (!this.ctx || this.muted || !(v > 0.02)) return;
    const j = 0.9 + Math.random() * 0.22, r = () => Math.random();
    if (k === 'box') { this.burst(0.05, 2200 * j, 900, 0.32 * v, 'bandpass', 0, 2); this.burst(0.16, 900 * j, 160, 0.5 * v); this.burst(0.09, 260, 80, 0.42 * v, 'lowpass', 0.02); }   // cardboard: a hollow papery thump as it folds
    else if (k === 'bag') { this.burst(0.22, 600 * j, 120, 0.46 * v); for (let n = 0; n < 4; n++) this.burst(0.05, 3200 * j, 1600, 0.1 * v, 'bandpass', 0.03 + n * 0.05 + r() * 0.02, 3); this.burst(0.12, 380, 90, 0.18 * v, 'lowpass', 0.08); }   // a heavy plastic burst, its rustle, the squelch inside
    else if (k === 'crate' || k === 'pallet') { for (let n = 0; n < 3; n++) this.burst(0.04, 3800 * j, 1800, 0.34 * v, 'bandpass', n * 0.035 + r() * 0.015, 5); this.tone(k === 'crate' ? 190 * j : 240 * j, 110, 0.1, 0.18 * v, 'triangle'); }   // slats splintering crack-crack-crack
    else if (k === 'bench') { this.burst(0.05, 3200 * j, 1500, 0.32 * v, 'bandpass', 0, 4); this.tone(170 * j, 90, 0.12, 0.2 * v, 'triangle'); this.metal(310 * j, 0.35, 0.07 * v, 0.03); }   // the slats crack, the iron frame rings
    else if (k === 'booth') { this.burst(0.06, 4000, 2000, 0.3 * v, 'bandpass', 0, 2); this.burst(0.5, 9000, 4000, 0.3 * v, 'highpass'); for (let n = 0; n < 6; n++) this.tone(2600 + r() * 2600, 2400, 0.08, 0.06 * v, 'sine', 0.05 + r() * 0.35); }   // glass: the crack, the shatter, shards tinkling down
    else if (k === 'planter') { this.burst(0.04, 2600 * j, 1200, 0.3 * v, 'bandpass', 0, 6); this.tone(620 * j, 560, 0.12, 0.12 * v, 'sine'); this.burst(0.2, 700, 120, 0.3 * v, 'lowpass', 0.03); for (let n = 0; n < 3; n++) this.tone(1300 + r() * 900, 1200, 0.05, 0.05 * v, 'sine', 0.1 + r() * 0.2); }   // a clay pot: the crack, its ring, the earth spilling, bits
    else if (k === 'bush') { for (let n = 0; n < 5; n++) this.burst(0.09, 2800 * j, 1200, 0.2 * v, 'bandpass', n * 0.04 + r() * 0.02, 1.5); this.burst(0.06, 1400, 500, 0.2 * v, 'bandpass', 0.05, 6); }   // leaves thrashing, a twig snapping
    else if (k === 'umbrella') { this.burst(0.18, 300 * j, 900, 0.32 * v, 'lowpass'); this.burst(0.12, 1500, 500, 0.14 * v, 'bandpass', 0.12, 2); this.metal(820 * j, 0.12, 0.04 * v, 0.02); }   // the canvas whumps and flaps, the pole rattles
    else if (k === 'hydrant') { this.metal(240 * j, 0.6, 0.16 * v); this.burst(0.08, 1800, 500, 0.3 * v); this.burst(2.6, 600, 2400, 0.18 * v, 'bandpass', 0.06, 0.7); this.burst(2.6, 5200, 3000, 0.13 * v, 'highpass', 0.1); }   // a heavy clank, then the gush and hiss of water
    else if (k === 'meter') { this.metal(1100 * j, 0.3, 0.1 * v); this.burst(0.05, 2400, 1000, 0.2 * v, 'bandpass', 0, 3); for (let n = 0; n < 5; n++) this.metal(2400 + r() * 1800, 0.07, 0.03 * v, 0.08 + n * 0.05 + r() * 0.03); }   // a thin ping, then coins jingling out
    else if (k === 'news') { this.metal(520 * j, 0.25, 0.1 * v); this.burst(0.1, 1600, 500, 0.24 * v); this.burst(0.25, 3000, 1400, 0.1 * v, 'bandpass', 0.06, 1.2); }   // a sheet-metal box bangs, newspapers flutter out
    else if (k === 'wheelie') { this.burst(0.14, 700 * j, 160, 0.38 * v); this.tone(130 * j, 70, 0.14, 0.26 * v, 'triangle'); this.burst(0.08, 1400, 600, 0.12 * v, 'bandpass', 0.06, 2); }   // a hollow plastic bonk, the lid slapping
    else if (k === 'barrel') { this.metal(140 * j, 0.7, 0.18 * v); this.tone(90 * j, 70, 0.4, 0.2 * v, 'sine'); this.burst(0.08, 1500, 400, 0.26 * v); }   // a deep oil-drum boom
    else { this.metal(380 * j, 0.32, 0.12 * v); this.burst(0.1, 1800, 400, 0.24 * v); this.burst(0.18, 1200, 400, 0.08 * v, 'bandpass', 0.05, 1.5); }   // a street bin: a tinny clang, trash spilling
  },
  greet(v) {                             // the Colony's valet says hello: a bright arcade ding-dong
    if (!this.ctx || this.muted || !(v > 0.04)) return;
    this.tone(1318, 1318, 0.12, 0.14 * v, 'square'); this.tone(988, 988, 0.22, 0.14 * v, 'square', 0.13); this.tone(1976, 1976, 0.08, 0.05 * v, 'triangle');
  },
  pickup() { this.tone(660, 990, 0.12, 0.15, 'square'); },
  hurt() { this.tone(220, 90, 0.16, 0.2, 'sawtooth'); },
  toggle() { this.muted = !this.muted; if (this.out) this.out.gain.value = this.muted ? 0 : 0.6; return this.muted; }
};

