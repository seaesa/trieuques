"""Print a compact, readable HTML outline of a region of a captured page.

Usage: python tools/outline.py <raw-slug> <css-selector> [max-chars]
SVG path data and base64 placeholders are shortened so structure stays readable.
"""
import re
import sys

from bs4 import BeautifulSoup

slug, selector = sys.argv[1], sys.argv[2]
limit = int(sys.argv[3]) if len(sys.argv) > 3 else 12000
html = open(f'docs/research/raw/{slug}.html', encoding='utf-8').read()
soup = BeautifulSoup(html, 'html.parser')
node = soup.select_one(selector)
if node is None:
    sys.exit(f'no match for {selector}')
for tag in node.find_all(['script', 'style', 'noscript']):
    tag.decompose()
for path in node.find_all(['path', 'rect', 'circle', 'g', 'polygon', 'line', 'defs', 'clippath']):
    for attr in list(path.attrs):
        if attr in ('d', 'points', 'transform') and len(path.get(attr, '')) > 30:
            path[attr] = path[attr][:30] + '…'
text = node.prettify()
text = re.sub(r'data:image/[^"]+', 'data:…', text)
text = re.sub(r'\n\s*\n', '\n', text)
print(text[:limit])
