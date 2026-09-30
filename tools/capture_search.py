"""Record the original site's product search results (heading + ordered handles, all pages).

The original searches server-side with relevance/fuzzy rules that can't be derived from product
data, so results for the suggested keywords (and a few common queries) are kept as research data;
js/search.js uses them and falls back to a local matcher for other queries.

Usage: python tools/capture_search.py      -> docs/research/raw/search_results.json
"""
import json
import os
import re
import subprocess

from bs4 import BeautifulSoup

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'docs', 'research', 'raw')
RESOLVE = ['--resolve', 'trieuques.com:443:210.245.8.133']  # local DNS can't resolve the host
EXTRA = ['yến', 'tổ yến', 'set', 'soup', 'hũ', 'kids', 'yen', 'thượng vi yến', 'đông trùng', 'chưng', 'ngọc', 'sam',
         'combo', 'quà', 'nhân sâm', 'bát trân', 'cháo', 'saffron', 'collagen']


def fetch(q, page):
    return subprocess.run(['curl', '-s', *RESOLVE, '-G', 'https://trieuques.com/search', '--data-urlencode', 'query=' + q,
                           '--data-urlencode', 'type=product', '--data-urlencode', f'page={page}'],
                          capture_output=True, text=True, check=True).stdout


def suggested():
    soup = BeautifulSoup(open(os.path.join(RAW, 'index.html'), encoding='utf-8').read(), 'html.parser')
    return [a.get_text(strip=True) for a in soup.select('.item-suggest .search-list a')]


def main():
    out = {}
    for q in dict.fromkeys(suggested() + EXTRA):
        handles, title, page, last = [], None, 1, 1
        while page <= last:
            html = fetch(q, page)
            if title is None:
                m = re.search(r'title_search[^>]*>\s*([^<]+)<', html)
                title = m.group(1).strip() if m else ''
                last = max([int(x) for x in re.findall(r'[?&]page=(\d+)', html)] + [1])
            for h in re.findall(r'class="product-name[^"]*"[^>]*>\s*<a href="/([^"?]+)"', html):
                if h not in handles:
                    handles.append(h)
            page += 1
        out[q] = {'title': title, 'handles': handles}
        print(q, '|', title, '|', len(handles))
    with open(os.path.join(RAW, 'search_results.json'), 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
