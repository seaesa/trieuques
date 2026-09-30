/* Product page: gallery + lightbox, variants, add to cart / buy now, description tabs,
 * recently viewed, coupon and related-product carousels. */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
	var dataTag = $('#product-json');
	var product = dataTag ? JSON.parse(dataTag.textContent) : null;
	var money = function (v) { return window.tqMoney ? window.tqMoney(v) : v; };

	/* ---------- Gallery (vertical thumbs from 768px) ---------- */
	var galleryTop = null;
	(function gallery() {
		var thumbsEl = $('.gallery-thumbs'), topEl = $('.gallery-top');
		if (!topEl || !window.tqSwiper) return;
		var thumbs = thumbsEl ? window.tqSwiper(thumbsEl, {
			spaceBetween: 5, slidesPerView: 10, freeMode: true, watchSlidesProgress: true, slideToClickedSlide: true,
			breakpoints: {
				260: { slidesPerView: 3, spaceBetween: 10 }, 300: { slidesPerView: 4, spaceBetween: 10 }, 500: { slidesPerView: 4, spaceBetween: 10 },
				640: { slidesPerView: 4, spaceBetween: 10 }, 768: { slidesPerView: 5, spaceBetween: 10, direction: 'vertical' },
				992: { slidesPerView: 4, spaceBetween: 10, direction: 'vertical' }, 1024: { slidesPerView: 4, spaceBetween: 10, direction: 'vertical' },
				1199: { slidesPerView: 4, spaceBetween: 10, direction: 'vertical' }
			},
			navigation: { nextEl: '.gallery-thumbs .swiper-button-next', prevEl: '.gallery-thumbs .swiper-button-prev' }
		}) : null;
		var start = /^#\d+$/.test(location.hash) ? +location.hash.slice(1) : 0;
		galleryTop = window.tqSwiper(topEl, { spaceBetween: 0, initialSlide: start, thumbs: thumbs ? { swiper: thumbs } : undefined });
	})();

	/* ---------- Lightbox (lightGallery look: toolbar, zoom, rotate, share, autoplay, hash) ---------- */
	(function lightbox() {
		var links = $$('#lightgallery > a');
		if (!links.length) return;
		var slides = links.map(function (a) { return { src: a.getAttribute('href'), caption: a.getAttribute('title') || '' }; });
		var outer, backdrop, index, scale, rotate, flipH, flipV, autoplayTimer, hideTimer;

		function btn(cls, label, extra) { return '<button type="button" aria-label="' + label + '" ' + (extra || '') + ' class="' + cls + '"></button>'; }
		function shareUrl() { return encodeURIComponent(location.href.split('#')[0] + '#lg=1&slide=' + index); }

		function build() {
			backdrop = document.createElement('div');
			backdrop.className = 'lg-backdrop';
			backdrop.style.transitionDuration = '150ms';
			outer = document.createElement('div');
			outer.className = 'lg-outer lg-start-zoom lg-use-css3 lg-css3 lg-slide lg-grab lg-show-after-load lg-use-transition-for-zoom';
			outer.setAttribute('tabindex', '-1'); outer.setAttribute('role', 'dialog'); outer.setAttribute('aria-modal', 'true');
			outer.innerHTML = '<div class="lg" style="width:100%; height:100%"><div class="lg-inner" style="transition-timing-function: ease; transition-duration: 600ms;">' +
				slides.map(function () { return '<div class="lg-item"></div>'; }).join('') + '</div>' +
				'<div class="lg-toolbar lg-group">' + btn('lg-close lg-icon', 'Close gallery') +
				'<a id="lg-download" aria-label="Download" target="_blank" download class="lg-download lg-icon"></a>' +
				btn('lg-autoplay-button lg-icon', 'Toggle autoplay') + btn('lg-fullscreen lg-icon', 'Toggle fullscreen') +
				'<button type="button" aria-label="Zoom in" id="lg-zoom-in" class="lg-icon"></button>' +
				'<button type="button" aria-label="Zoom out" id="lg-zoom-out" class="lg-icon"></button>' +
				'<button type="button" aria-label="Actual size" id="lg-actual-size" class="lg-icon"></button>' +
				'<button type="button" aria-label="Share" id="lg-share" class="lg-icon" aria-haspopup="true" aria-expanded="false"><ul class="lg-dropdown" style="position: absolute;">' +
				'<li><a id="lg-share-facebook" target="_blank"><span class="lg-icon"></span><span class="lg-dropdown-text">Facebook</span></a></li>' +
				'<li><a id="lg-share-twitter" target="_blank"><span class="lg-icon"></span><span class="lg-dropdown-text">Twitter</span></a></li>' +
				'<li><a id="lg-share-googleplus" target="_blank"><span class="lg-icon"></span><span class="lg-dropdown-text">GooglePlus</span></a></li>' +
				'<li><a id="lg-share-pinterest" target="_blank"><span class="lg-icon"></span><span class="lg-dropdown-text">Pinterest</span></a></li></ul></button>' +
				'<button aria-label="Flip vertical" class="lg-flip-ver lg-icon"></button><button aria-label="flip horizontal" class="lg-flip-hor lg-icon"></button>' +
				'<button aria-label="Rotate left" class="lg-rotate-left lg-icon"></button><button aria-label="Rotate right" class="lg-rotate-right lg-icon"></button>' +
				'<div id="lg-counter" role="status" aria-live="polite"><span id="lg-counter-current">1</span> / <span id="lg-counter-all">' + slides.length + '</span></div></div>' +
				'<div class="lg-actions">' + btn('lg-prev lg-icon', 'Previous slide') + btn('lg-next lg-icon', 'Next slide') + '</div>' +
				'<div role="status" aria-live="polite" class="lg-sub-html"></div>' +
				'<div class="lg-progress-bar"><div class="lg-progress"></div></div><div id="lg-dropdown-overlay"></div></div>';
			document.body.appendChild(backdrop);
			document.body.appendChild(outer);
			outer.addEventListener('click', onClick);
			outer.addEventListener('mousemove', wake);
			dragSupport();
		}

		function item(i) { return $$('.lg-item', outer)[i]; }
		function load(i) {
			var el = item(i);
			if (!el || el.classList.contains('lg-loaded')) return;
			el.classList.add('lg-loaded');
			el.innerHTML = '<div class="lg-img-rotate"><div class="lg-img-wrap"><img class="lg-object lg-image" alt="' + slides[i].caption + '" src="' + slides[i].src + '"></div></div>';
			var img = $('img', el);
			var done = function () { el.classList.add('lg-complete', 'lg-zoomable'); };
			if (img.complete) done(); else img.addEventListener('load', done);
		}

		function applyTransform() {
			var el = item(index);
			if (!el) return;
			var rot = $('.lg-img-rotate', el), img = $('.lg-image', el);
			if (rot) { rot.style.transform = 'rotate(' + rotate + 'deg)'; rot.style.transition = 'transform .4s cubic-bezier(0,0,.25,1)'; }
			if (img) { img.style.transformOrigin = '50% 50%'; img.style.transform = 'scale3d(' + (scale * (flipH ? -1 : 1)) + ', ' + (scale * (flipV ? -1 : 1)) + ', 1)'; }
			outer.classList.toggle('lg-zoomed', scale > 1);
		}

		function go(i, animate) {
			var n = slides.length;
			i = (i + n) % n;
			var prev = (i - 1 + n) % n, next = (i + 1) % n;
			$$('.lg-item', outer).forEach(function (el, k) {
				el.classList.toggle('lg-current', k === i);
				el.classList.toggle('lg-prev-slide', k === prev && n > 1);
				el.classList.toggle('lg-next-slide', k === next && n > 1);
			});
			if (!animate) outer.classList.add('lg-no-trans');
			index = i; scale = 1; rotate = 0; flipH = flipV = false;
			[i, prev, next].forEach(load);
			$$('.lg-image', outer).forEach(function (img) { img.style.transform = ''; });
			$$('.lg-img-rotate', outer).forEach(function (el) { el.style.transform = ''; });
			outer.classList.remove('lg-zoomed');
			$('#lg-counter-current', outer).textContent = i + 1;
			$('.lg-sub-html', outer).textContent = slides[i].caption;
			$('#lg-download', outer).setAttribute('href', slides[i].src);
			$('#lg-share-facebook', outer).href = 'https://www.facebook.com/sharer/sharer.php?u=' + shareUrl();
			$('#lg-share-twitter', outer).href = 'https://twitter.com/intent/tweet?text=undefined&url=' + shareUrl();
			$('#lg-share-googleplus', outer).href = 'https://plus.google.com/share?url=' + shareUrl();
			$('#lg-share-pinterest', outer).href = 'http://www.pinterest.com/pin/create/button/?url=' + shareUrl() + '&media=' + encodeURIComponent(slides[i].src) + '&description=undefined';
			history.replaceState(null, '', location.pathname + location.search + '#lg=1&slide=' + i);
			if (!animate) setTimeout(function () { outer.classList.remove('lg-no-trans'); }, 50);
		}

		function wake() {
			outer.classList.remove('lg-hide-items');
			clearTimeout(hideTimer);
			hideTimer = setTimeout(function () { outer && outer.classList.add('lg-hide-items'); }, 6000);
		}

		function autoplay(on) {
			clearInterval(autoplayTimer);
			var bar = $('.lg-progress-bar', outer), prog = $('.lg-progress', outer);
			outer.classList.toggle('lg-show-autoplay', on);
			if (!on) { bar.classList.remove('lg-start'); prog.style.transition = ''; return; }
			var restart = function () {
				bar.classList.remove('lg-start'); prog.style.transition = 'none'; void prog.offsetWidth;
				prog.style.transition = 'width 5000ms ease 0s'; bar.classList.add('lg-start');
			};
			restart();
			autoplayTimer = setInterval(function () { go(index + 1, true); restart(); }, 5000);
		}

		function open(i) {
			if (!outer) build();
			document.body.classList.add('lg-on');
			go(i, false);
			requestAnimationFrame(function () { backdrop.classList.add('in'); outer.classList.add('lg-visible'); });
			outer.focus();
			wake();
		}

		function close() {
			autoplay(false);
			if (document.fullscreenElement) document.exitFullscreen();
			backdrop.classList.remove('in');
			outer.classList.remove('lg-visible');
			document.body.classList.remove('lg-on');
			history.replaceState(null, '', location.pathname + location.search);
			setTimeout(function () { outer.remove(); backdrop.remove(); outer = backdrop = null; }, 150);
		}

		function onClick(e) {
			var t = e.target;
			var dropdownOpen = outer.classList.contains('lg-dropdown-active');
			if (t.closest('.lg-close')) return close();
			if (t.closest('.lg-prev')) return go(index - 1, true);
			if (t.closest('.lg-next')) return go(index + 1, true);
			if (t.closest('.lg-autoplay-button')) return autoplay(!outer.classList.contains('lg-show-autoplay'));
			if (t.closest('.lg-fullscreen')) {
				if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
				return;
			}
			if (t.closest('#lg-zoom-in')) { scale += 1; return applyTransform(); }
			if (t.closest('#lg-zoom-out')) { scale = Math.max(1, scale - 1); return applyTransform(); }
			if (t.closest('#lg-actual-size')) {
				var img = $('.lg-current .lg-image', outer);
				if (img) scale = scale > 1 ? 1 : Math.max(1, img.naturalWidth / img.getBoundingClientRect().width * scale);
				return applyTransform();
			}
			if (t.closest('.lg-rotate-left')) { rotate -= 90; return applyTransform(); }
			if (t.closest('.lg-rotate-right')) { rotate += 90; return applyTransform(); }
			if (t.closest('.lg-flip-hor')) { flipH = !flipH; return applyTransform(); }
			if (t.closest('.lg-flip-ver')) { flipV = !flipV; return applyTransform(); }
			if (t.closest('.lg-dropdown a')) return;
			if (t.closest('#lg-share')) { outer.classList.toggle('lg-dropdown-active'); return; }
			if (dropdownOpen && t.closest('#lg-dropdown-overlay')) { outer.classList.remove('lg-dropdown-active'); return; }
			if (t.classList.contains('lg-item') || t.classList.contains('lg-img-wrap')) close();
		}

		function dragSupport() {
			var startX = null, inner = $('.lg-inner', outer);
			inner.addEventListener('pointerdown', function (e) {
				if (scale > 1) return;
				startX = e.clientX; outer.classList.add('lg-grabbing');
			});
			window.addEventListener('pointerup', function (e) {
				if (startX === null || !outer) return;
				var dx = e.clientX - startX; startX = null; outer.classList.remove('lg-grabbing');
				if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1), true);
			});
		}

		document.addEventListener('keydown', function (e) {
			if (!outer || !outer.classList.contains('lg-visible')) return;
			if (e.key === 'Escape') close();
			else if (e.key === 'ArrowRight') go(index + 1, true);
			else if (e.key === 'ArrowLeft') go(index - 1, true);
		});
		document.addEventListener('fullscreenchange', function () { if (outer) outer.classList.toggle('lg-fullscreen-on', !!document.fullscreenElement); });

		links.forEach(function (a, i) {
			a.addEventListener('click', function (e) { e.preventDefault(); open(i); });
		});
		var m = location.hash.match(/lg=1&slide=(\d+)/);
		if (m) open(+m[1]);
	})();

	/* ---------- Variants (selectCallback) ---------- */
	function selectedVariant() {
		if (!product) return null;
		var chosen = $$('.details-pro .swatch').map(function (sw) { var c = $('input:checked', sw); return c ? c.value : null; });
		return product.variants.filter(function (v) {
			return chosen.every(function (val, i) { return val === null || v.options[i] === val; });
		})[0] || null;
	}

	function show(els, on) { els.forEach(function (el) { el.style.display = on ? '' : 'none'; }); }

	function selectCallback(variant) {
		var addToCart = $$('.form-product .btn-cart.normal_button'), buyNow = $$('.form-product .btn-buyNow');
		var form = $$('.form-product .boz-form'), price = $$('.details-pro .special-price .product-price');
		var qty = $$('.inventory_quantity .a-stock'), comparePrice = $$('.details-pro .old-price .product-price-old');
		var compareText = $$('.details-pro .old-price'), savePrice = $$('.details-pro .save-price .product-price-save');
		var saveText = $$('.details-pro .save-price'), qtyBtn = $$('.form-product .custom-btn-number');
		var sold = $$('.form-product .form-group .btn-mua'), sku = $$('.details-product .sku-product .variant-sku'), saleOff = $$('.sale-off');
		var html = function (els, h) { els.forEach(function (el) { el.innerHTML = h; }); };
		var cls = function (els, c, on) { els.forEach(function (el) { el.classList.toggle(c, on); }); };

		html(sku, variant && variant.sku ? "Mã: <span class='a-sku'>" + variant.sku + '</span>' : 'Mã: <span class="a-sku">Đang cập nhật</span>');
		cls(buyNow, 'd-none', true);
		var contact = function () {
			html(price, 'Liên hệ'); show(comparePrice, false); show(savePrice, false); show(compareText, false);
			show(saleOff, false); show(saveText, false); cls(form, 'd-none', true);
		};
		var comparison = function () {
			if (variant.compare_at_price > variant.price) {
				html(comparePrice, money(variant.compare_at_price)); show(comparePrice, true);
				html(savePrice, money(variant.compare_at_price - variant.price)); show(savePrice, true);
				show(compareText, true); show(saveText, true);
				html(saleOff, '-' + Math.round((variant.compare_at_price - variant.price) / variant.compare_at_price * 100) + '%'); show(saleOff, true);
			} else {
				show(comparePrice, false); show(savePrice, false); show(compareText, false); show(saveText, false); show(saleOff, false);
			}
		};
		if (variant && variant.available) {
			var inStock = variant.inventory_management !== 'bizweb' || variant.inventory_quantity !== 0 || variant.inventory_policy === 'continue';
			qty.forEach(function (el) { el.outerHTML = inStock ? '<span class="a-stock">Còn hàng</span>' : '<span class="a-stock a-stock-out">Hết hàng</span>'; });
			cls(buyNow, 'd-none', false);
			addToCart.forEach(function (b) { b.innerHTML = '<span class="txt-main">Thêm vào giỏ</span>'; b.removeAttribute('disabled'); });
			cls(sold, 'btnsold', false); cls(qtyBtn, 'd-none', false);
			if (variant.price === 0) contact();
			else { cls(form, 'd-none', false); html(price, money(variant.price)); comparison(); }
		} else {
			qty.forEach(function (el) { el.outerHTML = '<span class="a-stock a-stock-out">Hết hàng</span>'; });
			addToCart.forEach(function (b) { b.innerHTML = '<span class="txt-main">Hết hàng</span>'; b.setAttribute('disabled', 'disabled'); });
			cls(sold, 'btnsold', true); cls(qtyBtn, 'd-none', true);
			if (variant && variant.price !== 0) { cls(form, 'd-none', false); html(price, money(variant.price)); comparison(); }
			else contact();
		}
		/* variant image: move the gallery to the matching thumbnail */
		if (variant && variant.image && galleryTop) {
			var src = variant.image.src.split('?')[0];
			$$('.gallery-thumbs .swiper-slide').forEach(function (slide) {
				var img = $('img', slide);
				if (img && (img.getAttribute('data-image') || '').split('?')[0] === src) galleryTop.slideTo(+slide.getAttribute('data-hash'), 1000, false);
			});
		}
		var select = $('#product-selectors');
		if (variant && select) select.value = variant.id;
	}

	if (product) {
		$$('.details-pro .swatch :is(input[type=radio])').forEach(function (radio) {
			radio.addEventListener('change', function () {
				var sw = radio.closest('.swatch');
				var label = $('.header .value-roperties', sw);
				if (label) label.textContent = radio.value;
				var v = selectedVariant();
				selectCallback(v);
				if (v) history.replaceState(null, '', location.pathname + '?variantid=' + v.id + location.hash);
			});
		});
		var fromUrl = (location.search.match(/[?&]variantid=(\d+)/i) || [])[1];
		var initial = fromUrl && product.variants.filter(function (v) { return String(v.id) === fromUrl; })[0];
		if (initial) {
			initial.options.forEach(function (val, i) {
				$$('.details-pro .swatch[data-option-index="' + i + '"] input').forEach(function (r) { r.checked = r.value === val; });
			});
		}
		selectCallback(initial || selectedVariant() || product.variants[0]);
		setTimeout(function () {
			$$('.details-pro .swatch').forEach(function (sw) {
				var c = $('input:checked', sw), label = $('.header .value-roperties', sw);
				if (c && label) label.textContent = c.value;
			});
		}, 500);
	}

	/* ---------- Add to cart / buy now ---------- */
	var cartForm = $('#add-to-cart-form');
	function addFromForm() {
		var v = selectedVariant() || product.variants[0];
		var q = $('#qtym');
		return window.tqCart.add(product, v, q ? q.value : 1);
	}
	if (cartForm && product) {
		cartForm.addEventListener('submit', function (e) { e.preventDefault(); addFromForm(); });
		$$('.btn-buyNow', cartForm).forEach(function (b) {
			b.addEventListener('click', function (e) { e.preventDefault(); addFromForm(); window.location.href = '/checkout'; });
		});
	}

	/* ---------- Description tabs + "Xem thêm" ---------- */
	$$('.product-tab ul li').forEach(function (li) {
		li.addEventListener('click', function (e) {
			e.preventDefault();
			$$('.product-tab ul li').forEach(function (x) { x.classList.remove('active'); });
			li.classList.add('active');
			$$('.tab-content').forEach(function (c) { c.classList.remove('active'); });
			var target = $(li.getAttribute('data-tab'));
			if (target) target.classList.add('active');
		});
	});
	$$('.btn--view-more').forEach(function (btn) {
		btn.addEventListener('click', function (e) {
			e.preventDefault();
			var content = $('.product-review-details .product-review-content');
			if (content.classList.contains('expanded')) {
				var top = $('.product-review-details').getBoundingClientRect().top + window.pageYOffset - 110;
				window.smoothScrollTo ? window.smoothScrollTo(top, 600) : window.scrollTo({ top: top, behavior: 'smooth' });
			}
			content.classList.toggle('expanded');
			btn.classList.toggle('active');
		});
	});

	/* ---------- Recently viewed (localStorage last_viewed_products, max 6) ---------- */
	var hasViewItem = false;
	(function recentlyViewed() {
		var box = $('.recent-page-viewed');
		var list = [];
		try { list = JSON.parse(localStorage.getItem('last_viewed_products') || 'null') || []; } catch (e) { list = []; }
		var shown = list.slice(0, 6).filter(function (x) { return x && x.alias; });
		if (box && shown.length) {
			box.classList.remove('d-none');
			hasViewItem = true;
			fetch('/data/search.json').then(function (r) { return r.json(); }).then(function (all) {
				var byUrl = {};
				all.forEach(function (p) { byUrl[p.url] = p; });
				$('.product-viewed-content', box).innerHTML = shown.map(function (x) {
					var p = byUrl['/' + x.alias];
					if (!p) return '';
					return '<div class="product-view"><a class="image_thumb" href="' + p.url + '" title="' + p.name + '"><img width="370" height="480" src="' + p.image + '" alt="' + p.name + '"></a>' +
						'<div class="product-info"><h3 class="product-name"><a href="' + p.url + '" title="' + p.name + '" class="line-clamp line-clamp-3-new">' + p.name + '</a></h3>' +
						'<div class="price-box"> ' + p.price + ' </div><a class="view-more" href="' + p.url + '" title="Xem chi tiết">Xem chi tiết »</a></div></div>';
				}).join('');
			});
		}
		if (product) {
			list = list.filter(function (x) { return x && x.alias !== product.alias; }).slice(0, 5);
			list.unshift({ id: product.id, alias: product.alias, name: product.name });
			try { localStorage.setItem('last_viewed_products', JSON.stringify(list)); } catch (e) {}
		}
	})();
	(function sidebarLayout() {
		var side = $('.product-sidebar'), details = $('.product-review-details');
		var hasSpecifications = !!(side && $('.specifications', side));
		if (!hasSpecifications && !hasViewItem && side && details) {
			side.classList.add('hidden');
			details.classList.remove('col-lg-8');
			details.classList.add('col-lg-12');
		}
	})();

	/* ---------- Coupon + related carousels (native scroll at ≤767px) ---------- */
	function responsiveSwiper(selector, options) {
		var el = $(selector), instance = null;
		if (!el || !window.tqSwiper) return;
		function toggle() {
			var small = window.innerWidth <= 767;
			if (small && instance) { instance.destroy(true, true); instance = null; }
			else if (!small && !instance) instance = window.tqSwiper(el, options);
		}
		toggle();
		window.addEventListener('resize', toggle);
	}
	responsiveSwiper('.product-coupons .swiper_coupons', {
		slidesPerView: 4, spaceBetween: 16, watchOverflow: true, slidesPerGroup: 1,
		navigation: { nextEl: '.swiper_coupons .swiper-button-next', prevEl: '.swiper_coupons .swiper-button-prev' },
		breakpoints: { 640: { slidesPerView: 2, spaceBetween: 14 }, 768: { slidesPerView: 2.3, spaceBetween: 14 }, 992: { slidesPerView: 2.3, spaceBetween: 16 }, 1024: { slidesPerView: 3, spaceBetween: 16 }, 1200: { slidesPerView: 4, spaceBetween: 16 } }
	});
	responsiveSwiper('.swiper_product_related', {
		slidesPerView: 4, spaceBetween: 20, slidesPerGroup: 1,
		navigation: { nextEl: '.swiper_product_related .swiper-button-next', prevEl: '.swiper_product_related .swiper-button-prev' },
		breakpoints: { 768: { slidesPerView: 4, spaceBetween: 20 }, 992: { slidesPerView: 4, spaceBetween: 20 }, 1024: { slidesPerView: 4, spaceBetween: 20 } }
	});
})();
