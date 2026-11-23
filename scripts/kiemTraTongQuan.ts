import assert from 'node:assert/strict'
import { cungGioHomQua, gioPhieu, tienDo } from '../src/lib/tongQuan'

const ts = (ms: number) => ({ toMillis: () => ms })
const bayGio = Date.parse('2026-11-23T03:00:00Z') // 10:00 sáng VN
const homQua = (h: number) => Date.parse('2026-11-22T00:00:00Z') + h * 3600_000 // h giờ UTC hôm qua
assert.equal(gioPhieu({ GioMay: 5, TaoLuc: ts(9) }), 5)
assert.equal(gioPhieu({ GioMay: 0, TaoLuc: ts(9) }), 9)
assert.equal(gioPhieu({}), null)
const ds = [{ id: 'sang', GioMay: homQua(2) }, { id: 'dung', GioMay: homQua(3) }, { id: 'chieu', GioMay: homQua(8) }, { id: 'server', TaoLuc: ts(homQua(9)) }, { id: 'khong' }]
assert.deepEqual(cungGioHomQua(ds, bayGio).map((x) => x.id), ['sang', 'dung', 'khong'])
assert.deepEqual(tienDo(['a', 'b', 'c'], new Set(['a', 'c', 'x'])), { xong: 2, tong: 3 })
console.log('kiemTraTongQuan: OK')
