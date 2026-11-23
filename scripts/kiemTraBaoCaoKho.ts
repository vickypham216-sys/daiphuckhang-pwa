import assert from 'node:assert/strict'
import { bienDongTu, canVo, haoHut, xnt } from '../src/lib/baoCaoKho'

// Cân vỏ
const c = canVo('b', { Day: 70, VoRong: 20 }, [{ Hang: { b: 9, t: 2 }, VoRong: { b: 15 } }, { Hang: { b: 1 } }],
  [{ NoVo: { b: 3 }, CocVo: { b: 2 } }, { NoVo: { b: -1 } }], [{ SanPhamId: 'b', SoVo: 10 }, { SanPhamId: 't', SoVo: 99 }])
assert.deepEqual(c, { khoDay: 70, khoRong: 20, xeDay: 10, xeRong: 15, khachNo: 3, khachCoc: 2, noNCC: 10, luuHanh: 120, cuaCongTy: 110 })

// XNT — dựng lại đúng lịch sử:
// tồn 18/11: 50 đầy, 120 rỗng
// 19/11 nhập 100, trả NCC 90 vỏ → 150 / 30
// 20/11 xuất 25 → 125 / 30 ; xe về trả 15 đầy + 14 vỏ → 140 / 44
// 21/11 điều chỉnh 140→138 đầy, 44→45 rỗng
// 22/11 xuất 30 → 108 / 45 (hiện tại)
const bd = bienDongTu(
  [{ Ngay: '2026-11-19', Dong: [{ SanPhamId: 'b', SoLuong: 100, VoTra: 90 }] }],
  [{ Ngay: '2026-11-20', Dong: [{ SanPhamId: 'b', SoLuong: 25 }] }, { Ngay: '2026-11-22', Dong: [{ SanPhamId: 'b', SoLuong: 30 }] }],
  [{ Ngay: '2026-11-20', DeLai: false, Dem: { Day: { b: 15 }, VoRong: { b: 14 } } }, { Ngay: '2026-11-20', DeLai: true, Dem: { Day: { b: 99 }, VoRong: {} } }],
  [{ ngay: '2026-11-21', SanPhamId: 'b', Truoc: { Day: 140, VoRong: 44 }, Sau: { Day: 138, VoRong: 45 } }],
)
const hien = { Day: 108, VoRong: 45 }
assert.deepEqual(xnt('b', hien, bd, '2026-11-19', '2026-11-20'), {
  dauDay: 50, nhap: 100, xuat: 25, traVe: 15, dieuChinhDay: 0, cuoiDay: 140,
  dauRong: 120, voTraNCC: 90, voVe: 14, dieuChinhRong: 0, cuoiRong: 44,
})
assert.deepEqual(xnt('b', hien, bd, '2026-11-21', '2026-11-22'), {
  dauDay: 140, nhap: 0, xuat: 30, traVe: 0, dieuChinhDay: -2, cuoiDay: 108,
  dauRong: 44, voTraNCC: 0, voVe: 0, dieuChinhRong: 1, cuoiRong: 45,
})
assert.equal(xnt('b', hien, bd, '2026-11-01', '2026-11-18').cuoiDay, 50)
assert.equal(xnt('x', undefined, bd, '2026-11-01', '2026-11-30').cuoiDay, 0)

assert.deepEqual(haoHut([{ ChenhLech: { Day: { b: -1 }, VoRong: { b: -2 } } }, { ChenhLech: { Day: {}, VoRong: {} } }, { ChenhLech: { Day: { b: 1 }, VoRong: {} } }]),
  { day: { b: 0 }, voRong: { b: -2 }, soChuyenLech: 2 })
console.log('kiemTraBaoCaoKho: OK')
