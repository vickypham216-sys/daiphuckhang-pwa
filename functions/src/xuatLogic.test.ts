import assert from "node:assert/strict"
import { congLenXe, docDongXuat, tinhXuat, tongTheoSanPham } from "./xuatLogic"

assert.deepEqual(docDongXuat([{ SanPhamId: "b", SoLuong: 30 }, { SanPhamId: "t", SoLuong: 0 }]), [{ SanPhamId: "b", SoLuong: 30 }])
assert.match(docDongXuat([{ SanPhamId: "b", SoLuong: 0 }]) as string, /chưa có hàng/)
assert.match(docDongXuat([{ SanPhamId: "b", SoLuong: -1 }]) as string, /không âm/)
assert.match(docDongXuat([{ SanPhamId: "b", SoLuong: 2.5 }]) as string, /số nguyên/)
assert.match(docDongXuat([{ SanPhamId: "b", SoLuong: 1 }, { SanPhamId: "b", SoLuong: 2 }]) as string, /lặp/)
assert.match(docDongXuat("x") as string, /không hợp lệ/)

assert.deepEqual(
  tongTheoSanPham([
    { TrangThai: "DaGan", Dong: [{ SanPhamId: "b", SoLuong: 8 }, { SanPhamId: "t", SoLuong: 2 }] },
    { TrangThai: "DaGan", Dong: [{ SanPhamId: "b", SoLuong: 10 }] },
    { TrangThai: "Huy", Dong: [{ SanPhamId: "b", SoLuong: 99 }] },
  ]),
  { b: 18, t: 2 },
)

assert.deepEqual(tinhXuat([{ SanPhamId: "b", Ten: "Bình", SoLuong: 20 }], { b: 150 }), { b: 130 })
assert.match(tinhXuat([{ SanPhamId: "b", Ten: "Bình", SoLuong: 20 }], { b: 5 }) as string, /chỉ còn 5/)
assert.match(tinhXuat([{ SanPhamId: "x", Ten: "Mới", SoLuong: 1 }], {}) as string, /chỉ còn 0/)

assert.deepEqual(congLenXe({ b: 3 }, [{ SanPhamId: "b", SoLuong: 20 }, { SanPhamId: "t", SoLuong: 2 }]), { b: 23, t: 2 })
assert.deepEqual(congLenXe({ b: 23, t: 2 }, [{ SanPhamId: "b", SoLuong: 20 }], -1), { b: 3, t: 2 })
console.log("xuatLogic: OK")
