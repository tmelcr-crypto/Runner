'use strict';
/* ---------- 2c. MUSIC FOR THE CUTSCENES ----------
   Tracks the game plays itself through Web Audio, for the cinematics (js/15c): a sequencer that schedules each sixteenth note a
   moment ahead. One track for now, NEON SKYLINE - a 90s synth piece in A minor at 112 beats a minute: four-on-the-floor kick, claps,
   hi-hats, a pumping octave bass, wide detuned pads, a sixteenth-note arpeggio with an echo and a lead hook. It is built in sections
   (intro, groove, the hook, a breakdown, the hook again) that keep going round, so two minutes never sound like one short loop.
   It plays through the game's sound (the SND button mutes it too). Music.play(id), Music.stop(fade seconds). */
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);              // MIDI note number -> Hz
const SONGS = {
  scenic: {
    bpm: 112,
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],   // Am, F, C, G - one a bar
    hook: [76, -1, 74, 72, -1, 72, 74, 76, 79, -1, 76, -1, 74, -1, -1, -1,  77, -1, 76, 74, -1, 72, 74, 76, 72, -1, -1, 69, -1, -1, -1, -1,
           76, -1, 74, 72, -1, 72, 74, 76, 79, -1, 81, -1, 79, -1, 76, -1,  74, -1, 72, 74, -1, 76, 74, 72, 71, -1, -1, -1, -1, -1, -1, -1],   // two bars a line, -1: rest
    // sections, bar by bar: which parts play (p pad, a arp, k kick, s snare, h hats, b bass, l lead); the list goes round from loopAt
    form: ['pa', 'pa', 'pa', 'pak', 'pakhb', 'pakhb', 'pakhsb', 'pakhsb', 'pakhsbl', 'pakhsbl', 'pakhsbl', 'pakhsbl', 'pakhsbl', 'pakhsbl', 'pakhsbl', 'pakhsbl',
           'pa', 'pa', 'pab', 'pakb', 'pakhsb', 'pakhsb', 'pakhsbl', 'pakhsbl', 'pakhsbl', 'pakhsbl', 'pakhsbl', 'pakhsbl'],
    loopAt: 4
  }
};
const Music = {
  on: false, song: null, step: 0, next: 0, timer: 0, g: null, echo: null, stopAt: 0,
  play(id) {
    const c = Snd.ctx; if (!c || !SONGS[id]) return;
    this.stop(0); this.on = true; this.song = SONGS[id]; this.step = 0; this.next = c.currentTime + 0.12;
    this.g = c.createGain(); this.g.gain.setValueAtTime(0.0001, c.currentTime); this.g.gain.exponentialRampToValueAtTime(0.9, c.currentTime + 2.5); this.g.connect(Snd.out);
    const d = c.createDelay(1), fb = c.createGain(), wet = c.createGain(), lp = c.createBiquadFilter();   // the echo: three sixteenths, dulled on each pass
    d.delayTime.value = 3 * 60 / this.song.bpm / 4; fb.gain.value = 0.38; wet.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2600;
    d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(wet); wet.connect(this.g); this.echo = d;
    this.timer = setInterval(() => this.tick(), 40); this.tick();
  },
  stop(fade) {
    if (!this.on) return; this.on = false; clearInterval(this.timer);
    const c = Snd.ctx, g = this.g; if (!c || !g) return;
    const t = c.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fade || 0)); setTimeout(() => { try { g.disconnect(); } catch (e) { } }, (fade || 0) * 1000 + 300);
  },
  tick() {                               // schedule what falls in the next 0.25 s
    const c = Snd.ctx; if (!this.on || !c) return;
    const s16 = 60 / this.song.bpm / 4;
    if (this.next < c.currentTime) this.next = c.currentTime + 0.05;  // after a stall (a hidden tab), start again from now
    while (this.next < c.currentTime + 0.25) { this.note16(this.step, this.next, s16); this.next += s16; this.step++; }
  },
  note16(step, t, s16) {                 // one sixteenth: every part that plays in this bar
    const S = this.song, bar = Math.floor(step / 16), k = step % 16, F = S.form, b = bar < F.length ? bar : S.loopAt + (bar - S.loopAt) % (F.length - S.loopAt);
    const on = F[b], ch = S.chords[bar % S.chords.length], root = ch[0];
    if (on.includes('p') && k === 0) this.pad(ch, t, s16 * 16);
    if (on.includes('a')) { const seq = [0, 1, 2, 1, 0, 1, 2, 3], n = seq[k % 8], oct = k >= 8 ? 12 : 0; this.arp((n === 3 ? ch[0] + 12 : ch[n]) + 12 + oct, t, s16); }
    if (on.includes('k') && k % 4 === 0) this.kick(t);
    if (on.includes('s') && (k === 4 || k === 12)) this.clap(t);
    if (on.includes('h')) { if (k % 4 === 2) this.hat(t, 0.13, true); else if (k % 2 === 1) this.hat(t, 0.05, false); }
    if (on.includes('b') && k % 2 === 0) this.bass(root - 12 + (k % 4 === 2 ? 12 : 0), t, s16 * 1.6);
    if (on.includes('l')) { const n = S.hook[(bar % 4) * 16 + k]; if (n > 0) { let len = 1; while (len < 8 && S.hook[((bar % 4) * 16 + k + len) % S.hook.length] === -1) len++; this.lead(n, t, s16 * len); } }
  },
  env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  osc(type, f, t, dur, dest, det) { const o = Snd.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det; o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; },
  kick(t) { const c = Snd.ctx, g = c.createGain(), o = this.osc('sine', 150, t, 0.3, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); this.env(g, t, 0.003, 0.9, 0.26); g.connect(this.g); },
  clap(t) {
    const c = Snd.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = Snd.noise; f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 0.9;
    s.connect(f); f.connect(g); g.connect(this.g); this.env(g, t, 0.004, 0.45, 0.16); s.start(t, Math.random()); s.stop(t + 0.25);
  },
  hat(t, len, open) {
    const c = Snd.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = Snd.noise; f.type = 'highpass'; f.frequency.value = open ? 6500 : 8000;
    s.connect(f); f.connect(g); g.connect(this.g); this.env(g, t, 0.002, open ? 0.12 : 0.09, len); s.start(t, Math.random()); s.stop(t + len + 0.05);
  },
  bass(n, t, len) {
    const c = Snd.ctx, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.Q.value = 6;
    f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(220, t + len); this.osc('sawtooth', NOTE(n), t, len, f); this.osc('square', NOTE(n - 12), t, len, f);
    f.connect(g); g.connect(this.g); this.env(g, t, 0.005, 0.32, len);
  },
  pad(ch, t, len) {                       // the chord, wide and slow, two detuned saws a note
    const c = Snd.ctx, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1600, t + len * 0.6);
    for (const n of ch) for (const d of [-9, 9]) this.osc('sawtooth', NOTE(n), t, len + 0.4, f, d);
    f.connect(g); g.connect(this.g); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.07, t + 0.6); g.gain.setValueAtTime(0.07, t + len - 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.4);
  },
  arp(n, t, s16) {
    const c = Snd.ctx, f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = 3200;
    this.osc('square', NOTE(n), t, s16, f); f.connect(g); g.connect(this.g); g.connect(this.echo); this.env(g, t, 0.003, 0.05, s16 * 0.9);
  },
  lead(n, t, len) {                       // the hook: a bright saw and a square an octave down, a little vibrato
    const c = Snd.ctx, f = c.createBiquadFilter(), g = c.createGain(), v = c.createOscillator(), vg = c.createGain(); f.type = 'lowpass'; f.frequency.value = 2400; f.Q.value = 2;
    v.frequency.value = 5.5; vg.gain.value = 6; v.connect(vg);
    const a = this.osc('sawtooth', NOTE(n), t, len, f), b = this.osc('square', NOTE(n - 12), t, len, f, 6); vg.connect(a.detune); vg.connect(b.detune); v.start(t); v.stop(t + len + 0.05);
    f.connect(g); g.connect(this.g); g.connect(this.echo);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.085, t + 0.02); g.gain.setValueAtTime(0.085, t + Math.max(0.03, len - 0.06)); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.08);
  }
};
