/* Checkout (/checkout) and order confirmation (/checkout/thank-you?id=...).
 * Orders are stored in this browser (see js/account.js); payment is cash on delivery. */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
	var page = $('[data-checkout-view]'), body = $('[data-checkout-body]');
	if (!page || !body || !window.tqAccount) return;
	page.classList.remove('is-empty'); /* cart.js marks an empty cart; the confirmation page still shows its order column */
	var account = window.tqAccount;
	var money = function (v) { return window.tqMoney(v); };
	var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
	var PAYMENT = 'Thanh toán khi giao hàng (COD)';
	var SHIPPING_NOTE = 'Nhân viên sẽ thông báo phí vận chuyển khi xác nhận đơn hàng.';
	var ICON_OK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/></svg>';
	var ICON_CASH = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M0 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V4zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V6a2 2 0 0 1-2-2H3z"/></svg>';

	function cookie(name) {
		var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
		return m ? decodeURIComponent(m[1]) : '';
	}
	function deliveryText() {
		var raw = cookie('ego-delivery-value');
		if (!raw) return '';
		var parts = raw.split('-');
		var date = (parts[0] || '').split(',').join('/');
		var time = parts.slice(1).join('-').trim();
		return [date, time].filter(function (x) { return x && x !== 'Chọn thời gian'; }).join(' ');
	}

	function summaryLines(subtotal, discount) {
		return '<div class="summary-total summary-lines">' +
			'<div class="content-items"><div class="item-content-left">Tạm tính</div><div class="item-content-right">' + money(subtotal) + '</div></div>' +
			'<div class="content-items"><div class="item-content-left">Khuyến mại</div><div class="item-content-right" data-discount>' + (discount ? '-' + money(discount) : money(0)) + '</div></div>' +
			'<div class="content-items"><div class="item-content-left">Phí vận chuyển</div><div class="item-content-right">Chưa bao gồm</div></div>' +
			'<p class="note">' + SHIPPING_NOTE + '</p></div>' +
			'<div class="summary-total"><div class="content-items"><div class="item-content-left">Tổng cộng</div>' +
			'<div class="item-content-right"><span class="total-price" data-total>' + money(subtotal - discount) + '</span></div></div></div>';
	}
	function lines(items) {
		return '<div class="order-lines">' + items.map(function (it) {
			return '<div class="order-line"><div class="thumb"><img src="' + it.image + '" alt="' + esc(it.title) + '"><span class="qty">' + it.quantity + '</span></div>' +
				'<div class="info"><a href="' + it.url + '">' + esc(it.title) + '</a>' + (it.variant_title ? '<span class="variant">' + esc(it.variant_title) + '</span>' : '') + '</div>' +
				'<div class="price">' + money(it.price * it.quantity) + '</div></div>';
		}).join('') + '</div>';
	}

	/* ---------- Coupons: the store's published codes and conditions (data/coupons.json) ---------- */
	function parseCoupon(c) {
		var nums = function (s) { return +(String(s).match(/[\d,.]+/) || ['0'])[0].replace(/[,.]/g, ''); };
		var d = (c.expiry.match(/(\d+)\/(\d+)\/(\d+)/) || []);
		var expires = d.length ? new Date(+d[3], +d[2] - 1, Math.min(+d[1], new Date(+d[3], +d[2], 0).getDate()), 23, 59, 59) : null;
		var min = /từ\s*<b>([\d,.]+)đ/i.exec(c.condition);
		var free = /freeship|miễn phí giao hàng/i.test(c.code + ' ' + c.desc);
		return {
			code: c.code, desc: c.desc, expires: expires, min: min ? nums(min[1]) : 0, freeship: free,
			value: free ? 0 : nums(c.desc) * (/k\b/i.test(c.desc) ? 1000 : 1)
		};
	}

	function renderCheckout() {
		var cart = window.tqCart.get(), me = account.current();
		if (!cart.items.length) {
			body.innerHTML = '<div class="col-12"><div class="bg-shadow margin-bottom-20"><h1 class="title_cart">Thanh toán</h1>' +
				'<div class="cart--empty-message"><p>Giỏ hàng của bạn đang trống</p></div>' +
				'<p class="a-center"><a class="btn btn-primary" href="/collections/all" title="Tiếp tục mua hàng">Tiếp tục mua hàng</a></p></div></div>';
			return;
		}
		var def = me && ((me.addresses || []).filter(function (a) { return a.default; })[0] || (me.addresses || [])[0]);
		var saved = me && (me.addresses || []).length > 1 ? '<div class="saved-address"><select class="form-control" data-saved-address><option value="">Chọn địa chỉ đã lưu</option>' +
			me.addresses.map(function (a, i) { return '<option value="' + i + '">' + esc(a.name + ' – ' + account.addressLine(a)) + '</option>'; }).join('') + '</select></div>' : '';
		var v = def || (me ? { name: account.fullName(me), phone: me.phone } : {});
		function field(name, label, opts) {
			opts = opts || {};
			var value = esc(opts.value != null ? opts.value : (v[name] || ''));
			var input = opts.textarea ? '<textarea class="form-control" name="' + name + '" id="co-' + name + '" placeholder="' + (opts.placeholder || '') + '">' + value + '</textarea>'
				: opts.options ? '<select class="form-control" name="' + name + '" id="co-' + name + '"' + (opts.required ? ' required' : '') + '><option value="">Chọn tỉnh thành</option>' +
					opts.options.map(function (o) { return '<option value="' + o + '"' + (o === v[name] ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>'
				: '<input type="' + (opts.type || 'text') + '" class="form-control" name="' + name + '" id="co-' + name + '" value="' + value + '"' + (opts.required ? ' required' : '') + ' placeholder="' + (opts.placeholder || '') + '">';
			return '<div class="form-group' + (opts.half ? ' half' : '') + '"><label for="co-' + name + '">' + label + (opts.required ? ' <span>*</span>' : '') + '</label>' + input + '</div>';
		}
		var delivery = deliveryText();
		body.innerHTML =
			'<div class="col-xl-8 col-lg-7 col-12 col-cart-left"><form id="checkout-form" novalidate>' +
			'<div class="bg-shadow checkout-block"><h1 class="title_cart">Thông tin nhận hàng' +
			(me ? '' : '<small>Bạn đã có tài khoản? <a href="/account/login?ReturnUrl=%2Fcheckout" title="Đăng nhập">Đăng nhập</a></small>') + '</h1>' + saved +
			'<div class="checkout-fields">' +
			field('name', 'Họ và tên', { required: true, half: true }) + field('phone', 'Số điện thoại', { required: true, half: true, type: 'tel' }) +
			field('email', 'Email', { type: 'email', value: me ? me.email : '' }) +
			field('address', 'Địa chỉ', { required: true, placeholder: 'Số nhà, tên đường' }) +
			field('province', 'Tỉnh thành', { required: true, half: true, options: account.provinces }) + field('ward', 'Phường/Xã', { half: true }) +
			field('note', 'Ghi chú', { textarea: true, value: '', placeholder: 'Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn' }) +
			'</div></div>' +
			'<div class="bg-shadow checkout-block"><h2 class="title_cart">Phương thức thanh toán</h2>' +
			'<label class="payment-option"><input type="radio" name="payment" value="cod" checked>' + ICON_CASH + '<span>' + PAYMENT + '</span></label></div>' +
			'</form></div>' +
			'<div class="col-xl-4 col-lg-5 col-12 col-cart-right"><div class="sticky"><div class="bg-shadow margin-bottom-20"><div class="ajaxcart__footer">' +
			'<div class="checkout-header">Đơn hàng (' + cart.item_count + ' sản phẩm)</div><div class="checkout-body">' +
			lines(cart.items) +
			'<div class="coupon-row"><div class="coupon-input"><input type="text" placeholder="Nhập mã giảm giá" data-coupon-input aria-label="Mã giảm giá"><button type="button" class="btn btn-extent" data-coupon-apply>Áp dụng</button></div><p class="coupon-message" data-coupon-message hidden></p></div>' +
			'<div data-summary>' + summaryLines(cart.total_price, 0) + '</div>' +
			(delivery ? '<div class="summary-action"><p>Thời gian giao hàng: ' + esc(delivery) + '</p></div>' : '') +
			'<div class="summary-button"><div class="cart__btn-proceed-checkout-dt"><button type="submit" form="checkout-form" class="button btn btn-default cart__btn-proceed-checkout btn-primary duration-300" title="Đặt hàng">Đặt hàng</button></div>' +
			'<a class="return_buy btn btn-extent duration-300" href="/cart" title="Quay về giỏ hàng">Quay về giỏ hàng</a></div>' +
			'</div></div></div></div></div>';

		var discount = 0, applied = null;
		var form = $('#checkout-form');
		var savedSelect = $('[data-saved-address]');
		if (savedSelect) {
			savedSelect.addEventListener('change', function () {
				var a = me.addresses[+savedSelect.value];
				if (!a) return;
				['name', 'phone', 'address', 'province', 'ward'].forEach(function (k) { form[k].value = a[k] || ''; });
			});
		}

		var couponMsg = $('[data-coupon-message]');
		$('[data-coupon-apply]').addEventListener('click', function () {
			var code = $('[data-coupon-input]').value.trim().toUpperCase();
			var say = function (text, ok) { couponMsg.hidden = false; couponMsg.textContent = text; couponMsg.classList.toggle('ok', !!ok); };
			if (!code) return say('Vui lòng nhập mã giảm giá.');
			fetch('/data/coupons.json').then(function (r) { return r.json(); }).then(function (list) {
				var c = list.map(parseCoupon).filter(function (x) { return x.code === code; })[0];
				discount = 0; applied = null;
				if (!c) say('Mã giảm giá không tồn tại.');
				else if (c.expires && c.expires < new Date()) say('Mã giảm giá đã hết hạn.');
				else if (cart.total_price < c.min) say('Mã giảm giá chỉ áp dụng cho đơn hàng từ ' + money(c.min) + ' trở lên.');
				else if (c.freeship) { applied = c; say('Đã áp dụng mã ' + c.code + ': ' + c.desc + '.', true); }
				else { applied = c; discount = c.value; say('Đã áp dụng mã ' + c.code + ': ' + c.desc + '.', true); }
				$('[data-summary]').innerHTML = summaryLines(cart.total_price, discount);
			});
		});

		form.addEventListener('submit', function (e) {
			e.preventDefault();
			$$('.has-error', form).forEach(function (g) { g.classList.remove('has-error'); });
			$$('.field-error', form).forEach(function (m) { m.remove(); });
			var bad = [];
			var need = function (name, ok, msg) { if (!ok) bad.push([name, msg]); };
			need('name', form.name.value.trim(), 'Vui lòng nhập họ tên.');
			need('phone', /^(\+?84|0)\d{9,10}$/.test(form.phone.value.replace(/[\s.-]/g, '')), 'Số điện thoại không hợp lệ.');
			need('email', !form.email.value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim()), 'Email không hợp lệ.');
			need('address', form.address.value.trim(), 'Vui lòng nhập địa chỉ.');
			need('province', form.province.value, 'Vui lòng chọn tỉnh thành.');
			if (bad.length) {
				bad.forEach(function (b) {
					var group = form[b[0]].closest('.form-group');
					group.classList.add('has-error');
					group.insertAdjacentHTML('beforeend', '<p class="field-error">' + b[1] + '</p>');
				});
				form[bad[0][0]].focus();
				return;
			}
			var all = account.orders();
			var shipping = { name: form.name.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim(),
				address: form.address.value.trim(), ward: form.ward.value.trim(), province: form.province.value };
			var order = {
				id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
				number: 1001 + all.length,
				email: me ? me.email : (shipping.email || null),
				created: new Date().toISOString(),
				items: cart.items.map(function (it) { return { title: it.title, variant_title: it.variant_title, price: it.price, quantity: it.quantity, image: it.image, url: it.url, variant_id: it.variant_id }; }),
				subtotal: cart.total_price, discount: discount, coupon: applied ? applied.code : '',
				total: cart.total_price - discount, shipping: shipping, note: form.note.value.trim(), delivery: delivery,
				payment: PAYMENT, payment_status: 'Chưa thu tiền', fulfillment: 'Chưa giao hàng',
				shipping_fee_label: applied && applied.freeship ? 'Miễn phí (' + applied.code + ')' : 'Chưa bao gồm'
			};
			account.saveOrder(order);
			if (me && !(me.addresses || []).length) {
				me.addresses = [{ name: shipping.name, phone: shipping.phone, address: shipping.address, ward: shipping.ward, province: shipping.province, company: '', default: true }];
				account.saveCustomer(me);
			}
			try { localStorage.setItem('tq_cart', '[]'); localStorage.setItem('tq_last_order', order.id); } catch (err) {}
			location.href = '/checkout/thank-you?id=' + order.id;
		});
	}

	function renderThankYou() {
		var id = new URLSearchParams(location.search).get('id') || localStorage.getItem('tq_last_order');
		var o = account.orders().filter(function (x) { return x.id === id; })[0];
		if (!o) {
			body.innerHTML = '<div class="col-12"><div class="bg-shadow margin-bottom-20 thankyou"><p>Không tìm thấy đơn hàng.</p><div class="actions"><a class="btn btn-primary" href="/">Về trang chủ</a></div></div></div>';
			return;
		}
		var me = account.current();
		body.innerHTML =
			'<div class="col-xl-8 col-lg-7 col-12 col-cart-left"><div class="bg-shadow margin-bottom-20 thankyou">' + ICON_OK +
			'<h1>Đặt hàng thành công</h1><p>Mã đơn hàng: <span class="order-number">#' + o.number + '</span></p>' +
			'<p>Cảm ơn bạn đã mua hàng tại TRIỀU QUẾ Thượng Đỉnh Yến. Nhân viên sẽ liên hệ với bạn qua số điện thoại <b>' + esc(o.shipping.phone) + '</b> để xác nhận đơn hàng.</p>' +
			'<div class="actions"><a class="btn btn-primary" href="/collections/all" title="Tiếp tục mua hàng">Tiếp tục mua hàng</a>' +
			(me && me.email === o.email ? '<a class="btn btn-extent" href="/account/order?id=' + o.id + '" title="Xem đơn hàng">Xem đơn hàng</a>' : '') + '</div></div>' +
			'<div class="bg-shadow margin-bottom-20 order-address"><h2 class="title_cart">Thông tin nhận hàng</h2>' +
			'<p><b>' + esc(o.shipping.name) + '</b> – ' + esc(o.shipping.phone) + '</p>' + (o.shipping.email ? '<p>' + esc(o.shipping.email) + '</p>' : '') +
			'<p>' + esc(account.addressLine(o.shipping)) + '</p>' + (o.delivery ? '<p>Thời gian giao hàng: ' + esc(o.delivery) + '</p>' : '') +
			(o.note ? '<p>Ghi chú: ' + esc(o.note) + '</p>' : '') + '<p>Phương thức thanh toán: ' + esc(o.payment) + '</p></div></div>' +
			'<div class="col-xl-4 col-lg-5 col-12 col-cart-right"><div class="sticky"><div class="bg-shadow margin-bottom-20"><div class="ajaxcart__footer">' +
			'<div class="checkout-header">Đơn hàng #' + o.number + '</div><div class="checkout-body">' + lines(o.items) +
			summaryLines(o.subtotal, o.discount || 0) + '</div></div></div></div></div>';
	}

	if (page.getAttribute('data-checkout-view') === 'thankyou') renderThankYou(); else renderCheckout();
})();
