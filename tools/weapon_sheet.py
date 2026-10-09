"""Weapon table <-> spreadsheet (Apple Numbers or Excel).

  python3 tools/weapon_sheet.py export weapons.numbers            write js/01f-weapon-data.js as a Numbers file (or .xlsx)
  python3 tools/weapon_sheet.py import weapons.numbers [--dry-run] read an edited file (.numbers or .xlsx) back, check it, rewrite the table

One column per weapon, in the order of the weapon wheel; one row per setting, grouped under dark section rows. Rows are found by their
label in the first column, so they may be moved; a row that is missing keeps the values already in the game; a weapon whose column
is gone is removed. Rows that do not apply to a weapon stay empty.
A weapon whose way of working does not exist yet (melee, grenades, anything new) is a draft: describe it in "How to use" and
"How it works", fill what you can, and the game leaves it out until its mechanics are built.
Needs openpyxl for .xlsx and numbers-parser for .numbers."""
import json, os, re, sys

JS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'js', '01f-weapon-data.js')
A, B = '/*WEAPON-JSON*/', '/*END-WEAPON-JSON*/'
USES = ['tap', 'hold', 'scope', 'swing', 'throw', 'new']
FIRES = ['bullet', 'rocket', 'grenade', 'melee', 'new']
BUILT_USE, BUILT_FIRES = ['tap', 'hold', 'scope', 'swing', 'throw'], ['bullet', 'rocket', 'melee', 'grenade']   # the mechanics the game has today
CLASSES = ['handgun', 'automatic', 'shotgun', 'rifle', 'launcher', 'melee', 'thrown', 'other']
SOUNDS = ['pistol', 'revolver', 'mg', 'lmg', 'shotgun', 'sniper', 'rocket', 'punch', 'swing', 'stab', 'throw', 'new']
SIGHTS = ['none', 'round', 'rect']
# a section row: ('#', title, what it is for);  a setting: (key, label, kind, choices or (min, max), what it means, unit / how to fill)
# kinds: text, long (a paragraph), choice, num, int, yesno
ROWS = [
    ('id', 'ID', 'text', None, 'Internal key of the weapon. Never shown in the game.', 'lowercase, no spaces, unique'),
    ('#', 'WEAPON', 'What it is and which mechanics it uses.'),
    ('name', 'Name on screen', 'text', None, 'Name in the weapon wheel and the help.', 'CAPITALS look best'),
    ('short', 'Short name (HUD)', 'text', None, 'Name next to the ammo counter and on pickups ("+24 PISTOL").', 'one short word'),
    ('status', 'Status: in game / draft', 'choice', ['in game', 'draft'],
     'in game: in the weapon wheel and on the streets. draft: being designed - the game leaves it out. A weapon that needs a mechanic not built yet must stay a draft until Claude builds it.', 'pick from the list'),
    ('class', 'Class', 'choice', CLASSES, 'What kind of weapon it is. Sorting and the look of its pickup; how it works is set by the next two rows.', 'pick from the list'),
    ('use', 'How you use it', 'choice', USES,
     'tap: one shot per tap of FIRE. hold: keeps firing while FIRE is held. scope: stand still, hold FIRE, aim in a scope or sight, let go to shoot. '
     'swing: a melee swing at whoever is in front of you. throw: hold FIRE and drag the opposite way, let go to throw. new: a way that does not exist yet - describe it in How it works.', 'pick from the list'),
    ('fires', 'What it fires', 'choice', FIRES,
     'bullet: hits at once along a line. rocket: a flying explosive. grenade: thrown, (bounces,) blows up when the fuse runs out. '
     'melee: hits by contact in an arc. new: describe it in How it works.', 'pick from the list'),
    ('sound', 'Sound', 'choice', SOUNDS, 'Which synthesized sound it makes. new: a sound still to be made - describe it in Look / sound / ideas.', 'pick from the list'),
    ('color', 'Bubble colour (#hex)', 'colour', None, 'Its own colour: the bubble its pickups and its ammo float in. Every weapon needs a different one.', '#RRGGBB'),
    ('#', 'MECHANICS IN WORDS', 'For new mechanics: describe them here, and Claude builds them from this.'),
    ('howTo', 'How to use (shown in the game)', 'long', None, 'What the player does, in one or two short sentences. Shown under the weapon wheel and in Help.', 'e.g. "Tap FIRE to swing."'),
    ('mechanic', 'How it works', 'long', None, 'Everything about how it behaves: what happens on FIRE, what it hits and how, timing, effects, what the police and people do, special cases (in a car, in water...). The more precise, the better.', 'free text'),
    ('notes', 'Look / sound / ideas', 'long', None, 'How it looks in your hands and as a pickup, how it sounds, anything else.', 'free text'),
    ('#', 'HITTING', 'For everything that does damage.'),
    ('dmg', 'Damage per hit', 'num', (0, 1000), 'Health taken from what it hits. A passer-by has 30, a police officer 45, you 100; vehicles see Health in the vehicle table. Rockets and grenades: 0 (the blast does the damage).', 'points'),
    ('pellets', 'Bullets per shot', 'int', (1, 20), 'More than 1: a shotgun - each pellet flies with its own spread and does the full damage.', 'usually 1'),
    ('spread', 'Spread (degrees)', 'num', (0, 45), 'How far a shot may stray from where you face, either side.', 'degrees, 0 = dead straight'),
    ('range', 'Range (m)', 'num', (0, 1000), 'How far a bullet reaches, or how far you can aim a scope or sight.', 'metres'),
    ('rate', 'Time between shots (s)', 'num', (0.02, 10), 'Shortest time from one shot to the next (melee: one swing to the next; thrown: one throw to the next).', 'seconds'),
    ('carDmg', 'Damage to vehicles (%)', 'num', (0, 500), 'A vehicle hit takes this share of the damage.', '%'),
    ('pierce', 'Goes through cover: yes / no', 'yesno', None, 'yes: through props (dumpsters, bins) and one unarmoured car; a building, the first person or an armoured car stops it.', 'yes or no'),
    ('#', 'AMMO AND FINDING IT', 'How much you carry, and how much of it lies hidden around the city (alleys, parks, parking lots, yards - never the main streets).'),
    ('mag', 'Magazine (rounds)', 'int', (0, 500), 'Rounds before a reload (thrown: 1, the one in your hand). 0 = needs no ammo (melee).', 'rounds'),
    ('ammo', 'Spare rounds when found', 'int', (0, 9999), 'Rounds you get besides the full magazine when you pick up the weapon itself.', 'rounds'),
    ('maxAmmo', 'Most spare rounds carried', 'int', (0, 9999), 'Pickups stop adding above this.', 'rounds'),
    ('pickup', 'Rounds per ammo pickup', 'int', (0, 999), 'What one of its ammo pickups gives (you take ammo even before you have found the weapon).', 'rounds'),
    ('onMap', 'Weapon pickups on the map', 'int', (0, 60), 'How many of the weapon itself lie hidden. Melee weapons: always in the same places, and never taken while you carry that weapon. Others: random places each game, and one comes back somewhere else a minute after you take it.', 'count'),
    ('ammoMap', 'Ammo pickups on the map', 'int', (0, 60), 'How many of its ammo pickups lie hidden, in its own colour bubble; random places, each comes back elsewhere a minute after you take it.', 'count'),
    ('carry', 'Carried by people (%)', 'num', (0, 100), 'Share of passers-by who carry it. Attacked, or seeing you hurt someone close by, they use it on you (a melee weapon, or a gun that fires bullets on tap or hold); killed, they drop it. All together at most 100.', '%, empty = nobody'),
    ('reload', 'Reload time (s)', 'num', (0, 60), 'Time to put in a new magazine (thrown: to take the next one).', 'seconds'),
    ('start', 'Have it at the start: yes / no', 'yesno', None, 'yes: you always have it (like fists). no: you have to find it.', 'yes or no'),
    ('keep', 'Kept when busted: yes / no', 'yesno', None, 'When the police arrest you they take your weapons (police table) - except these.', 'yes or no'),
    ('#', 'SHOPS', 'What it costs in the stores that sell it (js/01g); your score is your cash.'),
    ('price', 'Price in shops ($)', 'int', (0, 1000000), 'What the weapon costs in a store that sells it. Empty: never sold.', 'dollars'),
    ('ammoPrice', 'Ammo price ($)', 'int', (0, 1000000), 'What one ammo pack (Rounds per ammo pickup) costs there.', 'dollars'),
    ('#', 'POLICE AND NOISE', 'Who notices.'),
    ('heat', 'Heat per shot', 'num', (0, 100), 'Wanted-level heat a shot adds when a cop sees or hears it (times the police table\'s Gunshot %). For scale: 1 star at 4 heat.', 'number'),
    ('hear', 'Heard by police within (m)', 'num', (0, 200), 'A cop this close hears the shot even without seeing you. 0 = silent.', 'metres'),
    ('panic', 'People flee within (m)', 'num', (0, 200), 'Passers-by this close run away.', 'metres'),
    ('shake', 'Screen shake', 'num', (0, 30), 'How hard the view shakes on a shot.', 'about 2-6'),
    ('#', 'SCOPE OR SIGHT', 'Only for How you use it: scope.'),
    ('zoom', 'Zoom (x)', 'num', (1, 10), 'Magnification in the scope or sight.', 'times'),
    ('sight', 'Sight: none / round / rect', 'choice', SIGHTS, 'round: a rifle scope. rect: a launcher sight. none: no sight.', 'pick from the list'),
    ('blur', 'Blur around the sight: yes / no', 'yesno', None, 'yes: the rest of the screen is blurred; no: darkened.', 'yes or no'),
    ('los', 'Needs clear line of sight: yes / no', 'yesno', None, 'yes: it fires only when nothing is in the way.', 'yes or no'),
    ('hold', 'Sight stays up between shots: yes / no', 'yesno', None, 'yes: the sight stays open while the next round is chambered.', 'yes or no'),
    ('#', 'EXPLOSIVES', 'For rockets and grenades.'),
    ('blast', 'Blast radius (m)', 'num', (0, 50), 'Everyone inside is thrown and killed; cars inside take heavy damage. A rocket: 10.8 m.', 'metres'),
    ('speed', 'Flight speed (km/h)', 'num', (0, 2000), 'Top speed of a rocket; how fast a grenade leaves your hand (it needs about 60 km/h to reach 30 m).', 'km/h'),
    ('stray', 'Dud chance (%)', 'num', (0, 100), 'Share of shots that go off course.', '%'),
    ('strayDeg', 'Dud goes off by (degrees)', 'num', (0, 180), 'How far off course a dud flies.', 'degrees'),
    ('fuse', 'Fuse (s)', 'num', (0, 30), 'Grenade: time from the throw to the blast.', 'seconds'),
    ('throw', 'Throw range (m)', 'num', (0, 200), 'Grenade: the furthest you can throw it (dragging all the way).', 'metres'),
    ('bounce', 'Bounces: yes / no', 'yesno', None, 'Grenade: yes - bounces off walls and cars and rolls; no - stops where it lands.', 'yes or no'),
    ('#', 'MELEE', 'For How you use it: swing.'),
    ('reach', 'Reach (m)', 'num', (0, 10), 'How far beyond your body a swing hits.', 'metres'),
    ('arc', 'Swing arc (degrees)', 'num', (0, 360), 'How wide the swing sweeps: 90 = a quarter circle in front of you.', 'degrees'),
    ('knock', 'Knockdown (s)', 'num', (0, 30), 'How long someone hit stays down. 0 = not knocked down.', 'seconds'),
    ('push', 'Push back (m)', 'num', (0, 20), 'How far a hit pushes someone away. Above 3 m they are sent flying.', 'metres'),
]
SETTINGS = [r for r in ROWS if r[0] != '#']
ROW = {r[0]: r for r in SETTINGS}
ORDER = ['id', 'name', 'short', 'status', 'class', 'use', 'fires', 'sound', 'color', 'howTo', 'mechanic', 'dmg', 'pellets', 'spread', 'range', 'rate', 'carDmg', 'pierce',
         'mag', 'ammo', 'maxAmmo', 'pickup', 'onMap', 'ammoMap', 'carry', 'reload', 'start', 'keep', 'price', 'ammoPrice', 'heat', 'hear', 'panic', 'shake', 'zoom', 'sight', 'blur', 'los', 'hold',
         'blast', 'speed', 'stray', 'strayDeg', 'fuse', 'throw', 'bounce', 'reach', 'arc', 'knock', 'push', 'notes']
assert sorted(ORDER) == sorted(ROW)
# a row label in a returned file is recognised by how it starts (lowercase), most specific first
MATCH = [('id', 'id'), ('name', 'name on screen'), ('short', 'short name'), ('status', 'status'), ('class', 'class'), ('use', 'how you use'), ('fires', 'what it fires'),
         ('sound', 'sound'), ('color', 'bubble colour'), ('howTo', 'how to use'), ('mechanic', 'how it works'), ('notes', 'look'), ('dmg', 'damage per'), ('pellets', 'bullets per'),
         ('spread', 'spread'), ('range', 'range'), ('rate', 'time between'), ('carDmg', 'damage to veh'), ('pierce', 'goes through'), ('mag', 'magazine'),
         ('ammo', 'spare rounds'), ('maxAmmo', 'most spare'), ('pickup', 'rounds per'), ('onMap', 'weapon pickups'), ('ammoMap', 'ammo pickups'), ('carry', 'carried by'), ('reload', 'reload'),
         ('start', 'have it'), ('keep', 'kept when'), ('price', 'price in'), ('ammoPrice', 'ammo price'), ('heat', 'heat'), ('hear', 'heard'), ('panic', 'people flee'), ('shake', 'screen shake'), ('zoom', 'zoom'),
         ('sight', 'sight:'), ('blur', 'blur'), ('los', 'needs clear'), ('hold', 'sight stays'), ('blast', 'blast'), ('speed', 'flight speed'), ('stray', 'dud chance'),
         ('strayDeg', 'dud goes'), ('fuse', 'fuse'), ('throw', 'throw range'), ('bounce', 'bounces'), ('reach', 'reach'), ('arc', 'swing arc'), ('knock', 'knockdown'),
         ('push', 'push')]
LONG = ('howTo', 'mechanic', 'notes')

TIPS = [('Yellow cells', 'What you type in. Each column is one weapon, in the order of the weapon wheel (and the number keys). Lists to pick from: Status, Class, How you use it, What it fires, Sound, Sight, and the yes / no rows.', 'tap a cell and type'),
        ('Empty cells', 'A row that does not apply to a weapon stays empty: the melee rows for a gun, the scope rows for a pistol, and so on.', ''),
        ('New weapon', 'Use the next empty column: type its ID in the dark top row, then fill the yellow cells. If it works like an existing one (another pistol, a shotgun = Bullets per shot above 1, another rifle) it can go in game at once.', ''),
        ('New mechanics', 'Anything that works in a new way: set Status to draft, describe it in How to use and How it works (and Look / sound / ideas), fill the numbers you can. Claude builds the mechanics from your words, then it can go in game.', ''),
        ('Finding weapons', 'Nothing but FISTS at the start: every other weapon lies hidden around the city in a bubble of its colour, with its ammo in the same colour. Melee weapons are the most common.', ''),
        ('Remove a weapon', 'Delete its column (or clear its ID).', ''),
        ('Sending it back', 'Upload the file in the chat as it is (.numbers or .xlsx). Every column with an ID becomes a weapon in the table.', '')]


def read_table():
    s = open(JS, encoding='utf-8').read(); i, j = s.index(A) + len(A), s.index(B)
    return s, i, j, json.loads(s[i:j])


def dump(ws):
    return '{\n"weapons": [\n' + ',\n'.join('  ' + json.dumps({k: w.get(k) for k in ORDER}, ensure_ascii=False) for w in ws) + '\n]\n}'


fmt = lambda v: ('%d' % v) if float(v).is_integer() else ('%g' % v)


def cell_value(w, key):                     # a weapon field as the sheet shows it
    v = w.get(key)
    if ROW[key][2] == 'yesno': return None if v is None else ('yes' if v else 'no')
    return v


def choices(key):
    kind = ROW[key][2]; return ROW[key][3] if kind == 'choice' else ['yes', 'no'] if kind == 'yesno' else None


# ---------- export ----------
def export_xlsx(path, t):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter as L
    from openpyxl.worksheet.datavalidation import DataValidation
    F = 'Arial'; f_in = PatternFill('solid', fgColor='FFF7CC'); f_head = PatternFill('solid', fgColor='2B2442'); f_sec = PatternFill('solid', fgColor='5B4A8A')
    f_lab = PatternFill('solid', fgColor='E4E0F2'); f_calc = PatternFill('solid', fgColor='EDEDED'); f_draft = PatternFill('solid', fgColor='FFE3C2')
    thin = Side(style='thin', color='C9C9C9'); box = Border(left=thin, right=thin, top=thin, bottom=thin)
    ws_ = t['weapons']; NW = max(12, len(ws_) + 6); C0, C1 = 2, 1 + NW
    wb = Workbook(); sh = wb.active; sh.title = 'Weapons'; sh.column_dimensions['A'].width = 30
    for j in range(C0, C1 + 1): sh.column_dimensions[L(j)].width = 24
    R = {}
    for i, row in enumerate(ROWS, start=1):
        if row[0] == '#':
            a = sh.cell(row=i, column=1, value=row[1]); a.font = Font(name=F, size=10, bold=True, color='FFFFFF'); a.fill = f_sec
            for n in range(NW):
                c = sh.cell(row=i, column=C0 + n, value=row[2] if n == 0 else None); c.fill = f_sec; c.font = Font(name=F, size=9, italic=True, color='E4E0F2')
            sh.row_dimensions[i].height = 18; continue
        key, lab, kind = row[0], row[1], row[2]; R[key] = i
        a = sh.cell(row=i, column=1, value=lab); a.font = Font(name=F, size=10, bold=True, color='FFFFFF' if key == 'id' else '000000')
        a.fill = f_head if key == 'id' else f_lab; a.alignment = Alignment(wrap_text=True, vertical='center'); a.border = box
        for n in range(NW):
            val = cell_value(ws_[n], key) if n < len(ws_) else None
            c = sh.cell(row=i, column=C0 + n, value=val); c.border = box
            c.alignment = Alignment(horizontal='left' if kind == 'long' else 'center', vertical='top' if kind == 'long' else 'center', wrap_text=kind == 'long')
            if key == 'id': c.font = Font(name=F, size=10, bold=True, color='FFFFFF'); c.fill = f_head
            elif kind == 'colour' and val:
                hx = val.lstrip('#'); lum = 0.299 * int(hx[0:2], 16) + 0.587 * int(hx[2:4], 16) + 0.114 * int(hx[4:6], 16)
                c.fill = PatternFill('solid', fgColor=hx.upper()); c.font = Font(name=F, size=10, color='000000' if lum > 140 else 'FFFFFF')
            else: c.font = Font(name=F, size=10, color='0000FF'); c.fill = f_draft if key == 'status' and val == 'draft' else f_in
        sh.row_dimensions[i].height = {'mechanic': 170, 'howTo': 60, 'notes': 80}.get(key, 30 if len(lab) > 30 else 18)
        span = '%s%d:%s%d' % (L(C0), i, L(C1), i); ch = choices(key)
        if ch:
            dv = DataValidation(type='list', formula1='"%s"' % ','.join(ch), allow_blank=True, showErrorMessage=True, error='Pick from the list.'); sh.add_data_validation(dv); dv.add(span)
        elif kind in ('num', 'int'):
            lo, hi = ROW[key][3]; dv = DataValidation(type='whole' if kind == 'int' else 'decimal', operator='between', formula1=fmt(lo), formula2=fmt(hi), allow_blank=True,
                                                    showErrorMessage=True, error='Enter a number from %s to %s.' % (fmt(lo), fmt(hi))); sh.add_data_validation(dv); dv.add(span)
    i = len(ROWS) + 1; a = sh.cell(row=i, column=1, value='Calc: Check'); a.font = Font(name=F, size=10, bold=True, color='595959'); a.fill = f_calc; a.border = box
    for n in range(NW):
        X = L(C0 + n); r = lambda key: '%s%d' % (X, R[key])
        f = ('=IF({i}="","",IF(COUNTIF($B${ri}:${C1}${ri},{i})>1,"Duplicate ID",IF({nm}="","Name missing",IF({st}="draft","Draft - left out of the game",'
             'IF(OR({u}="new",{f}="new"),"Not built yet - keep it draft",IF({h}="","Add How to use","OK"))))))').format(
            i=r('id'), ri=R['id'], C1=L(C1), nm=r('name'), st=r('status'), u=r('use'), f=r('fires'), h=r('howTo'))
        c = sh.cell(row=i, column=C0 + n, value=f); c.font = Font(name=F, size=10); c.fill = f_calc; c.border = box; c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    sh.row_dimensions[i].height = 32; sh.freeze_panes = 'B2'
    g = wb.create_sheet('How to fill'); g.column_dimensions['A'].width = 30; g.column_dimensions['B'].width = 70; g.column_dimensions['C'].width = 28
    for j, h in enumerate(['Item', 'What it means', 'Unit / how to fill'], start=1):
        c = g.cell(row=1, column=j, value=h); c.font = Font(name=F, size=10, bold=True, color='FFFFFF'); c.fill = f_head; c.border = box
    rows = TIPS + [('Grey row', 'Check says OK when a column can go in the game, otherwise what to do.', '')] + guide_rows()
    for i, row in enumerate(rows, start=2):
        sec = row[2] == '#'
        for j, v in enumerate(row, start=1):
            c = g.cell(row=i, column=j, value='' if sec and j == 3 else v); c.font = Font(name=F, size=10, bold=(j == 1 or sec), color='FFFFFF' if sec else '000000')
            c.alignment = Alignment(wrap_text=True, vertical='top'); c.border = box; c.fill = f_sec if sec else (f_lab if j == 1 else PatternFill())
    g.freeze_panes = 'A2'; wb.save(path)


def guide_rows():                           # the How to fill sheet: every section and setting
    out = []
    for row in ROWS:
        if row[0] == '#': out.append((row[1], row[2], '#'))
        else: out.append((row[1], row[4], row[5]))
    return out


def export_numbers(path, t):
    from numbers_parser import Alignment, Document, RGB
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from settings_sheet import exact_numbers; exact_numbers()
    ws_ = t['weapons']; NW = max(12, len(ws_) + 6)
    doc = Document(sheet_name='Weapons', table_name='Weapons', num_header_rows=1, num_header_cols=1, num_rows=len(ROWS), num_cols=NW + 1); tb = doc.sheets[0].tables[0]
    S = {}
    def style(name, **kw):
        if name not in S:
            S[name] = doc.add_style(name=name, font_name='Helvetica Neue', font_size=kw.pop('size', 11.0), alignment=Alignment(kw.pop('h', 'left'), kw.pop('v', 'middle')), **kw)
        return S[name]
    head = style('BR head', bg_color=RGB(43, 36, 66), font_color=RGB(255, 255, 255), bold=True, h='center'); sec = style('BR section', bg_color=RGB(91, 74, 138), font_color=RGB(255, 255, 255), bold=True)
    sec_n = style('BR section note', bg_color=RGB(91, 74, 138), font_color=RGB(228, 224, 242), italic=True, size=10.0)
    lab_s = style('BR label', bg_color=RGB(228, 224, 242), bold=True); inp = style('BR value', bg_color=RGB(255, 247, 204), font_color=RGB(0, 0, 255), h='center')
    draft = style('BR draft', bg_color=RGB(255, 227, 194), font_color=RGB(0, 0, 255), h='center')
    longs = style('BR long', bg_color=RGB(255, 247, 204), font_color=RGB(0, 0, 255), v='top', size=10.0); txt = style('BR text')
    tb.col_width(0, 210)
    for j in range(1, NW + 1): tb.col_width(j, 170)
    for i, row in enumerate(ROWS):
        if row[0] == '#':
            tb.write(i, 0, row[1], style=sec); tb.write(i, 1, row[2], style=sec_n)
            for n in range(1, NW): tb.set_cell_style(i, 1 + n, sec)
            tb.row_height(i, 24); continue
        key, lab, kind = row[0], row[1], row[2]
        tb.write(i, 0, lab, style=head if key == 'id' else lab_s)
        for n in range(NW):
            val = cell_value(ws_[n], key) if n < len(ws_) else None
            if key == 'id':
                if val is not None: tb.write(i, 1 + n, val, style=head)
                else: tb.set_cell_style(i, 1 + n, head)
                continue
            st = longs if kind == 'long' else draft if key == 'status' and val == 'draft' else inp; ch = choices(key)
            if kind == 'colour' and val:
                hx = val.lstrip('#'); r, g, b = int(hx[0:2], 16), int(hx[2:4], 16), int(hx[4:6], 16); light = 0.299 * r + 0.587 * g + 0.114 * b > 140
                tb.write(i, 1 + n, val, style=style('BR colour ' + hx, bg_color=RGB(r, g, b), font_color=RGB(0, 0, 0) if light else RGB(255, 255, 255), h='center')); continue
            if val is None or val == '':
                if ch: tb.write(i, 1 + n, '', style=st)                 # a pop-up menu needs a (blank) text cell under it
                else: tb.set_cell_style(i, 1 + n, st)
            else: tb.write(i, 1 + n, val, style=st)
            if ch: tb.set_cell_formatting(i, 1 + n, 'popup', popup_values=ch, allow_none=True)
        tb.row_height(i, {'mechanic': 230, 'howTo': 64, 'notes': 96}.get(key, 40 if len(lab) > 30 else 26))
    rows = TIPS + [('Checks', 'This Numbers file has no formulas: every column is checked when the file comes back, and anything to fix is listed for you.', '')] + guide_rows()
    doc.add_sheet('How to fill', 'How to fill', num_rows=len(rows) + 1, num_cols=3)
    g = doc.sheets[-1].tables[0]; g.num_header_rows = 1; g.num_header_cols = 1; g.col_width(0, 200); g.col_width(1, 460); g.col_width(2, 170)
    for j, h in enumerate(['Item', 'What it means', 'Unit / how to fill']): g.write(0, j, h, style=head)
    for i, row in enumerate(rows, start=1):
        if row[2] == '#':
            g.write(i, 0, row[0], style=sec); g.write(i, 1, row[1], style=sec_n); g.set_cell_style(i, 2, sec); g.row_height(i, 26); continue
        g.write(i, 0, row[0], style=lab_s); g.write(i, 1, row[1], style=txt); g.write(i, 2, row[2] or '', style=txt); g.row_height(i, 56)
    doc.save(path)


# ---------- import ----------
def read_columns(path):
    """the Weapons table as {field: value} per weapon column, plus the fields the file has rows for"""
    if path.lower().endswith('.numbers'):
        from numbers_parser import Document
        sheets = {sh.name: [tuple(r) for r in sh.tables[0].rows(values_only=True)] for sh in Document(path).sheets}
    else:
        from openpyxl import load_workbook
        sheets = {ws.title: list(ws.iter_rows(values_only=True)) for ws in load_workbook(path, data_only=True).worksheets}
    rows = next((r for n, r in sheets.items() if n.lower().startswith('weapons')), None) or next(iter(sheets.values()))
    field_row = {}
    for k, row in enumerate(rows):
        lab = str(row[0] or '').strip().lower()
        for key, start in MATCH:
            if lab == start if key == 'id' else lab.startswith(start):
                field_row.setdefault(key, k); break
    if 'id' not in field_row: raise SystemExit('No row labelled ID in the first column.')
    cols = []
    for j in range(1, len(rows[field_row['id']])):
        wid = rows[field_row['id']][j]
        if wid in (None, '') or str(wid).strip() == '': continue
        cols.append({key: (rows[k][j] if j < len(rows[k]) else None) for key, k in field_row.items()})
    return cols, set(field_row)


def norm_id(v): return re.sub(r'[^a-z0-9]+', '_', str(v).strip().lower()).strip('_')


def num(v):
    if isinstance(v, bool) or v is None: return None
    if isinstance(v, str):
        try: v = float(v.strip().replace(',', '.'))
        except ValueError: return None
    v = round(float(v), 6); return int(v) if v.is_integer() else v


def build(cols, present, old):
    """weapons from the sheet columns; rows the file does not have keep their values. -> weapons, errors, warnings"""
    olds = {w['id']: w for w in old}; out, errors, warns, seen = [], [], [], set()
    for col in cols:
        wid = norm_id(col['id']); where = 'Column %s' % wid
        if wid in seen: errors.append('%s: the ID is used twice' % where); continue
        seen.add(wid); w = {k: None for k in ORDER}; w.update(olds.get(wid, {})); w['id'] = wid
        for key in present:
            if key == 'id': continue
            raw = col.get(key); kind = ROW[key][2]; lab = ROW[key][1]
            if isinstance(raw, str): raw = raw.strip()
            if kind in ('text', 'long'): w[key] = '' if raw is None else str(raw)
            elif raw in (None, ''): w[key] = None
            elif kind == 'colour':
                if re.fullmatch(r'#?[0-9a-fA-F]{6}', str(raw)): w[key] = '#' + str(raw).lstrip('#').lower()
                else: errors.append('%s / %s: "%s" is not a colour like #ff2bd6' % (where, lab, raw))
            elif kind == 'yesno':
                if isinstance(raw, bool): w[key] = raw
                elif str(raw).lower() in ('yes', 'no', 'true', 'false'): w[key] = str(raw).lower() in ('yes', 'true')
                else: errors.append('%s / %s: "%s" is not yes or no' % (where, lab, raw))
            elif kind == 'choice':
                s = str(raw).lower()
                if s in ROW[key][3]: w[key] = s
                else: errors.append('%s / %s: "%s" is not one of %s' % (where, lab, raw, ', '.join(ROW[key][3])))
            else:
                n = num(raw); lo, hi = ROW[key][3]
                if n is None: errors.append('%s / %s: "%s" is not a number' % (where, lab, raw))
                elif n < lo or n > hi: errors.append('%s / %s: %s is outside %s to %s' % (where, lab, fmt(n), fmt(lo), fmt(hi)))
                elif kind == 'int' and not float(n).is_integer(): errors.append('%s / %s: %s must be a whole number' % (where, lab, fmt(n)))
                else: w[key] = n
        for key, d in (('status', 'draft'), ('sight', 'none'), ('sound', 'new'), ('howTo', ''), ('mechanic', ''), ('notes', '')):
            if w.get(key) in (None,): w[key] = d
        for key in ('name', 'short'):
            if not w.get(key): errors.append('%s: %s is missing' % (where, ROW[key][1]))
        if w['status'] == 'draft':
            if not w.get('mechanic'): warns.append('%s: draft without a description - say in How it works how it should behave' % where)
            else: warns.append('%s: draft - left out of the game until it is built' % where)
        else:
            new = [x for x in (w.get('use'), w.get('fires')) if x and x not in BUILT_USE + BUILT_FIRES]
            if new: errors.append('%s: %s not built yet - set Status to draft and describe it in How it works; Claude builds it' % (where, ' and '.join(new))); out.append(w); continue
            for key in ('class', 'use', 'fires', 'sound'):
                if not w.get(key): errors.append('%s: %s is missing' % (where, ROW[key][1]))
            if not w.get('howTo'): errors.append('%s: How to use is missing (it is shown in the game)' % where)
            need = ['dmg', 'rate', 'heat', 'hear', 'panic', 'color']
            if w.get('fires') in ('bullet', 'rocket'): need += ['range', 'mag', 'reload', 'carDmg']
            if w.get('use') == 'scope': need += ['zoom']
            if w.get('fires') == 'rocket': need += ['blast', 'speed']
            if w.get('use') == 'swing': need += ['reach', 'arc']
            if w.get('use') == 'throw': need += ['blast', 'speed', 'fuse', 'throw', 'mag']
            for key in need:
                if w.get(key) is None: errors.append('%s: %s is needed for a weapon in the game' % (where, ROW[key][1]))
            if w.get('use') == 'scope' and w.get('sight') == 'none': errors.append('%s: a scope weapon needs a Sight (round or rect)' % where)
            if w.get('fires') in ('bullet', 'rocket') and not w.get('mag'): errors.append('%s: a gun needs a Magazine of 1 or more' % where)
        if (w.get('pickup') or 0) > 0 and not (w.get('ammoMap') or 0): warns.append('%s: Rounds per ammo pickup, but no Ammo pickups on the map - ammo only comes with the weapon' % where)
        if w['status'] == 'in game' and not w.get('start') and not (w.get('onMap') or 0): warns.append('%s: not had at the start and no Weapon pickups on the map - nobody can get it' % where)
        if isinstance(w.get('ammo'), (int, float)) and isinstance(w.get('maxAmmo'), (int, float)) and w['ammo'] > w['maxAmmo']:
            warns.append('%s: starts with more spare rounds (%s) than it can carry (%s)' % (where, fmt(w['ammo']), fmt(w['maxAmmo'])))
        out.append({k: w.get(k) for k in ORDER})
    live = [w for w in out if w['status'] == 'in game']
    for w in live:
        if (w.get('carry') or 0) > 0 and not (w.get('use') == 'swing' or (w.get('fires') == 'bullet' and w.get('use') in ('tap', 'hold'))):
            errors.append('Column %s: people can only carry melee weapons and guns that fire bullets on tap or hold' % w['id'])
    if sum(w.get('carry') or 0 for w in live) > 100: errors.append('Carried by people adds up to more than 100 %')
    if not live: errors.append('At least one weapon needs Status in game')
    cols_ = {}
    for w in out:
        if w.get('color'): cols_.setdefault(w['color'], []).append(w['id'])
    for c, ids in cols_.items():
        if len(ids) > 1: errors.append('Bubble colour %s is used by %s - every weapon needs its own' % (c, ' and '.join(ids)))
    for w in live:
        if w.get('fires') == 'grenade' and isinstance(w.get('speed'), (int, float)) and isinstance(w.get('throw'), (int, float)) and (w['speed'] / 3.6) ** 2 / 9.81 < w['throw'] * 0.8:
            warns.append('Column %s: at %s km/h it only reaches about %.0f m, not the %s m throw range' % (w['id'], fmt(w['speed']), (w['speed'] / 3.6) ** 2 / 9.81, fmt(w['throw'])))
    gone = [k for k in olds if k not in seen]
    if gone: warns.append('Removed (their columns are gone): ' + ', '.join(gone))
    return out, errors, warns


def changes(old, new):
    o = {w['id']: w for w in old}; out = []
    for w in new:
        if w['id'] not in o: out.append('new weapon %s (%s, %s)' % (w['id'], w['name'], w['status'])); continue
        for k in ORDER:
            if w.get(k) != o[w['id']].get(k): out.append('%s / %s: %s -> %s' % (w['id'], k, o[w['id']].get(k), w.get(k)))
    return out


def do_import(path, dry):
    s, i, j, t = read_table(); cols, present = read_columns(path)
    ws_, errors, warns = build(cols, present, t['weapons'])
    for w in warns: print('note: ' + w)
    if errors: print('Not imported - fix these first:'); [print('  ' + e) for e in errors]; sys.exit(1)
    ch = changes(t['weapons'], ws_); print('%d change%s' % (len(ch), '' if len(ch) == 1 else 's') + (':' if ch else '')); [print('  ' + c) for c in ch]
    if not dry and (ch or [w['id'] for w in ws_] != [w['id'] for w in t['weapons']]):
        open(JS, 'w', encoding='utf-8').write(s[:i] + dump(ws_) + s[j:]); print('written', os.path.relpath(JS))


if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('export', 'import'): print(__doc__); sys.exit(2)
    if sys.argv[1] == 'export':
        t = read_table()[3]; (export_numbers if sys.argv[2].lower().endswith('.numbers') else export_xlsx)(sys.argv[2], t); print('saved', sys.argv[2])
    else: do_import(sys.argv[2], '--dry-run' in sys.argv[3:])
