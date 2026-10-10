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


if __name__ == '__main__':
    head, M, tail = load()
    if M.get('remodel', 0) >= VERSION: print('already remodelled (version %d)' % M['remodel']); sys.exit(0)
    M = remodel(M)
    head = head.replace("yards: open ground {o, h, k}: y = service yard, p = promenade or forecourt, ap = airport apron, q = quay; sw: sidewalk width. */",
                        "yards: open ground {o, h, k}: y = service yard, p = promenade or forecourt, ap = airport apron, q = quay, pk = park path; sw: sidewalk width.\n"
                        "   Remodelled by tools/remodel_city.py (remodel: version): the Skyport airport (airport: field, runway, taxiways, terminal, stands, hangars,\n"
                        "   tower, fence, gates) and the mall park. */")
    open(SRC, 'w', encoding='utf-8').write(head + json.dumps(M, separators=(',', ':')) + tail)
    print('remodelled:', SRC, '- nodes', len(M['nodes']), 'edges', len(M['edges']), 'buildings', len(M['bld']), 'lots', len(M['lots']))
