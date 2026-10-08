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
lab[8:58, 358:418][lab[8:58, 358:418] == ROAD] = GRASS          # park pattern in the north, not streets
lab[94:149, 579:605][lab[94:149, 579:605] == ROAD] = LAND        # the mall's own outlines, not streets
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

# ---------- landmarks (hand placed on the reference image, image px) ----------
LM_PX = [
    {'t': 'stadium', 'c': (383, 38), 'r': 22},
    {'t': 'estate', 'box': (386, 500, 452, 538), 'house': (398, 506, 430, 528)},
    {'t': 'mall', 'box': (577, 92, 606, 150)},
    {'t': 'lighthouse', 'c': (657, 731)},
    {'t': 'terminal', 'box': (140, 562, 200, 597)},
    {'t': 'tower', 'c': (124, 582)},
    {'t': 'hangars', 'box': (88, 488, 155, 506)},
    {'t': 'studio', 'box': (468, 141, 500, 182)},
    {'t': 'colony', 'c': (558, 672), 'r': 0},     # 736 Ocean Drive: the hotel row on the west side of the beach road; placed against the road at runtime
]
road_px = cv2.dilate(corr, np.ones((3, 3), np.uint8)) > 0           # road surface plus a pixel of kerb
for L in LM_PX:                                                       # pull landmark outlines back until no road runs under them
    if 'box' in L:
        x0, y0, x1, y1 = L['box']
        for _ in range(120):                                          # move in the side with the most road under it, one pixel at a time
            c = [road_px[y0, x0:x1].sum(), road_px[y1 - 1, x0:x1].sum(), road_px[y0:y1, x0].sum(), road_px[y0:y1, x1 - 1].sum()]
            if max(c) == 0 or x1 - x0 < 4 or y1 - y0 < 4: break
            k = int(np.argmax(c))
            if k == 0: y0 += 1
            elif k == 1: y1 -= 1
            elif k == 2: x0 += 1
            else: x1 -= 1
        if road_px[y0:y1, x0:x1].any(): print('warning: a road crosses landmark', L['t'], file=sys.stderr)
        if (x0, y0, x1, y1) != L['box']: print('landmark', L['t'], 'trimmed', L['box'], '->', (x0, y0, x1, y1), file=sys.stderr)
        L['box'] = (x0, y0, x1, y1)
        if 'house' in L: hx0, hy0, hx1, hy1 = L['house']; L['house'] = (max(hx0, x0 + 3), max(hy0, y0 + 6), min(hx1, x1 - 3), min(hy1, y1 - 6))
    elif 'r' in L:
        circ = lambda r: (lambda m: (cv2.circle(m, L['c'], r, 1, -1), m)[1])(np.zeros((H, W), np.uint8)) > 0
        r0 = L['r']
        while L['r'] > 6 and (road_px & circ(L['r'])).any(): L['r'] -= 1
        if L['r'] != r0: print('landmark', L['t'], 'radius', r0, '->', L['r'], file=sys.stderr)
lm_mask = np.zeros((H, W), np.uint8)
for L in LM_PX:
    if 'box' in L: x0, y0, x1, y1 = L['box']; lm_mask[y0:y1, x0:x1] = 1
    else: cv2.circle(lm_mask, L['c'], L.get('r', 4), 1, -1)

# ---------- buildings: each white area becomes one or more boxes that cover it without gaps ----------
white = ((lab == WHITE) & (buf == 0) & land0 & (lm_mask == 0)).astype(np.uint8)
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
MAXS = 20                       # longest side of one building piece (px); longer blocks are cut into touching pieces
N_, S_, W_, E_ = 1, 2, 4, 8     # inner-side flags: that side touches another piece of the same block
bl = []
n, cc, st, _ = cv2.connectedComponentsWithStats(white, 4)
for i in range(1, n):
    x0, y0, w0, h0, a = st[i]
    if a < 6 or x0 < 4 or y0 < 4 or x0 + w0 > W - 4 or y0 + h0 > H - 4: continue   # screenshot border, not city
    pts = np.argwhere(cc == i)[:, ::-1].astype(np.float32)
    bp = cv2.boxPoints(cv2.minAreaRect(pts))
    e1, e2 = bp[1] - bp[0], bp[2] - bp[1]; rw, rh = np.hypot(*e1) + 1, np.hypot(*e2) + 1
    ang = np.degrees(np.arctan2(e1[1], e1[0]))
    while ang > 45: ang -= 90; rw, rh = rh, rw
    while ang <= -45: ang += 90; rw, rh = rh, rw
    if a / (rw * rh) > 0.78 and abs(ang) > 6:                       # a rotated box: keep it rotated, cut along its long side
        c = bp.mean(0) + 0.5; ca, sa = np.cos(np.radians(ang)), np.sin(np.radians(ang))
        along_x = rw >= rh; L = rw if along_x else rh; k = max(1, int(np.ceil(L / MAXS)))
        for j in range(k):
            off = (j + 0.5) / k * L - L / 2
            cx, cy = (c[0] + ca * off, c[1] + sa * off) if along_x else (c[0] - sa * off, c[1] + ca * off)
            pw, ph = (rw / k, rh) if along_x else (rw, rh / k)
            fl = ((W_ if j > 0 else 0) | (E_ if j < k - 1 else 0)) if along_x else ((N_ if j > 0 else 0) | (S_ if j < k - 1 else 0))
            bl.append([round(cx * S), round(cy * S), round(pw * S), round(ph * S), round(ang, 1), i, fl])
        continue
    m = (cc[y0:y0 + h0, x0:x0 + w0] == i).astype(np.uint8); rects = []
    while True:
        area, x, y, w, h = largest_rect(m)
        if w < 2 or h < 2 or area < 6: break
        nx, ny = max(1, int(np.ceil(w / MAXS))), max(1, int(np.ceil(h / MAXS)))
        for u in range(nx):
            for v in range(ny):
                ax, bx = x + round(u * w / nx), x + round((u + 1) * w / nx); ay, by = y + round(v * h / ny), y + round((v + 1) * h / ny)
                rects.append((x0 + ax, y0 + ay, bx - ax, by - ay))
        m[y:y + h, x:x + w] = 0
    ids = np.full((H, W), -1, int)
    for k, (x, y, w, h) in enumerate(rects): ids[y:y + h, x:x + w] = k
    for k, (x, y, w, h) in enumerate(rects):
        def touch(strip): return strip.size and ((strip >= 0) & (strip != k)).mean() >= 0.5
        fl = (N_ if y > 0 and touch(ids[y - 1, x:x + w]) else 0) | (S_ if y + h < H and touch(ids[y + h, x:x + w]) else 0) | \
             (W_ if x > 0 and touch(ids[y:y + h, x - 1]) else 0) | (E_ if x + w < W and touch(ids[y:y + h, x + w]) else 0)
        bl.append([round((x + w / 2) * S), round((y + h / 2) * S), w * S, h * S, 0, i, fl])
print('buildings', len(bl), 'rotated', sum(1 for b in bl if b[4]), file=sys.stderr)

# ---------- props: dock cranes on the quay, container stacks behind them, planes on the airfield ----------
dist_w = cv2.distanceTransform(land.astype(np.uint8), cv2.DIST_L2, 5)
gy_, gx_ = np.gradient(cv2.GaussianBlur(dist_w, (7, 7), 0))
occ = ((buf > 0) | (lm_mask > 0)).astype(np.uint8)
for b in bl:
    occ[max(0, int(b[1] / S - b[3] / S / 2) - 2):int(b[1] / S + b[3] / S / 2) + 3, max(0, int(b[0] / S - b[2] / S / 2) - 2):int(b[0] / S + b[2] / S / 2) + 3] = 1
def place(box, ok, spacing, limit):
    x0, y0, x1, y1 = box; out = []
    ys, xs = np.nonzero(ok[y0:y1, x0:x1])
    for y, x in sorted(zip(ys + y0, xs + x0), key=lambda q: (q[0] * 3 + q[1])):
        if all((x - u) ** 2 + (y - v) ** 2 >= spacing ** 2 for u, v in out): out.append((x, y))
        if len(out) >= limit: break
    return out
gray = (lab == LAND) & land0 & (occ == 0)
props = []
quay = gray & (dist_w >= 1.5) & (dist_w <= 3)
for x, y in place((212, 560, 380, 800), quay, 24, 6):
    a = np.degrees(np.arctan2(-gy_[y, x], -gx_[y, x]))          # boom points out over the water
    props.append({'t': 'crane', 'x': round(x * S), 'y': round(y * S), 'a': round(a, 1)})
yard = gray & (dist_w >= 6) & (dist_w <= 16) & (cv2.erode(gray.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0)
for x, y in place((212, 560, 380, 800), yard, 9, 18):
    a = np.degrees(np.arctan2(-gy_[y, x], -gx_[y, x])) + 90
    props.append({'t': 'containers', 'x': round(x * S), 'y': round(y * S), 'a': round(a, 1)})
apron = gray & (cv2.erode(gray.astype(np.uint8), np.ones((15, 15), np.uint8)) > 0)
for x, y in place((50, 370, 212, 810), apron, 26, 4):
    props.append({'t': 'plane', 'x': round(x * S), 'y': round(y * S), 'a': float(np.random.default_rng(x * 7 + y).uniform(-180, 180))})
print('props', len(props), {t: sum(1 for p in props if p['t'] == t) for t in ('crane', 'containers', 'plane')}, file=sys.stderr)
LM = []
for L in LM_PX:
    o = {'t': L['t']}
    if 'box' in L: x0, y0, x1, y1 = L['box']; o.update(x=round((x0 + x1) / 2 * S), y=round((y0 + y1) / 2 * S), w=(x1 - x0) * S, h=(y1 - y0) * S)
    else: o.update(x=round(L['c'][0] * S), y=round(L['c'][1] * S))
    if 'r' in L: o['r'] = L['r'] * S
    if 'house' in L: x0, y0, x1, y1 = L['house']; o['house'] = [round((x0 + x1) / 2 * S), round((y0 + y1) / 2 * S), (x1 - x0) * S, (y1 - y0) * S]
    LM.append(o)

DIST = [  # original names; rects in image px [x0, y0, x1, y1], first match wins
    ['THE SANDBAR', [636, 70, 740, 800]], ['GRAVEL FLATS', [120, 20, 262, 130]], ['HERON KEY', [462, 88, 540, 200]],
    ['PALM HEIGHTS', [200, 0, 450, 292]], ['FAIRWAY ISLES', [418, 222, 572, 470]], ['PEARL KEY', [330, 428, 470, 545]],
    ['MERCADO', [185, 292, 360, 560]], ['SKYPORT', [50, 370, 212, 810]], ['DOCKSIDE', [212, 560, 380, 800]],
    ['GULL ROCKS', [395, 630, 462, 810]], ['SEAVIEW', [520, 60, 660, 300]], ['SUNSTRIP', [500, 300, 660, 480]],
    ['CORAL SHORE', [430, 480, 660, 810]]]
data = {'S': S, 'W': W * S, 'H': H * S, 'roadW': ROAD_W, 'nodes': [[round(x * S), round(y * S)] for x, y in nodes], 'edges': out_edges,
        'land': land_p, 'grass': grass_p, 'sand': sand_p, 'bld': bl, 'lm': LM, 'props': props,
        'districts': [[nm, [r[0] * S, r[1] * S, r[2] * S, r[3] * S]] for nm, r in DIST], 'start': [560 * S, 652 * S]}
with open(sys.argv[2], 'w') as f:
    f.write("'use strict';\n/* Bay city map, generated by tools/extract_map.py from a reference map image.\n"
            "   Units are world units (S per source pixel). land/grass/sand: polygons {o: outer ring, h: holes}.\n"
            "   nodes/edges: road graph, edge.p is the centre-line polyline. bld: building boxes [cx, cy, w, h, angle deg, block id, inner-side flags N1 S2 W4 E8].\n   lm: landmarks, props: cranes, containers, planes. */\nconst MAP = ")
    json.dump(data, f, separators=(',', ':'), default=lambda o: o.item()); f.write(';\n')
