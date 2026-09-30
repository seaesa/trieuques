/* Cart (stored in localStorage) rendered into the theme's cart containers with the same markup
 * as the original ajaxCart templates, plus the add-to-cart popup and the desktop quick view. */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
	var KEY = 'tq_cart';
	var emptyMessage = ($('.cart--empty-message') || {}).outerHTML || '<div class="cart--empty-message"><p>Giỏ hàng của bạn đang trống</p></div>';
	var isUpdating = false;

	function money(v) { return Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '₫'; }
	function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
	function read() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
	function write(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }

	function cart() {
		var items = read();
		return {
			items: items,
			item_count: items.reduce(function (s, it) { return s + it.quantity; }, 0),
			total_price: items.reduce(function (s, it) { return s + it.price * it.quantity; }, 0)
		};
	}

	/* ---------- Templates (ajaxCart: SideCart, Cart, CartHeader, CartPopup, CartMobile) ---------- */
	function qtyBox(it, line) {
		return '<div class="ajaxcart__qty input-group-btn">' +
			'<button type="button" class="ajaxcart__qty-adjust ajaxcart__qty--minus items-count" data-id="' + it.key + '" data-qty="' + (it.quantity - 1) + '" data-line="' + line + '" aria-label="-"> - </button>' +
			'<input type="text" name="updates[]" class="ajaxcart__qty-num number-sidebar" maxlength="3" value="' + it.quantity + '" min="0" data-id="' + it.key + '" data-line="' + line + '" aria-label="quantity" pattern="[0-9]*">' +
			'<button type="button" class="ajaxcart__qty-adjust ajaxcart__qty--plus items-count" data-id="' + it.key + '" data-line="' + line + '" data-qty="' + (it.quantity + 1) + '" aria-label="+"> + </button>' +
			'</div>';
	}
	function head(it, clamp, removeText) {
		var name = esc(it.title);
		return '<a href="' + it.url + '" class="ajaxcart__product-image cart_image" title="' + name + '"><img width="80" height="80" src="' + it.image + '" alt="' + name + '"></a>' +
			'<div class="grid__item cart_info"><div class="ajaxcart__product-name-wrapper cart_name">' +
			'<a href="' + it.url + '" class="ajaxcart__product-name h4' + (clamp ? ' line-clamp line-clamp-2-new' : '') + '" title="' + name + '">' + name + '</a>' +
			(it.variant_title ? '<span class="ajaxcart__product-meta variant-title">' + esc(it.variant_title) + '</span>' : '') +
			(removeText !== null ? '<a title="Xóa" class="cart__btn-remove remove-item-cart ajaxifyCart--remove" href="javascript:;" data-line="' + it.line + '">' + removeText + '</a>' : '') +
			'</div>';
	}
	function row(inner, line) {
		return '<div class="ajaxcart__row"><div class="ajaxcart__product cart_product" data-line="' + line + '">' + inner + '</div></div></div>';
	}
	var checkoutBtn = '<div class="cart__btn-proceed-checkout-dt"><button onclick="location.href=\'/checkout\'" type="button" class="button btn btn-primary cart__btn-proceed-checkout" id="btn-proceed-checkout" title="Thanh toán">Thanh toán</button></div>';
	function subtotal(c) {
		return '<div class="ajaxcart__subtotal"><div class="cart__subtotal"><div class="cart__col-6">Tổng tiền:</div><div class="text-right cart__totle"><span class="total-price">' + money(c.total_price) + '</span></div></div></div>';
	}
	var headerInfo = '<div class="cart-header-info"><div>Thông tin sản phẩm</div><div>Đơn giá</div><div>Số lượng</div><div>Thành tiền</div></div>';

	var templates = {
		side: function (c) {
			return '<form action="/cart" method="post" novalidate class="cart ajaxcart"><div class="ajaxcart__inner ajaxcart__inner--has-fixed-footer cart_body items">' +
				c.items.map(function (it) {
					return row(head(it, false, null) + '<div class="grid"><div class="grid__item one-half cart_select cart_item_name"><label class="cart_quantity">Số lượng</label>' + qtyBox(it, it.line) + '</div>' +
						'<div class="grid__item one-half text-right cart_prices"><span class="cart-price">' + money(it.price) + '</span><a title="Xóa" class="cart__btn-remove remove-item-cart ajaxifyCart--remove" href="javascript:;" data-line="' + it.line + '">Xóa</a></div></div>', it.line);
				}).join('') +
				'</div><div class="ajaxcart__footer ajaxcart__footer--fixed cart-footer">' + subtotal(c) + checkoutBtn + '</div></form>';
		},
		page: function (c) {
			return '<form action="/cart" method="post" novalidate class="cart ajaxcart cartpage">' + headerInfo + '<div class="ajaxcart__inner ajaxcart__inner--has-fixed-footer cart_body items">' +
				c.items.map(function (it) {
					return row(head(it, true, 'Xóa') + '<div class="grid"><div class="grid__item one-half text-right cart_prices"><span class="cart-price">' + money(it.price) + '</span></div></div>' +
						'<div class="grid"><div class="grid__item one-half cart_select">' + qtyBox(it, it.line) + '</div></div>' +
						'<div class="grid justify-right"><div class="grid__item one-half text-right cart_prices"><span class="cart-price">' + money(it.price * it.quantity) + '</span></div></div>', it.line);
				}).join('') + '</div></form>';
		},
		header: function (c) {
			return '<form action="/cart" method="post" novalidate class="cart ajaxcart cartheader"><div class="title_cart_hea" onclick="window.location.href=\'/cart\'">Giỏ hàng</div>' +
				'<div class="ajaxcart__inner ajaxcart__inner--has-fixed-footer cart_body items">' +
				c.items.map(function (it) {
					return row(head(it, true, '') + '<div class="grid"><div class="grid__item one-half cart_select cart_item_name">' + qtyBox(it, it.line) + '</div>' +
						'<div class="grid__item one-half text-right cart_prices"><span class="cart-price">' + money(it.price) + '</span></div></div>', it.line);
				}).join('') +
				'</div><div class="ajaxcart__footer ajaxcart__footer--fixed cart-footer">' + subtotal(c) + checkoutBtn.replace('cart__btn-proceed-checkout-dt', 'cart__btn-proceed-checkout-dt ') + '</div></form>';
		},
		popup: function (c) {
			return '<form action="/cart" method="post" novalidate class="cart ajaxcart cartpopup">' + headerInfo + '<div class="ajaxcart__inner ajaxcart__inner--has-fixed-footer cart_body items">' +
				c.items.map(function (it) {
					return row(head(it, true, 'Xóa') + '<div class="grid"><div class="grid__item one-half text-right cart_prices"><span class="cart-price">' + money(it.price) + '</span></div></div>' +
						'<div class="grid"><div class="grid__item one-half cart_select">' + qtyBox(it, it.line) + '</div></div>' +
						'<div class="grid"><div class="grid__item one-half text-right cart_prices"><span class="cart-price">' + money(it.price * it.quantity) + '</span></div></div>', it.line);
				}).join('') +
				'</div><div class="ajaxcart__footer ajaxcart__footer--fixed cart-footer"><div class="row"><div class="col-lg-4 col-12 offset-md-8 offset-lg-8 offset-xl-8">' +
				subtotal(c) + checkoutBtn + '</div></div></div></form>';
		},
		mobile: function (c) {
			return '<form action="/cart" method="post" novalidate class="cart ajaxcart cart-mobile"><div class="ajaxcart__inner ajaxcart__inner--has-fixed-footer cart_body">' +
				c.items.map(function (it) {
					return row(head(it, true, null) + '<div class="grid"><div class="grid__item one-half cart_select cart_item_name">' + qtyBox(it, it.line) + '</div>' +
						'<div class="grid__item one-half text-right cart_prices"><span class="cart-price">' + money(it.price) + '</span><a title="Xóa" class="cart__btn-remove remove-item-cart ajaxifyCart--remove" href="javascript:;" data-line="' + it.line + '">Xóa</a></div></div>', it.line);
				}).join('') + '</div></form>';
		},
		footer: function (c) {
			return '<div class="content-items"><div class="item-content-left">Tổng tiền</div><div class="item-content-right"><span class="total-price">' + money(c.total_price) + '</span></div></div>';
		}
	};

	var CONTAINERS = '.CartSideContainer, .CartPageContainer, .CartHeaderContainer, .cartPopupContainer, .CartMobileContainer';

	function updateCount(c) {
		$$('.count_item_pr').forEach(function (el) {
			el.textContent = c.item_count;
			el.classList.toggle('hidden-count', c.item_count === 0);
		});
	}

	function build() {
		var c = cart(), wW = window.innerWidth;
		c.items.forEach(function (it, i) { it.line = i + 1; });
		var keep = {};
		['.CartHeaderContainer', '.cartPopupContainer', '.CartSideContainer'].forEach(function (s) {
			var inner = $(s + ' .ajaxcart__inner');
			keep[s] = inner ? inner.scrollTop : 0;
		});
		$$(CONTAINERS).forEach(function (el) { el.innerHTML = ''; });
		updateCount(c);
		if (c.item_count === 0) {
			$$(CONTAINERS).forEach(function (el) { el.innerHTML = emptyMessage; });
			$$('.main-cart-page').forEach(function (el) { el.classList.add('is-empty'); });
			document.dispatchEvent(new CustomEvent('tq:cart', { detail: c }));
			return;
		}
		$$('.col-cart-right .ajaxcart__footer .summary-total').forEach(function (el) { el.innerHTML = templates.footer(c); });
		if (wW < 1199) $$('.CartMobileContainer').forEach(function (el) { el.innerHTML = templates.mobile(c); });
		if (wW > 992) $$('.CartHeaderContainer').forEach(function (el) { el.innerHTML = templates.header(c); });
		if (wW > 1200) {
			$$('.CartPageContainer').forEach(function (el) { el.innerHTML = templates.page(c); });
			$$('.cartPopupContainer').forEach(function (el) { el.innerHTML = templates.popup(c); });
		}
		$$('.main-cart-page').forEach(function (el) { el.classList.remove('is-empty'); });
		$$('.CartSideContainer').forEach(function (el) { el.innerHTML = templates.side(c); });
		Object.keys(keep).forEach(function (s) { var inner = $(s + ' .ajaxcart__inner'); if (inner) inner.scrollTop = keep[s]; });
		document.dispatchEvent(new CustomEvent('tq:cart', { detail: c }));
	}

	function changeLine(line, qty) {
		var items = read();
		if (!items[line - 1]) return;
		if (qty <= 0) items.splice(line - 1, 1);
		else items[line - 1].quantity = qty;
		write(items);
	}

	function updateQuantity(line, qty) {
		isUpdating = true;
		var product = $$('.ajaxcart__product[data-line="' + line + '"]');
		product.forEach(function (el) { el.classList.add('is-loading'); if (qty === 0) el.parentNode.classList.add('is-removed'); });
		setTimeout(function () {
			changeLine(line, qty);
			updateCount(cart());
			setTimeout(function () { isUpdating = false; build(); }, 150);
		}, 10);
	}

	/* Delegated quantity / remove controls inside every cart container */
	document.addEventListener('click', function (e) {
		var btn = e.target.closest('.items-count');
		if (btn && btn.closest(CONTAINERS)) {
			if (isUpdating) return;
			var input = btn.parentNode.querySelector('.number-sidebar');
			var qty = parseInt((input.value || '').replace(/\D/g, ''), 10) || 0;
			qty = btn.classList.contains('ajaxcart__qty--plus') ? qty + 1 : Math.max(0, qty - 1);
			var line = +btn.getAttribute('data-line');
			if (line) updateQuantity(line, qty); else input.value = qty;
			return;
		}
		var rm = e.target.closest('.remove-item-cart');
		if (rm && rm.closest(CONTAINERS)) {
			var l = +rm.getAttribute('data-line');
			if (l) updateQuantity(l, 0);
		}
	});
	document.addEventListener('change', function (e) {
		var input = e.target.closest('.number-sidebar');
		if (!input || !input.closest(CONTAINERS) || isUpdating) return;
		var line = +input.getAttribute('data-line');
		if (line) updateQuantity(line, parseInt(input.value.replace(/\D/g, ''), 10) || 0);
	});
	document.addEventListener('focusin', function (e) {
		var input = e.target.closest('.number-sidebar');
		if (input && input.closest(CONTAINERS)) input.setSelectionRange(0, input.value.length);
	});

	/* ---------- Adding items ---------- */
	function lineItem(product, variant, qty) {
		var title = variant.title === 'Default Title' ? '' : variant.title;
		var image = (variant.image && variant.image.src) || (product.featured_image && (product.featured_image.src || product.featured_image)) || '';
		return {
			key: variant.id, variant_id: variant.id, product_id: product.id, title: product.name, variant_title: title,
			price: variant.price || 0, quantity: qty, image: image, url: '/' + product.alias
		};
	}

	function add(product, variant, qty) {
		qty = Math.max(1, parseInt(qty, 10) || 1);
		var items = read(), item = lineItem(product, variant, qty);
		var found = items.filter(function (it) { return it.variant_id === variant.id; })[0];
		if (found) found.quantity += qty; else items.push(item);
		write(items);
		build();
		$$('.cart-popup-name').forEach(function (a) { a.textContent = item.title; a.setAttribute('href', item.url); });
		showAdded(item);
		return item;
	}

	function showAdded(item) {
		var body = $('.bodycart-mobile');
		if (body) {
			body.innerHTML = '<div class="thumb-1x1"><img src="' + item.image + '" alt="' + esc(item.title) + '"></div>' +
				'<div class="body_content"><h4 class="product-title"><a href="' + item.url + '" title="' + esc(item.title) + '">' + esc(item.title) + '</a></h4>' +
				'<span class="variant">' + esc(item.variant_title) + '</span><div class="product-new-price"><b>' + money(item.price) + '</b></div></div>';
		}
		$$('.popup-cart-mobile, .backdrop__body-backdrop___1rvky').forEach(function (el) { el.classList.add('active'); });
	}

	document.addEventListener('click', function (e) {
		if (e.target.closest('.backdrop__body-backdrop___1rvky, .cart_btn-close')) {
			$$('.backdrop__body-backdrop___1rvky, .cart-sidebar, #popup-cart-desktop, .popup-cart-mobile').forEach(function (el) { el.classList.remove('active'); });
		}
	});

	var productCache = {};
	function getProduct(handle) {
		if (!productCache[handle]) {
			productCache[handle] = fetch('/data/p/' + encodeURIComponent(handle) + '.json').then(function (r) { return r.json(); });
		}
		return productCache[handle];
	}

	/* Product cards: single-variant "add to cart" buttons submit their form */
	document.addEventListener('click', function (e) {
		var btn = e.target.closest('.item_product_main .add_to_cart');
		if (!btn) return;
		e.preventDefault();
		var form = btn.closest('form');
		var link = form && form.querySelector('.product-name a');
		var idField = form && form.querySelector('[name=variantId]');
		if (!link || !idField) return;
		var handle = link.getAttribute('href').replace(/^\/|\/$/g, '');
		getProduct(handle).then(function (p) {
			var v = p.variants.filter(function (x) { return String(x.id) === idField.value; })[0] || p.variants[0];
			add(p, v, 1);
		});
	});

	/* ---------- Quick view (desktop > 1025px, as in the original) ---------- */
	var qv = $('#quick-view-product');
	var qvTemplate = qv ? ($('#quickview-modal') || {}).innerHTML : '';

	function variantFor(p, box) {
		var chosen = $$('.swatch', box).map(function (sw) {
			var c = $('input:checked', sw); return c ? c.value : null;
		});
		return p.variants.filter(function (v) {
			return chosen.every(function (val, i) { return val === null || v.options[i] === val; });
		})[0];
	}

	function handleize(s) {
		return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	}

	function qvSelect(p, box, variant) {
		var price = $('.price', box), old = $('.old-price', box), qtyWrap = $('.quantity_wanted_p', box), form2 = $('.soluong1', box);
		var btn = $('.add_to_cart_detail', box), sku = $('.sku_', box), idSelect = $('select[name=variantId]', box) || $('input[name=variantId]', box);
		if (variant && idSelect) idSelect.value = variant.id;
		if (sku && variant) sku.textContent = variant.sku || 'Đang cập nhật';
		var show = function (el, on) { if (el) el.style.display = on ? '' : 'none'; };
		if (variant && variant.available) {
			if (btn) { btn.classList.remove('disabled'); btn.removeAttribute('disabled'); btn.innerHTML = '<span class="btn-content text_1">Thêm vào giỏ hàng</span>'; }
			if (variant.price < 1) {
				price.innerHTML = 'Liên hệ'; show(old, false); show(qtyWrap, false); show(form2, false);
			} else {
				price.innerHTML = money(variant.price);
				if (variant.compare_at_price > variant.price) { old.innerHTML = money(variant.compare_at_price); show(old, true); price.classList.add('on-sale'); }
				else { show(old, false); price.classList.remove('on-sale'); }
				show(qtyWrap, true); show(form2, true);
			}
		} else {
			if (btn) { btn.classList.add('disabled', 'btn_buy'); btn.setAttribute('disabled', 'disabled'); btn.innerHTML = '<div class="disabled">Hết hàng</div>'; }
			show(qtyWrap, true);
			price.innerHTML = variant && variant.price >= 1 ? money(variant.price) : 'Liên hệ';
			show(old, false); show(form2, false);
		}
		var img = variant && variant.image && variant.image.src;
		if (img) $('#product-featured-image-quickview', box).setAttribute('src', img);
	}

	function openQuickView(handle) {
		getProduct(handle).then(function (p) {
			var box = $('.quick-view-product', qv);
			box.innerHTML = qvTemplate;
			var featured = (p.featured_image && (p.featured_image.src || p.featured_image)) || '';
			$('.view_full_size img', box).setAttribute('src', featured);
			$('.product-item', box).id = 'product-' + p.id;
			$('.qwp-name', box).innerHTML = '<a class="text2line" href="/' + p.alias + '" title="' + esc(p.name) + '">' + esc(p.name) + '</a>';
			$('.vendor_', box).insertAdjacentHTML('beforeend', p.vendor ? esc(p.vendor) : '<span>Đang cập nhật</span>');
			$('.sku_', box).insertAdjacentHTML('beforeend', p.variants[0].sku ? esc(p.variants[0].sku) : '<span>Đang cập nhật</span>');
			$('.product-description .rte', box).innerHTML = p.summary || 'Thông tin sản phẩm đang cập nhật';
			var form = $('form.variants', box);
			form.id = 'product-actions-' + p.id;
			var price = $('.price', box), old = $('.old-price', box);
			if (p.price < 1 && p.variants.length < 2) {
				price.innerHTML = 'Liên hệ'; old.innerHTML = '';
				form.style.display = 'none';
			} else {
				form.style.display = '';
				price.innerHTML = money(p.price);
			}
			if (p.compare_at_price_max > p.price) { old.innerHTML = money(p.compare_at_price_max); old.style.display = ''; price.classList.add('sale-price'); }
			else { old.innerHTML = ''; price.classList.remove('sale-price'); }

			/* variants: hidden id select + swatches (built like quickViewVariantsSwatch) */
			var select = $('form.variants > select', box);
			if (p.variants.length > 1) {
				select.id = 'product-select-' + p.id;
				select.setAttribute('name', 'variantId');
				select.innerHTML = p.variants.map(function (v) { return '<option value="' + v.id + '">' + esc(v.title) + '</option>'; }).join('');
				var html = p.options.map(function (name, i) {
					var seen = [], out = '<div class="swatch clearfix" data-option-index="' + i + '"><div class="header">' + esc(name) + ': </div>';
					p.variants.forEach(function (v, j) {
						var value = v.options[i];
						if (seen.indexOf(value) !== -1) return;
						seen.push(value);
						var h = handleize(value), id = 'swatch-' + i + '-' + h;
						out += '<div title="' + esc(value) + '"' + (v.image ? ' data-image="' + v.image.src + '"' : '') + ' data-value="' + esc(value) + '" class="swatch-element ' + h + (v.available ? ' available' : ' soldout') + '">' +
							'<input id="' + id + '" type="radio" name="option-' + i + '" value="' + esc(value) + '"' + (j === 0 ? ' checked' : '') + ' />' +
							'<label for="' + id + '">' + esc(value) + '</label></div>';
					});
					return out + '</div>';
				}).join('');
				$('.form_product_content', box).insertAdjacentHTML('beforebegin', html);
				$$('.swatch input', box).forEach(function (input) {
					input.addEventListener('change', function () { qvSelect(p, box, variantFor(p, box)); });
				});
			} else {
				select.remove();
				form.insertAdjacentHTML('beforeend', '<input type="hidden" name="variantId" value="' + p.variants[0].id + '">');
			}
			$('.quantity_wanted_p', box).style.display = '';
			qvSelect(p, box, p.variants.length > 1 ? variantFor(p, box) : p.variants[0]);
			if (!p.available) {
				var b = $('.add_to_cart_detail', box);
				b.textContent = 'Hết hàng'; b.classList.add('disabled'); b.setAttribute('disabled', 'disabled');
			}

			/* thumbnails */
			var list = $('#thumblist_quickview', box);
			$('#thumbs_list_quickview', box).classList.add('thumbs_list_quickview');
			if (p.images && p.images.length > 1) {
				list.innerHTML = p.images.map(function (img) {
					var src = img.src || img;
					return '<li class="swiper-slide"><a href="javascript:void(0)" data-imageid="' + p.id + '" data-zoom-image="' + src + '"><img src="' + src + '" alt="Ảnh sản phẩm" style="max-width:120px; max-height:120px;" /></a></li>';
				}).join('');
				if (window.tqSwiper) {
					window.tqSwiper($('#thumbs_list_quickview', box), {
						slidesPerView: 4, spaceBetween: 8, slidesPerGroup: 2,
						navigation: { nextEl: '#thumbs_list_quickview .swiper-button-next', prevEl: '#thumbs_list_quickview .swiper-button-prev' },
						breakpoints: { 300: { slidesPerView: 'auto', spaceBetween: 5 }, 640: { slidesPerView: 3, spaceBetween: 5 }, 768: { slidesPerView: 2, spaceBetween: 8 }, 1024: { slidesPerView: 3, spaceBetween: 8 }, 1200: { slidesPerView: 4, spaceBetween: 8 } }
					});
				}
				$$('#thumblist_quickview a', box).forEach(function (a) {
					a.addEventListener('click', function () { $('#product-featured-image-quickview', box).setAttribute('src', $('img', a).getAttribute('src')); });
				});
			}

			$('.add_to_cart_detail', box).addEventListener('click', function (ev) {
				ev.preventDefault();
				if (this.hasAttribute('disabled')) return;
				qv.style.display = 'none';
				var v = p.variants.length > 1 ? variantFor(p, box) : p.variants[0];
				if (v) add(p, v, ($('input[name=quantity]', box) || {}).value);
			});
		});
	}

	if (qv) {
		document.addEventListener('click', function (e) {
			var btn = e.target.closest('.quick-view');
			if (btn) {
				e.preventDefault();
				qv.style.display = 'block';
				if (window.innerWidth > 1025) openQuickView(btn.getAttribute('data-handle'));
				return;
			}
			if (e.target.closest('.quickview-close, #quick-view-product .quickview-overlay, .fancybox-overlay')) {
				if (!e.target.closest('#modal-banner')) qv.style.display = 'none';
			}
		});
	}

	window.tqMoney = money;
	window.tqCart = { add: add, build: build, get: cart, getProduct: getProduct };
	build();
})();
