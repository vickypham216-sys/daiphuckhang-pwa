// Cloud Functions — Đại Phúc Khang.
//
// Chỉ những việc BẮT BUỘC chạy ở máy chủ:
//  - Tạo tài khoản cho người khác: tạo ở app sẽ đăng nhập luôn vào tài khoản
//    mới và đá Admin ra. Chỉ Admin SDK tạo được mà không đụng phiên hiện tại.
//  - Đặt lại mật khẩu, khoá tài khoản: chỉ Admin SDK làm được.
//
// Ngưng tài khoản đi qua hàm (không dùng trigger Firestore như MIA): trigger
// cần Eventarc, lần deploy đầu trên project mới hay vướng quyền. Hàm gọi trực
// tiếp thì khoá Auth và ghi hồ sơ trong cùng một lượt.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { kiemTraNhanVienMoi, MAT_KHAU_TOI_THIEU } from "./nhanVienLogic";

initializeApp();
setGlobalOptions({ region: "asia-southeast1", maxInstances: 5 });

const db = () => getFirestore();

/** Chỉ Admin đang hoạt động mới đi tiếp. Trả uid Admin. */
async function batBuocLaAdmin(req: CallableRequest): Promise<string> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập.");
  const hs = (await db().collection("NguoiDung").doc(uid).get()).data();
  if (hs?.VaiTro !== "Admin" || hs?.TrangThai === "Inactive") {
    throw new HttpsError("permission-denied", "Chỉ Admin mới làm được việc này.");
  }
  return uid;
}

function layUid(v: unknown): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9]{10,128}$/.test(v)) {
    throw new HttpsError("invalid-argument", "Mã nhân viên không hợp lệ.");
  }
  return v;
}

export const taoNhanVien = onCall(async (req) => {
  const uidAdmin = await batBuocLaAdmin(req);
  const nv = kiemTraNhanVienMoi(req.data);
  if (typeof nv === "string") throw new HttpsError("invalid-argument", nv);

  let uid: string;
  try {
    uid = (await getAuth().createUser({ email: nv.email, password: nv.matKhau, displayName: nv.HoTen })).uid;
  } catch (err) {
    const ma = (err as { code?: string }).code;
    if (ma === "auth/email-already-exists")
      throw new HttpsError("already-exists", `${nv.dangNhap} đã có tài khoản rồi.`);
    if (ma === "auth/invalid-email") throw new HttpsError("invalid-argument", `Không dùng được: ${nv.dangNhap}`);
    if (ma === "auth/invalid-password") throw new HttpsError("invalid-argument", "Mật khẩu không hợp lệ.");
    throw new HttpsError("internal", "Không tạo được tài khoản.");
  }

  // Hồ sơ PHẢI có ID = uid. Hỏng bước này thì xoá tài khoản vừa tạo, không
  // để tài khoản "mồ côi" (đăng nhập được mà app không nhận).
  try {
    await db().collection("NguoiDung").doc(uid).set({
      HoTen: nv.HoTen,
      VaiTro: nv.VaiTro,
      TrangThai: "Active",
      DangNhap: nv.email,
      SoDienThoai: nv.SoDienThoai,
      TaoLuc: FieldValue.serverTimestamp(),
      TaoBoi: uidAdmin,
    });
  } catch {
    await getAuth().deleteUser(uid).catch(() => {});
    throw new HttpsError("internal", "Không tạo được hồ sơ, đã huỷ tài khoản. Thử lại.");
  }
  return { uid };
});

export const datLaiMatKhau = onCall(async (req) => {
  await batBuocLaAdmin(req);
  const uid = layUid(req.data?.uid);
  const matKhau = req.data?.matKhau;
  if (typeof matKhau !== "string" || matKhau.length < MAT_KHAU_TOI_THIEU) {
    throw new HttpsError("invalid-argument", `Mật khẩu phải từ ${MAT_KHAU_TOI_THIEU} ký tự trở lên.`);
  }
  try {
    await getAuth().updateUser(uid, { password: matKhau });
  } catch {
    throw new HttpsError("not-found", "Không tìm thấy tài khoản đăng nhập của nhân viên này.");
  }
  return { ok: true };
});

export const doiTrangThaiNhanVien = onCall(async (req) => {
  const uidAdmin = await batBuocLaAdmin(req);
  const uid = layUid(req.data?.uid);
  const ngung = req.data?.ngung === true;
  if (uid === uidAdmin && ngung) {
    throw new HttpsError("failed-precondition", "Không tự ngưng tài khoản của chính mình được.");
  }
  const ref = db().collection("NguoiDung").doc(uid);
  if (!(await ref.get()).exists) throw new HttpsError("not-found", "Không tìm thấy nhân viên.");

  // Khoá Auth TRƯỚC: lỡ ghi hồ sơ hỏng thì người đó vẫn đã bị chặn đăng nhập.
  try {
    await getAuth().updateUser(uid, { disabled: ngung });
    if (ngung) await getAuth().revokeRefreshTokens(uid);
  } catch {
    // Hồ sơ không có tài khoản Auth (nhập tay) — rules vẫn chặn theo TrangThai.
  }
  await ref.update({ TrangThai: ngung ? "Inactive" : "Active" });
  return { ok: true };
});
