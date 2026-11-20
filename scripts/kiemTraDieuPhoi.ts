import assert from 'node:assert/strict'
import { doiThuTu, kiemTraToXe, nguoiBiTrung, soChuyenTiepTheo, tongTheoDonVi, toXeGanNhat, type Chuyen } from '../src/lib/dieuPhoi'

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

console.log('kiemTraDieuPhoi: OK')
