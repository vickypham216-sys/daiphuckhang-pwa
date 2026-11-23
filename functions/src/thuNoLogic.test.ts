import assert from "node:assert/strict"
import { apPhieuThu, kiemTraPhieuThu, tacDongChuyen, tienHoanCoc, type CongNo, type PhieuThuSo } from "./thuNoLogic"

const no: CongNo = { NoTien: 500000, NoVo: { b: 4 }, CocVo: { b: 2 }, TienCoc: 100000 }
const gia = { b: 50000 }
const p = (x: Partial<PhieuThuSo>): PhieuThuSo => ({ TienMat: 0, ChuyenKhoan: 0, TraVo: {}, HoanCocVo: {}, TienHoanCoc: 0, ...x })

assert.equal(kiemTraPhieuThu(p({ TienMat: 300000, ChuyenKhoan: 200000 }), no, gia), null)
assert.match(kiemTraPhieuThu(p({ TienMat: 600000 }), no, gia)!, /chỉ đang nợ 500\.000/)
assert.match(kiemTraPhieuThu(p({}), no, gia)!, /chưa có gì/)
assert.equal(kiemTraPhieuThu(p({ TraVo: { b: 4 } }), no, gia), null)
assert.match(kiemTraPhieuThu(p({ TraVo: { b: 5 } }), no, gia)!, /4 vỏ/)
assert.equal(kiemTraPhieuThu(p({ HoanCocVo: { b: 1 }, TienHoanCoc: 50000 }), no, gia), null)
assert.match(kiemTraPhieuThu(p({ HoanCocVo: { b: 1 }, TienHoanCoc: 40000 }), no, gia)!, /50\.000/)
assert.match(kiemTraPhieuThu(p({ HoanCocVo: { b: 3 }, TienHoanCoc: 100000 }), no, gia)!, /2 vỏ đang cọc/)
assert.match(kiemTraPhieuThu(p({ TienMat: 1.5 }), no, gia)!, /nguyên/)
// Giá cọc tăng sau khi khách cọc: hoàn không vượt số đang giữ.
assert.equal(tienHoanCoc({ b: 2 }, { b: 70000 }, 100000), 100000)

assert.deepEqual(apPhieuThu(no, p({ TienMat: 200000, ChuyenKhoan: 100000, TraVo: { b: 4 }, HoanCocVo: { b: 1 }, TienHoanCoc: 50000 })),
  { NoTien: 200000, NoVo: {}, CocVo: { b: 1 }, TienCoc: 50000 })
assert.deepEqual(tacDongChuyen(p({ TienMat: 200000, TraVo: { b: 3 }, HoanCocVo: { b: 1 }, TienHoanCoc: 50000 })), { TienMat: 150000, VoRong: { b: 4 } })
console.log("thuNoLogic: OK")
