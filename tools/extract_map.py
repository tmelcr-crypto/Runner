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

S = 20                      # world units per image pixel
ROAD_W = 132                # carriageway: two traffic lanes plus a parking lane on each side (a parked car clears a passing truck)
SW = 22                     # sidewalk width on each side
PAD = 10                    # raised pavement around buildings
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
    cv2.polylines(corr, [np.round(p * 8).astype(np.int32)], False, 1, thickness=int(round((ROAD_W + 2 * SW) / S)), shift=3)   # road and sidewalks are land (bridge decks too)
    cv2.polylines(buf, [np.round(p * 8).astype(np.int32)], False, 1, thickness=int(round((ROAD_W + 2 * SW + 2 * PAD + 8) / S)), shift=3)
for x, y in nodes:
    cv2.circle(corr, (int(round(x)), int(round(y))), int((ROAD_W + 2 * SW) / S / 2), 1, -1)
    cv2.circle(buf, (int(round(x)), int(round(y))), int((ROAD_W + 2 * SW + 2 * PAD + 8) / S / 2), 1, -1)
land = (land0 | (corr > 0)).astype(np.uint8)

DIST = [  # original names; rects in image px [x0, y0, x1, y1], first match wins
    ['THE SANDBAR', [636, 70, 740, 800]], ['GRAVEL FLATS', [120, 20, 262, 130]], ['HERON KEY', [462, 88, 540, 200]],
    ['PALM HEIGHTS', [200, 0, 450, 292]], ['FAIRWAY ISLES', [418, 222, 572, 470]], ['PEARL KEY', [330, 428, 470, 545]],
    ['MERCADO', [185, 292, 360, 560]], ['SKYPORT', [50, 370, 212, 810]], ['DOCKSIDE', [212, 560, 380, 800]],
    ['GULL ROCKS', [395, 630, 462, 810]], ['SEAVIEW', [520, 60, 660, 300]], ['SUNSTRIP', [500, 300, 660, 480]],
    ['CORAL SHORE', [430, 480, 660, 810]]]
def district(x, y):
    for nm, r in DIST:
        if r[0] <= x < r[2] and r[1] <= y < r[3]: return nm
    return ''

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
# ---------- lakes: Gravel Flats becomes a lake inside a park; ponds in the larger parks ----------
rng = np.random.default_rng(11)
reg = np.zeros((H, W), bool); reg[20:130, 120:262] = True
blob = reg & (land > 0) & (corr == 0) & (lm_mask == 0)
lake = cv2.erode(blob.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (27, 27)))
lake = cv2.morphologyEx(lake, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))) > 0
lab[blob & ~lake] = GRASS; lab[lake] = WATER; land[lake] = 0
g = ((lab == GRASS) & (land > 0) & (buf == 0) & (cv2.dilate(lm_mask, np.ones((9, 9), np.uint8)) == 0) & ~reg).astype(np.uint8)
dg = cv2.distanceTransform(g, cv2.DIST_L2, 5)
ys, xs = np.nonzero(dg >= 8); ponds = []
for k in np.argsort(-dg[ys, xs]):
    x, y = int(xs[k]), int(ys[k])
    if any((x - u) ** 2 + (y - v) ** 2 < 45 ** 2 for u, v, _ in ponds): continue
    ponds.append((x, y, float(min(dg[y, x] - 3, 13))))
    if len(ponds) >= 12: break
for x, y, r in ponds:
    m = np.zeros((H, W), np.uint8); a = float(rng.uniform(0, 180))
    cv2.ellipse(m, (x, y), (int(r), int(max(4, r * rng.uniform(0.55, 0.9)))), a, 0, 360, 1, -1)
    cv2.ellipse(m, (int(x + np.cos(np.radians(a)) * r * 0.5), int(y + np.sin(np.radians(a)) * r * 0.5)), (int(r * 0.6), int(r * 0.45)), a + 40, 0, 360, 1, -1)
    m = (m > 0) & (dg >= 3)
    lab[m] = WATER; land[m] = 0
print('lake and ponds', len(ponds), file=sys.stderr)

# ---------- fill: rows of buildings along every street, with parking lots, gas stations, plazas and pocket parks in the row;
#            then the insides of the blocks (more buildings, container yards at the docks, courtyard parks) ----------
R = 8                                                  # fill raster: world units per cell
FW, FH = W * S // R, H * S // R
up = lambda m: cv2.resize(m.astype(np.uint8), (FW, FH), interpolation=cv2.INTER_NEAREST) > 0
free = up((lab == LAND) & (land > 0) & (lm_mask == 0))
RH = ROAD_W / 2; FRONT = RH + SW + PAD + 2             # building fronts stand this far from the road centre line
blk = np.zeros((FH, FW), np.uint8)
for e in out_edges:
    cv2.polylines(blk, [np.round(np.array(e['p'], float) / R * 8).astype(np.int32)], False, 1, thickness=int(round(2 * (FRONT - 14) / R)), shift=3)   # drawn a little narrow: rasterising widens it
for x, y in nodes: cv2.circle(blk, (int(round(x * S / R)), int(round(y * S / R))), int(round((FRONT + 6) / R)), 1, -1)
free &= blk == 0
def rect_pts(cx, cy, w, h, a):
    ca, sa = np.cos(a), np.sin(a)
    return np.array([[cx + ca * u - sa * v, cy + sa * u + ca * v] for u, v in [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]])
def poly_mask(pts):
    q = pts / R; x0, y0 = np.floor(q.min(0)).astype(int) - 1; x1, y1 = np.ceil(q.max(0)).astype(int) + 2
    if x0 < 0 or y0 < 0 or x1 > FW or y1 > FH: return None
    m = np.zeros((y1 - y0, x1 - x0), np.uint8); cv2.fillPoly(m, [np.round((q - [x0, y0]) * 8).astype(np.int32)], 1, shift=3)
    return x0, y0, m > 0
def fits(pts):
    pm = poly_mask(pts)
    if pm is None: return False
    x0, y0, m = pm; return bool(free[y0:y0 + m.shape[0], x0:x0 + m.shape[1]][m].all())
def take(pts):
    pm = poly_mask(pts)
    if pm is not None: x0, y0, m = pm; free[y0:y0 + m.shape[0], x0:x0 + m.shape[1]][m] = False
for b in bl:                                           # the map's own buildings and the props already placed keep their ground
    take(rect_pts(b[0], b[1], b[2] + 2 * PAD + 8, b[3] + 2 * PAD + 8, np.radians(b[4])))
for q in props: take(rect_pts(q['x'], q['y'], 260, 260, 0))
# per district: chance to leave a gap, frontage width, depth, spacing, and chances of a lot / pocket park / plaza / gas station
FILLP = {
    'PALM HEIGHTS': dict(skip=0.04, w=(90, 170), d=(90, 160), gap=(6, 14), lot=0.06, park=0.04, plaza=0.05, gas=0.05),
    'MERCADO':      dict(skip=0.05, w=(50, 90), d=(50, 90), gap=(10, 24), lot=0.04, park=0.07, plaza=0.02, gas=0.05),
    'DOCKSIDE':     dict(skip=0.12, w=(120, 220), d=(100, 170), gap=(14, 30), lot=0.06, park=0.0, plaza=0.0, gas=0.06),
    'SKYPORT':      dict(skip=0.6, w=(110, 200), d=(90, 150), gap=(20, 50), lot=0.12, park=0.0, plaza=0.0, gas=0.05),
    'SEAVIEW':      dict(skip=0.05, w=(80, 150), d=(80, 140), gap=(8, 18), lot=0.06, park=0.05, plaza=0.03, gas=0.05),
    'SUNSTRIP':     dict(skip=0.04, w=(80, 150), d=(80, 140), gap=(6, 14), lot=0.06, park=0.04, plaza=0.05, gas=0.05),
    'CORAL SHORE':  dict(skip=0.04, w=(70, 130), d=(80, 130), gap=(6, 12), lot=0.05, park=0.04, plaza=0.05, gas=0.05),
    'PEARL KEY':    dict(skip=0.2, w=(70, 110), d=(70, 110), gap=(40, 70), lot=0.0, park=0.0, plaza=0.0, gas=0.0),
    'HERON KEY':    dict(skip=0.2, w=(70, 110), d=(70, 110), gap=(30, 60), lot=0.0, park=0.0, plaza=0.0, gas=0.0),
    'FAIRWAY ISLES': dict(skip=0.5, w=(70, 110), d=(70, 110), gap=(40, 80), lot=0.0, park=0.0, plaza=0.0, gas=0.0),
    'GULL ROCKS':   dict(skip=0.4, w=(60, 100), d=(60, 100), gap=(30, 60), lot=0.0, park=0.0, plaza=0.0, gas=0.0)}
DEFP = dict(skip=0.08, w=(60, 110), d=(60, 110), gap=(12, 26), lot=0.03, park=0.06, plaza=0.02, gas=0.03)
fillb, lots, parks, gas_at = [], [], [], []
def along(P, cum, t):                                  # point and unit tangent at arc length t of a polyline
    k = min(np.searchsorted(cum, t, side='right') - 1, len(P) - 2); d = P[k + 1] - P[k]; l = np.linalg.norm(d) or 1
    return P[k] + d * ((t - cum[k]) / l), d / l
for e in out_edges:
    P = np.array(e['p'], float); cum = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(P, axis=0), axis=1))]); total = cum[-1]
    for side in (1, -1):
        t = 8.0
        while t < total - 40:
            mid, _ = along(P, cum, t); prof = FILLP.get(district(mid[0] / S, mid[1] / S), DEFP)
            if rng.random() < prof['skip']: t += 50; continue
            r = rng.random(); kind = 'b'
            if r < prof['gas'] and all(np.hypot(*(mid - q)) > 1800 for q in gas_at): kind = 'gas'
            elif r < prof['gas'] + prof['lot']: kind = 'lot'
            elif r < prof['gas'] + prof['lot'] + prof['park']: kind = 'park'
            elif r < prof['gas'] + prof['lot'] + prof['park'] + prof['plaza']: kind = 'plaza'
            w, d = {'gas': (rng.uniform(180, 220), rng.uniform(135, 160)), 'lot': (rng.uniform(150, 230), rng.uniform(112, 150)),
                    'park': (rng.uniform(130, 220), rng.uniform(110, 170)), 'plaza': (rng.uniform(120, 180), rng.uniform(100, 140))}.get(kind) or (rng.uniform(*prof['w']), rng.uniform(*prof['d']))
            placed = False
            for fw in ((1,) if kind != 'b' else (1, 0.75, 0.55)):            # lots, parks and stations keep their size or are skipped;
                ww = min(w * fw, total - 6 - t)                                # buildings get narrower and shallower until they fit
                if ww < (150 if kind == 'lot' else 44): break
                q, u = along(P, cum, t + ww / 2); nrm = side * np.array([-u[1], u[0]]); ang = float(np.arctan2(nrm[0], -nrm[1]))   # front faces the street
                for fd in ((1, 0.88) if kind == 'gas' else (1,) if kind != 'b' else (1, 0.8, 0.62, 0.48, 0.36)):
                    dd = d * fd
                    if dd < 40: break
                    c = q + nrm * (FRONT + dd / 2)
                    if fits(rect_pts(c[0], c[1], ww, dd, ang)): placed = True; break
                if placed: break
            if not placed: t += 16; continue
            take(rect_pts(c[0], c[1], ww + 8, dd + 8, ang))
            deg = round(float(np.degrees(ang)), 1); cx, cy = round(float(c[0])), round(float(c[1]))
            if kind == 'b': fillb.append([cx, cy, round(ww), round(dd), deg, -1, 0, 1])
            elif kind == 'lot': lots.append([cx, cy, round(ww), round(dd), deg])
            elif kind == 'gas': props.append({'t': 'gas', 'x': cx, 'y': cy, 'w': round(ww), 'h': round(dd), 'a': deg}); gas_at.append(c)
            elif kind == 'plaza': props.append({'t': 'plaza', 'x': cx, 'y': cy, 'w': round(ww), 'h': round(dd), 'a': deg})
            else:
                parks.append(rect_pts(c[0], c[1], ww, dd, ang))
                if ww > 150 and dd > 120 and rng.random() < 0.45: props.append({'t': 'court', 'x': cx, 'y': cy, 'a': deg})
            t += ww + rng.uniform(*prof['gap'])
print('frontage: buildings', len(fillb), 'lots', len(lots), 'parks', len(parks), 'gas', len(gas_at), 'plazas', sum(1 for q in props if q['t'] == 'plaza'), file=sys.stderr)
segs = [(np.array(e['p'][k], float), np.array(e['p'][k + 1], float)) for e in out_edges for k in range(len(e['p']) - 1)]
def road_dir(x, y):
    best, bd = 0.0, 1e18
    for A, B in segs:
        d = B - A; l2 = d @ d or 1; t = np.clip(((x - A[0]) * d[0] + (y - A[1]) * d[1]) / l2, 0, 1); q = A + d * t; dd = (q[0] - x) ** 2 + (q[1] - y) ** 2
        if dd < bd: bd, best = dd, float(np.arctan2(d[1], d[0]))
    return best
def interior(step_k, size_k, minsz, gapsz, tag):        # buildings on a grid lined up with the nearest street; container yards at the docks
    inner = cv2.erode(free.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=1)
    n_, cc_, st_, cen_ = cv2.connectedComponentsWithStats(inner, 8); nb = nc = 0
    for i in range(1, n_):
        if st_[i, cv2.CC_STAT_AREA] * R * R < minsz * minsz: continue
        cx, cy = cen_[i] * R; dn = district(cx / S, cy / S)
        if dn in ('SKYPORT', 'THE SANDBAR', 'GRAVEL FLATS', 'FAIRWAY ISLES'): continue
        prof = FILLP.get(dn, DEFP); a = road_dir(cx, cy); ca, sa = np.cos(a), np.sin(a)
        half = np.hypot(st_[i, 2], st_[i, 3]) * R / 2 + 40; step = max(minsz, prof['w'][1] * step_k)
        for gy in np.arange(-half, half, step):
            for gx in np.arange(-half, half, step):
                px, py = cx + ca * gx - sa * gy, cy + sa * gx + ca * gy
                if dn == 'DOCKSIDE' and rng.random() < 0.5:
                    if fits(rect_pts(px, py, 200, 76, a)): take(rect_pts(px, py, 216, 92, a)); props.append({'t': 'containers', 'x': round(px), 'y': round(py), 'a': round(float(np.degrees(a)), 1)}); nc += 1
                    continue
                w0, d0 = rng.uniform(*prof['w']) * size_k, rng.uniform(*prof['d']) * size_k
                for f in (1, 0.75, 0.55):
                    ww, dd = max(minsz, w0 * f), max(minsz, d0 * f)
                    if fits(rect_pts(px, py, ww, dd, a)):
                        take(rect_pts(px, py, ww + gapsz, dd + gapsz, a)); fillb.append([round(px), round(py), round(ww), round(dd), round(float(np.degrees(a)), 1), -1, 0, 1]); nb += 1; break
    print(tag, 'buildings', nb, 'container yards', nc, file=sys.stderr)
interior(0.9, 1.1, 60, 16, 'block interiors:')
interior(0.45, 0.6, 46, 12, 'small infill:')
park_img = np.zeros((H, W), np.uint8)
for pts in parks: cv2.fillPoly(park_img, [np.round(pts / S * 8).astype(np.int32)], 1, shift=3)
inner = cv2.erode(free.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2)
n_, cc_, st_, cen_ = cv2.connectedComponentsWithStats(inner, 8)
cy_parks = 0
for i in range(1, n_):
    if st_[i, cv2.CC_STAT_AREA] * R * R < 100 * 100: continue
    cx, cy = cen_[i] * R; dn = district(cx / S, cy / S)
    if dn in ('SKYPORT', 'THE SANDBAR', 'GRAVEL FLATS', 'DOCKSIDE') or rng.random() < 0.15: continue
    park_img |= cv2.resize((cc_ == i).astype(np.uint8), (W, H), interpolation=cv2.INTER_AREA) > 0
    cy_parks += 1
lab[(park_img > 0) & (lab == LAND) & (land > 0)] = GRASS
bl += fillb
print('courtyard parks', cy_parks, 'buildings in all', len(bl), file=sys.stderr)

LM = []
for L in LM_PX:
    o = {'t': L['t']}
    if 'box' in L: x0, y0, x1, y1 = L['box']; o.update(x=round((x0 + x1) / 2 * S), y=round((y0 + y1) / 2 * S), w=(x1 - x0) * S, h=(y1 - y0) * S)
    else: o.update(x=round(L['c'][0] * S), y=round(L['c'][1] * S))
    if 'r' in L: o['r'] = L['r'] * S
    if 'house' in L: x0, y0, x1, y1 = L['house']; o['house'] = [round((x0 + x1) / 2 * S), round((y0 + y1) / 2 * S), (x1 - x0) * S, (y1 - y0) * S]
    LM.append(o)

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

data = {'S': S, 'W': W * S, 'H': H * S, 'roadW': ROAD_W, 'nodes': [[round(x * S), round(y * S)] for x, y in nodes], 'edges': out_edges,
        'land': land_p, 'grass': grass_p, 'sand': sand_p, 'bld': bl, 'lm': LM, 'props': props, 'lots': lots, 'sw': SW,
        'districts': [[nm, [r[0] * S, r[1] * S, r[2] * S, r[3] * S]] for nm, r in DIST], 'start': [560 * S, 652 * S]}
with open(sys.argv[2], 'w') as f:
    f.write("'use strict';\n/* Bay city map, generated by tools/extract_map.py from a reference map image.\n"
            "   Units are world units (S per source pixel). land/grass/sand: polygons {o: outer ring, h: holes}.\n"
            "   nodes/edges: road graph, edge.p is the centre-line polyline. bld: building boxes [cx, cy, w, h, angle deg, block id, inner-side flags N1 S2 W4 E8, 1 = street-front fill].\n   lm: landmarks; props: cranes, containers, planes, gas stations, plazas, courts; lots: parking lots [cx, cy, w, d, angle deg]; sw: sidewalk width. */\nconst MAP = ")
    json.dump(data, f, separators=(',', ':'), default=lambda o: o.item()); f.write(';\n')
