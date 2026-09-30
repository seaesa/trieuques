"""Record the original server's product order for every collection x sort option.

The original sorts/filters collections server-side (/search?q=collections:<id>&sortby=...),
and its tie-breaking can't be derived from product data, so the observed order is captured
as research data for the static build.

Usage: python tools/capture_sorts.py      -> docs/research/raw/sorts.json
"""
import json
import os
import re
import subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'docs', 'research', 'raw')
SORTS = ['', 'price_min:asc', 'price_min:desc', 'name:asc', 'name:desc', 'created_on:desc']
RESOLVE = ['--resolve', 'trieuques.com:443:210.245.8.133']  # local DNS can't resolve the host


def fetch(q, page, sort):
    args = ['curl', '-s', *RESOLVE, '-G', 'https://trieuques.com/search',
            '--data-urlencode', f'q={q}', '--data-urlencode', f'page={page}', '--data-urlencode', 'view=data']
    if sort:
        args += ['--data-urlencode', f'sortby={sort}']
    html = subprocess.run(args, capture_output=True, text=True, check=True).stdout
    handles = re.findall(r'class="product-name[^"]*"[^>]*>\s*<a href="/([^"?]+)"', html)
    pages = [int(n) for n in re.findall(r'doSearch\((\d+)\)', html)]
    return handles, max(pages + [page])


def main():
    ids = {}
    for name in os.listdir(RAW):
        if name.endswith('.html'):
            m = re.search(r'colId\s*=\s*(\d+)', open(os.path.join(RAW, name), encoding='utf-8').read(300000))
            if m:
                ids[int(m.group(1))] = True
    out = {}
    for col_id in sorted(ids):
        q = f'collections:{col_id}' if col_id else ''
        for sort in SORTS:
            handles, last, page = [], 1, 1
            while page <= last:
                found, last = fetch(q, page, sort)
                handles += found
                page += 1
            out.setdefault(str(col_id), {})[sort or 'default'] = handles
            print(col_id, sort or 'default', len(handles))
    with open(os.path.join(RAW, 'sorts.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
