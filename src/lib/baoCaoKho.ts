// Báo cáo tồn kho & vỏ — hàm thuần (scripts/kiemTraBaoCaoKho.ts).
//
// HAI LOẠI SỐ:
//  1. Ảnh chụp HIỆN TẠI (cân vỏ): đọc thẳng các sổ máy chủ đang giữ —
//     TonKho, TrenXe, CongNoKhach, NoVoNCC.
//  2. NHẬP – XUẤT – TỒN theo kỳ: dựng ngược từ tồn hiện tại và các chứng từ
//     làm tồn thay đổi. tồn cuối kỳ = hiện tại − Σ biến động SAU kỳ;
//     tồn đầu kỳ = tồn cuối − Σ biến động TRONG kỳ.
//     Chứng từ làm đổi TonKho (và chỉ những chứng từ này):
//       PhieuNhap      đầy +SoLuong, vỏ rỗng −VoTra
//       PhieuXuat      đầy −SoLuong (huỷ xuất = phiếu bị xoá + hàng trả lại → bỏ qua cả hai)
//       DoiSoatChuyen  (trả về kho, DeLai = false) đầy +Dem.Day, vỏ rỗng +Dem.VoRong
//       DieuChinhTon   đầy Sau−Trước, vỏ rỗng Sau−Trước
//     Thêm chứng từ mới đổi TonKho mà quên thêm vào đây là XNT lệch.

export type TheoSp = Record<string, number>
export type LoaiBienDong = 'nhap' | 'xuat' | 'trave' | 'dieuchinh'
export interface BienDong { ngay: string; sp: string; day: number; voRong: number; loai: LoaiBienDong }

export interface CanVo {
  khoDay: number; khoRong: number; xeDay: number; xeRong: number
  khachNo: number; khachCoc: number; noNCC: number
  /** Vỏ đang lưu hành = kho (đầy + rỗng) + trên xe (đầy + rỗng) + khách giữ (nợ + cọc). */
  luuHanh: number
  /** Vỏ của công ty = lưu hành − vỏ đang nợ NCC (vỏ của NCC nằm trong số trên). */
  cuaCongTy: number
}

export function canVo(
  sp: string,
  ton: { Day?: number; VoRong?: number } | undefined,
  trenXe: { Hang?: TheoSp; VoRong?: TheoSp }[],
  congNo: { NoVo?: TheoSp; CocVo?: TheoSp }[],
  noVoNcc: { SanPhamId: string; SoVo: number }[],
): CanVo {
  const khoDay = ton?.Day ?? 0, khoRong = ton?.VoRong ?? 0
  const xeDay = trenXe.reduce((s, x) => s + (x.Hang?.[sp] ?? 0), 0)
  const xeRong = trenXe.reduce((s, x) => s + (x.VoRong?.[sp] ?? 0), 0)
  const khachNo = congNo.reduce((s, c) => s + Math.max(0, c.NoVo?.[sp] ?? 0), 0)
  const khachCoc = congNo.reduce((s, c) => s + (c.CocVo?.[sp] ?? 0), 0)
  const noNCC = noVoNcc.filter((n) => n.SanPhamId === sp).reduce((s, n) => s + n.SoVo, 0)
  const luuHanh = khoDay + khoRong + xeDay + xeRong + khachNo + khachCoc
  return { khoDay, khoRong, xeDay, xeRong, khachNo, khachCoc, noNCC, luuHanh, cuaCongTy: luuHanh - noNCC }
}

export interface XNT {
  dauDay: number; nhap: number; xuat: number; traVe: number; dieuChinhDay: number; cuoiDay: number
  dauRong: number; voTraNCC: number; voVe: number; dieuChinhRong: number; cuoiRong: number
}

export function xnt(sp: string, hienTai: { Day?: number; VoRong?: number } | undefined, bd: BienDong[], tu: string, den: string): XNT {
  const cua = bd.filter((b) => b.sp === sp)
  const sau = cua.filter((b) => b.ngay > den)
  const trong = cua.filter((b) => b.ngay >= tu && b.ngay <= den)
  const cuoiDay = (hienTai?.Day ?? 0) - sau.reduce((s, b) => s + b.day, 0)
  const cuoiRong = (hienTai?.VoRong ?? 0) - sau.reduce((s, b) => s + b.voRong, 0)
  const tong = (loai: LoaiBienDong, k: 'day' | 'voRong') => trong.filter((b) => b.loai === loai).reduce((s, b) => s + b[k], 0)
  const nhap = tong('nhap', 'day'), xuat = 0 - tong('xuat', 'day'), traVe = tong('trave', 'day'), dieuChinhDay = tong('dieuchinh', 'day')
  const voTraNCC = 0 - tong('nhap', 'voRong'), voVe = tong('trave', 'voRong'), dieuChinhRong = tong('dieuchinh', 'voRong')
  return {
    dauDay: cuoiDay - nhap + xuat - traVe - dieuChinhDay, nhap, xuat, traVe, dieuChinhDay, cuoiDay,
    dauRong: cuoiRong + voTraNCC - voVe - dieuChinhRong, voTraNCC, voVe, dieuChinhRong, cuoiRong,
  }
}

/** Gom chứng từ thành biến động tồn kho. `ngayCua` đổi timestamp → YYYY-MM-DD giờ VN. */
export function bienDongTu(
  nhap: { Ngay: string; Dong: { SanPhamId: string; SoLuong: number; VoTra?: number }[] }[],
  xuat: { Ngay: string; Dong: { SanPhamId: string; SoLuong: number }[] }[],
  doiSoat: { Ngay: string; DeLai: boolean; Dem: { Day: TheoSp; VoRong: TheoSp } | null }[],
  dieuChinh: { ngay: string; SanPhamId: string; Truoc: { Day: number; VoRong: number }; Sau: { Day: number; VoRong: number } }[],
): BienDong[] {
  const kq: BienDong[] = []
  for (const p of nhap) for (const d of p.Dong) kq.push({ ngay: p.Ngay, sp: d.SanPhamId, day: d.SoLuong, voRong: 0 - (d.VoTra ?? 0), loai: 'nhap' })
  for (const p of xuat) for (const d of p.Dong) kq.push({ ngay: p.Ngay, sp: d.SanPhamId, day: 0 - d.SoLuong, voRong: 0, loai: 'xuat' })
  for (const p of doiSoat) {
    if (p.DeLai || !p.Dem) continue
    for (const sp of new Set([...Object.keys(p.Dem.Day ?? {}), ...Object.keys(p.Dem.VoRong ?? {})]))
      kq.push({ ngay: p.Ngay, sp, day: p.Dem.Day?.[sp] ?? 0, voRong: p.Dem.VoRong?.[sp] ?? 0, loai: 'trave' })
  }
  for (const d of dieuChinh)
    kq.push({ ngay: d.ngay, sp: d.SanPhamId, day: d.Sau.Day - d.Truoc.Day, voRong: d.Sau.VoRong - d.Truoc.VoRong, loai: 'dieuchinh' })
  return kq
}

/** Hao hụt cộng dồn từ đối soát chuyến (âm = thiếu). */
export function haoHut(doiSoat: { ChenhLech: { Day: TheoSp; VoRong: TheoSp } }[]): { day: TheoSp; voRong: TheoSp; soChuyenLech: number } {
  const day: TheoSp = {}, voRong: TheoSp = {}
  let soChuyenLech = 0
  for (const d of doiSoat) {
    const a = Object.entries(d.ChenhLech?.Day ?? {}), b = Object.entries(d.ChenhLech?.VoRong ?? {})
    if (a.length || b.length) soChuyenLech++
    for (const [k, v] of a) day[k] = (day[k] ?? 0) + v
    for (const [k, v] of b) voRong[k] = (voRong[k] ?? 0) + v
  }
  return { day, voRong, soChuyenLech }
}
