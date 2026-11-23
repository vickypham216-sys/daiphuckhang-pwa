// Điều phối chuyến — kiểu dữ liệu và phép tính thuần, để test.
//
// Chuyến = MỘT xe + MỘT tổ xe (1 tài xế, 0–3 phụ xe) + danh sách đơn theo
// THỨ TỰ GIAO, trong một ngày. Một xe chạy nhiều chuyến/ngày (SoChuyen 1, 2…).
// Tổ xe gắn với CHUYẾN, không gắn với xe: giữa 2 chuyến có thể đổi người.
// Xem BOI_CANH.md mục "KHÔNG có tuyến cố định".

import type { DongDon } from './donHang'

export type TrangThaiChuyen = 'LapKeHoach' | 'DaXuatKho' | 'DangGiao' | 'VeKho' | 'HoanThanh' | 'Huy'

export const TEN_TRANG_THAI_CHUYEN: Record<TrangThaiChuyen, string> = {
  LapKeHoach: 'Đang xếp đơn',
  DaXuatKho: 'Đã xuất kho',
  DangGiao: 'Đang giao',
  VeKho: 'Về kho, chờ đối soát',
  HoanThanh: 'Hoàn thành',
  Huy: 'Đã huỷ',
}

export const PHU_XE_TOI_DA = 3

export interface NguoiTrenXe {
  uid: string
  HoTen: string
}

export interface Chuyen {
  Ngay: string
  XeId: string
  BienSo: string
  SoChuyen: number
  TaiXe: NguoiTrenXe
  PhuXe: NguoiTrenXe[]
  /** uid tài xế + phụ xe — để luật Firestore kiểm "người này có trong tổ xe". */
  ToXeUids?: string[]
  /** Mã đơn theo thứ tự giao. */
  DonIds: string[]
  TrangThai: TrangThaiChuyen
  GhiChu: string | null
  TaoBoi: string
  /** Có sau khi kết thúc chuyến: tiền mặt tài xế phải nộp kế toán. */
  NopTien?: { TrangThai: 'ChoNop' | 'DaNop' | 'KhongCo'; PhaiNop: number; SoNhan?: number; ChenhLech?: number; TenNguoi?: string }
}

/** Số chuyến tiếp theo của một xe trong ngày: lớn nhất hiện có + 1 (kể cả chuyến đã huỷ, để số không bị dùng lại). */
export function soChuyenTiepTheo(chuyenTrongNgay: Pick<Chuyen, 'XeId' | 'SoChuyen'>[], xeId: string): number {
  return Math.max(0, ...chuyenTrongNgay.filter((c) => c.XeId === xeId).map((c) => c.SoChuyen)) + 1
}

/** "51C-123.45 · C2" — nhãn ngắn ghi lên đơn để Sales thấy đơn đi xe nào. */
export const nhanChuyen = (c: Pick<Chuyen, 'BienSo' | 'SoChuyen'>) => `${c.BienSo} · C${c.SoChuyen}`

/** Lỗi tổ xe (tiếng Việt) hoặc null. */
export function kiemTraToXe(taiXeId: string, phuXeIds: string[]): string | null {
  if (!taiXeId) return 'Chưa chọn tài xế.'
  if (phuXeIds.length > PHU_XE_TOI_DA) return `Tối đa ${PHU_XE_TOI_DA} phụ xe.`
  if (phuXeIds.includes(taiXeId)) return 'Tài xế không thể đồng thời là phụ xe.'
  if (new Set(phuXeIds).size !== phuXeIds.length) return 'Một phụ xe bị chọn hai lần.'
  return null
}

/**
 * Người đang có mặt ở một chuyến KHÁC còn chạy cùng ngày (chưa hoàn thành /
 * chưa huỷ). Chỉ để CẢNH BÁO: một người làm chuyến 1 xong rồi chạy chuyến 2
 * là bình thường, nhưng xếp trùng lúc lập kế hoạch thường là bấm nhầm.
 */
export function nguoiBiTrung(
  uids: string[],
  chuyenKhac: Pick<Chuyen, 'TaiXe' | 'PhuXe' | 'TrangThai' | 'BienSo' | 'SoChuyen'>[],
): { uid: string; o: string }[] {
  const kq: { uid: string; o: string }[] = []
  for (const c of chuyenKhac) {
    if (c.TrangThai === 'HoanThanh' || c.TrangThai === 'Huy') continue
    const tren = [c.TaiXe.uid, ...c.PhuXe.map((p) => p.uid)]
    for (const u of uids) if (tren.includes(u)) kq.push({ uid: u, o: nhanChuyen(c) })
  }
  return kq
}

/** Tổng số lượng theo đơn vị (Bình, Thùng…) của các đơn trên chuyến. */
export function tongTheoDonVi(dsDong: DongDon[][]): Record<string, number> {
  const kq: Record<string, number> = {}
  for (const dong of dsDong) for (const d of dong) kq[d.DonVi] = (kq[d.DonVi] ?? 0) + d.SoLuong
  return kq
}

/** Đổi chỗ phần tử i với i+buoc (buoc = -1 lên, +1 xuống). Ra ngoài biên thì giữ nguyên. */
export function doiThuTu<T>(ds: T[], i: number, buoc: -1 | 1): T[] {
  const j = i + buoc
  if (i < 0 || i >= ds.length || j < 0 || j >= ds.length) return ds
  const kq = ds.slice()
  ;[kq[i], kq[j]] = [kq[j], kq[i]]
  return kq
}

/** Tổ xe của chuyến GẦN NHẤT của xe này (để điền sẵn khi tạo chuyến mới). */
export function toXeGanNhat<C extends Pick<Chuyen, 'XeId' | 'Ngay' | 'SoChuyen' | 'TaiXe' | 'PhuXe' | 'TrangThai'>>(
  ds: C[],
  xeId: string,
): Pick<Chuyen, 'TaiXe' | 'PhuXe'> | null {
  const cua = ds
    .filter((c) => c.XeId === xeId && c.TrangThai !== 'Huy')
    .sort((a, b) => (a.Ngay === b.Ngay ? b.SoChuyen - a.SoChuyen : a.Ngay < b.Ngay ? 1 : -1))
  return cua[0] ? { TaiXe: cua[0].TaiXe, PhuXe: cua[0].PhuXe } : null
}
