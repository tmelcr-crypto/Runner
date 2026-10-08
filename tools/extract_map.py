"""Turn a stylised city map image into js/00-map-data.js for Block Runner.

Usage:  python tools/extract_map.py <map image> js/00-map-data.js
Needs:  numpy, opencv-python-headless, scikit-image, shapely, pillow

Colours in the source image: blue = water, grey = paved ground, white = buildings, black = main roads,
green = grass, beige = sand. The pixel boxes below (park pattern, open areas, district names, start point)
are tuned to the reference image the current map was made from; change them for a different image.
"""
import sys, json, numpy as np, cv2
from PIL import Image
from skimage.morphology import skeletonize, remove_small_objects, remove_small_holes
from shapely.geometry import LineString
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
    # outside the rounded screenshot corners: white connected to the border is sea
    ff = (lab == WHITE).astype(np.uint8); h, w = ff.shape; m = np.zeros((h + 2, w + 2), np.uint8)
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if ff[y, x]: cv2.floodFill(ff, m, (x, y), 2)
    lab[ff == 2] = WATER
    # majority filter removes jpeg speckle
    def majority(lab, k, classes):
        best, arg = None, None
        for c in classes:
            s = cv2.blur((lab == c).astype(np.float32), (k, k))
            if best is None: best, arg = s, np.full(lab.shape, c, np.uint8)
            else: sel = s > best; best[sel] = s[sel]; arg[sel] = c
        return arg
    lab = majority(lab, 3, range(6))
    # thin dark outlines around buildings are not roads: open the road mask, give the rest to the neighbours
    road = (lab == ROAD).astype(np.uint8)
    keep = cv2.morphologyEx(road, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (4, 4)))
    lost = (road == 1) & (keep == 0)
    alt = majority(np.where(lab == ROAD, 255, lab), 7, [WATER, LAND, GRASS, SAND, WHITE])
    lab[lost] = alt[lost]
    # land / water clean-up
    land = lab != WATER
    land = remove_small_objects(land, 30); land = remove_small_holes(land, 60)
    alt2 = majority(np.where(land & (lab == WATER), 255, lab), 5, [LAND, GRASS, SAND, WHITE, ROAD])
    fill = land & (lab == WATER); lab[fill] = alt2[fill]; lab[~land] = WATER
    return lab

S = 14                      # world units per image pixel
ROAD_W = 96                 # rendered road width (units)
lab = classify(sys.argv[1]); H, W = lab.shape

# ---------- roads: skeleton -> graph ----------
lab[8:58, 358:418][lab[8:58, 358:418] == ROAD] = GRASS
road = (lab == ROAD).astype(np.uint8)
road = cv2.morphologyEx(road, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
n, cc, st, _ = cv2.connectedComponentsWithStats(road, 8)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] < 90: road[cc == i] = 0
sk = skeletonize(road > 0)
OFF = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]
def nbrs(x, y):
    for dx, dy in OFF:
        X, Y = x + dx, y + dy
        if 0 <= X < W and 0 <= Y < H and sk[Y, X]: yield X, Y
pix = set(zip(*np.nonzero(sk)[::-1]))
deg = {p: sum(1 for _ in nbrs(*p)) for p in pix}
nodepix = {p for p in pix if deg[p] != 2}
# cluster node pixels
nid, nodes = {}, []
for p in nodepix:
    if p in nid: continue
    stack, grp = [p], []
    nid[p] = len(nodes)
    while stack:
        q = stack.pop(); grp.append(q)
        for r in nbrs(*q):
            if r in nodepix and r not in nid: nid[r] = len(nodes); stack.append(r)
    nodes.append((sum(q[0] for q in grp) / len(grp), sum(q[1] for q in grp) / len(grp)))
edges, seen = [], set()
for p in nodepix:
    for q in nbrs(*p):
        if q in nodepix or (p, q) in seen: continue
        path, prev, cur = [p, q], p, q
        seen.add((p, q))
        while cur not in nodepix:
            nx = [r for r in nbrs(*cur) if r != prev and r not in path[-3:]]
            if not nx: break
            prev, cur = cur, nx[0]; path.append(cur)
        if cur in nodepix:
            seen.add((cur, path[-2]))
            edges.append([nid[p], nid[cur], path])
# pure loops (no node pixels) are ignored; drop duplicate edges and self loops shorter than 30px
uniq, keyset = [], set()
for a, b, path in edges:
    k = (min(a, b), max(a, b), len(path))
    if k in keyset or (a == b and len(path) < 30): continue
    keyset.add(k); uniq.append([a, b, path])
edges = uniq
def prune(edges, nodes, minlen):
    while True:
        d = {}
        for a, b, _ in edges: d[a] = d.get(a, 0) + 1; d[b] = d.get(b, 0) + 1
        keep = [e for e in edges if not ((d[e[0]] == 1 or d[e[1]] == 1) and len(e[2]) < minlen)]
        if len(keep) == len(edges): return keep
        edges = keep
edges = prune(edges, nodes, 14)
# merge chains through degree-2 nodes
def merge(edges):
    changed = True
    while changed:
        changed = False
        d = {}
        for i, (a, b, _) in enumerate(edges): d.setdefault(a, []).append(i); d.setdefault(b, []).append(i)
        for v, inc in d.items():
            if len(inc) == 2 and inc[0] != inc[1]:
                e1, e2 = edges[inc[0]], edges[inc[1]]
                p1 = e1[2] if e1[1] == v else e1[2][::-1]; a = e1[0] if e1[1] == v else e1[1]
                p2 = e2[2] if e2[0] == v else e2[2][::-1]; b = e2[1] if e2[0] == v else e2[0]
                ne = [a, b, p1 + p2[1:]]
                edges = [e for i, e in enumerate(edges) if i not in inc] + [ne]
                changed = True; break
    return edges
edges = merge(edges)
def contract(edges, nodes, minlen):
    while True:
        hit = next((e for e in edges if e[0] != e[1] and len(e[2]) < minlen), None)
        if hit is None: return edges
        a, b = hit[0], hit[1]
        nodes[a] = ((nodes[a][0] + nodes[b][0]) / 2, (nodes[a][1] + nodes[b][1]) / 2)
        out = []
        for e in edges:
            if e is hit: continue
            e = [a if e[0] == b else e[0], a if e[1] == b else e[1], e[2]]
            if e[0] == e[1] and len(e[2]) < 30: continue
            out.append(e)
        edges = out
edges = contract(edges, nodes, 9)
edges = prune(edges, nodes, 14)
edges = merge(edges)
used = sorted({e[0] for e in edges} | {e[1] for e in edges}); remap = {o: i for i, o in enumerate(used)}
nodes = [nodes[o] for o in used]; edges = [[remap[a], remap[b], p] for a, b, p in edges]
land0 = lab != WATER
def over_water(x, y, ang):
    ox, oy = -np.sin(ang), np.cos(ang); c = 0
    for s in (-1, 1):
        X, Y = int(round(x + ox * s * 7)), int(round(y + oy * s * 7))
        if not (0 <= X < W and 0 <= Y < H) or not land0[Y, X]: c += 1
    return c == 2
out_edges = []
for a, b, path in edges:
    pts = [nodes[a]] + [(float(x), float(y)) for x, y in path[1:-1]] + [nodes[b]]
    if len(pts) < 2: continue
    ls = LineString(pts).simplify(1.1)
    pts = list(ls.coords)
    if len(pts) < 2 or ls.length < 2: continue
    br = []
    for i in range(len(pts) - 1):
        (x0, y0), (x1, y1) = pts[i], pts[i + 1]; ang = np.arctan2(y1 - y0, x1 - x0); m = max(1, int(np.hypot(x1 - x0, y1 - y0) / 3))
        br.append(int(sum(over_water(x0 + (x1 - x0) * t / m, y0 + (y1 - y0) * t / m, ang) for t in range(m + 1)) > (m + 1) * 0.6))
    out_edges.append({'a': a, 'b': b, 'p': [[round(x * S), round(y * S)] for x, y in pts], 'br': br})
print('road nodes', len(nodes), 'edges', len(out_edges), 'bridge segs', sum(sum(e['br']) for e in out_edges), file=sys.stderr)

# ---------- road corridor raster ----------
corr = np.zeros((H, W), np.uint8); buf = np.zeros((H, W), np.uint8)
for e in out_edges:
    p = np.array(e['p'], np.float64) / S
    cv2.polylines(corr, [np.round(p * 8).astype(np.int32)], False, 1, thickness=int(round(ROAD_W / S)), shift=3)
    cv2.polylines(buf, [np.round(p * 8).astype(np.int32)], False, 1, thickness=int(round((ROAD_W + 32) / S)), shift=3)
for x, y in nodes:
    cv2.circle(corr, (int(round(x)), int(round(y))), int(ROAD_W / S / 2), 1, -1)
    cv2.circle(buf, (int(round(x)), int(round(y))), int((ROAD_W + 32) / S / 2), 1, -1)
land = (land0 | (corr > 0)).astype(np.uint8)

# ---------- area polygons ----------
def chaikin(pts, it=1):
    for _ in range(it):
        q = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            q += [(0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]), (0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1])]
        pts = q
    return pts
def polys(mask, min_area, eps):
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
land_p = polys(land, 25, 0.9)
grass = ((lab == GRASS) & (corr == 0)).astype(np.uint8); grass = cv2.morphologyEx(grass, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
sand = ((lab == SAND) & (corr == 0)).astype(np.uint8)
grass_p = polys(grass, 14, 0.9); sand_p = polys(sand, 14, 0.9)
print('land polys', len(land_p), 'grass', len(grass_p), 'sand', len(sand_p), 'points', sum(len(p['o']) + sum(len(h) for h in p['h']) for p in land_p + grass_p + sand_p), file=sys.stderr)

# ---------- buildings: white areas -> rectangles ----------
white = ((lab == WHITE) & (buf == 0) & (land0)).astype(np.uint8)
white = cv2.morphologyEx(white, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
def largest_rect(m):
    h, w = m.shape; hist = np.zeros(w, int); best = (0, 0, 0, 0, 0)
    for y in range(h):
        hist = np.where(m[y] > 0, hist + 1, 0); st = []
        for x in range(w + 1):
            cur = hist[x] if x < w else 0; start = x
            while st and st[-1][1] >= cur:
                sx, sh = st.pop(); area = sh * (x - sx)
                if area > best[0]: best = (area, sx, y - sh + 1, x - sx, sh)
                start = sx
            st.append((start, cur))
    return best
rects = []
n, cc, st, _ = cv2.connectedComponentsWithStats(white, 4)
for i in range(1, n):
    x0, y0, w0, h0, a = st[i]
    if a < 12: continue
    m = (cc[y0:y0 + h0, x0:x0 + w0] == i).astype(np.uint8)
    while True:
        area, x, y, w, h = largest_rect(m)
        if w < 4 or h < 4 or area < 20: break
        rects.append((x0 + x, y0 + y, w, h))
        m[max(0, y - 1):y + h + 1, max(0, x - 1):x + w + 1] = 0
# split big blocks into several buildings with 2px alleys
bl = []
MAXS = 22
for x, y, w, h in rects:
    nx, ny = max(1, round(w / MAXS + 0.3)), max(1, round(h / MAXS + 0.3))
    cw, ch = (w - 2 * (nx - 1)) / nx, (h - 2 * (ny - 1)) / ny
    for i in range(nx):
        for j in range(ny):
            bx, by = x + i * (cw + 2), y + j * (ch + 2)
            bl.append([round(bx * S) + 4, round(by * S) + 4, round(cw * S) - 8, round(ch * S) - 8])
occ = np.zeros((H, W), np.uint8)
for x, y, w, h in rects: occ[max(0, y - 2):y + h + 2, max(0, x - 2):x + w + 2] = 1
ok = ((lab == LAND) & (buf == 0) & land0 & (occ == 0)).astype(np.uint8)
for x0, y0, x1, y1 in [(50, 370, 212, 810), (120, 20, 262, 130), (395, 630, 470, 810)]: ok[y0:y1, x0:x1] = 0   # airfield, gravel flats, rocks stay open
rng = np.random.default_rng(7); extra = 0
for gy in range(0, H, 7):
    for gx in range(0, W, 7):
        for _ in range(3):
            w, h = int(rng.integers(5, 12)), int(rng.integers(5, 12)); x, y = gx + int(rng.integers(0, 4)), gy + int(rng.integers(0, 4))
            if y + h >= H or x + w >= W or not ok[y:y + h, x:x + w].all() or rng.random() < 0.1: continue
            bl.append([x * S + 4, y * S + 4, w * S - 8, h * S - 8]); ok[max(0, y - 2):y + h + 2, max(0, x - 2):x + w + 2] = 0; extra += 1; break
print('buildings', len(bl), 'of which infill', extra, file=sys.stderr)

DIST = [  # original names; rects in image px [x0, y0, x1, y1], first match wins
    ['THE SANDBAR', [636, 70, 740, 800]], ['GRAVEL FLATS', [120, 20, 262, 130]], ['HERON KEY', [462, 88, 540, 200]],
    ['PALM HEIGHTS', [200, 0, 450, 292]], ['FAIRWAY ISLES', [418, 222, 572, 470]], ['PEARL KEY', [330, 428, 470, 545]],
    ['MERCADO', [185, 292, 360, 560]], ['SKYPORT', [50, 370, 212, 810]], ['DOCKSIDE', [212, 560, 380, 800]],
    ['GULL ROCKS', [395, 630, 462, 810]], ['SEAVIEW', [520, 60, 660, 300]], ['SUNSTRIP', [500, 300, 660, 480]],
    ['CORAL SHORE', [430, 480, 660, 810]]]
data = {'S': S, 'W': W * S, 'H': H * S, 'roadW': ROAD_W, 'nodes': [[round(x * S), round(y * S)] for x, y in nodes], 'edges': out_edges,
        'land': land_p, 'grass': grass_p, 'sand': sand_p, 'bld': bl,
        'districts': [[nm, [r[0] * S, r[1] * S, r[2] * S, r[3] * S]] for nm, r in DIST], 'start': [560 * S, 652 * S]}
with open(sys.argv[2], 'w') as f:
    f.write("'use strict';\n/* Bay city map, generated by tools/extract_map.py from a reference map image.\n"
            "   Units are world units (S per source pixel). land/grass/sand: polygons {o: outer ring, h: holes}.\n"
            "   nodes/edges: road graph, edge.p is the centre-line polyline. bld: building footprints [x, y, w, h]. */\nconst MAP = ")
    json.dump(data, f, separators=(',', ':')); f.write(';\n')
