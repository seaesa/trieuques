/* Collection page: filter drawer, sorting and paging.
 * The original asks the server (/search?q=...&view=data) for each state; here the same states are
 * computed from /data/products.json + /data/collections.json and rendered with the original markup.
 * The global names (doSearch, sortby, clearAllFiltered, removeFilteredItem) match the inline
 * onclick handlers kept in the page markup. */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

	var layout = $('.layout-collection');
	var box = $('.category-products');
	if (!layout || !box) return;

	var PAGE_SIZE = 20;
	var SORT_KEYS = { 'price-asc': 'price_min:asc', 'price-desc': 'price_min:desc', 'alpha-asc': 'name:asc', 'alpha-desc': 'name:desc', 'created-desc': 'created_on:desc', 'created-asc': 'created_on:asc' };
	var SORT_CLASS = { 'price_min:asc': 'price-asc', 'price_min:desc': 'price-desc', 'name:asc': 'alpha-asc', 'name:desc': 'alpha-desc', 'created_on:desc': 'position-desc' };
	var sidebar = $('.dqdt-sidebar'), backdrop = $('.backdrop__body-backdrop___1rvky');
	var basePath = location.pathname.replace(/\/page-\d+\/?$/, '').replace(/\/$/, '') || '/';
	var selectedSortby = '';
	var catalog = null, collection = null;
	var columnClass = ($('.products-view .row > div', box) || {}).className || 'col-6 col-md-3';

	function load() {
		if (catalog) return Promise.resolve();
		return Promise.all([
			fetch('/data/products.json').then(function (r) { return r.json(); }),
			fetch('/data/collections.json').then(function (r) { return r.json(); })
		]).then(function (res) {
			catalog = res[0];
			collection = res[1][basePath] || { id: 0, handles: [], sorts: {} };
		});
	}

	/* ---------- Filter evaluation: groups are ANDed, values inside a group are ORed ---------- */
	function checkedInputs() { return $$('.filter-container input[type=checkbox]:checked'); }

	function matchPrice(price, value) {
		return value.replace(/[()]/g, '').split(' AND ').every(function (cond) {
			var m = cond.trim().match(/^(<=|>=|<|>)(\d+)$/);
			if (!m) return true;
			var n = +m[2];
			return m[1] === '<' ? price < n : m[1] === '>' ? price > n : m[1] === '<=' ? price <= n : price >= n;
		});
	}

	function matches(product, input) {
		var field = input.getAttribute('data-field');
		var value = input.value.replace(/^\("?|"?\)$/g, '');
		if (field === 'price_min') return matchPrice(product.price, input.value);
		if (field === 'product_type.filter_key') return product.type === value;
		if (field === 'vendor') return product.vendor === value;
		if (field === 'tags') return product.tags.indexOf(value) !== -1;
		return true;
	}

	function results() {
		var order = (selectedSortby && collection.sorts[selectedSortby]) || collection.handles;
		var groups = {};
		checkedInputs().forEach(function (input) {
			var g = input.getAttribute('data-group');
			(groups[g] = groups[g] || []).push(input);
		});
		return order.filter(function (handle) {
			var p = catalog[handle];
			if (!p) return false;
			return Object.keys(groups).every(function (g) {
				return groups[g].some(function (input) { return matches(p, input); });
			});
		});
	}

	/* ---------- Rendering (same markup the server returns) ---------- */
	function paginationHtml(page, pages) {
		if (pages <= 1) return '';
		var h = '<nav class="collection-paginate clearfix relative nav_pagi w_100"><ul class="pagination clearfix">';
		h += page > 1
			? '<li class="page-item"><a class="page-link link-next-pre" onclick="doSearch(' + (page - 1) + ')" href="javascript:;" title="' + (page - 1) + '">&laquo;</a></li>'
			: '<li class="page-item disabled"><a class="page-link" href="#">&laquo;</a></li>';
		for (var i = 1; i <= pages; i++) {
			h += i === page
				? '<li class="active page-item disabled"><a class="page-link" href="javascript:;" style="pointer-events:none">' + i + '</a></li>'
				: '<li class="page-item"><a class="page-link" onclick="doSearch(' + i + ')" href="javascript:;">' + i + '</a></li>';
		}
		h += page < pages
			? '<li class="page-item"><a class="page-link link-next-pre" onclick="doSearch(' + (page + 1) + ')" href="javascript:;" title="' + (page + 1) + '">&raquo;</a></li>'
			: '<li class="page-item disabled"><a class="page-link" href="#">&raquo;</a></li>';
		return h + '</ul></nav>';
	}

	function render(page) {
		var list = results();
		var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
		page = Math.min(Math.max(1, page), pages);
		var containers = $('.filter-containers', box);
		$$(':scope > .products-view, :scope > .pagenav', box).forEach(function (el) { el.remove(); });
		$$('.alert', containers).forEach(function (el) { el.remove(); });
		if (!list.length) {
			containers.insertAdjacentHTML('beforeend', '<div class="alert alert-warning green-alert section margin-top-20 margin-bottom-20" role="alert"> Không có sản phẩm nào trong danh mục này. </div>');
		} else {
			var cards = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(function (handle) {
				return '<div class="' + columnClass + '">' + catalog[handle].card + '</div>';
			}).join('');
			box.insertAdjacentHTML('beforeend',
				'<div class="products-view products-view-grid list_hover_pro"><div class="row">' + cards + '</div></div>' +
				'<div class="pagenav">' + paginationHtml(page, pages) + '</div>');
		}
		resortby(selectedSortby);
		$$('.count-filter-val').forEach(function (el) { el.textContent = $$('.filter-container__selected-filter-list ul li').length; });
		if (window.markWish) window.markWish();
		return page;
	}

	function resortby(sort) {
		$$('.sort-cate-right .btn-quick-sort').forEach(function (li) { li.classList.remove('active'); });
		var li = $('.sort-cate-right .' + (SORT_CLASS[sort] || 'default'));
		if (li) li.classList.add('active');
	}

	/* URL state in the original's format: ?q=collections:ID AND price_min:(...)&page=N&sortby=...&view=grid */
	function queryString(page) {
		var groups = {}, order = [];
		checkedInputs().forEach(function (input) {
			var g = input.getAttribute('data-group');
			if (!groups[g]) { groups[g] = { field: input.getAttribute('data-field'), values: [] }; order.push(g); }
			groups[g].values.push(input.value);
		});
		var params = collection.id ? ['collections:' + collection.id] : [];
		order.forEach(function (g) {
			var v = groups[g].values.join(' OR ');
			params.push(groups[g].field + ':' + (groups[g].values.length > 1 ? '(' + v + ')' : v));
		});
		var q = '?q=' + params.join(' AND ');
		if (page) q += '&page=' + page;
		if (selectedSortby) q += '&sortby=' + selectedSortby;
		return encodeURI(q + '&view=grid');
	}

	function doSearch(page) {
		page = parseInt(page, 10) || 1;
		load().then(function () {
			page = render(page);
			history.pushState({ url: queryString(page) }, '', queryString(page));
			var block = $('.block-collection');
			if (block) window.scrollTo(0, block.getBoundingClientRect().top + window.pageYOffset);
		});
	}

	function closeFilter() {
		sidebar && sidebar.classList.remove('active');
		backdrop && backdrop.classList.remove('active');
	}

	function renderFilterdItems() {
		var ul = $('.filter-container__selected-filter-list ul');
		var wrap = $('.filter-container__selected-filter');
		if (!ul) return;
		ul.innerHTML = '';
		checkedInputs().forEach(function (input) {
			var name = input.closest('label').textContent;
			ul.insertAdjacentHTML('beforeend', "<li class='filter-container__selected-filter-item' for='" + input.id + "'><a href='javascript:void(0)' onclick=\"removeFilteredItem('" + input.id + "')\" title='" + name.replace(/'/g, '&#39;') + "'><i class='fa fa-close'></i> " + name + '</a></li>');
		});
		if (wrap) wrap.style.display = checkedInputs().length ? '' : 'none';
	}

	window.doSearch = doSearch;
	window.sortby = function (sort) {
		selectedSortby = SORT_KEYS[sort] || '';
		doSearch(1);
	};
	window.clearAllFiltered = function () {
		$$('.filter-container input[type=checkbox]').forEach(function (input) { input.checked = false; });
		renderFilterdItems();
		doSearch(1);
		sidebar && sidebar.classList.toggle('active');
		backdrop && backdrop.classList.toggle('active');
	};
	window.removeFilteredItem = function (id) {
		var input = document.getElementById(id);
		if (input) input.click();
	};

	$$('.filter-item--check-box input').forEach(function (input) {
		input.addEventListener('change', function () {
			renderFilterdItems();
			doSearch(1);
			sidebar && sidebar.classList.toggle('active');
			backdrop && backdrop.classList.toggle('active');
		});
	});

	document.addEventListener('click', function (e) {
		if (e.target.closest('.btn-filter')) {
			sidebar && sidebar.classList.toggle('active');
			backdrop && backdrop.classList.add('active');
		} else if (e.target.closest('.close-filters') || e.target.closest('.backdrop__body-backdrop___1rvky')) {
			closeFilter();
		} else if (e.target.closest('.sort-cate-right h3') && window.innerWidth <= 991) {
			var h3 = e.target.closest('.sort-cate-right h3');
			window.slideToggle($('ul', h3.parentNode), 400);
			h3.classList.toggle('active');
		}
	});

	/* Restore state from the query string (filters, sort, page), as the original does on load */
	(function restore() {
		var search = decodeURIComponent(location.search);
		if (!search) return;
		var filters = search.match(/\(.*?\)/g) || [];
		filters.forEach(function (item) {
			item = item.replace(/\(\(/g, '(');
			$$('.aside-content input').forEach(function (input) { if (input.value === item) input.checked = true; });
		});
		var sort = search.match(/[?&]sortby=([^&#]*)/);
		if (sort) selectedSortby = sort[1];
		var page = search.match(/[?&]page=(\d+)/);
		renderFilterdItems();
		load().then(function () { render(page ? +page[1] : 1); });
	})();
})();
