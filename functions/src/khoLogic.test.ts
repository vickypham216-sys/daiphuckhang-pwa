import assert from "node:assert/strict"
import { docDongNhap, tinhNhap, tongTienNhap, type DongNhap } from "./khoLogic"

const binh = { SanPhamId: "b", Ten: "Bình 20L", DonVi: "Bình", CoVo: true, SoLuong: 100, DonGia: 12000, VoTra: 80 }
const thung = { SanPhamId: "t", Ten: "Thùng 500ml", DonVi: "Thùng", CoVo: false, SoLuong: 20, DonGia: null, VoTra: 0 }

const d = docDongNhap([binh, thung]) as DongNhap[]
assert.equal(d.length, 2)
assert.match(docDongNhap([]) as string, /chưa có/)
assert.match(docDongNhap([{ ...binh, SoLuong: 0 }]) as string, /lớn hơn 0/)
assert.match(docDongNhap([{ ...binh, SoLuong: 1.5 }]) as string, /số nguyên/)
assert.match(docDongNhap([{ ...thung, VoTra: 3 }]) as string, /không có vỏ/)
assert.match(docDongNhap([binh, binh]) as string, /lặp/)
assert.match(docDongNhap([{ ...binh, DonGia: -1 }]) as string, /giá nhập/)
assert.equal((docDongNhap([{ ...binh, VoTra: undefined }]) as DongNhap[])[0].VoTra, 0)

// Kho có 90 vỏ rỗng; nhập 100 đầy, trả 80 vỏ → đầy +100, vỏ 10, nợ vỏ NCC +20.
const kq = tinhNhap(d, { b: { Day: 5, VoRong: 90 } }, { b: 3 })
assert.deepEqual(kq, { ton: { b: { Day: 105, VoRong: 10 }, t: { Day: 20, VoRong: 0 } }, noVo: { b: 23 } })
// Trả nhiều vỏ hơn trong kho → lỗi.
assert.match(tinhNhap(d, { b: { Day: 0, VoRong: 50 } }, {}) as string, /chỉ có 50 vỏ/)
// Trả dư vỏ (trả nợ cũ) → nợ vỏ giảm, có thể âm.
assert.deepEqual((tinhNhap([{ ...d[0], SoLuong: 10, VoTra: 30 }], { b: { Day: 0, VoRong: 30 } }, {}) as { noVo: Record<string, number> }).noVo, { b: -20 })

assert.equal(tongTienNhap(d), 1_200_000)
console.log("khoLogic: OK")
