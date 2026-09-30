/* Cart page: delivery date picker (bootstrap-datepicker markup), delivery time, VAT invoice form,
 * checkout button and coupon carousel. Line items are rendered by cart.js. */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

	function setCookie(name, value) {
		var d = new Date(); d.setTime(d.getTime() + 24 * 60 * 60 * 1000);
		document.cookie = name + '=' + value + '; expires=' + d.toGMTString() + ';path=/';
	}

	/* ---------- Date picker: format dd/mm/yyyy, startDate today, dropdown under the input, right aligned ---------- */
	(function datepicker() {
		var input = $('.input_group #date');
		if (!input) return;
		var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
		var SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		var today = new Date(); today.setHours(0, 0, 0, 0);
		var view = new Date(today.getFullYear(), today.getMonth(), 1), mode = 'days', selected = null, box = null;
		var pad = function (n) { return (n < 10 ? '0' : '') + n; };

		function head(title, prevVisible) {
			return '<thead><tr><th class="prev" style="visibility: ' + (prevVisible ? 'visible' : 'hidden') + ';">«</th><th colspan="5" class="datepicker-switch">' + title + '</th><th class="next" style="visibility: visible;">»</th></tr>';
		}
		var foot = '<tfoot><tr><th colspan="7" class="today" style="display: none;">Today</th></tr><tr><th colspan="7" class="clear" style="display: none;">Clear</th></tr></tfoot>';

		function daysView() {
			var y = view.getFullYear(), m = view.getMonth();
			var start = new Date(y, m, 1 - new Date(y, m, 1).getDay());
			var rows = '';
			for (var w = 0; w < 6; w++) {
				rows += '<tr>';
				for (var d = 0; d < 7; d++) {
					var day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
					var cls = [];
					if (day.getMonth() < m && day.getFullYear() <= y || day.getFullYear() < y) cls.push('old');
					if (day.getMonth() > m && day.getFullYear() >= y || day.getFullYear() > y) cls.push('new');
					if (day < today) cls.push('disabled');
					if (selected && +day === +selected) cls.push('active');
					cls.push('day');
					rows += '<td class="' + cls.join(' ') + '" data-date="' + (+day) + '">' + day.getDate() + '</td>';
				}
				rows += '</tr>';
			}
			var dow = '<tr>' + ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(function (x) { return '<th class="dow">' + x + '</th>'; }).join('') + '</tr></thead>';
			var prevOk = new Date(y, m, 1) > new Date(today.getFullYear(), today.getMonth(), 1);
			return '<table class=" table-condensed">' + head(MONTHS[m] + ' ' + y, prevOk) + dow + '<tbody>' + rows + '</tbody>' + foot + '</table>';
		}
		function monthsView() {
			var y = view.getFullYear();
			var spans = SHORT.map(function (name, i) {
				var off = y < today.getFullYear() || (y === today.getFullYear() && i < today.getMonth());
				return '<span class="month' + (off ? ' disabled' : '') + '" data-month="' + i + '">' + name + '</span>';
			}).join('');
			return '<table class="table-condensed">' + head(String(y), y > today.getFullYear()) + '</thead><tbody><tr><td colspan="7">' + spans + '</td></tr></tbody>' + foot + '</table>';
		}
		function yearsView() {
			var decade = Math.floor(view.getFullYear() / 10) * 10, spans = '';
			for (var yy = decade - 1; yy <= decade + 10; yy++) {
				var cls = 'year' + (yy < decade ? ' old' : yy > decade + 9 ? ' new' : '') + (yy < today.getFullYear() ? ' disabled' : '');
				spans += '<span class="' + cls + '" data-year="' + yy + '">' + yy + '</span>';
			}
			return '<table class="table-condensed">' + head(decade + '-' + (decade + 9), decade > today.getFullYear()) + '</thead><tbody><tr><td colspan="7">' + spans + '</td></tr></tbody>' + foot + '</table>';
		}

		function render() {
			box.innerHTML = '<div class="datepicker-days" style="display: ' + (mode === 'days' ? 'block' : 'none') + ';">' + daysView() + '</div>' +
				'<div class="datepicker-months" style="display: ' + (mode === 'months' ? 'block' : 'none') + ';">' + monthsView() + '</div>' +
				'<div class="datepicker-years" style="display: ' + (mode === 'years' ? 'block' : 'none') + ';">' + yearsView() + '</div>';
		}
		function place() {
			var r = input.getBoundingClientRect();
			box.style.top = (r.bottom + window.pageYOffset) + 'px';
			box.style.left = (r.right + window.pageXOffset - box.offsetWidth) + 'px';
		}
		function open() {
			if (!box) {
				box = document.createElement('div');
				box.className = 'datepicker datepicker-dropdown dropdown-menu datepicker-orient-right datepicker-orient-top';
				box.addEventListener('mousedown', function (e) { e.preventDefault(); });
				box.addEventListener('click', onClick);
			}
			mode = 'days';
			if (selected) view = new Date(selected.getFullYear(), selected.getMonth(), 1);
			render();
			document.body.appendChild(box);
			box.style.display = 'block';
			place();
		}
		function close() { if (box && box.parentNode) box.parentNode.removeChild(box); }
		function onClick(e) {
			var t = e.target;
			if (t.closest('.prev') || t.closest('.next')) {
				var dir = t.closest('.prev') ? -1 : 1;
				if (mode === 'days') view = new Date(view.getFullYear(), view.getMonth() + dir, 1);
				else if (mode === 'months') view = new Date(view.getFullYear() + dir, view.getMonth(), 1);
				else view = new Date(view.getFullYear() + dir * 10, view.getMonth(), 1);
			} else if (t.closest('.datepicker-switch')) {
				mode = mode === 'days' ? 'months' : 'years';
			} else if (t.matches('td.day') && !t.classList.contains('disabled')) {
				selected = new Date(+t.getAttribute('data-date'));
				input.value = pad(selected.getDate()) + '/' + pad(selected.getMonth() + 1) + '/' + selected.getFullYear();
				input.dispatchEvent(new Event('change', { bubbles: true }));
				close();
				return;
			} else if (t.matches('span.month') && !t.classList.contains('disabled')) {
				view = new Date(view.getFullYear(), +t.getAttribute('data-month'), 1); mode = 'days';
			} else if (t.matches('span.year') && !t.classList.contains('disabled')) {
				view = new Date(+t.getAttribute('data-year'), view.getMonth(), 1); mode = 'months';
			} else return;
			render(); place();
		}
		input.addEventListener('focus', open);
		input.addEventListener('click', function () { if (!box || !box.parentNode) open(); });
		input.addEventListener('blur', close);
		window.addEventListener('resize', function () { if (box && box.parentNode) place(); });
	})();

	/* ---------- Delivery date/time remembered in a cookie, as the original ---------- */
	$$('.timedeli-cta, .date_picker').forEach(function (el) {
		['change', 'touchstart'].forEach(function (ev) {
			el.addEventListener(ev, function () {
				var date = ($('.date_picker') || {}).value, sel = $('.timedeli-cta');
				var time = sel && sel.selectedOptions[0] ? sel.selectedOptions[0].value : undefined;
				if (date !== undefined && time !== undefined) setCookie('ego-delivery-value', date.split('/') + '-' + time);
			});
		});
	});

	/* ---------- VAT invoice ---------- */
	var billField = $('.bill-field');
	var checkbox = $('.r-bill .regular-checkbox');
	if (checkbox && checkbox.checked && billField) billField.style.display = 'block';
	if (checkbox) {
		checkbox.addEventListener('click', function () {
			var hidden = $('#re-checkbox-bill');
			if (hidden) hidden.value = checkbox.checked ? 'có' : 'không';
			if (billField && window.slideToggle) window.slideToggle(billField, 400);
		});
	}
	function validateField(el, message) {
		var next = el.nextElementSibling;
		if (el.value === '') {
			if (!next || !next.matches('span.text-danger')) el.insertAdjacentHTML('afterend', '<span class="text-danger">Bạn không được để trống trường này</span>');
			return false;
		}
		if (next && next.matches('span.text-danger')) next.remove();
		var ok = true;
		if (el.classList.contains('val-n') && el.value.trim().length < 10) {
			el.insertAdjacentHTML('afterend', '<span class="text-danger">' + (message || 'Mã số thuế phải tối thiểu 10 ký tự') + '</span>'); ok = false;
		}
		if (el.classList.contains('val-email') && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(el.value.trim())) {
			el.insertAdjacentHTML('afterend', '<span class="text-danger">Định dạng email không đúng</span>'); ok = false;
		}
		return ok;
	}
	document.addEventListener('keyup', function (e) {
		if (e.target.classList && e.target.classList.contains('val-f')) validateField(e.target);
	});

	window.goToCheckout = function (e) {
		e.preventDefault();
		if ($('#checkbox-bill') && $('#checkbox-bill').checked) {
			var valid = $$('.val-f').every(function (el) {
				if (el.value === '') return false;
				if (el.classList.contains('val-n') && el.value.trim().length < 10) return false;
				if (el.classList.contains('val-email') && !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(el.value.trim())) return false;
				return true;
			});
			if (!valid) $$('.val-f').forEach(function (el) { validateField(el, 'Mã số thuế phải tối thiểu 10 ký tự nè'); });
			else location.href = '/checkout';
			return;
		}
		location.href = '/checkout';
	};

	/* ---------- Carousels (native scroll at ≤767px): suggested products + coupons ---------- */
	function responsiveSwiper(el, options) {
		var instance = null;
		if (!el || !window.tqSwiper) return;
		function toggle() {
			var small = window.innerWidth <= 767;
			if (small && instance) { instance.destroy(true, true); instance = null; }
			else if (!small && !instance) instance = window.tqSwiper(el, options);
		}
		toggle();
		window.addEventListener('resize', toggle);
	}
	responsiveSwiper($('.product-suggest .swiper_suggest'), {
		slidesPerView: 4, spaceBetween: 20, slidesPerGroup: 1,
		navigation: { nextEl: '.swiper_suggest .swiper-button-next', prevEl: '.swiper_suggest .swiper-button-prev' },
		breakpoints: { 768: { slidesPerView: 3, spaceBetween: 20 }, 992: { slidesPerView: 3, spaceBetween: 20 }, 1024: { slidesPerView: 2.5, spaceBetween: 20 }, 1200: { slidesPerView: 3, spaceBetween: 10 } }
	});
	(function coupons() {
		var el = $('.product-coupons .swiper_coupons'), instance = null;
		if (!el || !window.tqSwiper) return;
		function toggle() {
			var small = window.innerWidth <= 767;
			if (small && instance) { instance.destroy(true, true); instance = null; }
			else if (!small && !instance) {
				instance = window.tqSwiper(el, {
					slidesPerView: 4, spaceBetween: 14, watchOverflow: true, slidesPerGroup: 1,
					navigation: { nextEl: '.swiper_coupons .swiper-button-next', prevEl: '.swiper_coupons .swiper-button-prev' },
					breakpoints: {
						640: { slidesPerView: 2, spaceBetween: 14 }, 768: { slidesPerView: 2.2, spaceBetween: 14 }, 992: { slidesPerView: 2.2, spaceBetween: 10 },
						1024: { slidesPerView: 1.25, spaceBetween: 10 }, 1200: { slidesPerView: 1.25, spaceBetween: 10 }
					}
				});
			}
		}
		toggle();
		window.addEventListener('resize', toggle);
	})();
})();
