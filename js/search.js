/* Search results page (/search?query=...&type=product&page=N), rendered with the original markup.
 * Queries the original was observed answering use the recorded result lists; other queries use a
 * local matcher modelled on it (every word must appear, with its accents, in the name, type or
 * description — or unaccented in the URL handle). */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var section = $('section.search-main');
	if (!section) return;

	var PAGE_SIZE = 16;
	var params = new URLSearchParams(location.search);
	var query = (params.get('query') || params.get('q') || '').trim();
	var page = Math.max(1, parseInt(params.get('page'), 10) || 1);
	var searchIcon = ($('.search-main svg') || $('.header_tim_kiem button svg') || {}).outerHTML || '';

	function low(s) { return (s || '').toLowerCase().normalize('NFC'); }
	function words(s) { return low(s).match(/[0-9a-zà-ỹđ]+/g) || []; }
	function fold(s) { return low(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); }
	function key(s) { return low(s).replace(/\s+/g, ' ').trim(); }
	function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

	function searchForm(value) {
		return '<div class="serachpc_searchpage section margin-bottom-20"><div class="searchform"><form action="/search" class="input-group search-bar" method="get" role="search">' +
			'<input autocomplete="off" class="input-group-field auto-search" name="query" placeholder="Tìm kiếm..." type="text" value="' + esc(value) + '"/>' +
			'<button class="btn icon-fallback-text" type="submit"> ' + searchIcon + ' </button></form></div></div>';
	}

	function match(catalog) {
		var qw = words(query);
		if (!qw.length) return [];
		var handles = Object.keys(catalog);
		var docs = handles.map(function (h) {
			var p = catalog[h];
			return {
				h: h, p: p,
				words: words(p.name + ' ' + p.type + ' ' + p.text),
				alias: fold(h).split('-'),
				name: words(p.name)
			};
		});
		var avg = docs.reduce(function (s, d) { return s + d.name.length; }, 0) / docs.length;
		return docs.map(function (d) {
			var score = 0;
			for (var i = 0; i < qw.length; i++) {
				var w = qw[i];
				if (d.words.indexOf(w) === -1 && d.alias.indexOf(fold(w)) === -1) return null;
				var tf = d.name.filter(function (x) { return x === w; }).length;
				var n = docs.filter(function (x) { return x.name.indexOf(w) !== -1; }).length;
				score += Math.log(1 + (docs.length - n + .5) / (n + .5)) * tf * 2.2 / (tf + 1.2 * (.25 + .75 * d.name.length / avg));
			}
			return { h: d.h, score: score, id: d.p.id };
		}).filter(Boolean).sort(function (a, b) { return b.score - a.score || b.id - a.id; }).map(function (r) { return r.h; });
	}

	function pageUrl(n) { return '/search?query=' + encodeURIComponent(query) + '&type=product&page=' + n; }

	function pagination(pages) {
		if (pages <= 1) return '';
		var h = '<div class="section pagenav clearfix a-center"><nav class="clearfix relative nav_pagi w_100"><ul class="pagination clearfix">';
		h += page > 1 ? '<li class="page-item hidden-xs"><a class="page-link link-next-pre" href="' + pageUrl(page - 1) + '"> &laquo; </a></li>'
			: '<li class="page-item disabled"><a class="page-link" href="#"> &laquo; </a></li>';
		for (var i = 1; i <= pages; i++) {
			h += i === page ? '<li class="active page-item disabled"><a class="page-link" href="#">' + i + '</a></li>'
				: '<li class="page-item"><a class="page-link" href="' + pageUrl(i) + '">' + i + '</a></li>';
		}
		h += page < pages ? '<li class="page-item hidden-xs"><a class="page-link link-next-pre" href="' + pageUrl(page + 1) + '"> &raquo; </a></li>'
			: '<li class="page-item disabled"><a class="page-link" href="#"> &raquo; </a></li>';
		return h + '</ul></nav></div>';
	}

	function render(catalog, recorded) {
		var box = $('.container', section);
		if (!query) {
			document.title = 'Tìm kiếm';
			box.innerHTML = '<h2 class="title-head title_search"><a class="title-box" href="#">Nhập từ khóa để tìm kiếm</a></h2>' + searchForm('');
			return;
		}
		document.title = query + ' - Tìm kiếm';
		var hit = recorded[Object.keys(recorded).filter(function (k) { return key(k) === key(query); })[0]];
		var list = (hit ? hit.handles : match(catalog)).filter(function (h) { return catalog[h] && catalog[h].card; });
		if (!list.length) {
			box.innerHTML = '<p style="color: #e70000;">Không tìm thấy bất kỳ kết quả nào với từ khóa trên.</p>' +
				'<h1 class="title-head title_search">Nhập từ khóa để tìm kiếm</h1>' + searchForm(query);
			return;
		}
		var count = hit && /\d+/.test(hit.title) ? +hit.title.match(/\d+/)[0] : list.length;
		var pages = Math.ceil(count / PAGE_SIZE);
		page = Math.min(page, pages);
		var cards = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(function (h) {
			return '<div class="col-6 col-sm-4 col-md-3 col-lg-3">' + catalog[h].card + '</div>';
		}).join('');
		box.innerHTML = '<div class="margin-bottom-15 no-padding"><h1 class="title-head title_search">Có ' + list.length + ' kết quả tìm kiếm phù hợp</h1></div>' +
			'<div class="category-products"><div class="d-none"><span class="search_content">' + esc(query) + '</span><span class="search_count">' + list.length + '</span></div>' +
			'<div class="products-view-grid"><div class="row">' + cards + '</div></div></div>' + pagination(pages);
		if (window.markWish) window.markWish();
	}

	Promise.all([
		fetch('/data/products.json').then(function (r) { return r.json(); }),
		fetch('/data/search_results.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
	]).then(function (res) { render(res[0], res[1]); });
})();
