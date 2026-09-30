"""Build the static site into dist/.

Each captured page (docs/research/raw/<slug>.html) contributes its cleaned structure and
content; the <head>, stylesheets and scripts are ours. All original-site JavaScript,
tracking and third-party widgets are dropped and re-implemented in js/.

Usage: python tools/build.py [--download]
"""
import json
import os
import re
import shutil
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import unquote, urlparse

from bs4 import BeautifulSoup, Comment

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
RAW = os.path.join(ROOT, 'docs', 'research', 'raw')
DIST = os.path.join(ROOT, 'dist')
CDN_RE = re.compile(r'(?:https?:)?//bizweb\.dktcdn\.net/[^"\'\s)>,]+')
THUMB_RANK = ['icon', 'pico', 'thumb', 'small', 'compact', 'medium', 'large', 'grande', '1024x1024', '2048x2048', 'master']
KEEP_BODY = ('opacity_menu', 'header', 'bodywrap', 'modal-banner', 'main-widget', 'backdrop__body-backdrop___1rvky',
             'popup-cart', 'popup-cart-mobile', 'quickview-product')

# Page-specific stylesheet per Sapo template; base.css/header.css/footer.css load everywhere.
TEMPLATE_CSS = {
    'index': ['home.css'],
    'collection': ['collection.css'],
    'product': ['product.css'],
    'blog': ['blog.css'],
    'article': ['blog.css'],
    'page': ['page.css'],
    'page.contact': ['page.css', 'contact.css'],
    'search': ['collection.css', 'search.css'],
    '404': ['page.css'],
    'cart': ['cart-page.css'],
    'customers': ['account.css'],
    'checkout': ['cart-page.css', 'checkout.css'],
}
TEMPLATE_JS = {
    'index': ['home.js'],
    'collection': ['collection.js'],
    'product': ['product.js'],
    'search': ['search.js'],
    'page.contact': ['contact.js'],
    'cart': ['cart-page.js'],
    'blog': ['blog.js'],
    'article': ['blog.js'],
    'checkout': ['checkout.js'],
}
SWIPER_TEMPLATES = {'index', 'product', 'collection', 'article', 'search', 'cart'}


def local_asset(url):
    """Map a CDN url to (local path under images/, rank of the requested size)."""
    url = url.split('?')[0]
    path = re.sub(r'^(?:https?:)?//bizweb\.dktcdn\.net/', '', url)
    rank = len(THUMB_RANK) - 1
    m = re.match(r'thumb/([a-z0-9_]+)/', path)
    if m:
        rank = THUMB_RANK.index(m.group(1)) if m.group(1) in THUMB_RANK else rank - 1
        path = path[m.end():]
    path = re.sub(r'^100/447/513/', '', path)
    path = path.replace('themes/969333/assets/', 'theme/')
    path = unquote(path)
    return 'images/' + path, rank


class Assets:
    def __init__(self):
        self.best = {}

    def use(self, url):
        full = ('https:' + url) if url.startswith('//') else url
        local, rank = local_asset(full)
        if local not in self.best or rank > self.best[local][1]:
            self.best[local] = (full, rank)
        return '/' + local

    def use_exact(self, url):
        """Keep a specific CDN rendition (e.g. thumb/1024x1024, which Sapo upscales) as its own file."""
        full = ('https:' + url) if url.startswith('//') else url
        m = re.search(r'/thumb/([a-z0-9_]+)/100/447/513/(.+?)(?:\?|$)', full)
        if not m:
            return self.use(url)
        local = 'images/%s/%s' % (m.group(1), unquote(m.group(2)))
        self.best[local] = (full, 99)
        return '/' + local

    def download(self):
        manifest_path = os.path.join(ROOT, 'images', '.ranks.json')
        manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}

        def fetch(item):
            local, (url, rank) = item
            dest = os.path.join(ROOT, local)
            have = manifest.get(local)
            if os.path.exists(dest) and os.path.getsize(dest) > 0 and have is not None and have >= rank:
                return 'cached'
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                data = urllib.request.urlopen(req, timeout=40).read()
                with open(dest, 'wb') as fh:
                    fh.write(data)
                manifest[local] = rank
                return 'ok'
            except Exception as exc:
                return f'ERR {url} {exc}'
        with ThreadPoolExecutor(8) as ex:
            results = list(ex.map(fetch, self.best.items()))
        with open(manifest_path, 'w') as fh:
            json.dump(manifest, fh, indent=0, sort_keys=True)
        errors = [r for r in results if r.startswith('ERR')]
        print('assets:', len(results), 'errors:', len(errors))
        for e in errors[:20]:
            print(' ', e)


def slug_of(path):
    if path in ('', '/'):
        return 'index'
    return re.sub(r'[^a-zA-Z0-9_-]+', '_', path.strip('/').replace('/', '__'))


def local_link(href):
    if not href:
        return href
    href = href.strip()
    if href.startswith(('mailto:', 'tel:', 'javascript:', '#')):
        return href
    p = urlparse(href)
    if p.netloc and p.netloc.replace('www.', '') != 'trieuques.com':
        return href
    path = p.path or '/'
    if not path.startswith('/'):
        path = '/' + path
    if path.startswith('/checkout'):
        path = '/cart'
    if re.fullmatch(r'page=\d+', p.query or ''):
        return static_path(path + '?' + p.query) + (('#' + p.fragment) if p.fragment else '')
    return path + (('?' + p.query) if p.query else '') + (('#' + p.fragment) if p.fragment else '')


def expand_templates(node):
    """Inline the markup the original injects from <script type="text/x-custom-template"> on hover/delay."""
    for tpl in node.find_all('script', attrs={'type': 'text/x-custom-template'}):
        name = tpl.get('data-template')
        fragment = BeautifulSoup(tpl.string or tpl.get_text(), 'html.parser')
        if name == 'header_nav':
            tpl.replace_with(fragment)
            continue
        target = node.select_one(f'[data-section="{name}"]')
        if target is not None and not target.select('.product-name, li, img'):
            target.clear()
            target.append(fragment)
        tpl.decompose()


def clean(node, assets):
    expand_templates(node)
    for tag in node.find_all(['script', 'noscript', 'link', 'iframe', 'style']):
        if tag.name == 'iframe' and re.search(r'youtube|google\.com/maps', tag.get('src') or tag.get('data-src') or ''):
            tag['src'] = tag.get('src') or tag.get('data-src')
            continue
        if tag.get('id') == 'product-json':
            continue
        tag.decompose()
    for c in node.find_all(string=lambda s: isinstance(s, Comment)):
        c.extract()
    for img in node.find_all('img'):
        src = img.get('data-src') or img.get('src') or ''
        if src.startswith('data:') and img.get('data-src'):
            src = img['data-src']
        if CDN_RE.match(src):
            src = assets.use(src)
        img['src'] = src
        for attr in ('data-src', 'data-was-processed', 'data-ll-status', 'loading'):
            img.attrs.pop(attr, None)
        img['loading'] = 'lazy'
        if img.get('class'):
            img['class'] = [c for c in img['class'] if c not in ('lazyload', 'loaded', 'lazy', 'entered')] or None
            if not img['class']:
                del img['class']
    for src in node.find_all('source'):
        ss = src.get('srcset') or src.get('data-srcset') or ''
        if CDN_RE.search(ss):
            src['srcset'] = CDN_RE.sub(lambda m: assets.use(m.group(0)), ss)
        src.attrs.pop('data-srcset', None)
    for el in node.find_all(attrs={'style': True}):
        el['style'] = CDN_RE.sub(lambda m: assets.use(m.group(0)), el['style'])
    for el in node.find_all(attrs={'data-background': True}):
        el['style'] = (el.get('style', '') + f";background-image:url({assets.use(el['data-background'])})").lstrip(';')
    for el in node.select('.swiper-container, .swiper-wrapper, .swiper-slide'):
        el.attrs.pop('style', None)
        el.attrs.pop('aria-live', None)
        el['class'] = [c for c in el.get('class', []) if not c.startswith(('swiper-slide-', 'swiper-container-'))]
    for el in node.select('.swiper-container'):
        el['class'] = el['class'] + ['swiper']
    for el in node.select('.swiper-pagination'):
        el.clear()
        el['class'] = [c for c in el.get('class', []) if not c.startswith('swiper-pagination-') or c == 'swiper-pagination']
    for el in node.find_all(True):
        for attr, val in list(el.attrs.items()):
            if isinstance(val, str) and attr not in ('style', 'srcset') and CDN_RE.fullmatch(val.strip()):
                el[attr] = assets.use(val.strip())
    for a in node.find_all('a', href=True):
        a['href'] = local_link(a['href'])
    for form in node.find_all('form', action=True):
        form['action'] = local_link(form['action'])
    return node


def inline_tab_fragments(soup):
    """Pre-render product-tab panes that the original loads by AJAX on click."""
    for li in soup.select('.section_product_tab .tabs-title li[data-url]'):
        pane = li.find_parent(class_='e-tabs').select_one('.tab-content.' + li['data-tab'])
        frag = os.path.join(RAW, 'fragments', li['data-url'].strip().strip('/') + '.ajaxload2.html')
        if pane is None or pane.select('.item_product_main .product-name') or not os.path.exists(frag):
            continue
        box = BeautifulSoup(open(frag, encoding='utf-8').read(), 'html.parser').select_one('.is-collection-ajax')
        if box:
            pane.clear()
            for child in list(box.children):
                pane.append(child)
            li['class'] = li.get('class', []) + ['has-content']


CONTENT = os.path.join(ROOT, 'content')


def content_fragment(kind, name):
    """Authored content for pages the original leaves as "đang cập nhật" (content/pages, content/products)."""
    path = os.path.join(CONTENT, kind, name + '.html')
    return open(path, encoding='utf-8').read() if os.path.exists(path) else None


def fill_page_content(soup, path):
    html = content_fragment('pages', path.strip('/'))
    box = soup.select_one('.content-page')
    if html and box is not None:
        box.clear()
        box.append(BeautifulSoup(html, 'html.parser'))


_SHOW_MORE = None


def show_more_block():
    """The "Xem thêm / Thu gọn" block exactly as the theme renders it on products with a description."""
    global _SHOW_MORE
    if _SHOW_MORE is None:
        raw = open(os.path.join(RAW, 'diamond-health.html'), encoding='utf-8').read()
        _SHOW_MORE = str(BeautifulSoup(raw, 'html.parser').select_one('.product-review-content .show-more'))
    return _SHOW_MORE


def fill_product_content(soup, handle):
    html = content_fragment('products', handle)
    box = soup.select_one('#tab-1 .product-review-content')
    if html and box is not None and box.select_one('.alert'):
        box.clear()
        box.append(BeautifulSoup('<div class="ba-text-fpt has-height">' + html + '</div>' + show_more_block(), 'html.parser'))


def product_summary(prod, limit=220):
    """Short intro for the quick view: the product's own summary, else the opening of its description."""
    if prod.get('summary'):
        return prod['summary']
    html = content_fragment('products', prod.get('alias', '')) or prod.get('content') or ''
    lines = [re.sub(r'\s+', ' ', t).strip() for t in BeautifulSoup(html, 'html.parser').stripped_strings]
    text = ' '.join(l for l in lines if len(l) >= 3 and not l.startswith(('#', 'http', '—', '-', '•')))
    return text[:limit].rsplit(' ', 1)[0] + '…' if len(text) > limit else text


def localize_product(prod, assets):
    """Point every image url inside a product object at the local copies."""
    def fix(v):
        if isinstance(v, str) and CDN_RE.fullmatch(v):
            return assets.use(v)
        if isinstance(v, dict):
            return {k: fix(x) for k, x in v.items()}
        if isinstance(v, list):
            return [fix(x) for x in v]
        return v
    return fix({k: v for k, v in prod.items() if k != 'content'})


def prepare_product(soup, raw, assets):
    """Undo crawl-session state (recently viewed list) and embed the product for product.js."""
    viewed = soup.select_one('.recent-page-viewed')
    if viewed:
        viewed['class'] = [c for c in viewed.get('class', []) if c != 'd-none'] + ['d-none']
        box = viewed.select_one('.product-viewed-content')
        if box:
            box.clear()
    details = soup.select_one('.product-review-details')
    if details:
        details['class'] = ['col-12', 'product-review-details', 'col-lg-8']
    side = soup.select_one('.product-sidebar')
    if side:
        side['class'] = ['col-lg-4', 'col-12', 'product-sidebar']
    fill_product_content(soup, (product_json(raw) or {}).get('alias', ''))
    for a in soup.select('#lightgallery > a[href]'):
        a['href'] = assets.use_exact(a['href'])
    prod = product_json(raw)
    wrap = soup.select_one('section.product')
    if prod and wrap:
        tag = soup.new_tag('script', attrs={'type': 'application/json', 'id': 'product-json'})
        tag.string = json.dumps(localize_product(prod, assets), ensure_ascii=False).replace('</', '<\\/')
        wrap.append(tag)


def product_json(raw_html):
    """Extract the richest product object embedded by the original theme."""
    best = None
    for m in re.finditer(r'(?:product:\s*|product\s*=\s*)(\{"id":)', raw_html):
        try:
            obj = json.JSONDecoder().raw_decode(raw_html[m.start(1):])[0]
        except ValueError:
            continue
        if best is None or len(obj) > len(best):
            best = obj
    return best


def money(v):
    return '{:,.0f}'.format(v).replace(',', '.') + '₫'


def build_search_index(meta, assets):
    items = []
    for path, info in meta.items():
        if info.get('template') != 'product':
            continue
        raw = open(os.path.join(RAW, slug_of(path) + '.html'), encoding='utf-8').read()
        prod = product_json(raw)
        if not prod or 'name' not in prod:
            continue
        variant = (prod.get('variants') or [{}])[0]
        image = prod.get('featured_image') or ''
        if isinstance(image, dict):
            image = image.get('src') or ''
        if not image and prod.get('images'):
            first = prod['images'][0]
            image = first.get('src', '') if isinstance(first, dict) else first
        price, compare = prod.get('price') or 0, prod.get('compare_at_price_max') or 0
        items.append({
            'id': prod['id'],
            'name': prod['name'],
            'url': '/' + prod['alias'] if prod.get('alias') else path,
            'image': assets.use(image) if image else '',
            'price': money(price) if price else 'Liên hệ',
            'compare_price': money(compare) if compare and compare > price else '',
            'available': variant.get('available', True),
            'type': prod.get('type') or '',
            'tags': ' '.join(prod.get('tags') or []),
            'text': re.sub(r'\s+', ' ', BeautifulSoup(prod.get('content') or '', 'html.parser').get_text(' '))[:1500],
        })
    items.sort(key=lambda x: -x['id'])
    os.makedirs(os.path.join(DIST, 'data'), exist_ok=True)
    with open(os.path.join(DIST, 'data', 'search.json'), 'w', encoding='utf-8') as fh:
        json.dump(items, fh, ensure_ascii=False)
    return items


def static_path(path):
    """Serveable path for a captured url: '?page=N' becomes '/page-N', other queries are dropped."""
    p = urlparse(path)
    m = re.search(r'(?:^|&)page=(\d+)', p.query)
    base = p.path.rstrip('/') or '/'
    if m and m.group(1) != '1':
        return base.rstrip('/') + '/page-' + m.group(1)
    return base


CATALOG = {}
FEATURED_PATH = '/san-pham-noi-bat'


def featured_handles():
    """Products the homepage features (product tabs + flash sale), in page order."""
    soup = BeautifulSoup(open(os.path.join(RAW, 'index.html'), encoding='utf-8').read(), 'html.parser')
    inline_tab_fragments(soup)
    out = []
    for link in soup.select('.section_product_tab .item_product_main .product-name a, .section_flash_sale .item_product_main .product-name a'):
        handle = link['href'].split('?')[0].strip('/').split('/')[-1]
        if handle not in out:
            out.append(handle)
    return out


def build_catalog(meta, assets):
    """Data for client-side collection filtering/sorting/paging (the original does this server-side)."""
    products, cards, collections = {}, {}, {}
    for path, info in meta.items():
        if info.get('template') != 'product':
            continue
        prod = product_json(open(os.path.join(RAW, slug_of(path) + '.html'), encoding='utf-8').read())
        if not prod or 'alias' not in prod:
            continue
        os.makedirs(os.path.join(DIST, 'data', 'p'), exist_ok=True)
        with open(os.path.join(DIST, 'data', 'p', prod['alias'] + '.json'), 'w', encoding='utf-8') as fh:
            json.dump(dict(localize_product(prod, assets), url='/' + prod['alias'], summary=product_summary(prod)), fh, ensure_ascii=False)
        products[prod['alias']] = {
            'id': prod['id'], 'name': prod['name'], 'price': prod.get('price_min') or prod.get('price') or 0,
            'type': prod.get('type') or '', 'vendor': prod.get('vendor') or '', 'tags': prod.get('tags') or [],
            'created': prod.get('created_on') or '',
            'text': re.sub(r'\s+', ' ', BeautifulSoup(content_fragment('products', prod['alias']) or prod.get('content') or '', 'html.parser').get_text(' ')).strip(),
        }
    pages = sorted((p for p, i in meta.items() if i.get('template') == 'collection'),
                   key=lambda p: (static_path(p).split('/page-')[0], int((re.search(r'page=(\d+)', p) or [0, 1])[1])))
    for path in pages:
        raw = open(os.path.join(RAW, slug_of(path) + '.html'), encoding='utf-8').read()
        soup = BeautifulSoup(raw, 'html.parser')
        base = static_path(path).split('/page-')[0]
        col_id = re.search(r'colId\s*=\s*(\d+)', raw)
        entry = collections.setdefault(base, {'id': int(col_id.group(1)) if col_id else 0, 'handles': []})
        for item in soup.select('.products-view .item_product_main'):
            link = item.select_one('.product-name a')
            if not link:
                continue
            handle = link['href'].split('?')[0].strip('/').split('/')[-1]
            if handle not in entry['handles']:
                entry['handles'].append(handle)
            if handle not in cards:
                cards[handle] = str(clean(item, assets))
    sorts_path = os.path.join(RAW, 'sorts.json')
    sorts = json.load(open(sorts_path, encoding='utf-8')) if os.path.exists(sorts_path) else {}
    for entry in collections.values():
        entry['sorts'] = {k: v for k, v in sorts.get(str(entry['id']), {}).items() if k != 'default'}
    for handle, html in cards.items():
        if handle in products:
            products[handle]['card'] = html
    featured = [h for h in featured_handles() if h in products and 'card' in products[h]]
    pos = {h: i for i, h in enumerate(featured)}
    collections[FEATURED_PATH] = {'id': -1, 'handles': featured, 'sorts': {
        'price_min:asc': sorted(featured, key=lambda h: (products[h]['price'], pos[h])),
        'price_min:desc': sorted(featured, key=lambda h: (-products[h]['price'], pos[h])),
        'name:asc': sorted(featured, key=lambda h: products[h]['name'].casefold()),
        'name:desc': sorted(featured, key=lambda h: products[h]['name'].casefold(), reverse=True),
        'created_on:desc': sorted(featured, key=lambda h: products[h]['created'], reverse=True),
    }}
    CATALOG.update(products=products, collections=collections, featured=featured)
    os.makedirs(os.path.join(DIST, 'data'), exist_ok=True)
    with open(os.path.join(DIST, 'data', 'products.json'), 'w', encoding='utf-8') as fh:
        json.dump(products, fh, ensure_ascii=False)
    with open(os.path.join(DIST, 'data', 'collections.json'), 'w', encoding='utf-8') as fh:
        json.dump(collections, fh, ensure_ascii=False)
    shutil.copy(os.path.join(ROOT, 'docs', 'research', 'coupons.json'), os.path.join(DIST, 'data', 'coupons.json'))
    recorded = os.path.join(RAW, 'search_results.json')
    if os.path.exists(recorded):
        shutil.copy(recorded, os.path.join(DIST, 'data', 'search_results.json'))


_ARROWS = None


def swiper_arrows():
    """Prev/next buttons exactly as the theme renders them on product carousels."""
    global _ARROWS
    if _ARROWS is None:
        raw = BeautifulSoup(open(os.path.join(RAW, 'diamond-health.html'), encoding='utf-8').read(), 'html.parser')
        nxt = raw.select_one('.swiper_product_related .swiper-button-next')
        prv = raw.select_one('.swiper_product_related .swiper-button-prev')
        _ARROWS = '<div class="swiper-button-prev">%s</div><div class="swiper-button-next">%s</div>' % (
            prv.decode_contents(), nxt.decode_contents())
    return _ARROWS


def fill_cart_suggest(soup):
    """"Có thể bạn thích" on the cart page: the featured products in the theme's suggest carousel."""
    box = soup.select_one('.product-suggest')
    alert = box.select_one('.alert') if box else None
    products = CATALOG.get('products', {})
    handles = CATALOG.get('featured', [])[:10]
    if not alert or not handles:
        return
    slides = ''.join('<div class="swiper-slide">%s</div>' % products[h]['card'] for h in handles)
    alert.replace_with(BeautifulSoup('<div class="swiper_suggest swiper-container"><div class="swiper-wrapper">%s</div>%s</div>'
                                     % (slides, swiper_arrows()), 'html.parser'))


def collection_pagination(page, pages):
    """Same markup collection.js renders (and the original server returns)."""
    if pages <= 1:
        return ''
    h = '<nav class="collection-paginate clearfix relative nav_pagi w_100"><ul class="pagination clearfix">'
    h += ('<li class="page-item"><a class="page-link link-next-pre" onclick="doSearch(%d)" href="javascript:;" title="%d">&laquo;</a></li>' % (page - 1, page - 1)
          if page > 1 else '<li class="page-item disabled"><a class="page-link" href="#">&laquo;</a></li>')
    for i in range(1, pages + 1):
        h += ('<li class="active page-item disabled"><a class="page-link" href="javascript:;" style="pointer-events:none">%d</a></li>' % i
              if i == page else '<li class="page-item"><a class="page-link" onclick="doSearch(%d)" href="javascript:;">%d</a></li>' % (i, i))
    h += ('<li class="page-item"><a class="page-link link-next-pre" onclick="doSearch(%d)" href="javascript:;" title="%d">&raquo;</a></li>' % (page + 1, page + 1)
          if page < pages else '<li class="page-item disabled"><a class="page-link" href="#">&raquo;</a></li>')
    return h + '</ul></nav>'


def set_breadcrumb(soup, text):
    last = soup.select('.breadcrumb li')[-1]
    last.clear()
    last.append(BeautifulSoup('<strong><span>%s</span></strong>' % text, 'html.parser'))


def featured_collection(soup, assets):
    """/san-pham-noi-bat (linked from the cart page): a collection of the homepage's featured products."""
    title = 'Sản phẩm nổi bật'
    set_breadcrumb(soup, title)
    soup.select_one('.col-title h1').string = title
    for el in soup.select('.col-desc'):
        el.decompose()
    products, handles = CATALOG['products'], CATALOG['featured']
    row = soup.select_one('.category-products .products-view .row')
    col = row.select_one(':scope > div').get('class')
    row.clear()
    for h in handles[:20]:
        row.append(BeautifulSoup('<div class="%s">%s</div>' % (' '.join(col), products[h]['card']), 'html.parser'))
    nav = soup.select_one('.category-products .pagenav')
    if nav is not None:
        nav.clear()
        nav.append(BeautifulSoup(collection_pagination(1, -(-len(handles) // 20)), 'html.parser'))
    for script in soup.find_all('script'):
        if script.string and 'colId' in script.string:
            script.string = script.string.replace('colId = 0', 'colId = -1')


def contact_facts():
    """Store facts published on the contact page: address, phone, email (+ the footer icons) and the map."""
    soup = BeautifulSoup(open(os.path.join(RAW, 'lien-he.html'), encoding='utf-8').read(), 'html.parser')
    rows = soup.select('footer .content-contact')
    icons = [str(r.find('svg')) for r in rows[:3]]
    return {
        'address': '60 Điều Xiển, Khu phố 8, p. Long Bình, Đồng Nai.', 'phone': '0828 32 11 79', 'tel': '0828321179',
        'email': 'trieuquesthuongdinhyen@gmail.com', 'map': soup.select_one('#contact_map iframe')['src'],
        'directions': 'https://maps.app.goo.gl/rYSX36fKD7QhAEGB9', 'icons': icons,
    }


def replace_main(soup, html):
    """Swap the page body (everything between the breadcrumb and the footer) for new markup."""
    wrap = soup.select_one('.bodywrap')
    crumb = wrap.select_one('section.bread-crumb')
    for el in list(crumb.find_next_siblings()):
        if el.name == 'footer' or el.get('id') == 'js-global-alert':
            continue
        el.decompose()
    crumb.insert_after(BeautifulSoup(html, 'html.parser'))


def store_locator(soup, assets):
    """/he-thong-cua-hang (header "Cửa hàng"): store list + map, on the theme's .page-store styles."""
    f = contact_facts()
    set_breadcrumb(soup, 'Hệ thống cửa hàng')
    pin, phone, mail = f['icons']
    replace_main(soup, f'''<section class="page-store">
<div class="container"><div class="bg-shadow">
<div class="page-title category-title"><h1 class="title-head">Hệ thống cửa hàng</h1></div>
<div class="row">
<div class="col-lg-4 col-12 col-left">
<div class="option-chos">
<div class="group"><select id="store-province" aria-label="Tỉnh thành"><option value="">Chọn tỉnh thành</option><option value="Đồng Nai">Đồng Nai</option></select></div>
<div class="group"><select id="store-ward" aria-label="Phường xã"><option value="">Chọn phường xã</option><option value="Long Bình" data-province="Đồng Nai">Long Bình</option></select></div>
</div>
<div class="info-store">
<div class="store-list" data-province="Đồng Nai" data-ward="Long Bình" data-map="{f['map']}">
<div class="store-name"><b>TRIỀU QUẾ Thượng Đỉnh Yến</b>
<span><i class="icon">{pin}</i>{f['address']}</span>
<span><i class="icon">{phone}</i><a href="tel:{f['tel']}" title="{f['phone']}">{f['phone']}</a></span>
<span><i class="icon">{mail}</i><a href="mailto:{f['email']}" title="{f['email']}">{f['email']}</a></span>
</div></div>
<div class="store-empty d-none"><div class="store-name">Chưa có cửa hàng tại khu vực bạn chọn.</div></div>
</div></div>
<div class="col-lg-8 col-12 col-right">
<div class="wrapcontact"><div class="map"><iframe src="{f['map']}" style="border:0;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Bản đồ cửa hàng"></iframe></div></div>
<div class="info-iframe"><a href="{f['directions']}" target="_blank" rel="noopener" title="Chỉ đường">Xem chỉ đường trên Google Maps</a></div>
</div>
</div>
</div></div>
</section>''')


ACCOUNT_VIEWS = {
    '/account': ('info', 'Thông tin tài khoản', 'Trang khách hàng'),
    '/account/orders': ('orders', 'Đơn hàng của bạn', 'Đơn hàng của bạn'),
    '/account/order': ('order', 'Chi tiết đơn hàng', 'Chi tiết đơn hàng'),
    '/account/addresses': ('addresses', 'Địa chỉ của bạn', 'Sổ địa chỉ'),
    '/account/changepassword': ('password', 'Đổi mật khẩu', 'Đổi mật khẩu'),
    '/account/logout': ('logout', 'Đăng xuất', 'Đăng xuất'),
}


def account_page(path):
    """Logged-in account pages on the theme's account styles (page_customer_account / page_order);
    js/account.js renders the customer's data into [data-account-view]."""
    view, heading, crumb = ACCOUNT_VIEWS[path]

    def transform(soup, assets):
        set_breadcrumb(soup, crumb)
        section = 'signup page_order' if view == 'order' else 'signup page_customer_account'
        replace_main(soup, f'''<section class="{section}">
<div class="container"><div class="bg-shadow margin-bottom-20"><div class="row">
<div class="col-xs-12 col-sm-12 col-lg-3 col-left-ac"><div class="block-account" data-account-menu></div></div>
<div class="col-xs-12 col-sm-12 col-lg-9 col-right-ac" data-account-view="{view}">
<h1 class="title-head margin-top-0">{heading}</h1>
</div>
</div></div></div>
</section>''')
    return transform


def checkout_page(view):
    """/checkout and /checkout/thank-you: built on the cart page's layout and order-summary styles;
    js/checkout.js renders the form, cart lines and the placed order."""
    def transform(soup, assets):
        set_breadcrumb(soup, 'Thanh toán' if view == 'checkout' else 'Đặt hàng thành công')
        replace_main(soup, f'''<section class="main-cart-page main-container col1-layout checkout-page" data-checkout-view="{view}">
<div class="main container cartpcstyle"><div class="wrap_background_aside margin-bottom-40"><div class="row" data-checkout-body></div></div></div>
</section>''')
    return transform


SYNTHETIC = {
    FEATURED_PATH: dict(base='/collections/all', template='collection', title='Sản phẩm nổi bật', transform=featured_collection),
    '/he-thong-cua-hang': dict(base='/gioi-thieu', template='page', title='Hệ thống cửa hàng', transform=store_locator, js=['store.js']),
    '/checkout': dict(base='/cart', template='checkout', title='Thanh toán đơn hàng', transform=checkout_page('checkout')),
    '/checkout/thank-you': dict(base='/cart', template='checkout', title='Đặt hàng thành công', transform=checkout_page('thankyou')),
}
SYNTHETIC.update({path: dict(base='/account/login', template='customers', title=v[1], transform=account_page(path))
                  for path, v in ACCOUNT_VIEWS.items()})


def page_out_path(path):
    path = static_path(path)
    if path == '/':
        return os.path.join(DIST, 'index.html')
    if path == '/404':
        return os.path.join(DIST, '404.html')
    return os.path.join(DIST, path.strip('/'), 'index.html')


HEAD = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
{meta_desc}<link rel="icon" type="image/png" href="/images/theme/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300..900;1,300..900&family=Roboto+Slab:wght@700;800;900&display=swap" rel="stylesheet">
{swiper_css}{css}
</head>
<body class="tpl-{tpl_class}">
"""


def render(path, info, assets, base=None, transform=None, title=None):
    raw = open(os.path.join(RAW, slug_of(base or path) + '.html'), encoding='utf-8').read()
    soup = BeautifulSoup(raw, 'html.parser')
    if title:
        soup.title.string = title
    if transform:
        transform(soup, assets)
    template = '404' if info.get('status') == 404 else info.get('template', 'page')
    desc = soup.find('meta', attrs={'name': 'description'})
    meta_desc = f'<meta name="description" content="{desc["content"]}">\n' if desc and desc.get('content') else ''
    css = ['base.css', 'header.css', 'footer.css'] + TEMPLATE_CSS.get(template, ['page.css']) + ['cart.css']
    js = ['main.js', 'cart.js', 'account.js'] + TEMPLATE_JS.get(template, []) + info.get('js', [])
    use_swiper = template in SWIPER_TEMPLATES
    parts = [HEAD.format(
        title=soup.title.get_text(strip=True) if soup.title else 'TRIỀU QUẾ Thượng Đỉnh Yến',
        meta_desc=meta_desc,
        swiper_css='<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">\n' if use_swiper else '',
        css='\n'.join(f'<link rel="stylesheet" href="/css/{c}">' for c in dict.fromkeys(css)),
        tpl_class=template.replace('.', '-'),
    )]
    if template == 'index':
        inline_tab_fragments(soup)
    if template == 'product':
        prepare_product(soup, raw, assets)
    if template == 'page':
        fill_page_content(soup, path)
    if template == 'cart':
        fill_cart_suggest(soup)
    for child in soup.body.children:
        if isinstance(child, str):
            if not isinstance(child, Comment) and child.strip():
                parts.append(child.strip())
            continue
        classes = child.get('class') or []
        if child.name == 'header' or any(c in KEEP_BODY for c in classes):
            parts.append(str(clean(child, assets)))
    if use_swiper:
        parts.append('<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>')
    if template == 'article':
        parts.append('<script src="https://cdnjs.cloudflare.com/ajax/libs/tocbot/4.4.2/tocbot.min.js"></script>')
    parts += [f'<script src="/js/{j}"></script>' for j in js]
    parts.append('</body>\n</html>\n')
    out = page_out_path(path)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(parts))


def load_meta_all():
    saved = sys.argv
    sys.argv = [saved[0]]
    try:
        return load_meta()
    finally:
        sys.argv = saved


def load_meta():
    path = os.path.join(RAW, 'index.json')
    meta = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    known = {slug_of(u) for u in meta}
    for name in os.listdir(RAW):
        if not name.endswith('.html'):
            continue
        slug = name[:-5]
        if slug in known:
            continue
        url = '/' if slug == 'index' else '/' + slug.replace('__', '/')
        if url in meta:
            continue
        head = open(os.path.join(RAW, name), encoding='utf-8').read(200000)
        m = re.search(r"template\s*[:=]\s*['\"]([a-z_.]+)", head)
        meta[url] = {'status': 404 if slug == 'he-thong-cua-hang' else 200, 'template': m.group(1) if m else 'page'}
    only = [a for a in sys.argv[1:] if a.startswith('/')]
    return {k: v for k, v in meta.items() if not only or k in only}


def main():
    meta = load_meta()
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    assets = Assets()
    all_meta = load_meta_all()
    build_search_index(all_meta, assets)
    build_catalog(all_meta, assets)
    for path, info in meta.items():
        if path == '/he-thong-cua-hang':
            # a 404 on the original: its capture becomes the site 404 page, the path gets the store locator
            render('/404', dict(info, status=404), assets, base=path)
            continue
        render(path, info, assets)
    for path, spec in SYNTHETIC.items():
        render(path, {'template': spec['template'], 'js': spec.get('js', [])}, assets, base=spec['base'], transform=spec['transform'], title=spec['title'])
    if '--download' in sys.argv:
        assets.download()
    for folder in ('css', 'js', 'images', 'fonts'):
        shutil.copytree(os.path.join(ROOT, folder), os.path.join(DIST, folder))
    print('pages:', len(meta), '+ built:', len(SYNTHETIC))


if __name__ == '__main__':
    main()
