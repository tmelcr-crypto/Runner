#!/usr/bin/env python3
"""The characters' pixel-art portraits, drawn from their recipes in js/01y-character-data.js (the character table).

  python3 tools/portraits.py                       draw every portrait: img/chars/<id>-calm.png, -angry.png, -smile.png (48 x 48)
  python3 tools/portraits.py sheet out.png [N]     a contact sheet of all of them, N times bigger (default 6), to look at
  python3 tools/portraits.py doc                   the Word sheet docs/Characters.docx: each portrait and how the character looks

Every portrait is head and shoulders in a 3/4 view, turned toward the speech bubble (to the right), on a night-dark ground with a glow
in the character's bubble colour. A recipe names the skin, hair and eye colours, a hair style, facial hair, a hat, glasses, a top and
its two colours, extras (wrinkles, an earring, a chain, a scar, a gold tooth, sweat, tired eyes, a toothpick, hoop earrings,
lipstick, a tattoo, pearls, a cigarette holder, a pencil behind the ear, a bow tie, grey temples, jowls, gold braid, a jeweller's loupe, a cigar, a rag over the shoulder), the age and the build; the tool does
the shading (a darker back of the head, lit cheek and brow) and a dark outline round the figure. The three faces differ in the brows,
eyes and mouth. Needs Pillow (and python-docx for the Word sheet)."""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'js', '01y-character-data.js')
OUT = os.path.join(ROOT, 'img', 'chars')
S = 48
FACES = ('calm', 'angry', 'smile')
HAIR = ['short', 'slick', 'buzz', 'combed', 'pixie', 'curly', 'sides', 'bald', 'flattop', 'bob', 'bun', 'pulled', 'wave', 'spiky']
FACIAL = ['none', 'stubble', 'beard', 'moustache', 'pencil', 'goatee']
HATS = ['none', 'captain', 'hardhat', 'police', 'flatcap', 'chauffeur', 'visor']
GLASSES = ['none', 'reading', 'shades', 'square', 'roundshades']
TOPS = ['openshirt', 'denim', 'flowershirt', 'jacketvest', 'darkshirt', 'waistcoat', 'suit', 'hivis', 'uniform', 'jumpsuit',
        'cardigan', 'leather', 'blouse', 'blazer', 'tanktop', 'labcoat', 'dress', 'buttoned', 'seersucker', 'checkjacket', 'windbreaker']
EXTRAS = ['wrinkles', 'earring', 'chain', 'scar', 'goldtooth', 'sweat', 'tired', 'toothpick', 'hoops', 'lipstick', 'tattoo', 'pearls',
          'holder', 'pencil', 'bowtie', 'temples', 'jowls', 'braid', 'loupe', 'cigar', 'rag']
AGES = ['young', 'mid', 'old']
BUILDS = ['slim', 'normal', 'broad']
SMILE_EYES = ['happy', 'open']               # smiling: arched happy eyes, or open (a smile that never reaches them)
CALM_MOUTH = ['line', 'smirk', 'frown']


def load():
    s = open(DATA, encoding='utf-8').read()
    return json.loads(re.search(r'/\*CHARACTERS-JSON\*/(.*?)/\*END-CHARACTERS-JSON\*/', s, re.S).group(1))


def rgb(h): h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def mix(a, b, t): return tuple(round(x + (y - x) * t) for x, y in zip(a, b))
def dark(c, k): return tuple(round(x * k) for x in c)
def lite(c, t): return mix(c, (255, 255, 255), t)


class Canvas:                                # one layer of pixels: (x, y) -> colour; later layers cover earlier ones
    def __init__(self): self.p = {}
    def put(self, x, y, c):
        if 0 <= x < S and 0 <= y < S: self.p[(x, y)] = c
    def get(self, x, y): return self.p.get((x, y))
    def has(self, x, y): return (x, y) in self.p
    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.put(x, y, c)
    def poly(self, pts, c, only=None):       # a filled polygon (pixel centres inside)
        ys = [p[1] for p in pts]
        for y in range(int(min(ys)), int(max(ys)) + 1):
            xs = []
            for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
                if (y1 <= y + 0.5 < y2) or (y2 <= y + 0.5 < y1): xs.append(x1 + (y + 0.5 - y1) * (x2 - x1) / (y2 - y1))
            xs.sort()
            for a, b in zip(xs[::2], xs[1::2]):
                for x in range(int(round(a)), int(round(b))):
                    if only is None or only(x, y): self.put(x, y, c)
    def ellipse(self, cx, cy, rx, ry, c, only=None):
        for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
            for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
                if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 and (only is None or only(x, y)): self.put(x, y, c)


def draw(ch, face):
    skin = rgb(ch['skin']); sk_sh = dark(skin, 0.78); sk_dp = dark(skin, 0.6); sk_lt = lite(skin, 0.16)
    hair = rgb(ch['hair']) if ch.get('hair') else (40, 30, 30); ha_sh = dark(hair, 0.7); ha_lt = lite(hair, 0.28)
    eyes = rgb(ch['eyes']); top = rgb(ch['topColour']); top2 = rgb(ch['topColour2']) if ch.get('topColour2') else dark(top, 0.8)
    extras = set(ch.get('extras', [])); old = ch['age'] == 'old'; young = ch['age'] == 'young'
    build = ch['build']; L, R = {'slim': (11, 37), 'normal': (8, 40), 'broad': (5, 43)}[build]
    ink = (12, 9, 20)
    body = Canvas(); head = Canvas(); over = Canvas()

    # ---- the body: shoulders turned a little toward the bubble (the near shoulder on the left, lower and bigger)
    sh = [(18, 33), (L + 4, 36), (L, 40), (L - 1, 48), (R + 1, 48), (R, 41), (R - 4, 37), (30, 34)]
    if ch['top'] == 'blazer': sh = [(18, 33), (L + 2, 35), (L - 2, 38), (L - 2, 48), (R + 2, 48), (R + 2, 39), (R - 2, 35), (30, 34)]
    body.poly(sh, top)
    for y in range(34, 48):                   # shade: the far (right) side lit, the near side in shadow at its edge
        for x in range(L - 1, R + 2):
            c = body.get(x, y)
            if c is None: continue
            if x < L + 3: body.put(x, y, dark(top, 0.78))
            elif x > R - 3: body.put(x, y, lite(top, 0.1))
    neck = [(21, 27), (28, 27), (28, 35), (21, 35)]
    t = ch['top']
    # each top: its collar and what shows under it
    if t in ('openshirt', 'flowershirt', 'darkshirt', 'suit', 'jacketvest', 'cardigan', 'blouse', 'labcoat', 'seersucker', 'checkjacket'):
        body.poly([(20, 33), (29, 33), (25, 41)], sk_sh)                         # skin in the open collar
        body.poly([(22, 34), (27, 34), (25, 39)], skin)
    if t == 'openshirt':
        body.poly([(16, 34), (21, 33), (24, 41), (20, 38)], lite(top, 0.12)); body.poly([(29, 33), (34, 35), (29, 38), (26, 41)], top2)
        for y in (42, 45): body.put(25, y, top2)
    elif t == 'flowershirt':
        body.poly([(16, 34), (21, 33), (24, 41), (20, 38)], lite(top, 0.15)); body.poly([(29, 33), (34, 35), (29, 38), (26, 41)], dark(top, 0.85))
        for (x, y) in ((12, 41), (16, 44), (31, 43), (35, 40), (21, 46), (28, 46), (38, 45), (9, 46)):
            if body.has(x, y):
                for dx, dy in ((0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)): body.put(x + dx, y + dy, top2 if (dx, dy) != (0, 0) else (255, 196, 64))
    elif t == 'darkshirt':
        body.poly([(17, 34), (21, 33), (24, 40), (20, 39)], lite(top, 0.18)); body.poly([(29, 33), (33, 35), (28, 39), (26, 40)], lite(top, 0.1))
    elif t == 'jacketvest':
        body.poly([(21, 33), (28, 33), (28, 48), (21, 48)], top2)                 # the white vest
        body.poly([(20, 34), (25, 37), (25, 40), (21, 39)], top2)
        body.poly([(15, 35), (21, 33), (23, 48), (16, 48)], dark(top, 0.92)); body.poly([(28, 33), (34, 35), (33, 48), (27, 48)], lite(top, 0.06))   # the jacket's fronts
        body.poly([(17, 36), (21, 34), (22, 42)], dark(top, 0.8)); body.poly([(28, 34), (32, 36), (27, 42)], dark(top, 0.86))   # lapels
    elif t == 'suit':
        body.poly([(19, 33), (30, 33), (26, 44), (23, 44)], top2)                 # the shirt
        body.poly([(21, 33), (28, 33), (25, 39)], sk_sh); body.poly([(22, 34), (27, 34), (25, 38)], skin)
        body.poly([(15, 35), (20, 33), (24, 46), (17, 48)], dark(top, 0.9)); body.poly([(29, 33), (35, 35), (33, 48), (26, 46)], lite(top, 0.05))
        body.poly([(17, 37), (20, 34), (23, 42)], dark(top, 0.78)); body.poly([(29, 34), (33, 36), (27, 42)], dark(top, 0.82))
    elif t == 'denim':
        body.poly([(19, 33), (30, 33), (27, 37), (22, 37)], dark(top, 0.85))
        body.poly([(17, 34), (21, 33), (24, 38), (19, 38)], lite(top, 0.12)); body.poly([(28, 33), (32, 34), (29, 38), (25, 38)], lite(top, 0.06))   # collar points
        body.rect(25, 38, 25, 47, top2)                                            # the placket
        for y in (40, 43, 46): body.put(26, y, (220, 220, 230))
        body.rect(13, 40, 18, 44, top2); body.rect(13, 40, 18, 40, dark(top2, 0.8))  # a chest pocket
        body.rect(31, 40, 35, 43, top2)
    elif t == 'waistcoat':
        body.poly([(19, 33), (30, 33), (28, 48), (21, 48)], top2)                 # the white shirt
        body.poly([(14, 36), (21, 34), (24, 48), (14, 48)], top); body.poly([(28, 34), (35, 36), (35, 48), (25, 48)], lite(top, 0.08))   # the waistcoat
        for y in (40, 43, 46): body.put(24, y, (230, 200, 120))
        body.rect(22, 33, 27, 34, (16, 14, 20)); body.rect(24, 33, 25, 35, (30, 26, 34))   # the bow tie
        body.put(21, 32, (16, 14, 20)); body.put(28, 32, (16, 14, 20))
    elif t == 'hivis':
        body.poly([(19, 33), (30, 33), (27, 40), (22, 40)], top2)                 # the navy shirt
        body.poly([(18, 34), (22, 33), (24, 39), (20, 39)], lite(top2, 0.12))
        body.poly([(L + 2, 37), (21, 34), (23, 48), (L + 1, 48)], top); body.poly([(28, 34), (R - 2, 37), (R - 1, 48), (26, 48)], lite(top, 0.08))   # the vest
        for y in (41, 45):
            for x in range(L + 1, R):
                if body.get(x, y) in (top, lite(top, 0.08), dark(top, 0.78), lite(lite(top, 0.08), 0.1)) or (body.has(x, y) and (x < 24 or x > 25)): body.put(x, y, (205, 212, 220) if (x + y) % 3 else (240, 244, 248))
    elif t == 'uniform':
        body.poly([(18, 33), (22, 33), (24, 38), (20, 38)], lite(top, 0.15)); body.poly([(27, 33), (31, 33), (29, 38), (25, 38)], lite(top, 0.1))
        body.poly([(24, 34), (26, 34), (26, 46), (25, 47), (24, 46)], top2)       # the tie
        body.rect(14, 41, 16, 43, (232, 190, 80)); body.put(15, 40, (250, 220, 120))   # the badge
        body.rect(L + 2, 37, L + 6, 38, dark(top, 0.7)); body.rect(R - 6, 37, R - 2, 38, dark(top, 0.75))   # epaulettes
        for y in (40, 43, 46): body.put(27, y, (200, 205, 215))
    elif t == 'jumpsuit':
        body.poly([(19, 33), (30, 33), (25, 41)], top2); body.poly([(21, 33), (28, 33), (25, 38)], skin)
        body.rect(25, 41, 25, 47, dark(top, 0.75))                                 # the zip
        body.rect(30, 40, 35, 43, (236, 232, 222)); body.rect(31, 41, 34, 42, (40, 40, 48)); body.put(32, 41, (236, 232, 222))   # the number patch
    elif t == 'checkjacket':
        for (x, y), c in list(body.p.items()):                                     # a loud check: the second colour in bands both ways
            if x % 4 == 0 or y % 4 == 0: body.put(x, y, top2 if (x % 4 == 0) != (y % 4 == 0) else dark(top2, 0.8))
        body.poly([(19, 33), (30, 33), (26, 44), (23, 44)], (238, 234, 222))       # the shirt
        body.poly([(21, 33), (28, 33), (25, 38)], sk_sh); body.poly([(22, 34), (27, 34), (25, 37)], skin)
        body.poly([(17, 37), (20, 34), (23, 42)], dark(top, 0.75)); body.poly([(29, 34), (33, 36), (27, 42)], dark(top, 0.8))   # lapels
    elif t == 'windbreaker':
        for (x, y), c in list(body.p.items()):                                     # a two-tone shell: the second colour across the chest
            if 39 <= y <= 42: body.put(x, y, top2)
        body.poly([(19, 32), (30, 32), (29, 36), (20, 36)], dark(top, 0.8))       # the zipped-up collar
        body.rect(25, 36, 25, 47, (210, 210, 220))
        for x, y in ((12, 44), (36, 45)): body.put(x, y, lite(top, 0.3))
    elif t == 'cardigan':
        body.poly([(19, 33), (30, 33), (27, 43), (22, 43)], top2)                 # the shirt, its collar points
        body.poly([(21, 33), (28, 33), (25, 38)], sk_sh); body.poly([(22, 34), (27, 34), (25, 37)], skin)
        body.poly([(18, 33), (22, 33), (24, 38), (20, 37)], lite(top2, 0.1)); body.poly([(27, 33), (31, 33), (29, 37), (25, 38)], top2)
        body.poly([(15, 35), (20, 34), (24, 48), (16, 48)], dark(top, 0.92)); body.poly([(29, 34), (34, 35), (33, 48), (26, 48)], lite(top, 0.06))   # the cardigan's fronts
        for y in (41, 44, 47): body.put(24, y, (220, 200, 160))                    # its buttons
        for y in range(36, 48, 2):                                                  # the knit
            for x in range(L, R):
                if body.get(x, y) in (top, dark(top, 0.92), lite(top, 0.06)) and (x + y // 2) % 3 == 0: body.put(x, y, dark(top, 0.84))
    elif t == 'leather':
        body.poly([(20, 33), (29, 33), (28, 48), (21, 48)], top2)                 # the T-shirt
        body.poly([(21, 33), (28, 33), (25, 36)], sk_sh); body.poly([(22, 33), (27, 33), (25, 35)], skin)
        body.poly([(14, 35), (20, 33), (23, 48), (15, 48)], top); body.poly([(29, 33), (35, 35), (34, 48), (26, 48)], lite(top, 0.1))   # the jacket's fronts
        body.poly([(15, 34), (21, 32), (22, 36), (18, 40)], dark(top, 0.7)); body.poly([(28, 32), (34, 34), (31, 40), (27, 36)], dark(top, 0.75))   # the wide collar
        for x, y in ((13, 40), (14, 43), (36, 41), (35, 44), (17, 45), (31, 46)): body.put(x, y, lite(top, 0.35))   # shine on the leather
        body.rect(22, 38, 22, 47, (150, 150, 160))                                 # the open zip
    elif t == 'blouse':
        body.poly([(17, 33), (22, 33), (25, 42), (20, 38)], lite(top, 0.14)); body.poly([(27, 33), (32, 33), (29, 38), (25, 42)], lite(top, 0.06))   # the soft collar
        body.poly([(21, 33), (28, 33), (25, 41)], sk_sh); body.poly([(22, 34), (27, 34), (25, 39)], skin)
        for x, y in ((12, 44), (13, 43), (36, 43), (37, 44)): body.put(x, y, dark(top, 0.8))   # folds
    elif t == 'blazer':
        body.poly([(20, 33), (29, 33), (28, 48), (21, 48)], top2)                 # the top under it
        body.poly([(21, 33), (28, 33), (25, 37)], sk_sh); body.poly([(22, 33), (27, 33), (25, 36)], skin)
        body.poly([(14, 35), (20, 33), (24, 48), (15, 48)], dark(top, 0.92)); body.poly([(29, 33), (35, 35), (34, 48), (25, 48)], lite(top, 0.06))
        body.poly([(17, 36), (20, 34), (23, 43)], dark(top, 0.78)); body.poly([(29, 34), (33, 36), (26, 43)], dark(top, 0.82))   # lapels
        body.rect(L - 1, 36, L + 3, 37, lite(top, 0.18)); body.rect(R - 3, 36, R + 1, 37, lite(top, 0.24))   # the padded shoulders
    elif t == 'tanktop':
        for (x, y), c in list(body.p.items()):                                     # bare shoulders and arms: skin, the vest in the middle
            body.put(x, y, sk_sh if x < L + 4 else skin)
        body.poly([(17, 37), (21, 33), (23, 33), (21, 38), (21, 48), (16, 48)], top)            # the straps and the vest
        body.poly([(26, 33), (28, 33), (32, 37), (33, 48), (28, 48), (28, 38)], lite(top, 0.06))
        body.poly([(19, 38), (30, 38), (31, 48), (18, 48)], top)
        body.poly([(21, 34), (28, 34), (29, 38), (20, 38)], skin)                  # the chest above the vest
        for x, y in ((L + 2, 40), (L + 3, 44), (R - 3, 42)): body.put(x, y, sk_sh)   # muscle
        for x in range(18, 32): body.put(x, 38, dark(top, 0.85))
    elif t == 'labcoat':
        body.poly([(20, 33), (29, 33), (28, 48), (21, 48)], top2)                 # the T-shirt
        body.poly([(21, 33), (28, 33), (25, 36)], sk_sh); body.poly([(22, 33), (27, 33), (25, 35)], skin)
        body.poly([(14, 35), (20, 33), (23, 48), (15, 48)], dark(top, 0.94)); body.poly([(29, 33), (35, 35), (34, 48), (26, 48)], top)   # the coat
        body.poly([(17, 35), (20, 33), (22, 41)], dark(top, 0.82)); body.poly([(29, 33), (33, 35), (27, 41)], dark(top, 0.86))   # lapels
        body.rect(29, 42, 33, 46, dark(top, 0.88)); body.put(30, 41, (60, 90, 200)); body.put(32, 40, (220, 40, 40)); body.put(32, 41, (220, 40, 40))   # pens in the pocket
    elif t == 'dress':
        for (x, y), c in list(body.p.items()):
            if y < 38: body.put(x, y, sk_sh if x < L + 4 else skin)                # bare shoulders
        body.poly([(18, 33), (31, 33), (29, 39), (20, 39)], sk_sh)                 # the open neckline
        body.poly([(20, 33), (29, 33), (28, 38), (21, 38)], skin)
        body.poly([(L + 1, 38), (20, 38), (21, 39), (28, 39), (29, 38), (R - 1, 38), (R + 1, 48), (L - 1, 48)], top)
        for x, y in ((L + 3, 37), (L + 4, 36), (R - 4, 36), (R - 3, 37)): body.put(x, y, top)   # the straps
        for y in range(40, 48):                                                     # gathered folds
            for x in (16, 22, 28, 34):
                if body.has(x, y): body.put(x, y, top2)
    elif t == 'buttoned':
        body.poly([(19, 33), (30, 33), (28, 36), (21, 36)], dark(top, 0.88))       # buttoned to the top
        body.poly([(18, 33), (22, 32), (25, 36), (20, 37)], lite(top, 0.14)); body.poly([(27, 32), (31, 33), (29, 37), (25, 36)], lite(top, 0.08))   # collar points
        body.rect(25, 36, 25, 47, top2)
        for y in (37, 40, 43, 46): body.put(26, y, (225, 225, 232))
        body.rect(13, 40, 18, 44, top2); body.rect(14, 41, 17, 41, (225, 225, 232))  # a number on the pocket
    elif t == 'seersucker':
        for (x, y), c in list(body.p.items()):                                     # the stripes
            if x % 2 == 0: body.put(x, y, lite(top, 0.35))
        body.poly([(19, 33), (30, 33), (26, 44), (23, 44)], top2)                 # the shirt
        body.poly([(21, 33), (28, 33), (25, 38)], sk_sh); body.poly([(22, 34), (27, 34), (25, 37)], skin)
        body.poly([(17, 37), (20, 34), (23, 42)], dark(top, 0.8)); body.poly([(29, 34), (33, 36), (27, 42)], dark(top, 0.84))   # lapels
    if 'chain' in extras:
        for x, y in ((21, 35), (22, 36), (23, 37), (24, 37), (25, 37), (26, 37), (27, 36), (28, 35)): body.put(x, y, (232, 190, 70) if x % 2 else (255, 226, 120))
    if 'pearls' in extras:
        for x, y in ((20, 34), (21, 35), (22, 36), (23, 36), (24, 37), (25, 37), (26, 36), (27, 36), (28, 35), (29, 34)): body.put(x, y, (250, 248, 240) if x % 2 else (200, 196, 210))
    if 'bowtie' in extras:
        bt = (150, 30, 44); body.rect(22, 33, 27, 34, bt); body.rect(24, 33, 25, 35, dark(bt, 0.7)); body.put(21, 32, bt); body.put(28, 32, bt); body.put(22, 35, bt); body.put(27, 35, bt)
    if 'tattoo' in extras:
        for x, y in ((L + 3, 39), (L + 4, 40), (L + 2, 41), (L + 3, 42), (L + 5, 41), (L + 4, 43)): body.put(x, y, (40, 80, 90))
    if 'rag' in extras:                       # a rag over the near shoulder
        body.poly([(L + 1, 36), (L + 7, 34), (L + 8, 37), (L + 4, 44), (L + 1, 44)], (196, 70, 60))
        for x, y in ((L + 3, 38), (L + 5, 37), (L + 2, 41)): body.put(x, y, (150, 50, 44))
    if 'braid' in extras:
        body.rect(L + 2, 37, L + 6, 38, (232, 190, 70)); body.rect(R - 6, 37, R - 2, 38, (255, 214, 100))
        for x in range(L + 2, L + 7, 2): body.put(x, 39, (232, 190, 70))

    # ---- the neck and the head (3/4 view: the face's front to the right, the ear and the back of the head to the left)
    head.poly(neck, sk_sh); head.rect(25, 28, 27, 33, skin); head.rect(21, 27, 28, 28, sk_dp)
    jaw_w = {'slim': 0, 'normal': 0, 'broad': 1}[build]
    head.ellipse(24.5, 18.5, 8.6, 9.2, skin)
    head.poly([(16.2 - jaw_w, 19), (16.4 - jaw_w, 24), (19 - jaw_w, 28.5), (23, 31.2), (27.5, 31), (31, 28), (32.6, 23), (33, 17)], skin)
    if 'jowls' in extras: head.ellipse(24.5, 27.2, 9.0, 5.2, skin)
    for (x, y), c in list(head.p.items()):    # shading: the back of the head and the jaw's underside darker, the cheek and brow lit
        if y >= 27 and x <= 28 and not head.has(x, y + 1) and y < 32: head.put(x, y, sk_sh)
        if x <= 18 and y >= 17: head.put(x, y, sk_sh)
    for x, y in ((28, 22), (29, 22), (29, 23), (30, 21), (26, 16), (27, 16), (28, 16), (29, 17)): head.put(x, y, sk_lt)
    for y in range(29, 32):                   # under the chin
        for x in range(21, 29):
            if head.has(x, y) and not head.has(x, y + 1): head.put(x, y, sk_sh)
    head.ellipse(19.2, 22.5, 1.9, 2.6, skin); head.put(19, 22, sk_dp); head.put(19, 23, sk_sh); head.put(20, 21, sk_sh)   # the ear
    if 'earring' in extras: head.put(19, 25, (255, 214, 80)); head.put(19, 26, (220, 170, 50))
    if 'hoops' in extras:
        for x, y in ((19, 25), (18, 26), (18, 27), (18, 28), (19, 29), (20, 28), (20, 27), (20, 26)): head.put(x, y, (255, 206, 70) if y < 28 else (210, 160, 40))
    # the nose: past the cheek line, shadow under it
    for x, y, c in ((32, 21, skin), (33, 22, skin), (33, 23, skin), (32, 24, sk_sh), (33, 24, sk_sh), (31, 23, sk_lt), (30, 24, sk_sh), (31, 25, sk_dp)): head.put(x, y, c)
    # ---- the face: eyes, brows, mouth (by the face)
    white = (240, 236, 228)
    if ch.get('glasses') != 'shades':
        lid = dark(hair, 0.6) if ch['hairStyle'] != 'bald' else sk_dp
        squint = face == 'smile' and ch.get('smileEyes', 'happy') == 'happy'
        if squint:                            # happy eyes: arched, the cheeks pushed up under them
            arc = dark(skin, 0.42)
            for x, y in ((23, 21), (24, 20), (25, 21), (29, 21), (30, 20), (31, 21)): head.put(x, y, arc)
            for x, y in ((23, 22), (24, 22), (29, 22), (30, 22)): head.put(x, y, sk_lt)
        else:
            head.put(23, 21, white); head.put(24, 21, eyes); head.put(25, 21, (14, 10, 16)); head.put(24, 22, dark(eyes, 0.7))
            head.put(29, 21, eyes); head.put(30, 21, (14, 10, 16))
            for x in (23, 24, 25): head.put(x, 20, (30, 22, 26))
            head.put(29, 20, (30, 22, 26)); head.put(30, 20, (30, 22, 26))
            if face == 'angry': head.put(23, 20, sk_sh); head.put(23, 21, (30, 22, 26))
        if 'tired' in extras: head.put(23, 23, sk_sh); head.put(24, 23, sk_sh); head.put(25, 23, sk_sh); head.put(30, 22, sk_sh)
        if 'wrinkles' in extras or old: head.put(21, 21, sk_sh); head.put(21, 22, sk_sh); head.put(22, 23, sk_sh)
    brow = dark(hair, 0.75) if ch['hairStyle'] not in ('bald',) else dark(skin, 0.5)
    if ch['hairStyle'] == 'combed' or ch['hair'] in ('#eceae4',): brow = (200, 198, 192)
    if face == 'angry': near, far = [(22, 17), (23, 18), (24, 18), (25, 19)], [(28, 19), (29, 18), (30, 18)]
    elif face == 'smile': near, far = [(22, 18), (23, 17), (24, 17), (25, 18)], [(28, 18), (29, 17), (30, 17)]
    else: near, far = [(22, 18), (23, 18), (24, 18), (25, 18)], [(28, 18), (29, 18), (30, 18)]
    for x, y in near + far: head.put(x, y, brow)
    lip = mix(dark(skin, 0.5), (150, 40, 50), 0.35); mouth_in = (60, 16, 24); teeth = (244, 240, 230)
    if 'lipstick' in extras: lip = (196, 28, 52)
    if face == 'calm':
        for x in (26, 27, 28, 29): head.put(x, 27, lip)
        head.put(27, 28, sk_sh)
        cm = ch.get('calmMouth', 'line')
        if cm == 'smirk': head.put(30, 26, lip)
        elif cm == 'frown': head.put(25, 28, lip); head.put(30, 28, lip)
    elif face == 'smile':
        head.put(25, 26, lip); head.put(30, 26, lip)
        for x in (26, 27, 28, 29): head.put(x, 27, lip)
        if 'goldtooth' in extras or ch['id'] in ('tito', 'nico', 'rocco', 'sol'):
            head.put(27, 27, teeth); head.put(28, 27, (255, 214, 80) if 'goldtooth' in extras else teeth)
        head.put(27, 28, sk_sh); head.put(24, 25, sk_sh)
    else:                                     # angry: open, teeth showing
        for x in (26, 27, 28, 29): head.put(x, 27, teeth if x in (27, 28) else mouth_in)
        for x in (26, 27, 28, 29): head.put(x, 28, mouth_in)
        head.put(25, 28, lip); head.put(30, 28, lip); head.put(27, 29, sk_sh); head.put(28, 29, sk_sh)
        head.put(26, 24, sk_sh)
    if 'scar' in extras:
        for x, y in ((30, 18), (30, 19), (31, 20), (31, 21)): head.put(x, y, mix(skin, (190, 120, 120), 0.6))
    if 'jowls' in extras:                    # the double chin
        for x in range(21, 30): head.put(x, 31, sk_sh)
        head.put(18, 28, sk_sh); head.put(31, 29, sk_sh)
    if 'cigar' in extras:                     # a fat cigar in the mouth's corner, lit
        for x, y in ((30, 27), (31, 27), (32, 27), (33, 26), (34, 26)): head.put(x, y, (110, 70, 40))
        for x, y in ((31, 28), (32, 28), (33, 27)): head.put(x, y, (80, 50, 28))
        head.put(35, 26, (255, 120, 50)); head.put(36, 24, (160, 160, 170)); head.put(37, 22, (150, 150, 162)); head.put(36, 20, (140, 140, 152))
    if 'toothpick' in extras:
        for x, y in ((30, 27), (31, 27), (32, 26), (33, 26), (34, 25)): head.put(x, y, (226, 196, 140) if x < 34 else (190, 160, 110))
    if 'holder' in extras:                    # a long cigarette holder, the cigarette lit, a curl of smoke
        for x, y in ((30, 27), (31, 27), (32, 26), (33, 26), (34, 26), (35, 25), (36, 25)): head.put(x, y, (20, 18, 24))
        head.put(37, 24, (240, 236, 228)); head.put(38, 24, (240, 236, 228)); head.put(39, 23, (255, 120, 60))
        for x, y in ((40, 21), (41, 19), (40, 17), (41, 15)): head.put(x, y, (150, 150, 165))
    if 'sweat' in extras and face != 'smile': head.put(31, 15, (190, 230, 255)); head.put(31, 16, (140, 200, 240))

    # ---- facial hair
    fc = rgb(ch['facialColour']) if ch.get('facialColour') else hair
    f = ch['facial']
    if f == 'stubble':                       # a shadow of a beard: the jaw, the chin and the upper lip, sparse
        for (x, y) in list(head.p):
            c = head.get(x, y)
            if c in (skin, sk_sh, sk_lt) and x >= 20 and 27 <= y <= 31 and not (25 <= x <= 30 and y in (27, 28)) and (x * 3 + y) % 4 < 2:
                head.put(x, y, mix(c, fc, 0.4))
        for x in (25, 27, 29, 30): head.put(x, 26, mix(skin, fc, 0.38))
    elif f == 'beard':                        # a short full beard: the jaw and chin below the cheekbones, the mouth in it
        for (x, y) in list(head.p):
            c = head.get(x, y)
            if c in (skin, sk_sh, sk_lt, sk_dp) and ((y >= 26 and x >= 19) or (y >= 24 and 19 <= x <= 22)) and y <= 31 and not (26 <= x <= 29 and y in (27, 28)):
                head.put(x, y, dark(fc, 0.86) if x <= 21 or (x * 5 + y * 3) % 7 == 0 else fc)
        for x in range(21, 30): head.put(x, 32, dark(fc, 0.8))
        for x in (25, 26, 27, 28, 29, 30): head.put(x, 26, fc)
        for x in (26, 27, 28, 29): head.put(x, 27, lip if face == 'calm' else head.get(x, 27))
    elif f == 'moustache':
        for x in (25, 26, 27, 28, 29, 30): head.put(x, 26, fc)
        head.put(25, 27, fc); head.put(30, 27, fc)
    elif f == 'pencil':
        for x in (26, 27, 28, 29): head.put(x, 26, fc)
    elif f == 'goatee':                      # a moustache joined to a beard on the chin
        for x in (26, 27, 28, 29): head.put(x, 26, fc)
        head.put(25, 27, fc); head.put(30, 27, fc); head.put(25, 28, dark(fc, 0.85)); head.put(30, 28, dark(fc, 0.85))
        for y in (29, 30, 31):
            for x in range(26 if y < 31 else 27, 30 if y < 31 else 29): head.put(x, y, fc if (x + y) % 3 else dark(fc, 0.85))

    # ---- the hair (over the head)
    hs = ch['hairStyle']
    def on_head(x, y): return head.has(x, y)
    if hs in ('short', 'slick', 'buzz', 'combed', 'pixie', 'curly'):
        front = {'short': 14, 'slick': 13, 'buzz': 13, 'combed': 12, 'pixie': 15, 'curly': 13}[hs]
        cap = Canvas()
        cap.ellipse(24.2, 17.4, 9.2, 9.0, hair, only=lambda x, y: y <= front or x <= 20 - (y - front) // 3)
        if hs == 'combed': cap.ellipse(23.5, 17.6, 9.2, 9.0, hair, only=lambda x, y: (y <= front and x <= 27) or (x <= 19 and y <= 20))
        for (x, y), c in cap.p.items():
            if hs == 'buzz' and (x + y) % 2 and y > 11: continue
            if x <= 18 and y >= 18 and hs not in ('pixie', 'curly'): continue   # behind the ear: the nape only to the ear
            over.put(x, y, hair)
        if hs in ('short', 'slick', 'combed'):
            for y in range(front + 1, 22): over.put(20, y, hair); over.put(21, y, hair) if y < 19 else None   # the sideburn
        if hs == 'pixie':                     # a side fringe over the brow, the nape longer
            over.poly([(20, 12), (31, 11), (29, 14), (25, 16), (22, 17), (20, 17)], hair)
            over.poly([(15, 16), (20, 16), (20, 27), (16, 26)], hair)
            for x, y in ((23, 13), (24, 13), (25, 12), (26, 12)): over.put(x, y, ha_lt)
        if hs == 'curly':                     # bumps round the top and back
            for cx, cy in ((17, 12), (20, 9), (24, 8), (28, 9), (31, 11), (16, 16), (16, 20), (32, 14)):
                over.ellipse(cx, cy, 2.4, 2.2, hair)
            for x, y in ((19, 10), (23, 9), (27, 10), (30, 12), (17, 14), (21, 12), (25, 11), (29, 13)): over.put(x, y, ha_lt)
        if hs in ('slick', 'combed'):         # shine along the combing
            pts = ((19, 11), (21, 10), (23, 10), (25, 10), (27, 11)) if hs == 'slick' else ((18, 12), (20, 11), (22, 11), (24, 11))
            for x, y in pts: over.put(x, y, ha_lt)
            if hs == 'combed':
                for x, y in ((19, 13), (21, 13), (23, 13), (18, 15), (20, 15)): over.put(x, y, ha_sh)
        if hs == 'short':
            for x, y in ((21, 10), (24, 9), (27, 10)): over.put(x, y, ha_lt)
        for (x, y) in list(over.p):            # the hair's lower back edge darker
            if over.get(x, y) == hair and not over.has(x, y + 1) and x < 22: over.put(x, y, ha_sh)
    elif hs == 'sides':                       # under a cap: grey at the side and the back only
        over.poly([(16, 14), (21, 14), (21, 22), (19, 20), (16, 22)], hair)
        for x, y in ((17, 16), (18, 18), (20, 17)): over.put(x, y, ha_lt)

    elif hs == 'flattop':                     # short sides, the top cut flat and square
        over.rect(17, 8, 31, 12, hair); over.rect(16, 10, 17, 17, hair); over.rect(31, 10, 32, 13, hair)
        for x in range(17, 32): over.put(x, 8, ha_lt)
        for y in range(13, 19):
            for x in range(16, 22):
                if (x + y) % 2 and head.has(x, y): over.put(x, y, hair)
        for x, y in ((20, 10), (24, 10), (28, 10)): over.put(x, y, ha_sh)
    elif hs == 'bob':                         # straight to the jaw at the back, a blunt fringe
        cap = Canvas(); cap.ellipse(24.2, 17.4, 9.4, 9.2, hair, only=lambda x, y: y <= 16 or x <= 21)
        for (x, y) in cap.p: over.put(x, y, hair)
        over.poly([(14, 14), (21, 13), (21, 29), (14, 29)], hair)
        for x in range(20, 32): over.put(x, 15, hair); over.put(x, 16, hair if x < 31 else ha_sh)
        for x in range(14, 21): over.put(x, 29, ha_sh)
        for x, y in ((19, 10), (22, 9), (25, 9), (16, 15), (16, 20), (16, 25)): over.put(x, y, ha_lt)
    elif hs in ('bun', 'pulled'):             # pulled back from the face to a knot: tight and shiny, or a messy curly bun on top
        cap = Canvas(); cap.ellipse(24.0, 17.6, 9.0, 8.8, hair, only=lambda x, y: y <= 13 or x <= 20 - (y - 13) // 3)
        for (x, y) in cap.p:
            if x <= 18 and y >= 18: continue
            over.put(x, y, hair)
        if hs == 'pulled':
            over.ellipse(15.0, 15.0, 3.0, 3.2, hair)
            for x, y in ((19, 11), (21, 10), (23, 10), (25, 10), (27, 11), (14, 14)): over.put(x, y, ha_lt)
        else:
            over.ellipse(18.0, 7.5, 4.6, 4.0, hair)
            for x, y in ((14, 6), (16, 3), (21, 4), (23, 7), (13, 9), (22, 11), (28, 10), (31, 13)): over.put(x, y, hair)
            for x, y in ((16, 6), (18, 5), (20, 7), (17, 9), (24, 11), (26, 12)): over.put(x, y, ha_lt)
            for x, y in ((31, 14), (32, 15), (32, 16)): over.put(x, y, hair)   # a loose curl by the brow
    elif hs == 'wave':                        # a set 50s wave, full at the sides and back
        cap = Canvas(); cap.ellipse(23.8, 16.8, 10.2, 9.8, hair, only=lambda x, y: y <= 14 or x <= 20 - (y - 14) // 4)
        for (x, y) in cap.p: over.put(x, y, hair)
        over.ellipse(17.0, 21.0, 4.2, 5.0, hair)
        for x, y in ((15, 10), (19, 8), (23, 7), (27, 8), (30, 10), (14, 17), (14, 22)): over.put(x, y, ha_lt)
        for x, y in ((17, 11), (21, 10), (25, 10), (29, 12), (16, 14), (15, 20), (16, 24)): over.put(x, y, ha_sh)
        for x in range(25, 32): over.put(x, 13 + (x % 3 == 0), hair)
    elif hs == 'spiky':                       # short and gelled up in spikes
        cap = Canvas(); cap.ellipse(24.2, 17.6, 9.0, 8.6, hair, only=lambda x, y: y <= 14 or x <= 19 - (y - 14) // 3)
        for (x, y) in cap.p:
            if x <= 18 and y >= 18: continue
            over.put(x, y, hair)
        for x0 in (16, 19, 22, 25, 28, 31):
            for k in range(5): over.put(x0 + k // 2, 10 - k, hair if k < 4 else ha_lt)
        for x, y in ((18, 10), (21, 9), (24, 9), (27, 9), (30, 11)): over.put(x, y, ha_lt)
    if 'temples' in extras:                   # grey at the temples
        for (x, y), c in list(over.p.items()):
            if c in (hair, ha_sh, ha_lt) and 17 <= x <= 22 and 13 <= y <= 22: over.put(x, y, (176, 176, 180) if (x + y) % 2 else (150, 150, 156))
    if 'loupe' in extras:                     # a jeweller's loupe pushed up on the brow
        for x, y in ((27, 15), (28, 14), (29, 14), (30, 15), (30, 16), (29, 17), (28, 17), (27, 16)): over.put(x, y, (30, 30, 36))
        over.put(28, 15, (180, 210, 230)); over.put(29, 15, (140, 170, 200)); over.put(28, 16, (140, 170, 200)); over.put(29, 16, (120, 150, 180))
    if 'pencil' in extras:                    # a pencil behind the ear
        for x, y in ((16, 20), (17, 19), (18, 18), (19, 17), (20, 16)): over.put(x, y, (246, 200, 40))
        over.put(21, 15, (240, 200, 160)); over.put(22, 14, (40, 40, 40)); over.put(15, 21, (240, 120, 140))

    # ---- glasses
    gl = ch.get('glasses', 'none'); gc = rgb(ch['glassesColour']) if ch.get('glassesColour') else (30, 26, 34)
    if gl == 'shades':
        for x in (22, 23, 24, 25, 26): over.put(x, 20, gc); over.put(x, 21, gc)
        for x in (23, 24, 25): over.put(x, 22, gc)
        for x in (28, 29, 30, 31): over.put(x, 20, gc); over.put(x, 21, gc)
        over.put(27, 20, gc); over.put(21, 20, gc); over.put(20, 20, gc)
        over.put(23, 20, (120, 130, 160)); over.put(29, 20, (120, 130, 160))
        if face == 'angry': over.put(22, 19, brow); over.put(25, 19, brow)
    elif gl == 'square':                      # big square frames
        for x in range(21, 27): over.put(x, 19, gc); over.put(x, 23, gc)
        for y in range(19, 24): over.put(21, y, gc); over.put(26, y, gc)
        for x in range(28, 33): over.put(x, 19, gc); over.put(x, 23, gc)
        for y in range(19, 24): over.put(28, y, gc); over.put(32, y, gc)
        over.put(27, 20, gc); over.put(20, 20, gc); over.put(19, 20, gc)
        over.put(22, 20, (200, 220, 240)); over.put(29, 20, (200, 220, 240))
    elif gl == 'roundshades':                 # big round sunglasses
        over.ellipse(23.8, 21.2, 3.2, 2.9, gc); over.ellipse(30.0, 21.2, 2.6, 2.9, gc)
        over.put(27, 20, gc); over.put(20, 20, gc); over.put(19, 20, gc)
        over.put(22, 20, (150, 160, 190)); over.put(29, 20, (150, 160, 190))
        if face == 'angry': over.put(22, 18, brow); over.put(25, 18, brow)
    elif gl == 'reading':
        for x in (22, 23, 24, 25, 26): over.put(x, 23, gc)
        over.put(22, 22, gc); over.put(26, 22, gc); over.put(28, 22, gc); over.put(31, 22, gc)
        for x in (28, 29, 30, 31): over.put(x, 23, gc)
        over.put(27, 22, gc); over.put(21, 22, gc)
        for y in range(23, 34): over.put(20 - (y - 23) // 5, y, gc if y % 2 else dark(gc, 0.7))   # the cord down to the collar

    # ---- hats
    hat = ch.get('hat', 'none'); hc = rgb(ch['hatColour']) if ch.get('hatColour') else (40, 40, 50); hc2 = rgb(ch['hatColour2']) if ch.get('hatColour2') else dark(hc, 0.6)
    if hat == 'captain':
        over.poly([(14, 13), (15, 8), (19, 5), (26, 4.5), (32, 6), (34, 10), (33, 13)], hc)      # the crown
        for (x, y) in list(over.p):
            if over.get(x, y) == hc and x <= 17: over.put(x, y, dark(hc, 0.82))
        for x, y in ((24, 6), (27, 6), (29, 7), (22, 7)): over.put(x, y, lite(hc, 0.35))
        over.rect(15, 12, 33, 13, hc2)                                                        # the band
        over.poly([(24, 14), (35, 14), (37, 16), (25, 16)], (22, 22, 30))                     # the visor
        over.put(36, 15, (60, 60, 76)); over.put(30, 14, (60, 60, 76))
        over.rect(26, 9, 28, 10, (236, 190, 70)); over.put(27, 8, (255, 230, 130)); over.put(27, 11, (200, 150, 40))   # the badge
    elif hat == 'hardhat':
        over.ellipse(24.2, 12.5, 9.6, 7.6, hc, only=lambda x, y: y <= 13)
        over.rect(13, 13, 35, 14, hc2); over.rect(30, 14, 36, 15, hc2)                       # the brim, longer in front
        over.rect(23, 6, 25, 13, lite(hc, 0.25)); over.put(24, 5, lite(hc, 0.25))             # the ridge
        for x, y in ((19, 8), (20, 7), (28, 7), (29, 8)): over.put(x, y, lite(hc, 0.4))
        for (x, y) in list(over.p):
            if over.get(x, y) == hc and x <= 17: over.put(x, y, dark(hc, 0.85))
    elif hat == 'police':
        over.poly([(14, 7), (34, 6), (33, 12), (16, 12)], hc)                                 # the crown, wider at the top
        for x in range(14, 34): over.put(x, 6 if x > 16 else 7, lite(hc, 0.2))
        over.rect(16, 12, 33, 13, (16, 16, 22)); over.rect(17, 12, 32, 12, hc2)               # the band
        over.poly([(23, 14), (35, 14), (37, 16), (24, 16)], (16, 16, 22)); over.put(35, 15, (60, 60, 76))   # the visor
        over.rect(24, 8, 26, 10, hc2); over.put(25, 7, lite(hc2, 0.3))                        # the badge

    elif hat == 'flatcap':                    # a flat cap: low and round at the back, a short peak in front
        over.poly([(14, 13), (15, 10), (19, 8), (26, 7.5), (31, 9), (34, 12), (36, 14), (30, 15), (16, 15)], hc)
        for (x, y) in list(over.p):
            if over.get(x, y) == hc and ((x + y * 2) % 5 == 0): over.put(x, y, hc2)   # the tweed
            if over.get(x, y) == hc and x <= 17: over.put(x, y, dark(hc, 0.82))
        over.poly([(28, 14), (37, 14), (36, 16), (28, 16)], dark(hc, 0.75)); over.put(26, 8, lite(hc, 0.3)); over.put(24, 8, lite(hc, 0.3))
    elif hat == 'visor':                      # a green eyeshade: a band round the head, a see-through peak
        over.rect(16, 13, 32, 14, hc2)
        over.poly([(24, 15), (36, 14), (38, 17), (25, 17)], hc)
        for x in range(26, 37): over.put(x, 15, lite(hc, 0.3))
    elif hat == 'chauffeur':                  # a peaked cap, glossy peak, a small gold button
        over.poly([(15, 8), (33, 7), (33, 12), (16, 12)], hc)
        for x in range(16, 33): over.put(x, 7 if x > 17 else 8, lite(hc, 0.18))
        over.rect(16, 12, 33, 13, hc2)
        over.poly([(23, 14), (35, 14), (37, 16), (24, 16)], (10, 10, 14)); over.put(34, 15, (90, 90, 110)); over.put(31, 14, (70, 70, 90))
        over.put(32, 12, (236, 190, 70))

    # ---- put it together: body, head, hair and hats, then the outline, then the ground
    fig = {}
    for layer in (body, head, over): fig.update(layer.p)
    img = Image.new('RGB', (S, S))
    bub = rgb(ch['bubble']); bg = (14, 11, 24)
    for y in range(S):
        for x in range(S):
            d = ((x - 24) ** 2 + (y - 20) ** 2) ** 0.5
            t = max(0.0, 1 - d / 26) * 0.42
            if 0.06 < t < 0.14 and (x + y) % 2: t *= 0.5           # dithered edge of the glow
            img.putpixel((x, y), mix(dark(bg, 1 - 0.25 * y / S), bub, t))
    for x in range(S): img.putpixel((x, 0), dark(bub, 0.7)); img.putpixel((x, S - 1), dark(bub, 0.5))
    for y in range(S): img.putpixel((0, y), dark(bub, 0.6)); img.putpixel((S - 1, y), dark(bub, 0.6))
    for (x, y) in fig:                        # the outline: every ground pixel touching the figure
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            q = (x + dx, y + dy)
            if q not in fig and 0 < q[0] < S - 1 and 0 < q[1] < S - 1: img.putpixel(q, ink)
    for (x, y), c in fig.items():
        if 0 <= x < S and 0 <= y < S: img.putpixel((x, y), c)
    return img


def draw_all():
    t = load(); os.makedirs(OUT, exist_ok=True); n = 0
    for ch in t['characters']:
        check(ch)
        for f in FACES: draw(ch, f).save(os.path.join(OUT, '%s-%s.png' % (ch['id'], f))); n += 1
    print('drew %d portraits in %s' % (n, os.path.relpath(OUT, ROOT)))


def check(ch):                               # the recipe's words must be ones the tool draws
    for key, allowed in (('hairStyle', HAIR), ('facial', FACIAL), ('hat', HATS), ('glasses', GLASSES), ('top', TOPS), ('age', AGES), ('build', BUILDS),
                         ('smileEyes', SMILE_EYES), ('calmMouth', CALM_MOUTH)):
        if ch.get(key) not in allowed: sys.exit('%s: %s "%s" is not one of %s' % (ch['id'], key, ch.get(key), ', '.join(allowed)))
    for e in ch.get('extras', []):
        if e not in EXTRAS: sys.exit('%s: extra "%s" is not one of %s' % (ch['id'], e, ', '.join(EXTRAS)))


def sheet(path, k=6):
    t = load(); chs = t['characters']; pad = 4
    img = Image.new('RGB', (len(FACES) * (S * k + pad) + pad, len(chs) * (S * k + pad) + pad), (30, 28, 40))
    for r, ch in enumerate(chs):
        check(ch)
        for c, f in enumerate(FACES):
            img.paste(draw(ch, f).resize((S * k, S * k), Image.NEAREST), (pad + c * (S * k + pad), pad + r * (S * k + pad)))
    img.save(path); print('wrote', path)


def doc():
    import docx
    from docx.shared import Pt, Cm, RGBColor
    t = load(); d = docx.Document()
    st = d.styles['Normal']; st.font.name = 'Helvetica'; st.font.size = Pt(10)
    d.add_heading('BLOCK RUNNER - THE CHARACTERS', 0)
    d.add_paragraph('How every character looks, written down so they stay the same in every mission. The portraits are pixel art, 48 x 48, '
                    'head and shoulders in a 3/4 view turned toward the speech bubble, on a night-dark ground with a glow in the character\'s '
                    'bubble colour. Each has three faces: calm, angry and smiling - the game picks one from the mood written on each line '
                    '(angry: ' + ', '.join(t['faces']['angry']) + '; smiling: ' + ', '.join(t['faces']['smile']) + '; anything else: calm).')
    d.add_paragraph('They are drawn by tools/portraits.py from the recipes in the character table (js/01y-character-data.js; to change one, '
                    'edit the table - or the exported spreadsheet - and run the tool again). A picture of your own in img/chars/ with the same '
                    'name replaces a drawn one.')
    tmp = os.path.join(OUT, '_doc'); os.makedirs(tmp, exist_ok=True)
    for ch in t['characters']:
        d.add_heading('%s  (%s)' % (ch['name'], ch['letter']), 1)
        row = d.add_paragraph()
        for f in FACES:
            p = os.path.join(tmp, '%s-%s.png' % (ch['id'], f)); draw(ch, f).resize((S * 4, S * 4), Image.NEAREST).save(p)
            row.add_run().add_picture(p, width=Cm(3.2)); row.add_run('  ')
        d.add_paragraph('calm - angry - smiling').runs[0].font.size = Pt(8)
        tb = d.add_table(rows=0, cols=2); tb.style = 'Light Grid Accent 1'
        def line(k, v):
            r = tb.add_row().cells; r[0].text = k; r[1].text = v
        line('Who', ch['role']); line('Looks', ch['look'])
        line('Bubble colour', ch['bubble']); line('In the city', 'shirt %s, trousers %s' % (ch['shirt'], ch['pants']))
        line('Portrait recipe', 'skin %s; hair %s (%s); facial hair: %s; eyes %s; hat: %s; glasses: %s; top: %s (%s / %s); extras: %s; %s, %s build' % (
            ch['skin'], ch['hair'], ch['hairStyle'], ch['facial'], ch['eyes'], ch['hat'], ch['glasses'], ch['top'], ch['topColour'], ch['topColour2'],
            ', '.join(ch['extras']) or 'none', ch['age'], ch['build']))
        line('Mumble', '%s wave, %d-%d Hz, %d syllables a second, pauses %s s' % (ch['mumble']['wave'], ch['mumble']['low'], ch['mumble']['high'], ch['mumble']['rate'], ch['mumble']['gap']))
        for r in tb.rows: r.cells[0].width = Cm(3.5); r.cells[1].width = Cm(13)
    path = os.path.join(ROOT, 'docs', 'Characters.docx'); d.save(path)
    for f in os.listdir(tmp): os.remove(os.path.join(tmp, f))
    os.rmdir(tmp); print('wrote', os.path.relpath(path, ROOT))


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a: draw_all()
    elif a[0] == 'sheet': sheet(a[1], int(a[2]) if len(a) > 2 else 6)
    elif a[0] == 'doc': doc()
    else: print(__doc__)
