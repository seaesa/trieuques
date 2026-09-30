/* Customer accounts kept in this browser (localStorage): login / register / recover forms, the header
 * account menu, and the account pages (info, orders, order detail, addresses, password, logout).
 * Markup follows the theme's account styles (css/account.css). */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
	var money = function (v) { return window.tqMoney ? window.tqMoney(v) : v + '₫'; };
	var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };

	var PROVINCES = ['Hà Nội', 'TP. Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế', 'An Giang', 'Bắc Ninh', 'Cà Mau', 'Cao Bằng',
		'Đắk Lắk', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Tĩnh', 'Hưng Yên', 'Khánh Hòa', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn',
		'Lào Cai', 'Nghệ An', 'Ninh Bình', 'Phú Thọ', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sơn La', 'Tây Ninh', 'Thái Nguyên',
		'Thanh Hóa', 'Tuyên Quang', 'Vĩnh Long'];

	/* ---------- Storage ---------- */
	function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; } }
	function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} }
	function customers() { return read('tq_customers', []); }
	function saveCustomer(c) {
		var list = customers().filter(function (x) { return x.email !== c.email; });
		list.push(c); write('tq_customers', list);
	}
	function current() {
		var email = read('tq_session', null);
		return email ? customers().filter(function (c) { return c.email === email; })[0] || null : null;
	}
	function orders() { return read('tq_orders', []); }
	function saveOrder(order) { var list = orders(); list.push(order); write('tq_orders', list); return order; }
	function sha256(text) {
		if (!window.crypto || !crypto.subtle) return Promise.resolve('plain:' + text);
		return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
			return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
		});
	}
	function fullName(c) { return ((c.lastName || '') + ' ' + (c.firstName || '')).trim(); }
	function formatDate(iso) { var d = new Date(iso); var p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear(); }
	function addressLine(a) { return [a.address, a.ward, a.province].filter(Boolean).join(', '); }

	window.tqAccount = { current: current, orders: orders, saveOrder: saveOrder, saveCustomer: saveCustomer, provinces: PROVINCES, addressLine: addressLine, fullName: fullName };

	/* ---------- Header account menu ---------- */
	(function headerMenu() {
		var me = current(), ul = $('.sudes-header-account ul');
		if (!me || !ul) return;
		var icons = $$('li svg', ul).map(function (svg) { return svg.outerHTML; });
		ul.innerHTML = '<li class="li-account"><a href="/account" rel="nofollow" title="Tài khoản">' + (icons[1] || '') + ' Tài khoản</a></li>' +
			'<li class="li-account"><a href="/account/logout" rel="nofollow" title="Đăng xuất">' + (icons[0] || '') + ' Đăng xuất</a></li>';
	})();

	/* ---------- Login / register / recover ---------- */
	function formError(form, message) {
		var box = $('.form-signup[style*="red"]', form) || $('span.form-signup', form) || $('.form-signup', form);
		if (box) box.innerHTML = message;
	}
	function returnUrl() {
		var r = new URLSearchParams(location.search).get('ReturnUrl');
		return r && r.charAt(0) === '/' ? r : '/account';
	}

	var loginForm = $('#customer_login');
	if (loginForm) {
		loginForm.addEventListener('submit', function (e) {
			e.preventDefault();
			var email = loginForm.email.value.trim().toLowerCase(), pass = loginForm.password.value;
			var found = customers().filter(function (c) { return c.email === email; })[0];
			sha256(pass).then(function (hash) {
				if (!found || found.pass !== hash) return formError(loginForm, 'Thông tin đăng nhập không chính xác.');
				write('tq_session', email);
				location.href = returnUrl();
			});
		});
	}

	var registerForm = $('#customer_register');
	if (registerForm) {
		registerForm.addEventListener('submit', function (e) {
			e.preventDefault();
			var f = registerForm, email = f.email.value.trim().toLowerCase();
			if (f.password.value.length < 6) return formError(f, 'Mật khẩu phải có ít nhất 6 ký tự.');
			if (customers().some(function (c) { return c.email === email; })) return formError(f, 'Email đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.');
			sha256(f.password.value).then(function (hash) {
				saveCustomer({
					email: email, pass: hash, lastName: f.lastName.value.trim(), firstName: f.firstName.value.trim(),
					phone: (f.PhoneNumber ? f.PhoneNumber.value.trim() : ''), addresses: [], created: new Date().toISOString()
				});
				write('tq_session', email);
				location.href = '/account';
			});
		});
	}

	var recoverForm = $('#recover_customer_password');
	if (recoverForm) {
		recoverForm.addEventListener('submit', function (e) {
			e.preventDefault();
			var email = recoverForm.Email.value.trim().toLowerCase();
			var exists = customers().some(function (c) { return c.email === email; });
			formError(recoverForm, exists
				? 'Vui lòng liên hệ Hotline/Zalo 0828 32 11 79 để được hỗ trợ đặt lại mật khẩu.'
				: 'Không tìm thấy tài khoản tương ứng với email này.');
		});
	}

	/* ---------- Account pages ---------- */
	var view = $('[data-account-view]');
	if (!view) return;
	var me = current(), kind = view.getAttribute('data-account-view');
	if (kind === 'logout') {
		try { localStorage.removeItem('tq_session'); } catch (e) {}
		location.replace('/');
		return;
	}
	if (!me) {
		location.replace('/account/login?ReturnUrl=' + encodeURIComponent(location.pathname + location.search));
		return;
	}
	var mine = orders().filter(function (o) { return o.email === me.email; }).sort(function (a, b) { return b.number - a.number; });

	function menu(active) {
		var items = [['info', '/account', 'Thông tin tài khoản'], ['orders', '/account/orders', 'Đơn hàng của bạn'],
			['password', '/account/changepassword', 'Đổi mật khẩu'], ['addresses', '/account/addresses', 'Sổ địa chỉ (' + (me.addresses || []).length + ')'],
			['logout', '/account/logout', 'Đăng xuất']];
		$('[data-account-menu]').innerHTML = '<h5 class="title-account">Trang tài khoản</h5>' +
			'<p>Xin chào, <span style="color:#d0a73c;">' + esc(fullName(me)) + '</span>&nbsp;!</p><ul>' +
			items.map(function (it) {
				return '<li><a class="title-info' + (it[0] === active ? ' active' : '') + '" href="' + it[1] + '" title="' + it[2] + '">' + it[2] + '</a></li>';
			}).join('') + '</ul>';
	}
	function add(html) { view.insertAdjacentHTML('beforeend', html); }
	function defaultAddress() { return (me.addresses || []).filter(function (a) { return a.default; })[0] || (me.addresses || [])[0]; }
	function status(o) { return o.fulfillment || 'Chưa giao hàng'; }

	function ordersTable(list) {
		var rows = list.length ? list.map(function (o, i) {
			return '<tr class="first ' + (i % 2 ? 'even' : 'odd') + '"><td><a href="/account/order?id=' + o.id + '" title="Đơn hàng #' + o.number + '">#' + o.number + '</a></td>' +
				'<td>' + formatDate(o.created) + '</td><td>' + esc(addressLine(o.shipping)) + '</td>' +
				'<td><span class="price">' + money(o.total) + '</span></td>' +
				'<td><span class="span_pending" style="color:red;">' + esc(o.payment_status) + '</span></td>' +
				'<td><span class="span_" style="color:red;">' + esc(status(o)) + '</span></td></tr>';
		}).join('') : '<tr><td colspan="6"><p>Không có đơn hàng nào.</p></td></tr>';
		return '<div class="my-account"><div class="dashboard"><div class="recent-orders"><div class="table-responsive-block tab-all" style="overflow-x:auto;">' +
			'<table class="table table-cart table-order" id="my-orders-table"><thead class="thead-default"><tr><th>Đơn hàng</th><th>Ngày</th><th>Địa chỉ</th><th>Giá trị đơn hàng</th><th>TT thanh toán</th><th>TT vận chuyển</th></tr></thead>' +
			'<tbody>' + rows + '</tbody></table></div></div></div></div>';
	}

	var views = {
		info: function () {
			var a = defaultAddress();
			add('<div class="form-signup name-account m992">' +
				'<p><strong>Họ tên:</strong> ' + esc(fullName(me)) + '</p>' +
				'<p><strong>Email:</strong> ' + esc(me.email) + '</p>' +
				(me.phone ? '<p><strong>Điện thoại:</strong> ' + esc(me.phone) + '</p>' : '') +
				(a ? '<p><strong>Địa chỉ:</strong> ' + esc(addressLine(a)) + '</p>' : '') + '</div>' +
				'<h2 class="title-yorder">Đơn hàng gần đây</h2>' + ordersTable(mine.slice(0, 5)));
		},
		orders: function () { add(ordersTable(mine)); },
		order: function () {
			var id = new URLSearchParams(location.search).get('id');
			var o = mine.filter(function (x) { return x.id === id; })[0];
			if (!o) { add('<p>Không tìm thấy đơn hàng.</p><p><a href="/account/orders">« Quay lại danh sách đơn hàng</a></p>'); return; }
			$('h1', view).remove();
			add('<div class="head-title clearfix"><h1 class="title-head margin-top-0">Chi tiết đơn hàng #' + o.number + '</h1>' +
				'<span class="order_date">Ngày tạo: ' + formatDate(o.created) + '</span></div>' +
				'<div class="payment_status">Trạng thái thanh toán: <i><span class="span_pending" style="color:red;">' + esc(o.payment_status) + '</span></i></div>' +
				'<div class="shipping_status">Trạng thái vận chuyển: <i><span class="span_" style="color:red;">' + esc(status(o)) + '</span></i></div>' +
				'<div class="row">' +
				'<div class="col-12 col-md-4 body_order"><div class="box-address"><h2 class="title-head">Địa chỉ giao hàng</h2><div class="box-des">' +
				'<p><strong>' + esc(o.shipping.name) + '</strong></p><p>Địa chỉ: ' + esc(addressLine(o.shipping)) + '</p><p>Số điện thoại: ' + esc(o.shipping.phone) + '</p></div></div></div>' +
				'<div class="col-12 col-md-4 body_order"><div class="box-address"><h2 class="title-head">Thanh toán</h2><div class="box-des"><p>' + esc(o.payment) + '</p></div></div></div>' +
				'<div class="col-12 col-md-4 body_order"><div class="box-address"><h2 class="title-head">Ghi chú</h2><div class="box-des"><p>' + esc(o.note || 'Không có ghi chú') + '</p>' +
				(o.delivery ? '<p>Thời gian giao hàng: ' + esc(o.delivery) + '</p>' : '') + '</div></div></div></div>' +
				'<div class="table-order"><div class="table-responsive-block"><table class="table table-cart" id="order_details"><thead class="thead-default"><tr><th>Sản phẩm</th><th>Đơn giá</th><th>Số lượng</th><th>Tổng</th></tr></thead><tbody>' +
				o.items.map(function (it) {
					return '<tr><td><div class="image_order"><a href="' + it.url + '"><img src="' + it.image + '" alt="' + esc(it.title) + '"></a></div>' +
						'<div class="content_right"><a class="title_order" href="' + it.url + '">' + esc(it.title) + '</a>' +
						(it.variant_title ? '<p class="variant-title">' + esc(it.variant_title) + '</p>' : '') +
						'<div class="bottom_mb"><span class="quantity_mb">x' + it.quantity + '</span><span class="sum_mb">' + money(it.price * it.quantity) + '</span></div></div></td>' +
						'<td>' + money(it.price) + '</td><td>' + it.quantity + '</td><td>' + money(it.price * it.quantity) + '</td></tr>';
				}).join('') + '</tbody></table></div>' +
				'<table class="totalorders"><tbody><tr><td>Khuyến mại</td><td>' + money(o.discount || 0) + '</td></tr>' +
				'<tr><td>Phí vận chuyển</td><td>' + esc(o.shipping_fee_label) + '</td></tr>' +
				'<tr><td>Tổng tiền</td><td><span class="total"><b>' + money(o.total) + '</b></span></td></tr></tbody></table></div>');
		},
		password: function () {
			add('<div class="page-login"><form id="change_customer_password"><p>Để đảm bảo tính bảo mật vui lòng đặt mật khẩu với ít nhất 6 kí tự</p>' +
				'<div class="form-signup clearfix" data-error style="color:red;"></div><div class="form-signup clearfix">' +
				'<fieldset class="form-group"><label for="OldPassword">Mật khẩu cũ <span class="error">*</span></label><input type="password" name="OldPassword" id="OldPassword" class="form-control form-control-lg" required></fieldset>' +
				'<fieldset class="form-group"><label for="changePass">Mật khẩu mới <span class="error">*</span></label><input type="password" name="Password" id="changePass" class="form-control form-control-lg" required></fieldset>' +
				'<fieldset class="form-group"><label for="confirmPass">Xác nhận lại mật khẩu <span class="error">*</span></label><input type="password" name="ConfirmPassword" id="confirmPass" class="form-control form-control-lg" required></fieldset>' +
				'<button class="button btn-edit-addr btn btn-primary btn-more" type="submit">Đặt lại mật khẩu</button></div></form></div>');
			var f = $('#change_customer_password'), err = $('[data-error]', f);
			f.addEventListener('submit', function (e) {
				e.preventDefault();
				if (f.Password.value.length < 6) { err.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.'; return; }
				if (f.Password.value !== f.ConfirmPassword.value) { err.textContent = 'Xác nhận mật khẩu không khớp.'; return; }
				sha256(f.OldPassword.value).then(function (oldHash) {
					if (oldHash !== me.pass) { err.textContent = 'Mật khẩu cũ không chính xác.'; return; }
					return sha256(f.Password.value).then(function (hash) {
						me.pass = hash; saveCustomer(me); f.reset(); err.textContent = '';
						if (window.theme && theme.alert) theme.alert.new('Đổi mật khẩu', 'Mật khẩu của bạn đã được cập nhật.', 3000, 'alert-success');
					});
				});
			});
		},
		addresses: function () {
			add('<p class="btn-row"><button class="btn-edit-addr btn btn-primary btn-more" type="button" data-address-new>Thêm địa chỉ</button></p><div class="row" data-address-list></div>' +
				'<div class="op_address"></div><div class="modal_address" id="modal-address"><div class="btn-close closed_pop" data-address-close><span></span></div>' +
				'<h5 class="title-head title_pop" data-address-title>Thêm địa chỉ mới</h5><div class="pop_bottom"><form id="address-form"><div class="form_address">' +
				field('name', 'Họ tên') + field('phone', 'Số điện thoại', 'tel') + field('company', 'Công ty') + field('address', 'Địa chỉ') +
				'<div class="group-country two"><fieldset class="form-group select-field"><select class="form-control has-content" name="province">' +
				'<option value="">Chọn tỉnh thành</option>' + PROVINCES.map(function (p) { return '<option value="' + p + '">' + p + '</option>'; }).join('') +
				'</select><label>Tỉnh thành</label></fieldset>' + field('ward', 'Phường/Xã', 'text', true) + '</div>' +
				'<div class="checkbox"><label class="c-checkbox"><input type="checkbox" name="default"><span class="fa fa-check"></span>&nbsp; &nbsp; Đặt là địa chỉ mặc định?</label></div></div>' +
				'<div class="btn-row"><button class="btn btn-dark-address btn-close" type="button" data-address-close>Hủy</button> ' +
				'<button class="btn btn-primary btn-submit" type="submit">Lưu địa chỉ</button></div></form></div></div>');
			var modal = $('#modal-address'), overlay = $('.op_address', view), form = $('#address-form'), editing = null;
			function field(name, label, type, bare) {
				var inner = '<input type="' + (type || 'text') + '" class="form-control" name="' + name + '"' + (name === 'name' || name === 'phone' || name === 'address' ? ' required' : '') + '><label>' + label + '</label>';
				return bare ? '<fieldset class="form-group">' + inner + '</fieldset>' : '<div class="field form-group">' + inner + '</div>';
			}
			function render() {
				var list = me.addresses || [];
				$('[data-address-list]').innerHTML = list.map(function (a, i) {
					return '<div class="col-12 address_info" style="border-top: 1px #ebebeb dashed; padding-top: 16px; margin-top: 16px;">' +
						'<div class="address-group"><div class="address form-signup">' +
						'<p><strong>Họ tên: </strong> ' + esc(a.name) + (a.default ? ' <span class="address-default"><i class="fa fa-check-circle"></i>Địa chỉ mặc định</span>' : '') + '</p>' +
						(a.company ? '<p><strong>Công ty:</strong> ' + esc(a.company) + '</p>' : '') +
						'<p><strong>Địa chỉ: </strong>' + esc(addressLine(a)) + '</p><p><strong>Số điện thoại:</strong> ' + esc(a.phone) + '</p></div></div>' +
						'<div class="btn-address"><p class="btn-row"><button class="btn-edit-addr btn btn-edit" type="button" data-address-edit="' + i + '">Chỉnh sửa địa chỉ</button>' +
						(a.default ? '' : '<button class="btn btn-dark-address btn-edit-addr btn-delete" type="button" data-address-delete="' + i + '"><span>Xóa</span></button>') + '</p></div></div>';
				}).join('') || '<div class="col-12"><p>Bạn chưa có địa chỉ nào.</p></div>';
				menu('addresses');
			}
			function open(i) {
				editing = i;
				form.reset();
				var a = i === null ? { default: !(me.addresses || []).length } : me.addresses[i];
				['name', 'phone', 'company', 'address', 'ward', 'province'].forEach(function (k) { form[k].value = a[k] || ''; });
				form['default'].checked = !!a.default;
				$$('.form-control', form).forEach(function (el) { el.classList.toggle('has-content', !!el.value || el.tagName === 'SELECT'); });
				$('[data-address-title]').textContent = i === null ? 'Thêm địa chỉ mới' : 'Chỉnh sửa địa chỉ';
				modal.style.display = 'block'; overlay.classList.add('opened'); document.body.classList.add('no-scroll');
			}
			function close() { modal.style.display = 'none'; overlay.classList.remove('opened'); document.body.classList.remove('no-scroll'); }
			$$('.form-control', form).forEach(function (el) {
				el.addEventListener('input', function () { el.classList.toggle('has-content', !!el.value || el.tagName === 'SELECT'); });
			});
			view.addEventListener('click', function (e) {
				if (e.target.closest('[data-address-new]')) open(null);
				else if (e.target.closest('[data-address-edit]')) open(+e.target.closest('[data-address-edit]').getAttribute('data-address-edit'));
				else if (e.target.closest('[data-address-delete]')) {
					me.addresses.splice(+e.target.closest('[data-address-delete]').getAttribute('data-address-delete'), 1);
					saveCustomer(me); render();
				} else if (e.target.closest('[data-address-close]') || e.target === overlay) close();
			});
			form.addEventListener('submit', function (e) {
				e.preventDefault();
				var a = {};
				['name', 'phone', 'company', 'address', 'ward', 'province'].forEach(function (k) { a[k] = form[k].value.trim(); });
				a.default = form['default'].checked;
				me.addresses = me.addresses || [];
				if (a.default) me.addresses.forEach(function (x) { x.default = false; });
				if (editing === null) me.addresses.push(a); else me.addresses[editing] = a;
				if (!me.addresses.some(function (x) { return x.default; })) me.addresses[0].default = true;
				saveCustomer(me); close(); render();
			});
			render();
		}
	};

	menu(kind === 'order' ? 'orders' : kind);
	if (views[kind]) views[kind]();
})();
