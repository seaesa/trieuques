"""List the original theme's CSS rules whose selector mentions a keyword, with media context.

Usage: python tools/rules.py <keyword> [css files...]   (default: all files in /tmp/origcss)
Reference only - values are read from here while authoring our own stylesheet.
"""
import glob
import re
import sys


def walk(css, media=''):
    i = 0
    while i < len(css):
        brace = css.find('{', i)
        if brace == -1:
            return
        head = css[i:brace].strip()
        depth, j = 1, brace + 1
        while depth and j < len(css):
            depth += {'{': 1, '}': -1}.get(css[j], 0)
            j += 1
        body = css[brace + 1:j - 1]
        if head.startswith('@media') or head.startswith('@supports'):
            yield from walk(body, head)
        elif not head.startswith('@'):
            yield media, head, body.strip()
        i = j


keyword = sys.argv[1]
files = sys.argv[2:] or sorted(glob.glob('/tmp/origcss/*.css'))
for f in files:
    css = re.sub(r'/\*.*?\*/', '', open(f, encoding='utf-8', errors='ignore').read(), flags=re.S)
    for media, sel, body in walk(css):
        if keyword in sel:
            decls = ';\n    '.join(d.strip() for d in body.split(';') if d.strip())
            prefix = f'[{media}] ' if media else ''
            print(f'{prefix}{sel} {{\n    {decls}\n}}')
