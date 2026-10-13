"""Remodel parts of the generated city in place: js/00-map-data.js (made by tools/build_city.py) is edited, not regenerated, so the
rest of the city stays exactly as it is.

  python3 tools/remodel_city.py [js/00-map-data.js]

What it does (once - a file already remodelled is left alone; MAP.remodel says which version):
  - SKYPORT AIRPORT: everything west of the main north-south avenue, from the hangars down to the south shore, is cleared - streets,
    buildings, parking lots, alleys, yards, the old runways and planes - and laid out as one airfield (MAP.airport): a long north-south
    runway along the west shore, a parallel taxiway with links, an apron with five gates at a terminal hall, three hangars, a control
    tower, a fence round the airside with two gates, a forecourt, and one large parking lot (four lots side by side) on the avenue.
    The south shore road that ran through the airfield now runs along the avenue.
  - MALL PARK: the mall's peninsula becomes one park - lawns, paths, a pond (water) - with a paved ring round the mall; the loose
    buildings there go.
  - Later versions (2 to 15): see the comment above each remodelN below.
Needs shapely 2."""
import json, math, sys
from shapely.geometry import Polygon, MultiPolygon, LineString, Point, box
from shapely.ops import unary_union
from shapely import affinity

SRC = sys.argv[1] if len(sys.argv) > 1 else 'js/00-map-data.js'
VERSION = 1
RH, SW = 66, 22                                                       # road half width, sidewalk


def load():
    s = open(SRC, encoding='utf-8').read(); i = s.index('const MAP = ') + 12; j = s.rindex('}') + 1
    return s[:i], json.loads(s[i:j]), s[j:]


def poly(p): g = Polygon(p['o'], p.get('h') or []); return g if g.is_valid else g.buffer(0)
def rings(g, k=None):                                                 # shapely -> [{o, h}] (rounded)
    out = []
    for q in (g.geoms if hasattr(g, 'geoms') else [g]):
        if q.is_empty or q.area < 400 or q.geom_type != 'Polygon': continue
        d = {'o': [[round(x), round(y)] for x, y in list(q.exterior.coords)[:-1]], 'h': [[[round(x), round(y)] for x, y in list(h.coords)[:-1]] for h in q.interiors if Polygon(h).area > 400]}
        if k: d['k'] = k
        out.append(d)
    return out
def rect(cx, cy, w, h, a):                                            # a rotated rectangle like the map's [cx, cy, w, d, angle]
    return affinity.rotate(box(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), a, origin=(cx, cy))


def remodel(M):
    LAND = unary_union([poly(p) for p in M['land']])

    # ---------- the airfield ----------
    CUT = Polygon([(0, 9720), (3140, 9720), (3140, 9990), (3975, 9990), (3975, 10850), (3790, 11030), (3790, 11200), (4040, 11200), (4040, 20000), (0, 20000)])
    AIR = CUT.intersection(LAND)
    if hasattr(AIR, 'geoms'): AIR = max(AIR.geoms, key=lambda g: g.area)
    MALL_L = next(L for L in M['lm'] if L['t'] == 'mall')
    PEN = LAND.intersection(box(10650, 0, 12900, 3160 - RH - SW)).difference(unary_union([poly(p) for p in M['sand']]).buffer(6))
    if hasattr(PEN, 'geoms'): PEN = max(PEN.geoms, key=lambda g: g.area)
    CLEAR = unary_union([AIR, PEN])
    AVE = [[4748, 13752], [4228, 13752], [4128, 13652], [4128, 11960]]    # the south shore road, turned up the avenue
    CORR = LineString([(4228, 13752), (4128, 13652), (4128, 12600)]).buffer(RH + SW + 2)   # ... and the ground its new stretch needs
    GONE = unary_union([CLEAR, CORR])

    # buildings, lots, alleys inside the cleared ground go; building indices are remapped (lots and services point at them)
    keep_b = [k for k, b in enumerate(M['bld']) if not CLEAR.contains(Point(b[0], b[1])) and not CORR.intersects(rect(*b[:5]))]
    bmap = {old: new for new, old in enumerate(keep_b)}
    M['bld'] = [M['bld'][k] for k in keep_b]
    lots = []
    for L in M['lots']:
        if CLEAR.contains(Point(L[0], L[1])) or CORR.intersects(rect(*L[:5])): continue
        L = list(L); L[6] = bmap.get(L[6], -1) if len(L) > 6 and L[6] is not None and L[6] >= 0 else -1; lots.append(L)
    lmap = {}
    old_lots = M['lots']; M['lots'] = lots
    for k, L in enumerate(old_lots):
        for n, L2 in enumerate(lots):
            if L2[0] == L[0] and L2[1] == L[1]: lmap[k] = n
    for kind in ('police', 'hospital'):
        M['services'][kind] = [[bmap[b], lmap.get(l, -1) if l is not None and l >= 0 else -1] for b, l in M['services'][kind] if b in bmap]
    M['alleys'] = [a for a in M['alleys'] if not GONE.intersects(rect(a[0], a[1], a[2], a[3], a[4]).buffer(-2))]
    M['yards'] = [y for g in M['yards'] for y in rings(poly(g).difference(GONE.buffer(2)), g.get('k'))]
    M['grass'] = [y for g in M['grass'] for y in rings(poly(g).difference(GONE.buffer(2)))]
    M['props'] = [p for p in M['props'] if not (p['t'] in ('runway', 'plane') or GONE.contains(Point(p['x'], p['y'])))]
    M['lm'] = [L for L in M['lm'] if L['t'] not in ('terminal', 'tower', 'hangars', 'apron')]

    # streets: the south shore road keeps to the avenue; streets through the cleared ground go; nodes left without a street go
    N = M['nodes']; edges = []
    for e in M['edges']:
        if e['p'][0] == [4748, 13752] and e['p'][-1] == [4128, 11960]: e = dict(e, p=AVE)
        if LineString(e['p']).intersects(CLEAR.buffer(-4)): continue
        edges.append(e)
    used = sorted({e['a'] for e in edges} | {e['b'] for e in edges}); nmap = {old: new for new, old in enumerate(used)}
    M['nodes'] = [N[k] for k in used]
    for e in edges: e['a'] = nmap[e['a']]; e['b'] = nmap[e['b']]
    M['edges'] = edges

    # ---------- the airport layout ----------
    RX, RW, TX, TW = 1750, 150, 2250, 90                              # runway and taxiway centre lines (x), widths
    FX = 3120                                                          # the fence between the hangars and the car park
    inner = AIR.buffer(-120)
    ys = [y for y in range(9800, 16000, 10) if inner.contains(Point(RX, y))]
    RY0, RY1 = max(ys[0], 10060), min(ys[-1], 14900)                   # the runway ends, on land
    links = [RY0 + 190, 12450, RY1 - 190]
    APRON = box(TX + TW / 2, 11240, 3330, 13060)
    TERM = [3330, 11280, 3780, 12960]
    stands = [{'x': 3170, 'y': y, 'a': 0} for y in (11470, 11795, 12120, 12445, 12770)]   # nose east, to the terminal
    HANG = {'x': 2760, 'y': 10330, 'w': 660, 'h': 400}
    HAPRON = box(TX + TW / 2, 10530, FX - 20, 10760)
    TOWER = [3620, 13190]
    gates = [{'x': 2350, 'y': 9760, 'a': 0, 'w': 130}, {'x': 4000, 'y': 13360, 'a': 90, 'w': 130}]
    SERVICE = unary_union([box(2295, 9690, 2405, 10530), box(3200, 13300, 4040, 13420), box(3200, 13060, 3320, 13420)]).intersection(LAND)   # service roads from the gates
    LOTS = [[x, 10440, 800, 200, -90.0, 2, -1, 0.3] for x in (3275, 3475, 3675, 3875)]   # one large lot: four two-row lots side by side, open to the street on the north
    M['lots'] += LOTS
    lot_g = unary_union([rect(L[0], L[1], L[2], L[3], L[4]) for L in LOTS]).buffer(2, join_style=2)
    FORE = box(3780, 11200, 4040 - 2, 12960)
    LANDSIDE = unary_union([box(FX + 4, 9990, 3975, 11240), FORE]).intersection(AIR).difference(lot_g)   # the forecourt and the paving round the car park
    M['yards'] += rings(LANDSIDE, 'p')
    M['yards'] += rings(unary_union([APRON, HAPRON, SERVICE]).intersection(LAND), 'ap')
    # the fence: the airside edge facing the city (the water side needs none), with a gap at each gate
    fence = [[(0, 9760), (FX, 9760), (FX, 11240), (3330, 11240), (3330, 11280)], [(3330, 12960), (3330, 13060), (4000, 13060), (4000, 20000)]]
    segs = []
    for f in fence:
        line = LineString(f).intersection(AIR.buffer(-6))
        for part in (line.geoms if hasattr(line, 'geoms') else [line]):
            if part.is_empty or part.length < 20: continue
            for gt in gates:                                           # cut the gate openings out
                part = part.difference(Point(gt['x'], gt['y']).buffer(gt['w'] / 2, cap_style=3))
            for q in (part.geoms if hasattr(part, 'geoms') else [part]):
                if q.length >= 20: segs.append([[round(x), round(y)] for x, y in q.coords])
    FIELD = AIR.difference(unary_union([box(FX, 9760, 3975, 11240), FORE.buffer(2), box(TERM[0], TERM[1], TERM[2], TERM[3])]))   # short grass round the paving
    M['airport'] = {
        'field': rings(FIELD),
        'runway': {'x': RX, 'y0': RY0, 'y1': RY1, 'w': RW},
        'taxiways': [[[TX, links[0]], [TX, links[2]]]] + [[[RX, y], [TX, y]] for y in links],
        'tw': TW, 'twx': TX, 'links': links,
        'lane': 2800,                                                  # the taxi lane along the apron, in front of the gates
        'apron': [TX + TW / 2, 11240, 3330, 13060],
        'terminal': TERM, 'stands': stands, 'hangars': HANG, 'tower': TOWER,
        'fence': segs, 'gates': gates,
    }

    # ---------- the mall park ----------
    mall = box(MALL_L['x'] - MALL_L['w'] / 2, MALL_L['y'] - MALL_L['h'] / 2, MALL_L['x'] + MALL_L['w'] / 2, MALL_L['y'] + MALL_L['h'] / 2)
    ml, mt, mr, mb = mall.bounds
    PC = (11150, 1850)                                                 # the pond, with a path round it
    pond = affinity.scale(Point(*PC).buffer(1), 210, 140).intersection(PEN.buffer(-60))
    loop = affinity.scale(Point(*PC).buffer(1), 280, 210).exterior
    ring = mall.buffer(70, join_style=2).difference(mall.buffer(4, join_style=2))
    drive = box(ml + 0.3 * MALL_L['w'], mb, mr - 0.3 * MALL_L['w'], 3160 - RH - SW).intersection(LAND)   # the mall's driveway into its south car park
    paths = [[(11300, 3075), (11300, 2750), (ml - 70, 2600)],
             [(11300, 2750), (PC[0], 2450), (PC[0], PC[1] + 210)],
             [(PC[0] + 280, PC[1]), (ml - 70, 1900)],
             [(MALL_L['x'], mt - 70), (MALL_L['x'], 1640), (12280, 1680), (12480, 1950), (12500, 2600), (12450, 3075)],
             [(mr + 70, 2400), (12500, 2400)],
             [(PC[0], PC[1] - 210), (11400, 1600), (MALL_L['x'], 1640)]]
    walks = unary_union([LineString(p).buffer(16) for p in paths] + [loop.buffer(16), ring]).intersection(PEN)
    walks = walks.difference(pond.buffer(20)).difference(mall.buffer(4, join_style=2)).difference(drive.buffer(2))
    M['grass'] += rings(PEN.difference(mall.buffer(70, join_style=2)).difference(pond.buffer(2)))
    M['yards'] += rings(walks, 'pk') + rings(drive, 'p')
    M['park'] = {'pond': [PC[0], PC[1], 210, 140]}
    land = []                                                          # the pond is water: a hole in the land
    for p in M['land']:
        g = poly(p)
        if g.contains(pond): g = g.difference(pond)
        land += rings(g)
    M['land'] = land
    M['remodel'] = VERSION
    return M



# ======================================================================================================================================
# version 2: the port at Dockside, the lunapark on Heron Key, the space center at Gravel Flats, the military base north of the airport,
# roads from the airport gates
def largest(g): return max(g.geoms, key=lambda q: q.area) if hasattr(g, 'geoms') else g
def rbox(x0, y0, x1, y1, r): return box(x0, y0, x1, y1).buffer(-r).buffer(r)          # a box with round corners
def pts(line): return [[round(x), round(y)] for x, y in line.coords]


def drop_streets(M, gone):                                            # streets for which gone(edge) is true go, and nodes left without one
    N = M['nodes']; edges = [e for e in M['edges'] if not gone(e)]
    used = sorted({e['a'] for e in edges} | {e['b'] for e in edges}); nmap = {old: new for new, old in enumerate(used)}
    M['nodes'] = [N[k] for k in used]
    for e in edges: e['a'] = nmap[e['a']]; e['b'] = nmap[e['b']]
    M['edges'] = edges


def node_at(M, x, y):                                                 # the node at (x, y), made if there is none
    for k, n in enumerate(M['nodes']):
        if abs(n[0] - x) < 1 and abs(n[1] - y) < 1: return k
    M['nodes'].append([x, y]); return len(M['nodes']) - 1


def clear_ground(M, AREA, streets=False):
    """Buildings, lots, alleys, yards, grass, sand, props and landmarks in AREA go (building and lot indices are remapped); with streets
    the streets through it go too. Returns the services (police, hospital) that stood there."""
    keep_b = [k for k, b in enumerate(M['bld']) if rect(*b[:5]).intersection(AREA).area < 0.3 * b[2] * b[3]]
    bmap = {old: new for new, old in enumerate(keep_b)}
    gone = [(kind, M['bld'][b]) for kind in ('police', 'hospital') for b, l in M['services'][kind] if b not in bmap]
    M['bld'] = [M['bld'][k] for k in keep_b]
    lots, lmap = [], {}
    for k, L in enumerate(M['lots']):
        if rect(*L[:5]).intersection(AREA).area > 0.3 * L[2] * L[3]: continue
        L = list(L); L[6] = bmap.get(L[6], -1) if L[6] is not None and L[6] >= 0 else -1; lmap[k] = len(lots); lots.append(L)
    M['lots'] = lots
    for kind in ('police', 'hospital'):
        M['services'][kind] = [[bmap[b], lmap.get(l, -1) if l is not None and l >= 0 else -1] for b, l in M['services'][kind] if b in bmap]
    M['alleys'] = [a for a in M['alleys'] if not AREA.intersects(rect(*a[:5]).buffer(-2))]
    for key in ('yards', 'grass', 'sand'):
        M[key] = [y for g in M[key] for y in rings(poly(g).difference(AREA.buffer(2)), g.get('k'))]
    M['props'] = [p for p in M['props'] if not AREA.contains(Point(p['x'], p['y']))]
    M['lm'] = [L for L in M['lm'] if not AREA.contains(Point(L['x'], L['y']))]
    if streets: drop_streets(M, lambda e: LineString(e['p']).intersects(AREA.buffer(-4)))
    return gone


def move_services(M, gone, avoid=None):                              # services that stood on cleared ground move to the nearest building with a lot of its own
    for kind, b in gone:
        taken = {i for k in ('police', 'hospital') for i, l in M['services'][k]}
        own = {L[6]: n for n, L in enumerate(M['lots']) if L[6] is not None and L[6] >= 0}
        cand = [(math.hypot(B[0] - b[0], B[1] - b[1]), i) for i, B in enumerate(M['bld']) if i in own and i not in taken and not B[7] and min(B[2], B[3]) >= 80
                and not (avoid and avoid.contains(Point(B[0], B[1])))]
        i = min(cand)[1]; M['services'][kind].append([i, own[i]]); print('the %s at %s moves to building %d at %s' % (kind, b[:2], i, M['bld'][i][:2]))


def edit_land(M, at, fn):                                              # the land polygon holding point `at` becomes fn(it)
    out = []
    for p in M['land']:
        g = poly(p)
        out += rings(fn(g)) if g.contains(Point(*at)) else [p]
    M['land'] = out


def fence_line(ring, gates):                                          # a closed fence (a polygon's outline) with a gap at each gate: polylines
    line = LineString(list(ring.coords))
    for gt in gates: line = line.difference(Point(gt['x'], gt['y']).buffer(gt['w'] / 2, cap_style=3))
    return [pts(q) for q in (line.geoms if hasattr(line, 'geoms') else [line]) if q.length >= 20]


def remodel2(M):
    LAND = unary_union([poly(p) for p in M['land']])
    A = M['airport']

    # ---------- the military base: the peninsula north of the airport street ----------
    BASE = largest(LAND.intersection(box(0, 7000, 3880, 9542)))
    clear_ground(M, BASE, streets=True)
    M['edges'].append({'a': node_at(M, 3228, 9900), 'b': node_at(M, 1500, 9630), 'p': [[3228, 9900], [3228, 9630], [1500, 9630]]})   # the airport street, now ending at the base
    B_IN = BASE.buffer(-95)
    gate = {'x': 2000, 'y': 9520, 'a': 0, 'w': 150}
    roads = [[[2000, 9542], [2000, 8540]], [[1450, 9050], [3650, 9050]], [[3300, 9050], [3300, 9150]]]
    towers = [[1420, 9440], [3760, 9440], [2040, 7790], [1540, 8560], [3400, 8640], [2700, 9440]]
    bld = [  # t, cx, cy, w, h (axis aligned)
        ['hq', 2240, 8800, 300, 150], ['barracks', 1640, 8820, 230, 110], ['barracks', 2720, 8790, 260, 110], ['barracks', 3150, 8860, 220, 110],
        ['mess', 2700, 8600, 220, 110], ['garage', 3220, 9300, 760, 70], ['guard', 2110, 9430, 60, 50], ['fuel', 3600, 9180, 90, 90]]
    motor = [2840, 9120, 3700, 9250]                                    # the motor pool: tanks and APCs in a row, nose to the road
    veh = [['tank', 2930, 9190, -90], ['tank', 3090, 9190, -90], ['apc', 3250, 9190, -90], ['apc', 3410, 9190, -90], ['apc', 3570, 9190, -90]]
    heli = [1650, 9230, 115]
    parade = [2250, 9120, 2650, 9400]; flag = [2450, 9150]
    arm = box(1780, 8100, 2470, 8540).intersection(B_IN); ammo = box(1985, 8200, 2265, 8400)
    arm_gate = {'x': 2000, 'y': 8540, 'a': 0, 'w': 110}; ammo_gate = {'x': 2125, 'y': 8400, 'a': 0, 'w': 80}
    for t, x, y, w, h in bld: assert B_IN.buffer(30).contains(box(x - w / 2, y - h / 2, x + w / 2, y + h / 2)), t
    for x, y in towers: assert BASE.buffer(-20).contains(Point(x, y)), (x, y)
    outer, inner = BASE.buffer(-28).exterior, BASE.buffer(-62).exterior
    M['yards'] += rings(BASE.buffer(-4), 'mb')
    M['base'] = {
        'area': rings(BASE), 'gate': gate, 'fence': fence_line(outer, [gate]) + fence_line(inner, [gate]),
        'roads': roads, 'rw': 90, 'towers': towers, 'buildings': [{'t': t, 'x': x, 'y': y, 'w': w, 'h': h} for t, x, y, w, h in bld],
        'motor': motor, 'vehicles': veh, 'helipad': heli, 'parade': parade, 'flag': flag,
        'armoury': {'ring': pts(arm.exterior), 'gate': arm_gate, 'fence': fence_line(arm.exterior, [arm_gate])},
        'ammo': {'ring': pts(ammo.exterior), 'gate': ammo_gate, 'fence': fence_line(ammo.exterior, [ammo_gate])},
        'bunker': [2125, 8270, 170, 80],
    }

    # ---------- the airport: roads from the two gates ----------
    A['roads'] = [[[2350, 9690], [2350, 10560]], [[4040, 13360], [3260, 13360], [3260, 13060]]]
    A['rw'] = 96

    # ---------- the space center at Gravel Flats ----------
    SP = largest(LAND.intersection(box(2500, 300, 4660, 2800)))
    gone = clear_ground(M, SP, streets=True)
    move_services(M, gone)                                             # its police station moves to the nearest building with a lot of its own
    sgate = {'x': 4630, 'y': 1450, 'a': 90, 'w': 140}
    M['space'] = {
        'area': rings(SP), 'fence': fence_line(SP.buffer(-30).exterior, [sgate]), 'gate': sgate,
        'pad': [2960, 1450, 170], 'tower': [2960, 1340], 'vab': [4150, 1450, 360, 300], 'lcc': [4180, 1880, 260, 110], 'office': [3850, 880, 300, 120],
        'tanks': [[3060, 1130, 46], [3060, 1770, 40]], 'water': [3260, 1190], 'masts': [[2800, 1290], [2800, 1610], [3120, 1290], [3120, 1610]],
        'crawlerway': [[3140, 1450], [3970, 1450]], 'cw': 130, 'crawler': [3720, 1450], 'road': [[4660, 1450], [4330, 1450], [4330, 1880]],
        'garden': [4450, 1120], 'lot': [3850, 1060, 300, 120],
    }
    M['lots'].append([3850, 1060, 300, 120, 0.0, 2, -1, 0.6])             # staff parking by the office

    # ---------- the lunapark on Heron Key: the island grows south and west, the street keeps to its north and east edge ----------
    HK = (9700, 3300); PB = rbox(9230, 2640, 10530, 4430, 160)
    edit_land(M, HK, lambda g: g.union(PB))
    LAND = unary_union([poly(p) for p in M['land']])
    ISL = largest(LAND.intersection(box(9050, 1800, 10650, 4600)))
    LP = ISL.intersection(PB).difference(box(9000, 0, 10700, 2690)).difference(box(10072, 0, 10700, 3250))
    LP = largest(LP).buffer(-12)
    clear_ground(M, LP.buffer(10))
    street = unary_union([LineString(e['p']).buffer(RH + SW + 2) for e in M['edges'] if LineString(e['p']).intersects(ISL)])
    clear_ground(M, ISL.difference(LP.buffer(10)).difference(street))     # the north end: the car park
    lgate = {'x': 9650, 'y': LP.bounds[1], 'a': 0, 'w': 120}
    M['lots'] += [[9640, 2300, 520, 200, 0.0, 2, -1, 0.5], [10140, 2340, 240, 200, 0.0, 2, -1, 0.5]]
    rides = [
        {'t': 'woodie', 'x0': 9300, 'y0': 2830, 'x1': 9450, 'y1': 4350}, {'t': 'looper', 'x0': 10110, 'y0': 3310, 'x1': 10465, 'y1': 3990},
        {'t': 'flume', 'x0': 10080, 'y0': 4050, 'x1': 10455, 'y1': 4360}, {'t': 'wheel', 'x': 9900, 'y': 2880, 'd': 300},
        {'t': 'carousel', 'x': 9650, 'y': 3110, 'r': 60}, {'t': 'swings', 'x': 9560, 'y': 3480, 'r': 70}, {'t': 'tower', 'x': 9830, 'y': 3330, 'h': 300},
        {'t': 'pirate', 'x': 9840, 'y': 3760, 'a': 0}, {'t': 'piazza', 'x': 9990, 'y': 3560, 'r': 90},
        {'t': 'skyride', 'a': [9530, 2880], 'b': [10000, 4250]}, {'t': 'village', 'x0': 9490, 'y0': 3950, 'x1': 9780, 'y1': 4370},
        {'t': 'booths', 'x0': 9620, 'y0': 3640, 'x1': 9720, 'y1': 3880}]
    stands = [[9540, 2960], [9800, 3060], [10010, 3330], [9700, 3640], [9930, 4130], [9600, 3820], [10030, 2990]]
    train = LP.buffer(-28).exterior
    beds = [rbox(9480, 3200, 9580, 3330, 30), rbox(9700, 3450, 9760, 3560, 25), rbox(9880, 3950, 10030, 4040, 30), rbox(10180, 3995, 10440, 4040, 15),
            rbox(9470, 3600, 9560, 3760, 30), rbox(9960, 3700, 10060, 3880, 30), rbox(9470, 2990, 9600, 3070, 25), rbox(9700, 2990, 9760, 3060, 20),
            Point(9830, 3330).buffer(95), Point(9560, 3480).buffer(105), Point(9650, 3110).buffer(90), rbox(9600, 3900, 9760, 3945, 15)]
    taken = unary_union([box(r['x0'], r['y0'], r['x1'], r['y1']).buffer(12) for r in rides if 'x0' in r and r['t'] not in ('village',)] +
                        [Point(r['x'], r['y']).buffer({'tower': 30, 'swings': 60, 'carousel': 66, 'wheel': 170, 'piazza': 95, 'pirate': 90}.get(r['t'], 40)) for r in rides if 'x' in r] +
                        [Point(x, y).buffer(48) for x, y in stands] + [box(r['x0'], r['y0'], r['x1'], r['y1']).buffer(10) for r in rides if r['t'] == 'village'])
    lawns = unary_union(beds).difference(taken).intersection(LP.buffer(-40))
    M['grass'] += rings(lawns)
    M['yards'] += rings(LP.difference(lawns.buffer(1)), 'lp')                # the paved park with the lawns left open
    M['lunapark'] = {'area': rings(LP), 'fence': fence_line(LP.exterior, [lgate]), 'gate': lgate, 'rides': rides, 'stands': stands, 'train': pts(train)}

    # ---------- the port: Dockside becomes one port; straight quays on the east and south shore ----------
    QE, QS, QN = 7000, 14800, 12110
    edit_land(M, (5500, 13000), lambda g: g.union(box(5000, QN, QE, QS)).union(box(4660, 14000, 4740, 14400))
              .difference(box(QE, QN, 8000, 16500)).difference(box(4990, QS, QE, 16500)))
    LAND = unary_union([poly(p) for p in M['land']])
    PORT = largest(LAND.intersection(box(4240, 11200, 7600, 16000)))
    clear_ground(M, PORT)
    for e in M['edges']:                                                # the street round the east blocks runs straight down to the shore street
        if e['p'][0] == [6274, 12790] and e['p'][-1] == [5463, 13752]: e['p'] = [[6274, 12790], [6274, 13752], [5463, 13752]]
    maint = box(4846, 12888, 5365, 13654)                               # the maintenance yard: workshops, junk, spare parts
    M['yards'] += rings(PORT.buffer(-2).difference(maint), 'q')
    berths = [{'x': QE + 72, 'y': y, 'a': 90, 'q': 'e'} for y in (12530, 13350, 14170)] + [{'x': x, 'y': QS + 72, 'a': 180, 'q': 's'} for x in (5450, 6300)]
    cranes = []
    for i, b in enumerate(berths):
        for d in (-190, 190):
            if b['q'] == 'e': cranes.append({'berth': i, 'x': QE - 130, 'y': b['y'] + d, 'a': 0, 'lo': b['y'] - 330, 'hi': b['y'] + 330})
            else: cranes.append({'berth': i, 'x': b['x'] + d, 'y': QS - 130, 'a': 90, 'lo': b['x'] - 330, 'hi': b['x'] + 330})
    stacks = []                                                         # blocks of 20 ft containers: [x0, y0, x1, y1, along x?]
    for y0 in (12160, 12740, 13320):
        for x0 in (6410, 6560): stacks.append([x0, y0, x0 + 125, y0 + 520, 0])
    for y0 in (13920, 14130, 14340):
        for x0 in (5060, 5720, 6380):
            if x0 + 560 <= 6700: stacks.append([x0, y0, x0 + 560, y0 + 125, 1])
    for x0, y0, x1, y1 in ([5590, 12920, 6150, 13050], [5590, 13110, 6150, 13240], [5590, 13300, 6150, 13430], [5590, 13490, 6150, 13620]):
        stacks.append([x0, y0, x1, y1, 1])                              # the empty-container depot
    sheds = [  # warehouses and workshops: [cx, cy, w, d, kind, height]
        [4600, 11380, 700, 230, 'warehouse', 60], [4600, 11700, 700, 230, 'warehouse', 54], [5420, 11420, 430, 290, 'warehouse', 64],
        [5950, 11440, 400, 290, 'warehouse', 58], [5100, 12370, 450, 300, 'warehouse', 60], [5870, 12370, 560, 300, 'warehouse', 66],
        [4440, 12500, 300, 700, 'warehouse', 50], [5000, 13050, 280, 180, 'warehouse', 44], [5250, 13390, 200, 220, 'warehouse', 40],
        [4440, 13350, 300, 300, 'office', 70]]
    blk = len({b[5] for b in M['bld']}) + 5000
    for k, (x, y, w, d, kind, h) in enumerate(sheds): M['bld'].append([x, y, w, d, 0.0, blk + k, 0, 0, kind, h])
    M['yards'] += rings(maint, 'y')
    M['port'] = {'quays': [[[QE, QN], [QE, QS]], [[5000, QS], [QE, QS]]], 'berths': berths, 'cranes': cranes, 'stacks': stacks,
                 'tugs': [[4600, 14260, 90], [4800, 14300, 90]], 'pier': [4660, 14000, 4740, 14400], 'maint': [4846, 12888, 5365, 13654],
                 'lanes': {'e': [7600, 8150], 's': 15275}, 'sea': 17200}
    LANDF = unary_union([poly(p) for p in M['land']])                  # nothing is left lying out over the water
    for key in ('yards', 'grass', 'sand'):
        out = []
        for g in M[key]:
            G = poly(g)
            out += [g] if LANDF.contains(G) else rings(G.intersection(LANDF), g.get('k'))
        M[key] = out
    M['remodel'] = 2
    return M


def split_edge_at(M, pt):                                              # the street through pt is cut there into two, meeting at a new node; returns it
    for k, e in enumerate(M['edges']):
        P = e['p']
        for i in range(len(P) - 1):
            seg = LineString([P[i], P[i + 1]])
            if seg.distance(Point(pt)) < 1 and Point(pt).distance(Point(P[i])) > 1 and Point(pt).distance(Point(P[i + 1])) > 1:
                n = node_at(M, pt[0], pt[1]); a = dict(e, b=n, p=P[:i + 1] + [list(pt)]); b = dict(e, a=n, p=[list(pt)] + P[i + 1:])
                M['edges'][k:k + 1] = [a, b]; return n
    raise ValueError('no street through %s' % (pt,))


def tidy_streets(M):
    """Three generated streets doubled others: one ran over the Seaview street 20 units off, one alongside the Palm Heights avenue 116
    off, one alongside the Coral Shore street 62 off - their sidewalks and junk ended up in the middle of a wide road. The first goes;
    the other two now meet the street they shadowed, and the strips they left become lawn and paving."""
    same = lambda e, pts: e['p'] == pts
    M['edges'] = [e for e in M['edges'] if not same(e, [[11383, 3160], [11383, 3140], [12379, 3140], [12379, 3160]])]
    n1, n2 = split_edge_at(M, (6274, 2871)), split_edge_at(M, (6274, 4210))
    k = next(i for i, e in enumerate(M['edges']) if same(e, [[8172, 2600], [8172, 2871], [6390, 2871], [6390, 4210], [7908, 4210], [7268, 4850]]))
    e = M['edges'][k]
    M['edges'][k:k + 1] = [dict(e, b=n1, p=[[8172, 2600], [8172, 2871], [6274, 2871]]), dict(e, a=n2, p=[[6274, 4210], [7908, 4210], [7268, 4850]])]
    n3 = split_edge_at(M, (9568, 11960))
    k = next(i for i, e in enumerate(M['edges']) if same(e, [[9987, 11960], [9925, 12022], [9568, 12022], [9568, 12594]]))
    e = M['edges'][k]; M['edges'][k] = dict(e, a=n3, p=[[9568, 11960], [9568, 12594]])
    edge = RH + SW                                                     # what a street covers either side of its centre line
    M['grass'] += rings(box(6274 + edge, 2871 + edge, 6390 + edge, 4210 - edge))
    M['yards'] += rings(box(9568 + edge, 11960 + edge, 9925 + 20, 12022 + edge), 'p')


# version 3: a small speedway on the Palm Heights beach (the west shore), between the shore and the backs of the beach-front row: a short
# NASCAR oval (its west straight the front stretch, a grandstand outside it on ground won from the sea, grass in the infield), the paddock
# between the oval and the shore street (the pits: garages, the race booth, the NASCAR special) and an eighth-mile drag strip along the
# beach's east edge, its staging lanes at the south end by the street, the run going north, the braking stretch ending at the beach's north
# tip. The beach north of the oval stays open (reached round the strip's north end). And a long drag strip down the Sandbar (the east
# beach): 600 m timed, for top speed runs and races, its staging lanes at the north end, reached by a lane from the avenue's north corner.
# Each strip has its own race booth by its staging lanes.
def strip_at(sx, sy, ang, run, end, wall, booth, name, sid):     # a drag strip: the staging line's centre, the way it runs (degrees), distances along it
    a = math.radians(ang); ux, uy = math.cos(a), math.sin(a); nx, ny = -uy, ux
    at = lambda d, o: [round(sx + ux * d + nx * o), round(sy + uy * d + ny * o)]
    return {'id': sid, 'name': name, 'sx': sx, 'sy': sy, 'ang': ang, 'hw': 67, 'lanes': [-33, 33], 'apron': -90, 'finish': run, 'end': end, 'wall': wall,
            'booth': at(booth[0], booth[1])}, at
def strip_area(st, pad):                                             # the ground a strip covers, as a polygon
    a = math.radians(st['ang']); ux, uy = math.cos(a), math.sin(a); nx, ny = -uy, ux; w = st['hw'] + pad
    pt = lambda d, o: (st['sx'] + ux * d + nx * o, st['sy'] + uy * d + ny * o)
    return Polygon([pt(st['apron'] - pad, -w), pt(st['wall'] + 20, -w), pt(st['wall'] + 20, w), pt(st['apron'] - pad, w)])
def remodel3(M):
    cx, cy, S, R, w = 4635, 4400, 700, 150, 90                         # the oval: centre, straight length, centre-line radius, track width (long axis north-south)
    yn, ys = cy - S / 2, cy + S / 2                                     # where the straights end
    palm, _ = strip_at(4937, 5640, -90, 2414, 3000, 3050, (-40, 112), 'PALM STRIP', 'palm')   # an eighth of a mile (201 m)
    OVAL = LineString([(cx, yn), (cx, ys)]).buffer(R + w / 2 + 12)      # the track and its walls
    STANDS = [cx - R - w / 2 - 175, cy - 250, cx - R - w / 2 - 40, cy + 250]   # the grandstand outside the front stretch (rising to the west)
    PADDOCK = box(4560, ys + R + 20, 4860, 5735)
    PSTRIP = strip_area(palm, 14)
    WON = unary_union([rbox(4180, yn - R - 70, 4880, ys + R + 120, 150), PADDOCK, PSTRIP.buffer(6, join_style=2)])   # ground won from the sea
    edit_land(M, (4900, 4400), lambda g: g.union(WON))
    LAND = unary_union([poly(p) for p in M['land']])
    AREA = unary_union([rbox(4180, yn - R - 70, 4860, ys + R + 120, 150).intersection(LAND), PADDOCK, PSTRIP, Point(*palm['booth']).buffer(40)]).intersection(LAND)
    # the Sandbar strip: from the beach's north end, south down the middle, clear of the Sail and the Bay Wheel
    sand, at = strip_at(13173, 2100, 87.5, 7200, 9100, 9150, (-40, 130), 'SANDBAR STRIP', 'sand')   # 600 m timed
    access = [[12400, 3060], [12880, 2560], at(-120, 0)]                # the lane from the avenue's north corner (clear of the corner building)
    SAREA = unary_union([strip_area(sand, 14), Point(*sand['booth']).buffer(40), LineString(access).buffer(50)]).intersection(LAND)
    for lm in M['lm']: assert Point(lm['x'], lm['y']).distance(strip_area(sand, 14)) > 150, lm
    gone = clear_ground(M, unary_union([AREA, SAREA]))
    tidy_streets(M)
    move_services(M, gone, AREA)
    assert AREA.buffer(1).contains(OVAL) and AREA.buffer(1).contains(box(*STANDS)), (OVAL.bounds, AREA.bounds)
    assert LAND.buffer(1).contains(strip_area(sand, 14)), 'the Sandbar strip leaves the land'
    inner = LineString([(cx, yn), (cx, ys)]).buffer(R - w / 2 - 8)
    garages = [4572, ys + R + 70, 4632, ys + R + 330]                 # the pit garages along the paddock's west side
    M['grass'] += rings(inner)
    M['yards'] += rings(AREA.difference(inner), 'sp') + rings(SAREA, 'sp')
    M['speedway'] = {'area': rings(AREA), 'oval': {'cx': cx, 'cy': cy, 'S': S, 'R': R, 'w': w}, 'stands': STANDS, 'paddock': list(PADDOCK.bounds),
                     'garages': garages, 'gap': [cx, ys + R + w / 2 + 5, 100], 'booth': [4705, 5640], 'car': [4700, ys + R + 260, -90.0],
                     'strips': [palm, sand], 'access': access, 'aw': 90}
    LANDF = unary_union([poly(p) for p in M['land']])
    for key in ('yards', 'grass', 'sand'):
        M[key] = [g for g in M[key] if LANDF.intersects(poly(g))]
    M['remodel'] = 3
    return M


# version 4: the Colony moves to the Sandbar beach east of the start, three times bigger (MAP.lm colony: x, y, a, w along the front, d, h),
# facing the avenue across a paved forecourt and driveway (two frontage buildings make way), a guests' parking lot north of the drive,
# and its own park with a fountain between the hotel and the sea (grass, paths; MAP.lm colony.park, .fountain). The old Colony lot by the
# hospital gets its own buildings back (they were only hidden at runtime). At the lunapark the two lots north of the road (one half in
# the water) go; a multi-storey car park takes their place (MAP.lunapark.carpark: x, y, w, h, levels, deck height, entry side).
def remodel4(M):
    LAND = unary_union([poly(p) for p in M['land']])
    hx, hy, hw, hd, hh = 11700, 13050, 420, 200, 120                   # the hotel: centre, width along its front (north-south), depth, height
    HOTEL = box(hx - hd / 2, hy - hw / 2, hx + hd / 2, hy + hw / 2)
    DRIVE = box(11070, 12960, hx - hd / 2 + 2, 13115)                  # from the avenue's sidewalk to the front door
    TURN = Point(hx - hd / 2, hy).buffer(120).intersection(box(hx - hd / 2 - 130, hy - 130, hx - hd / 2, hy + 130))   # the turning circle at the door
    LOT = [11425, 12872, 300, 150, 0, 2, -1, 0.5]                       # the guests' lot
    PARK = rbox(hx + hd / 2 + 30, 12790, 12380, 13310, 70)
    fx, fy, fr = 12105, hy, 52                                          # the fountain
    TERRACE = box(hx + hd / 2, hy - hw / 2 + 20, hx + hd / 2 + 30, hy + hw / 2 - 20)
    AREA = unary_union([HOTEL.buffer(8), DRIVE, TURN, rect(*LOT[:5]).buffer(6), PARK, TERRACE])
    assert LAND.buffer(1).contains(unary_union([HOTEL, PARK, DRIVE])), 'the Colony leaves the land'
    gone = clear_ground(M, AREA)
    move_services(M, gone, AREA)
    paths = unary_union([Point(fx, fy).buffer(98).difference(Point(fx, fy).buffer(fr + 14)),             # the ring round the fountain
                         box(hx + hd / 2, fy - 14, 12380, fy + 14), box(fx - 14, 12790, fx + 14, 13310),   # the cross: from the hotel's back door to the beach, and north-south
                         LineString([(hx + hd / 2 + 40, 12830), (fx, fy), (12340, 13270)]).buffer(10)]).intersection(PARK)
    M['grass'] += rings(PARK.difference(paths).difference(Point(fx, fy).buffer(fr + 14)))
    M['yards'] += rings(paths, 'pk') + rings(unary_union([DRIVE, TURN, TERRACE, Point(fx, fy).buffer(fr + 14)]), 'p')
    M['lots'].append(LOT)
    M['lm'] = [L for L in M['lm'] if L['t'] != 'colony']
    M['lm'].append({'t': 'colony', 'x': hx, 'y': hy, 'a': 180, 'w': hw, 'd': hd, 'h': hh, 'park': list(PARK.bounds), 'fountain': [fx, fy, fr],
                    'drive': [11070, 12960, hx - hd / 2, 13115], 'lot': len(M['lots']) - 1})
    # the lunapark's car park
    cpx, cpy, cpw, cph = 10040, 2325, 400, 350                         # its footprint; the way in at its south-east corner, from the road
    CP = box(cpx - cpw / 2, cpy - cph / 2, cpx + cpw / 2, cpy + cph / 2)
    APRON = box(cpx + cpw / 2 - 100, cpy + cph / 2 - 5, cpx + cpw / 2, 2530)
    edit_land(M, (cpx, cpy), lambda g: g.union(CP.buffer(30, join_style=2)).union(APRON))   # solid ground under all of it
    clear_ground(M, unary_union([box(9360, 2150, 10300, 2470), CP.buffer(20), APRON]))
    M['yards'] += rings(unary_union([CP.buffer(12, join_style=2), APRON]), 'p')
    M['lunapark']['carpark'] = {'x': cpx, 'y': cpy, 'w': cpw, 'h': cph, 'levels': 4, 'dh': 30, 'entry': 's'}
    LANDF = unary_union([poly(p) for p in M['land']])
    for key in ('yards', 'grass', 'sand'):
        M[key] = [g for g in M[key] if LANDF.intersects(poly(g))]
    M['remodel'] = 4
    return M


# version 5: plots for the safehouses that are houses (js/01q, js/08s, js/10l). MAP.safe.<id> = {x, y, w, d, a, drive}: the plot's centre,
# its width along the street and its depth, the way its front faces (degrees: 0 east, 90 south, 180 west, 270 north; the mansion's 45:
# south-east) and the driveway from the plot's front to the street [x, y, length, width]. The trailer takes a gravel yard and two shops
# on a Coral Shore street; the bungalow a plot on Heron Key's east shore with a new beach beyond it; the mansion a corner of the golf
# links by the diagonal street; the houseboat lies at the port's west quay (MAP.safe.houseboat.deck and .plank: walked on like land, js/04).
def remodel5(M):
    safe = {}
    def plot(key, cx, cy, w, d, a, drive, kind):                       # drive: [x, y, length, width] from the front to the street
        B = rect(cx, cy, d, w, a); D = rect(drive[0], drive[1], drive[2], drive[3], a)
        safe[key] = {'x': cx, 'y': cy, 'w': w, 'd': d, 'a': a, 'drive': drive}
        gone = clear_ground(M, unary_union([B, D]).buffer(4)); move_services(M, gone, B)
        M[kind[0]] += rings(B, kind[1]) if kind[1] else rings(B)
        M['yards'] += rings(D, 'p')
    plot('trailer', 9324, 13820, 170, 288, 0, [9487, 13862, 38, 64], ('yards', 'y'))       # a fenced gravel yard facing the street to the east
    edit_land(M, (10350, 2800), lambda g: g.union(rbox(10380, 2610, 10600, 2970, 60)))      # Heron Key: a beach of its own east of the bungalow
    M['sand'] += rings(rbox(10470, 2620, 10600, 2960, 50).intersection(unary_union([poly(p) for p in M['land']])))
    plot('bungalow', 10370, 2790, 300, 220, 180, [10243, 2860, 34, 80], ('grass', None))    # a lawn facing the street to the west
    plot('mansion', 10098, 6738, 420, 380, 45, [10243, 6883, 34, 80], ('grass', None))      # lawns, a pool, a garage for four, a gated drive
    safe['houseboat'] = {'x': 4950, 'y': 14550, 'w': 200, 'd': 60, 'a': 0, 'drive': None, 'deck': [4920, 14450, 4980, 14650], 'plank': [4980, 14540, 5006, 14560]}
    M['safe'] = safe
    for L in M['lm']:                                                 # the Colony's guests' lot: its index went stale when version 4 removed lots after adding it
        if L['t'] == 'colony' and L.get('lot') is not None:
            L['lot'] = min(range(len(M['lots'])), key=lambda k: math.hypot(M['lots'][k][0] - 11575, M['lots'][k][1] - 12947))
    LANDF = unary_union([poly(p) for p in M['land']])
    for key in ('yards', 'grass', 'sand'):
        M[key] = [g for g in M[key] if LANDF.intersects(poly(g))]
    M['remodel'] = 5
    return M


# version 6: around the lunapark car park, the rest of its knob of land north of the street becomes a palm grove (grass, a sandy strip
# along the shore), with a rocky shore and a wooden pier off the north shore where boats tie up (lunapark.grove: area, coast - the
# shoreline, where the rocks go - pier and head - decks walked on like land, js/04 - and boats: [x, y, angle, kind]).
def remodel6(M):
    LAND = unary_union([poly(p) for p in M['land']])
    cp = M['lunapark']['carpark']; cpx, cpy, cpw, cph = cp['x'], cp['y'], cp['w'], cp['h']
    CP = box(cpx - cpw / 2, cpy - cph / 2, cpx + cpw / 2, cpy + cph / 2)
    APRON = box(cpx + cpw / 2 - 100, cpy + cph / 2 - 5, cpx + cpw / 2, 2530)
    KNOB = largest(LAND.intersection(box(9400, 1700, 10600, 2505)))     # north of the street
    GROVE = KNOB.difference(CP.buffer(24, join_style=2)).difference(APRON.buffer(24)).buffer(-4)
    shore = LineString(list(KNOB.exterior.coords)).difference(box(9400, 2470, 10600, 2600))
    lines = [q for q in (shore.geoms if hasattr(shore, 'geoms') else [shore]) if q.length > 40]
    SAND = unary_union([q.buffer(30) for q in lines]).intersection(GROVE)
    M['grass'] += rings(GROVE.difference(SAND))
    M['sand'] += rings(SAND)
    px = cpx; sy = min(y for x, y in KNOB.exterior.coords if abs(x - px) < 40)   # the shore north of the car park's middle
    pier = [px - 14, 1760, px + 14, round(sy) + 12]; head = [px - 80, 1726, px + 80, 1762]
    boats = [[px - 40, 1850, 270, 'speed'], [px + 42, 1890, 90, 'fish'], [px + 40, 1800, 90, 'sail'], [px - 40, 1790, 270, 'speed'], [px - 50, 1700, 0, 'yacht'], [px + 55, 1702, 180, 'speed']]
    M['lunapark']['grove'] = {'area': rings(GROVE), 'coast': [pts(q.simplify(4)) for q in lines], 'pier': pier, 'head': head, 'boats': boats}
    M['remodel'] = 6
    return M


# version 7: Gravel Flats' cement works (js/10r) on the space center's empty south-east corner below its launch control center, between its
# fence and the shore (gravel.factory: area, fence, gate; hall and tower [x0, y0, x1, y1, height], kiln [from, to, radius], cooler, silos
# [x, y, r, height], chimneys [x, y, share of the tallest], piles [x, y, r], trucks [x, y, angle, kind], lamps), and east of it, up to the
# street corner, the yard kept for the junkyard (gravel.junk: area, gate - PLAN step 6). Both are gravel yards (yards y); the space
# center's area and fence shrink to make room.
def remodel7(M):
    SP = unary_union([poly(r) for r in M['space']['area']]); CUT = box(3560, 2000, 4700, 2700)
    F = largest(SP.intersection(CUT)); NEW = largest(SP.difference(CUT).buffer(0))
    S = M['space']; S['area'] = rings(NEW); S['fence'] = fence_line(NEW.buffer(-30).exterior, [S['gate']])
    clear_ground(M, F)
    FAC = largest(F.intersection(box(3500, 1900, 4250, 2700))); J = largest(F.intersection(box(4250, 1900, 4700, 2700)))
    fgate = {'x': 4238, 'y': 2075, 'a': 0, 'w': 100}
    M['yards'] += rings(F, 'y')
    lay = {
        'hall': [3620, 2080, 3900, 2240, 72], 'tower': [3930, 2036, 4010, 2116, 230], 'kiln': [[4010, 2168], [4196, 2184], 15], 'cooler': [4160, 2136, 4214, 2214, 40],
        'silos': [[3985, 2256, 30, 170], [4060, 2256, 30, 170], [4130, 2250, 28, 150]], 'chimneys': [[3666, 2046, 1.0], [3746, 2046, 0.88], [3826, 2046, 0.76]],
        'piles': [[3650, 2318, 46], [3752, 2338, 40], [3842, 2326, 34]], 'trucks': [[3965, 2345, 0, 'mixer'], [4200, 2262, 90, 'tanker'], [3880, 2360, 180, 'loader']],
        'gatehouse': [4196, 2040, 30, 22], 'lamps': [[3605, 2270], [3920, 2300], [4180, 2300], [3920, 2040]], 'conveyor': [[3752, 2300], [3752, 2240]],
    }
    inner = FAC.buffer(-14)
    for k in ('hall', 'tower', 'cooler'):
        x0, y0, x1, y1 = lay[k][:4]; assert inner.contains(box(x0, y0, x1, y1)), k
    for k in ('silos', 'piles'):
        for q in lay[k]: assert inner.contains(Point(q[0], q[1]).buffer(q[2])), (k, q)
    for q in lay['chimneys']: assert inner.contains(Point(q[0], q[1]).buffer(16)), q
    for q in lay['trucks']: assert inner.contains(Point(q[0], q[1]).buffer(30)), q
    M['gravel'] = {'factory': dict({'area': rings(FAC), 'fence': fence_line(FAC.buffer(-12).exterior, [fgate]), 'gate': fgate}, **lay),
                   'junk': {'area': rings(J), 'gate': {'x': 4660, 'y': 2040, 'a': 0, 'w': 100}}}
    M['remodel'] = 7
    return M


# version 8: three streets that made no sense, rerouted (map overhaul 7g). The long east-west avenue south of the bay no longer dips round
# a block in a U between x 7021 and 7620: it runs straight on, the buildings in its way gone and the U's ground a lawn. The road along the
# military base's south side ends just past the base gate instead of running on to the shore. At the south tip of Coral Shore the coast
# road's zigzags go: the loop east of the last street closes into a rectangular block, the road along the bottom runs straight with one
# 45-degree bend, and the land between it and the sea is a beach.
def remodel8(M):
    LAND = unary_union([poly(p) for p in M['land']]); N = M['nodes']
    def node(x, y): return next(k for k, n in enumerate(N) if abs(n[0] - x) < 1 and abs(n[1] - y) < 1)
    def edge(p, q):
        a, b = node(*p), node(*q); return next(e for e in M['edges'] if {e['a'], e['b']} == {a, b})
    def reroute(e, pts):                                               # a street's new line (from its a end to its b end); what stands in its way goes
        if N[e['a']] != pts[0]: pts = pts[::-1]
        old = LineString(e['p']); e['p'] = pts; corr = LineString(pts).buffer(RH + SW + 4)
        hit = [rect(*b[:5]) for b in M['bld'] if rect(*b[:5]).intersects(corr)] + [rect(*L[:5]) for L in M['lots'] if rect(*L[:5]).intersects(corr)]
        move_services(M, clear_ground(M, unary_union([corr] + hit).buffer(2)))
        return old.buffer(RH + SW).difference(corr)
    # the avenue: straight on
    e = edge((7021, 9900), (8812, 9900)); reroute(e, [[7021, 9900], [8812, 9900]])
    roads = unary_union([LineString(q['p']).buffer(RH + SW) for q in M['edges']])
    U = LAND.intersection(box(7021 - RH - SW, 9900 + RH + SW, 7620 + RH + SW, 10239 + RH + SW)).difference(roads)      # the U's ground, and the strip left north of the avenue
    STRIP = LAND.intersection(box(7021 + RH + SW, 9630 + RH + SW, 7560, 9900 - RH - SW)).difference(roads)
    for G in (U, STRIP): move_services(M, clear_ground(M, G)); M['grass'] += rings(G)
    # the base road: ends past the gate
    e = edge((3228, 9900), (1500, 9630)); N[node(1500, 9630)] = [1880, 9630]; e['p'] = [[3228, 9900], [3228, 9630], [1880, 9630]] if N[e['a']] == [3228, 9900] else [[1880, 9630], [3228, 9630], [3228, 9900]]
    # the south tip: a rectangular block, a straight coast road, a beach below it
    reroute(edge((11120, 14823), (11120, 15461)), [[11120, 14823], [11254, 14957], [11742, 14957], [11742, 15461], [11120, 15461]])
    reroute(edge((11120, 15461), (10469, 15334)), [[11120, 15461], [10596, 15461], [10469, 15334]])
    roads = unary_union([LineString(q['p']).buffer(RH + SW + 6) for q in M['edges']])
    BEACH = LAND.intersection(box(10380, 15461 + RH + SW, 11900, 16400)).difference(roads)
    move_services(M, clear_ground(M, BEACH)); M['sand'] += rings(BEACH)
    BLOCK = box(11120 + RH + SW, 14957 + RH + SW, 11742 - RH - SW, 15461 - RH - SW)        # the new block: the old road's ground in it a service yard
    M['yards'] = [y for y in M['yards'] if not poly(y).intersects(BLOCK)]; M['yards'] += rings(BLOCK, 'y')
    M['remodel'] = 8
    return M


# version 9: the drag strips (map overhaul 7h). Each strip gets an exit toward the city past its finish: a gate in its fence on the city
# side and a lane from it to the nearest street (speedway.strips[].exit: d - how far along the strip, w - the gate's width, lane, lw - the
# lane's width); the gate opens only from inside once a race is over (js/08o). The Sandbar strip now runs through woods: from the city a
# park (grass of kind lawn - no woods of its own), then a wood (kind wood - trees all over it) up to the strip's fence; beyond the strip
# another wood, then the beach down to the sea. Its landmarks (the Sail, the wheel), its lanes and booth keep their ground.
def remodel9(M):
    LAND = unary_union([poly(p) for p in M['land']]); sp = M['speedway']
    streets = unary_union([LineString(e['p']).buffer(RH + SW) for e in M['edges']])
    for st in sp['strips']:
        a = math.radians(st['ang']); ux, uy, nx, ny = math.cos(a), math.sin(a), -math.sin(a), math.cos(a)
        P = lambda d, o: (st['sx'] + ux * d + nx * o, st['sy'] + uy * d + ny * o)
        w, gd = st['hw'] + 8, (2900 if st['id'] == 'palm' else 8000)
        gx, gy = P(gd, w); ray = LineString([(gx, gy), (gx + nx * 3000, gy + ny * 3000)]); hit = ray.intersection(streets)
        k = min(Point(gx, gy).distance(Point(c)) for g in (hit.geoms if hasattr(hit, 'geoms') else [hit]) for c in g.coords) + 30
        lane = [[round(gx), round(gy)], [round(gx + nx * k), round(gy + ny * k)]]
        st['exit'] = {'d': gd, 'w': 96, 'lane': lane, 'lw': 72}
        hit = [rect(*b[:5]) for b in M['bld'] if rect(*b[:5]).intersects(LineString(lane).buffer(44))]
        move_services(M, clear_ground(M, unary_union([LineString(lane).buffer(44)] + hit).buffer(2)))
    st = next(q for q in sp['strips'] if q['id'] == 'sand'); a = math.radians(st['ang']); ux, uy, nx, ny = math.cos(a), math.sin(a), -math.sin(a), math.cos(a)
    P = lambda d, o: (st['sx'] + ux * d + nx * o, st['sy'] + uy * d + ny * o)
    band = lambda d0, d1, o0, o1: Polygon([P(d0, o0), P(d1, o0), P(d1, o1), P(d0, o1)])
    w = st['hw'] + 22; L0, L1 = -40, st['wall'] + 60
    keep = unary_union([LineString(st['exit']['lane']).buffer(st['exit']['lw'] / 2 + 10), LineString(sp['access']).buffer(sp['aw'] / 2 + 10), Point(*st['booth']).buffer(60), band(L0, L1, -w, w)]
                       + [box(L['x'] - L['w'] / 2 - 60, L['y'] - L['h'] / 2 - 60, L['x'] + L['w'] / 2 + 60, L['y'] + L['h'] / 2 + 60) for L in M['lm'] if L['t'] in ('sail', 'wheel')])
    SAND = unary_union([poly(p) for p in M['sand']]).intersection(band(L0, L1, -3000, 3000)).difference(keep)
    WOODW = SAND.intersection(band(L0, L1, w, w + 360)); PARK = SAND.intersection(band(L0, L1, w + 360, 3000)); WOODE = SAND.intersection(band(L0, L1, -w - 180, -w))
    took = unary_union([WOODW, PARK, WOODE]).buffer(0)
    M['sand'] = [r for p in M['sand'] for r in rings(poly(p).difference(took))]
    M['grass'] += rings(PARK, 'lawn') + rings(WOODW, 'wood') + rings(WOODE, 'wood')
    M['remodel'] = 9
    return M


# version 10: the Sunstrip showroom (PLAN step 5, js/10s, js/08w). The block at the corner of the beach avenue and the street south of the
# big park is cleared for a car dealer (showroom: block, hall - the glass showroom, its front to the south street; door - its entrance
# [x, y, width]; side - a second door to the avenue; shop - the tuning workshop at the back, sdoor - its roller door to the avenue; yard -
# an open stock yard); the whole block is paved (yards p).
def remodel10(M):
    B = box(11835, 8331, 12291, 8969)
    move_services(M, clear_ground(M, B.buffer(6)))
    M['alleys'] = [a for a in M['alleys'] if not B.intersects(rect(*a[:5]))]
    M['yards'] += rings(B, 'p')
    M['showroom'] = {'block': [11835, 8331, 12291, 8969], 'hall': [11852, 8630, 12276, 8952], 'door': [12064, 8952, 90], 'side': [12276, 8800, 70],
                     'shop': [12090, 8348, 12276, 8606], 'sdoor': [12276, 8470, 100], 'yard': [11852, 8348, 12070, 8606]}
    M['remodel'] = 10
    return M


# version 11: streets to the Colony and the cement works (October 2026, js/08x). Each is a dead end closed to ordinary traffic (nt) and
# marked for visitors (v: colony / factory - no boom across it; js/08x sends a visiting car in now and then to park). The Colony's leaves
# the beach avenue at a new junction and runs into the ring drive; its visitors park in the car park beside the drive (lm colony vlot).
# The cement works' leaves the corner where the street turns round the space center and runs along the space center's fence to the
# works' gate; the space center's corner is cut back for it, the shore filled where it touched the bay, and a staff car park of four
# bays lies beside it at the gate (a lot; gravel.factory vlot). What is left of the junkyard's yard stays gravel.junk.
def remodel11(M):
    LAND = unary_union([poly(p) for p in M['land']])
    # the Colony
    C = next(L for L in M['lm'] if L['t'] == 'colony'); y = round((C['drive'][1] + C['drive'][3]) / 2); x0 = 10982; x1 = round(C['drive'][0]) + 40
    n0 = split_edge_at(M, [x0, y]); n1 = node_at(M, x1, y)
    M['edges'].append({'a': n0, 'b': n1, 'p': [[x0, y], [x1, y]], 'nt': True, 'v': 'colony'})
    C['vlot'] = [11425, 12872]
    # the cement works
    F = M['gravel']['factory']; g = F['gate']; ny = g['y'] - 15; nc = [4748, 1904]; mid = [nc[0] - (ny - nc[1]), ny]; end = [g['x'] + 62, ny]
    road = LineString([nc, mid, end]); corr = road.buffer(RH + SW)
    SP = unary_union([poly(r) for r in M['space']['area']]); cut = Polygon([(4140, 2400), (5200, 2400), (5200, 1340)])   # x + y > 6540: the corner by the road
    S = M['space']; NEW = largest(SP.difference(cut).buffer(0)); S['area'] = rings(NEW); S['fence'] = fence_line(NEW.buffer(-30).exterior, [S['gate']])
    assert NEW.buffer(-30).exterior.distance(road) > RH + SW - 1, NEW.buffer(-30).exterior.distance(road)
    wet = corr.buffer(14).difference(LAND)
    if wet.area > 1: edit_land(M, (4000, 2200), lambda G: G.union(corr.buffer(14)).buffer(0)); print('shore filled under the works road: %d sq units' % wet.area)
    lot = [4342, ny + RH + SW + 54, 160, 100, 180, 1, -1, 0.4]
    LAND = unary_union([poly(p) for p in M['land']]); assert LAND.buffer(-4).contains(rect(*lot[:5])), 'the staff car park is in the water'
    clear_ground(M, unary_union([corr, rect(*lot[:5]).buffer(6)]))
    M['lots'].append(lot); F['vlot'] = lot[:2]
    M['edges'].append({'a': node_at(M, *nc), 'b': node_at(M, *end), 'p': [nc, mid, end], 'nt': True, 'v': 'factory'})
    J = unary_union([poly(r) for r in M['gravel']['junk']['area']]).difference(corr.buffer(10)).difference(rect(*lot[:5]).buffer(10))
    J = largest(J.buffer(0)); M['gravel']['junk']['area'] = rings(J); jx0, jy0, jx1, jy1 = J.bounds
    M['gravel']['junk']['gate'] = {'x': round((jx0 + jx1) / 2), 'y': round(jy0), 'a': 90, 'w': 100}
    print('junkyard plot left: %d x %d (%d sq units)' % (jx1 - jx0, jy1 - jy0, J.area))
    M['remodel'] = 11
    return M


# version 12: the junkyard (PLAN step 6, October 2026: the owner moved it to Dockside, by the port; js/10t, js/08z). The south part of the
# port's maintenance yard becomes DOCKSIDE SALVAGE (salvage: area - the fenced yard; gate - [x, y, width] in its south fence, to the shore
# street; spot - [x, y, w, l] where you leave a car for the crane; crane - the magnet crane's middle; crusher - [x, y, w, d]; pile - where
# the cubes go; shack - [x, y, w, d], the office; kennel - the guard dog's); the workshop that stood there goes, the one to the north stays.
def remodel12(M):
    J = [4856, 13170, 5355, 13644]
    M['bld'] = [b for b in M['bld'] if not (abs(b[0] - 5250) < 2 and abs(b[1] - 13390) < 2)]
    cx, cy, R, a = 5030, 13420, 157, -0.42
    M['salvage'] = {'area': J, 'gate': [5110, 13644, 110], 'spot': [5110, 13555, 50, 130], 'crane': [cx, cy, R],
                    'crusher': [round(cx + R * math.cos(a)), round(cy + R * math.sin(a)), 110, 64], 'pile': [5292, 13352], 'shack': [4910, 13585, 80, 56], 'kennel': [4975, 13608]}
    sx, sy = M['salvage']['spot'][:2]
    assert abs(math.hypot(sx - cx, sy - cy) - R) < 3, math.hypot(sx - cx, sy - cy)      # the magnet reaches the spot and the crusher alike
    M['remodel'] = 12
    return M


# version 13: IRON KEY, the prison island in the bay between the Palm Heights shore and Heron Key - a rocky island (a land polygon of its
# own) with the prison's walls, four watchtowers, the gate, two cell blocks, the office and the yard; a path from the gate down to a pier
# at its south tip, and a ferry pier off the promenade on the Palm Heights shore. The ferry's route (a curve: the mainland berth, two
# controls, the island berth) keeps clear of every shore.
def remodel13(M):
    U = unary_union([poly(L) for L in M['land']])
    rough = [(8800, 3250), (8930, 3275), (9040, 3360), (9075, 3560), (9070, 3900), (9030, 4120), (8930, 4280), (8790, 4330), (8690, 4280),
             (8625, 4140), (8560, 3900), (8555, 3560), (8580, 3370), (8660, 3278)]
    isl = Polygon(rough).buffer(30, join_style=1).buffer(-30, join_style=1)
    ring, out = list(isl.exterior.coords)[:-1], []
    for k, (x, y) in enumerate(ring):                                 # a rocky edge: the outline nudged in and out a little
        if k % 2: continue
        cx, cy = isl.centroid.x, isl.centroid.y; d = math.hypot(x - cx, y - cy) or 1; j = 7 * math.sin(k * 2.3) + 5 * math.sin(k * 0.9)
        out.append([round(x + (x - cx) / d * j), round(y + (y - cy) / d * j)])
    island = Polygon(out)
    assert island.is_valid and island.distance(U) > 120, island.distance(U)
    M['land'].append({'o': out, 'h': []})
    def bez(P, n=48):
        return [[round(sum(w * q[i] for w, q in zip(((1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3), P))) for i in (0, 1)] for t in [k / n for k in range(n + 1)]]
    fp = [[8362, 4080], [8560, 4100], [8790, 4850], [8790, 4530]]
    route = LineString(bez(fp)); assert route.distance(U) > 150 and route.distance(island) > 90, (route.distance(U), route.distance(island))
    P = {'name': 'IRON KEY', 'island': out, 'walls': [8640, 3420, 8990, 3920], 'wt': 14, 'wh': 62,
         'towers': [[8640, 3420], [8990, 3420], [8640, 3920], [8990, 3920]], 'ts': 34, 'th': 118, 'gate': [8820, 3920, 60],
         'blocks': [[8815, 3495, 290, 90], [8715, 3705, 90, 250]], 'office': [8920, 3845, 80, 90], 'yard': [8780, 3560, 8960, 3780],
         'court': [8800, 3580, 8940, 3680], 'release': [8820, 3878], 'booth': [8892, 3962, 40, 30],
         'path': [[8820, 3926], [8820, 4100], [8790, 4250], [8790, 4310]], 'pw': 40,
         'pier': [8768, 4280, 8812, 4430], 'head': [8750, 4398, 8830, 4430],
         'mpier': [8086, 4058, 8262, 4102], 'mhead': [8232, 4044, 8262, 4116], 'kiosk': [8048, 4128, 46, 34],
         'ferry': {'route': fp, 'len': 200, 'wid': 64}}
    for k in ('walls',):
        x0, y0, x1, y1 = P[k]; assert island.buffer(-24).contains(box(x0 - 17, y0 - 17, x1 + 17, y1 + 17)), k
    assert U.contains(Point(8090, 4080)) and not U.contains(Point(8262, 4080)) and island.contains(Point(8790, 4285)), 'piers'
    M['prison'] = P
    M['districts'].insert(0, ['IRON KEY', [8530, 3230, 9090, 4440]])
    M['remodel'] = 13
    return M


# version 14: SKYLINE ONE, the construction site - the downtown Palm Heights block south of the middle cross street, between the two
# avenues, on the main east-west avenue: everything on it goes, and the site takes it (site: the hoarding's line, the gate on the west
# street, the broken panel on the north street, the tower - six levels, ramps up its side strips, the launch ramp on its top deck's south
# edge over the avenue - and in the yard the cranes, the office cabins, the materials, the dirt mounds, the plank ramps, the dig pit).
def remodel14(M):
    x0, y0, x1, y1 = 6692, 2088, 7372, 2512
    gone = clear_ground(M, box(x0, y0, x1, y1)); move_services(M, gone)
    a0, b0, a1, b1 = x0 + 4, y0 + 4, x1 - 4, y1 - 4
    M['site'] = {'name': 'SKYLINE ONE', 'area': [a0, b0, a1, b1], 'gate': [a0, 2300, 100], 'panel': [6810, b0, 24],
                 'tower': {'x0': 7020, 'y0': 2100, 'x1': 7360, 'y1': 2500, 'levels': 6, 'dh': 36, 'S': 80, 'r0': 70, 'r1': 330},
                 'kicker': [7150, 7230, 2440, 2500, 14],
                 'cranes': [[6722, 2168, 340, 300], [6722, 2468, 340, 300]],
                 'office': [6745, 2118, 80, 36], 'mounds': [[6880, 2190, 44, 18], [6935, 2440, 36, 14]],
                 'ramps': [[6778, 2330, 0, 62, 40, 16], [6960, 2335, -90, 60, 40, 14]],
                 'pit': [6872, 2330, 66, 50], 'piles': [[6850, 2114, 56, 20, 'rebar'], [6935, 2118, 46, 34, 'bricks'], [6994, 2470, 22, 48, 'pipes'], [6722, 2240, 30, 40, 'pallets']],
                 'mixer': [6990, 2200, -90], 'digger': [6872, 2283, 90], 'dumper': [[6765, 2440], [6870, 2398]]}
    M['remodel'] = 14
    return M


# version 15: the casino strip - the Sunstrip block at the north end of the beach avenue (between the avenue, the cross streets at
# y 5900 and 6440 and the street at x 11418): its buildings and back alley go, and it holds the ROYAL FLAMINGO casino on the avenue side
# (casino.hall, its door to the avenue) and THE PULSE nightclub beside it (casino.club, its door to the south street, the queue along
# that sidewalk). The bars and small clubs are the beachfront row across the avenue (found by js/10w; the map keeps them as they are).
def remodel15(M):
    B = box(11506, 5988, 12291, 6352)
    move_services(M, clear_ground(M, B.buffer(4)))
    M['yards'] += rings(B, 'p')
    M['casino'] = {'block': [11506, 5988, 12291, 6352], 'hall': [11880, 5996, 12284, 6344], 'door': [12284, 6170, 64],
                   'club': [11512, 5996, 11872, 6344], 'cdoor': [11790, 6344, 44], 'queue': [11762, 6364, 11540]}
    M['remodel'] = 15
    return M


STEPS = [remodel, remodel2, remodel3, remodel4, remodel5, remodel6, remodel7, remodel8, remodel9, remodel10, remodel11, remodel12, remodel13, remodel14, remodel15]


if __name__ == '__main__':
    head, M, tail = load(); done = M.get('remodel', 0)
    if done >= len(STEPS): print('already remodelled (version %d)' % done); sys.exit(0)
    for n in range(done, len(STEPS)): M = STEPS[n](M); M['remodel'] = n + 1
    head = head.replace("yards: open ground {o, h, k}: y = service yard, p = promenade or forecourt, ap = airport apron, q = quay; sw: sidewalk width. */",
                        "yards: open ground {o, h, k}: y = service yard, p = promenade or forecourt, ap = airport apron, q = quay, pk = park path; sw: sidewalk width.\n"
                        "   Remodelled by tools/remodel_city.py (remodel: version): the Skyport airport (airport: field, runway, taxiways, terminal, stands, hangars,\n"
                        "   tower, fence, gates) and the mall park. */")
    head = head.replace("   tower, fence, gates) and the mall park. */",
                        "   tower, fence, gates, roads) and the mall park; version 2: the port (port), the lunapark (lunapark), the space center (space) and the\n"
                        "   military base (base); yards lp = lunapark ground, mb = base ground; bld[8], bld[9]: a building's kind and height when set. */")
    head = head.replace("   military base (base); yards lp = lunapark ground, mb = base ground; bld[8], bld[9]: a building's kind and height when set. */",
                        "   military base (base); yards lp = lunapark ground, mb = base ground; bld[8], bld[9]: a building's kind and height when set;\n"
                        "   version 3: the speedway on the Palm Heights beach (speedway: oval, grandstand, paddock, garages, booth) and two drag strips (speedway.strips: the\n"
                        "   Palm strip beside it, the Sandbar strip down the east beach, each with its booth); yards sp = their ground. */")
    head = head.replace("   Palm strip beside it, the Sandbar strip down the east beach, each with its booth); yards sp = their ground. */",
                        "   Palm strip beside it, the Sandbar strip down the east beach, each with its booth); yards sp = their ground;\n"
                        "   version 4: the Colony on the Sandbar beach (lm colony: x, y, a, w, d, h, park, fountain, drive, lot) and the lunapark's car park\n"
                        "   (lunapark.carpark: x, y, w, h, levels, dh, entry). */")
    head = head.replace("   (lunapark.carpark: x, y, w, h, levels, dh, entry). */",
                        "   (lunapark.carpark: x, y, w, h, levels, dh, entry); version 5: the safehouse plots (safe.trailer, .bungalow, .mansion, .houseboat:\n"
                        "   x, y, w, d, a, drive; the houseboat's deck and plank). */")
    head = head.replace("   x, y, w, d, a, drive; the houseboat's deck and plank). */",
                        "   x, y, w, d, a, drive; the houseboat's deck and plank); version 6: the palm grove round the lunapark car park (lunapark.grove:\n"
                        "   area, coast, pier, head, boats). */")
    head = head.replace("   area, coast, pier, head, boats). */",
                        "   area, coast, pier, head, boats); version 7: Gravel Flats' cement works on the space center's south-east corner (gravel.factory)\n"
                        "   and the yard by the street corner kept for the junkyard (gravel.junk). */")
    head = head.replace("   and the yard by the street corner kept for the junkyard (gravel.junk). */",
                        "   and the yard by the street corner kept for the junkyard (gravel.junk); version 8: three streets rerouted - the avenue straight\n"
                        "   on where it dipped round a block, the base road ending at the base gate, the south tip's coast road straightened. */")
    head = head.replace("   on where it dipped round a block, the base road ending at the base gate, the south tip's coast road straightened. */",
                        "   on where it dipped round a block, the base road ending at the base gate, the south tip's coast road straightened; version 9: the drag\n"
                        "   strips' exits (speedway.strips[].exit) and the Sandbar strip's park and woods (grass of kind lawn and wood). */")
    head = head.replace("   strips' exits (speedway.strips[].exit) and the Sandbar strip's park and woods (grass of kind lawn and wood). */",
                        "   strips' exits (speedway.strips[].exit) and the Sandbar strip's park and woods (grass of kind lawn and wood); version 10: the Sunstrip\n"
                        "   showroom's block (showroom: block, hall, door, side, shop, sdoor, yard). */")
    head = head.replace("   showroom's block (showroom: block, hall, door, side, shop, sdoor, yard). */",
                        "   showroom's block (showroom: block, hall, door, side, shop, sdoor, yard); version 11: dead-end streets for visitors to the Colony and the\n"
                        "   cement works (edges v: colony / factory, closed to traffic) and their car parks (lm colony vlot, gravel.factory vlot). */")
    head = head.replace("   cement works (edges v: colony / factory, closed to traffic) and their car parks (lm colony vlot, gravel.factory vlot). */",
                        "   cement works (edges v: colony / factory, closed to traffic) and their car parks (lm colony vlot, gravel.factory vlot); version 12: the\n"
                        "   junkyard in the port's maintenance yard (salvage: area, gate, spot, crane, crusher, pile, shack, kennel). */")
    head = head.replace("   junkyard in the port's maintenance yard (salvage: area, gate, spot, crane, crusher, pile, shack, kennel). */",
                        "   junkyard in the port's maintenance yard (salvage: area, gate, spot, crane, crusher, pile, shack, kennel); version 13: Iron Key, the\n"
                        "   prison island in the bay west of Heron Key (a land polygon of its own; prison: island, walls, towers, gate, blocks, office, yard, path,\n"
                        "   pier, the mainland ferry pier, the ferry's route), and its district. */")
    head = head.replace("   pier, the mainland ferry pier, the ferry's route), and its district. */",
                        "   pier, the mainland ferry pier, the ferry's route), and its district; version 14: Skyline One, the construction site on a downtown\n"
                        "   Palm Heights block (site: area, gate, panel, tower, kicker, cranes, office, mounds, ramps, pit, piles, trucks). */")
    head = head.replace("   Palm Heights block (site: area, gate, panel, tower, kicker, cranes, office, mounds, ramps, pit, piles, trucks). */",
                        "   Palm Heights block (site: area, gate, panel, tower, kicker, cranes, office, mounds, ramps, pit, piles, trucks); version 15: the\n"
                        "   casino strip's block on the Sunstrip beach avenue (casino: block, hall, door, club, cdoor, queue). */")
    open(SRC, 'w', encoding='utf-8').write(head + json.dumps(M, separators=(',', ':')) + tail)
    print('remodelled:', SRC, 'to version', M['remodel'], '- nodes', len(M['nodes']), 'edges', len(M['edges']), 'buildings', len(M['bld']), 'lots', len(M['lots']))
