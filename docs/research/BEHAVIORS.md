# Behaviors Bible — trieuques.com

Extracted from live theme CSS (`main.scss.css`) and inline page `<script>` (view-source, not obfuscated).

## 1. Sticky header (scroll-driven)
Source: inline script in page `<head>` area.
```js
const header = document.querySelector('header.header');
let headerHeight = header.offsetHeight;   // full header height incl. topbar
let offsetStickyDown = 0;

function handleScroll() {
  const scrollTop = window.scrollY;
  if (scrollTop > offsetStickyHeader && scrollTop > offsetStickyDown) {
    header.classList.add('hSticky');
  }
  if (scrollTop <= offsetStickyDown && scrollTop <= offsetStickyHeader) {
    header.classList.remove('hSticky');
  }
  offsetStickyDown = scrollTop;
}
```
CSS when `.hSticky` present:
- `.main-header { position:fixed; top:0; left:0; width:100%; z-index:99; box-shadow:0 0 10px rgba(0,0,0,.2); animation: fadeInDown .4s both; }`
- `.header-menu { position:fixed; top:0; left:0; width:100%; z-index:99; box-shadow:0 0 10px rgba(0,0,0,.2); animation: fadeInDown .4s both; border-top:0 }`
- Both are fixed at `top:0` simultaneously — since `.header-menu` (nav bar) comes later in DOM it visually sits on top, so only the dark-green nav bar appears pinned; the topbar+logo row is hidden behind it. **Net visible effect:** after scrolling past the header's natural height, only the green nav row remains, pinned, with a shadow and a fade-down entrance animation.
- Search bar hides when sticky: `.hSticky .main-header .header_tim_kiem{display:none}` (desktop only — not directly relevant since main-header is hidden anyway on desktop, but matters if replicating partial-sticky).
- Our clone: simplify to "nav bar becomes fixed top:0 with shadow + slide/fade-down animation once scrollY exceeds the original header block height"; remove nav from normal flow (reserve spacer height to avoid content jump).

## 2. Announcement ticker (topbar, time-driven)
- 3 promo messages, only one visible at a time (`.promo-item.see-block` visible, others `.see-none` display:none).
- Rotates via JS adding/removing `.see-block`/`.see-none` + `.flipInX` class which triggers `animation: fadeIn 1s` (despite the class name flipInX, actual CSS keyframe used is fadeIn).
- Bell icon left of ticker has `animation: bell 2.2s linear infinite` (wobble/ring loop), transform-origin 50% 0%.
- Interval not found in minified bundle; typical value ~4s. Clone uses 4s interval, fade transition ~500ms.

## 3. Mobile off-canvas menu (click-driven, <991px)
- Trigger: hamburger button (`.menu-icon`) in header-right, white 32x32 SVG icon.
- Drawer: `.header-menu` — `position:fixed; top:0; left:0; width:280px; background:#fff; transform:translateX(-310px); visibility:hidden; transition: transform .5s cubic-bezier(.645,.045,.355,1), visibility .5s;`. Adding `.current` → `transform:translateX(0); visibility:visible`.
- Dark overlay behind it: `.mobile-nav-overflow.open { position:fixed; inset:0; width:100vw; height:100vh; background:rgba(0,0,0,.6); z-index:999 }`.
- Drawer header (`.title_menu`, bg = mainColor `#062c21`) contains 2 tabs: **"Danh mục"** and **"Menu"** (`#tabs-menu-mb li.tab-link`, click swaps `.tab-content-mb.active`). Default active = "Danh mục" (category list) on mobile init.
- Close button `.close-mb-menu`: black square, CSS-drawn X via two rotated pseudo-elements (45deg/-135deg), positioned just outside the drawer's right edge (`left:100%`).
- Category list items with children show a `.down_icon` (list icon) that rotates 90deg on `.current` and toggles `display:none/block` on the nested `.menu-child` submenu — **accordion, not navigation** (click doesn't follow the link, it expands).
- Bottom of drawer: `.list-menu-account` — quick links (Hot deal, Yêu thích, Cửa hàng, Hotline) each with icon.

## 4. Desktop nav dropdowns (hover-driven, ≥992px)
- 6 top-level items: Trang chủ, Giới Thiệu▾, Chính Sách▾, Nhượng Quyền, Liên hệ▾, Gia Công Yến▾ (this last one is cut off behind the "Hot deal" badge in the header if the viewport is narrow — nav row uses `overflow` + prev/next scroll-arrows `#prev`/`#next` (`.control-menu`) that appear when items overflow).
- Items with children (`.has-childs`) show a `.dropdown-menu` panel on `:hover` (desktop): fades/slides in, `opacity:1;visibility:visible`, positioned `top:calc(100% + Npx)`.
- Sub-dropdown content real data:
  - Giới Thiệu → Về Sản Phẩm, Về Doanh Nghiệp
  - Chính Sách → Chính Sách Tuyển Đại Lý/NPP, Nhượng Quyền Thương Hiệu Chi Nhánh, Chính Sách Doanh Nghiệp
  - Liên hệ → Hướng dẫn mua hàng trên website, Liên Hệ
  - Gia Công Yến → Gia Công Yến Tự Sôi, Gia Công Bánh Yến, Gia Công Cháo Yến, Gia Công Yến Sấy Thăng Hoa, Gia Công Yến Hũ Nguyên Chất 100% (new), Gia Công Yến Tiệt Trùng (%)
- "DANH MỤC SẢN PHẨM" button (left of nav) opens a mega category panel on click, 8 categories each with an icon (`index-cate-icon-1..8.png`) — real categories: SET HỘP QUÀ CAO CẤP, TỔ YẾN THƯỢNG PHẨM, YẾN TỰ SÔI (Bát Trân Ngự Thiện), YẾN SẤY THĂNG HOA (Bát Trân Hoàng Dược), YẾN HŨ CHƯNG SẴN (Thượng Vị Yến), SET QUÀ TẾT 2026, YẾN CHƯNG THƯỢNG PHẨM (Bạch Ngọc Chân Yến), CHÁO YẾN ĂN LIỀN.

## 5. Search bar (focus-driven suggestions)
- Input focus opens `.search-suggest` panel: "Tìm kiếm gần đây" (recent, from localStorage, hidden if empty) + "Đề xuất phổ biến" (12 static popular search terms).

## 6. Hero slider (time + click-driven)
- Swiper carousel, 5 slides, `<picture>` with responsive `srcset` per breakpoint (1200/992/569/480). Autoplay (typical Swiper default loop), pagination dots + prev/next arrows on hover.

## 7. Product tab 1 — click-driven category swap
- 4 pills (`.tab-link.tab_cate`), one `has-content` (active, dark bg `var(--mainColor)`, light text) at a time; others tan/beige inactive bg. Click swaps the product grid content below (AJAX in original; clone can pre-embed all 4 grids and toggle `display`).
- Grid has its own prev/next carousel arrows (`.grad-left`/`.grad-right` fade-mask + arrow buttons) for horizontal scroll when more products than fit.

## 8. Product card hover (desktop ≥1200px)
```
.item_product_main:hover { box-shadow: 0 1px 2px rgba(60,64,67,.1), 0 2px 6px 2px rgba(60,64,67,.15); }
.item_product_main:hover .image_thumb img { transform: scale(1.03); }
.item_product_main:hover .action-button .btn-circle { opacity: 1; }  /* wishlist heart reveal */
```
- Also observed live: on hover, a "Tùy chọn" (options) button + heart/wishlist icon fade in over the price row, and the product title color shifts from dark to the gold accent (`--subColor #977e60`).

## 9. Testimonials carousel
- Swiper, prev/next arrow buttons only visible on container `:hover` (opacity 0→1 transition), positioned mid-height over the slide edges.

## 10. Coupon "Copy mã"
- Click → copies code to clipboard, shows a small toast/alert (`#js-global-alert`, `.alert.alert-success`, fixed top:5% right:15px, bg `#d4edda`, fades in/out).

## 11. Promo popup (time + storage driven)
```js
if (!isPopupClosed()) {           // localStorage.popupClosedDate === today (Asia/Ho_Chi_Minh)?
  setTimeout(() => modalPopup.show(), 1000);  // data-delay="1000"
}
// closing (X button, overlay click, or clicking the banner) + checkbox checked
//   -> localStorage.setItem('popupClosedDate', todayString)
```
- Popup content is a **single 1080×1080 image** (`popup_banner.jpg`) wrapped in a link — no real text DOM, the whole design (headline, model photo, "FREESHIP" badge) is baked into the image. Checkbox "Không hiển thị hôm nay" + close X (custom CSS X, black square button) + click-outside-to-close.

## 12. Back-to-top
- `.backtop` fixed bottom-right diamond button, `.show` class toggled by scroll position (visible after ~300-400px scroll typical), smooth-scrolls to top on click. On mobile (<767px) repositioned to `bottom:130px` to sit above the chat bubble.

## 13. Chat bubble
- Fixed bottom-right circular button, decorative icon-cycle animation (phone-call → Zalo → Messenger placeholder observed while scrolling in this session). Treated as a static icon button in the clone (no real chat backend); icon can gently pulse.

## Colors & type (confirmed via computed styles + CSS vars)
- `--mainColor: #062c21` (deep green, buttons/accents)
- Header/nav actual background: `#044033` (topbar, `.header-menu`)
- `--subColor: #977e60` (gold/tan accent — links, active states, prices, borders)
- Body text: `#333333`
- Page background: `#e8e5e2` (warm off-white)
- Fonts: **Montserrat** (body/UI, weights 400/600/700) + **Roboto Slab** (headings, serif) — both loaded as Google Fonts equivalents.
