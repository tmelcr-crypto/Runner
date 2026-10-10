"""The whole economy <-> one spreadsheet (Apple Numbers or Excel).

  python3 tools/economy_sheet.py export economy.numbers            every price in the game in one table (or .xlsx)
  python3 tools/economy_sheet.py import economy.numbers [--dry-run] read an edited file back, check it, write each price to its table

Column A is the action or the commodity, column B its price - or, for a random amount, the least in B and the most in C ("Up to").
Your score is your cash. The prices live with what they belong to, and
an import writes each one back there (only the price, the rest of each table is left as it is):
  what deeds pay         js/01i-economy-data.js
  rampage rewards        js/01h-rampage-data.js   (also tools/rampage_sheet.py)
  fine, bail, bill       js/01b-police-data.js    (also tools/settings_sheet.py police)
  health, body armor     js/01g-shop-data.js
  weapons and their ammo js/01f-weapon-data.js    (also tools/weapon_sheet.py)
Rows are found by the key in the last column, so they may be moved; a row that is missing keeps its price.
Needs openpyxl for .xlsx and numbers-parser for .numbers."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); JSD = os.path.join(HERE, '..', 'js')
FILES = {'eco': ('01i-economy-data.js', 'ECONOMY'), 'ramp': ('01h-rampage-data.js', 'RAMPAGE'), 'police': ('01b-police-data.js', 'POLICE'),
         'shop': ('01g-shop-data.js', 'SHOP'), 'weapon': ('01f-weapon-data.js', 'WEAPON')}
HEADS = ['Action or commodity', 'Price (or from)', 'Up to', 'Unit', 'Notes', 'Key (do not change)']
USD, PCT = '€', '% of your cash'
LIMITS = {'€': (0, 1000000), '$': (0, 1000000), 'count': (0, 100), 's': (5, 600)}


def path(f): return os.path.join(JSD, FILES[f][0])


def block(f):                               # (file text, start, end, parsed JSON) of a table
    s = open(path(f), encoding='utf-8').read(); a, b = '/*%s-JSON*/' % FILES[f][1], '/*END-%s-JSON*/' % FILES[f][1]
    i, j = s.index(a) + len(a), s.index(b); return s, i, j, json.loads(s[i:j])


def nice(n): return n if len(n) <= 3 else n.capitalize()   # SMG stays SMG


def rows():
    """every price as a row: (section) or dict(key, label, value, unit, note, file, id, field, lo, hi, empty_ok)"""
    eco, ramp, pol, shop, wpn = (block(f)[3] for f in ('eco', 'ramp', 'police', 'shop', 'weapon'))
    W = {w['id']: w for w in wpn['weapons'] if w.get('status') == 'in game'}
    sold = {}
    for s in shop['stores']:
        for i in s['sells']: sold.setdefault(i, []).append(s['name'])
    where = lambda i: 'Sold at ' + ', '.join(sold[i]) + '.' if i in sold else 'Not sold in any store (a store\'s list is in js/01g).'
    out = [('#', 'EARNINGS', 'Where cash comes from. A range: a random amount from B to C each time. Killing pays only through the cash the dead drop.')]
    for r in eco['earn']:
        u = r.get('unit', USD); lo, hi = LIMITS.get(u, (0, 1000000)); ranged = r.get('min') is not None
        out.append(dict(key='earn.' + r['id'], label=r['name'], value=r['min'] if ranged else r['v'], value2=r['max'] if ranged else None, ranged=ranged, unit=u, note=r.get('note', ''),
                        file='eco', id=r['id'], field='min' if ranged else 'v', lo=lo, hi=hi, empty_ok=False))
    out.append(('#', 'RAMPAGE REWARDS', 'Paid the first time you pass a rampage (you also keep its weapon). A replay pays nothing.'))
    for n, r in enumerate(ramp['rampages'], start=1):
        w = nice(W.get(r['weapon'], {}).get('name', r['weapon'])); goal = ('kill %d people' if r['target'] == 'people' else 'wreck %d vehicles') % r['count']
        out.append(dict(key='rampage.' + r['id'], label='Rampage %d: %s' % (n, r['name']), value=r.get('reward') or 0, unit=USD,
                        note='%s: %s in %d:%02d.' % (w, goal, r['time'] // 60, r['time'] % 60), file='ramp', id=r['id'], field='reward', lo=0, hi=1000000, empty_ok=False))
    out.append(('#', 'FINES AND BILLS', 'What the police and the hospital take from your cash (never below 0).'))
    ps = {r['id']: r for r in pol['settings']}
    for pid, lab in (('fine', 'Fine (stop order at 1 star)'), ('bustedCash', 'Bail when busted'), ('wastedCash', 'Hospital bill when wasted')):
        r = ps[pid]; out.append(dict(key='police.' + pid, label=lab, value=r['v'], unit=USD if r['unit'] != '%' else PCT, note=r.get('note', ''), file='police', id=pid, field='v',
                                     lo=r.get('min', 0), hi=r.get('max', 1000000), empty_ok=False))
    out.append(('#', 'STORE: HEALTH AND ARMOR', 'Prices in the stores that sell them. Empty: never sold.'))
    for it in shop['items']:
        out.append(dict(key='item.' + it['id'], label='%s +%s' % (it['name'].capitalize(), it['amount']) if it['id'] != 'bribe' else it['name'].capitalize(), value=it.get('price'), unit=USD,
                        note=where(it['id']), file='shop', id=it['id'], field='price', lo=0, hi=1000000, empty_ok=True))
    out.append(('#', 'STORE: WEAPONS', 'A weapon bought comes loaded, with its spare rounds. Empty: never sold.'))
    for w in W.values():
        if w.get('start'): continue
        out.append(dict(key='weapon.' + w['id'], label=nice(w['name']), value=w.get('price'), unit=USD, note=where(w['id']), file='weapon', id=w['id'], field='price', lo=0, hi=1000000, empty_ok=True))
    out.append(('#', 'STORE: AMMO', 'One pack: the rounds of one ammo pickup. Sold where its weapon is sold.'))
    for w in W.values():
        if w.get('start') or not (w.get('pickup') or 0) or w.get('use') == 'swing': continue
        lab = ('%s +%d' % (nice(w['name']) + 's', w['pickup'])) if w.get('use') == 'throw' else ('%ss +%d' % (nice(w['short']), w['pickup'])) if w.get('class') == 'launcher' \
            else '%s ammo +%d rounds' % (nice(w['name']), w['pickup'])
        out.append(dict(key='ammo.' + w['id'], label=lab, value=w.get('ammoPrice'), unit=USD, note=where(w['id']), file='weapon', id=w['id'], field='ammoPrice', lo=0, hi=1000000, empty_ok=True))
    for r in out:
        if isinstance(r, dict): r.setdefault('ranged', False); r.setdefault('value2', None)
    return out


TIPS = [('Yellow cells', 'The prices: type a new one in column B. Dollars are whole numbers; the bail and the hospital bill are a share of your cash in %.', 'tap a cell and type'),
        ('Random amounts', 'Rows with a value in C (Up to) are random each time, from B to C. Make B and C equal for a fixed amount. Rows without C take only B.', ''),
        ('Empty price', 'For store goods: never sold. Everything else needs a price (0 is allowed).', ''),
        ('What sells where', 'Which store sells what is in js/01g (each store\'s list). New weapons and rampages come from their own tables (weapon and rampage sheets).', ''),
        ('Keys', 'The grey last column tells the game which price a row is. Do not change it; rows may be moved or sorted.', ''),
        ('Sending it back', 'Upload the file in the chat as it is (.numbers or .xlsx). Each price is written back to its own table.', '')]


fmt = lambda v: ('%d' % v) if float(v).is_integer() else ('%g' % v)


# ---------- export ----------
def export_xlsx(dest):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.worksheet.datavalidation import DataValidation
    F = 'Arial'; f_in = PatternFill('solid', fgColor='FFF7CC'); f_head = PatternFill('solid', fgColor='2B2442'); f_sec = PatternFill('solid', fgColor='5B4A8A')
    f_lab = PatternFill('solid', fgColor='E4E0F2'); f_key = PatternFill('solid', fgColor='EDEDED')
    thin = Side(style='thin', color='C9C9C9'); box = Border(left=thin, right=thin, top=thin, bottom=thin)
    wb = Workbook(); sh = wb.active; sh.title = 'Economy'
    for col, wd in zip('ABCDEF', (40, 14, 10, 16, 70, 22)): sh.column_dimensions[col].width = wd
    for j, h in enumerate(HEADS, start=1):
        c = sh.cell(row=1, column=j, value=h); c.font = Font(name=F, size=10, bold=True, color='FFFFFF'); c.fill = f_head; c.border = box; c.alignment = Alignment(horizontal='center', vertical='center')
    usd = DataValidation(type='whole', operator='between', formula1='0', formula2='1000000', allow_blank=True, showErrorMessage=True, error='Dollars: a whole number from 0 to 1,000,000.')
    pct = DataValidation(type='decimal', operator='between', formula1='0', formula2='100', allow_blank=True, showErrorMessage=True, error='A share from 0 to 100 %.')
    sh.add_data_validation(usd); sh.add_data_validation(pct)
    for i, r in enumerate(rows(), start=2):
        if isinstance(r, tuple):
            a = sh.cell(row=i, column=1, value=r[1]); a.font = Font(name=F, size=10, bold=True, color='FFFFFF'); a.fill = f_sec
            for j in range(2, 7): c = sh.cell(row=i, column=j, value=r[2] if j == 5 else None); c.fill = f_sec; c.font = Font(name=F, size=9, italic=True, color='E4E0F2')
            continue
        vals = [r['label'], r['value'], r['value2'], r['unit'], r['note'], r['key']]
        for j, v in enumerate(vals, start=1):
            inp = j == 2 or (j == 3 and r['ranged'])
            c = sh.cell(row=i, column=j, value=v); c.border = box; c.alignment = Alignment(vertical='center', wrap_text=j == 5, horizontal='center' if j in (2, 3, 4) else 'left')
            c.font = Font(name=F, size=10, bold=j == 1, color='0000FF' if inp else '595959' if j == 6 else '000000')
            c.fill = f_lab if j == 1 else f_in if inp else f_key if j == 6 else PatternFill()
            if j in (2, 3): c.number_format = '#,##0' if r['unit'] == USD else '0.##'
        (pct if r['unit'] == PCT else usd).add('B%d' % i)
        if r['ranged']: usd.add('C%d' % i)
    sh.freeze_panes = 'B2'
    g = wb.create_sheet('How to fill'); g.column_dimensions['A'].width = 22; g.column_dimensions['B'].width = 80; g.column_dimensions['C'].width = 22
    for j, h in enumerate(['Item', 'What it means', 'How to fill'], start=1):
        c = g.cell(row=1, column=j, value=h); c.font = Font(name=F, size=10, bold=True, color='FFFFFF'); c.fill = f_head; c.border = box
    for i, row in enumerate(TIPS, start=2):
        for j, v in enumerate(row, start=1): c = g.cell(row=i, column=j, value=v); c.font = Font(name=F, size=10, bold=j == 1); c.alignment = Alignment(wrap_text=True, vertical='top'); c.border = box
    wb.save(dest)


def export_numbers(dest):
    from numbers_parser import Alignment, Document, RGB
    sys.path.insert(0, HERE); from settings_sheet import exact_numbers; exact_numbers()
    R = rows(); doc = Document(sheet_name='Economy', table_name='Economy', num_header_rows=1, num_header_cols=1, num_rows=len(R) + 1, num_cols=len(HEADS)); tb = doc.sheets[0].tables[0]
    S = {}
    def style(name, **kw):
        if name not in S: S[name] = doc.add_style(name=name, font_name='Helvetica Neue', font_size=kw.pop('size', 11.0), alignment=Alignment(kw.pop('h', 'left'), kw.pop('v', 'middle')), **kw)
        return S[name]
    head = style('BR head', bg_color=RGB(43, 36, 66), font_color=RGB(255, 255, 255), bold=True, h='center'); sec = style('BR section', bg_color=RGB(91, 74, 138), font_color=RGB(255, 255, 255), bold=True)
    sec_n = style('BR section note', bg_color=RGB(91, 74, 138), font_color=RGB(228, 224, 242), italic=True, size=10.0)
    lab = style('BR label', bg_color=RGB(228, 224, 242), bold=True); val = style('BR value', bg_color=RGB(255, 247, 204), font_color=RGB(0, 0, 255), h='center')
    unit = style('BR unit', h='center', size=10.0); note = style('BR note', size=10.0); key = style('BR key', bg_color=RGB(237, 237, 237), font_color=RGB(89, 89, 89), size=10.0)
    for j, w in enumerate((260, 90, 70, 110, 420, 140)): tb.col_width(j, w)
    for j, h in enumerate(HEADS): tb.write(0, j, h, style=head)
    for i, r in enumerate(R, start=1):
        if isinstance(r, tuple):
            tb.write(i, 0, r[1], style=sec); tb.write(i, 4, r[2], style=sec_n)
            for j in (1, 2, 3, 5): tb.set_cell_style(i, j, sec)
            tb.row_height(i, 24); continue
        tb.write(i, 0, r['label'], style=lab)
        if r['value'] is None: tb.set_cell_style(i, 1, val)
        else: tb.write(i, 1, r['value'], style=val)
        if r['ranged']: tb.write(i, 2, r['value2'], style=val)
        tb.write(i, 3, r['unit'], style=unit); tb.write(i, 4, r['note'] or '', style=note); tb.write(i, 5, r['key'], style=key); tb.row_height(i, 30 if len(r['note'] or '') < 70 else 44)
    doc.add_sheet('How to fill', 'How to fill', num_rows=len(TIPS) + 1, num_cols=3)
    g = doc.sheets[-1].tables[0]; g.num_header_rows = 1; g.num_header_cols = 1; g.col_width(0, 160); g.col_width(1, 480); g.col_width(2, 150)
    for j, h in enumerate(['Item', 'What it means', 'How to fill']): g.write(0, j, h, style=head)
    for i, row in enumerate(TIPS, start=1): g.write(i, 0, row[0], style=lab); g.write(i, 1, row[1], style=note); g.write(i, 2, row[2], style=note); g.row_height(i, 48)
    doc.save(dest)


# ---------- import ----------
def read_sheet(src):
    if src.lower().endswith('.numbers'):
        from numbers_parser import Document
        sheets = {sh.name: [tuple(r) for r in sh.tables[0].rows(values_only=True)] for sh in Document(src).sheets}
    else:
        from openpyxl import load_workbook
        sheets = {ws.title: list(ws.iter_rows(values_only=True)) for ws in load_workbook(src, data_only=True).worksheets}
    data = next((r for n, r in sheets.items() if n.lower().startswith('economy')), None) or next(iter(sheets.values()))
    col = {}
    for j, h in enumerate(data[0]):
        h = str(h or '').strip().lower()
        for k, start in (('label', 'action'), ('price', 'price'), ('upto', 'up to'), ('key', 'key')):
            if h.startswith(start) and k not in col: col[k] = j
    if 'price' not in col or ('key' not in col and 'label' not in col): raise SystemExit('Needs a Price column and a Key column (first row headings).')
    cell = lambda row, k: row[col[k]] if k in col and col[k] < len(row) else None
    return [{'label': cell(r, 'label'), 'price': cell(r, 'price'), 'upto': cell(r, 'upto'), 'key': cell(r, 'key')} for r in data[1:]]


def num(v):
    if isinstance(v, bool) or v is None: return None
    if isinstance(v, str):
        v = v.strip().replace(',', '').replace('$', '').replace('€', '').replace('%', '')
        if v == '': return ''
        try: v = float(v)
        except ValueError: return None
    v = round(float(v), 6); return int(v) if v.is_integer() else v


def set_field(text, f, rid, field, value):  # one price, written into its own line of the table (the table's layout is kept)
    a, b = '/*%s-JSON*/' % FILES[f][1], '/*END-%s-JSON*/' % FILES[f][1]; i, j = text.index(a) + len(a), text.index(b)
    lines = text[i:j].split('\n'); hit = [k for k, l in enumerate(lines) if '"id": %s,' % json.dumps(rid) in l]
    if len(hit) != 1: raise SystemExit('%s: cannot find one line for %s' % (FILES[f][0], rid))
    pat = re.compile(r'("%s": )(null|true|false|-?[0-9][0-9.eE+-]*)' % re.escape(field)); l = lines[hit[0]]
    if not pat.search(l): raise SystemExit('%s: %s has no %s' % (FILES[f][0], rid, field))
    lines[hit[0]] = pat.sub(lambda m: m.group(1) + json.dumps(value), l, count=1)
    out = text[:i] + '\n'.join(lines) + text[j:]; json.loads(out[i:out.index(b)]); return out


def do_import(src, dry):
    known = {r['key']: r for r in rows() if isinstance(r, dict)}; by_label = {r['label'].lower(): r for r in known.values()}
    errors, notes, ch = [], [], []
    for n, row in enumerate(read_sheet(src), start=2):
        k = str(row['key'] or '').strip(); r = known.get(k) or (by_label.get(str(row['label'] or '').strip().lower()) if not k else None)
        if not r:
            if k: notes.append('Row %d: unknown key %s - left out' % (n, k))
            continue
        raw = row['price']; where = 'Row %d (%s)' % (n, r['label'])
        if raw is None or (isinstance(raw, str) and raw.strip() == ''):
            if not r['empty_ok']: errors.append('%s: needs a price' % where); continue
            v = None
        else:
            v = num(raw)
            if v is None or v == '': errors.append('%s: "%s" is not a number' % (where, raw)); continue
            if v < r['lo'] or v > r['hi']: errors.append('%s: %s is outside %s to %s' % (where, fmt(v), fmt(r['lo']), fmt(r['hi']))); continue
            if r['unit'] != PCT and not float(v).is_integer(): errors.append('%s: must be a whole number' % where); continue
        if r['ranged']:                                                # a random amount: B the least, C the most (C empty: B both)
            raw2 = row.get('upto'); v2 = v if raw2 is None or (isinstance(raw2, str) and raw2.strip() == '') else num(raw2)
            if v2 is None or v2 == '' or v2 < r['lo'] or v2 > r['hi'] or not float(v2).is_integer(): errors.append('%s: Up to "%s" must be a whole number from %s to %s' % (where, raw2, fmt(r['lo']), fmt(r['hi']))); continue
            if v2 < v: errors.append('%s: Up to (%s) is less than the price from (%s)' % (where, fmt(v2), fmt(v))); continue
            if v != r['value']: ch.append((r, v))
            if v2 != r['value2']: ch.append((dict(r, field='max', value=r['value2'], label=r['label'] + ' (up to)'), v2))
            continue
        if v != r['value']: ch.append((r, v))
    for x in notes: print('note: ' + x)
    if errors: print('Not imported - fix these first:'); [print('  ' + e) for e in errors]; sys.exit(1)
    print('%d change%s' % (len(ch), '' if len(ch) == 1 else 's') + (':' if ch else ''))
    for r, v in ch: print('  %s: %s -> %s  (%s)' % (r['label'], r['value'], v, FILES[r['file']][0]))
    if dry or not ch: return
    texts = {}
    for r, v in ch:
        t = texts.get(r['file']) or open(path(r['file']), encoding='utf-8').read(); texts[r['file']] = set_field(t, r['file'], r['id'], r['field'], v)
    for f, t in texts.items(): open(path(f), 'w', encoding='utf-8').write(t); print('written', os.path.relpath(path(f)))


if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('export', 'import'): print(__doc__); sys.exit(2)
    if sys.argv[1] == 'export': (export_numbers if sys.argv[2].lower().endswith('.numbers') else export_xlsx)(sys.argv[2]); print('saved', sys.argv[2])
    else: do_import(sys.argv[2], '--dry-run' in sys.argv[3:])
