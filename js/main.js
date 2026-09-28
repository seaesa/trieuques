document.addEventListener('DOMContentLoaded', function () {

	/* ===================== Reveal on scroll ===================== */
	var revealEls = document.querySelectorAll('.reveal');
	var revealObserver = new IntersectionObserver(function (entries) {
		entries.forEach(function (entry) {
			if (entry.isIntersecting) {
				entry.target.classList.add('in-view');
				revealObserver.unobserve(entry.target);
			}
		});
	}, { threshold: 0.15 });
	revealEls.forEach(function (el) { revealObserver.observe(el); });

	/* ===================== Sticky header ===================== */
	var header = document.getElementById('siteHeader');
	var nav = document.getElementById('headerNav');
	var headerHeight = header.offsetHeight;
	window.addEventListener('resize', function () {
		if (!header.classList.contains('is-sticky')) headerHeight = header.offsetHeight;
	});
	function setNavHeightVar() {
		document.documentElement.style.setProperty('--nav-h', nav.offsetHeight + 'px');
	}
	setNavHeightVar();
	window.addEventListener('scroll', function () {
		if (window.scrollY > headerHeight) {
			header.classList.add('is-sticky');
		} else {
			header.classList.remove('is-sticky');
		}
	}, { passive: true });

	/* ===================== Announcement ticker ===================== */
	var promoItems = document.querySelectorAll('#promoTicker .promo-item');
	var promoIndex = 0;
	if (promoItems.length > 1) {
		setInterval(function () {
			promoItems[promoIndex].classList.remove('is-active');
			promoIndex = (promoIndex + 1) % promoItems.length;
			promoItems[promoIndex].classList.add('is-active');
		}, 4000);
	}

	/* ===================== Search focus suggestions ===================== */
	var searchForm = document.getElementById('searchForm');
	var searchInput = document.getElementById('searchInput');
	searchInput.addEventListener('focus', function () { searchForm.classList.add('is-focused'); });
	document.addEventListener('click', function (e) {
		if (!searchForm.contains(e.target)) searchForm.classList.remove('is-focused');
	});

	/* ===================== Mobile drawer ===================== */
	var mobileMenuBtn = document.getElementById('mobileMenuBtn');
	var mobileOverlay = document.getElementById('mobileOverlay');
	var mobileDrawer = document.getElementById('mobileDrawer');
	var drawerClose = document.getElementById('drawerClose');

	function openDrawer() {
		mobileDrawer.classList.add('is-open');
		mobileOverlay.classList.add('is-open');
		document.body.style.overflow = 'hidden';
	}
	function closeDrawer() {
		mobileDrawer.classList.remove('is-open');
		mobileOverlay.classList.remove('is-open');
		document.body.style.overflow = '';
	}
	mobileMenuBtn.addEventListener('click', openDrawer);
	drawerClose.addEventListener('click', closeDrawer);
	mobileOverlay.addEventListener('click', closeDrawer);

	var drawerTabs = document.querySelectorAll('.drawer-tab');
	drawerTabs.forEach(function (tab) {
		tab.addEventListener('click', function () {
			drawerTabs.forEach(function (t) { t.classList.remove('is-active'); });
			tab.classList.add('is-active');
			document.querySelectorAll('.drawer-panel').forEach(function (p) { p.classList.remove('is-active'); });
			document.getElementById(tab.dataset.tab).classList.add('is-active');
		});
	});

	document.querySelectorAll('.has-child .drawer-expand').forEach(function (btn) {
		btn.addEventListener('click', function () {
			btn.closest('.has-child').classList.toggle('is-open');
		});
	});

	/* ===================== Category dropdown (mobile tap) ===================== */
	var categoryToggle = document.getElementById('categoryToggle');
	categoryToggle.addEventListener('click', function (e) {
		if (window.innerWidth <= 991) {
			e.preventDefault();
			categoryToggle.classList.toggle('force-open');
			var panel = document.getElementById('categoryPanel');
			panel.style.opacity = categoryToggle.classList.contains('force-open') ? '1' : '';
			panel.style.visibility = categoryToggle.classList.contains('force-open') ? 'visible' : '';
		}
	});

	/* ===================== Nav overflow arrows ===================== */
	var mainNav = document.getElementById('mainNav');
	var navPrev = document.getElementById('navPrev');
	var navNext = document.getElementById('navNext');
	function updateNavArrows() {
		var overflowing = mainNav.scrollWidth > mainNav.clientWidth + 4;
		navPrev.style.display = overflowing ? 'flex' : 'none';
		navNext.style.display = overflowing ? 'flex' : 'none';
	}
	updateNavArrows();
	window.addEventListener('resize', updateNavArrows);
	navPrev.addEventListener('click', function () { mainNav.scrollBy({ left: -150, behavior: 'smooth' }); });
	navNext.addEventListener('click', function () { mainNav.scrollBy({ left: 150, behavior: 'smooth' }); });

	/* ===================== Hero slider ===================== */
	var track = document.getElementById('sliderTrack');
	var slides = track.children;
	var dotsWrap = document.getElementById('sliderDots');
	var slideIndex = 0;
	var slideTimer;

	for (var i = 0; i < slides.length; i++) {
		var dot = document.createElement('span');
		if (i === 0) dot.classList.add('is-active');
		(function (idx) { dot.addEventListener('click', function () { goToSlide(idx); }); })(i);
		dotsWrap.appendChild(dot);
	}
	var dots = dotsWrap.children;

	function goToSlide(idx) {
		slideIndex = (idx + slides.length) % slides.length;
		track.style.transform = 'translateX(-' + (slideIndex * 100) + '%)';
		for (var d = 0; d < dots.length; d++) dots[d].classList.toggle('is-active', d === slideIndex);
	}
	function nextSlide() { goToSlide(slideIndex + 1); }
	function prevSlide() { goToSlide(slideIndex - 1); }
	function startAutoplay() { slideTimer = setInterval(nextSlide, 5000); }
	function stopAutoplay() { clearInterval(slideTimer); }

	document.getElementById('sliderNext').addEventListener('click', function () { nextSlide(); stopAutoplay(); startAutoplay(); });
	document.getElementById('sliderPrev').addEventListener('click', function () { prevSlide(); stopAutoplay(); startAutoplay(); });
	document.getElementById('heroSlider').addEventListener('mouseenter', stopAutoplay);
	document.getElementById('heroSlider').addEventListener('mouseleave', startAutoplay);
	startAutoplay();

	/* ===================== Product tab 1 pills ===================== */
	var pills = document.querySelectorAll('#pillTabs .pill');
	pills.forEach(function (pill) {
		pill.addEventListener('click', function () {
			pills.forEach(function (p) { p.classList.remove('is-active'); });
			pill.classList.add('is-active');
			document.querySelectorAll('#productTab1 .product-pane').forEach(function (pane) { pane.classList.remove('is-active'); });
			document.getElementById(pill.dataset.target).classList.add('is-active');
		});
	});

	/* ===================== Testimonial carousel ===================== */
	var fbTrack = document.getElementById('feedbackTrack');
	var fbCards = fbTrack.children;
	var fbPerView = window.innerWidth <= 767 ? 1 : (window.innerWidth <= 991 ? 2 : 3);
	var fbIndex = 0;

	function fbUpdatePerView() {
		fbPerView = window.innerWidth <= 767 ? 1 : (window.innerWidth <= 991 ? 2 : 3);
		fbIndex = 0;
		fbTrack.style.transform = 'translateX(0)';
	}
	window.addEventListener('resize', fbUpdatePerView);

	function fbGo(dir) {
		var maxIndex = Math.max(0, fbCards.length - fbPerView);
		fbIndex = Math.min(Math.max(fbIndex + dir, 0), maxIndex);
		var cardWidth = fbCards[0].getBoundingClientRect().width + 24;
		fbTrack.style.transform = 'translateX(-' + (fbIndex * cardWidth) + 'px)';
	}
	document.getElementById('fbNext').addEventListener('click', function () { fbGo(1); });
	document.getElementById('fbPrev').addEventListener('click', function () { fbGo(-1); });

	/* ===================== Countdown (flash sale) ===================== */
	var cdTarget = new Date().getTime() + (3 * 24 * 60 * 60 * 1000) + (7 * 60 * 60 * 1000);
	function updateCountdown() {
		var diff = cdTarget - new Date().getTime();
		if (diff < 0) diff = 0;
		var d = Math.floor(diff / (1000 * 60 * 60 * 24));
		var h = Math.floor((diff / (1000 * 60 * 60)) % 24);
		var m = Math.floor((diff / (1000 * 60)) % 60);
		var s = Math.floor((diff / 1000) % 60);
		document.getElementById('cdDays').textContent = String(d).padStart(2, '0');
		document.getElementById('cdHours').textContent = String(h).padStart(2, '0');
		document.getElementById('cdMinutes').textContent = String(m).padStart(2, '0');
		document.getElementById('cdSeconds').textContent = String(s).padStart(2, '0');
	}
	updateCountdown();
	setInterval(updateCountdown, 1000);

	/* ===================== Coupon copy ===================== */
	function showToast(msg) {
		var toast = document.getElementById('toast');
		toast.textContent = msg;
		toast.classList.add('show');
		clearTimeout(showToast._t);
		showToast._t = setTimeout(function () { toast.classList.remove('show'); }, 2200);
	}
	document.querySelectorAll('.coupon-copy').forEach(function (btn) {
		btn.addEventListener('click', function () {
			var code = btn.dataset.copy;
			if (navigator.clipboard) {
				navigator.clipboard.writeText(code).catch(function () {});
			}
			showToast('Đã sao chép mã ' + code);
		});
	});
	document.querySelectorAll('.coupon-info').forEach(function (btn) {
		btn.addEventListener('click', function () { showToast(btn.dataset.info); });
	});

	/* ===================== Back to top ===================== */
	var backToTop = document.getElementById('backToTop');
	window.addEventListener('scroll', function () {
		backToTop.classList.toggle('show', window.scrollY > 400);
	}, { passive: true });
	backToTop.addEventListener('click', function () {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	});

	/* ===================== Chat bubble icon cycle ===================== */
	var chatBubble = document.getElementById('chatBubble');
	setInterval(function () { chatBubble.classList.toggle('swap'); }, 3000);

	/* ===================== Promo popup ===================== */
	var popupOverlay = document.getElementById('popupOverlay');
	var popupBanner = document.getElementById('popupBanner');
	var popupClose = document.getElementById('popupClose');
	var popupCheckbox = document.getElementById('popupDontShow');
	var popupImgLink = document.getElementById('popupImgLink');

	function todayVN() {
		return new Date().toLocaleDateString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
	}
	function isPopupClosedToday() {
		try {
			return localStorage.getItem('popupClosedDate') === todayVN();
		} catch (e) { return false; }
	}
	function closePopup() {
		popupBanner.classList.remove('is-open');
		popupOverlay.classList.remove('is-open');
		if (popupCheckbox.checked) {
			try { localStorage.setItem('popupClosedDate', todayVN()); } catch (e) {}
		}
	}
	popupClose.addEventListener('click', closePopup);
	popupOverlay.addEventListener('click', closePopup);
	popupImgLink.addEventListener('click', function () {
		try { localStorage.setItem('popupClosedDate', todayVN()); } catch (e) {}
	});

	if (!isPopupClosedToday()) {
		setTimeout(function () {
			popupBanner.classList.add('is-open');
			popupOverlay.classList.add('is-open');
		}, 1000);
	}

});
