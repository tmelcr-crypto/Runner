#!/usr/bin/env python3
"""The characters' pixel-art portraits, drawn from their recipes in js/01y-character-data.js (the character table).

  python3 tools/portraits.py                       draw every portrait: img/chars/<id>-calm.png, -angry.png, -smile.png (40 x 64)
  python3 tools/portraits.py sheet out.png [N] [ids]  a contact sheet (all, or some ids: danny,joe), N times bigger (default 5), on the game's ground
  python3 tools/portraits.py doc                   the Word sheet docs/Characters.docx: each portrait and how the character looks

The style is the owner's reference picture (October 2026, answers 117-120): head and shoulders, 40 x 64, nearly face on and turned a
little toward the speech bubble (to the right), lit from the upper left, transparent around the figure - the game draws the night-dark
ground and a glow in the character's bubble colour behind it. Skin, hair and clothes are shaded in four or five tones (warm shadows on
the skin, cool on the cloth), the hair in clumps with a sheen, the eyes with whites, a two-by-two iris and a catchlight; a dark outline
takes the colour of what it edges. Women are told by their hair style (pixie, bob, bun, pulled, wave) or lipstick: lashes, finer brows
and chin; a broad build gets a thick neck and heavy shoulders. A recipe names the skin, hair and eye colours, a hair style, facial hair, a hat, glasses, a top and
its two colours, extras (wrinkles, an earring, a chain, a scar, a gold tooth, sweat, tired eyes, a toothpick, hoop earrings,
lipstick, a tattoo, pearls, a cigarette holder, a pencil behind the ear, a bow tie, grey temples, jowls, gold braid, a jeweller's loupe, a cigar, a rag over the shoulder), the age and the build; the tool does
the shading and the outline. The three faces differ in the brows,
eyes and mouth. Needs Pillow (and python-docx for the Word sheet)."""
import json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'js', '01y-character-data.js')
OUT = os.path.join(ROOT, 'img', 'chars')
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


W, H = 40, 64
FEM_HAIR = ('pixie', 'bob', 'bun', 'pulled', 'wave')


class Canvas:                                # one layer of pixels: (x, y) -> colour; later layers cover earlier ones
    def __init__(self): self.p = {}
    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H: self.p[(x, y)] = c
    def get(self, x, y): return self.p.get((x, y))
    def has(self, x, y): return (x, y) in self.p
    def drop(self, x, y): self.p.pop((x, y), None)
    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.put(x, y, c)
    def poly(self, pts, c, only=None):       # a filled polygon (pixel centres inside)
        for (x, y) in poly_px(pts):
            if only is None or only(x, y): self.put(x, y, c)
    def ellipse(self, cx, cy, rx, ry, c, only=None):
        for (x, y) in ellipse_px(cx, cy, rx, ry):
            if only is None or only(x, y): self.put(x, y, c)


def poly_px(pts):
    ys = [p[1] for p in pts]; out = set()
    for y in range(int(min(ys)) - 1, int(max(ys)) + 2):
        xs = []
        for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
            if (y1 <= y + 0.5 < y2) or (y2 <= y + 0.5 < y1): xs.append(x1 + (y + 0.5 - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for a, b in zip(xs[::2], xs[1::2]):
            for x in range(int(round(a)), int(round(b))): out.add((x, y))
    return out


def ellipse_px(cx, cy, rx, ry):
    out = set()
    for y in range(int(cy - ry) - 1, int(cy + ry) + 2):
        for x in range(int(cx - rx) - 1, int(cx + rx) + 2):
            if ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1: out.add((x, y))
    return out


def skin_ramp(c):                            # skin: warm, reddish shadows (the reference's look)
    return {'out': mix(dark(c, 0.4), (70, 24, 24), 0.25), 'dp': mix(dark(c, 0.62), (120, 40, 40), 0.18), 'sh': mix(dark(c, 0.8), (150, 60, 50), 0.14),
            'b': c, 'lt': mix(c, (255, 238, 214), 0.28), 'hl': mix(c, (255, 248, 236), 0.5)}


def cloth_ramp(c):                           # cloth: cool shadows, a light edge
    return {'out': mix(dark(c, 0.36), (16, 14, 34), 0.3), 'dp': mix(dark(c, 0.6), (20, 20, 60), 0.12), 'sh': mix(dark(c, 0.8), (30, 30, 70), 0.08),
            'b': c, 'lt': lite(c, 0.16), 'hl': lite(c, 0.36)}


def hair_ramp(c):                            # hair: dark hair takes a cool blue sheen, light hair warm grey shadows
    lum = (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11)
    if lum < 90: lt, hl = mix(c, (120, 140, 175), 0.32), mix(c, (175, 192, 220), 0.5)
    else: lt, hl = lite(c, 0.25), lite(c, 0.55)
    return {'out': mix(dark(c, 0.3), (14, 10, 22), 0.4), 'dp': dark(c, 0.55 if lum > 90 else 0.68), 'sh': dark(c, 0.78 if lum > 90 else 0.84), 'b': c, 'lt': lt, 'hl': hl}


def draw(ch, face):
    from math import atan2, hypot, floor
    sk = skin_ramp(rgb(ch['skin']))
    hair = rgb(ch['hair']) if ch.get('hair') else (40, 30, 30); hr = hair_ramp(hair)
    eyes = rgb(ch['eyes'])
    top = rgb(ch['topColour']); top2 = rgb(ch['topColour2']) if ch.get('topColour2') else dark(top, 0.8)
    T = cloth_ramp(top); T2 = cloth_ramp(top2)
    extras = set(ch.get('extras', [])); age = ch['age']; old = age == 'old'
    hs = ch['hairStyle']; fem = hs in FEM_HAIR or 'lipstick' in extras
    build = ch['build']; jw = {'slim': -0.7, 'normal': 0.0, 'broad': 0.9}[build]
    cw = -0.8 if fem else 0.6 if build == 'broad' else 0.0       # the chin: finer for a woman, square for a big man
    hat = ch.get('hat', 'none'); gl = ch.get('glasses', 'none')
    back = Canvas(); neck = Canvas(); body = Canvas(); head = Canvas(); over = Canvas()
    ink = (14, 10, 20)

    # ---- the head's shape: the skull and the jaw, nearly face on, the chin a touch to the right (turned toward the bubble)
    hm = ellipse_px(20.5, 20.0, 11.0 + jw * 0.5, 12.6)
    hm |= poly_px([(9.4 - jw, 19), (9.6 - jw, 27.5), (11.6 - jw, 33), (15.4 - cw, 38.2), (19.4 - cw, 41.3), (23.4 + cw, 41.2), (27.4 + cw, 37.8), (30.2 + jw, 32.4), (31.6 + jw, 26), (31.6 + jw, 19)])
    if 'jowls' in extras: hm |= ellipse_px(21.2, 38.2, 11.4, 4.4)
    rows = {}
    for (x, y) in hm: a, b = rows.get(y, (99, -99)); rows[y] = (min(a, x), max(b, x))
    hx = lambda y: rows.get(y, (0, 0))

    # ---- hair behind the head (long styles), drawn first
    if hs == 'bob':
        back.poly([(6.5, 16), (8, 10), (12, 6), (28, 6), (32.5, 10), (34, 16), (34, 38.5), (6.5, 38.5)], hr['b'])
    elif hs == 'wave':                       # a set 50s wave: full round the face to the jaw, the ends curled under
        for (x, y) in ellipse_px(20.5, 17.5, 15.2, 14.5):
            if y <= 30: back.put(x, y, hr['b'])
        for cx in (7.5, 33.5): back.ellipse(cx, 29.5, 3.6, 3.0, hr['b'])
    elif hs == 'pulled':
        back.ellipse(7.2, 14.5, 3.4, 3.8, hr['b'])
    elif hs == 'curly':
        for cx, cy, r in ((7, 18, 3.6), (7.5, 24, 3.2), (33, 18, 3.6), (32.5, 24, 3.2), (9, 12, 3.6), (31, 12, 3.6)): back.ellipse(cx, cy, r, r, hr['b'])
    from math import sin
    for (x, y), c in list(back.p.items()):     # hair behind: in shadow, its edges darker, a little sheen on the near side
        u = (x * 2 + y) % 5
        if hs == 'wave':
            ph = (y + 2.2 * sin(x / 2.4)) % 4
            back.put(x, y, hr['dp'] if (x + 1, y) not in back.p or (x, y + 1) not in back.p else hr['sh'] if ph < 1.2 else hr['lt'] if ph > 3.0 and x < 20 else hr['b'])
            continue
        back.put(x, y, hr['dp'] if (x + 1, y) not in back.p or (x, y + 1) not in back.p else hr['sh'] if u < 2 else hr['b'] if x < 20 else hr['sh'])

    # ---- the neck (under the jaw in shadow)
    nk = poly_px([(15.2, 33), (26.6, 33), (27.2, 50), (14.6, 50)])
    if fem or build == 'slim': nk = poly_px([(16.0, 33), (25.6, 33), (26.0, 50), (15.6, 50)])
    if build == 'broad': nk = poly_px([(13.6, 33), (28.2, 33), (30.0, 50), (11.8, 50)])
    if build == 'broad' and ch['top'] == 'tanktop':              # a bull neck, the traps sloping to the shoulders
        nk = poly_px([(12.4, 33), (29.4, 33), (34, 47), (36, 50), (5, 50), (7, 47)])
    for (x, y) in nk:
        c = sk['sh']
        if y <= 44 and (x, y) not in hm: c = sk['dp'] if y <= 43 else c
        if x <= min(p[0] for p in nk if p[1] == y) + 1 and y > 44: c = sk['b']
        if x >= max(p[0] for p in nk if p[1] == y) - 1: c = sk['dp']
        neck.put(x, y, c)

    # ---- the body: shoulders and the top (each its collar and what shows under it)
    drawbody(ch, body, T, T2, top, top2, sk, extras, build, fem)
    body.p = {(x, y + 3): c for (x, y), c in body.p.items() if y + 3 < H}   # the shoulders sit low: a long neck, like the reference

    # ---- the ears (the near one on the left bigger, the far one half behind the cheek)
    head.ellipse(8.6 - jw, 27.0, 2.0, 3.5, sk['b'])
    for x, y, c in ((8 - jw, 26, sk['sh']), (8 - jw, 27, sk['dp']), (8 - jw, 28, sk['sh']), (7 - jw, 25, sk['sh']), (9 - jw, 29, sk['sh']), (7 - jw, 29, sk['sh'])): head.put(int(x), y, c)
    head.ellipse(32.2 + jw, 27.0, 1.4, 3.0, sk['sh']); head.put(int(32 + jw), 27, sk['dp'])
    if 'earring' in extras: head.put(int(8 - jw), 31, (255, 214, 90)); head.put(int(8 - jw), 32, (200, 150, 50))
    # ---- the skin: four tones - the far cheek and the jaw's side in shade, the near edge a little darker, lit brow and cheekbone
    for (x, y) in hm:
        xl, xr = hx(y); dr = xr - x; dl = x - xl
        c = sk['b']
        if dr <= 1: c = sk['dp']
        elif dr <= 3 and y >= 20: c = sk['sh']
        elif dr == 4 and y >= 22 and (x + y) % 2: c = sk['sh']
        elif dr <= 2: c = sk['sh']
        if dl == 0: c = sk['sh']
        if (x, y + 1) not in hm and y >= 30: c = sk['dp']
        elif (x, y + 2) not in hm and y >= 33 and x > 21: c = sk['sh']
        head.put(x, y, c)
    for x, y in ((14, 13), (15, 13), (16, 12), (17, 12), (15, 14), (13, 29), (14, 29), (12, 30), (13, 30), (14, 30), (20, 39), (21, 39)):
        if (x, y) in hm and head.get(x, y) == sk['b']: head.put(x, y, sk['lt'])
    for x, y in ((25, 32), (26, 32), (27, 31), (28, 31), (26, 33), (27, 32)):    # the far cheek's lower shade
        if (x, y) in hm: head.put(x, y, sk['sh'])
    if old or 'wrinkles' in extras:                            # lines: the forehead, the eyes' corners, from the nose to the mouth
        for x in range(15, 23): head.put(x, 16 + (x % 2 == 0 and x > 18), sk['sh']) if x % 3 else None
        for x, y in ((10, 24), (10, 25), (30, 24), (31, 25), (18, 33), (17, 34), (26, 33), (27, 34)): head.put(x, y, sk['sh'])
    if 'jowls' in extras:
        for x in range(15, 29): head.put(x, 39, sk['sh'])
        for x in range(16, 28): head.put(x, 41, sk['dp'])

    # ---- the eyes: a dark upper lid, the whites, a two-by-two iris with its pupil and a catchlight (near eye x 12-17, far eye x 24-28)
    white = (246, 242, 236); wsh = (204, 198, 196); ir = eyes; ir_dk = dark(eyes, 0.5); ir_lt = mix(eyes, (255, 255, 255), 0.5)
    lash = mix(dark(hair, 0.35), (18, 10, 14), 0.65) if hs != 'bald' else (34, 20, 22)
    shades = gl in ('shades', 'roundshades')
    happy = face == 'smile' and ch.get('smileEyes', 'happy') == 'happy'
    for ex, w, near in ((12, 6, True), (24, 5, False)):
        if shades: break
        out_x = ex - 1 if near else ex + w                              # the outer corner
        if happy:                                              # arched, the cheek pushed up under
            for k in range(w): head.put(ex + k, 24 if 0 < k < w - 1 else 25, lash)
            for k in range(1, w - 1): head.put(ex + k, 25, sk['b'])
            for k in range(w): head.put(ex + k, 26, sk['lt'])
            head.put(out_x, 25, lash)
            continue
        for k in range(1, w - 1): head.put(ex + k, 22, sk['sh'])             # the crease over the lid
        for k in range(w): head.put(ex + k, 23, lash)                        # the upper lid, heavy
        head.put(out_x, 24, lash); head.put(ex if near else ex + w - 1, 24, lash)
        if fem: head.put(out_x, 23, lash); head.put(out_x + (-1 if near else 1), 22, lash)
        cols = [white, ir_lt, ir_dk, white, wsh] if near else [white, ir_lt, ir_dk, wsh]
        for k, c in enumerate(cols): head.put(ex + 1 + k, 24, c)
        low = [wsh, ir, ir, sk['sh']] if near else [ir, ir, sk['sh']]
        for k, c in enumerate(low): head.put(ex + 1 + k, 25, c)
        for k in range(1, w - 1): head.put(ex + k, 26, sk['sh'] if ('tired' in extras or old) else head.get(ex + k, 26))
        if face == 'angry':                                    # narrowed: the lid low over the white, the iris half hidden
            for k in range(w): head.put(ex + k, 24, lash if k in (0, 1, w - 1) or not near else head.get(ex + k, 24))
            head.put(ex + 2, 24, lash) if near else None
    # the brows: thick and dark for a man, finer for a woman; their shape by the face
    if hs == 'bald': brc = dark(hair, 0.7) if sum(hair) > 400 else mix(dark(sk['b'], 0.45), (40, 30, 30), 0.3)
    else: brc = dark(hair, 0.8) if sum(hair) > 420 else mix(hair, (14, 10, 12), 0.25)
    if face == 'angry': nb, fb = [(11, 19), (12, 19), (13, 20), (14, 20), (15, 21), (16, 21), (17, 22)], [(24, 22), (25, 21), (26, 21), (27, 20), (28, 20), (29, 19)]
    elif face == 'smile': nb, fb = [(11, 21), (12, 20), (13, 19), (14, 19), (15, 19), (16, 20), (17, 20)], [(24, 20), (25, 19), (26, 19), (27, 19), (28, 20), (29, 21)]
    else: nb, fb = [(11, 21), (12, 20), (13, 20), (14, 20), (15, 20), (16, 20), (17, 21)], [(24, 21), (25, 20), (26, 20), (27, 20), (28, 20), (29, 21)]
    for x, y in nb + fb: head.put(x, y, brc)
    if not fem:                                                # thick: a second row under the middle
        for x, y in nb[1:6] + fb[1:5]: head.put(x, y + 1, mix(brc, sk['sh'], 0.3))
    # the nose (a little right of the middle): a lit ridge, shade down its far side and under it, the nostrils
    for x, y, c in ((21, 26, sk['lt']), (21, 27, sk['lt']), (21, 28, sk['lt']), (21, 29, sk['lt']), (22, 30, sk['lt']),
                    (23, 25, sk['sh']), (23, 26, sk['sh']), (23, 27, sk['sh']), (23, 28, sk['sh']), (23, 29, sk['sh']), (24, 30, sk['sh']), (24, 31, sk['dp']),
                    (19, 30, sk['sh']), (19, 31, sk['sh']), (20, 32, sk['dp']), (21, 32, sk['sh']), (22, 32, sk['sh']), (23, 32, sk['dp']), (22, 31, sk['b'])):
        head.put(x, y, c)
    # the mouth
    lip_dk = mix(dark(sk['b'], 0.5), (140, 40, 50), 0.35); lip_lt = mix(sk['b'], (205, 100, 96), 0.3); teeth = (246, 242, 232); inside = (70, 18, 26)
    if 'lipstick' in extras: lip_dk, lip_lt = (160, 18, 44), (214, 44, 72)
    toothy = 'goldtooth' in extras or ch['id'] in ('tito', 'nico', 'rocco', 'sol')
    for x in range(20, 25): head.put(x, 33, sk['sh'] if x in (21, 22, 23) else head.get(x, 33))   # the groove over the lip
    if face == 'calm':
        cm = ch.get('calmMouth', 'line')
        for x in range(19, 26): head.put(x, 35, lip_dk)
        for x in range(20, 25): head.put(x, 36, lip_lt)
        for x in (21, 22, 23): head.put(x, 37, sk['sh'])
        if cm == 'smirk': head.put(26, 34, lip_dk); head.put(25, 35, lip_dk); head.put(19, 35, sk['sh'])
        elif cm == 'frown': head.put(18, 36, lip_dk); head.put(26, 36, lip_dk)
        if fem: [head.put(x, 34, lip_lt) for x in range(20, 25)]
    elif face == 'smile':
        head.put(18, 34, lip_dk); head.put(26, 34, lip_dk)
        for x in range(19, 26): head.put(x, 35, lip_dk)
        if toothy:
            for x in range(20, 25): head.put(x, 35, teeth)
            if 'goldtooth' in extras: head.put(23, 35, (255, 210, 70))
            for x in range(20, 25): head.put(x, 36, lip_dk)
            for x in range(21, 24): head.put(x, 37, lip_lt)
        else:
            for x in range(20, 25): head.put(x, 36, lip_lt)
            for x in (21, 22, 23): head.put(x, 37, sk['sh'])
        head.put(17, 33, sk['sh']); head.put(27, 33, sk['sh'])          # the cheeks bunched up
        if fem: [head.put(x, 34, lip_lt) for x in range(20, 25)]
    else:                                                      # angry: open, teeth showing, the corners down
        for x in range(19, 26): head.put(x, 34, lip_dk)
        for x in range(19, 26): head.put(x, 35, teeth if 20 <= x <= 24 else inside)
        for x in range(19, 26): head.put(x, 36, inside)
        for x in range(20, 25): head.put(x, 37, lip_dk)
        head.put(18, 36, lip_dk); head.put(26, 36, lip_dk); head.put(22, 38, sk['sh'])
        for x, y in ((19, 31), (25, 31)): head.put(x, y, sk['dp'])      # the nose wrinkled
    if 'scar' in extras:                                       # down the far cheek under the eye
        for x, y in ((28, 27), (28, 28), (29, 29), (29, 30), (30, 31)): head.put(x, y, mix(sk['b'], (232, 178, 176), 0.6))
        head.put(27, 28, sk['dp']); head.put(28, 30, sk['dp'])
    if 'sweat' in extras and face != 'smile':
        for x, y, c in ((29, 15, (200, 236, 255)), (29, 16, (150, 205, 245)), (11, 17, (200, 236, 255)), (11, 18, (150, 205, 245))): head.put(x, y, c)

    # ---- facial hair
    fc = rgb(ch['facialColour']) if ch.get('facialColour') else hair; fr = hair_ramp(fc)
    f = ch['facial']
    def jaw(x, y):                                             # the beard's ground: the jaw and chin below the cheek line, not the lips
        if (x, y) not in hm: return False
        xl, xr = hx(y)
        line = 31 if (x - xl <= 3 or xr - x <= 3) else 34 + (1 if 17 <= x <= 27 else 0)
        return y >= line and not (19 <= x <= 25 and 34 <= y <= 37)
    if f == 'stubble':
        for (x, y) in hm:
            if jaw(x, y) or (18 <= x <= 26 and y in (33, 34) and not (19 <= x <= 25 and y == 34 and face != 'calm')):
                c = head.get(x, y)
                if (x + y) % 2 == 0 or y >= 39 or hx(y)[1] - x <= 1: head.put(x, y, mix(c, fr['sh'], 0.45))
    elif f == 'beard':
        for (x, y) in hm:
            if jaw(x, y) or (y >= 28 and (x - hx(y)[0] <= 2 or hx(y)[1] - x <= 2)) or (18 <= x <= 26 and y in (33, 34)):
                if 20 <= x <= 24 and 35 <= y <= 36: continue
                k = (x * 3 + y * 5) % 7
                c = fr['dp'] if hx(y)[1] - x <= 2 else fr['sh'] if k < 2 else fr['lt'] if (k == 3 and x < 21) else fr['b']
                head.put(x, y, c)
        for x in range(16, 28): head.put(x, 42, fr['sh'] if x % 2 else fr['dp'])
        for x in range(18, 26): head.put(x, 43, fr['dp'])
        for x in range(19, 26): head.put(x, 34, fr['b'] if x % 3 else fr['lt'])
    elif f == 'moustache':
        for x in range(17, 28): head.put(x, 33, fr['b'] if x % 3 else fr['lt'])
        for x in range(18, 27): head.put(x, 34, fr['sh'])
        for x, y in ((17, 34), (27, 34), (17, 35), (27, 35)): head.put(x, y, fr['dp'])
    elif f == 'pencil':
        for x in range(19, 26): head.put(x, 33, fr['dp'] if x in (19, 25) else fr['sh'])
    elif f == 'goatee':
        for x in range(18, 27): head.put(x, 33, fr['b'] if x % 2 else fr['lt'])
        for x, y in ((18, 34), (26, 34), (18, 35), (26, 35), (18, 36), (26, 36)): head.put(x, y, fr['sh'])
        for y in range(37, 44):
            for x in range(19, 26):
                if y == 37 and 20 <= x <= 24: continue
                if y >= 42 and not (20 <= x <= 24): continue
                head.put(x, y, fr['lt'] if (x + y) % 4 == 0 and x < 23 else fr['b'] if (x + y) % 3 else fr['sh'])

    # ---- the hair over the head
    hm_front = hair_front(hs, hm, hx, jw, hat)
    crown = (17.5, 5.0)
    for (x, y) in hm_front:
        a = atan2(y - crown[1], x - crown[0]); r = hypot(x - crown[0], y - crown[1])
        u = a * 13.0 + (y % 3) * 0.3                          # across the strands
        ph = u % 3.0
        if hs == 'wave':                                       # the waves: rolls across the head
            pw = (y + 2.2 * sin(x / 2.4)) % 4
            c = hr['sh'] if pw < 1.2 else hr['hl'] if (pw > 3.1 and x < 18 and y < 16) else hr['lt'] if pw > 2.9 else hr['b']
            if (x, y + 1) not in hm_front and (x, y + 1) in hm: c = hr['dp']
            if x >= 29 and c != hr['dp']: c = hr['sh']
            over.put(x, y, c); continue
        c = hr['b']
        if ph < 0.9: c = hr['sh']
        if hs in ('slick', 'combed', 'pulled', 'bun', 'wave', 'bob') and ph < 0.9: c = hr['b'] if (x + y) % 2 else hr['sh']
        sheen = (7.5 <= r <= 10.5) if hs not in ('buzz',) else False
        if sheen and 1.2 < ph < 2.4 and x < 27: c = hr['hl'] if r < 9 and x < 22 else hr['lt']
        if (x, y + 1) not in hm_front and (x, y + 1) in hm: c = hr['dp']   # the tips over the skin
        if x >= 28: c = hr['sh'] if c in (hr['b'], hr['lt']) else hr['dp'] if c == hr['sh'] else c
        if hs == 'buzz':                                       # cropped close: the hair's colour over the scalp, finely speckled, soft at the hairline
            c = mix(sk['b'], hair, 0.84) if (x * 3 + y * 5) % 7 else mix(sk['sh'], hair, 0.92)
            if 7 <= r <= 9.5 and x < 24 and (x + y) % 2: c = mix(c, hr['hl'], 0.35)
            if x >= 28: c = mix(c, (0, 0, 0), 0.18)
            if (x, y + 1) not in hm_front: c = mix(sk['b'], hair, 0.6)
        over.put(x, y, c)
    if hs == 'bald':                                           # a shine on the scalp
        for x, y in ((14, 10), (15, 10), (16, 10), (13, 11), (14, 11), (17, 9)): head.put(x, y, sk['hl'])
    if hs == 'curly':                                          # the curls' highlights and their shadowed undersides
        for cx, cy in ((12, 9), (16, 6), (21, 5), (26, 7), (29, 10), (9, 14), (31, 14), (13, 13), (19, 10), (24, 11), (28, 15)):
            if over.has(cx, cy): over.put(cx, cy, hr['lt']); over.put(cx - 1, cy, hr['hl']) if over.has(cx - 1, cy) else None
            if over.has(cx + 1, cy + 2): over.put(cx + 1, cy + 2, hr['dp'])
    if hs == 'bun':                                            # a messy bun up top, a loose curl by the brow
        for (x, y) in ellipse_px(15.5, 4.8, 5.4, 4.2):
            over.put(x, y, hr['lt'] if (x * 2 + y) % 5 == 0 else hr['b'] if (x + y) % 3 else hr['sh'])
        for x, y in ((10, 3), (21, 2), (12, 1), (19, 7), (9, 6)): over.put(x, y, hr['b'])
        for x, y in ((29, 17), (30, 18), (30, 19), (29, 20)): over.put(x, y, hr['b'])
    if hs == 'spiky':                                          # gelled spikes, the tips bright
        for x0, h in ((11, 7), (15, 10), (19, 11), (23, 10), (27, 8), (31, 5)):
            for k in range(h):
                for dx in range(-max(0, 2 - k // 3), max(1, 3 - k // 3)):
                    over.put(x0 + dx + k // 4, 9 - k, hr['lt'] if k > h - 3 else hr['b'] if dx <= 0 else hr['sh'])
    if hs == 'flattop':                                        # the flat top's bristles
        for x in range(10, 31): over.put(x, 3, hr['lt'] if x % 2 else hr['b'])
    if 'temples' in extras:
        for (x, y), c in list(over.p.items()):
            if (x <= hx(y)[0] + 3 or x >= hx(y)[1] - 2) and 14 <= y <= 24: over.put(x, y, (190, 190, 196) if (x + y) % 2 else (150, 150, 158))
    if 'pencil' in extras:                                     # behind the near ear
        for x, y in ((4, 21), (5, 22), (6, 23), (7, 24), (8, 25), (9, 26)): over.put(x, y, (246, 200, 40) if x > 4 else (240, 130, 150))
        over.put(10, 27, (60, 50, 40))
    if 'loupe' in extras:                                      # a jeweller's loupe pushed up on the brow
        for (x, y) in ellipse_px(25.5, 16, 2.6, 2.4): over.put(x, y, (34, 34, 40))
        for (x, y) in ellipse_px(25.5, 16, 1.5, 1.4): over.put(x, y, (170, 205, 230) if x < 26 else (120, 155, 190))

    # ---- glasses
    gc = rgb(ch['glassesColour']) if ch.get('glassesColour') else (30, 26, 34); g_lt = lite(gc, 0.45)
    if gl == 'shades':                                         # mirror shades: dark lenses, a bright streak
        for (x, y) in poly_px([(10.5, 22), (18, 22), (17.5, 26.5), (11.5, 26.5)]) | poly_px([(22.5, 22), (30, 22), (29.5, 26.5), (23.5, 26.5)]): over.put(x, y, gc)
        for x, y in ((12, 23), (13, 23), (12, 24), (24, 23), (25, 23), (24, 24)): over.put(x, y, (150, 170, 210))
        for x, y in ((15, 25), (27, 25)): over.put(x, y, (90, 110, 150))
        for x in range(18, 23): over.put(x, 22, gc)
        over.put(9, 22, gc); over.put(31, 22, gc)
        if face == 'angry': [over.put(x, y, brc) for x, y in ((11, 21), (12, 21), (28, 21), (29, 21))]
    elif gl == 'roundshades':
        for (x, y) in ellipse_px(14.5, 24.3, 3.9, 3.4) | ellipse_px(26.2, 24.3, 3.7, 3.4): over.put(x, y, gc)
        for (x, y) in ellipse_px(14.5, 24.3, 2.8, 2.4) | ellipse_px(26.2, 24.3, 2.6, 2.4): over.put(x, y, mix(gc, (40, 30, 50), 0.6))
        for x, y in ((13, 23), (14, 22), (25, 23), (26, 22)): over.put(x, y, (190, 200, 230))
        for x in range(18, 23): over.put(x, 23, gc)
        over.put(10, 23, gc); over.put(30, 23, gc)
    elif gl == 'square':
        for x0 in (10, 22):
            for x in range(x0, x0 + 9): over.put(x, 21, gc); over.put(x, 27, gc)
            for y in range(21, 28): over.put(x0, y, gc); over.put(x0 + 8, y, gc)
            over.put(x0 + 1, 22, g_lt); over.put(x0 + 2, 22, g_lt)
        for x in range(19, 22): over.put(x, 23, gc)
    elif gl == 'reading':                                      # half-moon frames low on the nose, a cord down to the collar
        for x0 in (11, 23):
            for x in range(x0, x0 + 7): over.put(x, 27, gc)
            over.put(x0, 26, gc); over.put(x0 + 6, 26, gc)
            for x in range(x0 + 1, x0 + 6): over.put(x, 26, mix(head.get(x, 26) or sk['b'], (210, 230, 250), 0.35))
        for x in range(18, 23): over.put(x, 26, gc)
        over.put(10, 26, gc)
        for y in range(27, 48): over.put(9 - (y - 27) // 7, y, gc if y % 2 else dark(gc, 0.7))

    # ---- hats
    hc = rgb(ch['hatColour']) if ch.get('hatColour') else (40, 40, 50); hc2 = rgb(ch['hatColour2']) if ch.get('hatColour2') else dark(hc, 0.6)
    HT = cloth_ramp(hc)
    def shade_hat(px, base_ramp):
        for (x, y) in px:
            c = base_ramp['b']
            if x >= 27: c = base_ramp['sh']
            if x <= 11: c = base_ramp['sh']
            if (x, y - 1) not in px: c = base_ramp['lt'] if x < 27 else base_ramp['b']
            over.put(x, y, c)
    if hat == 'captain':                                       # a white captain's cap: the crown, a black band, a black peak, a gold anchor badge
        crown_px = poly_px([(7.5, 15), (8, 9), (12, 4.5), (28, 4.5), (32.5, 9), (33, 15)]); shade_hat(crown_px, HT)
        for x in range(13, 28): over.put(x, 5, HT['hl'])
        for x in range(8, 33): over.put(x, 14, (24, 24, 32)); over.put(x, 15, (16, 16, 22))
        for (x, y) in poly_px([(8.5, 16), (31.5, 16), (30.5, 18.5), (9.5, 18.5)]): over.put(x, y, (14, 14, 20) if y > 16 else (40, 42, 56))
        for x in range(12, 28, 3): over.put(x, 16, (70, 72, 90))
        for x, y in ((20, 8), (20, 9), (20, 10), (20, 11), (19, 9), (21, 9), (18, 11), (22, 11), (19, 12), (20, 12), (21, 12)): over.put(x, y, (236, 190, 70))
        over.put(20, 7, (255, 230, 140))
        for x in range(8, 33): over.put(x, 13, (220, 190, 90) if x % 2 else (190, 150, 60))   # the braid over the band
    elif hat in ('police', 'chauffeur'):                       # a peaked cap: the crown wider at the top, a band, a glossy peak
        crown_px = poly_px([(6.5, 6), (33.5, 6), (31, 13.5), (9, 13.5)]); shade_hat(crown_px, HT)
        for x in range(9, 31): over.put(x, 13, (18, 18, 24)); over.put(x, 14, hc2 if hat == 'police' else (18, 18, 24))
        if hat == 'police':
            for x in range(9, 31, 2): over.put(x, 14, (230, 230, 236))
        for (x, y) in poly_px([(9.5, 15), (30.5, 15), (29.5, 18), (10.5, 18)]): over.put(x, y, (10, 10, 14) if y > 15 else (36, 38, 50))
        for x in range(13, 27, 4): over.put(x, 15, (90, 92, 110))
        if hat == 'police':
            for x, y in ((19, 8), (20, 8), (21, 8), (19, 9), (20, 9), (21, 9), (20, 10), (20, 7)): over.put(x, y, (236, 196, 80) if y < 10 else (200, 150, 50))
            over.put(19, 8, (255, 236, 150))
        else: over.put(29, 13, (236, 190, 70)); over.put(11, 13, (236, 190, 70))
    elif hat == 'flatcap':                                     # a tweed flat cap, low over the brow, a short peak
        crown_px = poly_px([(7, 15), (8.5, 10), (13, 7), (27, 7), (32, 10), (34, 15)]); shade_hat(crown_px, HT)
        for (x, y) in crown_px:
            if (x * 2 + y * 3) % 5 == 0: over.put(x, y, hc2)
        for (x, y) in poly_px([(9, 15), (32, 15), (31, 17.5), (10, 17.5)]): over.put(x, y, HT['sh'] if y < 16 else HT['dp'])
        for x in range(14, 26): over.put(x, 8, HT['lt'])
    elif hat == 'hardhat':                                     # a hard hat: a dome with a ridge, a brim all round
        crown_px = {(x, y) for (x, y) in ellipse_px(20.2, 14, 12.6, 11.5) if y <= 14}; shade_hat(crown_px, HT)
        for y in range(3, 14): over.put(19, y, HT['hl']); over.put(20, y, HT['lt']); over.put(21, y, HT['sh'])
        for (x, y) in poly_px([(5.5, 14), (35, 14), (35.5, 16.5), (5, 16.5)]): over.put(x, y, cloth_ramp(hc2)['b'] if y == 14 else cloth_ramp(hc2)['sh'])
    elif hat == 'visor':                                       # a green eyeshade: a band round the head, a see-through peak
        for x in range(9, 32): over.put(x, 15, hc2); over.put(x, 16, dark(hc2, 0.8))
        for (x, y) in poly_px([(7.5, 17), (33, 17), (34, 21), (6.5, 21)]):
            under = over.get(x, y) or head.get(x, y) or sk['b']
            over.put(x, y, mix(under, hc, 0.6) if (x + y) % 2 else mix(under, hc, 0.75))
        for x in range(8, 33): over.put(x, 17, lite(hc, 0.3))

    # ---- extras over the face
    def corner_prop(pts, cols):
        for (x, y), c in zip(pts, cols): over.put(x, y, c)
    if 'cigar' in extras:
        corner_prop([(26, 35), (27, 35), (28, 35), (29, 34), (30, 34), (31, 34), (27, 36), (28, 36), (29, 35), (30, 35)],
                    [(120, 76, 42)] * 6 + [(84, 52, 28)] * 4)
        over.put(32, 34, (255, 120, 50)); over.put(32, 33, (200, 70, 40))
        for x, y in ((33, 31), (34, 29), (33, 27), (34, 25)): over.put(x, y, (160, 160, 172))
    if 'toothpick' in extras:
        corner_prop([(26, 35), (27, 35), (28, 34), (29, 34), (30, 33)], [(226, 196, 140)] * 4 + [(190, 160, 110)])
    if 'holder' in extras:
        corner_prop([(26, 35), (27, 35), (28, 34), (29, 34), (30, 33), (31, 33), (32, 32), (33, 32)], [(24, 22, 28)] * 8)
        over.put(34, 31, (240, 236, 228)); over.put(35, 31, (240, 236, 228)); over.put(36, 30, (255, 120, 60))
        for x, y in ((37, 28), (36, 26), (37, 24), (36, 22)): over.put(x, y, (160, 160, 176))
    if 'hoops' in extras:
        for (x, y) in ellipse_px(8.4 - jw, 34.0, 2.4, 3.2) - ellipse_px(8.4 - jw, 34.0, 1.3, 2.1): over.put(x, y, (255, 206, 70) if y < 35 else (210, 160, 40))

    # ---- put it together: back hair, neck, body, head, hair and hats - then the outline round the figure
    fig = {}
    for layer in (back, neck, body, head, over): fig.update(layer.p)
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    for (x, y), c in fig.items(): img.putpixel((x, y), tuple(c) + (255,))
    for y in range(H):
        for x in range(W):
            if (x, y) in fig: continue
            nb = [fig[q] for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)) if q in fig]
            if nb:
                c = min(nb, key=lambda c: sum(c))
                img.putpixel((x, y), mix(dark(c, 0.3), ink, 0.55) + (255,))
    return img


def drawbody(ch, body, T, T2, top, top2, sk, extras, build, fem):
    t = ch['top']
    L, R = {'slim': (4, 36), 'normal': (2, 38), 'broad': (-1, 41)}[build]
    sh = poly_px([(13.5, 41), (L + 7, 43.5), (L + 2, 46.5), (L - 0.5, 51), (L - 1.5, 64), (R + 1.5, 64), (R + 0.5, 51), (R - 2, 46.5), (R - 7, 43.5), (26.5, 41)])
    if build == 'broad': sh = poly_px([(12.5, 40), (L + 6, 41.5), (L + 1, 44), (L - 1.5, 49), (L - 2, 64), (R + 2, 64), (R + 1.5, 49), (R - 1, 44), (R - 6, 41.5), (28.5, 40)])
    if t == 'blazer': sh |= poly_px([(L - 1, 46), (L + 6, 43), (R - 6, 43), (R + 1, 46), (R + 1, 52), (L - 1, 52)])
    def base(x, y, r=T):                                      # the cloth's shading: the far side and the edges in shade, the shoulders' tops lit, folds
        c = r['b']
        if x >= R - 3: c = r['sh']
        if x >= R - 1: c = r['dp']
        if x <= L + 1: c = r['sh']
        if (x, y - 1) not in sh and x < R - 3: c = r['lt']
        if (x, y - 2) not in sh and (x, y - 1) in sh and L + 2 < x < 16: c = r['lt']
        if x in (L + 5, R - 6) and y >= 52: c = r['sh']               # where the arms meet the body
        if (x - y // 4) in (L + 10,) and 50 <= y <= 57: c = r['sh']     # a fold from the near shoulder
        if (x + y // 4) in (R + 6,) and 52 <= y <= 59: c = r['sh']
        return c
    for (x, y) in sh: body.put(x, y, base(x, y))
    def fill(px, r, lit=True):
        for (x, y) in px:
            if (x, y) in sh or y >= 41: body.put(x, y, base(x, y, r) if lit else r['b'])
    def skin_v(px):
        for (x, y) in px: body.put(x, y, sk['dp'] if y <= 43 else sk['sh'] if y <= 45 else sk['b'])
    vee = lambda d, w=4.2: poly_px([(20.4 - w, 41), (20.6 + w, 41), (20.5, 41 + d)])
    def collar(rl, rr, dy=0):                                 # collar points either side of the neck
        l = poly_px([(13.8, 40.5), (16.8, 41), (19.8, 48.5 + dy), (14.2, 46.5 + dy)]); r = poly_px([(27.2, 40.5), (24.2, 41), (21.2, 48.5 + dy), (26.8, 46.5 + dy)])
        for (x, y) in l: body.put(x, y, rl['dp'] if (x - 1, y) not in l or (x, y + 1) not in l else rl['lt'])
        for (x, y) in r: body.put(x, y, rr['dp'] if (x + 1, y) not in r or (x, y + 1) not in r else rr['b'])
    def placket(r, y0, buttons=(54, 58, 62)):
        for y in range(y0, 64): body.put(20, y, r['sh']); body.put(21, y, r['dp'] if y % 2 else r['sh'])
        for y in buttons: body.put(20, y, (232, 228, 220))
    def pocket(x0, y0, r, w=5, h=5):
        for y in range(y0, y0 + h):
            for x in range(x0, x0 + w): body.put(x, y, r['b'] if y > y0 else r['sh'])
        for x in range(x0, x0 + w): body.put(x, y0 + h, r['dp'])
        for y in range(y0, y0 + h): body.put(x0 + w, y, r['dp'])
    def lapels(r, depth=56):
        l = poly_px([(14, 41), (16.8, 41.5), (20.5, depth), (16.5, depth - 4), (12.5, 45)]); rr = poly_px([(27, 41), (24.2, 41.5), (20.5, depth), (24.5, depth - 4), (28.5, 45)])
        for (x, y) in l: body.put(x, y, r['lt'] if (x - 1, y) not in l else r['sh'])
        for (x, y) in rr: body.put(x, y, r['dp'] if (x + 1, y) not in rr else r['sh'])
    def crew(r, d=3.5):                                       # a round neckline, skin in it
        for (x, y) in ellipse_px(20.5, 41, 5.0, d): body.put(x, y, sk['dp'] if y <= 42 else sk['sh'])
        for (x, y) in ellipse_px(20.5, 41, 6.0, d + 1) - ellipse_px(20.5, 41, 5.0, d):
            if y >= 41: body.put(x, y, r['sh'])

    if t in ('openshirt', 'flowershirt', 'darkshirt', 'blouse'):
        skin_v(vee(11 if t == 'blouse' else 9, 4.6 if t == 'blouse' else 4.2))
        collar(T if t != 'openshirt' else T, T2 if t == 'openshirt' else T, dy=1 if t == 'blouse' else 0)
        placket(T, 51 if t != 'blouse' else 53)
        if t == 'flowershirt':                                 # big flowers in the second colour, orange centres
            for (cx, cy) in ((7, 50), (12, 58), (31, 49), (34, 57), (25, 61), (16, 63), (4, 60), (27, 54), (38, 63)):
                for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1)):
                    if (cx + dx, cy + dy) in sh and body.get(cx + dx, cy + dy) not in (sk['b'], sk['sh'], sk['dp']): body.put(cx + dx, cy + dy, (255, 170, 50) if (dx, dy) == (0, 0) else T2['b'] if (dx + dy) % 2 == 0 else T2['lt'])
        if t == 'blouse':
            for x, y in ((8, 55), (9, 56), (31, 55), (32, 56), (6, 60), (34, 60)): body.put(x, y, T['sh'])
    elif t == 'denim':                                         # the reference's shirt: a white T-shirt under it, two chest pockets, seams
        for (x, y) in vee(9, 4.2): body.put(x, y, (238, 236, 232) if y > 42 else (200, 198, 196))
        for (x, y) in ellipse_px(20.5, 41, 3.0, 1.6): body.put(x, y, sk['dp'])
        collar(T, T)
        placket(T, 50)
        pocket(8, 51, T); pocket(27, 51, T)
        for y in range(46, 64, 3): body.put(L + 5, y, T['lt'])
    elif t == 'buttoned':                                      # buttoned to the top, a number on the pocket
        collar(T, T, dy=-2)
        for (x, y) in poly_px([(17.5, 41), (23.5, 41), (20.5, 46)]): body.put(x, y, T['sh'])
        body.put(20, 44, (232, 232, 238))
        placket(T2, 46, (49, 53, 57, 61))
        pocket(8, 51, T2, 6, 5)
        for x in range(9, 13): body.put(x, 53, (235, 235, 240)) if x != 11 else None
    elif t == 'uniform':                                       # a uniform shirt: the collar closed, a tie, a badge, epaulettes, pockets
        collar(T, T, dy=-2)
        for (x, y) in poly_px([(19.4, 42), (21.6, 42), (22.3, 58), (20.5, 60), (18.7, 58)]): body.put(x, y, T2['b'] if x <= 20 else T2['sh'])
        body.put(20, 42, T2['lt']); body.put(21, 42, T2['lt'])
        for (x, y) in poly_px([(8, 49), (12, 49), (12, 53), (10, 54.5), (8, 53)]): body.put(x, y, (236, 196, 80) if (x + y) % 3 else (255, 232, 140))
        pocket(27, 52, T, 6, 4); pocket(7, 56, T, 6, 4)
        epc = (220, 180, 70) if 'braid' in extras else T['dp']
        for (x, y) in poly_px([(L + 3, 44.5), (L + 10, 42.5), (L + 10, 44.5), (L + 3, 46.5)]) | poly_px([(R - 10, 42.5), (R - 3, 44.5), (R - 3, 46.5), (R - 10, 44.5)]): body.put(x, y, epc if (x + y) % 2 or epc == T['dp'] else lite(epc, 0.3))
    elif t in ('suit', 'seersucker', 'checkjacket', 'jacketvest', 'blazer', 'labcoat', 'leather', 'cardigan'):
        if t == 'seersucker':
            for (x, y) in sh:
                if x % 2 == 0: body.put(x, y, lite(body.get(x, y), 0.35))
        if t == 'checkjacket':
            for (x, y) in sh:
                if x % 4 == 0 or y % 4 == 0: body.put(x, y, T2['b'] if (x % 4 == 0) != (y % 4 == 0) else T2['dp'])
        if t == 'cardigan':
            for (x, y) in sh:
                if (x + (y // 2) * 2) % 3 == 0 and y % 2: body.put(x, y, T['sh'])
        inner = {'suit': T2, 'seersucker': T2, 'checkjacket': cloth_ramp((238, 234, 222)), 'jacketvest': T2, 'blazer': T2, 'labcoat': T2, 'leather': T2, 'cardigan': T2}[t]
        depth = {'suit': 56, 'seersucker': 56, 'checkjacket': 56, 'jacketvest': 58, 'blazer': 58, 'labcoat': 57, 'leather': 60, 'cardigan': 55}[t]
        for (x, y) in vee(depth - 41, 5.2 if t in ('leather', 'labcoat', 'blazer', 'jacketvest') else 4.4): body.put(x, y, inner['b'] if x <= 21 else inner['sh'])
        if t in ('suit', 'seersucker', 'checkjacket', 'cardigan'):          # a shirt with its collar open
            skin_v(vee(6, 3.2))
            l = poly_px([(15.8, 41), (17.8, 41), (19.8, 46), (16.8, 45)]); r = poly_px([(25.2, 41), (23.2, 41), (21.2, 46), (24.2, 45)])
            for (x, y) in l | r: body.put(x, y, inner['lt'] if x < 21 else inner['b'])
        elif t in ('leather', 'labcoat', 'blazer'):                          # a T-shirt or a top: a round neck
            for (x, y) in ellipse_px(20.5, 41, 3.6, 2.4): body.put(x, y, sk['dp'] if y <= 41 else sk['sh'])
            for x in range(17, 25): body.put(x, 43 if 18 <= x <= 23 else 42, inner['sh'])
        elif t == 'jacketvest':                                              # a white vest: a scoop of skin above it
            for (x, y) in ellipse_px(20.5, 41, 4.4, 4.6): body.put(x, y, sk['dp'] if y <= 42 else sk['sh'] if y <= 44 else sk['b'])
        lapels(T if t not in ('checkjacket',) else cloth_ramp(dark(top, 0.9)), depth)
        if t == 'leather':                                    # the wide collar, the shine, the open zip
            for (x, y) in poly_px([(11.5, 41.5), (16.5, 40.5), (18, 45), (14, 49)]): body.put(x, y, T['lt'])
            for x, y in ((13, 42), (14, 43), (15, 44)): body.put(x, y, T['hl'])
            for (x, y) in poly_px([(29.5, 41.5), (24.5, 40.5), (23, 45), (27, 49)]): body.put(x, y, T['sh'])
            for x, y in ((5, 47), (6, 47), (7, 46), (4, 52), (4, 53), (33, 50), (34, 51)): body.put(x, y, T['hl'])
            for y in range(52, 64): body.put(17, y, T['hl'] if y % 3 == 0 else T['sh'])
        if t == 'labcoat':                                    # pens in the breast pocket
            pocket(26, 52, T, 6, 5); body.put(27, 51, (60, 90, 200)); body.put(27, 50, (60, 90, 200)); body.put(29, 51, (220, 40, 40)); body.put(29, 50, (220, 40, 40))
        if t == 'blazer':                                     # the big padded shoulders
            for x in range(L, R): body.put(x, 45, T['lt'] if x < 26 else T['b'])
        if t == 'cardigan':
            for y in (57, 60, 63): body.put(20, y, (226, 206, 160))
        if t in ('suit', 'seersucker', 'checkjacket'):
            body.put(20, 59, T['dp']); body.put(20, 62, T['dp'])
            pocket(27, 52, T, 6, 1)
    elif t == 'waistcoat':                                     # white shirt sleeves, the waistcoat over the chest, a bow tie
        for (x, y) in sh:
            if x <= L + 7 or x >= R - 7: body.put(x, y, base(x, y, T2))
        skin_v(vee(4, 3))
        for (x, y) in vee(14, 5.0): body.put(x, y, T2['b'] if x < 21 else T2['sh'])
        for (x, y) in poly_px([(13.8, 41), (17.8, 41), (20.5, 55), (20.5, 64), (L + 7.5, 64), (L + 7.5, 46)]): body.put(x, y, base(x, y))
        for (x, y) in poly_px([(27.2, 41), (23.2, 41), (20.5, 55), (20.5, 64), (R - 7.5, 64), (R - 7.5, 46)]): body.put(x, y, base(x, y))
        for y in (57, 60, 63): body.put(20, y, (236, 206, 130))
        extras = extras | {'bowtie'}
    elif t == 'hivis':                                         # a navy shirt, the orange vest with silver bands
        for (x, y) in sh: body.put(x, y, base(x, y, T2))
        collar(T2, T2, dy=-1); skin_v(vee(4, 2.6))
        vest = poly_px([(13, 43), (17.5, 44), (19.8, 64), (L + 5.5, 64), (L + 5.5, 47)]) | poly_px([(28, 43), (23.5, 44), (21.2, 64), (R - 5.5, 64), (R - 5.5, 47)])
        for (x, y) in vest: body.put(x, y, base(x, y))
        for y in (52, 53, 58, 59):
            for x in range(0, 40):
                if (x, y) in vest: body.put(x, y, (226, 230, 236) if (x + y) % 3 else (250, 252, 255))
    elif t == 'jumpsuit':                                      # a work jumpsuit: a small collar, the zip, a name patch
        crew(T2, 2.6); collar(T, T, dy=-3)
        for y in range(45, 64): body.put(20, y, T['dp'] if y % 2 else (170, 172, 182))
        for (x, y) in poly_px([(6.5, 50), (15.5, 50), (15.5, 54.5), (6.5, 54.5)]): body.put(x, y, (238, 234, 222))
        for x in range(7, 15): body.put(x, 52, (50, 60, 110) if x % 2 else (238, 234, 222))
        for x, y in ((9, 58), (10, 59), (30, 56), (31, 57), (26, 61)): body.put(x, y, mix(top, (40, 36, 30), 0.5))   # grease
    elif t == 'windbreaker':                                   # a two-tone shell, zipped up to a high collar
        for (x, y) in sh:
            if 49 <= y <= 53: body.put(x, y, base(x, y, T2))
        for (x, y) in poly_px([(15, 39.5), (26, 39.5), (26.5, 44.5), (14.5, 44.5)]): body.put(x, y, T['lt'] if x < 20 else T['sh'])
        for y in range(40, 64): body.put(20, y, (210, 212, 222) if y % 2 else (160, 162, 176))
        for x, y in ((6, 56), (7, 57), (33, 55), (34, 58)): body.put(x, y, T['hl'])
    elif t == 'tanktop':                                       # bare shoulders and arms, a white vest
        for (x, y) in sh:
            c = sk['b']
            if x <= L + 1 or x >= R - 2: c = sk['sh']
            if x >= R - 1: c = sk['dp']
            if (x, y - 1) not in sh: c = sk['lt']
            body.put(x, y, c)
        vest = poly_px([(13.5, 41), (16, 41), (18, 46.5), (23, 46.5), (25, 41), (27.5, 41), (30.5, 48), (R - 6.5, 64), (L + 6.5, 64), (10.5, 48)])
        for (x, y) in vest: body.put(x, y, base(x, y))
        for (x, y) in vest:
            if (x - 1, y) not in vest or (x + 1, y) not in vest: body.put(x, y, T['sh'])
        for y in range(48, 64):                                 # the arms' bulk: a shaded line where they meet the chest
            body.put(L + 4, y, sk['sh']); body.put(R - 5, y, sk['dp'])
        for x, y in ((L + 1, 47), (L + 2, 46), (R - 2, 46), (R - 3, 47), (L + 2, 55), (L + 2, 56), (R - 3, 55)): body.put(x, y, sk['lt'] if x < 20 else sk['sh'])
    elif t == 'dress':                                         # bare shoulders, the dress straight across with thin straps
        for (x, y) in sh:
            c = sk['b'] if x < R - 3 else sk['sh']
            if (x, y - 1) not in sh: c = sk['lt']
            body.put(x, y, c)
        for (x, y) in sh:
            if y >= 50 - (1 if 14 < x < 27 else 0): body.put(x, y, base(x, y))
        for x in (11, 12, 28, 29):
            for y in range(43, 50): body.put(x, y, T['b'] if x in (11, 28) else T['sh'])
        for y in range(53, 64):
            for x in (10, 17, 24, 31):
                if (x, y) in sh: body.put(x, y, T2['b'])
    if 'chain' in extras:                                      # a gold chain round the neck
        for (x, y) in poly_px([(15, 43), (26, 43), (24, 47.5), (20.5, 49), (17, 47.5)]) - poly_px([(16, 43), (25, 43), (23.5, 46.6), (20.5, 48), (17.5, 46.6)]):
            body.put(x, y, (255, 224, 110) if x % 2 else (214, 164, 54))
    if 'pearls' in extras:
        for x, y in ((14, 43), (15, 44), (16, 45), (17, 46), (18, 47), (19, 47), (20, 47), (21, 47), (22, 47), (23, 46), (24, 45), (25, 44), (26, 43)):
            body.put(x, y, (250, 248, 244) if x % 2 else (196, 192, 210))
    if 'bowtie' in extras:
        bt = (24, 22, 30) if ch['top'] == 'waistcoat' else (150, 30, 44)
        for (x, y) in poly_px([(16.5, 41), (20.5, 43), (24.5, 41), (24.5, 46), (20.5, 44), (16.5, 46)]): body.put(x, y, bt if x != 20 else lite(bt, 0.25))
    if 'tattoo' in extras:                                     # on the near shoulder
        for x, y in ((L + 3, 49), (L + 4, 48), (L + 5, 49), (L + 4, 50), (L + 3, 51), (L + 5, 51), (L + 4, 52), (L + 6, 50)): body.put(x, y, (40, 90, 100))
    if 'rag' in extras:                                        # a red rag over the near shoulder
        for (x, y) in poly_px([(L + 2, 47), (L + 10, 43), (L + 12, 46), (L + 7, 56), (L + 3, 57)]): body.put(x, y, (200, 70, 60) if (x + y) % 4 else (150, 48, 42))


def hair_front(hs, hm, hx, jw, hat):         # where the hair lies over the head: the cap of the skull down to a hairline, the sides to the ears
    E = lambda v: ellipse_px(20.2, 20.4, 11.0 + jw * 0.5 + v, 12.8 + v)
    out = set()
    def sides(yl, yr, depth=2, v=0.6):
        for (x, y) in E(v):
            if y < 12 or y not in range(0, 64): continue
            xl, xr = hx(y) if (x, y) in hm or True else (x, x)
            if (x <= xl + depth and y <= yl) or (x >= xr - depth and y <= yr): out.add((x, y))
    def cap(v, hl):
        for (x, y) in E(v):
            if y <= hl(x): out.add((x, y))
    if hs == 'bald': return out
    if hs == 'sides':
        sides(25, 24, 2); return {(x, y) for (x, y) in out if y >= 13}
    if hs == 'short':                       # a short messy cut, its fringe in points over the brow (the reference's)
        tips = [(10, 3), (13, 5), (16, 3.5), (19, 5.5), (22, 3.5), (25, 4.5), (28, 2.5), (31, 1.5)]
        cap(1.3, lambda x: 13 + max(0, max(d - abs(x - tx) * 1.25 for tx, d in tips)))
        sides(24, 23, 2)
        for cx, cy in ((12, 6.5), (16, 5), (21, 4.5), (26, 5.5), (29, 8)): out |= ellipse_px(cx, cy, 2.2, 2.0)
    elif hs == 'slick':
        cap(0.7, lambda x: 12.4 + abs(x - 19) * 0.14); sides(23, 22, 1)
    elif hs == 'buzz':
        cap(0.25, lambda x: 13.6 + abs(x - 20) * 0.1); sides(22, 21, 1, 0.25)
    elif hs == 'combed':
        cap(1.0, lambda x: 12.5 + (0.8 if x > 24 else 0)); out |= {(x, y) for (x, y) in ellipse_px(22.5, 15.5, 10.5, 9.5) if y <= 13}
        sides(23, 22, 2)
        out -= {(13, y) for y in range(6, 12)}                          # the parting
    elif hs == 'pixie':                     # short, a long fringe swept across the brow, the nape longer
        cap(1.0, lambda x: min(19.6, 12.5 + max(0, x - 11) * 0.42)); sides(29, 26, 3)
    elif hs == 'curly':
        cap(2.6, lambda x: 13 + (1.5 if (x // 3) % 2 else 0)); sides(26, 25, 3, 2.6)
        for k in range(14):
            from math import cos, sin, pi
            a = pi * (1.05 + k / 13 * 0.9); out |= ellipse_px(20.2 + cos(a) * 13.2, 19 + sin(a) * 14.2, 2.6, 2.4)
    elif hs == 'flattop':
        out |= {(x, y) for (x, y) in poly_px([(9, 6), (10.5, 3), (29.5, 3), (31, 6), (31.5, 13.4), (8.5, 13.4)])}
        sides(21, 20, 1)
    elif hs == 'bob':                       # a blunt fringe, straight curtains to the jaw either side
        cap(1.3, lambda x: 19 if 10 <= x <= 30 else 13)
        for (x, y) in E(1.3) | {(x, y) for y in range(13, 38) for x in range(6, 35)}:
            if y < 13 or y > 37: continue
            xl, xr = hx(y) if y in range(0, 64) else (0, 0)
            if xl == 99: continue
            if (x <= xl + 2 and x >= 6) or (x >= xr - 2 and x <= 34): out.add((x, y))
    elif hs in ('bun', 'pulled'):
        cap(0.5, lambda x: 12.5 + abs(x - 20) * 0.1); sides(22, 21, 1, 0.5)
    elif hs == 'wave':                      # a set 50s wave: the front rolled, full over the ears
        from math import sin
        cap(2.2, lambda x: 11.8 + 2.4 * sin((x - 4) / 4.2)); sides(31, 30, 3, 2.2)
    elif hs == 'spiky':
        cap(0.4, lambda x: 13 + (1 if x % 4 == 0 else 0)); sides(22, 21, 1, 0.4)
    return out


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


def on_ground(ch, img):                      # a portrait as the game shows it: on the night-dark ground with a glow in the bubble colour
    bub = rgb(ch['bubble']); g = Image.new('RGBA', (W, H))
    for y in range(H):
        for x in range(W):
            d = ((x - 20) ** 2 + ((y - 26) * 0.8) ** 2) ** 0.5
            t = max(0.0, 1 - d / 30) * 0.45
            g.putpixel((x, y), mix((18, 15, 30), bub, t) + (255,))
    g.alpha_composite(img); return g.convert('RGB')


def sheet(path, k=5, ids=None):
    t = load(); chs = [c for c in t['characters'] if not ids or c['id'] in ids]; pad = 4
    img = Image.new('RGB', (len(FACES) * (W * k + pad) + pad, len(chs) * (H * k + pad) + pad), (30, 28, 40))
    for r, ch in enumerate(chs):
        check(ch)
        for c, f in enumerate(FACES):
            img.paste(on_ground(ch, draw(ch, f)).resize((W * k, H * k), Image.NEAREST), (pad + c * (W * k + pad), pad + r * (H * k + pad)))
    img.save(path); print('wrote', path)


def doc():
    import docx
    from docx.shared import Pt, Cm, RGBColor
    t = load(); d = docx.Document()
    st = d.styles['Normal']; st.font.name = 'Helvetica'; st.font.size = Pt(10)
    d.add_heading('BLOCK RUNNER - THE CHARACTERS', 0)
    d.add_paragraph('How every character looks, written down so they stay the same in every mission. The portraits are pixel art, 40 x 64, '
                    'head and shoulders nearly face on, in the style of the reference picture (transparent around the figure; the game shows them '
                    'on a night-dark ground with a glow in the character\'s bubble colour, as here). Each has three faces: calm, angry and smiling - the game picks one from the mood written on each line '
                    '(angry: ' + ', '.join(t['faces']['angry']) + '; smiling: ' + ', '.join(t['faces']['smile']) + '; anything else: calm).')
    d.add_paragraph('They are drawn by tools/portraits.py from the recipes in the character table (js/01y-character-data.js; to change one, '
                    'edit the table - or the exported spreadsheet - and run the tool again). A picture of your own in img/chars/ with the same '
                    'name replaces a drawn one.')
    tmp = os.path.join(OUT, '_doc'); os.makedirs(tmp, exist_ok=True)
    for ch in t['characters']:
        d.add_heading('%s  (%s)' % (ch['name'], ch['letter']), 1)
        row = d.add_paragraph()
        for f in FACES:
            p = os.path.join(tmp, '%s-%s.png' % (ch['id'], f)); on_ground(ch, draw(ch, f)).resize((W * 4, H * 4), Image.NEAREST).save(p)
            row.add_run().add_picture(p, width=Cm(2.4)); row.add_run('  ')
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
    elif a[0] == 'sheet': sheet(a[1], int(a[2]) if len(a) > 2 else 5, a[3].split(',') if len(a) > 3 else None)
    elif a[0] == 'doc': doc()
    else: print(__doc__)
