import assert from 'node:assert/strict'
import { doiThuTu, luaChonXe, kiemTraToXe, nguoiBiTrung, soChuyenTiepTheo, tongTheoDonVi, toXeGanNhat, type Chuyen } from '../src/lib/dieuPhoi'

assert.equal(soChuyenTiepTheo([], 'x1'), 1)
assert.equal(soChuyenTiepTheo([{ XeId: 'x1', SoChuyen: 1 }, { XeId: 'x2', SoChuyen: 3 }, { XeId: 'x1', SoChuyen: 2 }], 'x1'), 3)

assert.equal(kiemTraToXe('a', ['b', 'c']), null)
assert.match(kiemTraToXe('', [])!, /tài xế/)
assert.match(kiemTraToXe('a', ['a'])!, /đồng thời/)
assert.match(kiemTraToXe('a', ['b', 'b'])!, /hai lần/)
assert.match(kiemTraToXe('a', ['b', 'c', 'd', 'e'])!, /Tối đa 3/)

const ng = (uid: string) => ({ uid, HoTen: uid })
const c1 = { TaiXe: ng('a'), PhuXe: [ng('b')], TrangThai: 'LapKeHoach' as const, BienSo: '51C-1', SoChuyen: 1 }
const c2 = { ...c1, TaiXe: ng('d'), PhuXe: [], TrangThai: 'HoanThanh' as const, SoChuyen: 2 }
assert.deepEqual(nguoiBiTrung(['b', 'd', 'z'], [c1, c2]), [{ uid: 'b', o: '51C-1 · C1' }])

const d = (DonVi: string, SoLuong: number) => ({ SanPhamId: DonVi, Ten: DonVi, DonVi, CoVo: false, SoLuong, DonGia: 0 })
assert.deepEqual(tongTheoDonVi([[d('Bình', 5), d('Thùng', 2)], [d('Bình', 3)]]), { Bình: 8, Thùng: 2 })

assert.deepEqual(doiThuTu(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c'])
assert.deepEqual(doiThuTu(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b'])
assert.deepEqual(doiThuTu(['a', 'b', 'c'], 0, -1), ['a', 'b', 'c'])
assert.deepEqual(doiThuTu(['a', 'b', 'c'], 2, 1), ['a', 'b', 'c'])

const ch = (Ngay: string, SoChuyen: number, tx: string, TrangThai: Chuyen['TrangThai'] = 'HoanThanh') =>
  ({ XeId: 'x1', Ngay, SoChuyen, TaiXe: ng(tx), PhuXe: [], TrangThai })
assert.equal(toXeGanNhat([ch('2026-11-18', 1, 'a'), ch('2026-11-19', 1, 'b'), ch('2026-11-19', 2, 'c'), ch('2026-11-20', 1, 'z', 'Huy')], 'x1')!.TaiXe.uid, 'c')
assert.equal(toXeGanNhat([ch('2026-11-18', 1, 'a')], 'x2'), null)

// Lựa chọn "Xe giao" trong form đơn.
{
  const xe = [{ id: 'b', BienSo: '51D-1' }, { id: 'a', BienSo: '51C-1', TenXe: 'Hino' }]
  const cs = [
    { id: 'c2', XeId: 'a', BienSo: '51C-1', SoChuyen: 2, TrangThai: 'LapKeHoach' as const, TaiXe: { HoTen: 'Tư' } },
    { id: 'c1', XeId: 'a', BienSo: '51C-1', SoChuyen: 1, TrangThai: 'LapKeHoach' as const, TaiXe: { HoTen: 'Tư' } },
    { id: 'c3', XeId: 'b', BienSo: '51D-1', SoChuyen: 1, TrangThai: 'DaXuatKho' as const, TaiXe: { HoTen: 'Năm' } },
  ]
  assert.deepEqual(luaChonXe(xe, cs, true).map((o) => o.gt), ['c:c1', 'c:c2', 'x:b'])
  assert.equal(luaChonXe(xe, cs, true)[0].nhan, '51C-1 · C1 · Tư')
  // Sales không được gán → chỉ xe dự kiến.
  assert.deepEqual(luaChonXe(xe, cs, false).map((o) => o.gt), ['x:a', 'x:b'])
  assert.equal(luaChonXe(xe, cs, false)[0].nhan, '51C-1 · Hino (chưa có chuyến)')
}

console.log('kiemTraDieuPhoi: OK')
