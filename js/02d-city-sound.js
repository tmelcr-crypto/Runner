'use strict';
/* ---------- 2d. THE CITY'S OWN SOUND (js/01j citySound; streets table: City sound) ----------
   A living mix under everything else, all made here like the other sounds (js/02), heard from the middle of the screen:
     traffic   - a hum and a tyre hiss that grow with the moving cars around you; horns from a driver you block (on foot or in a car),
                 now and then from one stuck in a queue, and when you come at one fast; brakes squealing when a car stops hard;
     people    - arcade-style chatter from the people about (more where there are more, half at night, little in the rain), a shout
                 when someone turns on you, screams when people run;
     nature    - birds in the trees by day, crickets in the green at night, gulls and the surf near the sea, wind that grows with storms;
     far off   - a siren, dogs, a building site's hammers and drill (by day), a plane passing over, a car alarm - soft and muffled.
   Cars and people sound from where they are (left or right speaker) and fade with distance. Inside a car the whole mix is muffled
   and quieter; in menus, shops and cutscenes it fades out. */
const CS = { bus: null, far: null, lp: null, pan: false, scan: 0, farT: 6, hornT: 0, yellT: 0, brakeT: 0,
  hum: null, tyre: null, waves: null, foam: null, wind: null, crick: null };
const CS_VOW = [[800, 1200], [400, 2000], [300, 2300], [450, 800], [350, 700]];   // a e i o u: the two strongest resonances of each vowel

function csInit() {                      // once the sound has started (js/02 Snd.init, on the first touch or key)
  const c = Snd.ctx; if (!c || CS.bus) return;
  CS.pan = typeof c.createStereoPanner === 'function';
  CS.bus = c.createGain(); CS.bus.gain.value = 0; CS.lp = c.createBiquadFilter(); CS.lp.type = 'lowpass'; CS.lp.frequency.value = 16000;
  CS.bus.connect(CS.lp); CS.lp.connect(Snd.out);
  const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 1300; CS.far = c.createGain(); CS.far.connect(fl); fl.connect(CS.bus);   // far away: only the low end gets here
  const noise = (type, f, q, rate) => {                            // a looping noise through a filter into its own fader (silent until set)
    const s = c.createBufferSource(); s.buffer = Snd.noise; s.loop = true; if (rate) s.playbackRate.value = rate;
    const f1 = c.createBiquadFilter(); f1.type = type; f1.frequency.value = f; if (q) f1.Q.value = q;
    const g = c.createGain(); g.gain.value = 0; s.connect(f1); f1.connect(g); g.connect(CS.bus); s.start(0, Math.random()); return { s, f: f1, g };
  };
  const lfo = (type, hz, depth, param) => { const o = c.createOscillator(); o.type = type; o.frequency.value = hz; const d = c.createGain(); d.gain.value = depth; o.connect(d); d.connect(param); o.start(); return o; };
  CS.hum = noise('lowpass', 150, 0.7, 0.6); const h2 = c.createBiquadFilter(); h2.type = 'lowpass'; h2.frequency.value = 220;   // engines and tyres far and near: a low rumble
  CS.hum.f.disconnect(); CS.hum.f.connect(h2); h2.connect(CS.hum.g);
  CS.tyre = noise('bandpass', 1100, 0.5);                          // tyres on the asphalt: a soft hiss, wetter in the rain
  const swell = (n, base) => { const a = c.createGain(); a.gain.value = base; n.f.disconnect(); n.f.connect(a); a.connect(n.g); return a; };
  CS.waves = noise('lowpass', 520, 0.6, 0.8); const sw = swell(CS.waves, 0.55); lfo('sine', 0.11, 0.45, sw.gain);   // the surf rolls in and out
  CS.foam = noise('highpass', 2600); const sf = swell(CS.foam, 0.5); lfo('sine', 0.11, 0.5, sf.gain);
  CS.wind = noise('bandpass', 420, 0.7); lfo('sine', 0.07, 160, CS.wind.f.frequency);   // wind gusting through the streets and the trees
  const cri = c.createGain(); cri.gain.value = 0; cri.connect(CS.bus); CS.crick = { g: cri };   // crickets: two chirping in turn
  for (const [hz, rate, slow] of [[4400, 29, 1.3], [4750, 34, 0.9]]) {
    const o = c.createOscillator(); o.frequency.value = hz; const a = c.createGain(), b = c.createGain(); a.gain.value = 0.5; b.gain.value = 0.5;
    lfo('square', rate, 0.5, a.gain); lfo('square', slow, 0.5, b.gain); o.connect(a); a.connect(b); b.connect(cri); o.start();
  }
}
const csAtt = d => { const k = 1 - clamp(d / STR.csHear, 0, 1); return k * k; };     // louder the closer
const csPan = x => clamp((x - cam.x) / (STR.csHear * 0.8), -0.85, 0.85);              // from the side it is on
function csDest(pan, far) {                                         // where an event plays: through a panner when the browser has one
  const base = far ? CS.far : CS.bus; if (!CS.pan || !pan) return base;
  const p = Snd.ctx.createStereoPanner(); p.pan.value = pan; p.connect(base); return p;
}
function csEnv(g, t, dur, vol, att) {                               // a fade in, hold and fade out on a gain
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (att || 0.01));
  g.gain.setValueAtTime(vol, t + Math.max(att || 0.01, dur - 0.05)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
}
function csOsc(type, f0, f1, t, dur, vol, dest, filt) {             // one sweeping oscillator, optionally through a filter [type, freq, Q]
  const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type;
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  let n = o; if (filt) { const f = c.createBiquadFilter(); f.type = filt[0]; f.frequency.value = filt[1]; if (filt[2]) f.Q.value = filt[2]; o.connect(f); n = f; }
  csEnv(g, t, dur, vol, Math.min(0.02, dur * 0.3)); n.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.03); return o;
}
function csHiss(t, dur, f0, f1, vol, type, q, dest) {               // filtered noise, sweeping
  const c = Snd.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = Snd.noise; f.type = type; if (q) f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5, dur + 0.05);
}

/* ---------- the sounds ---------- */
function csHorn(v, pan, body, long, far) {   // two notes a third apart; buses and trucks low, sports cars and bikes high
  const big = /bus|truck|trash|fire|ambulance|limo/.test(body), small = /sports|super|bike|convertible/.test(body);
  const f = (big ? 205 : small ? 540 : 400) * rand(0.94, 1.06), t0 = Snd.ctx.currentTime + 0.01, d = csDest(pan, far);
  const toot = (t, dur) => { for (const k of [1, 1.26]) csOsc('square', f * k, f * k * 0.995, t, dur, 0.055 * v, d, ['bandpass', big ? 700 : 1300, 0.9]); };
  const dur = long ? rand(0.7, 1.1) : rand(0.16, 0.38); toot(t0, dur);
  if (!long && Math.random() < 0.4) toot(t0 + dur + rand(0.08, 0.16), rand(0.14, 0.3));   // honk-honk
}
function csBrake(v, pan) {                    // a squeal sliding down as the car stops
  const t = Snd.ctx.currentTime, d = csDest(pan), f = rand(1900, 3100), dur = rand(0.35, 0.8);
  const o = csOsc('triangle', f, f * 0.9, t, dur, 0.05 * v, d), c = Snd.ctx, vib = c.createOscillator(), vg = c.createGain();
  vib.frequency.value = rand(6, 11); vg.gain.value = 30; vib.connect(vg); vg.connect(o.frequency); vib.start(t); vib.stop(t + dur + 0.05);
  csHiss(t, dur, f * 1.05, f * 0.85, 0.035 * v, 'bandpass', 7, d);
}
function csSyl(t, f0, f1, dur, vow, vol, dest) {    // one sung syllable of gibberish: a buzzing voice through the vowel's resonances
  const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(), F = CS_VOW[vow]; o.type = 'square';
  o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  const p1 = c.createBiquadFilter(); p1.type = 'peaking'; p1.frequency.value = F[0]; p1.Q.value = 2; p1.gain.value = 12;
  const p2 = c.createBiquadFilter(); p2.type = 'peaking'; p2.frequency.value = F[1]; p2.Q.value = 3; p2.gain.value = 9;
  o.connect(lp); lp.connect(p1); p1.connect(p2); p2.connect(g); csEnv(g, t, dur, vol, dur * 0.3); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}
function csChat(p, v) {                       // a person says something: two to six syllables, a voice of their own
  if (!p.csVo) p.csVo = rand(0, 1) < 0.5 ? rand(95, 140) : rand(170, 250);
  const d = csDest(csPan(p.x)), n = randi(2, 6), up = Math.random() < 0.3;   // now and then a question: the last syllable goes up
  let t = Snd.ctx.currentTime + 0.01, f = p.csVo * rand(0.95, 1.08);
  for (let i = 0; i < n; i++) {
    const dur = rand(0.06, 0.15), last = i === n - 1, f1 = last ? f * (up ? 1.3 : 0.82) : f * rand(0.92, 1.1);
    csSyl(t, f, f1, dur, randi(0, 4), 0.022 * v, d); t += dur + rand(0.02, 0.08); f = f1 * rand(0.96, 1.05);
  }
  if (Math.random() < 0.08) for (let i = 0; i < 3; i++) csSyl(t + 0.1 + i * 0.13, p.csVo * 1.5, p.csVo * 1.3, 0.09, 0, 0.02 * v, d);   // a laugh: ha-ha-ha
}
function csScream(p, v) {                     // someone runs from trouble
  const t = Snd.ctx.currentTime, d = csDest(csPan(p.x)), f = (p.csVo || rand(150, 240)) * rand(2.4, 3), dur = rand(0.55, 0.9);
  const c = Snd.ctx, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(), pk = c.createBiquadFilter(), vib = c.createOscillator(), vg = c.createGain();
  o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 1.45, t + 0.14); o.frequency.linearRampToValueAtTime(f * 0.85, t + dur);
  vib.frequency.value = 7; vg.gain.value = f * 0.04; vib.connect(vg); vg.connect(o.frequency);
  lp.type = 'lowpass'; lp.frequency.value = 2600; pk.type = 'peaking'; pk.frequency.value = 900; pk.Q.value = 1.5; pk.gain.value = 10;
  o.connect(lp); lp.connect(pk); pk.connect(g); csEnv(g, t, dur, 0.04 * v, 0.04); g.connect(d); o.start(t); vib.start(t); o.stop(t + dur + 0.02); vib.stop(t + dur + 0.02);
}
function csShout(p, v) {                      // "HEY!" - someone turning on you
  const t = Snd.ctx.currentTime, d = csDest(csPan(p.x)), f = (p.csVo || 130) * 1.6;
  csSyl(t, f * 0.9, f * 1.25, 0.12, 1, 0.05 * v, d); csSyl(t + 0.12, f * 1.25, f * 0.95, 0.16, 2, 0.045 * v, d);
}
function csBird(v, pan) {                     // three kinds of songbird
  const t = Snd.ctx.currentTime + 0.01, d = csDest(pan), k = randi(0, 2), b = rand(2600, 3800);
  if (k === 0) for (let i = 0, n = randi(3, 6); i < n; i++) csOsc('sine', b, b * 1.5, t + i * 0.11, 0.06, 0.036 * v, d);              // quick rising chirps
  else if (k === 1) { csOsc('sine', b, b * 0.98, t, 0.18, 0.032 * v, d); csOsc('sine', b * 1.26, b * 1.22, t + 0.22, 0.22, 0.032 * v, d); }   // a two-note whistle
  else for (let i = 0; i < 12; i++) csOsc('sine', b * 1.2, b * 1.05, t + i * 0.035, 0.028, 0.026 * v, d);                          // a trill
}
function csGull(v, pan) {                     // kee-ow
  const t = Snd.ctx.currentTime + 0.01, d = csDest(pan);
  for (let i = 0, n = randi(1, 3); i < n; i++) { const s = t + i * rand(0.4, 0.55), f = rand(1150, 1400); csOsc('sawtooth', f, f * 1.55, s, 0.08, 0.025 * v, d, ['bandpass', 1700, 2.5]); csOsc('sawtooth', f * 1.55, f * 0.75, s + 0.08, 0.3, 0.025 * v, d, ['bandpass', 1500, 2.5]); }
}
function csFar(v) {                           // one sound far away: a siren, dogs, a building site, a plane, a car alarm, a horn
  const t = Snd.ctx.currentTime + 0.02, pan = rand(-0.8, 0.8), d = csDest(pan, true), c = Snd.ctx, day = SKY.hour > 7 && SKY.hour < 18;
  const opts = [['siren', P.stars > 0 ? 0 : 2], ['dog', SKY.night > 0.5 ? 3 : 1.5], ['site', day ? 2.5 : 0], ['plane', feat('planes') ? 1.5 : 0], ['alarm', 1], ['horn', 1.5]];
  let r = Math.random() * opts.reduce((a, o) => a + o[1], 0), k = 'horn'; for (const o of opts) if ((r -= o[1]) < 0) { k = o[0]; break; }
  if (k === 'siren') {                                              // a wail rising and falling, coming and going
    const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain(), dur = rand(4, 7); o.type = 'triangle'; o.frequency.value = 780;
    l.frequency.value = rand(0.22, 0.35); lg.gain.value = 170; l.connect(lg); lg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03 * v, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(d); o.start(t); l.start(t); o.stop(t + dur + 0.05); l.stop(t + dur + 0.05);
  } else if (k === 'dog') {
    const f = rand(230, 330); for (let i = 0, n = randi(2, 4); i < n; i++) { const s = t + i * rand(0.28, 0.45); csOsc('square', f, f * 0.7, s, 0.13, 0.06 * v, d, ['bandpass', 650, 1.4]); csHiss(s, 0.1, 1200, 500, 0.04 * v, 'bandpass', 1.5, d); }
  } else if (k === 'site') {
    if (Math.random() < 0.6) for (let i = 0, n = randi(4, 8); i < n; i++) for (const [r_, a] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) csOsc('sine', 820 * r_, 815 * r_, t + i * rand(0.33, 0.42), 0.25, 0.03 * a * v, d);   // a hammer on steel
    else {                                                          // a pneumatic drill
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), am = c.createGain(), l = c.createOscillator(), lg = c.createGain(), dur = rand(1.2, 2.4);
      s.buffer = Snd.noise; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1; am.gain.value = 0.5; l.type = 'square'; l.frequency.value = 24; lg.gain.value = 0.5; l.connect(lg); lg.connect(am.gain);
      csEnv(g, t, dur, 0.08 * v, 0.05); s.connect(f); f.connect(am); am.connect(g); g.connect(d); s.start(t, 0, dur + 0.05); l.start(t); l.stop(t + dur + 0.05);
    }
  } else if (k === 'plane') {                                       // a jet passing over: a roar that swells and fades
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), dur = rand(8, 12); s.buffer = Snd.noise; s.loop = true; f.type = 'lowpass';
    f.frequency.setValueAtTime(220, t); f.frequency.linearRampToValueAtTime(700, t + dur * 0.5); f.frequency.linearRampToValueAtTime(200, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09 * v, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(CS.bus); s.start(t); s.stop(t + dur + 0.05);
  } else if (k === 'alarm') {
    for (let i = 0; i < 10; i++) csOsc('square', i % 2 ? 900 : 1250, i % 2 ? 900 : 1250, t + i * 0.24, 0.2, 0.02 * v, d);
  } else csHorn(0.45 * v, pan, pick(['sedan', 'truck', 'sports', 'bus']), Math.random() < 0.3, true);
}

/* ---------- every frame (js/15 frame): the faders follow what is around the middle of the screen ---------- */
function cityFrame(dt) {
  if (!Snd.ctx || Snd.muted) return; if (!CS.bus) csInit(); if (!CS.bus) return;
  const c = Snd.ctx, t = c.currentTime, on = feat('citySound') && STR.csVolume > 0 && (state === 'play' || state === 'dying') && !SV.on && !bigOpen && !wheelOpen;
  CS.bus.gain.setTargetAtTime(on ? STR.csVolume * (P.car ? STR.csInCar : 1) : 0, t, on ? 0.6 : 0.15);
  CS.lp.frequency.setTargetAtTime(P.car ? 950 : 16000, t, 0.2);
  if (!on || (CS.scan -= dt) > 0) return; const sd = 0.1; CS.scan = sd;
  const H = STR.csHear, day = 1 - SKY.night, rain = clamp(SKY.rain, 0, 1);
  // traffic: the hum and the hiss, brakes, horns
  let hum = 0, hiss = 0; const me = P.car, tgt = P.car || P;
  for (const k of cars) {
    if (k === me || k.dead || k.sunk) continue;
    const d = dist(k.x, k.y, cam.x, cam.y); if (d > H * 4) { k.csV = undefined; continue; }
    const s = carSpeed(k), w = 1 - d / (H * 4); hum += (0.25 + s / (50 * KMH)) * w * w * (s > 3 * KMH ? 1 : 0.04); hiss += s / (60 * KMH) * Math.max(0, 1 - d / (H * 1.5));
    if (d < H) {
      const v = csAtt(d), pn = csPan(k.x);
      if (k.csV !== undefined && (k.csV - s) / sd > 8.5 * MPS && k.csV > 35 * KMH && CS.brakeT < gameT && Math.random() < 0.6) { CS.brakeT = gameT + rand(4, 9); if (STR.csHorns > 0) csBrake(v * STR.csHorns, pn); }   // stopping hard (a crash too)
      if (k.driver === 'ai' && STR.csHorns > 0) {
        k.csS = s < 2 * KMH ? (k.csS || 0) + sd : 0;
        const fx = Math.cos(k.ang), fy = Math.sin(k.ang), rx = tgt.x - k.x, ry = tgt.y - k.y, fw = rx * fx + ry * fy, lat = Math.abs(rx * fy - ry * fx);
        const blocked = fw > 0 && fw < k.t.len / 2 + (P.car ? P.car.t.len / 2 : 0) + 70 && lat < k.t.wid / 2 + (P.car ? P.car.t.wid / 2 : 0) + 20;
        let honk = 0;
        if (blocked && k.csS > STR.csHornAfter) honk = 1;                                              // you are in the way
        else if (k.csS > STR.csHornAfter * 4 && Math.random() < 0.015) honk = 1;                       // stuck in a queue: now and then
        else if (me && carSpeed(me) > 40 * KMH && d < 170) {                                           // you come at them fast
          const vx = me.vx - k.vx, vy = me.vy - k.vy, close = -(vx * (me.x - k.x) + vy * (me.y - k.y)) / Math.max(1, dist(me.x, me.y, k.x, k.y));
          if (close > 35 * KMH && Math.random() < 0.5) honk = 2;
        }
        if (honk && !(k.csH > gameT) && CS.hornT < gameT) { k.csH = gameT + (honk === 2 ? 4 : blocked ? rand(2.5, 5) : rand(8, 14)); CS.hornT = gameT + 0.35; csHorn(v * STR.csHorns, pn, k.t.body, honk === 2 || (blocked && Math.random() < 0.3)); }
      }
    }
    k.csV = s;
  }
  const traffic = STR.csTraffic * (1 - 0.45 * SKY.night);
  CS.hum.g.gain.setTargetAtTime(traffic * (0.012 + 0.07 * (1 - Math.exp(-hum / 2.2))), t, 0.4);
  CS.tyre.g.gain.setTargetAtTime(traffic * 0.035 * (1 - Math.exp(-hiss / 1.5)) * (1 + 0.8 * clamp(SKY.wet, 0, 1)), t, 0.3);
  CS.tyre.f.frequency.setTargetAtTime(SKY.wet ? 2400 : 1100, t, 1);
  // people: chatter, a shout when someone turns on you, screams from people running
  if (STR.csPeople > 0) {
    const talk = [];
    for (const p of peds) {
      if (p.dead || p.knocked) continue; const d = dist(p.x, p.y, cam.x, cam.y); if (d > H) { p.csF = p.state === 'flee'; p.csA = !!p.hostile; continue; }
      const v = csAtt(d) * STR.csPeople;
      if (p.state === 'flee' && !p.csF && CS.yellT < gameT && Math.random() < 0.45) { CS.yellT = gameT + 0.45; csScream(p, v); }
      if (p.hostile && !p.csA && CS.yellT < gameT) { CS.yellT = gameT + 0.3; csShout(p, v); }
      p.csF = p.state === 'flee'; p.csA = !!p.hostile;
      if (!p.hostile && p.state !== 'flee' && !p.cop && !p.soldier && !p.medic) talk.push(p);
    }
    const rate = 0.12 * Math.min(talk.length, 30) * (1 - 0.5 * SKY.night) * (1 - 0.7 * rain);
    if (talk.length && Math.random() < 1 - Math.exp(-rate * sd)) { const p = pick(talk); csChat(p, csAtt(dist(p.x, p.y, cam.x, cam.y)) * STR.csPeople); }
  }
  // nature: trees and the sea near the middle of the screen
  const N = STR.csNature; let trees = 0, near = null;
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = TRGRID.get(tkey(cam.x + i * TG, cam.y + j * TG)); if (l) for (const T of l) if (!T.gone) { trees++; if (!near || Math.random() < 0.2) near = T; } }
  const green = clamp(trees / 12, 0, 1), sh = shoreDist(cam.x, cam.y), sea = sh < -5000 ? 0 : clamp(1 - Math.abs(sh) / (55 * MPS), 0, 1);
  if (N > 0 && near && day > 0.5 && rain < 0.3 && Math.random() < 1 - Math.exp(-0.55 * green * sd)) csBird(N * (0.5 + 0.5 * csAtt(dist(near.x, near.y, cam.x, cam.y))), csPan(near.x));
  if (N > 0 && sea > 0.15 && day > 0.5 && Math.random() < 1 - Math.exp(-0.12 * sea * sd)) csGull(N * sea, rand(-0.7, 0.7));
  CS.crick.g.gain.setTargetAtTime(N * 0.035 * clamp((SKY.night - 0.4) * 2, 0, 1) * Math.max(green, 0.45 * (1 - sea)) * (1 - rain), t, 1);
  CS.waves.g.gain.setTargetAtTime(N * 0.11 * Math.pow(sea, 1.5) * (1 + 0.8 * SKY.storm), t, 0.8);
  CS.foam.g.gain.setTargetAtTime(N * 0.025 * Math.pow(sea, 2) * (1 + SKY.storm), t, 0.8);
  CS.wind.g.gain.setTargetAtTime(N * (0.01 + 0.06 * clamp(SKY.wind / 190, 0, 1) + 0.012 * green), t, 1.2);
  // far off
  if ((CS.farT -= sd) <= 0) { CS.farT = STR.csFarEvery * rand(0.5, 1.5); if (STR.csFar > 0) csFar(STR.csFar); }
}
