"""Stamp a new build number into index.html, so every merge loads fresh files instead of copies the browser kept.

  python3 tools/stamp_build.py          the next build number: every js/ and css/ address gets ?v=<build>, the title shows BUILD <build>
  python3 tools/stamp_build.py --show   print the build number now in index.html

Run it before each merge (CLAUDE.md). GitHub Pages lets browsers keep a file for a while; a new ?v= is a new address, so the
game's own scripts and styles are always fetched again once index.html is new.
"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(HERE, '..', 'index.html')

def main():
    s = open(INDEX, encoding='utf-8').read()
    m = re.search(r'<meta name="build" content="(\d+)">', s)
    now = int(m.group(1)) if m else 0
    if '--show' in sys.argv: print(now); return
    n = now + 1
    if m: s = s.replace(m.group(0), '<meta name="build" content="%d">' % n)
    else: s = s.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="build" content="%d">' % n, 1)
    s, k1 = re.subn(r'(src="js/[^"?]+\.js)(\?v=\d+)?"', r'\1?v=%d"' % n, s)
    s, k2 = re.subn(r'(href="css/[^"?]+\.css)(\?v=\d+)?"', r'\1?v=%d"' % n, s)
    if 'id="buildTag"' in s: s = re.sub(r'<p class="build" id="buildTag">BUILD \d+</p>', '<p class="build" id="buildTag">BUILD %d</p>' % n, s)
    else: s = s.replace('<p class="tag">TOP-DOWN CRIME SPREE \'97</p>', '<p class="tag">TOP-DOWN CRIME SPREE \'97</p>\n    <p class="build" id="buildTag">BUILD %d</p>' % n, 1)
    if '<meta name="build"' not in s or 'id="buildTag"' not in s: raise SystemExit('index.html: the charset meta or the title tag line was not found')
    open(INDEX, 'w', encoding='utf-8').write(s)
    print('build %d: %d scripts, %d styles stamped' % (n, k1, k2))

if __name__ == '__main__': main()
