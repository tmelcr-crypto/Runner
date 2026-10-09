'use strict';
/* ---------- 2b. CAR RADIO ----------
   One audio element plays the station of the car you are in (stations: js/01e). Every station is "live": it runs on its own clock
   from when the page opened, so you tune in mid-song, and coming back to it later you hear the music further on.
   Each car has its station (car.radio, -1 = off), kept while you drive it. R or the RADIO button tunes to the next one, with a burst
   of static, and the station's name shows for a moment. The radio fades out when you get out, die or pause; M mutes it with the rest.
   The music goes through the game's Web Audio output, so the volume works on phones too - except from a file:// page, where the
   browser would play it silent that way: there the element plays on its own. */
const Radio = {
  el: null, gain: null, cur: -1, lvl: 0, shownT: 0, failed: {}, pend: 0, off: RADIO.map(() => Math.random() * 900),
  vol: Math.max(0, Math.min(1, (RADIO_TABLE.volume || 0) / 100)) * 0.6,
  init() {                                   // from Snd.init, inside a tap or key press: phones only let audio start there
    if (this.el || !RADIO.length) return;
    const el = this.el = new Audio(); el.loop = true; el.preload = 'auto';
    el.addEventListener('error', () => { if (this.cur >= 0 && !this.failed[this.cur]) { this.failed[this.cur] = true; this.show('NO SIGNAL', RADIO[this.cur].name + ' - FILE MISSING', '#8b90b8'); } });
    if (Snd.ctx && location.protocol !== 'file:') {
      try { const s = Snd.ctx.createMediaElementSource(el); this.gain = Snd.ctx.createGain(); this.gain.gain.value = 0; s.connect(this.gain); this.gain.connect(Snd.out); } catch (e) { this.gain = null; }
    }
    this.apply(0); el.src = RADIO_DIR + RADIO[0].file;          // start it once, silently, so the browser lets it play later
    const p = el.play(); if (p && p.then) p.then(() => { if (this.cur < 0) el.pause(); }).catch(() => { });
  },
  live(i) { return (performance.now() / 1000 + this.off[i]) % this.el.duration; },
  seek() {                                   // jump to the live position once the browser can (true when done)
    const el = this.el; if (!(isFinite(el.duration) && el.duration > 0)) return false;
    const to = this.live(this.cur), r = el.seekable;
    for (let k = 0; k < r.length; k++) if (to >= r.start(k) && to <= r.end(k)) { try { el.currentTime = to; } catch (e) { return false; } return true; }
    return false;                              // a server without byte ranges: only once the whole file is in
  },
  tune(i) {                                  // switch the element to station i, at its live position
    const el = this.el, url = RADIO_DIR + RADIO[i].file; this.cur = i;
    if (!el.src.endsWith(url)) el.src = url;
    this.pend = performance.now() + 1500;      // up to 1.5 s to find the live position, silent meanwhile
    const p = el.play(); if (p && p.catch) p.catch(() => { });
  },
  apply(v) { if (this.gain) this.gain.gain.value = v; else if (this.el) { this.el.volume = v; this.el.muted = Snd.muted; } },
  next() {                                   // R / RADIO: the next station; after the last one the radio goes off
    const c = P.car; if (!c || !RADIO.length) return;
    c.radio = c.radio + 1 >= RADIO.length ? -1 : c.radio + 1;
    Snd.burst(0.2, 3200, 1400, 0.16, 'bandpass');                 // static between the stations
    if (c.radio < 0) this.show('RADIO OFF', '', '#8b90b8');
  },
  show(name, sub, col) { const e = $('radioName'); e.innerHTML = ''; e.append(name); if (sub) { const s = document.createElement('small'); s.textContent = sub; e.append(s); } e.style.color = col; e.classList.add('on'); this.shownT = 2.6; },
  update(dt) {                               // every frame (js/15): what should play, and fading in and out
    if (!this.el) return;
    const c = P.car, want = state === 'play' && c && !P.dead ? c.radio : -1;
    if (want >= 0 && want !== this.cur) {                         // got in, or tuned: the new station at once, faded in
      if (this.cur >= 0) this.lvl = 0;
      this.tune(want); const s = RADIO[want];
      if (this.failed[want]) this.show('NO SIGNAL', s.name + ' - FILE MISSING', '#8b90b8'); else this.show(s.name + ' ' + s.freq, s.style, s.color);
    }
    if (this.pend && this.cur >= 0 && (this.seek() || performance.now() > this.pend || this.failed[this.cur])) this.pend = 0;   // else from where it is
    const goal = want >= 0 && want === this.cur && !this.pend ? this.vol : 0;
    this.lvl = goal > this.lvl ? Math.min(goal, this.lvl + dt * 1.6) : Math.max(goal, this.lvl - dt * 2.2);
    if (want < 0 && this.cur >= 0 && this.lvl <= 0) { this.el.pause(); this.cur = -1; }   // faded out: stop
    this.apply(this.lvl);
    if (this.shownT > 0 && (this.shownT -= dt) <= 0) $('radioName').classList.remove('on');
  },
};
document.addEventListener('visibilitychange', () => { if (document.hidden && Radio.el) { Radio.el.pause(); Radio.cur = -1; Radio.lvl = 0; Radio.apply(0); } });
