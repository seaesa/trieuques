"""Write descriptions for products whose description on the original is "Nội dung sản phẩm đang cập nhật."

- The Collagen X2 combo reuses the brand's own description of the single Collagen X2 jar.
- The Bạch Ngọc Chân Yến jars follow the section layout the brand uses for its jar products
  (Thượng Vi Yến), with flavour-specific wording and without health claims.
Output: content/products/<handle>.html
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import build  # noqa: E402

ROOT = build.ROOT
OUT = os.path.join(ROOT, 'content', 'products')

BACH_NGOC = {
    '100-nguyen-ban-bach-ngoc-chan-yen-duong-phen-100ml': ('NGUYÊN BẢN', 'Đường Phèn',
        'Hương vị nguyên bản quen thuộc: yến chưng cùng đường phèn cho vị ngọt thanh, dịu nhẹ, giữ trọn mùi thơm đặc trưng của tổ yến.'),
    '100-an-duong-bach-ngoc-chan-yen-duong-an-kieng-100ml': ('AN ĐƯỜNG', 'Đường Ăn Kiêng',
        'Phiên bản dùng đường ăn kiêng, phù hợp với người cần hạn chế đường trong khẩu phần hằng ngày mà vẫn muốn thưởng thức yến sào.'),
    '100-gung-cang-gia-cang-cay-bach-ngoc-chan-yen-vi-gung-tuoi-100ml': ('TINH GỪNG NGỰ ÔN', 'Gừng Tươi',
        'Vị gừng tươi ấm nồng hòa quyện cùng sợi yến mềm, dễ chịu và thích hợp dùng vào những ngày se lạnh.'),
    '100-ngoc-sam-vuong-khi-bach-ngoc-chan-yen-vi-nhan-sam-100ml': ('NGỌC SÂM VƯỢNG KHÍ', 'Nhân Sâm',
        'Sự kết hợp giữa yến sào và nhân sâm, hậu vị đậm đà, là lựa chọn được nhiều khách hàng yêu thích để bồi bổ hoặc biếu tặng.'),
    '100-dong-trung-khang-sinh-bach-ngoc-chan-yen-dong-trung-100ml': ('ĐÔNG TRÙNG KHANG SINH', 'Đông Trùng',
        'Yến chưng kết hợp đông trùng hạ thảo, hương vị thanh nhẹ, là món quà sức khỏe ý nghĩa dành cho người thân.'),
    '100-tu-quy-phi-bach-ngoc-chan-yen-tu-vi-100ml': ('TỨ QUÝ PHI', 'Tứ Vị',
        'Công thức Tứ Vị kết hợp hài hòa các nguyên liệu truyền thống cùng yến sào, vị thanh mát, dễ dùng cho cả gia đình.'),
}

COMMON = '''<p><strong>CHẤT LƯỢNG SẢN PHẨM</strong></p>
<ul>
<li><strong>Bạch Ngọc Chân Yến</strong> là dòng yến chưng thượng phẩm của <strong>TRIỀU QUẾ'S Thượng Đỉnh Yến</strong>, được chế biến từ tổ yến thiên nhiên tuyển chọn.</li>
<li>Quy trình sản xuất hoàn toàn bằng dây chuyền, máy móc hiện đại tại nhà máy Triều Quế Thượng Đỉnh.</li>
<li>Sợi yến mềm, giữ được mùi thơm đặc trưng; mỗi hũ 100ml tiện lợi, mở nắp là dùng ngay.</li>
</ul>
<p><strong>ĐỐI TƯỢNG SỬ DỤNG</strong></p>
<ul>
<li>Người lớn tuổi, phụ nữ, người mới ốm dậy, trẻ em trên 1 tuổi.</li>
<li>Người làm việc căng thẳng, người vận động thể lực, người muốn bổ sung dinh dưỡng hằng ngày.</li>
</ul>
<p><strong>HƯỚNG DẪN SỬ DỤNG</strong></p>
<ul>
<li>Lắc nhẹ trước khi mở nắp, dùng trực tiếp; ngon hơn khi để mát.</li>
<li>Dùng 1 hũ mỗi ngày, tốt nhất vào buổi sáng khi bụng đói hoặc trước khi đi ngủ.</li>
</ul>
<p><strong>BẢO QUẢN</strong></p>
<ul>
<li>Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp.</li>
<li>Sau khi mở nắp nên dùng hết trong ngày.</li>
</ul>
<p>Liên hệ trực tiếp Page TRIỀU QUẾ'S • Thượng Đỉnh Yến hoặc Hotline/Zalo <a href="tel:0828321179">0828 32 11 79</a> để được tư vấn và chăm sóc nhanh nhất.</p>
'''


def bach_ngoc(name, flavour, note):
    return (f'<p><strong>[100%] {name} | BẠCH NGỌC CHÂN YẾN</strong> – Yến Chưng Thượng Phẩm vị {flavour}</p>\n'
            f'<p>Dung tích: 100ml</p>\n<p>{note}</p>\n' + COMMON)


def collagen_combo():
    raw = open(os.path.join(build.RAW, 'thuong-vi-yen-collagen-x2.html'), encoding='utf-8').read()
    content = build.product_json(raw).get('content') or ''
    head = ('<p><strong>COMBO MUA 8 TẶNG 1 – YẾN HŨ COLLAGEN X2 | THƯỢNG VI YẾN 70ML</strong></p>\n'
            '<p>Mua 8 hũ Thượng Vi Yến Collagen X2 được tặng thêm 1 hũ cùng loại.</p>\n')
    return head + content


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for handle, args in BACH_NGOC.items():
        open(os.path.join(OUT, handle + '.html'), 'w', encoding='utf-8').write(bach_ngoc(*args))
        print('wrote', handle)
    open(os.path.join(OUT, 'combo-collagen-x2-mua-8-tang-1.html'), 'w', encoding='utf-8').write(collagen_combo())
    print('wrote combo-collagen-x2-mua-8-tang-1')
