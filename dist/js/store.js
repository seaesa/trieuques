/* Store locator: filter the store list by province / ward and show the chosen store on the map. */
(function () {
	'use strict';

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
	var province = $('#store-province'), ward = $('#store-ward'), map = $('.page-store .map iframe');
	if (!province || !ward) return;

	function filter() {
		var p = province.value, w = ward.value, shown = 0;
		$$('option', ward).forEach(function (o) {
			o.hidden = !!(o.value && p && o.getAttribute('data-province') !== p);
		});
		if (ward.selectedOptions[0] && ward.selectedOptions[0].hidden) { ward.value = ''; w = ''; }
		$$('.page-store .store-list').forEach(function (store) {
			var on = (!p || store.getAttribute('data-province') === p) && (!w || store.getAttribute('data-ward') === w);
			store.style.display = on ? '' : 'none';
			if (on) shown++;
		});
		$('.page-store .store-empty').classList.toggle('d-none', shown > 0);
	}
	province.addEventListener('change', filter);
	ward.addEventListener('change', filter);

	$$('.page-store .store-list').forEach(function (store) {
		store.addEventListener('click', function (e) {
			if (e.target.closest('a')) return;
			if (map && store.getAttribute('data-map')) map.src = store.getAttribute('data-map');
		});
	});
})();
