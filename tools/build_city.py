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
SIZES = {'gas': ((175, 210), (128, 150)), 'lot': ((150, 220), (112, 145)), 'plaza': ((120, 170), (100, 140)), 'park': ((120, 200), (100, 150))}
bl, lots, grass, gas_at = [], [], [], []
def rect(c, u, n, t, w, d):
    p0 = (c[0] + u[0] * t, c[1] + u[1] * t); p1 = (p0[0] + u[0] * w, p0[1] + u[1] * w)
    return Polygon([p0, p1, (p1[0] + n[0] * d, p1[1] + n[1] * d), (p0[0] + n[0] * d, p0[1] + n[1] * d)])
def deg_of(n): return round(math.degrees(math.atan2(n[0], -n[1])), 1)       # the building's front (local +z) faces away from n
def upright(w, d, deg):                                  # towers are drawn without north faces: turn them to 0 or 45 degrees
    k = round(deg / 45) % 8
    return (d, w, 45.0 if k % 2 else 0.0) if (k // 2) % 2 else (w, d, 45.0 if k % 2 else 0.0)
def put_building(poly, n, w, d, prof, dn, bid, front=True):
    c = poly.centroid; deg = deg_of(n)
    if front and prof['tower'] and w >= 100 and d >= 100 and rng.random() < prof['tower']:
        ww, dd, dg = upright(w, d, deg); bl.append([round(c.x), round(c.y), round(ww), round(dd), dg, bid, 0, 0])
    else: bl.append([round(c.x), round(c.y), round(w), round(d), deg, bid, 0, 1])
def fill_block(B, bid):
    c = B.representative_point(); dn = district(c.x, c.y); prof = FILLP.get(dn, DEFP)
    if dn == 'FAIRWAY ISLES' or (B.area > 300 * 300 and rng.random() < prof['bpark']):   # the whole block is a park (the golf links are one big park)
        grass.append(B.buffer(-6)); return
    P = orient(B.simplify(1.5), 1.0); placed = []
    sides = []
    for a, b in zip(list(P.exterior.coords)[:-1], list(P.exterior.coords)[1:]):
        ln = math.hypot(b[0] - a[0], b[1] - a[1])
        if ln < 40 or abs(CENTRE.distance(Point((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) - FRONT) > 6: continue
        sides.append((ln, a, b))
    if not sides:                                        # no street along it (a strip on the water): a waterfront park, or a quay at the docks
        if not prof.get('yard'): grass.append(B.buffer(-6))
        return
    Pin = P.buffer(1)
    for ln, a, b in sorted(sides, reverse=True):         # the longest sides first, so their rows run through the corners
        u = ((b[0] - a[0]) / ln, (b[1] - a[1]) / ln); n = (-u[1], u[0]); t = 0.0
        while t < ln - 36:
            r = rng.random(); kind = 'b'
            if r < prof['gas']: kind = 'gas'
            elif r < prof['gas'] + prof['lot']: kind = 'lot'
            elif r < prof['gas'] + prof['lot'] + prof['plaza']: kind = 'plaza'
            elif r < prof['gas'] + prof['lot'] + prof['plaza'] + prof['park']: kind = 'park'
            mid = (a[0] + u[0] * t, a[1] + u[1] * t)
            if kind == 'gas' and any(math.hypot(mid[0] - g[0], mid[1] - g[1]) < 1800 for g in gas_at): kind = 'b'
            got = None
            for k2 in ([kind, 'b'] if kind != 'b' else ['b']):
                (w0, w1), (d0, d1) = SIZES.get(k2, (prof['w'], prof['d'])); w, d = rng.uniform(w0, w1), rng.uniform(d0, d1)
                for fw in ((1,) if k2 != 'b' else (1, 0.75, 0.55)):
                    ww = min(w * fw, ln - t)
                    if ww < (w0 if k2 != 'b' else 40): break
                    for fd in ((1,) if k2 != 'b' else (1, 0.8, 0.62, 0.46)):
                        dd = d * fd
                        if dd < 40: break
                        q = rect(a, u, n, t, ww, dd)
                        if Pin.contains(q) and not any(q.intersection(o).area > 2 for o in placed): got = (k2, q, ww, dd); break
                    if got: break
                if got: break
            if not got: t += 12; continue
            k2, q, ww, dd = got; placed.append(q); cc = q.centroid
            if k2 == 'b': put_building(q, n, ww, dd, prof, dn, bid)
            elif k2 == 'lot': lots.append([round(cc.x), round(cc.y), round(ww), round(dd), deg_of(n)])
            elif k2 == 'gas': props.append({'t': 'gas', 'x': round(cc.x), 'y': round(cc.y), 'w': round(ww), 'h': round(dd), 'a': deg_of(n)}); gas_at.append((cc.x, cc.y))
            elif k2 == 'plaza': props.append({'t': 'plaza', 'x': round(cc.x), 'y': round(cc.y), 'w': round(ww), 'h': round(dd), 'a': deg_of(n)})
            else:
                grass.append(q.buffer(-4))
                if ww > 150 and dd > 120 and rng.random() < 0.5: props.append({'t': 'court', 'x': round(cc.x), 'y': round(cc.y), 'a': deg_of(n)})
            t += ww + (rng.uniform(16, 30) if rng.random() < prof['alley'] else 0)
    rest = P.difference(unary_union([o.buffer(8, join_style=2) for o in placed])) if placed else P
    for g in (rest.geoms if hasattr(rest, 'geoms') else [rest]):
        if g.area < 110 * 110 or g.buffer(-50).is_empty: continue
        mr = g.minimum_rotated_rectangle; cs = list(mr.exterior.coords)
        e1 = (cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]); L1 = math.hypot(*e1)
        e2 = (cs[2][0] - cs[1][0], cs[2][1] - cs[1][1]); L2 = math.hypot(*e2)
        u = (e1[0] / L1, e1[1] / L1) if L1 >= L2 else (e2[0] / L2, e2[1] / L2)
        ang = math.atan2(u[1], u[0]); k = round(ang / (math.pi / 4)); u = (math.cos(k * math.pi / 4), math.sin(k * math.pi / 4)); n = (-u[1], u[0])
        gc = g.centroid; r = rng.random()
        if prof.get('yard') and r < prof['yard']:                       # container yard behind the dock sheds
            for gx in np.arange(-600, 601, 230):
                for gy in np.arange(-600, 601, 110):
                    cx, cy = gc.x + u[0] * gx + n[0] * gy, gc.y + u[1] * gx + n[1] * gy
                    q = affinity.rotate(box(cx - 100, cy - 38, cx + 100, cy + 38), math.degrees(math.atan2(u[1], u[0])), origin=(cx, cy))
                    if g.contains(q): props.append({'t': 'containers', 'x': round(cx), 'y': round(cy), 'a': round(math.degrees(math.atan2(u[1], u[0])), 1)})
        elif prof.get('apron') and g.area > 320 * 320:
            props.append({'t': 'plane', 'x': round(gc.x), 'y': round(gc.y), 'a': round(float(rng.uniform(-180, 180)), 1)})
        elif r < 0.35 or g.area < 160 * 160: grass.append(g.buffer(-4))                       # a garden in the courtyard
        elif r < 0.6 and g.minimum_rotated_rectangle.area < g.area * 1.3:                      # a parking lot
            mr2 = g.buffer(-6).minimum_rotated_rectangle; m = mr2.centroid; cs = list(mr2.exterior.coords)
            a1 = math.hypot(cs[1][0] - cs[0][0], cs[1][1] - cs[0][1]); a2 = math.hypot(cs[2][0] - cs[1][0], cs[2][1] - cs[1][1])
            if min(a1, a2) > 90: lots.append([round(m.x), round(m.y), round(max(a1, a2)), round(min(a1, a2)), round(math.degrees(math.atan2(n[0], -n[1])), 1)])
        else:                                                                                  # buildings inside the block
            mn = min(prof['w'][0], prof['d'][0])
            for gx in np.arange(-900, 901, prof['w'][1] * 0.8):
                for gy in np.arange(-900, 901, prof['d'][1] * 0.8):
                    w, d = rng.uniform(*prof['w']) * 0.75, rng.uniform(*prof['d']) * 0.75
                    cx, cy = gc.x + u[0] * gx + n[0] * gy, gc.y + u[1] * gx + n[1] * gy
                    q = affinity.rotate(box(cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2), math.degrees(math.atan2(u[1], u[0])), origin=(cx, cy))
                    if w > mn * 0.7 and g.buffer(-10).contains(q) and not any(q.intersects(o) for o in placed):
                        placed.append(q.buffer(10)); bl.append([round(cx), round(cy), round(w), round(d), deg_of(n), bid, 0, 1])
for i, B in enumerate(BLOCKS): fill_block(B, i)
print('blocks', len(BLOCKS), 'buildings', len(bl), 'towers', sum(1 for b in bl if not b[7]), 'lots', len(lots), 'gas', len(gas_at),
      'plazas', sum(1 for p in props if p['t'] == 'plaza'), 'courts', sum(1 for p in props if p['t'] == 'court'), 'parks', len(grass), file=sys.stderr)

# ---------- docks and airport: cranes on the quays, planes on the apron, the runways ----------
for r in RUNWAYS:
    (ax, ay), (bx, by) = r.coords; props.append({'t': 'runway', 'x': round((ax + bx) / 2), 'y': round((ay + by) / 2), 'w': round(r.length + 120), 'h': 120, 'a': round(math.degrees(math.atan2(by - ay, bx - ax)), 1)})
TERM = next(L for L in LM_PX if L['t'] == 'terminal'); tx0, ty0, tx1, ty1 = [v * S for v in TERM['box']]
for k in range(3):                                       # airliners parked on the apron in front of the terminal
    cx, cy = tx0 + (tx1 - tx0) * (0.2 + 0.3 * k), ty1 + 260
    if LANDG.contains(Point(cx, cy)) and not Point(cx, cy).buffer(130).intersects(WALKS): props.append({'t': 'plane', 'x': round(cx), 'y': round(cy), 'a': -90.0})
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
        'land': land_out, 'grass': grass_out, 'sand': to_rings(SANDG, 14 * S * S), 'bld': bl, 'lm': LM, 'props': props, 'lots': lots,
        'districts': [[nm, [r[0] * S, r[1] * S, r[2] * S, r[3] * S]] for nm, r in DIST], 'start': [560 * S, 652 * S]}
with open(sys.argv[2], 'w') as f:
    f.write("'use strict';\n/* Bay city map, generated by tools/build_city.py: a made-up city on the outline of a reference map image.\n"
            "   Units are world units. land/grass/sand: polygons {o: outer ring, h: holes}. nodes/edges: road graph, edge.p is the centre line;\n"
            "   nt = closed to traffic (a driveway to a landmark gate). bld: buildings [cx, cy, w, d, angle deg, block id, 0, 1 = merged low-rise / 0 = tower];\n"
            "   the front of a building (local +z) faces its street. lm: landmarks; props: cranes, containers, planes, runways, gas stations, plazas, courts;\n"
            "   lots: parking lots [cx, cy, w, d, angle deg]; sw: sidewalk width. */\nconst MAP = ")
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
