(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
	var isDesktop = function () { return window.matchMedia('(min-width: 992px)').matches; };

	function slideToggle(el, duration) {
		if (!el) return;
		duration = duration || 200;
		var hidden = getComputedStyle(el).display === 'none';
		el.style.overflow = 'hidden';
		if (hidden) {
			el.style.display = 'block';
			var h = el.scrollHeight;
			el.style.height = '0px';
			el.offsetHeight;
			el.style.transition = 'height ' + duration + 'ms';
			el.style.height = h + 'px';
		} else {
			el.style.height = el.scrollHeight + 'px';
			el.offsetHeight;
			el.style.transition = 'height ' + duration + 'ms';
			el.style.height = '0px';
		}
		setTimeout(function () {
			el.style.transition = el.style.height = el.style.overflow = '';
			if (!hidden) el.style.display = 'none';
		}, duration);
	}
	window.slideToggle = slideToggle;

	function smoothScrollTo(y, duration) {
		var start = window.scrollY, diff = y - start, t0 = null;
		function step(ts) {
			if (!t0) t0 = ts;
			var p = Math.min((ts - t0) / duration, 1);
			var ease = p < .5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
			window.scrollTo(0, start + diff * ease);
			if (p < 1) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	}

	/* ---------- Toast alert (theme.alert.new) ---------- */
	var alertTimer = null;
	function alertNew(title, message, time, type) {
		var box = $('#js-global-alert');
		if (!box) return;
		box.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-primary', 'inactive');
		box.classList.add(type || 'alert-success');
		$('.alert-heading', box).innerHTML = title || '';
		$('.alert-content', box).innerHTML = message || '';
		box.classList.add('active');
		clearTimeout(alertTimer);
		alertTimer = setTimeout(function () { box.classList.remove('active'); }, time || 3000);
	}
	window.theme = { alert: { new: alertNew } };
	document.addEventListener('click', function (e) {
		if (e.target.closest('#js-global-alert .close')) $('#js-global-alert').classList.remove('active');
	});

	/* ---------- Top bar promo rotation: every 5s, paused on hover ---------- */
	(function promo() {
		var list = $('.js-promo');
		if (!list) return;
		var items = $$('.js-promo > li'), index = 0, stop = false;
		items.forEach(function (li, i) {
			li.classList.remove('animated', 'flipInX', 'see-block', 'see-none');
			li.classList.add(i === 0 ? 'see-block' : 'see-none');
		});
		function show(i) {
			items.forEach(function (el) { el.classList.add('see-none'); el.classList.remove('animated', 'flipInX', 'see-block'); });
			items[i].classList.remove('see-none');
			items[i].classList.add('animated', 'flipInX', 'see-block');
		}
		setInterval(function () {
			if (stop || items.length < 2) return;
			index = index > items.length - 2 ? 0 : index + 1;
			show(index);
		}, 5000);
		list.addEventListener('mouseenter', function () { stop = true; });
		list.addEventListener('mouseleave', function () { stop = false; });
	})();

	/* ---------- Sticky header ---------- */
	(function sticky() {
		var header = $('header.header');
		if (!header) return;
		var offset = header.offsetHeight, lastY = 0, lastW = window.innerWidth, timer;
		window.addEventListener('scroll', function () {
			var y = window.scrollY;
			if (y > offset && y > lastY) header.classList.add('hSticky');
			if (y <= lastY && y <= offset) header.classList.remove('hSticky');
			lastY = y;
		}, { passive: true });
		window.addEventListener('resize', function () {
			clearTimeout(timer);
			timer = setTimeout(function () {
				if (lastW === window.innerWidth) return;
				header.classList.remove('hSticky');
				offset = header.offsetHeight;
				lastW = window.innerWidth;
			}, 200);
		});
	})();

	/* ---------- Mobile off-canvas menu ---------- */
	(function mobileMenu() {
		var menu = $('.header-menu'), overlay = $('.mobile-nav-overflow'), btn = $('#btn-menu-mobile');
		if (!menu || !btn) return;
		var tabLinks = $$('#tabs-menu-mb .tab-link');
		function activateTab(link) {
			tabLinks.forEach(function (l) { l.classList.remove('active'); });
			link.classList.add('active');
			$$('.tab-content-mb').forEach(function (c) { c.classList.remove('active'); });
			var target = document.getElementById(link.dataset.tab);
			if (target) target.classList.add('active');
		}
		tabLinks.forEach(function (l) { l.addEventListener('click', function () { activateTab(l); }); });
		if (tabLinks[0]) activateTab(tabLinks[0]);
		btn.addEventListener('click', function () {
			menu.classList.add('current');
			overlay && overlay.classList.toggle('open');
		});
		function close() { menu.classList.remove('current'); overlay && overlay.classList.remove('open'); }
		var closeBtn = $('.header-menu .title_menu .close-mb-menu');
		closeBtn && closeBtn.addEventListener('click', close);
		overlay && overlay.addEventListener('click', close);
		$$('#nav li > .open_mnu, .sudes-main-cate li > .open_mnu').forEach(function (icon) {
			icon.addEventListener('click', function (e) {
				e.preventDefault();
				var li = icon.closest('li');
				var sub = li.querySelector(':scope > .dropdown-menu, :scope > .menu-child');
				slideToggle(sub, 200);
				li.classList.toggle('current');
				icon.classList.toggle('current');
			});
		});
	})();

	/* ---------- Desktop nav overflow arrows ---------- */
	(function navOverflow() {
		var wrapper = $('.navigation-horizontal'), nav = $('.navigation-horizontal ul.nav');
		if (!wrapper || !nav) return;
		var margin = 0;
		function measure() {
			if (!isDesktop()) return;
			var total = $$('.nav-item', nav).reduce(function (s, li) { return s + li.offsetWidth; }, 0);
			wrapper.classList.toggle('overflow', Math.ceil(total) > Math.ceil(nav.offsetWidth));
		}
		function move(amount) {
			var max = nav.parentElement.clientWidth - nav.scrollWidth;
			margin = Math.min(0, Math.max(max, margin + amount));
			nav.style.transition = 'margin-left .3s';
			nav.style.marginLeft = margin + 'px';
		}
		var prev = $('#prev'), next = $('#next');
		prev && prev.addEventListener('click', function (e) { e.preventDefault(); move(190); });
		next && next.addEventListener('click', function (e) { e.preventDefault(); move(-190); });
		measure();
		window.addEventListener('load', measure);
		window.addEventListener('resize', measure);
	})();

	/* ---------- Search: suggestion panel, recent searches, live results ---------- */
	(function search() {
		var form = $('.header_tim_kiem form.search-bar');
		if (!form) return;
		var input = $('input[type="text"]', form), suggest = $('.search-suggest', form);
		var recentBox = $('.search-recent', suggest), recentList = $('.search-list', recentBox), results = $('.list-search', suggest);
		var recent = [];
		try { recent = JSON.parse(localStorage.getItem('search_recent_list') || '[]'); } catch (e) { recent = []; }
		function saveRecent() { try { localStorage.setItem('search_recent_list', JSON.stringify(recent)); } catch (e) {} }
		function renderRecent() {
			if (!recentBox) return;
			recentList.innerHTML = '';
			recent.forEach(function (item) {
				var a = document.createElement('a');
				a.href = '/search?query=' + encodeURIComponent(item) + '&type=product';
				a.textContent = item;
				a.title = 'Tìm kiếm ' + item;
				a.className = 'search-item';
				var x = document.createElement('span');
				x.textContent = 'Đóng';
				x.title = 'Đóng';
				x.className = 'close';
				x.addEventListener('click', function (e) {
					e.preventDefault(); e.stopPropagation();
					recent.splice(recent.indexOf(item), 1);
					saveRecent(); renderRecent();
				});
				a.appendChild(x);
				recentList.appendChild(a);
			});
			recentBox.classList.toggle('d-none', recent.length === 0);
		}
		renderRecent();
		input.addEventListener('focus', function () { suggest.classList.add('open'); });
		document.addEventListener('click', function (e) {
			if (!e.target.closest('.header_tim_kiem .search-bar')) suggest.classList.remove('open');
		});
		form.addEventListener('submit', function () {
			var q = input.value.trim();
			if (!q) return;
			recent = [q].concat(recent.filter(function (r) { return r !== q; })).slice(0, 10);
			saveRecent();
		});
		var index = null;
		function loadIndex() {
			if (index) return Promise.resolve(index);
			return fetch('/data/search.json').then(function (r) { return r.json(); }).then(function (d) { index = d; return d; });
		}
		function fold(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd'); }
		/* BM25 on product names (k1=1.2, b=.75); each query word must occur in name, type, tags or description.
		   Calibrated against the original's live search, which returns its top 4. */
		function tokens(s) { return fold(s || '').split(/[^a-z0-9]+/).filter(Boolean); }
		function searchProducts(list, term) {
			var words = tokens(term);
			if (!words.length) return [];
			var docs = list.map(function (p) {
				return { p: p, name: tokens(p.name), all: tokens(p.name + ' ' + (p.type || '') + ' ' + (p.tags || '') + ' ' + (p.text || '')) };
			});
			var avg = docs.reduce(function (s, d) { return s + d.name.length; }, 0) / docs.length;
			var idf = {};
			words.forEach(function (w) {
				var n = docs.filter(function (d) { return d.name.indexOf(w) !== -1; }).length;
				idf[w] = Math.log(1 + (docs.length - n + .5) / (n + .5));
			});
			return docs.map(function (d) {
				var score = 0;
				for (var i = 0; i < words.length; i++) {
					var w = words[i];
					if (d.all.indexOf(w) === -1) return null;
					var tf = d.name.filter(function (x) { return x === w; }).length;
					score += idf[w] * tf * 2.2 / (tf + 1.2 * (.25 + .75 * d.name.length / avg));
				}
				return { p: d.p, score: score };
			}).filter(Boolean).sort(function (a, b) { return b.score - a.score || b.p.id - a.p.id; }).map(function (r) { return r.p; });
		}
		window.searchProducts = searchProducts;
		var debounce;
		input.addEventListener('keyup', function () {
			var term = input.value.trim();
			clearTimeout(debounce);
			if (term.length <= 1) {
				results.innerHTML = '';
				renderRecent();
				return;
			}
			recentBox && recentBox.classList.add('d-none');
			debounce = setTimeout(function () {
				loadIndex().then(function (items) {
					var q = fold(term);
					var found = searchProducts(items, term).slice(0, 4).sort(function (a, b) { return a.id - b.id; });
					if (!found.length) {
						results.innerHTML = '<div class="not-pro">Không có thấy kết quả tìm kiếm</div>';
						return;
					}
					results.innerHTML = found.map(function (p) {
						return '<a class="product-smart" href="' + p.url + '" title="' + p.name + '"><div class="image_thumb"><img width="58" height="58" src="' + p.image + '" alt="' + p.name + '"></div>' +
							'<div class="product-info"><h3 class="product-name"><span>' + p.name + '</span></h3><div class="price-box"><span class="price">' + p.price + '</span>' +
							(p.compare_price ? '<span class="compare-price">' + p.compare_price + '</span>' : '') + '</div></div></a>';
					}).join('') + '<a href="/search?query=' + encodeURIComponent(term) + '&type=product" class="see-all-search" title="Xem tất cả">Xem tất cả kết quả »</a>';
				});
			}, 200);
		});
	})();

	/* ---------- Footer accordions (mobile) ---------- */
	if (window.innerWidth < 767) {
		$$('.footer-click h4').forEach(function (h) {
			h.addEventListener('click', function () {
				h.classList.toggle('cls_mn');
				var list = h.nextElementSibling;
				slideToggle(list, 200);
				list && list.classList.toggle('current');
			});
		});
	}

	/* ---------- Back to top ---------- */
	(function backtop() {
		var btn = $('.backtop');
		if (!btn) return;
		window.addEventListener('scroll', function () { btn.classList.toggle('show', window.scrollY > 200); }, { passive: true });
		btn.addEventListener('click', function (e) { e.preventDefault(); smoothScrollTo(0, 800); });
	})();

	/* ---------- Promo popup banner (once per day when "don't show today" is ticked) ---------- */
	(function banner() {
		var modal = $('#modal-banner');
		if (!modal) return;
		var check = $('#check-close-banner');
		var today = function () { return new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }); };
		var remember = function () { try { localStorage.setItem('popupClosedDate', today()); } catch (e) {} };
		var closedToday = false;
		try { closedToday = localStorage.getItem('popupClosedDate') === today(); } catch (e) {}
		function hide() { modal.style.display = 'none'; if (check && check.checked) remember(); }
		$$('#modal-banner .modalbanner-overlay, #modal-banner .modalbanner-close').forEach(function (el) {
			el.addEventListener('click', function (e) { e.preventDefault(); hide(); });
		});
		var link = $('#modal-banner .banner-promotion');
		link && link.addEventListener('click', remember);
		if (!closedToday) setTimeout(function () { modal.style.display = 'block'; }, parseInt(modal.dataset.delay, 10) || 3000);
	})();

	/* ---------- Floating contact widget ---------- */
	(function widget() {
		var ser = $('.ser-icon'), proc = $('.ser-icon .process');
		if (!ser || !proc) return;
		var n = $$('.item', proc).length, i = 1, x = 0;
		var step = function () { return proc.offsetWidth / n; };
		ser.classList.remove('unsee');
		function next() {
			if (i < n) {
				i++;
				x -= step();
				proc.style.transform = 'translateX(' + x + 'px)';
				setTimeout(next, 800);
			} else {
				ser.classList.add('unsee');
				i = 1; x = 0;
				proc.style.transform = 'translateX(0px)';
				setTimeout(begin, 2000);
			}
		}
		function begin() { ser.classList.remove('unsee'); setTimeout(next, 900); }
		setTimeout(begin, 2000);
		$$('.main-widget .close-icon').forEach(function (btn) {
			btn.addEventListener('click', function () { $$('.main-widget .element').forEach(function (el) { el.classList.toggle('unsee'); }); });
		});
	})();

	/* ---------- Coupons: copy code, detail popup ---------- */
	document.addEventListener('click', function (e) {
		var copy = e.target.closest('.js-copy');
		if (copy) {
			e.preventDefault();
			var text = copy.getAttribute('data-copy');
			(navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).catch(function () {
				var ta = document.createElement('textarea');
				ta.textContent = text; ta.style.position = 'fixed';
				document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
			});
			if (!copy.classList.contains('iscopied')) {
				var label = copy.textContent;
				copy.classList.add('iscopied');
				copy.textContent = 'Đã lưu';
				setTimeout(function () { copy.classList.remove('iscopied'); copy.textContent = label; }, 1500);
			}
			return;
		}
		var info = e.target.closest('.info-button');
		var popup = $('.popup-coupon'), backdrop = $('.backdrop__body-backdrop___1rvky');
		if (info && popup) {
			e.preventDefault();
			$('.code', popup).innerHTML = info.getAttribute('data-coupon');
			$('.time', popup).innerHTML = info.getAttribute('data-time');
			$('.dieukien', popup).innerHTML = info.getAttribute('data-content');
			popup.classList.add('active');
			backdrop && backdrop.classList.add('active');
			return;
		}
		if (e.target.closest('.backdrop__body-backdrop___1rvky, .close-popup-coupon')) {
			e.preventDefault();
			popup && popup.classList.remove('active');
			backdrop && backdrop.classList.remove('active');
		}
	});

	/* ---------- Wishlist (stored locally) ---------- */
	var WISH_KEY = 'sudes_wishlist_products';
	function getWish() { try { return JSON.parse(localStorage.getItem(WISH_KEY) || '[]'); } catch (e) { return []; } }
	function setWish(list) { try { localStorage.setItem(WISH_KEY, JSON.stringify(list)); } catch (e) {} renderWishCount(); }
	function renderWishCount() { $$('.js-wishlist-count').forEach(function (el) { el.textContent = getWish().length; }); }
	function markWish() {
		var list = getWish();
		$$('.setWishlist').forEach(function (a) { a.classList.toggle('active', list.indexOf(a.dataset.wish) !== -1); });
	}
	window.markWish = markWish;
	document.addEventListener('click', function (e) {
		var a = e.target.closest('.setWishlist');
		if (!a) return;
		e.preventDefault();
		var list = getWish(), handle = a.dataset.wish;
		if (a.classList.contains('active')) {
			setWish(list.filter(function (h) { return h !== handle; }));
			alertNew('Xóa khỏi danh sách yêu thích', 'Sản phẩm của bạn đã xóa khỏi sách yêu thích thành công.', 3000, 'alert-primary');
		} else {
			list.unshift(handle);
			setWish(list.slice(0, 100));
			alertNew('Thêm vào danh sách yêu thích', 'Sản phẩm của bạn đã thêm vào danh sách yêu thích thành công.', 3000, 'alert-success');
		}
		markWish();
	});
	renderWishCount();
	markWish();

	/* ---------- Cart count (cart stored locally, see cart.js) ---------- */
	function renderCartCount() {
		var items = [];
		try { items = JSON.parse(localStorage.getItem('tq_cart') || '[]'); } catch (e) {}
		var count = items.reduce(function (s, it) { return s + it.quantity; }, 0);
		$$('.count_item_pr').forEach(function (el) {
			el.textContent = count;
			el.classList.toggle('hidden-count', count === 0);
		});
	}
	window.renderCartCount = renderCartCount;
	renderCartCount();

	/* ---------- Swiper helper: legacy .swiper-container markup works with Swiper 11 ---------- */
	window.tqSwiper = function (el, options) {
		if (!el || typeof Swiper === 'undefined') return null;
		el.classList.add('swiper');
		return new Swiper(el, options);
	};

	/* ---------- Account: "Quên mật khẩu?" swaps the login form for the recover form ---------- */
	$$('.quenmk').forEach(function (el) {
		el.addEventListener('click', function () {
			var login = $('#login'), recover = $('.h_recover');
			if (login) login.classList.toggle('hidden');
			if (recover) slideToggle(recover, 400);
		});
	});
	if (location.hash === '#recover') $$('.h_recover').forEach(function (el) { el.style.display = 'block'; });
	window.showRecoverPasswordForm = function () { $('#recover-password').style.display = 'block'; $('#login').style.display = 'none'; };
	window.hideRecoverPasswordForm = function () { $('#recover-password').style.display = 'none'; $('#login').style.display = 'block'; };

	/* ---------- Forms handled by the store backend (account, contact, comments) stay on the page ---------- */
	window.loginFacebook = window.loginGoogle = function () {};
	document.addEventListener('submit', function (e) {
		var action = e.target.getAttribute('action') || '';
		if (/^\/(account|postcontact|posts)\b/.test(action)) e.preventDefault();
	});
})();
