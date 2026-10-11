"""Unique buildings table <-> spreadsheet (Apple Numbers or Excel): the 120 buildings with their own model and neon name, and where they
go (js/01r-buildings-data.js).

  python3 tools/buildings_sheet.py export buildings.numbers            write the table as a Numbers file (or .xlsx)
  python3 tools/buildings_sheet.py import buildings.numbers [--dry-run] read an edited file back, check it, rewrite the table

Sheets: Buildings (one row per building: the name in neon, its kind, the colour of its walls and of its neon, notes) and Settings
(how far apart they stand, what counts as the beachfront, how many hotels go there). Rows are found by the ID column.
Needs openpyxl for .xlsx and numbers-parser for .numbers."""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__)); JS = os.path.join(HERE, '..', 'js', '01r-buildings-data.js')
A, B = '/*UNIQUE-JSON*/', '/*END-UNIQUE-JSON*/'
KINDS = ['deco', 'streamline', 'mimo', 'med', 'diner', 'cinema', 'bank', 'church', 'club', 'shop', 'office']
fmt = lambda v: ('%d' % v) if float(v).is_integer() else ('%g' % v)
TIPS = [('Yellow cells', 'What you can change: the name in neon, the kind of building, its wall colour and its neon colour.', 'tap a cell and type'),
        ('Kind', 'deco (Art Deco hotel), streamline (Streamline Moderne hotel), mimo (MiMo motel), med (Mediterranean villa), diner, cinema, bank, church, club (nightclub), shop, office.', 'pick from the list'),
        ('Colours', 'As #RRGGBB, for example #ffb3c7 (pink) or #2bf3ff (cyan).', '#RRGGBB'),
        ('Where they stand', 'The game picks each lot: an ordinary building facing a street, the right size for the kind, hotels and motels on the beachfront first. The Sea Breeze stays by the old start.', ''),
        ('Settings', 'How far apart two of them stand, how close to the sea counts as the beachfront, and how many of the hotels and motels go there.', ''),
        ('Sending it back', 'Upload the file in the chat as it is (.numbers or .xlsx). Every value is checked before anything is written.', '')]
HO_HEAD = ['Name on screen', 'Kind', 'Walls', 'Neon', 'Notes', 'ID']
ST_HEAD = ['Setting', 'Value', 'Unit', 'Allowed', 'Notes', 'ID']


def read_table():
    s = open(JS, encoding='utf-8').read(); i, j = s.index(A) + len(A), s.index(B); return s, i, j, json.loads(s[i:j])


def dump(t):
    out = ['{']
    for n, (k, rows) in enumerate(t.items()):
        out.append('"%s": [' % k)
        out += ['  ' + json.dumps(r, ensure_ascii=False) + (',' if m < len(rows) - 1 else '') for m, r in enumerate(rows)]
        out.append(']' + (',' if n < len(t) - 1 else ''))
    return '\n'.join(out + ['}'])


def sheet_data(t):
    st = [[r['name'], r['v'], r['unit'], '%s to %s' % (fmt(r['min']), fmt(r['max'])), r.get('note', ''), r['id']] for r in t['settings']]
    ho = [[h['name'], h['kind'], h['c'], h['neon'], h.get('note', ''), h['id']] for h in t['buildings']]
    return st, ho


def export_xlsx(dest, t):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.worksheet.datavalidation import DataValidation
    F = 'Arial'; f_in = PatternFill('solid', fgColor='FFF7CC'); f_head = PatternFill('solid', fgColor='2B2442'); f_lab = PatternFill('solid', fgColor='E4E0F2'); f_key = PatternFill('solid', fgColor='EDEDED')
    thin = Side(style='thin', color='C9C9C9'); box = Border(left=thin, right=thin, top=thin, bottom=thin)
    st, ho = sheet_data(t); wb = Workbook(); first = True
    def sheet(title, head, rows, widths, inputs, lists):
        nonlocal first
        ws = wb.active if first else wb.create_sheet(title); ws.title = title; first = False
        for j, h in enumerate(head, start=1):
            c = ws.cell(row=1, column=j, value=h); c.font = Font(name=F, size=10, bold=True, color='FFFFFF'); c.fill = f_head; c.border = box; c.alignment = Alignment(horizontal='center')
        dvs = {}
        for j, vals in lists.items():
            dv = DataValidation(type='list', formula1='"%s"' % ','.join(vals), allow_blank=True, showErrorMessage=True, error='Pick from the list'); ws.add_data_validation(dv); dvs[j] = dv
        for i, row in enumerate(rows, start=2):
            for j, v in enumerate(row, start=1):
                c = ws.cell(row=i, column=j, value=v); c.border = box; inp = j in inputs
                c.font = Font(name=F, size=10, bold=j == 1, color='0000FF' if inp else '595959' if j == len(head) else '000000')
                c.fill = f_in if inp else f_key if j == len(head) else f_lab if j == 1 else PatternFill()
                c.alignment = Alignment(vertical='center', wrap_text=len(str(v or '')) > 40)
                if j in dvs: dvs[j].add(c.coordinate)
        for k, w in enumerate(widths): ws.column_dimensions[chr(65 + k)].width = w
        ws.freeze_panes = 'B2'
    sheet('Buildings', HO_HEAD, ho, [26, 12, 10, 10, 70, 22], {1, 2, 3, 4, 5}, {2: KINDS})
    sheet('Settings', ST_HEAD, st, [44, 9, 8, 10, 60, 14], {2}, {})
    g = wb.create_sheet('How to fill'); g.column_dimensions['A'].width = 20; g.column_dimensions['B'].width = 90; g.column_dimensions['C'].width = 18
    for i, row in enumerate([('Item', 'What it means', 'How to fill')] + TIPS, start=1):
        for j, v in enumerate(row, start=1): c = g.cell(row=i, column=j, value=v); c.font = Font(name=F, size=10, bold=i == 1 or j == 1); c.alignment = Alignment(wrap_text=True, vertical='top'); c.border = box
    wb.save(dest)


def export_numbers(dest, t):
    from numbers_parser import Alignment, Document, RGB
    sys.path.insert(0, HERE); from settings_sheet import exact_numbers; exact_numbers()
    st, ho = sheet_data(t); doc = None; S = {}
    def style(name, **kw):
        if name not in S: S[name] = doc.add_style(name=name, font_name='Helvetica Neue', font_size=kw.pop('size', 11.0), alignment=Alignment(kw.pop('h', 'left'), 'middle'), **kw)
        return S[name]
    def sheet(title, head, rows, widths, inputs, lists):
        nonlocal doc
        if doc is None: doc = Document(sheet_name=title, table_name=title, num_header_rows=1, num_header_cols=1, num_rows=len(rows) + 1, num_cols=len(head))
        else: doc.add_sheet(title, title, num_rows=len(rows) + 1, num_cols=len(head))
        tb = doc.sheets[-1].tables[0]; tb.num_header_rows = 1; tb.num_header_cols = 1
        head_s = style('BR head', bg_color=RGB(43, 36, 66), font_color=RGB(255, 255, 255), bold=True, h='center'); lab = style('BR label', bg_color=RGB(228, 224, 242), bold=True)
        val = style('BR value', bg_color=RGB(255, 247, 204), font_color=RGB(0, 0, 255)); note = style('BR note', size=10.0); key = style('BR key', bg_color=RGB(237, 237, 237), font_color=RGB(89, 89, 89), size=10.0)
        for j, w in enumerate(widths): tb.col_width(j, w)
        for j, h in enumerate(head): tb.write(0, j, h, style=head_s)
        for i, row in enumerate(rows, start=1):
            for j, v in enumerate(row):
                k = j + 1; s = val if k in inputs and k != 1 else lab if k == 1 else key if k == len(head) else note
                tb.write(i, j, '' if v is None else v, style=s)
                if k in lists: tb.set_cell_formatting(i, j, 'popup', popup_values=lists[k], allow_none=True)
            tb.row_height(i, 30)
    sheet('Buildings', HO_HEAD, ho, [190, 90, 80, 80, 480, 150], {1, 2, 3, 4, 5}, {2: KINDS})
    sheet('Settings', ST_HEAD, st, [290, 70, 60, 80, 380, 100], {2}, {})
    sheet('How to fill', ['Item', 'What it means', 'How to fill'], [list(r) for r in TIPS], [150, 520, 120], set(), {})
    doc.save(dest)


def read_sheets(src):
    if src.lower().endswith('.numbers'):
        from numbers_parser import Document
        return {sh.name: [tuple(r) for r in sh.tables[0].rows(values_only=True)] for sh in Document(src).sheets}
    from openpyxl import load_workbook
    return {ws.title: list(ws.iter_rows(values_only=True)) for ws in load_workbook(src, data_only=True).worksheets}


def table(sheets, title):                     # (header -> column, rows) of a sheet; Numbers may rename "Items" to "Items - Table 1"
    data = next((r for n, r in sheets.items() if n.lower().startswith(title.lower())), None)
    if not data: return None, []
    hd = {str(h or '').strip().lower(): j for j, h in enumerate(data[0])}
    return hd, [r for r in data[1:] if any(c not in (None, '') for c in r)]


def num(v):
    if isinstance(v, bool) or v is None or v == '': return None
    if isinstance(v, (int, float)): v = round(float(v), 6); return int(v) if v.is_integer() else v
    try: return num(float(str(v).strip().replace(',', '').replace('€', '').replace('$', '')))
    except ValueError: return None


def text(v): return '' if v is None else str(v).strip()


def colour(v):
    s = text(v).lstrip('#').lower()
    return '#' + s if re.fullmatch(r'[0-9a-f]{6}', s) else None


def do_import(src, dry):
    s, i, j, t = read_table(); sheets = read_sheets(src); errors, changes = [], []
    new = {'settings': [dict(r) for r in t['settings']], 'buildings': [dict(h) for h in t['buildings']]}
    hd, rows = table(sheets, 'Settings')
    if hd is not None:
        S = {r['id']: r for r in new['settings']}; vc, kc = hd.get('value'), hd.get('id')
        for row in rows:
            k = text(row[kc]) if kc is not None and kc < len(row) else ''
            if k not in S: continue
            r = S[k]; v = num(row[vc] if vc < len(row) else None)
            if v is None or v < r['min'] or v > r['max'] or not float(v).is_integer():
                errors.append('Settings / %s: "%s" must be a whole number from %s to %s' % (r['name'], row[vc] if vc < len(row) else '', fmt(r['min']), fmt(r['max']))); continue
            if v != r['v']: changes.append('Settings / %s: %s -> %s' % (r['name'], fmt(r['v']), fmt(v))); r['v'] = v
    hd, rows = table(sheets, 'Buildings')
    if hd is None: errors.append('the Buildings sheet is missing'); rows = []
    H = {h['id']: h for h in new['buildings']}; names = {}
    for n, row in enumerate(rows, start=2):
        g = lambda name: row[hd[name]] if name in hd and hd[name] < len(row) else None
        hid = text(g('id')).lower(); where = 'Buildings row %d (%s)' % (n, hid or 'no ID')
        if hid not in H: errors.append('%s: unknown ID - the 120 buildings are fixed' % where); continue
        h = H[hid]; name = text(g('name on screen')).upper(); kind = text(g('kind')).lower(); c, ne = colour(g('walls')), colour(g('neon'))
        if not name or len(name) > 24: errors.append('%s: a name of 1 to 24 letters is needed' % where); continue
        if name in names: errors.append('%s: the name %s is already used by %s' % (where, name, names[name])); continue
        names[name] = hid
        if kind not in KINDS: errors.append('%s: kind must be one of %s' % (where, ', '.join(KINDS))); continue
        if not c or not ne: errors.append('%s: colours must be #RRGGBB' % where); continue
        x = dict(h, name=name, kind=kind, c=c, neon=ne, note=text(g('notes')))
        if x != h: changes.append('%s: ' % hid + ', '.join('%s %s -> %s' % (k, h.get(k), x[k]) for k in x if x[k] != h.get(k))); H[hid].update(x)
    if errors: print('Not imported - fix these first:'); [print('  ' + e) for e in errors]; sys.exit(1)
    print('%d change%s' % (len(changes), '' if len(changes) == 1 else 's') + (':' if changes else '')); [print('  ' + c) for c in changes]
    if dry or not changes: return
    open(JS, 'w', encoding='utf-8').write(s[:i] + dump(new) + s[j:]); print('written', os.path.relpath(JS))


if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in ('export', 'import'): print(__doc__); sys.exit(2)
    if sys.argv[1] == 'export': (export_numbers if sys.argv[2].lower().endswith('.numbers') else export_xlsx)(sys.argv[2], read_table()[3]); print('saved', sys.argv[2])
    else: do_import(sys.argv[2], '--dry-run' in sys.argv[3:])
