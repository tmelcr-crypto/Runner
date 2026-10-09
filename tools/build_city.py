"""Build js/00-map-data.js for Block Runner: a made-up city laid on the outline of a reference map image.

Usage:  python tools/build_city.py <map image> js/00-map-data.js [preview.png]
Needs:  numpy, opencv-python-headless, scikit-image, shapely, pillow

Only the overall shape comes from the image: where the land, the beaches and the water are (blue = water,
beige = sand, everything else = land). The streets and buildings are generated:
  * every island gets a ring road that follows its coast, made only of straight runs at 0, 45 and 90 degrees;
  * inside the ring the land is cut again and again by straight streets (an irregular grid, a few 45 degree avenues),
    so every turn on the road network is 45, 90 or 135 degrees and every street ends on another street (no dead ends);
  * bridges are straight and carry on as avenues across the islands they join;
  * landmarks keep their places; no street cuts through one, and a short closed driveway leads to the gate of some;
  * the blocks get rows of buildings along the streets, with parks, plazas, parking lots, gas stations and yards.
The pixel boxes below (districts, landmarks, bridges, runways, start) are tuned to the reference image.
"""
import sys, json, math, numpy as np, cv2, shapely
from PIL import Image
from skimage.morphology import remove_small_objects, remove_small_holes
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, Point, box
from shapely.ops import unary_union, split, linemerge
from shapely.geometry.polygon import orient
from shapely import affinity

WATER, LAND, GRASS, SAND, WHITE, ROAD = 0, 1, 2, 3, 4, 5
def classify(path):
    im = np.array(Image.open(path).convert('RGB')).astype(int)[:815, :812]
    r, g, b = im[..., 0], im[..., 1], im[..., 2]; mx, mn = im.max(-1), im.min(-1)
    lab = np.full(r.shape, LAND, np.uint8)
    lab[(g - r > 18) & (g - b > 18)] = GRASS
    lab[(r > 165) & (g > 165) & (r - b > 18)] = SAND
    lab[(mn > 170) & (np.abs(r - b) < 26)] = WHITE
    lab[(b - r > 20) & (b > 110) & (mx > 100)] = WATER
    lab[mx < 75] = ROAD
    ff = (lab == WHITE).astype(np.uint8); h, w = ff.shape; m = np.zeros((h + 2, w + 2), np.uint8)   # outside the rounded screenshot corners is sea
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if ff[y, x]: cv2.floodFill(ff, m, (x, y), 2)
    lab[ff == 2] = WATER
    def majority(lab, k, classes):
        best, arg = None, None
        for c in classes:
            s = cv2.blur((lab == c).astype(np.float32), (k, k))
            if best is None: best, arg = s, np.full(lab.shape, c, np.uint8)
            else: sel = s > best; best[sel] = s[sel]; arg[sel] = c
        return arg
    lab = majority(lab, 3, range(6))
    # drawn roads count as land where real land is close by; the middle of a bridge, far out over the water, does not
    solid = ((lab != WATER) & (lab != ROAD)).astype(np.uint8)
    near = cv2.distanceTransform(1 - solid, cv2.DIST_L2, 5) <= 10
    land = ((solid > 0) | ((lab == ROAD) & near)).astype(np.uint8)
    land = cv2.morphologyEx(land, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))) > 0
    land = remove_small_objects(land, max_size=30); land = remove_small_holes(land, max_size=60)
    lab[~land] = WATER; lab[land & ((lab == WATER) | (lab == ROAD))] = LAND
    return lab

S = 20                      # world units per image pixel
ROAD_W = 132                # carriageway: two traffic lanes plus a parking lane on each side
RH = ROAD_W / 2
SW = 22                     # sidewalk width on each side
PAD = 10                    # raised pavement around buildings
FRONT = RH + SW + PAD + 2   # building fronts stand this far from the centre line of their street
COAST = 40                  # a ring road's sidewalk stays this far from the water or the beach
rng = np.random.default_rng(7)

lab = classify(sys.argv[1]); H, W = lab.shape

# ---------- shape: land and beaches as polygons (world units) ----------
def chaikin(pts, it=1):
    for _ in range(it):
        q = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            q += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = q
    return pts
def polys(mask, min_area, eps):
    """mask -> [{'o': outer ring, 'h': [holes]}] in world units, smoothed"""
    cs, hier = cv2.findContours(mask.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    edge = lambda c: (c[:, 0, 0].min() < 3 or c[:, 0, 1].min() < 3 or c[:, 0, 0].max() > W - 4 or c[:, 0, 1].max() > H - 4) and cv2.contourArea(c) < 400
    res = []
    if hier is None: return res
    hier = hier[0]
    for i, c in enumerate(cs):
        if hier[i][3] != -1 or cv2.contourArea(c) < min_area or edge(c): continue   # specks on the screenshot border are not land
        def conv(c):
            a = cv2.approxPolyDP(c, eps, True).reshape(-1, 2).astype(float) + 0.5
            return [[round(x * S), round(y * S)] for x, y in chaikin([tuple(p) for p in a], 1)]
        holes, j = [], hier[i][2]
        while j != -1:
            if cv2.contourArea(cs[j]) >= min_area: holes.append(conv(cs[j]))
            j = hier[j][0]
        res.append({'o': conv(c), 'h': holes})
    return res
def geom(ps):
    out = []
    for p in ps:
        g = Polygon(p['o'], p['h']).buffer(0)
        if not g.is_empty: out.append(g)
    return unary_union(out)
land_p = polys(lab != WATER, 25, 0.9)
sand_p = polys(lab == SAND, 14, 0.9)
LANDG, SANDG = geom(land_p), geom(sand_p)
print('land polys', len(land_p), 'sand', len(sand_p), file=sys.stderr)

DIST = [  # rects in image px [x0, y0, x1, y1], first match wins
    ['THE SANDBAR', [636, 70, 740, 800]], ['GRAVEL FLATS', [120, 20, 262, 130]], ['HERON KEY', [462, 88, 540, 200]],
    ['PALM HEIGHTS', [200, 0, 450, 292]], ['FAIRWAY ISLES', [418, 222, 572, 470]], ['PEARL KEY', [330, 428, 470, 545]],
    ['MERCADO', [185, 292, 360, 560]], ['SKYPORT', [50, 370, 212, 810]], ['DOCKSIDE', [212, 560, 380, 800]],
    ['GULL ROCKS', [395, 630, 462, 810]], ['SEAVIEW', [520, 60, 660, 300]], ['SUNSTRIP', [500, 300, 660, 480]],
    ['CORAL SHORE', [430, 480, 660, 810]]]
def district(x, y):                                     # world units
    for nm, r in DIST:
        if r[0] * S <= x < r[2] * S and r[1] * S <= y < r[3] * S: return nm
    return ''

# ---------- ring roads: each island's coast, traced with straight runs at multiples of 45 degrees ----------
def octilinear(poly, tol):
    """approximate a polygon by one whose edges all run at multiples of 45 degrees"""
    poly = orient(Polygon(poly.exterior), 1.0)          # inside is to the left of every edge
    pts = list(poly.exterior.simplify(tol).coords)[:-1]
    if len(pts) < 3: return None
    L = []                                              # [direction index 0..7, offset along the left normal, length]
    for i in range(len(pts)):
        (ax, ay), (bx, by) = pts[i], pts[(i + 1) % len(pts)]; ln = math.hypot(bx - ax, by - ay)
        if ln < 1: continue
        k = int(round(math.atan2(by - ay, bx - ax) / (math.pi / 4))) % 8
        nx, ny = -math.sin(k * math.pi / 4), math.cos(k * math.pi / 4)
        L.append([k, max(nx * ax + ny * ay, nx * bx + ny * by), ln])   # the run passes the innermost end, so it never leaves the shape
    def vert(a, b):                                     # where two lines meet
        n1 = (-math.sin(a[0] * math.pi / 4), math.cos(a[0] * math.pi / 4)); n2 = (-math.sin(b[0] * math.pi / 4), math.cos(b[0] * math.pi / 4))
        det = n1[0] * n2[1] - n1[1] * n2[0]
        if abs(det) < 1e-9: return None
        return ((a[1] * n2[1] - n1[1] * b[1]) / det, (n1[0] * b[1] - a[1] * n2[0]) / det)
    for _ in range(400):
        changed = False
        for i in range(len(L)):                         # neighbours that run the same way become one run
            j = (i + 1) % len(L)
            if len(L) > 3 and L[i][0] == L[j][0]:
                L[i] = [L[i][0], max(L[i][1], L[j][1]), L[i][2] + L[j][2]]; del L[j]; changed = True; break
        if changed: continue
        for i in range(len(L)):                         # a run straight back the way it came: drop the shorter
            j = (i + 1) % len(L)
            if len(L) > 3 and (L[i][0] - L[j][0]) % 8 == 4:
                del L[i if L[i][2] < L[j][2] else j]; changed = True; break
        if changed: continue
        V = [vert(L[i - 1], L[i]) for i in range(len(L))]
        for i in range(len(L)):                         # a run that comes out backwards (or too short to drive) is dropped
            a, b = V[i], V[(i + 1) % len(L)]; k = L[i][0]
            if a is None or b is None: continue
            along = (b[0] - a[0]) * math.cos(k * math.pi / 4) + (b[1] - a[1]) * math.sin(k * math.pi / 4)
            if len(L) > 3 and along < 160:
                del L[i]; changed = True; break
        if not changed: break
    V = [vert(L[i - 1], L[i]) for i in range(len(L))]
    if any(v is None for v in V) or len(V) < 3: return None
    g = Polygon(V)
    if not g.is_valid: g = g.buffer(0)                  # a run that crosses another: keep the outline, never a hole
    parts = [Polygon(q.exterior) for q in (g.geoms if hasattr(g, 'geoms') else [g]) if q.area > 0]
    return unary_union(parts) if parts else None

# ---------- landmarks and runways: ground no street may cross ----------
LM_PX = [
    {'t': 'stadium', 'c': (383, 42), 'r': 22, 'gate': 's'},
    {'t': 'estate', 'box': (386, 500, 452, 538), 'house': (398, 506, 430, 528), 'gate': 'n'},
    {'t': 'mall', 'box': (580, 96, 604, 146)},
    {'t': 'lighthouse', 'c': (657, 731)},
    {'t': 'terminal', 'box': (140, 562, 200, 597), 'gate': 's'},
    {'t': 'tower', 'c': (124, 582)},
    {'t': 'hangars', 'box': (88, 488, 155, 506)},
    {'t': 'apron', 'box': (140, 599, 194, 621)},                # open concrete south of the terminal, where the airliners park
    {'t': 'studio', 'box': (468, 141, 500, 182), 'gate': 'e'},
    {'t': 'colony', 'c': (558, 672), 'r': 0},     # 736 Ocean Drive: placed against the beach road at run time
    # made-up landmarks, so the city has things to remember it by
    {'t': 'park', 'box': (326, 150, 394, 204)},                 # Bayfront Park: a lake with a boathouse and a fountain, downtown
    {'t': 'tvtower', 'box': (276, 432, 290, 446), 'gate': 's'},  # the TV tower, a needle with a pod, over Mercado
    {'t': 'twist', 'box': (293, 88, 305, 100)},                 # a glass tower that turns as it rises
    {'t': 'crown', 'box': (294, 224, 306, 236)},                # a deco tower with a stepped neon crown and a spire
    {'t': 'sail', 'box': (644, 392, 656, 406), 'gate': 'w', 'a': 90},   # a hotel shaped like a sail, on the beach
    {'t': 'wheel', 'box': (650, 552, 664, 560), 'a': 0},        # a big wheel on the beach, facing the camera
]
RUNWAYS_PX = [((100, 548), (100, 786)), ((90, 732), (198, 624))]          # centre line ends; one north-south, one at 45 degrees
BRIDGES_PX = [[(420, 130), (508, 130), (508, 158), (590, 158)],            # bridges: straight runs at 0/45/90 degrees (image px);
              [(330, 372), (490, 372), (540, 322), (580, 322)],            # each end carries on until it meets a ring road
              [(320, 495), (580, 495)], [(320, 598), (460, 598)]]
def lm_shape(L):
    if 'box' in L: x0, y0, x1, y1 = L['box']; return box(x0 * S, y0 * S, x1 * S, y1 * S)
    if L['t'] == 'stadium': (cx, cy), r = L['c'], L['r']; return box((cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S)
    return Point(L['c'][0] * S, L['c'][1] * S).buffer(50, cap_style=3)
RES = [lm_shape(L) for L in LM_PX if L['t'] not in ('colony', 'park')]
PARKG = [lm_shape(L) for L in LM_PX if L['t'] == 'park']               # the park keeps streets out but is open ground
APRONG = [lm_shape(L) for L in LM_PX if L['t'] == 'apron']             # so does the apron
RES += PARKG
RUNWAYS = [LineString([(a[0] * S, a[1] * S), (b[0] * S, b[1] * S)]) for a, b in RUNWAYS_PX]
RES += [r.buffer(70, cap_style=2) for r in RUNWAYS]
city = LANDG.difference(SANDG.buffer(10))
LAGOONS = [Polygon(h) for g in (LANDG.geoms if hasattr(LANDG, 'geoms') else [LANDG]) for h in g.interiors if Polygon(h).area > 40 * 40]
RES += LAGOONS                                                            # water inside an island: no street runs over it
RESU = unary_union([g.buffer(FRONT, join_style=2) for g in RES])          # a street's centre line stays this far out

inner = city.buffer(-(RH + SW + COAST), join_style=2).difference(RESU).buffer(-240).buffer(240, join_style=2)   # thin necks and small coves drop out
RINGS = []
DRY = city.buffer(-(RH + SW + 8))                       # where a ring road's centre line may run
for g in (inner.geoms if isinstance(inner, MultiPolygon) else [inner]):
    if g.area < 900 * 900: continue
    for extra in (0, 30, 60, 90, 120, 160):             # trace again a little further in until the ring keeps off the water
        src = g.buffer(-extra, join_style=2) if extra else g
        if src.is_empty: break
        src = max(src.geoms, key=lambda q: q.area) if hasattr(src, 'geoms') else src
        o = octilinear(src, 120)
        if o is None or o.is_empty: continue
        if LineString(max(o.geoms, key=lambda q: q.area).exterior.coords if hasattr(o, 'geoms') else o.exterior.coords).difference(DRY).length < 20: break
    if o is None or o.is_empty: continue
    for q in (o.geoms if isinstance(o, MultiPolygon) else [o]):
        if q.area > 700 * 700: RINGS.append(q)
print('rings', len(RINGS), [round(r.area / 1e6, 1) for r in RINGS], 'lagoons', len(LAGOONS), file=sys.stderr)
WET = []
for R in RINGS:                                                           # a ring road and its sidewalks must stand on land
    wet = LineString(R.exterior.coords).buffer(RH + SW).difference(LANDG)
    if wet.area > 100: print('warning: ring road over water, area', round(wet.area), file=sys.stderr); WET += [q for q in (wet.geoms if hasattr(wet, 'geoms') else [wet]) if q.area > 50]

# ---------- streets: bridge avenues first, then cut every piece again and again until the blocks are small ----------
PROF = {  # block size (centre line to centre line) min, max; chance of a 45 degree avenue in a big piece
    'PALM HEIGHTS': (560, 900, 0.3), 'MERCADO': (480, 780, 0.3), 'DOCKSIDE': (640, 1100, 0.0), 'SKYPORT': (900, 1700, 0.0),
    'GRAVEL FLATS': (640, 1000, 0.0), 'HERON KEY': (440, 760, 0.0), 'PEARL KEY': (440, 720, 0.0), 'SEAVIEW': (480, 780, 0.3),
    'SUNSTRIP': (480, 780, 0.3), 'CORAL SHORE': (440, 720, 0.3), 'FAIRWAY ISLES': (700, 1300, 0.0)}
DEFPROF = (480, 800, 0.0)
MIN_GAP = 170                                            # two junctions on one street are at least this far apart (or the same point)
VERTS = []                                               # every junction and bend so far
for r in RINGS: VERTS += list(r.exterior.coords)[:-1]
SEGS = []                                                # street centre lines: (LineString, kind)
def ends_ok(cut):
    for ln in (cut.geoms if hasattr(cut, 'geoms') else [cut]):
        for e in (ln.coords[0], ln.coords[-1]):
            for v in VERTS:
                d = math.hypot(e[0] - v[0], e[1] - v[1])
                if 1 < d < MIN_GAP: return False
            pe = Point(e)                                  # joining a junction exactly: it must stay at four streets or fewer
            deg = sum(1 if min(Point(g.coords[0]).distance(pe), Point(g.coords[-1]).distance(pe)) < 1 else 2 for g, k in SEGS if g.distance(pe) < 1)
            if deg + 1 > 4: return False
    return True
def add_cut(cut, kind):
    for ln in (cut.geoms if hasattr(cut, 'geoms') else [cut]):
        if ln.length < 1: continue
        SEGS.append((ln, kind)); VERTS.extend([ln.coords[0], ln.coords[-1]])
def pieces_of(g): return [q for q in (g.geoms if hasattr(g, 'geoms') else [g]) if q.area > 1]
def cut_with(P, line, mn):
    cut = line.intersection(P)
    if cut.is_empty or cut.length < 1 or cut.intersects(RESU): return None
    parts = pieces_of(split(P, line))
    if len(parts) < 2 or any(q.buffer(-mn * 0.42).is_empty for q in parts): return None
    if not ends_ok(cut): return None
    return parts, cut
def candidates(lo, hi, axis):
    if hi <= lo: return []
    have = sorted({round(v[axis]) for v in VERTS if lo <= v[axis] <= hi}, key=lambda c: abs(c - (lo + hi) / 2))
    out = [c for c in have if rng.random() < 0.85]
    out += [round(rng.uniform(lo, hi) / 10) * 10 for _ in range(8)]
    return out
DIAG = {}                                                # districts that already have their one 45 degree avenue
def bsp(P, depth=0):
    c = P.representative_point(); dn = district(c.x, c.y); mn, mx, pdiag = PROF.get(dn, DEFPROF)
    if DIAG.get(dn): pdiag = 0
    x0, y0, x1, y1 = P.bounds; w, h = x1 - x0, y1 - y0
    if max(w, h) <= mx and (max(w, h) < mx * 0.8 or rng.random() < 0.6): return [P]
    tries = []
    if depth <= 2 and pdiag and min(w, h) > 2.4 * mn and rng.random() < pdiag:
        tries.append('d')
    tries += ['v', 'h'] if w >= h else ['h', 'v']
    for ax in tries:
        if ax == 'd':
            sgn = rng.choice([-1, 1]); cx, cy = x0 + w * rng.uniform(0.35, 0.65), y0 + h * rng.uniform(0.35, 0.65); L = w + h
            lines = [LineString([(cx - L, cy - sgn * L), (cx + L, cy + sgn * L)])]
        elif ax == 'v': lines = [LineString([(x, y0 - 10), (x, y1 + 10)]) for x in candidates(x0 + mn, x1 - mn, 0)]
        else: lines = [LineString([(x0 - 10, y), (x1 + 10, y)]) for y in candidates(y0 + mn, y1 - mn, 1)]
        for line in lines:
            r = cut_with(P, line, mn)
            if r and ax == 'd' and any(k == 'avenue' and g.crosses(r[1]) for g, k in SEGS): continue
            if r:
                if ax == 'd': DIAG[dn] = True
                add_cut(r[1], 'avenue' if ax == 'd' else 'street')
                return [leaf for q in r[0] for leaf in bsp(q, depth + 1)]
    return [P]
def extended(b, far=4000):                                # a bridge polyline (world units), its two end runs carried on
    pts = [(x * S, y * S) for x, y in b]
    def out(p, q): d = math.hypot(p[0] - q[0], p[1] - q[1]); return (p[0] + (p[0] - q[0]) / d * far, p[1] + (p[1] - q[1]) / d * far)
    return LineString([out(pts[0], pts[1])] + pts + [out(pts[-1], pts[-2])])
LEAVES = []
for R in RINGS:
    pcs = [R]
    runs = [(c[i], c[i + 1]) for b in BRIDGES_PX for c in [list(extended(b).coords)] for i in range(len(c) - 1)]
    for (ax, ay), (bx, by) in runs:                       # each run of a bridge that reaches an island carries on as an avenue right across it
        if not LineString([(ax, ay), (bx, by)]).intersects(R): continue
        dd = math.hypot(bx - ax, by - ay); dx, dy = (bx - ax) / dd, (by - ay) / dd
        line = LineString([(ax - dx * 30000, ay - dy * 30000), (bx + dx * 30000, by + dy * 30000)])
        nxt = []
        for P in pcs:
            cut = line.intersection(P)
            if cut.is_empty or cut.length < 1 or cut.intersects(RESU): nxt.append(P); continue
            add_cut(cut, 'avenue'); nxt += pieces_of(split(P, line))
        pcs = nxt
    for P in pcs: LEAVES += bsp(P)
ringsU = unary_union(RINGS)
for b in BRIDGES_PX:                                     # the bridges themselves: from one ring road to the next
    ln = extended(b).difference(ringsU)
    if hasattr(ln, 'geoms'): ln = linemerge(ln) if not ln.is_empty else ln
    for q in (ln.geoms if hasattr(ln, 'geoms') else [ln]):
        a, c = Point(q.coords[0]), Point(q.coords[-1])
        if ringsU.boundary.distance(a) < 1 and ringsU.boundary.distance(c) < 1 and q.length > 40: SEGS.append((q, 'bridge'))
for R in RINGS: SEGS.append((LineString(R.exterior.coords), 'ring'))
print('leaves', len(LEAVES), 'street segments', len(SEGS), file=sys.stderr)

# ---------- driveways: a short closed road from a street to the gate of a landmark that does not touch one ----------
GATE = {'n': (0, -1), 's': (0, 1), 'w': (-1, 0), 'e': (1, 0)}
allroads = unary_union([g for g, k in SEGS])
for L in LM_PX:
    if 'gate' not in L: continue
    g = lm_shape(L); x0, y0, x1, y1 = g.bounds; dx, dy = GATE[L['gate']]
    gx = (x0 + x1) / 2 + dx * (x1 - x0) / 2; gy = (y0 + y1) / 2 + dy * (y1 - y0) / 2
    ray = LineString([(gx + dx * 10, gy + dy * 10), (gx + dx * 1600, gy + dy * 1600)])
    hit = ray.intersection(allroads)
    if hit.is_empty: print('warning: no street in front of', L['t'], file=sys.stderr); continue
    pts = [hit] if hit.geom_type == 'Point' else [q if q.geom_type == 'Point' else Point(q.coords[0]) for q in getattr(hit, 'geoms', [hit])]
    h = min(pts, key=lambda q: q.distance(Point(gx, gy)))
    drive = LineString([(gx + dx * 10, gy + dy * 10), (h.x, h.y)])
    if drive.length > FRONT + 20 and not drive.crosses(LANDG.boundary): SEGS.append((drive, 'drive')); L['drive'] = True

# ---------- road graph: node every crossing, merge runs through bends, drop dead ends ----------
def build_graph(segs):
    net = shapely.union_all([g for g, k in segs], grid_size=1.0)        # on a 1-unit grid, an end that stops on another street joins it exactly
    kind_of = lambda ln: next((k for g, k in segs if g.buffer(1).contains(ln)), 'street')
    nid, nodes, edges = {}, [], []
    key = lambda p: (round(p[0] * 2) / 2, round(p[1] * 2) / 2)
    def node(p):
        k = key(p)
        if k not in nid: nid[k] = len(nodes); nodes.append([p[0], p[1]])
        return nid[k]
    for ln in (net.geoms if hasattr(net, 'geoms') else [net]):
        if ln.length < 1: continue
        a, b = node(ln.coords[0]), node(ln.coords[-1])
        if a != b: edges.append([a, b, [list(c) for c in ln.coords], kind_of(ln)])
    return nodes, edges
def degrees(nodes, edges):
    d = [0] * len(nodes)
    for a, b, _, _ in edges: d[a] += 1; d[b] += 1
    return d
def merge_chains(nodes, edges):                          # a node with exactly two streets is a bend, not a junction
    while True:
        d = degrees(nodes, edges); inc = {}
        for i, (a, b, _, _) in enumerate(edges): inc.setdefault(a, []).append(i); inc.setdefault(b, []).append(i)
        v = next((v for v, l in inc.items() if len(l) == 2 and l[0] != l[1] and edges[l[0]][3] == edges[l[1]][3]), None)
        if v is None: return edges
        i, j = inc[v]; e1, e2 = edges[i], edges[j]
        p1 = e1[2] if e1[1] == v else e1[2][::-1]; a = e1[0] if e1[1] == v else e1[1]
        p2 = e2[2] if e2[0] == v else e2[2][::-1]; b = e2[1] if e2[0] == v else e2[0]
        edges = [e for k, e in enumerate(edges) if k not in (i, j)] + [[a, b, p1 + p2[1:], e1[3]]]
nodes, edges = build_graph(SEGS)
while True:                                              # any street that still ends nowhere goes (driveways stay: they end at a gate)
    d = degrees(nodes, edges)
    keep = [e for e in edges if e[3] == 'drive' or (d[e[0]] > 1 and d[e[1]] > 1)]
    if len(keep) == len(edges): break
    edges = keep
edges = merge_chains(nodes, edges)
used = sorted({e[0] for e in edges} | {e[1] for e in edges}); remap = {o: i for i, o in enumerate(used)}
nodes = [nodes[o] for o in used]; edges = [[remap[a], remap[b], p, k] for a, b, p, k in edges]
d = degrees(nodes, edges)
print('graph nodes', len(nodes), 'edges', len(edges), 'dead ends', sum(1 for x in d if x == 1), 'degrees', {k: d.count(k) for k in set(d)}, file=sys.stderr)
DEAD = [nodes[i] for i, x in enumerate(d) if x == 1 and not any(e[3] == 'drive' and i in (e[0], e[1]) for e in edges)]

# ---------- lakes: Bayfront Park's lake, ponds in the bigger parks ----------
def blob(cx, cy, rx, ry, rot, lobes=()):
    g = affinity.rotate(affinity.scale(Point(cx, cy).buffer(1, 24), rx, ry), rot, origin=(cx, cy))
    for ox, oy, r2x, r2y in lobes: g = g.union(affinity.rotate(affinity.scale(Point(cx + ox, cy + oy).buffer(1, 24), r2x, r2y), rot, origin=(cx, cy)))
    return g
LAKES = []
for L in LM_PX:
    if L['t'] != 'park': continue
    x0, y0, x1, y1 = [v * S for v in L['box']]; cx, cy, w, h = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0
    L['lake'] = [round(cx - w * 0.06), round(cy - h * 0.04), round(w * 0.26), round(h * 0.22)]
    LAKES.append(blob(L['lake'][0], L['lake'][1], L['lake'][2], L['lake'][3], 0, [(w * 0.2, h * 0.1, w * 0.13, h * 0.12)]))

# ---------- blocks: rows of buildings along every street side, then the middle of the block ----------
CENTRE = unary_union([LineString(e[2]) for e in edges])
ROADBUF = CENTRE.buffer(FRONT, cap_style=2, join_style=2, mitre_limit=2.5)
WALKS = CENTRE.buffer(RH + SW, cap_style=2, join_style=2, mitre_limit=2.5)
DOCKR = next(r for nm, r in DIST if nm == 'DOCKSIDE')
DOCKBOX = box(DOCKR[0] * S, DOCKR[1] * S, DOCKR[2] * S, DOCKR[3] * S)
QUAY = LANDG.boundary.intersection(DOCKBOX).buffer(190).intersection(LANDG).difference(WALKS)   # the dock front stays open for the cranes
props = []
for L_ in (LANDG.boundary.geoms if hasattr(LANDG.boundary, 'geoms') else [LANDG.boundary]):
    for t in np.arange(0, L_.length, 360):
        p = L_.interpolate(t)
        if not DOCKBOX.contains(p): continue
        best = max(range(16), key=lambda k: sum(not LANDG.contains(Point(p.x + math.cos(k * math.pi / 8) * r_, p.y + math.sin(k * math.pi / 8) * r_)) for r_ in (60, 120, 180)))
        dx, dy = math.cos(best * math.pi / 8), math.sin(best * math.pi / 8); cx, cy = p.x - dx * 80, p.y - dy * 80
        foot = affinity.rotate(box(cx - 32, cy - 40, cx + 26, cy + 40), math.degrees(math.atan2(dy, dx)), origin=(cx, cy))
        if QUAY.contains(foot) and all(math.hypot(cx - q['x'], cy - q['y']) > 300 for q in props):
            props.append({'t': 'crane', 'x': round(cx), 'y': round(cy), 'a': round(math.degrees(math.atan2(dy, dx)), 1)})
BUILD = city.buffer(-24).difference(ROADBUF).difference(QUAY).difference(unary_union([g.buffer(30) for g in RES])).difference(unary_union(LAKES).buffer(60) if LAKES else Polygon())
BLOCKS = [g for g in (BUILD.geoms if hasattr(BUILD, 'geoms') else [BUILD]) if g.area > 70 * 70]
FILLP = {
    'PALM HEIGHTS': dict(w=(90, 160), d=(90, 170), alley=0.15, lot=0.05, park=0.03, plaza=0.05, gas=0.03, tower=0.45, bpark=0.05),
    'MERCADO':      dict(w=(50, 95), d=(60, 120), alley=0.22, lot=0.05, park=0.05, plaza=0.04, gas=0.04, tower=0.0, bpark=0.06),
    'DOCKSIDE':     dict(w=(120, 220), d=(100, 180), alley=0.3, lot=0.08, park=0.0, plaza=0.0, gas=0.05, tower=0.0, bpark=0.0, yard=1),
    'SKYPORT':      dict(w=(140, 240), d=(110, 200), alley=0.45, lot=0.12, park=0.0, plaza=0.0, gas=0.05, tower=0.0, bpark=0.0, apron=1),
    'GRAVEL FLATS': dict(w=(120, 220), d=(100, 180), alley=0.3, lot=0.1, park=0.03, plaza=0.0, gas=0.05, tower=0.0, bpark=0.04, yard=0.5),
    'SEAVIEW':      dict(w=(80, 150), d=(80, 150), alley=0.15, lot=0.06, park=0.05, plaza=0.03, gas=0.03, tower=0.25, bpark=0.06),
    'SUNSTRIP':     dict(w=(80, 150), d=(80, 150), alley=0.15, lot=0.06, park=0.04, plaza=0.05, gas=0.03, tower=0.25, bpark=0.05),
    'CORAL SHORE':  dict(w=(60, 120), d=(70, 130), alley=0.12, lot=0.05, park=0.04, plaza=0.05, gas=0.03, tower=0.05, bpark=0.05),
    'PEARL KEY':    dict(w=(80, 130), d=(80, 120), alley=0.6, lot=0.0, park=0.1, plaza=0.0, gas=0.0, tower=0.0, bpark=0.1),
    'HERON KEY':    dict(w=(70, 120), d=(70, 120), alley=0.4, lot=0.05, park=0.05, plaza=0.0, gas=0.0, tower=0.0, bpark=0.0)}
DEFP = dict(w=(60, 110), d=(60, 110), alley=0.25, lot=0.04, park=0.05, plaza=0.02, gas=0.02, tower=0.0, bpark=0.05)
ALLEY = 54                                               # a back alley between the backs of two rows (4.5 m)
bl, lots, grass, gas_at, alleys, yards = [], [], [], [], [], []   # alleys: [cx, cy, length, width, deg]; yards: (polygon, kind)
BACK = 16                                                # bld[6] flag: the back of this building is on an alley or a yard
def rect(c, u, n, t, w, d):
    p0 = (c[0] + u[0] * t, c[1] + u[1] * t); p1 = (p0[0] + u[0] * w, p0[1] + u[1] * w)
    return Polygon([p0, p1, (p1[0] + n[0] * d, p1[1] + n[1] * d), (p0[0] + n[0] * d, p0[1] + n[1] * d)])
def deg_of(n): return round(math.degrees(math.atan2(n[0], -n[1])), 1)       # the building's front (local +z) faces away from n
def upright(w, d, deg):                                  # towers are drawn without north faces: turn them to 0 or 45 degrees
    k = round(deg / 45) % 8
    return (d, w, 45.0 if k % 2 else 0.0) if (k // 2) % 2 else (w, d, 45.0 if k % 2 else 0.0)
def put_building(poly, n, w, d, prof, bid, back=0, front=True):
    c = poly.centroid; deg = deg_of(n)
    if front and prof['tower'] and w >= 100 and d >= 100 and rng.random() < prof['tower']:
        ww, dd, dg = upright(w, d, deg); bl.append([round(c.x), round(c.y), round(ww), round(dd), dg, bid, 0, 0])
    else: bl.append([round(c.x), round(c.y), round(w), round(d), deg, bid, back, 1])
def street_at(pt): return abs(CENTRE.distance(Point(pt)) - FRONT) < 16
def add_alley(c0, u, n, a0, a1, b0, b1):                 # a strip of the block left open behind the buildings
    if a1 - a0 < 30 or b1 - b0 < 20: return
    q = rect((c0[0] + n[0] * b0, c0[1] + n[1] * b0), u, n, a0, a1 - a0, b1 - b0); cc = q.centroid
    alleys.append([round(cc.x), round(cc.y), round(a1 - a0), round(b1 - b0), round(math.degrees(math.atan2(u[1], u[0])), 1)])
    return q
def alley(placed, Pin, c0, u, n, a0, a1, b0, b1):          # an alley, shortened at its ends until it stays inside the block
    while a1 - a0 >= 30:
        q = rect((c0[0] + n[0] * b0, c0[1] + n[1] * b0), u, n, a0, a1 - a0, b1 - b0)
        if Pin.contains(q): break
        end0 = rect((c0[0] + n[0] * b0, c0[1] + n[1] * b0), u, n, a0, 10, b1 - b0)
        if not Pin.contains(end0): a0 += 10
        else: a1 -= 10
    else: return
    q = add_alley(c0, u, n, a0, a1, b0, b1)
    if q is not None: placed.append(q)
def special(prof, mid, D):                               # a gas station, parking lot, plaza or pocket park in the row instead of a building
    r = rng.random(); acc = 0
    for k in ('gas', 'lot', 'plaza', 'park'):
        acc += prof[k]
        if r < acc:
            if k == 'gas' and (D < 128 or any(math.hypot(mid[0] - g[0], mid[1] - g[1]) < 1800 for g in gas_at)): return 'b'
            if (k == 'lot' and D < 100) or (k in ('plaza', 'park') and D < 90): return 'b'
            return k
    return 'b'
def place(kind, q, n, w, d, prof, bid, back):
    cc = q.centroid
    if kind == 'b': put_building(q, n, w, d, prof, bid, back)
    elif kind == 'lot': lots.append([round(cc.x), round(cc.y), round(w), round(d), deg_of(n), 2 if d >= 190 else 1])
    elif kind == 'gas': props.append({'t': 'gas', 'x': round(cc.x), 'y': round(cc.y), 'w': round(w), 'h': round(d), 'a': deg_of(n)}); gas_at.append((cc.x, cc.y))
    elif kind == 'plaza': props.append({'t': 'plaza', 'x': round(cc.x), 'y': round(cc.y), 'w': round(w), 'h': round(d), 'a': deg_of(n)})
    else:
        grass.append(q.buffer(-4))
        if w > 150 and d > 120 and rng.random() < 0.5: props.append({'t': 'court', 'x': round(cc.x), 'y': round(cc.y), 'a': deg_of(n)})
def row(Pin, a, u, n, L, D, prof, bid, placed, back, corner_a=False, corner_b=False):
    """lots along one street side: from point a along u for L, reaching D in along n (the same depth everywhere, so the backs line up);
       corner_a / corner_b: the first / last lot is a corner building that faces the side street"""
    w0, w1 = prof['w']; cuts = []
    ca = min(rng.uniform(max(w0, D * 0.6), max(w1, D * 0.9)), L / 2) if corner_a else 0
    cb = min(rng.uniform(max(w0, D * 0.6), max(w1, D * 0.9)), L / 2) if corner_b else 0
    if ca: cuts.append((0, ca, 'corner_a'))
    t = ca
    while t < L - cb - 1:
        mid = (a[0] + u[0] * t, a[1] + u[1] * t); kind = special(prof, mid, D)
        w = rng.uniform(*SIZES[kind][0]) if kind != 'b' else rng.uniform(w0, w1)
        if L - cb - t - w < w0 * 0.6: w = L - cb - t                     # the last lot takes what is left
        if w < 30: break
        cuts.append((t, t + w, kind)); t += w
        if kind == 'b' and rng.random() < prof['alley'] * 0.5 and L - cb - t > w0 + 30: t += rng.uniform(18, 26)   # a passage through to the alley
    if cb: cuts.append((L - cb, L, 'corner_b'))
    for t0, t1, kind in cuts:
        for fd in (1, 0.85, 0.7):
            q = rect(a, u, n, t0, t1 - t0, D * fd)
            if Pin.contains(q) and not any(q.intersection(o).area > 2 for o in placed): break
        else: continue
        placed.append(q); dd = D * fd
        if kind == 'corner_a': put_building(q, u, dd, t1 - t0, prof, bid, back)          # faces the side street at the start
        elif kind == 'corner_b': put_building(q, (-u[0], -u[1]), dd, t1 - t0, prof, bid, back)
        else: place(kind if kind == 'b' or dd >= SIZES[kind][1][0] * 0.8 else 'b', q, n, t1 - t0, dd, prof, bid, back)
def interior(c0, u, n, L, b0, b1, prof, dn, bid, placed, Pin):   # the middle of a deep block, between two alleys; nothing leaves the block
    Wm = b1 - b0; base = (c0[0] + n[0] * b0, c0[1] + n[1] * b0)
    clip = lambda q: q.intersection(Pin.buffer(-2))
    if prof.get('yard'):                                     # container yard at the docks
        for a in np.arange(10, L - 200, 215):
            for b in np.arange(8, Wm - 76, 90):
                q = rect(base, u, n, a, 200, 76); q = affinity.translate(q, n[0] * b, n[1] * b); cc = q.centroid
                if Pin.contains(q): props.append({'t': 'containers', 'x': round(cc.x), 'y': round(cc.y), 'a': round(math.degrees(math.atan2(u[1], u[0])), 1)})
        q = clip(rect(base, u, n, 0, L, Wm)); yards.append((q, 'y')); placed.append(q); return
    r = rng.random()
    if Wm >= 112 and r < 0.55:                               # parking lots, entered from the alleys at their ends
        t = 6
        while t < L - 110:
            ln = min(L - 6 - t, rng.uniform(220, 420))
            if L - 6 - t - ln < 110: ln = L - 6 - t
            q = rect(base, u, n, t, ln, Wm); cc = q.centroid
            if Pin.contains(q): lots.append([round(cc.x), round(cc.y), round(ln), round(Wm), deg_of(n), 2 if Wm >= 185 else 1]); placed.append(q)
            t += ln + 14
        return
    if r < 0.8 or Wm < 60: q = clip(rect(base, u, n, 0, L, Wm)); grass.append(q.buffer(-4)); placed.append(q); return   # a garden in the middle of the block
    dep = min(Wm, rng.uniform(60, 95)); t = 8                # garages and workshops facing one alley, a service yard behind
    while t < L - 50:
        w = min(L - 8 - t, rng.uniform(46, 90)); q = rect(base, u, n, t, w, dep)
        if Pin.contains(q): placed.append(q); bl.append([round(q.centroid.x), round(q.centroid.y), round(w), round(dep), deg_of(n), bid, BACK, 1])
        t += w + rng.uniform(0, 12)
    if Wm - dep > 20: q = clip(rect((base[0] + n[0] * dep, base[1] + n[1] * dep), u, n, 0, L, Wm - dep)); yards.append((q, 'y')); placed.append(q)
def rect_block(B, bid, prof, dn):
    """a block that is (nearly) a rectangle: two rows of buildings back to back with an alley between them, corners facing the side streets"""
    mrr = orient(B.minimum_rotated_rectangle, 1.0)
    if B.area < 0.9 * mrr.area: return None
    c0, c1, c2, c3 = [tuple(p) for p in list(mrr.exterior.coords)[:4]]
    L, S = math.hypot(c1[0] - c0[0], c1[1] - c0[1]), math.hypot(c3[0] - c0[0], c3[1] - c0[1])
    u = ((c1[0] - c0[0]) / L, (c1[1] - c0[1]) / L); n = (-u[1], u[0])
    ang = math.atan2(u[1], u[0])
    if abs(ang - round(ang / (math.pi / 4)) * math.pi / 4) > 0.03: return None
    P_ = lambda a, b: (c0[0] + u[0] * a + n[0] * b, c0[1] + u[1] * a + n[1] * b)
    st = {'A': street_at(P_(L / 2, 0)), 'B': street_at(P_(L / 2, S)), 'C': street_at(P_(0, S / 2)), 'D': street_at(P_(L, S / 2))}
    if (S * (st['C'] + st['D']) > L * (st['A'] + st['B'])):  # the streets run along the short sides: turn the frame
        c0, u, n, L, S = P_(L, 0), n, (-u[0], -u[1]), S, L
        st = {'A': st['D'], 'B': st['C'], 'C': st['A'], 'D': st['B']}
        P_ = lambda a, b: (c0[0] + u[0] * a + n[0] * b, c0[1] + u[1] * a + n[1] * b)
    if not st['A'] and st['B']:                              # only the far side is a street: turn half round
        c0, u, n = P_(L, S), (-u[0], -u[1]), (-n[0], -n[1]); st = {'A': True, 'B': False, 'C': st['D'], 'D': st['C']}
        P_ = lambda a, b: (c0[0] + u[0] * a + n[0] * b, c0[1] + u[1] * a + n[1] * b)
    if not st['A']: return None
    dmin, dmax = prof['d']; Pin = B.buffer(2); placed = []; nb = (-n[0], -n[1])
    if st['B'] and S >= 2 * dmin + ALLEY:                    # two rows, backs on an alley
        D = min(dmax * rng.uniform(0.9, 1.0), (S - ALLEY) / 2)
        row(Pin, P_(0, 0), u, n, L, D, prof, bid, placed, BACK, st['C'], st['D'])
        row(Pin, P_(L, S), (-u[0], -u[1]), nb, L, D, prof, bid, placed, BACK, st['D'], st['C'])
        M = S - 2 * D
        if M <= ALLEY + 110: alley(placed, Pin, c0, u, n, 0, L, D, S - D)
        else:
            alley(placed, Pin, c0, u, n, 0, L, D, D + ALLEY); alley(placed, Pin, c0, u, n, 0, L, S - D - ALLEY, S - D)
            interior(c0, u, n, L, D + ALLEY, S - D - ALLEY, prof, dn, bid, placed, Pin)
    elif st['B'] and S >= 2 * dmin:                          # two rows back to back
        row(Pin, P_(0, 0), u, n, L, S / 2, prof, bid, placed, 0, st['C'], st['D'])
        row(Pin, P_(L, S), (-u[0], -u[1]), nb, L, S / 2, prof, bid, placed, 0, st['D'], st['C'])
    elif st['B'] or S < dmin + ALLEY:                        # one row right through the block
        row(Pin, P_(0, 0), u, n, L, S, prof, bid, placed, 0, st['C'], st['D'])
    else:                                                    # one street side: a row, an alley behind it, then the back of the block
        D = min(dmax, S - ALLEY); row(Pin, P_(0, 0), u, n, L, D, prof, bid, placed, BACK, st['C'], st['D'])
        if S - D <= ALLEY + 110: alley(placed, Pin, c0, u, n, 0, L, D, S)
        else: alley(placed, Pin, c0, u, n, 0, L, D, D + ALLEY); interior(c0, u, n, L, D + ALLEY, S, prof, dn, bid, placed, Pin)
    return placed
def thickness(B):                                         # twice the radius of the biggest circle that fits
    lo, hi = 0.0, 1200.0
    while hi - lo > 6:
        m = (lo + hi) / 2
        if B.buffer(-m).is_empty: hi = m
        else: lo = m
    return 2 * lo
def free_block(B, bid, prof, dn):
    """any other block: rows along every street side, all as deep as the block allows with an alley behind, the rest becomes yards and lots"""
    P = orient(B.simplify(1.5), 1.0); placed = []; Pin = P.buffer(2)
    dmin, dmax = prof['d']; th = thickness(P)
    D, back = (min(dmax, (th - ALLEY) / 2), BACK) if th >= 2 * dmin + ALLEY else (max(40, min(dmax, th * 0.92)), 0)
    sides = []
    for a, b in zip(list(P.exterior.coords)[:-1], list(P.exterior.coords)[1:]):
        ln = math.hypot(b[0] - a[0], b[1] - a[1])
        if ln >= 40 and street_at(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)): sides.append((ln, a, b))
    for ln, a, b in sorted(sides, reverse=True):          # the longest sides first, so their rows run through the corners
        u = ((b[0] - a[0]) / ln, (b[1] - a[1]) / ln); row(Pin, a, u, (-u[1], u[0]), ln, D, prof, bid, placed, back)
    return placed, P
def axis_of(g):                                           # the block's own direction, snapped to 45 degrees
    mr = g.minimum_rotated_rectangle; cs = list(mr.exterior.coords)
    a1 = math.hypot(cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]); a2 = math.hypot(cs[2][0] - cs[1][0], cs[2][1] - cs[1][1])
    e = (cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]) if a1 >= a2 else (cs[2][0] - cs[1][0], cs[2][1] - cs[1][1])
    k = round(math.atan2(e[1], e[0]) / (math.pi / 4)); return (math.cos(k * math.pi / 4), math.sin(k * math.pi / 4))
def pack(g, prof, bid):
    """a big leftover piece: tiled with parking lots, back buildings and gardens on a grid lined up with the block; the gaps stay yards"""
    u = axis_of(g); n = (-u[1], u[0]); cw, ch = rng.uniform(150, 210), rng.uniform(120, 150)
    pts = list(g.exterior.coords); A = [x * u[0] + y * u[1] for x, y in pts]; Bv = [x * n[0] + y * n[1] for x, y in pts]
    gi = g.buffer(-6, join_style=2); used = []
    if prof.get('apron'):                                 # at the airfield: airliners first
        gp = g.buffer(-135)
        for x in np.arange(g.bounds[0] + 135, g.bounds[2] - 135, 300):
            for y in np.arange(g.bounds[1] + 135, g.bounds[3] - 135, 300):
                if gp.contains(Point(x, y)) and all(not q.intersects(Point(x, y).buffer(135)) for q in used):
                    props.append({'t': 'plane', 'x': round(x), 'y': round(y), 'a': round(math.degrees(math.atan2(u[1], u[0])), 1)}); used.append(Point(x, y).buffer(135))
    for a in np.arange(min(A) + 6, max(A) - cw, cw + 16):
        for b in np.arange(min(Bv) + 6, max(Bv) - ch, ch + 16):
            corner = (u[0] * a + n[0] * b, u[1] * a + n[1] * b); q = rect(corner, u, n, 0, cw, ch)
            if not gi.contains(q): continue
            used.append(q); cc = q.centroid; r = rng.random()
            if prof.get('yard') and r < 0.6: props.append({'t': 'containers', 'x': round(cc.x), 'y': round(cc.y), 'a': round(math.degrees(math.atan2(u[1], u[0])), 1)})
            elif r < 0.38: lots.append([round(cc.x), round(cc.y), round(cw), round(ch), deg_of(n), 1])
            elif r < 0.78: bl.append([round(cc.x), round(cc.y), round(cw - 12), round(ch - 12), deg_of(n), bid, BACK, 1])
            else: grass.append(q.buffer(-4))
    return g.difference(unary_union([q.buffer(2, join_style=2) for q in used])) if used else g
def fill_rest(P, placed, prof, dn, bid):                    # whatever is left of a block: lots, buildings, gardens, and yards in between
    rest = P.difference(unary_union([o.buffer(1, join_style=2) for o in placed])) if placed else P
    for g in (rest.geoms if hasattr(rest, 'geoms') else [rest]):
        if g.area < 25 * 25: continue
        if g.area > 170 * 140 and thickness(g) >= 135:
            for q in (lambda r_: r_.geoms if hasattr(r_, 'geoms') else [r_])(pack(g, prof, bid)):
                if q.area >= 25 * 25: yards.append((q, 'y'))
            continue
        gi = g.buffer(-8, join_style=2)
        if not gi.is_empty and not hasattr(gi, 'geoms') and gi.area > 120 * 100 and not prof.get('yard'):
            mr = gi.minimum_rotated_rectangle; cs = list(mr.exterior.coords)
            a1 = math.hypot(cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]); a2 = math.hypot(cs[2][0] - cs[1][0], cs[2][1] - cs[1][1])
            e = (cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]) if a1 >= a2 else (cs[2][0] - cs[1][0], cs[2][1] - cs[1][1])
            ang = math.atan2(e[1], e[0])
            if gi.area > 0.85 * mr.area and abs(ang - round(ang / (math.pi / 4)) * math.pi / 4) < 0.03 and min(a1, a2) >= 100:
                m = mr.centroid; uu = (math.cos(ang), math.sin(ang)); nn = (-uu[1], uu[0])
                lots.append([round(m.x), round(m.y), round(max(a1, a2)), round(min(a1, a2)), deg_of(nn), 2 if min(a1, a2) >= 185 else 1])
                g = g.difference(mr.buffer(2, join_style=2))
                if g.is_empty: continue
        yards.append((g, 'y'))
def fill_block(B, bid):
    c = B.representative_point(); dn = district(c.x, c.y); prof = FILLP.get(dn, DEFP)
    if dn == 'FAIRWAY ISLES' or (B.area > 300 * 300 and rng.random() < prof['bpark']):   # the whole block is a park (the golf links are one big park)
        grass.append(B.buffer(-6)); return
    if not any(street_at(((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) for a, b in zip(list(B.exterior.coords)[:-1], list(B.exterior.coords)[1:]) if math.hypot(b[0] - a[0], b[1] - a[1]) > 40):
        if prof.get('yard'): yards.append((B, 'y'))           # no street along it: a waterfront park, or a yard at the docks
        else: grass.append(B.buffer(-6))
        return
    placed = rect_block(B, bid, prof, dn)
    if placed is not None: fill_rest(orient(B, 1.0), placed, prof, dn, bid)   # what the rows and the alleys did not use still gets filled
    else: placed, P = free_block(B, bid, prof, dn); fill_rest(P, placed, prof, dn, bid)
SIZES = {'gas': ((175, 210), (128, 150)), 'lot': ((150, 220), (100, 145)), 'plaza': ((120, 170), (90, 140)), 'park': ((120, 200), (90, 150)), 'b': ((50, 90), (60, 100))}
for i, B in enumerate(BLOCKS): fill_block(B, i)
footprint = lambda b: affinity.rotate(box(b[0] - b[2] / 2, b[1] - b[3] / 2, b[0] + b[2] / 2, b[1] + b[3] / 2), b[4], origin=(b[0], b[1]))
n0 = len(bl) + len(lots)                                 # last check: nothing stands on a street or a sidewalk
bl = [b for b in bl if not footprint(b).intersects(WALKS)]; lots = [l for l in lots if not footprint(l).intersects(WALKS)]
if len(bl) + len(lots) < n0: print('warning: dropped', n0 - len(bl) - len(lots), 'buildings and lots on a street', file=sys.stderr)

# ---------- every bit of ground that is left: promenades on the water, forecourts round the landmarks, the apron, the quays ----------
BLOCKU = unary_union(BLOCKS)
LEFT = city.buffer(-2).difference(CENTRE.buffer(FRONT + 2, cap_style=2, join_style=2, mitre_limit=2.5)).difference(BLOCKU.buffer(2)).difference(unary_union([g for g in RES if g not in PARKG and g not in APRONG])).difference(unary_union(PARKG)).difference(unary_union(LAKES).buffer(4) if LAKES else Polygon()).difference(QUAY)
SKYR = next(r for nm, r in DIST if nm == 'SKYPORT'); SKYBOX = box(SKYR[0] * S, SKYR[1] * S, SKYR[2] * S, SKYR[3] * S)
for g in (LEFT.geoms if hasattr(LEFT, 'geoms') else [LEFT]):
    if g.area < 30 * 30: continue
    k = 'ap' if SKYBOX.contains(g.representative_point()) else 'p'; yards.append((g, k))
    if k == 'ap':                                         # airliners parked on the apron
        gi = g.buffer(-120); here = []
        for x in np.arange(g.bounds[0], g.bounds[2], 40):
            for y in np.arange(g.bounds[1], g.bounds[3], 40):
                if gi.contains(Point(x, y)) and all(math.hypot(x - a, y - b) > 300 for a, b in here):
                    here.append((x, y)); props.append({'t': 'plane', 'x': round(x), 'y': round(y), 'a': 0.0})
for g in (QUAY.geoms if hasattr(QUAY, 'geoms') else [QUAY]):
    if g.area > 30 * 30: yards.append((g, 'q'))
print('alleys', len(alleys), 'yards', {k: sum(1 for _, kk in yards if kk == k) for k in ('y', 'p', 'ap', 'q')}, file=sys.stderr)
print('blocks', len(BLOCKS), 'buildings', len(bl), 'towers', sum(1 for b in bl if not b[7]), 'lots', len(lots), 'gas', len(gas_at),
      'plazas', sum(1 for p in props if p['t'] == 'plaza'), 'courts', sum(1 for p in props if p['t'] == 'court'), 'parks', len(grass), file=sys.stderr)

# ---------- docks and airport: cranes on the quays, planes on the apron, the runways ----------
for r in RUNWAYS:
    (ax, ay), (bx, by) = r.coords; props.append({'t': 'runway', 'x': round((ax + bx) / 2), 'y': round((ay + by) / 2), 'w': round(r.length + 120), 'h': 120, 'a': round(math.degrees(math.atan2(by - ay, bx - ax)), 1)})
TERM = next(L for L in LM_PX if L['t'] == 'terminal'); tx0, ty0, tx1, ty1 = [v * S for v in TERM['box']]
BLDU = unary_union([affinity.rotate(box(b[0] - b[2] / 2, b[1] - b[3] / 2, b[0] + b[2] / 2, b[1] + b[3] / 2), b[4], origin=(b[0], b[1])) for b in bl + [l[:5] for l in lots] + [[q['x'], q['y'], q.get('w', 200), q.get('h', 80), q.get('a', 0)] for q in props if q['t'] in ('gas', 'plaza', 'containers')] if abs(b[0] - (tx0 + tx1) / 2) < 2500 and abs(b[1] - (ty0 + ty1) / 2) < 2500])
taken = [Point(q['x'], q['y']).buffer(130) for q in props if q['t'] == 'plane']
for dx in np.arange(-1600, 1601, 200):                    # airliners parked on open ground round the terminal
    for dy in np.arange(-1600, 1601, 200):
        cx, cy = (tx0 + tx1) / 2 + dx, (ty0 + ty1) / 2 + dy; foot = box(cx - 125, cy - 105, cx + 125, cy + 105)
        if len(taken) >= 5: break
        if LANDG.buffer(-10).contains(foot) and not foot.intersects(WALKS) and not foot.intersects(BLDU) and not any(foot.intersects(t) for t in taken) and not foot.intersects(unary_union(RES)):
            props.append({'t': 'plane', 'x': round(cx), 'y': round(cy), 'a': 0.0}); taken.append(foot.buffer(30))
print('props', {t: sum(1 for p in props if p['t'] == t) for t in sorted({p['t'] for p in props})}, file=sys.stderr)

# ---------- output ----------
def to_rings(g, min_area=60 * 60):
    out = []
    for q in (g.geoms if hasattr(g, 'geoms') else [g]):
        if q.geom_type != 'Polygon' or q.area < min_area: continue
        out.append({'o': [[round(x), round(y)] for x, y in list(q.exterior.coords)[:-1]], 'h': [[[round(x), round(y)] for x, y in list(h.coords)[:-1]] for h in q.interiors if Polygon(h).area > 400]})
    return out
WATERNEW = unary_union(LAKES) if LAKES else Polygon()
DECKS = CENTRE.buffer(RH + SW + 4, cap_style=2, join_style=2, mitre_limit=2.5)   # every street stands on land: bridge decks too
land_out = to_rings(LANDG.union(DECKS).difference(WATERNEW), 25 * S * S)
park_g = unary_union([g for g in grass if not g.is_empty] + [P_.difference(WATERNEW.buffer(12)) for P_ in PARKG])
grass_out = to_rings(park_g.simplify(2), 40 * 40)
LM = []
for L in LM_PX:
    o = {'t': L['t']}
    if 'box' in L: x0, y0, x1, y1 = L['box']; o.update(x=round((x0 + x1) / 2 * S), y=round((y0 + y1) / 2 * S), w=(x1 - x0) * S, h=(y1 - y0) * S)
    else: o.update(x=round(L['c'][0] * S), y=round(L['c'][1] * S))
    if 'r' in L: o['r'] = L['r'] * S
    if 'house' in L: x0, y0, x1, y1 = L['house']; o['house'] = [round((x0 + x1) / 2 * S), round((y0 + y1) / 2 * S), (x1 - x0) * S, (y1 - y0) * S]
    for k in ('a', 'lake', 'gate', 'drive'):
        if k in L: o[k] = L[k]
    LM.append(o)
out_edges = [dict({'a': a, 'b': b, 'p': [[round(x), round(y)] for x, y in p]}, **({'nt': 1} if k == 'drive' else {})) for a, b, p, k in edges]
data = {'S': S, 'W': W * S, 'H': H * S, 'roadW': ROAD_W, 'sw': SW, 'nodes': [[round(x), round(y)] for x, y in nodes], 'edges': out_edges,
        'land': land_out, 'grass': grass_out, 'sand': to_rings(SANDG, 14 * S * S), 'bld': bl, 'lm': LM, 'props': props, 'lots': lots, 'alleys': alleys,
        'yards': [dict(r, k=k) for g, k in yards for r in to_rings(g.simplify(1.5), 20 * 20)],
        'districts': [[nm, [r[0] * S, r[1] * S, r[2] * S, r[3] * S]] for nm, r in DIST], 'start': [560 * S, 652 * S]}
with open(sys.argv[2], 'w') as f:
    f.write("'use strict';\n/* Bay city map, generated by tools/build_city.py: a made-up city on the outline of a reference map image.\n"
            "   Units are world units. land/grass/sand: polygons {o: outer ring, h: holes}. nodes/edges: road graph, edge.p is the centre line;\n"
            "   nt = closed to traffic (a driveway to a landmark gate). bld: buildings [cx, cy, w, d, angle deg, block id, 16 = back on an alley or yard, 1 = merged low-rise / 0 = tower];\n"
            "   the front of a building (local +z) faces its street. lm: landmarks; props: cranes, containers, planes, runways, gas stations, plazas, courts;\n"
            "   lots: parking lots [cx, cy, w, d, angle deg, stall rows]; alleys: back alleys [cx, cy, length, width, angle deg];\n"
            "   yards: open ground {o, h, k}: y = service yard, p = promenade or forecourt, ap = airport apron, q = quay; sw: sidewalk width. */\nconst MAP = ")
    json.dump(data, f, separators=(',', ':'), default=lambda o: o.item()); f.write(';\n')
print('wrote', sys.argv[2], 'nodes', len(nodes), 'edges', len(out_edges), 'buildings', len(bl), file=sys.stderr)

# ---------- preview ----------
def preview(path, roads=(), blds=(), extra=()):
    k = 0.1; img = np.zeros((int(H * S * k), int(W * S * k), 3), np.uint8); img[:] = (150, 90, 40)
    P = lambda pts: np.round(np.array(pts) * k * 8).astype(np.int32)
    for p in land_p: cv2.fillPoly(img, [P(p['o'])], (110, 110, 110), shift=3)
    for p in sand_p: cv2.fillPoly(img, [P(p['o'])], (150, 210, 230), shift=3)
    for r in RINGS: cv2.polylines(img, [P(list(r.exterior.coords))], True, (40, 40, 40), 3, shift=3)
    for ln in roads: cv2.polylines(img, [P(ln)], False, (30, 30, 30), max(1, int(ROAD_W * k)), shift=3)
    for c in blds: cv2.fillPoly(img, [P(c)], (235, 235, 235), shift=3)
    for c, col in extra: cv2.polylines(img, [P(c)], True, col, 2, shift=3)
    cv2.imwrite(path, img)
if len(sys.argv) > 3:
    def foot(b): return list(affinity.rotate(box(b[0] - b[2] / 2, b[1] - b[3] / 2, b[0] + b[2] / 2, b[1] + b[3] / 2), b[4], origin=(b[0], b[1])).exterior.coords)
    preview(sys.argv[3], roads=[e[2] for e in edges], blds=[foot(b) for b in bl], extra=[(list(g.exterior.coords), (0, 0, 255)) for g in RES] + [(p_['o'], (60, 200, 60)) for p_ in grass_out] + [(foot([l[0], l[1], l[2], l[3], l[4]]), (0, 200, 255)) for l in lots])
