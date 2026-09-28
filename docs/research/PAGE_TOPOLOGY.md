# Page Topology — trieuques.com (homepage)

Source: live site rendered HTML fetched 2026-09-28 (`curl` snapshot + browser MCP inspection).
Tech: Sapo (Haravan-like) theme, jQuery + Swiper. We rebuild with plain HTML/CSS/JS — no framework.

## Global layout
- `<header class="header">` — NOT sticky by default (static flow), becomes fixed via `.hSticky` class added by scroll listener once `scrollY > header.offsetHeight`. See BEHAVIORS.md.
- `.bodywrap` — main content, sections in order below.
- `<footer class="footer">`
- `#modal-banner` — promo popup overlay (fixed, opens 1000ms after load unless closed today).
- Floating widgets: back-to-top button (bottom-right, appears after scroll), chat bubble (bottom-right, cycles between phone/zalo/messenger icons every few seconds — pure decorative animation).

## Section order (top → bottom)
1. **Header** — topbar (announcement ticker + hotline) + main-header (logo, search, account/wishlist/cart icons) + nav (category dropdown, main menu, hot-deal badge). See `components/header.spec.md`.
2. **Hero slider** (`.section_slider`) — Swiper carousel, 5 full-width slides, autoplay, arrows+dots. Real images: `images/theme/slider_1..5.jpg`.
3. **Services bar** (`.section_services`) — 4 icon+text items: Giao hàng siêu tốc / Tư vấn miễn phí / Thanh toán / Giải pháp quà tặng. Icons `images/theme/ser_1..4.png`.
4. **4-banner grid** (`.section_4_banner`) — heading + 4 tall image cards (SET QUÀ BIẾU TẶNG, SOUP YẾN TỰ SÔI, SOUP YẾN ĂN LIỀN, TỔ YẾN TINH CHẾ), hover reveals "Xem ngay »" button. Images `images/theme/img_4banner_1..4.jpg`.
5. **About / story** (`.section_about`) — dark green panel, text left + image/video right ("Câu chuyện về Triều Quế"), link to youtube video.
6. **Blog/news** (`.section_blog`) — 1 large featured post + list of smaller posts with thumbnail+title+date. 7 posts scraped.
7. **Product tab 1** (`.section_product_tab_1`) — "GIỚI THIỆU SẢN PHẨM", 4 clickable category pills (Tổ Yến Thượng Hạng / Yến Hũ Chưng Sẵn / Yến Tự Sôi / Yến Sấy Thăng Hoa) that swap the product grid — **click-driven**, not scroll. Grid shows 4 products with prev/next carousel arrows.
8. **Product tab 2** (`.section_product_tab_2`) — "Yến Tự Sôi - Bát Trân Ngự Thiện", single category, carousel of products.
9. **Product tab 3** (`.section_product_tab_3`) — "Yến Hũ Chưng Sẵn", single category, carousel.
10. **Product tab 4** (`.section_product_tab_4`) — "Yến Sấy Thăng Hoa Ăn Liền", single category, carousel.
11. **Why choose us** (`.section_why_choise`) — 6 icon+title+desc items in a row over background image.
12. **Testimonials** (`.section_feedback`) — Swiper carousel, 6 slides (avatar, name, role, quote), prev/next arrows appear on hover.
13. **Flash sale** (`.section_flash_sale`) — countdown banner; current live state shows "Chương trình đã hết hạn" (expired) — build both states, default to countdown UI with real Vietnamese labels.
14. **Coupons** (`.section_coupons`) — 4 voucher cards (code, discount text, expiry, "Copy mã" button that copies code to clipboard + toast).
15. **Brands** (`.section_brands`) — "ĐỐI TÁC CỦA CHÚNG TÔI", 8 partner logos in a row.
16. **Footer** — 4 columns (address/contact/social, Chính sách links, Hướng dẫn links, Hỗ trợ thanh toán icons + chứng nhận), bottom bar copyright.

## Interaction model summary
| Section | Model |
|---|---|
| Header sticky | scroll-driven (JS class toggle, see BEHAVIORS.md) |
| Announcement ticker | time-driven (auto-cycle, fade) |
| Mobile menu | click-driven slide-in drawer (280px, translateX) |
| Category dropdown (desktop) | hover/click dropdown |
| Nav item dropdowns | hover (desktop) / click-accordion (mobile) |
| Hero slider | time-driven autoplay + click arrows/dots |
| Product tab 1 pills | click-driven content swap |
| Product carousels (2-4) | click-driven prev/next (no autoplay observed) |
| Product card hover | hover reveals "Tùy chọn" + wishlist button, title color change, image zoom |
| Testimonials carousel | click-driven prev/next, arrows appear on container hover |
| Coupon "Copy mã" | click → clipboard + toast |
| Popup banner | time-driven (1000ms after load) + localStorage persistence for "don't show today" |
| Back-to-top | scroll-driven visibility |
| Chat bubble | time-driven icon cycle (decorative) |

## Responsive breakpoints (from theme CSS, confirmed via source not live resize)
- Bootstrap grid: `>=1200 desktop`, `992-1199 small desktop`, `768-991 tablet`, `<767 mobile`.
- **991px is the critical breakpoint**: header switches from full desktop layout (logo+search+icons+nav all inline) to mobile layout (logo left, icon cluster + hamburger right, search moves below, nav becomes off-canvas drawer).
