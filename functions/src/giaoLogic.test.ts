import assert from "node:assert/strict"
import { coGiamGia, kiemTraPhieuGiao, phaiThu, tienCoc, tienHang, voThieu, type DongGiao, type VoGiao } from "./giaoLogic"

const binh: DongGiao = { SanPhamId: "b", Ten: "Bình 20L", DonVi: "Bình", CoVo: true, SoLuongDon: 10, SoLuong: 10, GiaDon: 25000, DonGia: 25000 }
const thung: DongGiao = { SanPhamId: "t", Ten: "Thùng", DonVi: "Thùng", CoVo: false, SoLuongDon: 2, SoLuong: 2, GiaDon: 90000, DonGia: 90000 }
const vo = (x: Partial<VoGiao> = {}): VoGiao => ({ SanPhamId: "b", Ten: "Bình 20L", VoThu: 10, NoVo: 0, CocVo: 0, GiaCocVo: 50000, ...x })
const p = (x: Partial<Parameters<typeof kiemTraPhieuGiao>[0]> = {}) => ({
  Dong: [binh, thung], Vo: [vo()], TT: { TienMat: 430000, ChuyenKhoan: 0, GhiNo: 0 },
  LyDoGiaoThieu: null, LyDoGiamGia: null, KhongGiao: false, taiCho: false, ...x,
})

assert.equal(tienHang([binh, thung]), 430000)
assert.equal(voThieu(10, 7), 3)
assert.equal(voThieu(10, 12), 0)
assert.equal(tienCoc([vo({ CocVo: 2 })]), 100000)
assert.equal(phaiThu([binh], [vo({ CocVo: 2 })]), 350000)

assert.equal(kiemTraPhieuGiao(p()), null)
// Trả tiền chia 3 cách
assert.equal(kiemTraPhieuGiao(p({ TT: { TienMat: 100000, ChuyenKhoan: 230000, GhiNo: 100000 } })), null)
assert.match(kiemTraPhieuGiao(p({ TT: { TienMat: 400000, ChuyenKhoan: 0, GhiNo: 0 } }))!, /phải bằng 430\.000/)
// Giao thiếu
const thieu = { ...binh, SoLuong: 8 }
assert.match(kiemTraPhieuGiao(p({ Dong: [thieu, thung], Vo: [vo({ VoThu: 8 })], TT: { TienMat: 380000, ChuyenKhoan: 0, GhiNo: 0 } }))!, /lý do/)
assert.equal(kiemTraPhieuGiao(p({ Dong: [thieu, thung], Vo: [vo({ VoThu: 8 })], TT: { TienMat: 380000, ChuyenKhoan: 0, GhiNo: 0 }, LyDoGiaoThieu: "Khách hết chỗ" })), null)
// Giảm giá
const giam = { ...binh, DonGia: 23000 }
assert.equal(coGiamGia([giam]), true)
assert.match(kiemTraPhieuGiao(p({ Dong: [giam, thung], TT: { TienMat: 410000, ChuyenKhoan: 0, GhiNo: 0 } }))!, /giảm giá/)
assert.equal(kiemTraPhieuGiao(p({ Dong: [giam, thung], TT: { TienMat: 410000, ChuyenKhoan: 0, GhiNo: 0 }, LyDoGiamGia: "Khách quen" })), null)
assert.match(kiemTraPhieuGiao(p({ Dong: [{ ...binh, DonGia: 30000 }, thung] }))!, /cao hơn/)
// Vỏ thiếu: 10 giao, thu 7 → thiếu 3: 1 nợ + 2 cọc
assert.match(kiemTraPhieuGiao(p({ Vo: [vo({ VoThu: 7 })] }))!, /thiếu 3 vỏ/)
assert.equal(kiemTraPhieuGiao(p({ Vo: [vo({ VoThu: 7, NoVo: 1, CocVo: 2 })], TT: { TienMat: 530000, ChuyenKhoan: 0, GhiNo: 0 } })), null)
assert.match(kiemTraPhieuGiao(p({ Vo: [vo({ VoThu: 7, CocVo: 3, GiaCocVo: 0 })] }))!, /chưa có giá cọc/)
// Trả vỏ cũ: thu 12 khi giao 10 → không thiếu
assert.equal(kiemTraPhieuGiao(p({ Vo: [vo({ VoThu: 12 })] })), null)
assert.match(kiemTraPhieuGiao(p({ Vo: [{ ...vo(), SanPhamId: "t", Ten: "Thùng" }] }))!, /không có vỏ/)
// Không giao được
const khong = { Dong: [{ ...binh, SoLuong: 0 }, { ...thung, SoLuong: 0 }], Vo: [vo({ VoThu: 0 })], TT: { TienMat: 0, ChuyenKhoan: 0, GhiNo: 0 }, KhongGiao: true }
assert.match(kiemTraPhieuGiao(p(khong))!, /lý do không giao/)
assert.equal(kiemTraPhieuGiao(p({ ...khong, LyDoGiaoThieu: "Khách vắng nhà" })), null)
assert.match(kiemTraPhieuGiao(p({ ...khong, KhongGiao: false, LyDoGiaoThieu: "x" }))!, /Không giao được/)
// Đơn tại chỗ
const tc = { ...binh, SoLuongDon: 0, SoLuong: 3 }
assert.equal(kiemTraPhieuGiao(p({ taiCho: true, Dong: [tc], Vo: [vo({ VoThu: 3 })], TT: { TienMat: 75000, ChuyenKhoan: 0, GhiNo: 0 } })), null)
console.log("giaoLogic: OK")
