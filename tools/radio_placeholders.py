#!/usr/bin/env python3
"""Placeholder music for the car radio: one synthesized loop per station of js/01e-radio-data.js, saved as audio/radio/<file>.

  python3 tools/radio_placeholders.py              # every station
  python3 tools/radio_placeholders.py neon riot    # only these (station ids)

Replace any of the files with real music under the same name and the game plays that instead (the radio loops whatever it finds).
The loops are seamless: the echoes and reverb of the last bars are folded back over the first ones.
Needs numpy, scipy and ffmpeg with libmp3lame."""
import json, os, re, subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
rng = np.random.default_rng(97)


def stations():
    s = open(os.path.join(ROOT, 'js', '01e-radio-data.js')).read()
    return json.loads(re.search(r'/\*RADIO-JSON\*/(.*?)/\*END-RADIO-JSON\*/', s, re.S).group(1))['stations']


def m2f(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def ns(sec):
    return max(1, int(round(sec * SR)))


def tt(n):
    return np.arange(n) / SR


# ---------- oscillators (band-limited with polyBLEP), noise, envelopes, filters ----------
def phase(f, n, ph0=0.0):
    if np.isscalar(f):
        return (ph0 + f * np.arange(n) / SR) % 1.0, np.full(n, f / SR)
    return (ph0 + np.cumsum(f) / SR) % 1.0, f / SR


def blep(p, dt):
    y = np.zeros_like(p)
    m = p < dt; x = p[m] / dt[m]; y[m] = x + x - x * x - 1
    m = p > 1 - dt; x = (p[m] - 1) / dt[m]; y[m] = x * x + x + x + 1
    return y


def saw(f, n, ph0=0.0):
    p, dt = phase(f, n, ph0); return 2 * p - 1 - blep(p, dt)


def square(f, n, ph0=0.0):
    p, dt = phase(f, n, ph0); return np.where(p < 0.5, 1.0, -1.0) + blep(p, dt) - blep((p + 0.5) % 1.0, dt)


def sine(f, n, ph0=0.0):
    p, _ = phase(f, n, ph0); return np.sin(2 * np.pi * p)


def noise(n):
    return rng.uniform(-1, 1, n)


def adsr(n, a=0.005, d=0.1, s=0.7, r=0.05):
    T = n / SR; a = min(a, T * 0.5); d = min(d, max(0.0, T - a)); r = min(r, max(0.0, T - a - d))
    return np.interp(tt(n), [0, a, a + d, T - r, T], [0, 1, s, s, 0])


def dec(n, k):
    return np.exp(-tt(n) * k)


def flt(x, kind, fc, order=2):
    fc = np.clip(fc, 20, SR * 0.45)
    return sosfilt(butter(order, fc, kind, fs=SR, output='sos'), x)


def lp(x, fc, order=2): return flt(x, 'low', fc, order)
def hp(x, fc, order=2): return flt(x, 'high', fc, order)
def bp(x, lo, hi, order=2): return flt(x, 'band', [lo, hi], order)


def vib(f, n, depth=0.004, rate=5.5, delay=0.18):
    t = tt(n); return f * (1 + depth * np.sin(2 * np.pi * rate * t) * np.clip((t - delay) / 0.3, 0, 1))


# ---------- drums ----------
def kick(dur=0.45, f0=150, f1=48, k=28, click=0.35):
    n = ns(dur); t = tt(n)
    x = sine(f1 + (f0 - f1) * np.exp(-t * k), n) * np.exp(-t * 3.5 / dur)
    x += click * lp(noise(n), 3500) * np.exp(-t * 300)
    return np.tanh(1.6 * x)


def snare(dur=0.3, tone=190, k=16, bright=6000):
    n = ns(dur); return bp(noise(n), 1100, bright) * dec(n, k) + 0.55 * sine(tone, n) * dec(n, 26)


def clap(dur=0.4):
    n = ns(dur); t = tt(n); e = np.zeros(n)
    for o in (0, 0.011, 0.022):
        e += np.where(t >= o, np.exp(-(t - o) * 190), 0)
    e += 0.5 * np.exp(-t * 13)
    return bp(noise(n), 900, 4200) * e


def hat(dur=0.06, k=70, lo=7000):
    n = ns(dur); return hp(noise(n), lo) * dec(n, k)


def crash(dur=2.2):
    n = ns(dur); return hp(noise(n), 3500) * dec(n, 2.1) * 0.8 + bp(noise(n), 5000, 9000) * dec(n, 4)


def rim(dur=0.07):
    n = ns(dur); return 0.6 * sine(1750, n) * dec(n, 80) + hp(noise(n), 2500) * dec(n, 140) * 0.6


def shaker(dur=0.09):
    n = ns(dur); return bp(noise(n), 4500, 11000) * adsr(n, 0.012, 0.03, 0.2, 0.04)


# ---------- instruments ----------
def pad(notes, dur, cutoff=1800, a=0.45, r=0.7, det=0.09):
    n = ns(dur + r); x = np.zeros(n)
    for m in notes:
        for d in (-det, det):
            x += saw(m2f(m) * 2 ** (d / 12), n, rng.random())
    return lp(x, cutoff) * adsr(n, a, 0.4, 0.8, r) / len(notes) * 0.7


def bass(m, dur, cutoff=700, kind='saw', r=0.03):
    n = ns(dur); f = m2f(m)
    x = (saw(f, n) if kind == 'saw' else square(f, n)) * 0.6 + 0.6 * sine(f, n)
    return lp(x, cutoff) * adsr(n, 0.004, 0.08, 0.75, r)


def sub808(m, dur):
    n = ns(dur); t = tt(n); f = m2f(m) * (1 + 0.35 * np.exp(-t * 40))
    return np.tanh(1.8 * sine(f, n)) * adsr(n, 0.003, 0.25, 0.6, 0.06)


def pluck(m, dur, k=7.0):                            # marimba-like
    n = ns(dur); f = m2f(m)
    return (sine(f, n) * dec(n, k) + 0.3 * sine(4 * f, n) * dec(n, k * 3) + 0.08 * sine(9.2 * f, n) * dec(n, k * 7)) * adsr(n, 0.002, 0.0, 1, 0.02)


def epiano(m, dur):
    n = ns(dur); f = m2f(m); t = tt(n)
    x = sine(f, n) + 0.32 * sine(2 * f, n) * dec(n, 3) + 0.1 * sine(3 * f, n) * dec(n, 6) + 0.05 * sine(7 * f, n) * dec(n, 18)
    return x * np.exp(-t * 1.1) * (1 + 0.14 * np.sin(2 * np.pi * 4.3 * t)) * adsr(n, 0.004, 0.0, 1, 0.12)


def stab(notes, dur=0.24):                           # house piano / organ chord stab
    n = ns(dur); x = np.zeros(n)
    for m in notes:
        f = m2f(m); x += sine(f, n) + 0.5 * sine(2 * f, n) + 0.22 * sine(3 * f, n) + 0.1 * sine(4 * f, n)
    return x * dec(n, 11) * adsr(n, 0.002, 0.0, 1, 0.03) / len(notes)


def lead(m, dur, kind='saw', cutoff=2600, a=0.01, r=0.12):
    n = ns(dur + r); f = vib(m2f(m), n)
    x = saw(f, n) if kind == 'saw' else square(f, n) if kind == 'square' else sine(f, n)
    return lp(x, cutoff) * adsr(n, a, 0.15, 0.75, r)


def flute(m, dur):
    n = ns(dur + 0.15); f = vib(m2f(m), n, 0.006, 5)
    return (sine(f, n) + 0.12 * sine(2 * f, n) + 0.04 * bp(noise(n), 1500, 5000)) * adsr(n, 0.06, 0.2, 0.8, 0.15)


def power(root, dur, muted=False):                   # distorted power chord: root, fifth, octave
    n = ns(dur + 0.05); x = np.zeros(n)
    for m in (root, root + 7, root + 12):
        for d in (-0.07, 0.07):
            x += saw(m2f(m) * 2 ** (d / 12), n, rng.random())
    x = np.tanh(5 * x / 3)
    x = lp(x, 1300 if muted else 3400, 2)
    return x * (dec(n, 9) if muted else adsr(n, 0.004, 0.2, 0.85, 0.05)) * 0.7


# ---------- the mixer: a loop of whole bars, a reverb bus, tails folded back to the start ----------
class Mix:
    def __init__(self, bpm, bars, swing=0.0):
        self.beat = 60.0 / bpm; self.L = ns(bars * 4 * self.beat); self.n = self.L + 6 * SR; self.swing = swing
        self.dry = np.zeros((2, self.n)); self.wet = np.zeros((2, self.n))

    def at(self, b):
        if self.swing and abs(b % 1 - 0.5) < 1e-6:
            b += self.swing
        return int(round(b * self.beat * SR))

    def add(self, sig, b, gain=1.0, pan=0.0, rev=0.0, echo=()):
        for db, g, pn in ((0, 1, pan),) + tuple(echo):
            i = self.at(b + db) % self.L; s = sig * gain * g; k = min(len(s), self.n - i)
            l, r = np.cos((pn + 1) * np.pi / 4), np.sin((pn + 1) * np.pi / 4)
            self.dry[0, i:i + k] += s[:k] * l; self.dry[1, i:i + k] += s[:k] * r
            if rev:
                self.wet[0, i:i + k] += s[:k] * l * rev; self.wet[1, i:i + k] += s[:k] * r * rev

    def render(self, rev_t=1.8, rev_lp=5500, master_lp=None, drive=1.6):
        m = ns(rev_t); t = tt(m); out = self.dry.copy()
        for ch in (0, 1):
            ir = lp(noise(m), rev_lp) * np.exp(-t * 6.9 / rev_t); ir[:ns(0.018)] = 0; ir /= np.sqrt((ir ** 2).sum())
            out[ch] += fftconvolve(self.wet[ch], ir)[:self.n] * 0.9
        loop = out[:, :self.L].copy(); loop[:, :self.n - self.L] += out[:, self.L:]       # the tail of the end rings over the start
        if master_lp:
            loop = np.stack([lp(np.concatenate([c[-SR:], c]), master_lp)[SR:] for c in loop])   # pre-rolled, so the loop stays seamless
        loop -= loop.mean(axis=1, keepdims=True)
        loop /= np.abs(loop).max(); loop = np.tanh(drive * loop) / np.tanh(drive)          # a gentle limiter
        return loop * 10 ** (-1.0 / 20)


# ---------- the stations ----------
def neon():                                          # synthwave, 100 bpm, A minor
    M = Mix(100, 24); prog = [(57, 60, 64), (53, 57, 60), (55, 60, 64), (55, 59, 62)]; roots = [45, 41, 48, 43]
    mel = [[(0, 76, 1.5), (1.5, 74, .5), (2, 72, 1), (3, 71, 1)], [(0, 69, 2), (2, 72, 1), (3, 74, 1)],
           [(0, 76, 1.5), (1.5, 79, .5), (2, 76, 2)], [(0, 74, 3), (3, 71, 1)]]
    K, S, Hh = kick(0.5, 140, 45, 26), snare(0.4, 180, 12, 7000), [hat() for _ in range(4)]
    for bar in range(24):
        c = bar % 4; ch = prog[c]; b0 = bar * 4; drums = bar >= 4
        M.add(pad(ch, M.beat * 4), b0, 0.42, -0.45, 0.4); M.add(pad(ch, M.beat * 4), b0, 0.42, 0.45, 0.4)
        if bar < 20:
            tones = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12]
            for k in range(16):
                M.add(lead(tones[k % 4], 0.11, 'square', 2200, 0.003, 0.05), b0 + k / 4, 0.12, 0.3 if k % 2 else -0.3, 0.15, ((0.75, 0.35, -0.5), (1.5, 0.15, 0.5)))
        if drums:
            for k in range(8):
                M.add(bass(roots[c] + (12 if k % 2 else 0), M.beat * 0.45, 650), b0 + k / 2, 0.5)
            for bt in (0, 2):
                M.add(K, b0 + bt, 0.9)
            for bt in (1, 3):
                M.add(S, b0 + bt, 0.55, 0, 0.9)
            for k in range(8 if bar < 12 else 16):
                st = 2 if bar < 12 else 4
                M.add(Hh[k % 4], b0 + k / st, 0.22 if k % 2 == 0 else 0.13, 0.25)
        if bar in (4, 12):
            M.add(crash(), b0, 0.3, -0.3, 0.3)
        if 12 <= bar < 20:
            for b, m, d in mel[c]:
                M.add(lead(m, d * M.beat * 0.95, 'saw', 2400, 0.02, 0.2), b0 + b, 0.2, 0.1, 0.45, ((0.75, 0.25, -0.4),))
    return M.render(2.2)


def bay():                                           # house, 124 bpm, F minor
    M = Mix(124, 32); prog = [(53, 56, 60, 63), (49, 53, 56, 60), (51, 55, 58, 62), (48, 51, 55, 58)]; roots = [41, 37, 39, 36]
    mel = [(0, 77, 1), (1, 80, .5), (1.5, 77, .5), (2, 75, 1), (3, 72, 1), (4, 75, 2), (6, 77, 2)]
    K, C, Ho, Hc = kick(0.4, 160, 50, 32, 0.45), clap(), hat(0.25, 12, 6000), [hat(0.04, 90) for _ in range(4)]
    for bar in range(32):
        c = (bar // 2) % 4; ch = prog[c]; b0 = bar * 4; full = bar >= 8
        for bt in range(4):
            M.add(K, b0 + bt, 0.95)
            M.add(bass(roots[c], M.beat * 0.4, 380), b0 + bt + 0.5, 0.6)
            M.add(Ho, b0 + bt + 0.5, 0.17 if full else 0.1, 0.2)
            for q in (0.25, 0.75):
                M.add(Hc[(bt * 2 + int(q * 2)) % 4], b0 + bt + q, 0.08, -0.2)
        if full:
            for bt in (1, 3):
                M.add(C, b0 + bt, 0.5, 0, 0.25)
            for b in (0, 0.75, 1.5, 2.5, 3.25):
                M.add(stab(ch), b0 + b, 0.36, 0.15, 0.3)
        else:
            M.add(pad(ch, M.beat * 4, 900), b0, 0.3, 0, 0.4)
        if bar >= 24 and bar % 2 == 0:
            for b, m, d in mel:
                M.add(lead(m, d * M.beat * 0.9, 'sine', 6000, 0.03, 0.15), b0 + b, 0.2, -0.15, 0.5, ((0.75, 0.3, 0.5),))
        if bar in (8, 24):
            M.add(crash(), b0, 0.25, 0.3, 0.3)
    return M.render(1.6)


def palmera():                                       # reggaeton, 96 bpm, D minor
    M = Mix(96, 24); prog = [(50, 53, 57), (46, 50, 53), (48, 53, 57), (48, 52, 55)]; roots = [38, 34, 41, 36]
    mel = [[(0, 74, 1), (1, 77, .5), (1.5, 74, .5), (2, 72, 1), (3, 69, 1)], [(0, 70, 2), (2, 69, 1), (3, 65, 1)],
           [(0, 69, 1.5), (1.5, 72, .5), (2, 77, 2)], [(0, 76, 2), (2, 72, 2)]]
    K, S, Sh = kick(0.35, 170, 52, 34, 0.5), snare(0.18, 220, 26, 8000), [shaker() for _ in range(4)]
    tres = (0, 0.75, 1.5, 2, 2.75, 3.5)
    for bar in range(24):
        c = bar % 4; ch = prog[c]; b0 = bar * 4; drums = bar >= 2
        M.add(pad(ch, M.beat * 4, 1100), b0, 0.2, 0, 0.4)
        top = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12, ch[2] + 12, ch[0] + 24]
        for k, b in enumerate(tres):
            M.add(pluck(top[k], 0.5), b0 + b, 0.3, 0.3, 0.2)
        if drums:
            for bt in range(4):
                M.add(K, b0 + bt, 0.85)
            for b in (0.75, 1.5, 2.75, 3.5):
                M.add(S, b0 + b, 0.45, 0, 0.12)
            for k in range(16):
                M.add(Sh[k % 4], b0 + k / 4, 0.14 if k % 2 else 0.07, -0.35)
            for b in tres:
                M.add(sub808(roots[c], M.beat * 0.65), b0 + b, 0.5)
        if 12 <= bar < 24:
            for b, m, d in mel[c]:
                M.add(lead(m, d * M.beat * 0.92, 'saw', 1900, 0.04, 0.12), b0 + b, 0.17, -0.1, 0.35)
    return M.render(1.4)


def riot():                                          # punk rock, 150 bpm, E minor
    M = Mix(150, 32); roots = [40, 36, 43, 38]
    mel = [[(0, 64, 1), (1, 67, 1), (2, 69, 2)], [(0, 67, 1), (1, 64, 1), (2, 60, 2)], [(0, 62, 1), (1, 67, 1), (2, 71, 2)], [(0, 69, 2), (2, 66, 2)]]
    K, S, Hh, R = kick(0.3, 130, 55, 30, 0.6), snare(0.25, 200, 14, 9000), [hat(0.05, 60) for _ in range(4)], hat(0.4, 6, 5000)
    for bar in range(32):
        c = bar % 4; r = roots[c]; b0 = bar * 4; chorus = bar >= 16
        if chorus:
            for b, d in ((0, 1.5), (1.5, 1), (2.5, 1.5)):
                M.add(power(r, d * M.beat), b0 + b, 0.42, -0.5, 0.12); M.add(power(r, d * M.beat), b0 + b, 0.42, 0.5, 0.12)
            for b, m, d in mel[c]:
                M.add(np.tanh(3 * lead(m + 12, d * M.beat * 0.95, 'saw', 3000, 0.005, 0.08)), b0 + b, 0.13, 0.15, 0.3)
        else:
            for k in range(8):
                M.add(power(r, M.beat * 0.4, True), b0 + k / 2, 0.55, -0.45 if k % 2 else 0.45, 0.05)
        for k in range(8):
            M.add(bass(r - 12, M.beat * 0.45, 900, 'square'), b0 + k / 2, 0.45)
        for b in (0, 2, 2.5):
            M.add(K, b0 + b, 0.9)
        for b in (1, 3):
            M.add(S, b0 + b, 0.6, 0, 0.2)
        for k in range(8):
            M.add(R if chorus else Hh[k % 4], b0 + k / 2, 0.12 if chorus else 0.2, 0.3)
        if bar % 8 == 0:
            M.add(crash(), b0, 0.32, -0.3, 0.2)
        if bar % 8 == 7:
            for k in range(8):
                M.add(S, b0 + 2 + k / 4, 0.25 + 0.04 * k, 0, 0.15)
    return M.render(1.1, drive=2.2)


def lowtide():                                       # lo-fi hip hop, 78 bpm with swing, D dorian
    M = Mix(78, 16, swing=0.17); prog = [(50, 53, 57, 60, 64), (43, 53, 59, 64), (48, 52, 55, 59, 62), (45, 55, 60, 64)]; roots = [38, 31, 36, 33]
    mel = [[(0.5, 69, 1), (1.5, 72, .5), (2, 74, 1.5)], [(0, 72, 1), (1, 71, 1), (2, 67, 2)], [(0.5, 67, .5), (1, 71, 1), (2, 74, 1), (3, 76, 1)], [(0, 72, 3)]]
    K, S, Hh = lp(kick(0.4, 110, 48, 22, 0.15), 2000), lp(snare(0.25, 180, 18, 5000), 4000), [hat(0.05, 75, 6000) for _ in range(4)]
    for bar in range(16):
        c = bar % 4; ch = prog[c]; b0 = bar * 4
        for j, m in enumerate(ch):
            M.add(epiano(m, M.beat * 3.8), b0 + j * 0.03, 0.2, -0.4 + 0.2 * j, 0.25)
            M.add(epiano(m, M.beat * 1.4), b0 + 2.5 + j * 0.02, 0.09, 0.4 - 0.2 * j, 0.25)
        M.add(lp(bass(roots[c], M.beat * 1.5, 400), 300), b0, 0.75); M.add(lp(bass(roots[c] + 7, M.beat * 1.0, 400), 300), b0 + 2.5, 0.6)
        for b in (0, 2.5):
            M.add(K, b0 + b, 0.85)
        for b in (1, 3):
            M.add(S, b0 + b, 0.4, 0.05, 0.2)
        for k in range(8):
            M.add(Hh[k % 4], b0 + k / 2, rng.uniform(0.07, 0.13), 0.3)
        if bar >= 8:
            for b, m, d in mel[c]:
                M.add(flute(m, d * M.beat * 0.9), b0 + b, 0.17, 0.2, 0.45, ((1.5, 0.2, -0.5),))
    n = M.L; crackle = np.zeros(n); idx = rng.integers(0, n, int(n / SR * 7))     # vinyl: soft clicks and a little hiss
    crackle[idx] = rng.uniform(-0.25, 0.25, len(idx)); crackle = hp(crackle, 1500) + 0.006 * lp(noise(n), 5000)
    M.dry[:, :n] += crackle * 0.5
    return M.render(1.5, master_lp=6500)


SONGS = {'neon': neon, 'bay': bay, 'palmera': palmera, 'riot': riot, 'lowtide': lowtide}


def write_mp3(path, audio, title):
    pcm = np.ascontiguousarray(audio.T.astype(np.float32)).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '96k',
                    '-metadata', 'title=' + title, '-metadata', 'comment=Block Runner radio placeholder - replace with real music of the same name', path],
                   input=pcm, check=True)


def main(argv):
    out = os.path.join(ROOT, 'audio', 'radio'); os.makedirs(out, exist_ok=True)
    for st in stations():
        if argv and st['id'] not in argv:
            continue
        make = SONGS.get(st['id'])
        if not make:
            print('no placeholder recipe for', st['id'], '- skipped'); continue
        audio = make(); path = os.path.join(out, st['file'])
        write_mp3(path, audio, st['name'] + ' ' + st['freq'] + ' (placeholder)')
        print('%-14s %5.1f s  %4d KB  %s' % (st['name'], audio.shape[1] / SR, os.path.getsize(path) // 1024, os.path.relpath(path, ROOT)))


if __name__ == '__main__':
    main(sys.argv[1:])
