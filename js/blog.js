/* Blog + article: table of contents (tocbot), TOC toggle, sidebar category accordion. */
(function () {
	'use strict';

	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

	/* Heading ids the TOC links to (text, lower-cased, spaces -> underscores) */
	$$('.article-content-main h2, .article-content-main h3').forEach(function (h) {
		h.id = h.textContent.trim().toLowerCase().replace(/\s/g, '_');
	});

	$$('.title-goto-wrapper').forEach(function (btn) {
		btn.addEventListener('click', function () {
			$$('.fa', btn).forEach(function (i) { i.classList.toggle('fa-angle-up'); i.classList.toggle('fa-angle-down'); });
			$$('.menu-toc').forEach(function (m) { m.classList.toggle('hidden'); });
		});
	});

	if (window.tocbot && document.querySelector('.menu-toc')) {
		window.tocbot.init({ tocSelector: '.menu-toc', contentSelector: '.article-content-main', headingSelector: 'h2,h3' });
	}

	$$('.aside-content-blog .nav-category .open_mnu').forEach(function (icon) {
		icon.addEventListener('click', function () {
			icon.classList.toggle('cls_mn');
			if (icon.nextElementSibling && window.slideToggle) window.slideToggle(icon.nextElementSibling, 400);
		});
	});
})();
