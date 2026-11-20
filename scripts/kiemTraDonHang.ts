import assert from 'node:assert/strict'
import { hienNgay, kiemTraDon, ngayVN, tomTatDong, tongTien, type DongDon } from '../src/lib/donHang'

// 23:30 giờ VN ngày 20/11 = 16:30 UTC — vẫn là ngày 20 ở VN.
const luc = new Date('2026-11-20T16:30:00Z')
assert.equal(ngayVN(0, luc), '2026-11-20')
assert.equal(ngayVN(1, luc), '2026-11-21')
// 00:30 giờ VN ngày 21 = 17:30 UTC ngày 20.
assert.equal(ngayVN(0, new Date('2026-11-20T17:30:00Z')), '2026-11-21')
assert.equal(hienNgay('2026-11-21'), 'T7 21/11')
assert.equal(hienNgay('2026-11-22'), 'CN 22/11')
assert.equal(hienNgay('2026-11-23'), 'T2 23/11')

const binh: DongDon = { SanPhamId: 'a', Ten: 'Bình 20L', DonVi: 'Bình', CoVo: true, SoLuong: 5, DonGia: 25000 }
const thung: DongDon = { SanPhamId: 'b', Ten: 'Thùng 500ml', DonVi: 'Thùng', CoVo: false, SoLuong: 2, DonGia: 90000 }
assert.equal(tongTien([binh, thung]), 305000)
assert.equal(tomTatDong([binh, thung]), 'Bình 20L × 5, Thùng 500ml × 2')

const hn = '2026-11-20'
assert.equal(kiemTraDon({ KhachHangId: 'k', NgayGiao: '2026-11-21', Dong: [binh] }, hn), null)
assert.equal(kiemTraDon({ KhachHangId: 'k', NgayGiao: hn, Dong: [binh] }, hn), null)
assert.match(kiemTraDon({ KhachHangId: '', NgayGiao: hn, Dong: [binh] }, hn)!, /khách/)
assert.match(kiemTraDon({ KhachHangId: 'k', NgayGiao: '2026-11-19', Dong: [binh] }, hn)!, /đã qua/)
assert.match(kiemTraDon({ KhachHangId: 'k', NgayGiao: hn, Dong: [] }, hn)!, /Chưa có sản phẩm/)
assert.match(kiemTraDon({ KhachHangId: 'k', NgayGiao: hn, Dong: [{ ...binh, SoLuong: 1.5 }] }, hn)!, /số nguyên/)
assert.match(kiemTraDon({ KhachHangId: 'k', NgayGiao: hn, Dong: [{ ...binh, SoLuong: 50000 }] }, hn)!, /quá lớn/)
assert.match(kiemTraDon({ KhachHangId: 'k', NgayGiao: hn, Dong: [{ ...binh, DonGia: -1 }] }, hn)!, /đơn giá/)

console.log('kiemTraDonHang: OK')
