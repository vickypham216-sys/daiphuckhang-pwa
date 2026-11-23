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
import { congLenXe, docDongXuat, tinhXuat, tongTheoSanPham, type DongXuat } from "./xuatLogic";
import { apDauKy, timKhach, type SoDauKy } from "./dauKyLogic";
import { apPhieuThu, kiemTraPhieuThu, tacDongChuyen, type CongNo, type PhieuThuSo } from "./thuNoLogic";
import { batBuocDem, chenhLech, cong, congNoTuPhieu, soPhaiCo, type PhieuTinh, type TheoSp } from "./ketThucLogic";

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

// ── XUẤT KHO THEO CHUYẾN ─────────────────────────────────────────────────
// PhieuXuat/{chuyenId}: MỘT phiếu cho mỗi chuyến (id = mã chuyến → không thể
// xuất hai lần). TrenXe/{xeId}.Hang = hàng đầy đang trên xe theo sản phẩm.
// Chuyến: LapKeHoach → (xuatKho) DaXuatKho → (nhanHang, tài xế) DangGiao.

export const xuatKho = onCall(async (req) => {
  const nguoi = await batBuocVaiTro(req, ["Admin", "ThuKho"]);
  const chuyenId = req.data?.ChuyenId;
  if (typeof chuyenId !== "string" || !chuyenId) throw new HttpsError("invalid-argument", "Thiếu chuyến.");
  const vao = docDongXuat(req.data?.Dong);
  if (typeof vao === "string") throw new HttpsError("invalid-argument", vao);
  const ghiChu = typeof req.data?.GhiChu === "string" ? req.data.GhiChu.trim().slice(0, 300) : "";

  await db().runTransaction(async (tx) => {
    const refC = db().collection("Chuyen").doc(chuyenId);
    const refP = db().collection("PhieuXuat").doc(chuyenId);
    const [c, p] = await Promise.all([tx.get(refC), tx.get(refP)]);
    if (!c.exists) throw new HttpsError("not-found", "Không tìm thấy chuyến.");
    const cd = c.data()!;
    if (cd.TrangThai !== "LapKeHoach" || p.exists) throw new HttpsError("failed-precondition", "Chuyến này đã xuất kho rồi (hoặc đã huỷ).");

    const donIds: string[] = cd.DonIds ?? [];
    const don = await Promise.all(donIds.map((id) => tx.get(db().collection("DonHang").doc(id))));
    const theoDon = tongTheoSanPham(don.map((d) => d.data() as { TrangThai: string; Dong: { SanPhamId: string; SoLuong: number }[] }));
    const sp = await Promise.all(vao.map((d) => tx.get(db().collection("SanPham").doc(d.SanPhamId))));
    const dong: DongXuat[] = vao.map((d, i) => {
      if (!sp[i].exists) throw new HttpsError("not-found", "Có sản phẩm không còn trong danh mục.");
      const x = sp[i].data()!;
      return { SanPhamId: d.SanPhamId, Ten: String(x.Ten ?? ""), DonVi: String(x.DonVi ?? ""), CoVo: x.CoVo === true, SoLuong: d.SoLuong, TheoDon: theoDon[d.SanPhamId] ?? 0 };
    });
    // Xuất thiếu so với đơn: chặn — tài xế sẽ không đủ hàng giao.
    for (const [spId, can] of Object.entries(theoDon)) {
      const co = dong.find((d) => d.SanPhamId === spId)?.SoLuong ?? 0;
      if (co < can) {
        const ten = dong.find((d) => d.SanPhamId === spId)?.Ten ?? (await tx.get(db().collection("SanPham").doc(spId))).data()?.Ten ?? spId;
        throw new HttpsError("failed-precondition", `${ten}: đơn của chuyến cần ${can}, phiếu chỉ xuất ${co}. Bỏ bớt đơn ở màn Điều phối nếu kho không đủ.`);
      }
    }

    // Một xe chỉ chạy MỘT chuyến một lúc: hàng trên xe tính theo xe, hai
    // chuyến cùng mở thì không tách được hàng của chuyến nào.
    const dangChay = await tx.get(db().collection("Chuyen").where("XeId", "==", cd.XeId).where("TrangThai", "in", ["DaXuatKho", "DangGiao", "VeKho"]));
    const khac = dangChay.docs.find((x) => x.id !== chuyenId);
    if (khac) throw new HttpsError("failed-precondition", `Xe ${cd.BienSo} còn chuyến ${khac.data().SoChuyen} chưa kết thúc. Kết thúc chuyến đó trước.`);

    const refTon = dong.map((d) => db().collection("TonKho").doc(d.SanPhamId));
    const refXe = db().collection("TrenXe").doc(String(cd.XeId));
    const [snapTon, xe] = await Promise.all([Promise.all(refTon.map((r) => tx.get(r))), tx.get(refXe)]);
    const tonDay: Record<string, number> = {};
    dong.forEach((d, i) => (tonDay[d.SanPhamId] = snapTon[i].data()?.Day ?? 0));
    const tonMoi = tinhXuat(dong, tonDay);
    if (typeof tonMoi === "string") throw new HttpsError("failed-precondition", tonMoi);

    dong.forEach((d, i) => tx.set(refTon[i], { Day: tonMoi[d.SanPhamId], CapNhat: FieldValue.serverTimestamp() }, { merge: true }));
    tx.set(refXe, {
      XeId: cd.XeId, BienSo: cd.BienSo,
      Hang: congLenXe(xe.data()?.Hang ?? {}, dong),
      TenSanPham: { ...(xe.data()?.TenSanPham ?? {}), ...Object.fromEntries(dong.map((d) => [d.SanPhamId, d.Ten])) },
      CapNhat: FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(refP, {
      ChuyenId: chuyenId, Ngay: cd.Ngay, XeId: cd.XeId, BienSo: cd.BienSo, SoChuyen: cd.SoChuyen,
      TaiXe: cd.TaiXe, PhuXe: cd.PhuXe ?? [], Dong: dong, GhiChu: ghiChu || null,
      // Hàng để lại trên xe từ chuyến trước — tài xế bán được cả phần này.
      DauChuyen: { Hang: xe.data()?.Hang ?? {}, VoRong: xe.data()?.VoRong ?? {} },
      TrangThai: "ChoNhan", TaoBoi: nguoi.uid, TenNguoiTao: nguoi.HoTen, TaoLuc: FieldValue.serverTimestamp(),
    });
    // ToXeUids do MÁY CHỦ đặt lại từ TaiXe + PhuXe — luật PhieuGiao dựa vào nó.
    const toXe = [cd.TaiXe?.uid, ...((cd.PhuXe ?? []) as { uid: string }[]).map((x) => x.uid)].filter(Boolean);
    tx.update(refC, { TrangThai: "DaXuatKho", ToXeUids: toXe, SuaLuc: FieldValue.serverTimestamp(), SuaBoi: nguoi.uid });
  });
  return { ok: true };
});

/**
 * Huỷ phiếu xuất khi thủ kho đếm sai — CHỈ khi tài xế CHƯA bấm nhận. Trả hàng
 * về kho, mở khoá chuyến cho điều phối. Phiếu không xoá mất: chép sang
 * PhieuXuatHuy để còn vết.
 */
export const huyXuatKho = onCall(async (req) => {
  const nguoi = await batBuocVaiTro(req, ["Admin", "ThuKho"]);
  const chuyenId = req.data?.ChuyenId;
  const lyDo = typeof req.data?.LyDo === "string" ? req.data.LyDo.trim().slice(0, 300) : "";
  if (typeof chuyenId !== "string" || !chuyenId) throw new HttpsError("invalid-argument", "Thiếu chuyến.");
  if (!lyDo) throw new HttpsError("invalid-argument", "Cần ghi lý do huỷ.");
  await db().runTransaction(async (tx) => {
    const refC = db().collection("Chuyen").doc(chuyenId);
    const refP = db().collection("PhieuXuat").doc(chuyenId);
    const [c, p] = await Promise.all([tx.get(refC), tx.get(refP)]);
    if (!p.exists) throw new HttpsError("not-found", "Chuyến này chưa có phiếu xuất.");
    if (p.data()!.TrangThai !== "ChoNhan" || c.data()?.TrangThai !== "DaXuatKho")
      throw new HttpsError("failed-precondition", "Tài xế đã nhận hàng — không huỷ phiếu xuất được nữa.");
    const dong = p.data()!.Dong as DongXuat[];
    const refTon = dong.map((d) => db().collection("TonKho").doc(d.SanPhamId));
    const refXe = db().collection("TrenXe").doc(String(c.data()!.XeId));
    const [snapTon, xe] = await Promise.all([Promise.all(refTon.map((r) => tx.get(r))), tx.get(refXe)]);
    dong.forEach((d, i) => tx.set(refTon[i], { Day: (snapTon[i].data()?.Day ?? 0) + d.SoLuong, CapNhat: FieldValue.serverTimestamp() }, { merge: true }));
    tx.set(refXe, { Hang: congLenXe(xe.data()?.Hang ?? {}, dong, -1), CapNhat: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(db().collection("PhieuXuatHuy").doc(), { ...p.data(), LyDoHuy: lyDo, HuyBoi: nguoi.uid, TenNguoiHuy: nguoi.HoTen, HuyLuc: FieldValue.serverTimestamp() });
    tx.delete(refP);
    tx.update(refC, { TrangThai: "LapKeHoach", SuaLuc: FieldValue.serverTimestamp(), SuaBoi: nguoi.uid });
  });
  return { ok: true };
});

/** Tài xế của chuyến bấm "Đã nhận đủ hàng". Admin bấm thay được (ghi rõ ai bấm). */
export const nhanHang = onCall(async (req) => {
  const uid = req.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Chưa đăng nhập.");
  const chuyenId = req.data?.ChuyenId;
  if (typeof chuyenId !== "string" || !chuyenId) throw new HttpsError("invalid-argument", "Thiếu chuyến.");
  const hs = (await db().collection("NguoiDung").doc(uid).get()).data();
  if (!hs || hs.TrangThai === "Inactive") throw new HttpsError("permission-denied", "Tài khoản không hoạt động.");
  await db().runTransaction(async (tx) => {
    const refC = db().collection("Chuyen").doc(chuyenId);
    const refP = db().collection("PhieuXuat").doc(chuyenId);
    const [c, p] = await Promise.all([tx.get(refC), tx.get(refP)]);
    if (!c.exists || !p.exists) throw new HttpsError("not-found", "Chuyến chưa xuất kho.");
    if (c.data()!.TaiXe?.uid !== uid && hs.VaiTro !== "Admin")
      throw new HttpsError("permission-denied", "Chỉ tài xế của chuyến này mới xác nhận nhận hàng được.");
    if (p.data()!.TrangThai !== "ChoNhan") throw new HttpsError("failed-precondition", "Chuyến này đã xác nhận nhận hàng rồi.");
    tx.update(refP, { TrangThai: "DaNhan", NhanBoi: uid, TenNguoiNhan: String(hs.HoTen ?? ""), NhanLuc: FieldValue.serverTimestamp() });
    tx.update(refC, { TrangThai: "DangGiao", SuaLuc: FieldValue.serverTimestamp(), SuaBoi: uid });
  });
  return { ok: true };
});

// ── KẾT THÚC CHUYẾN ─────────────────────────────────────────────────────
// Tài xế bấm "Xong giao, về kho" (ghi từ máy tài xế — Firestore gửi theo
// đúng thứ tự, nên khi lệnh này tới máy chủ thì mọi phiếu giao ghi trước nó
// cũng đã tới). Thủ kho đếm (KHÔNG thấy số phải có — đếm mù) → hàm này tính
// chênh lệch, trả kho hoặc để lại trên xe, cộng công nợ khách, chốt chuyến.

export const ketThucChuyen = onCall(async (req) => {
  const nguoi = await batBuocVaiTro(req, ["Admin", "ThuKho"]);
  const chuyenId = req.data?.ChuyenId;
  if (typeof chuyenId !== "string" || !chuyenId) throw new HttpsError("invalid-argument", "Thiếu chuyến.");
  const deLai = req.data?.DeLai === true;
  const docTheoSp = (v: unknown, ten: string): TheoSp | null => {
    if (v == null) return null;
    if (typeof v !== "object") throw new HttpsError("invalid-argument", `${ten} không hợp lệ.`);
    const kq: TheoSp = {};
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
      if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > 100000) throw new HttpsError("invalid-argument", `${ten}: số đếm không hợp lệ.`);
      kq[k] = n;
    }
    return kq;
  };
  const demDay = docTheoSp(req.data?.DemDay, "Hàng đầy");
  const demVo = docTheoSp(req.data?.DemVoRong, "Vỏ rỗng");
  const ghiChu = typeof req.data?.GhiChu === "string" ? req.data.GhiChu.trim().slice(0, 300) : "";

  const kq = await db().runTransaction(async (tx) => {
    const refC = db().collection("Chuyen").doc(chuyenId);
    const c = await tx.get(refC);
    if (!c.exists) throw new HttpsError("not-found", "Không tìm thấy chuyến.");
    const cd = c.data()!;
    if (cd.TrangThai !== "VeKho") throw new HttpsError("failed-precondition", "Tài xế chưa bấm \"Xong giao, về kho\".");
    const toNay: string[] = cd.ToXeUids ?? [];

    // Chuyến kế tiếp của xe trong ngày (nếu đã có) — để biết có bắt buộc đếm không.
    const sau = (await tx.get(db().collection("Chuyen").where("XeId", "==", cd.XeId).where("Ngay", "==", cd.Ngay))).docs
      .map((x) => x.data())
      .filter((x) => x.SoChuyen > cd.SoChuyen && x.TrangThai !== "Huy")
      .sort((a, b) => a.SoChuyen - b.SoChuyen)[0];
    const toSau: string[] | null = sau ? [sau.TaiXe?.uid, ...((sau.PhuXe ?? []) as { uid: string }[]).map((x) => x.uid)].filter(Boolean) : null;
    const phaiDem = batBuocDem(deLai, toNay, toSau);
    if (phaiDem && (!demDay || !demVo)) throw new HttpsError("invalid-argument", deLai ? "Chuyến sau khác tổ xe (hoặc chưa có) — bắt buộc đếm hàng và vỏ trên xe." : "Trả hàng về kho — cần nhập số đếm.");

    const phieuSnap = await tx.get(db().collection("PhieuGiao").where("ChuyenId", "==", chuyenId));
    const phieu = phieuSnap.docs.map((x) => x.data() as PhieuTinh & { DonId: string | null });
    const coPhieu = new Set(phieu.map((p) => p.DonId).filter(Boolean));
    const thieuPhieu = ((cd.DonIds ?? []) as string[]).filter((id) => !coPhieu.has(id));
    if (thieuPhieu.length) throw new HttpsError("failed-precondition", `Còn ${thieuPhieu.length} đơn chưa có phiếu giao trên máy chủ (có thể máy tài xế chưa gửi). Nhờ tài xế mở app khi có mạng.`);

    // Phiếu thu nợ tài xế thu trên chuyến: tiền mặt (trừ hoàn cọc) vào số phải
    // nộp, vỏ khách trả vào số vỏ phải có trên xe, áp vào công nợ.
    const thuSnap = await tx.get(db().collection("PhieuThu").where("ChuyenId", "==", chuyenId));
    const phieuThu = thuSnap.docs.filter((x) => x.data().DaGhiSo !== true);

    const refXe = db().collection("TrenXe").doc(String(cd.XeId));
    const xe = (await tx.get(refXe)).data() ?? {};
    const pc = soPhaiCo(xe, phieu);
    for (const t of phieuThu) {
      const td = tacDongChuyen(t.data() as PhieuThuSo);
      pc.TienMat += td.TienMat;
      pc.VoRong = cong(pc.VoRong, td.VoRong);
    }
    const dDay = demDay ?? pc.Day, dVo = demVo ?? pc.VoRong;
    const clDay = chenhLech(pc.Day, dDay), clVo = chenhLech(pc.VoRong, dVo);

    const cn = congNoTuPhieu(phieu, (p, sp) => p.Dong.find((d) => d.SanPhamId === sp)?.SoLuong ?? 0);
    const khThu = phieuThu.map((t) => String(t.data().KhachHangId));
    for (const [i, id] of khThu.entries())
      cn[id] ??= { TenKhach: String(phieuThu[i].data().TenKhach ?? ""), NoTien: 0, NoVo: {}, CocVo: {}, TienCoc: 0 };
    const refCn = Object.keys(cn).map((id) => db().collection("CongNoKhach").doc(id));
    const snapCn = await Promise.all(refCn.map((r) => tx.get(r)));
    const spIds = [...new Set([...Object.keys(dDay), ...Object.keys(dVo)])].filter((k) => (dDay[k] ?? 0) > 0 || (dVo[k] ?? 0) > 0);
    const refTon = deLai ? [] : spIds.map((id) => db().collection("TonKho").doc(id));
    const snapTon = await Promise.all(refTon.map((r) => tx.get(r)));

    // ── ghi ──
    if (deLai) {
      // mergeFields: THAY CẢ map (merge thường giữ lại khoá cũ không có trong số đếm).
      tx.set(refXe, { Hang: dDay, VoRong: dVo, CapNhat: FieldValue.serverTimestamp() }, { mergeFields: ["Hang", "VoRong", "CapNhat"] });
    } else {
      spIds.forEach((id, i) => {
        const t = snapTon[i].data() ?? {};
        tx.set(refTon[i], { Day: (t.Day ?? 0) + (dDay[id] ?? 0), VoRong: (t.VoRong ?? 0) + (dVo[id] ?? 0), CapNhat: FieldValue.serverTimestamp() }, { merge: true });
      });
      // Ghi đè (không merge): map Hang/VoRong phải về rỗng, merge sẽ giữ khoá cũ.
      tx.set(refXe, { XeId: cd.XeId, BienSo: cd.BienSo, Hang: {}, VoRong: {}, CapNhat: FieldValue.serverTimestamp() });
    }
    Object.entries(cn).forEach(([id, them], i) => {
      const cu = snapCn[i].data() ?? {};
      let moi: CongNo = {
        NoTien: (cu.NoTien ?? 0) + them.NoTien,
        NoVo: cong(cu.NoVo, them.NoVo),
        CocVo: cong(cu.CocVo, them.CocVo),
        TienCoc: (cu.TienCoc ?? 0) + them.TienCoc,
      };
      for (const t of phieuThu) if (t.data().KhachHangId === id) moi = apPhieuThu(moi, t.data() as PhieuThuSo);
      tx.set(refCn[i], { ...cu, KhachHangId: id, TenKhach: them.TenKhach || cu.TenKhach, ...moi, CapNhat: FieldValue.serverTimestamp() });
    });
    for (const t of phieuThu) tx.update(t.ref, { DaGhiSo: true, GhiSoLuc: FieldValue.serverTimestamp() });
    const doiSoat = {
      ChuyenId: chuyenId, Ngay: cd.Ngay, BienSo: cd.BienSo, SoChuyen: cd.SoChuyen, TaiXe: cd.TaiXe, PhuXe: cd.PhuXe ?? [],
      PhaiCo: { Day: pc.Day, VoRong: pc.VoRong }, Dem: phaiDem || demDay ? { Day: dDay, VoRong: dVo } : null,
      ChenhLech: { Day: clDay, VoRong: clVo }, DeLai: deLai, CoDem: !!demDay,
      TienMatPhaiNop: pc.TienMat, GhiChu: ghiChu || null,
      Boi: nguoi.uid, TenNguoi: nguoi.HoTen, Luc: FieldValue.serverTimestamp(),
    };
    tx.set(db().collection("DoiSoatChuyen").doc(chuyenId), doiSoat);
    tx.update(refC, {
      TrangThai: "HoanThanh",
      NopTien: { TrangThai: pc.TienMat > 0 ? "ChoNop" : "KhongCo", PhaiNop: pc.TienMat },
      SuaLuc: FieldValue.serverTimestamp(), SuaBoi: nguoi.uid,
    });
    return { ChenhLech: { Day: clDay, VoRong: clVo }, TienMatPhaiNop: pc.TienMat };
  });
  return kq;
});

// ── CÔNG NỢ ĐẦU KỲ ───────────────────────────────────────────────────────
// Admin dán bảng từ Excel (app đã đọc thành dòng). Mỗi dòng: tìm khách (SĐT,
// rồi tên duy nhất); không có thì TẠO khách mới. Đầu kỳ lưu riêng ở
// CongNoKhach.DauKy và cộng vào tổng — sửa lại đầu kỳ không đè phần đã phát
// sinh qua chuyến. Mỗi lần ghi để lại vết DieuChinhCongNo.

export const nhapCongNoDauKy = onCall(async (req) => {
  const nguoi = await batBuocVaiTro(req, ["Admin"]);
  const vao = req.data?.Dong;
  if (!Array.isArray(vao) || vao.length === 0) throw new HttpsError("invalid-argument", "Không có dòng nào.");
  if (vao.length > 300) throw new HttpsError("invalid-argument", "Tối đa 300 dòng mỗi lần.");

  const sp = await db().collection("SanPham").get();
  const spVo = new Set(sp.docs.filter((d) => d.data().CoVo === true).map((d) => d.id));
  const so = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1e12;
  const theoSp = (m: unknown): Record<string, number> => {
    const kq: Record<string, number> = {};
    for (const [k, v] of Object.entries((m ?? {}) as Record<string, unknown>)) {
      if (!spVo.has(k)) throw new HttpsError("invalid-argument", "Có cột vỏ của sản phẩm không có vỏ.");
      if (!so(v)) throw new HttpsError("invalid-argument", "Số vỏ không hợp lệ.");
      if (v) kq[k] = v as number;
    }
    return kq;
  };

  const khSnap = await db().collection("KhachHang").get();
  const dsKh: { id: string; Ten: string; SoDienThoai: string | null }[] = khSnap.docs.map((d) => ({ id: d.id, Ten: String(d.data().Ten ?? ""), SoDienThoai: (d.data().SoDienThoai as string) ?? null }));
  const kq = { capNhat: 0, taoMoi: 0, loi: [] as { dong: number; loi: string }[] };
  const daGhi = new Set<string>(); // một khách hai dòng → dòng sau đọc số chưa ghi của dòng trước

  for (let i = 0; i < vao.length; i += 100) {
    const lo = vao.slice(i, i + 100) as Record<string, unknown>[];
    const batch = db().batch();
    for (const [j, x] of lo.entries()) {
      const stt = i + j + 1;
      const Ten = typeof x.Ten === "string" ? x.Ten.trim().slice(0, 120) : "";
      const sdt = typeof x.SoDienThoai === "string" && /^0\d{9}$/.test(x.SoDienThoai) ? x.SoDienThoai : null;
      if (!Ten) { kq.loi.push({ dong: stt, loi: "Thiếu tên." }); continue; }
      if (![x.NoTien, x.TienCoc].every(so)) { kq.loi.push({ dong: stt, loi: "Số tiền không hợp lệ." }); continue; }
      const moi: SoDauKy = { NoTien: x.NoTien as number, NoVo: theoSp(x.NoVo), CocVo: theoSp(x.CocVo), TienCoc: x.TienCoc as number };

      const tim = timKhach({ Ten, SoDienThoai: sdt }, dsKh);
      if (tim && "nhieu" in tim) { kq.loi.push({ dong: stt, loi: `Có nhiều khách tên "${Ten}" — thêm SĐT để phân biệt.` }); continue; }
      let khId: string;
      if (tim) khId = tim.id;
      else {
        const ref = db().collection("KhachHang").doc();
        khId = ref.id;
        batch.set(ref, {
          Ten, SoDienThoai: sdt, DiaChi: typeof x.DiaChi === "string" && x.DiaChi.trim() ? x.DiaChi.trim().slice(0, 300) : "(chưa có địa chỉ)",
          GhiChu: null, TrangThai: "Active", TaoLuc: FieldValue.serverTimestamp(), TaoBoi: nguoi.uid, TaoTu: "NhapDauKy",
        });
        dsKh.push({ id: khId, Ten, SoDienThoai: sdt });
        kq.taoMoi++;
      }
      if (daGhi.has(khId)) { kq.loi.push({ dong: stt, loi: `"${Ten}" bị lặp — gộp lại một dòng.` }); continue; }
      daGhi.add(khId);
      const refCn = db().collection("CongNoKhach").doc(khId);
      const cu = (await refCn.get()).data();
      const tong = apDauKy(cu, cu?.DauKy, moi);
      batch.set(refCn, { KhachHangId: khId, TenKhach: Ten, ...tong, DauKy: moi, CapNhat: FieldValue.serverTimestamp() });
      batch.set(db().collection("DieuChinhCongNo").doc(), {
        KhachHangId: khId, TenKhach: Ten, Loai: "DauKy", Truoc: cu?.DauKy ?? null, Sau: moi,
        Boi: nguoi.uid, TenNguoi: nguoi.HoTen, Luc: FieldValue.serverTimestamp(),
      });
      kq.capNhat++;
    }
    await batch.commit();
  }
  return kq;
});

// ── THU NỢ ───────────────────────────────────────────────────────────────

/** Kế toán / Admin thu nợ tại văn phòng — áp vào công nợ ngay. */
export const thuNoVanPhong = onCall(async (req) => {
  const nguoi = await batBuocVaiTro(req, ["Admin", "KeToan"]);
  const khId = req.data?.KhachHangId;
  if (typeof khId !== "string" || !khId) throw new HttpsError("invalid-argument", "Thiếu khách.");
  const p: PhieuThuSo = {
    TienMat: req.data?.TienMat ?? 0, ChuyenKhoan: req.data?.ChuyenKhoan ?? 0,
    TraVo: req.data?.TraVo ?? {}, HoanCocVo: req.data?.HoanCocVo ?? {}, TienHoanCoc: req.data?.TienHoanCoc ?? 0,
  };
  const ghiChu = typeof req.data?.GhiChu === "string" ? req.data.GhiChu.trim().slice(0, 300) : "";
  const ref = db().collection("PhieuThu").doc();
  await db().runTransaction(async (tx) => {
    const refCn = db().collection("CongNoKhach").doc(khId);
    const [cn, sp] = await Promise.all([tx.get(refCn), tx.get(db().collection("SanPham"))]);
    const giaCoc = Object.fromEntries(sp.docs.map((d) => [d.id, Number(d.data().GiaCocVo ?? 0)]));
    const no = cn.data() as CongNo | undefined;
    const loi = kiemTraPhieuThu(p, no ?? null, giaCoc);
    if (loi) throw new HttpsError("failed-precondition", loi);
    tx.set(ref, {
      ...p, KhachHangId: khId, TenKhach: cn.data()?.TenKhach ?? "", Nguon: "VanPhong", ChuyenId: null,
      // Kế toán nhận CK tại văn phòng là đã thấy tiền.
      CK: p.ChuyenKhoan > 0 ? { TrangThai: "DaXacNhan", Boi: nguoi.uid } : null,
      DaGhiSo: true, GhiChu: ghiChu || null,
      TaoBoi: nguoi.uid, TenNguoiTao: nguoi.HoTen, TaoLuc: FieldValue.serverTimestamp(),
    });
    // Ghi đè cả document (giữ DauKy, tên…): map NoVo/CocVo phải mất khoá về 0.
    tx.set(refCn, { ...(cn.data() ?? {}), KhachHangId: khId, ...apPhieuThu(no, p), CapNhat: FieldValue.serverTimestamp() });
  });
  return { id: ref.id };
});

/**
 * Kế toán xác nhận một khoản chuyển khoản (phiếu giao hoặc phiếu thu).
 * "Không thấy" → cộng lại số đó vào nợ của khách (khách vẫn còn nợ). Khách lẻ
 * (không có trong danh sách) → chỉ đánh dấu, Admin xử lý.
 */
export const xacNhanCK = onCall(async (req) => {
  const nguoi = await batBuocVaiTro(req, ["Admin", "KeToan"]);
  const loai = req.data?.Loai;
  const id = req.data?.Id;
  const thay = req.data?.Thay === true;
  if (!["PhieuGiao", "PhieuThu"].includes(loai) || typeof id !== "string" || !id) throw new HttpsError("invalid-argument", "Thiếu phiếu.");
  await db().runTransaction(async (tx) => {
    const ref = db().collection(loai).doc(id);
    const p = await tx.get(ref);
    if (!p.exists) throw new HttpsError("not-found", "Không tìm thấy phiếu.");
    const d = p.data()!;
    if (d.CK?.TrangThai !== "ChoXacNhan") throw new HttpsError("failed-precondition", "Khoản này đã được xác nhận rồi.");
    const soTien: number = loai === "PhieuGiao" ? d.TT?.ChuyenKhoan ?? 0 : d.ChuyenKhoan ?? 0;
    const khId: string | null = d.KhachHangId ?? null;
    const refCn = khId ? db().collection("CongNoKhach").doc(khId) : null;
    const cn = refCn && !thay ? await tx.get(refCn) : null;
    tx.update(ref, { CK: { ...d.CK, TrangThai: thay ? "DaXacNhan" : "KhongThay", Boi: nguoi.uid, TenNguoi: nguoi.HoTen, Luc: FieldValue.serverTimestamp() } });
    if (!thay && refCn) {
      tx.set(refCn, { KhachHangId: khId, TenKhach: cn?.data()?.TenKhach ?? d.TenKhach ?? "", NoTien: (cn?.data()?.NoTien ?? 0) + soTien, CapNhat: FieldValue.serverTimestamp() }, { merge: true });
    }
  });
  return { ok: true };
});
