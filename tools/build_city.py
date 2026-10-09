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
import sys, json, math, numpy as np, cv2
from PIL import Image
from skimage.morphology import remove_small_objects, remove_small_holes
from shapely.geometry import Polygon, MultiPolygon, LineString, MultiLineString, Point, box
from shapely.ops import unary_union, split, linemerge
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
    pts = list(poly.exterior.simplify(tol).coords)[:-1]
    if len(pts) < 3: return None
    L = []                                              # [direction index 0..7, offset along the normal, length]
    for i in range(len(pts)):
        (ax, ay), (bx, by) = pts[i], pts[(i + 1) % len(pts)]; ln = math.hypot(bx - ax, by - ay)
        if ln < 1: continue
        k = int(round(math.atan2(by - ay, bx - ax) / (math.pi / 4))) % 8
        nx, ny = -math.sin(k * math.pi / 4), math.cos(k * math.pi / 4)
        L.append([k, nx * (ax + bx) / 2 + ny * (ay + by) / 2, ln])
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
                w = L[i][2] + L[j][2]; L[i] = [L[i][0], (L[i][1] * L[i][2] + L[j][1] * L[j][2]) / w, w]; del L[j]; changed = True; break
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
    {'t': 'studio', 'box': (468, 141, 500, 182), 'gate': 'w'},
    {'t': 'colony', 'c': (558, 672), 'r': 0},     # 736 Ocean Drive: placed against the beach road at run time
]
RUNWAYS_PX = [((100, 548), (100, 786)), ((90, 732), (198, 624))]          # centre line ends; one north-south, one at 45 degrees
BRIDGES_PX = [[(420, 130), (508, 130), (508, 158), (590, 158)],            # bridges: straight runs at 0/45/90 degrees (image px)
              [(300, 372), (610, 372)], [(290, 495), (610, 495)], [(290, 598), (470, 598)]]
def lm_shape(L):
    if 'box' in L: x0, y0, x1, y1 = L['box']; return box(x0 * S, y0 * S, x1 * S, y1 * S)
    if L['t'] == 'stadium': (cx, cy), r = L['c'], L['r']; return box((cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S)
    return Point(L['c'][0] * S, L['c'][1] * S).buffer(50, cap_style=3)
RES = [lm_shape(L) for L in LM_PX if L['t'] != 'colony']
RUNWAYS = [LineString([(a[0] * S, a[1] * S), (b[0] * S, b[1] * S)]) for a, b in RUNWAYS_PX]
RES += [r.buffer(70, cap_style=2) for r in RUNWAYS]
city = LANDG.difference(SANDG.buffer(10))
LAGOONS = [Polygon(h) for g in (city.geoms if hasattr(city, 'geoms') else [city]) for h in g.interiors if Polygon(h).area > 40 * 40]
RES += LAGOONS                                                            # water inside an island: no street runs over it
RESU = unary_union([g.buffer(FRONT, join_style=2) for g in RES])          # a street's centre line stays this far out

inner = city.buffer(-(RH + SW + COAST), join_style=2).difference(RESU).buffer(-240).buffer(240, join_style=2)   # thin necks and small coves drop out
RINGS = []
for g in (inner.geoms if isinstance(inner, MultiPolygon) else [inner]):
    if g.area < 900 * 900: continue
    o = octilinear(g, 170)
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
    'PALM HEIGHTS': (560, 900, 0.5), 'MERCADO': (480, 780, 0.5), 'DOCKSIDE': (640, 1100, 0.0), 'SKYPORT': (900, 1700, 0.0),
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
def bsp(P, depth=0):
    c = P.representative_point(); mn, mx, pdiag = PROF.get(district(c.x, c.y), DEFPROF)
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
            if r:
                add_cut(r[1], 'avenue' if ax == 'd' else 'street')
                return [leaf for q in r[0] for leaf in bsp(q, depth + 1)]
    return [P]
LEAVES = []
for R in RINGS:
    pcs = [R]
    for (ax, ay), (bx, by) in [(b[i], b[i + 1]) for b in BRIDGES_PX for i in range(len(b) - 1)]:   # a bridge carries on as an avenue right across the island
        dx, dy = (bx - ax) / (math.hypot(bx - ax, by - ay)), (by - ay) / (math.hypot(bx - ax, by - ay))
        line = LineString([(ax * S - dx * 30000, ay * S - dy * 30000), (bx * S + dx * 30000, by * S + dy * 30000)])
        if not line.intersects(R) or not LineString([(ax * S, ay * S), (bx * S, by * S)]).intersects(R.buffer(200)): continue
        nxt = []
        for P in pcs:
            cut = line.intersection(P)
            if cut.is_empty or cut.length < 1 or cut.intersects(RESU): nxt.append(P); continue
            add_cut(cut, 'avenue'); nxt += pieces_of(split(P, line))
        pcs = nxt
    for P in pcs: LEAVES += bsp(P)
ringsU = unary_union(RINGS)
for b in BRIDGES_PX:                                     # the bridges themselves: from one ring road to the next
    ln = LineString([(x * S, y * S) for x, y in b]).difference(ringsU)
    if hasattr(ln, 'geoms'): ln = linemerge(ln) if not ln.is_empty else ln
    for q in (ln.geoms if hasattr(ln, 'geoms') else [ln]):
        a, b = Point(q.coords[0]), Point(q.coords[-1])
        if ringsU.boundary.distance(a) < 1 and ringsU.boundary.distance(b) < 1 and q.length > 40: SEGS.append((q, 'bridge'))
for R in RINGS: SEGS.append((LineString(R.exterior.coords), 'ring'))
print('leaves', len(LEAVES), 'street segments', len(SEGS), file=sys.stderr)

# ---------- road graph: node every crossing, merge runs through bends, drop dead ends ----------
def build_graph(segs):
    net = unary_union([g for g, k in segs])
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
d = degrees(nodes, edges)
print('graph nodes', len(nodes), 'edges', len(edges), 'dead ends', sum(1 for x in d if x == 1), 'degrees', {k: d.count(k) for k in set(d)}, file=sys.stderr)
DEAD = [nodes[i] for i, x in enumerate(d) if x == 1]

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
if len(sys.argv) > 3: preview(sys.argv[3], roads=[e[2] for e in edges], extra=[(list(g.exterior.coords), (0, 0, 255)) for g in RES] + [(list(Point(p).buffer(60).exterior.coords), (0, 255, 255)) for p in DEAD] + [(list(q.exterior.coords), (255, 0, 255)) for q in WET])
