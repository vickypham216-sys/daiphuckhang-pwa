import assert from "node:assert/strict"
import { apDauKy, docBang, docSoExcel, tieuDe, timKhach } from "./dauKyLogic"

const sp = [{ id: "b", Ten: "Bình 20L" }]
assert.deepEqual(tieuDe(sp), ["Tên khách", "SĐT", "Địa chỉ", "Nợ tiền", "Nợ vỏ Bình 20L", "Vỏ cọc Bình 20L", "Tiền cọc"])
assert.equal(docSoExcel("1.250.000"), 1250000)
assert.equal(docSoExcel("1,250,000đ"), 1250000)
assert.equal(docSoExcel(""), 0)
assert.ok(Number.isNaN(docSoExcel("abc")))

const bang = [
  "Tên khách\tSĐT\tĐịa chỉ\tNợ tiền\tNợ vỏ Bình 20L\tVỏ cọc Bình 20L\tTiền cọc",
  "Tạp hoá A\t912345678\t1 Lê Lợi\t1.200.000\t5\t\t",
  "Quán B\t0901 111 222\t\t\t\t3\t150,000",
  "",
  "Lỗi C\tabc\t\t1\t\t\t",
  "Lỗi D\t\t\txyz\t\t\t",
  "\t0909\t",
].join("\n")
const r = docBang(bang, sp)
assert.deepEqual(r.dong, [
  { Ten: "Tạp hoá A", SoDienThoai: "0912345678", DiaChi: "1 Lê Lợi", NoTien: 1200000, NoVo: { b: 5 }, CocVo: {}, TienCoc: 0 },
  { Ten: "Quán B", SoDienThoai: "0901111222", DiaChi: null, NoTien: 0, NoVo: {}, CocVo: { b: 3 }, TienCoc: 150000 },
])
assert.deepEqual(r.loi.map((x) => x.so), [5, 6, 7])
assert.match(r.loi[1].loi, /Nợ tiền/)

// Đầu kỳ cộng vào phần đã phát sinh; sửa đầu kỳ không mất phát sinh.
const dk1 = { NoTien: 1000, NoVo: { b: 5 }, CocVo: {}, TienCoc: 0 }
const sau1 = apDauKy({ NoTien: 200, NoVo: { b: 1 }, CocVo: {}, TienCoc: 0 }, undefined, dk1)
assert.deepEqual(sau1, { NoTien: 1200, NoVo: { b: 6 }, CocVo: {}, TienCoc: 0 })
const dk2 = { NoTien: 500, NoVo: {}, CocVo: { b: 2 }, TienCoc: 100 }
assert.deepEqual(apDauKy(sau1, dk1, dk2), { NoTien: 700, NoVo: { b: 1 }, CocVo: { b: 2 }, TienCoc: 100 })

const ds = [{ id: "1", Ten: "Tạp hoá A", SoDienThoai: "0912345678" }, { id: "2", Ten: "Quán B" }, { id: "3", Ten: "Quán B" }, { id: "4", Ten: "Cty C" }]
assert.deepEqual(timKhach({ Ten: "Khác", SoDienThoai: "0912345678" }, ds), { id: "1" })
assert.deepEqual(timKhach({ Ten: " cty c ", SoDienThoai: null }, ds), { id: "4" })
assert.deepEqual(timKhach({ Ten: "Quán B", SoDienThoai: null }, ds), { nhieu: true })
assert.equal(timKhach({ Ten: "Mới", SoDienThoai: null }, ds), null)
console.log("dauKyLogic: OK")
