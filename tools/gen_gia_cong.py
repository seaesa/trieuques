"""Write the content fragments for the "Gia công ..." (contract manufacturing) pages.

The original pages only carry a hotline line (or "Nội dung đang cập nhật."). The text below is
written from facts published elsewhere on the site (company, factory, awards, product lines) and
reuses the site's own factory photos. Output: content/pages/<slug>.html
"""
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
IMG = '/images/files/'
FACTORY = [
    ('5b7a52d95a80e2debb9187-ab57b879-28bc-4c46-8615-d3aec7364407.jpg', 'Công nghệ hiện đại'),
    ('5f5c17271e7ea620ff6f91-22913acb-3097-4e97-999c-8e3418f7bdf4.jpg', 'Đội ngũ chuyên gia chuyên nghiệp'),
    ('288f5fd85681eedfb79090-8ceb3acd-8762-4498-9c77-4ca8b4a34323.jpg', 'An toàn vệ sinh thực phẩm'),
    ('965aabada3f41baa42e589-e452a4b5-af07-450a-9dcc-999660bd6822.jpg', 'Nguồn nguyên liệu chất lượng'),
    ('c4ddc85ac103795d201292-b3273c52-b50d-486f-b212-c0777051de5a.jpg', 'Quy trình kiểm định nghiêm ngặt'),
    ('4c44be90b6c90e9757d888-63005560-cd07-4852-8903-91f2724fb7bd.jpg', 'Chính sách hỗ trợ khách hàng'),
]

PAGES = {
    'gia-cong-yen-tu-soi': dict(
        name='Yến Tự Sôi',
        intro='dòng sản phẩm yến chén tự sôi tiện lợi: chỉ cần kích hoạt túi gia nhiệt đi kèm là có ngay chén yến nóng hổi, không cần bếp, không cần điện',
        points=['Công thức chén yến tự sôi đã được hoàn thiện qua dòng sản phẩm <strong>Bát Trân Ngự Thiện</strong> với nhiều hương vị: đường phèn, tứ vị, đông trùng, nhân sâm, gừng, sầu riêng, gà hầm, bào ngư, hải sâm, sò điệp…',
                'Tùy chọn hương vị, thành phần và quy cách đóng gói (chén lẻ, set quà, hộp quà biếu) theo định hướng thương hiệu của bạn.'],
        link=('/yen-tu-soi-bat-tran-ngu-thien', 'YẾN TỰ SÔI (Bát Trân Ngự Thiện)')),
    'gia-cong-banh-yen': dict(
        name='Bánh Yến',
        intro='các dòng bánh có bổ sung yến sào, phù hợp làm quà biếu, quà tặng doanh nghiệp và sản phẩm bán lẻ',
        points=['Nguyên liệu yến sào được tuyển chọn và sơ chế tại nhà máy Triều Quế, đảm bảo nguồn gốc rõ ràng.',
                'Tư vấn công thức, hình thức bánh và bao bì theo phân khúc khách hàng mà bạn hướng tới.'],
        link=('/set-qua-tang-thuong-vy-yen', 'SET HỘP QUÀ CAO CẤP')),
    'gia-cong-chao-yen': dict(
        name='Cháo Yến',
        intro='cháo yến ăn liền với phôi cháo và yến sào, tiện lợi cho bữa sáng và bữa phụ',
        points=['Công thức cháo yến đã được Triều Quế ứng dụng trong dòng <strong>Cháo Yến Tươi</strong> với các vị hải sản, bào ngư…',
                'Tùy chọn hương vị, định lượng yến và quy cách đóng gói (chén, gói, hộp) theo nhu cầu.'],
        link=('/chao-yen-an-lien', 'CHÁO YẾN ĂN LIỀN')),
    'gia-cong-yen-say-thang-hoa': dict(
        name='Yến Sấy Thăng Hoa',
        intro='yến sấy thăng hoa: yến sau khi chưng được sấy lạnh để giữ trọn hương vị và dưỡng chất, bảo quản lâu và pha dùng nhanh',
        points=['Công nghệ sấy thăng hoa đã được Triều Quế ứng dụng trong dòng <strong>Bát Trân Hoàng Dược</strong>: chỉ cần thêm nước nóng là có ngay chén yến.',
                'Tùy chọn hương vị, trọng lượng và bao bì (chén, hũ, hộp quà) theo định hướng thương hiệu.'],
        link=('/bat-tran-hoang-duoc-yen-say-thang-hoa', 'YẾN SẤY THĂNG HOA (Bát Trân Hoàng Dược)')),
    'gia-cong-yen-hu-nguyen-chat-100': dict(
        name='Yến Hũ Nguyên Chất 100%',
        intro='yến chưng hũ nguyên chất 100% từ tổ yến thiên nhiên, dành cho phân khúc cao cấp và quà biếu',
        points=['Dòng yến chưng thượng phẩm <strong>Bạch Ngọc Chân Yến</strong> của Triều Quế là minh chứng cho chất lượng yến hũ nguyên chất: đường phèn, đường ăn kiêng, gừng tươi, nhân sâm, đông trùng, tứ vị.',
                'Tùy chọn dung tích, hương vị và thiết kế hũ, hộp quà theo nhận diện thương hiệu của bạn.'],
        link=('/yen-chung-thuong-pham-bach-ngoc-chan-yen', 'YẾN CHƯNG THƯỢNG PHẨM (Bạch Ngọc Chân Yến)')),
    'gia-cong-yen-tiet-trung': dict(
        name='Yến Tiệt Trùng (%)',
        intro='yến chưng hũ tiệt trùng với tỷ lệ yến sào theo yêu cầu, bảo quản ở nhiệt độ thường và dễ dàng phân phối',
        points=['Dòng yến hũ <strong>Thượng Vi Yến</strong> (70ml) của Triều Quế được chế biến từ tổ yến thiên nhiên, lượng yến sào chiếm 30% trọng lượng, với nhiều vị: đường phèn, gừng, hạt sen, saffron, đông trùng, nhân sâm, collagen x2, Kids Grow Plus+…',
                'Tùy chọn tỷ lệ yến, hương vị, dung tích và thiết kế hũ, lốc, hộp theo phân khúc sản phẩm của bạn.'],
        link=('/thuong-vy-yen', 'YẾN HŨ CHƯNG SẴN (Thượng Vi Yến)')),
}

STEPS = [
    ('Tiếp nhận yêu cầu & tư vấn', 'Lắng nghe nhu cầu về sản phẩm, phân khúc khách hàng, số lượng và thời gian để tư vấn phương án phù hợp.'),
    ('Nghiên cứu & thử mẫu', 'Đội ngũ chuyên gia xây dựng công thức, hoàn thiện mẫu thử để khách hàng trải nghiệm và điều chỉnh.'),
    ('Thiết kế bao bì & hồ sơ', 'Hỗ trợ thiết kế bao bì, nhãn mác và hoàn thiện hồ sơ công bố sản phẩm theo quy định.'),
    ('Sản xuất', 'Sản xuất trên dây chuyền, máy móc hiện đại tại nhà máy Triều Quế Thượng Đỉnh.'),
    ('Kiểm định chất lượng', 'Mỗi lô hàng đều được kiểm tra theo quy trình nghiêm ngặt trước khi xuất xưởng.'),
    ('Đóng gói & bàn giao', 'Đóng gói theo quy cách đã thống nhất và bàn giao sản phẩm đúng hẹn.'),
]


def page(slug, d):
    pairs = [FACTORY[i:i + 2] for i in range(0, 6, 2)]
    imgs = '\n'.join('<p style="text-align: center;">' + ' '.join(
        f'<img src="{IMG}{f}" alt="{alt}" width="480" height="402" loading="lazy">' for f, alt in pair) + '</p>' for pair in pairs)
    steps = '\n'.join(f'<li><strong>{t}:</strong> {x}</li>' for t, x in STEPS)
    points = '\n'.join(f'<li>{p}</li>' for p in d['points'])
    return f'''<p><strong>TRIỀU QUẾ'S Thượng Đỉnh Yến</strong> nhận gia công <strong>{d['name']}</strong> theo yêu cầu cho cá nhân, cửa hàng và doanh nghiệp muốn phát triển thương hiệu riêng: {d['intro']}.</p>
<p>Sau hơn 06 năm hình thành, nghiên cứu và phát triển ngành yến sào, Công ty TNHH SX &amp; TM Triều Quế Thượng Đỉnh đã vinh dự nhận danh hiệu <strong>TOP 10 "Thương hiệu mạnh Quốc Gia 2024"</strong> và <strong>"Thương hiệu mạnh ASEAN 2025"</strong>. Toàn bộ kinh nghiệm sản xuất ấy được mang vào từng đơn hàng gia công.</p>
<h2>Vì sao chọn gia công {d['name']} tại Triều Quế?</h2>
<ul>
{points}
<li>Nhà máy ứng dụng công nghệ hiện đại, quy trình sản xuất và kiểm định nghiêm ngặt, đảm bảo an toàn vệ sinh thực phẩm.</li>
<li>Đội ngũ chuyên gia đồng hành từ khâu lên ý tưởng đến khi sản phẩm hoàn thiện.</li>
</ul>
{imgs}
<h2>Quy trình gia công</h2>
<ol>
{steps}
</ol>
<h2>Sản phẩm tham khảo</h2>
<p>Tham khảo chất lượng sản phẩm thực tế của Triều Quế tại danh mục <a href="{d['link'][0]}" title="{d['link'][1]}">{d['link'][1]}</a>.</p>
<p><strong>Liên hệ Hotline/Zalo: <a href="tel:0828321179">0828 32 11 79</a></strong> để được tư vấn chi tiết về quy cách, số lượng và báo giá gia công.</p>
'''


if __name__ == '__main__':
    for slug, d in PAGES.items():
        with open(os.path.join(ROOT, 'content', 'pages', slug + '.html'), 'w', encoding='utf-8') as fh:
            fh.write(page(slug, d))
        print('wrote', slug)
