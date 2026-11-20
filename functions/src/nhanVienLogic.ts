// Kiểm tra dữ liệu nhân viên — tách riêng, không đụng Firebase, để test được.
//
// ĐĂNG NHẬP BẰNG SỐ ĐIỆN THOẠI (20/11/2026): tài xế, phụ xe phần lớn không
// dùng email. Firebase Auth chỉ có email/mật khẩu, nên số điện thoại được đổi
// thành một email nội bộ `<số>@daiphuckhang.web.app`. Tên miền này là của
// chính app (Firebase Hosting), không ai khác đăng ký được, và không có hộp
// thư — nên tài khoản kiểu này KHÔNG tự đặt lại mật khẩu qua email được,
// Admin đặt lại trong màn Nhân viên.
//
// App (màn đăng nhập, màn Nhân viên) import THẲNG file này, không chép lại:
// app đổi số điện thoại lúc đăng nhập, máy chủ đổi lúc tạo tài khoản — hai
// bên lệch nhau là không đăng nhập được. Vì vậy file này không được import gì
// của Node hay Firebase.

export const DUOI_EMAIL_NOI_BO = "@daiphuckhang.web.app";

export const VAI_TRO_HOP_LE = ["Admin", "DieuPhoi", "Sales", "KeToan", "ThuKho", "TaiXe", "PhuXe"] as const;
export type VaiTro = (typeof VAI_TRO_HOP_LE)[number];

export const MAT_KHAU_TOI_THIEU = 8;

/** "0901 234 567", "+84 901234567" → "0901234567". null nếu không phải SĐT VN. */
export function chuanHoaSdt(vao: string): string | null {
  let s = vao.replace(/[\s.\-()]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("84") && s.length === 11) s = "0" + s.slice(2);
  return /^0\d{9}$/.test(s) ? s : null;
}

/**
 * Ô "Số điện thoại hoặc email" → email dùng cho Firebase Auth.
 * Có "@" = email thật; không có = số điện thoại → email nội bộ.
 */
export function emailDangNhap(vao: string): string | null {
  const s = vao.trim().toLowerCase();
  if (s.includes("@")) return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) ? s : null;
  const sdt = chuanHoaSdt(s);
  return sdt ? sdt + DUOI_EMAIL_NOI_BO : null;
}

export interface NhanVienMoi {
  dangNhap: string;
  email: string;
  matKhau: string;
  HoTen: string;
  VaiTro: VaiTro;
  SoDienThoai: string;
}

/** Trả về dữ liệu đã làm sạch, hoặc chuỗi lỗi tiếng Việt. */
export function kiemTraNhanVienMoi(d: unknown): NhanVienMoi | string {
  const o = (d ?? {}) as Record<string, unknown>;
  const dangNhap = typeof o.dangNhap === "string" ? o.dangNhap.trim() : "";
  const HoTen = typeof o.HoTen === "string" ? o.HoTen.trim() : "";
  const VaiTro = o.VaiTro;
  const matKhau = o.matKhau;
  const sdtVao = typeof o.SoDienThoai === "string" ? o.SoDienThoai.trim() : "";

  if (!HoTen) return "Thiếu họ tên.";
  if (HoTen.length > 80) return "Họ tên dài quá 80 ký tự.";
  if (!VAI_TRO_HOP_LE.includes(VaiTro as VaiTro)) return `Vai trò không hợp lệ: ${String(VaiTro)}`;
  if (!dangNhap) return "Thiếu số điện thoại hoặc email đăng nhập.";
  const email = emailDangNhap(dangNhap);
  if (!email) return `"${dangNhap}" không phải số điện thoại (10 số) hay email hợp lệ.`;
  if (typeof matKhau !== "string" || matKhau.length < MAT_KHAU_TOI_THIEU)
    return `Mật khẩu phải từ ${MAT_KHAU_TOI_THIEU} ký tự trở lên.`;

  // Đăng nhập bằng SĐT thì SĐT liên hệ chính là nó, khỏi nhập hai lần.
  let SoDienThoai = "";
  if (sdtVao) {
    const s = chuanHoaSdt(sdtVao);
    if (!s) return `Số điện thoại "${sdtVao}" không hợp lệ.`;
    SoDienThoai = s;
  } else if (email.endsWith(DUOI_EMAIL_NOI_BO)) {
    SoDienThoai = email.slice(0, -DUOI_EMAIL_NOI_BO.length);
  }

  return { dangNhap, email, matKhau, HoTen, VaiTro: VaiTro as VaiTro, SoDienThoai };
}
