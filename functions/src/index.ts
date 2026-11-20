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
import { docDongNhap, maNoVo, tinhNhap, tongTienNhap, type Ton } from "./khoLogic";

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

/** Người gọi phải đang hoạt động và có một trong các vai trò. Trả {uid, HoTen}. */
async function batBuocVaiTro(req: CallableRequest, vaiTro: string[]): Promise<{ uid: string; HoTen: string }> {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập.");
  const hs = (await db().collection("NguoiDung").doc(uid).get()).data();
  if (!hs || hs.TrangThai === "Inactive" || !vaiTro.includes(hs.VaiTro)) {
    throw new HttpsError("permission-denied", "Tài khoản này không được làm việc này.");
  }
  return { uid, HoTen: String(hs.HoTen ?? "") };
}

const laNgay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

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

// ── KHO ──────────────────────────────────────────────────────────────────
// Tồn kho / vỏ / nợ vỏ NCC chỉ máy chủ ghi. Xem khoLogic.ts.

/**
 * Nhập hàng từ nhà cung cấp. Một transaction: đọc tồn + nợ vỏ, kiểm tra đủ
 * vỏ rỗng để trả NCC, ghi phiếu + tồn mới + nợ vỏ mới. Hai thủ kho nhập cùng
 * lúc thì Firestore chạy lại transaction, không cộng sai.
 */
export const nhapHang = onCall(async (req) => {
  const nguoi = await batBuocVaiTro(req, ["Admin", "ThuKho"]);
  const nccId = req.data?.NCCId;
  if (typeof nccId !== "string" || !nccId) throw new HttpsError("invalid-argument", "Chưa chọn nhà cung cấp.");
  const ngay = req.data?.Ngay;
  if (!laNgay(ngay)) throw new HttpsError("invalid-argument", "Ngày nhập không hợp lệ.");
  const dong = docDongNhap(req.data?.Dong);
  if (typeof dong === "string") throw new HttpsError("invalid-argument", dong);
  const ghiChu = typeof req.data?.GhiChu === "string" ? req.data.GhiChu.trim().slice(0, 300) : "";

  const refPhieu = db().collection("PhieuNhap").doc();
  await db().runTransaction(async (tx) => {
    const ncc = await tx.get(db().collection("NhaCungCap").doc(nccId));
    if (!ncc.exists || ncc.data()?.TrangThai === "Inactive") throw new HttpsError("not-found", "Nhà cung cấp không tồn tại hoặc đã ngưng.");
    // Sản phẩm phải có thật; lấy CoVo từ danh mục, không tin app.
    const sp = await Promise.all(dong.map((d) => tx.get(db().collection("SanPham").doc(d.SanPhamId))));
    sp.forEach((s, i) => {
      if (!s.exists) throw new HttpsError("not-found", `Không tìm thấy sản phẩm ${dong[i].Ten}.`);
      dong[i].CoVo = s.data()?.CoVo === true;
      dong[i].Ten = String(s.data()?.Ten ?? dong[i].Ten);
      if (!dong[i].CoVo && dong[i].VoTra > 0) throw new HttpsError("invalid-argument", `${dong[i].Ten} không có vỏ.`);
    });
    const refTon = dong.map((d) => db().collection("TonKho").doc(d.SanPhamId));
    const refNo = dong.map((d) => db().collection("NoVoNCC").doc(maNoVo(nccId, d.SanPhamId)));
    const [snapTon, snapNo] = await Promise.all([Promise.all(refTon.map((r) => tx.get(r))), Promise.all(refNo.map((r) => tx.get(r)))]);
    const ton: Record<string, Ton> = {};
    const noVo: Record<string, number> = {};
    dong.forEach((d, i) => {
      ton[d.SanPhamId] = { Day: snapTon[i].data()?.Day ?? 0, VoRong: snapTon[i].data()?.VoRong ?? 0 };
      noVo[d.SanPhamId] = snapNo[i].data()?.SoVo ?? 0;
    });
    const kq = tinhNhap(dong, ton, noVo);
    if (typeof kq === "string") throw new HttpsError("failed-precondition", kq);

    const tenNcc = String(ncc.data()?.Ten ?? "");
    tx.set(refPhieu, {
      Ngay: ngay, NCCId: nccId, TenNCC: tenNcc, Dong: dong, TongTien: tongTienNhap(dong),
      GhiChu: ghiChu || null, TaoBoi: nguoi.uid, TenNguoiTao: nguoi.HoTen, TaoLuc: FieldValue.serverTimestamp(),
    });
    dong.forEach((d, i) => {
      tx.set(refTon[i], { SanPhamId: d.SanPhamId, Ten: d.Ten, CoVo: d.CoVo, ...kq.ton[d.SanPhamId], CapNhat: FieldValue.serverTimestamp() }, { merge: true });
      if (d.CoVo) tx.set(refNo[i], { NCCId: nccId, TenNCC: tenNcc, SanPhamId: d.SanPhamId, Ten: d.Ten, SoVo: kq.noVo[d.SanPhamId], CapNhat: FieldValue.serverTimestamp() });
    });
  });
  return { id: refPhieu.id };
});

/**
 * Đặt tồn đầu kỳ / điều chỉnh sau kiểm kho (Admin). Ghi vết từ số nào sang số
 * nào, ai, vì sao — không có vết thì sau này không truy được sai lệch.
 */
export const datTonKho = onCall(async (req) => {
  const nguoi = await batBuocVaiTro(req, ["Admin"]);
  const spId = req.data?.SanPhamId;
  const day = req.data?.Day;
  const voRong = req.data?.VoRong ?? 0;
  const lyDo = typeof req.data?.LyDo === "string" ? req.data.LyDo.trim().slice(0, 300) : "";
  if (typeof spId !== "string" || !spId) throw new HttpsError("invalid-argument", "Thiếu sản phẩm.");
  for (const [ten, v] of [["Số hàng đầy", day], ["Số vỏ rỗng", voRong]] as const)
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1_000_000) throw new HttpsError("invalid-argument", `${ten} không hợp lệ.`);
  if (!lyDo) throw new HttpsError("invalid-argument", "Cần ghi lý do (vd: tồn đầu kỳ, kiểm kho ngày…).");

  await db().runTransaction(async (tx) => {
    const sp = await tx.get(db().collection("SanPham").doc(spId));
    if (!sp.exists) throw new HttpsError("not-found", "Không tìm thấy sản phẩm.");
    const coVo = sp.data()?.CoVo === true;
    if (!coVo && voRong > 0) throw new HttpsError("invalid-argument", "Sản phẩm này không có vỏ.");
    const refTon = db().collection("TonKho").doc(spId);
    const cu = (await tx.get(refTon)).data();
    tx.set(refTon, { SanPhamId: spId, Ten: sp.data()?.Ten ?? "", CoVo: coVo, Day: day, VoRong: voRong, CapNhat: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(db().collection("DieuChinhTon").doc(), {
      SanPhamId: spId, Ten: sp.data()?.Ten ?? "",
      Truoc: { Day: cu?.Day ?? 0, VoRong: cu?.VoRong ?? 0 }, Sau: { Day: day, VoRong: voRong },
      LyDo: lyDo, Boi: nguoi.uid, TenNguoi: nguoi.HoTen, Luc: FieldValue.serverTimestamp(),
    });
  });
  return { ok: true };
});
