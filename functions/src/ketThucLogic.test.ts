import assert from "node:assert/strict"
import { batBuocDem, chenhLech, cong, congNoTuPhieu, soPhaiCo, type PhieuTinh } from "./ketThucLogic"

const p = (x: Partial<PhieuTinh>): PhieuTinh => ({ KhachHangId: "k1", TenKhach: "A", Dong: [], Vo: [], TT: { TienMat: 0, ChuyenKhoan: 0, GhiNo: 0 }, ...x })
const ds = [
  p({ Dong: [{ SanPhamId: "b", SoLuong: 10 }], Vo: [{ SanPhamId: "b", VoThu: 10, NoVo: 0, CocVo: 0, GiaCocVo: 50000 }], TT: { TienMat: 250000, ChuyenKhoan: 0, GhiNo: 0 } }),
  p({ KhachHangId: "k2", TenKhach: "B", Dong: [{ SanPhamId: "b", SoLuong: 6 }], Vo: [{ SanPhamId: "b", VoThu: 3, NoVo: 1, CocVo: 2, GiaCocVo: 50000 }], TT: { TienMat: 0, ChuyenKhoan: 100000, GhiNo: 138000 } }),
  p({ KhachHangId: "k1", Dong: [{ SanPhamId: "b", SoLuong: 2 }, { SanPhamId: "t", SoLuong: 1 }], Vo: [{ SanPhamId: "b", VoThu: 5, NoVo: 0, CocVo: 0, GiaCocVo: 50000 }], TT: { TienMat: 140000, ChuyenKhoan: 0, GhiNo: 0 } }),
  p({ KhachHangId: null, TenKhach: "Lẻ", Dong: [{ SanPhamId: "b", SoLuong: 1 }], Vo: [{ SanPhamId: "b", VoThu: 0, NoVo: 0, CocVo: 1, GiaCocVo: 50000 }], TT: { TienMat: 75000, ChuyenKhoan: 0, GhiNo: 0 } }),
]
// Trên xe: để lại 3 bình + xuất 30 = 33; vỏ rỗng để lại 4.
const pc = soPhaiCo({ Hang: { b: 33, t: 2 }, VoRong: { b: 4 } }, ds)
assert.deepEqual(pc, { Day: { b: 14, t: 1 }, VoRong: { b: 22 }, TienMat: 465000 })
assert.deepEqual(chenhLech(pc.Day, { b: 13, t: 1 }), { b: -1 })
assert.deepEqual(chenhLech({ b: 5 }, { b: 5, x: 2 }), { x: 2 })

const cn = congNoTuPhieu(ds, (ph, sp) => ph.Dong.find((d) => d.SanPhamId === sp)?.SoLuong ?? 0)
// k1: lần 2 giao 2, thu 5 → trả 3 vỏ nợ cũ
assert.deepEqual(cn.k1, { TenKhach: "A", NoTien: 0, NoVo: { b: -3 }, CocVo: {}, TienCoc: 0 })
assert.deepEqual(cn.k2, { TenKhach: "B", NoTien: 138000, NoVo: { b: 1 }, CocVo: { b: 2 }, TienCoc: 100000 })
assert.equal(Object.keys(cn).length, 2) // khách lẻ bỏ qua

assert.deepEqual(cong({ b: 2 }, { b: -3, t: 1 }), { b: -1, t: 1 })

assert.equal(batBuocDem(false, ["a"], ["a"]), true)
assert.equal(batBuocDem(true, ["a", "b"], ["b", "a"]), false)
assert.equal(batBuocDem(true, ["a", "b"], ["a", "c"]), true)
assert.equal(batBuocDem(true, ["a"], null), true)
console.log("ketThucLogic: OK")
