"""Crawl trieuques.com with a real browser and save the rendered DOM of every page.

Output: docs/research/raw/<slug>.html plus docs/research/raw/index.json (url -> template, title, stylesheets).
Research-only: the saved DOM is the reference for rebuilding templates, it is not served.
"""
import json
import os
import re
import sys
from urllib.parse import urljoin, urlparse

from playwright.sync_api import sync_playwright

BASE = 'https://trieuques.com'
OUT = os.path.join(os.path.dirname(__file__), '..', 'docs', 'research', 'raw')
SKIP = ('/cart', '/account', '/search', '/checkout', '/collections/all/')
ASSET_RE = re.compile(r'\.(css|js|png|jpe?g|gif|svg|ico|xml|webp)$', re.I)


def slug_of(path):
    if path in ('', '/'):
        return 'index'
    return re.sub(r'[^a-zA-Z0-9_-]+', '_', path.strip('/').replace('/', '__'))


def normalize(href, current):
    u = urljoin(current, href.strip())
    p = urlparse(u)
    if p.netloc.replace('www.', '') != 'trieuques.com':
        return None
    path = p.path.rstrip('/') or '/'
    if path.startswith(SKIP) or ASSET_RE.search(path) or '{' in path or '$' in path or "'" in path:
        return None
    return path


def settle(page):
    for _ in range(45):
        page.mouse.wheel(0, 500)
        page.wait_for_timeout(90)
    page.wait_for_timeout(1200)
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(300)


def main():
    os.makedirs(OUT, exist_ok=True)
    queue = sys.argv[1:] or ['/']
    crawl = not sys.argv[1:]
    index_path = os.path.join(OUT, 'index.json')
    meta = json.load(open(index_path, encoding='utf-8')) if os.path.exists(index_path) else {}
    seen = set()
    with sync_playwright() as p:
        browser = p.chromium.launch(args=['--host-resolver-rules=MAP trieuques.com 210.245.8.133, MAP www.trieuques.com 210.245.8.133'])
        page = browser.new_page(viewport={'width': 1440, 'height': 900})
        page.goto(BASE, wait_until='networkidle')
        page.evaluate("localStorage.setItem('popupClosedDate', new Date().toLocaleDateString('en-US',{timeZone:'Asia/Ho_Chi_Minh'}))")
        while queue:
            path = queue.pop(0)
            if path in seen:
                continue
            seen.add(path)
            try:
                resp = page.goto(BASE + path, wait_until='networkidle', timeout=60000)
                settle(page)
            except Exception as exc:
                print('FAIL', path, exc.__class__.__name__)
                continue
            html = page.content()
            template = re.search(r"template\s*[:=]\s*['\"]([a-z_.]+)", html)
            info = {
                'status': resp.status if resp else None,
                'template': template.group(1) if template else '?',
                'title': page.title(),
                'css': page.evaluate("[...document.querySelectorAll('link[rel=stylesheet]')].map(l => l.href.split('?')[0])"),
            }
            meta[path] = info
            with open(os.path.join(OUT, slug_of(path) + '.html'), 'w', encoding='utf-8') as fh:
                fh.write(html)
            print(info['status'], info['template'], path)
            if not crawl:
                continue
            for href in page.evaluate("[...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))"):
                n = normalize(href, BASE + path)
                if n and n not in seen and n not in queue:
                    queue.append(n)
        browser.close()
    with open(index_path, 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=1)
    print('captured', len(meta))


if __name__ == '__main__':
    main()
