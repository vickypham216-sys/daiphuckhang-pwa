import assert from "node:assert/strict";
import { chuanHoaSdt, emailDangNhap, kiemTraNhanVienMoi } from "./nhanVienLogic";

assert.equal(chuanHoaSdt("0901 234 567"), "0901234567");
assert.equal(chuanHoaSdt("+84 901.234.567"), "0901234567");
assert.equal(chuanHoaSdt("84901234567"), "0901234567");
assert.equal(chuanHoaSdt("090123456"), null);
assert.equal(chuanHoaSdt("abc"), null);

assert.equal(emailDangNhap("0901234567"), "0901234567@daiphuckhang.web.app");
assert.equal(emailDangNhap(" Vicky@Gmail.com "), "vicky@gmail.com");
assert.equal(emailDangNhap("vicky@"), null);
assert.equal(emailDangNhap("12345"), null);

const ok = kiemTraNhanVienMoi({ dangNhap: "0901 234 567", matKhau: "12345678", HoTen: " Anh Tư ", VaiTro: "TaiXe" });
assert.deepEqual(ok, {
  dangNhap: "0901 234 567",
  email: "0901234567@daiphuckhang.web.app",
  matKhau: "12345678",
  HoTen: "Anh Tư",
  VaiTro: "TaiXe",
  SoDienThoai: "0901234567",
});
const ok2 = kiemTraNhanVienMoi({ dangNhap: "kt@dpk.vn", matKhau: "12345678", HoTen: "Chị Lan", VaiTro: "KeToan" });
assert.equal(typeof ok2 === "object" && ok2.SoDienThoai, "");

assert.match(kiemTraNhanVienMoi({ dangNhap: "0901234567", matKhau: "1234567", HoTen: "A", VaiTro: "TaiXe" }) as string, /Mật khẩu/);
assert.match(kiemTraNhanVienMoi({ dangNhap: "0901234567", matKhau: "12345678", HoTen: "A", VaiTro: "Boss" }) as string, /Vai trò/);
assert.match(kiemTraNhanVienMoi({ dangNhap: "0901234567", matKhau: "12345678", HoTen: "", VaiTro: "TaiXe" }) as string, /họ tên/);
assert.match(kiemTraNhanVienMoi({ dangNhap: "abc", matKhau: "12345678", HoTen: "A", VaiTro: "TaiXe" }) as string, /không phải/);
assert.match(kiemTraNhanVienMoi(null) as string, /họ tên/);

console.log("nhanVienLogic: OK");
