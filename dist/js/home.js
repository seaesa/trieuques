(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

	/* ---------- Hero slider: fade, 1s transition, 8s autoplay with progress bar ---------- */
	(function heroSlider() {
		var el = $('.section_slider .swiper-container');
		if (!el) return;
		var bar = $('.section_slider .swiper-progress-bar .progress'), timer;
		function reset() { clearInterval(timer); if (bar) bar.style.width = '0'; }
		function start() {
			if (!bar) return;
			var duration = 8000;
			timer = setInterval(function () {
				var p = (parseFloat(bar.style.width) || 0) + (100 / duration) * (1000 / 60);
				bar.style.width = Math.min(p, 100) + '%';
			}, 1000 / 60);
		}
		tqSwiper(el, {
			speed: 1000,
			spaceBetween: 14,
			effect: 'fade',
			fadeEffect: { crossFade: true },
			navigation: { nextEl: '.section_slider .swiper-button-next', prevEl: '.section_slider .swiper-button-prev' },
			autoplay: { delay: 8000, disableOnInteraction: false },
			pagination: { el: '.section_slider .swiper-pagination', clickable: true },
			on: {
				init: function () { reset(); start(); },
				slideChangeTransitionStart: reset,
				slideChangeTransitionEnd: start
			}
		});
	})();

	/* ---------- Carousels that switch to native horizontal scroll at ≤767px ---------- */
	function responsiveSwiper(selector, options) {
		var el = $(selector), instance = null;
		if (!el) return;
		function toggle() {
			var small = window.innerWidth <= 767;
			if (small && instance) { instance.destroy(true, true); instance = null; }
			else if (!small && !instance) { instance = tqSwiper(el, options); }
		}
		toggle();
		window.addEventListener('resize', toggle);
	}

	responsiveSwiper('.swiper_feedback', {
		slidesPerView: 3, spaceBetween: 20, watchOverflow: true, slidesPerGroup: 1, grabCursor: true,
		navigation: { nextEl: '.section_feedback .swiper-button-next', prevEl: '.section_feedback .swiper-button-prev' },
		breakpoints: {
			640: { slidesPerView: 2, spaceBetween: 14 }, 768: { slidesPerView: 2, spaceBetween: 14 },
			992: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 2.5, spaceBetween: 20 }, 1200: { slidesPerView: 3, spaceBetween: 20 }
		}
	});
	responsiveSwiper('.swiper_sale', {
		slidesPerView: 4, spaceBetween: 20, slidesPerGroup: 1,
		navigation: { nextEl: '.swiper_sale .swiper-button-next', prevEl: '.swiper_sale .swiper-button-prev' },
		breakpoints: { 768: { slidesPerView: 4, spaceBetween: 20 }, 992: { slidesPerView: 4, spaceBetween: 20 }, 1024: { slidesPerView: 4, spaceBetween: 20 } }
	});
	responsiveSwiper('.swiper_coupons', {
		slidesPerView: 4, spaceBetween: 16, watchOverflow: true, slidesPerGroup: 1,
		navigation: { nextEl: '.swiper_coupons .swiper-button-next', prevEl: '.swiper_coupons .swiper-button-prev' },
		breakpoints: {
			640: { slidesPerView: 2, spaceBetween: 14 }, 768: { slidesPerView: 2.3, spaceBetween: 14 },
			992: { slidesPerView: 2.5, spaceBetween: 20 }, 1024: { slidesPerView: 3, spaceBetween: 16 }, 1200: { slidesPerView: 4, spaceBetween: 16 }
		}
	});
	responsiveSwiper('.swiper_brands', {
		slidesPerView: 6, spaceBetween: 20, watchOverflow: true, slidesPerGroup: 1,
		navigation: { nextEl: '.swiper_brands .swiper-button-next', prevEl: '.swiper_brands .swiper-button-prev' },
		breakpoints: {
			640: { slidesPerView: 4, spaceBetween: 14 }, 768: { slidesPerView: 5, spaceBetween: 14 },
			992: { slidesPerView: 6, spaceBetween: 20 }, 1024: { slidesPerView: 6, spaceBetween: 20 }, 1200: { slidesPerView: 8, spaceBetween: 20 }
		}
	});

	/* ---------- Product tabs: pill click switches pane; arrows scroll the pill strip when it overflows ---------- */
	$$('.section_product_tab .e-tabs').forEach(function (tabs) {
		var pills = $$('.tabs-title li', tabs), panes = $$('.tab-content', tabs);
		if (pills.length && !pills.some(function (p) { return p.classList.contains('current'); })) pills[0].classList.add('current');
		if (panes.length && !panes.some(function (p) { return p.classList.contains('current'); })) panes[0].classList.add('current');
		pills.forEach(function (li) {
			li.addEventListener('click', function () {
				pills.forEach(function (p) { p.classList.remove('current'); });
				panes.forEach(function (p) { p.classList.remove('current'); });
				li.classList.add('current');
				var pane = $('.tab-content.' + li.dataset.tab, tabs);
				if (pane) pane.classList.add('current');
				var viewAll = $('.view-more a', tabs);
				if (viewAll && li.dataset.url) viewAll.setAttribute('href', '/' + li.dataset.url.trim().replace(/^\//, ''));
			});
		});
		var strip = $('.tab_ul ul', tabs), prev = $('.tab_ul .prev', tabs), next = $('.tab_ul .next', tabs);
		if (!strip || !prev || !next) return;
		function check() {
			var over = strip.scrollWidth > strip.clientWidth;
			prev.style.display = next.style.display = over ? '' : 'none';
		}
		prev.addEventListener('click', function (e) { e.preventDefault(); strip.scrollBy({ left: -345, behavior: 'smooth' }); });
		next.addEventListener('click', function (e) { e.preventDefault(); strip.scrollBy({ left: 150, behavior: 'smooth' }); });
		check();
		window.addEventListener('resize', check);
	});

	/* ---------- Flash sale countdown (data-date = MM-DD-YYYY-hh-mm-ss) ---------- */
	$$('[data-countdown="countdown"]').forEach(function (el) {
		var d = (el.getAttribute('data-date') || '').split('-');
		if (d.length < 6) return;
		var target = new Date(d[0] + '/' + d[1] + '/' + d[2] + ' ' + d[3] + ':' + d[4] + ':' + d[5]).getTime();
		var pad = function (n) { return (n < 10 ? '0' : '') + n; };
		function tick() {
			var secs = Math.floor((target - Date.now()) / 1000);
			if (secs < 0) {
				el.innerHTML = '<div class="lof-labelexpired"> Chương trình đã hết hạn</div>';
				return;
			}
			el.innerHTML =
				'<div class="block-timer"><p><b>' + pad(Math.floor(secs / 86400)) + '</b></p><span>Ngày</span></div>' +
				'<div class="block-timer"><p><b>' + pad(Math.floor(secs / 3600) % 24) + '</b></p><span>Giờ</span></div>' +
				'<div class="block-timer"><p><b>' + pad(Math.floor(secs / 60) % 60) + '</b></p><span>Phút</span></div>' +
				'<div class="block-timer"><p><b>' + pad(secs % 60) + '</b></p><span>Giây</span></div>';
			setTimeout(tick, 990);
		}
		tick();
	});
})();
