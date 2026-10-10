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


# version 3: the speedway on the north Sandbar, between the Seaview street and the sea: a NASCAR oval (its west straight the front stretch,
# a grandstand outside it, the pit lane and the garages in the infield), parking and the race booth by the street, and a quarter-mile drag
# strip along the shore, its staging lane at the north end beside the oval, its braking stretch running on down the beach.
def remodel3(M):
    LAND = unary_union([poly(p) for p in M['land']])
    cx, cy, S, R, w = 13470, 4230, 1440, 460, 160                      # the oval: centre, straight length, centre-line radius, track width (long axis north-south)
    xo, xi = cx - R - w / 2, cx - R + w / 2                            # the west straight's outer and inner edge
    yn, ys = cy - S / 2, cy + S / 2                                     # where the straights end
    KEEP = box(12465, 4015, 12645, 4375)                                # the Seaview police station and its lot stay
    GROUNDS = largest(LAND.buffer(-30).intersection(box(12470, 2760, 14300, 5620)).difference(KEEP))
    STRIP = largest(LAND.buffer(-20).intersection(box(14055, 2760, 14265, 10460)))
    AREA = unary_union([GROUNDS, STRIP])
    gone = clear_ground(M, AREA)
    move_services(M, gone, AREA)
    oval = unary_union([LineString([(cx, yn), (cx, ys)]).buffer(R + w / 2)])           # a stadium: the track's outer edge
    inner = LineString([(cx, yn), (cx, ys)]).buffer(R - w / 2)
    pit = [xi + 10, yn + 90, xi + 105, ys - 90]                         # the pit lane along the inner edge of the front stretch
    garages = [xi + 115, yn + 130, xi + 200, ys - 130]
    stands = [xo - 150, yn + 110, xo - 30, ys - 30]                      # the grandstand outside the front stretch (rising to the west)
    gap = [xo, yn + 10, 90]                                              # the way onto the track: a gap in the outer wall at the north end of the front stretch
    strip = {'x0': 14070, 'x1': 14250, 'lanes': [14115, 14205], 'apron': 2900, 'stage': 3120, 'finish': 3120 + 4828, 'end': 10250}
    assert oval.bounds[2] < strip['x0'] - 40 and GROUNDS.contains(oval.buffer(20)), oval.bounds
    assert STRIP.contains(box(strip['x0'], strip['stage'], strip['x1'], strip['end'])), STRIP.bounds
    M['grass'] += rings(inner.buffer(-14).difference(box(pit[0] - 10, pit[1] - 40, garages[2] + 20, pit[3] + 40)))
    M['yards'] += rings(AREA, 'sp')
    for y in (3150, 3750, 4720, 5290):                                  # parking by the street, either side of the police station; the race booth beside it
        M['lots'].append([12635, y, 520, 250, 90.0, 2, -1, 0.45])
    M['speedway'] = {'area': rings(AREA), 'oval': {'cx': cx, 'cy': cy, 'S': S, 'R': R, 'w': w}, 'pit': pit, 'garages': garages, 'stands': stands,
                     'gap': gap, 'booth': [12712, 4200], 'strip': strip, 'access': [[12780, 2850], [14160, 2850]], 'aw': 110}
    LANDF = unary_union([poly(p) for p in M['land']])
    for key in ('yards', 'grass', 'sand'):
        M[key] = [g for g in M[key] if LANDF.intersects(poly(g))]
    M['remodel'] = 3
    return M


STEPS = [remodel, remodel2, remodel3]


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
                        "   version 3: the speedway on the north Sandbar (speedway: oval, pit lane, garages, grandstand, booth, drag strip); yards sp = its ground. */")
    open(SRC, 'w', encoding='utf-8').write(head + json.dumps(M, separators=(',', ':')) + tail)
    print('remodelled:', SRC, 'to version', M['remodel'], '- nodes', len(M['nodes']), 'edges', len(M['edges']), 'buildings', len(M['bld']), 'lots', len(M['lots']))
