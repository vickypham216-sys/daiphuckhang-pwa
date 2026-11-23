import assert from 'node:assert/strict'
import { kyBaoCao, kyTruoc, phanTram, soNgay, theoMoc, tienGon, tongHop, tranTron, type PhieuBC } from '../src/lib/baoCao'

// Kỳ
assert.deepEqual(kyBaoCao('homnay', '2026-11-23'), { tu: '2026-11-23', den: '2026-11-23' })
assert.deepEqual(kyBaoCao('homqua', '2026-12-01'), { tu: '2026-11-30', den: '2026-11-30' })
assert.deepEqual(kyBaoCao('7ngay', '2026-11-23'), { tu: '2026-11-17', den: '2026-11-23' })
assert.deepEqual(kyBaoCao('thangnay', '2026-11-23'), { tu: '2026-11-01', den: '2026-11-23' })
assert.deepEqual(kyBaoCao('thangtruoc', '2026-03-10'), { tu: '2026-02-01', den: '2026-02-28' })
assert.equal(soNgay('2026-11-17', '2026-11-23'), 7)
assert.deepEqual(kyTruoc('2026-11-17', '2026-11-23'), { tu: '2026-11-10', den: '2026-11-16' })
assert.deepEqual(kyTruoc('2026-11-23', '2026-11-23'), { tu: '2026-11-22', den: '2026-11-22' })
// Tháng này (23 ngày) so với 23 ngày đầu tháng trước, không phải cả tháng
assert.deepEqual(kyTruoc('2026-11-01', '2026-11-23'), { tu: '2026-10-01', den: '2026-10-23' })
// 31/3 → so tháng 2 chỉ tới 28/2
assert.deepEqual(kyTruoc('2026-03-01', '2026-03-27'), { tu: '2026-02-01', den: '2026-02-27' })
assert.deepEqual(kyTruoc('2026-02-01', '2026-02-28'), { tu: '2026-01-04', den: '2026-01-31' })

// Tổng hợp
const d = (SoLuong: number, DonGia: number, GiaDon = DonGia, sp = 'b') =>
  ({ SanPhamId: sp, Ten: sp === 'b' ? 'Bình 20L' : 'Thùng', DonVi: sp === 'b' ? 'Bình' : 'Thùng', SoLuong, GiaDon, DonGia })
const ds: PhieuBC[] = [
  { Ngay: '2026-11-20', Dong: [d(10, 25000)], TT: { TienMat: 250000, ChuyenKhoan: 0, GhiNo: 0 }, DonId: 'd1', BienSo: 'X1', KhachHangId: 'k1', TenKhach: 'A' },
  { Ngay: '2026-11-20', Dong: [d(6, 23000, 25000), d(2, 90000, 90000, 't')], TT: { TienMat: 0, ChuyenKhoan: 418000, GhiNo: 0 }, TienCoc: 100000, DonId: 'd2', BienSo: 'X1', KhachHangId: 'k2', TenKhach: 'B' },
  { Ngay: '2026-11-21', Dong: [d(0, 25000)], TT: { TienMat: 0, ChuyenKhoan: 0, GhiNo: 0 }, KhongGiao: true, DonId: 'd3', BienSo: 'X2' },
  { Ngay: '2026-11-22', Dong: [d(3, 25000)], TT: { TienMat: 0, ChuyenKhoan: 0, GhiNo: 75000 }, TaiCho: true, DonId: null, BienSo: 'X2', KhachHangId: null, TenKhach: 'Chú Bảy' },
]
const t = tongHop(ds, (id) => ({ d1: 'Lan', d2: 'Hoa' })[id])
assert.equal(t.doanhThu, 250000 + 138000 + 180000 + 75000)
assert.equal(t.luotGiao, 3)
assert.equal(t.khongGiao, 1)
assert.equal(t.taiCho, 1)
assert.equal(t.giamGia, 12000)
assert.deepEqual(t.sanLuong, { Bình: 19, Thùng: 2 })
assert.equal(t.tienMat + t.chuyenKhoan + t.ghiNo, 250000 + 418000 + 75000)
assert.equal(t.tienCoc, 100000)
// tiền thu − cọc = doanh thu (khi không có nợ cũ / thu nợ lẫn vào)
assert.equal(t.tienMat + t.chuyenKhoan + t.ghiNo - t.tienCoc, t.doanhThu)
assert.deepEqual(t.theoSanPham.map((x) => [x.ten, x.soLuong, x.doanhThu]), [['Bình 20L', 19, 463000], ['Thùng', 2, 180000]])
assert.deepEqual(t.theoXe.map((x) => [x.ten, x.luot, x.doanhThu]), [['X1', 2, 568000], ['X2', 1, 75000]])
assert.deepEqual(t.theoSales.map((x) => x.ten), ['Hoa', 'Lan', 'Bán tại chỗ'])
assert.equal(t.theoKhach.find((x) => x.khoa.startsWith('le:'))!.ten, 'Chú Bảy (khách lẻ)')

// Theo mốc: 3 ngày, ngày không có phiếu vẫn có cột 0
const m = theoMoc(ds, '2026-11-20', '2026-11-22')
assert.deepEqual(m.map((x) => [x.nhan, x.doanhThu, x.luot]), [['20/11', 568000, 2], ['21/11', 0, 0], ['22/11', 75000, 1]])
const w = theoMoc(ds, '2026-09-01', '2026-11-30')
assert.equal(w[0].moc, '2026-08-31') // thứ Hai
assert.ok(w.every((x) => x.nhan.startsWith('tuần ')))
assert.equal(w.reduce((s, x) => s + x.doanhThu, 0), 643000)

assert.equal(tienGon(1250000), '1,25tr')
assert.equal(tienGon(500000), '500k')
assert.equal(tienGon(2e9), '2 tỷ')
assert.equal(tienGon(800), '800')
assert.equal(tranTron(643000), 1000000)
assert.equal(tranTron(230000), 250000)
assert.equal(tranTron(0), 1)
assert.equal(phanTram(120, 100), 20)
assert.equal(phanTram(80, 100), -20)
assert.equal(phanTram(5, 0), null)
console.log('kiemTraBaoCao: OK')
