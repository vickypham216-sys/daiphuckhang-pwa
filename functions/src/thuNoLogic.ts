// Thu nợ khách — phiếu thu + áp vào công nợ. Dùng chung app + máy chủ.
//
// Một phiếu thu có thể gồm: thu tiền nợ (tiền mặt / chuyển khoản), thu vỏ
// khách đang nợ, hoàn cọc (khách trả vỏ đã cọc → công ty trả lại tiền cọc).
// Tài xế thu trên đường (ghi khi mất sóng được, áp vào sổ lúc chốt chuyến);
// kế toán thu ở văn phòng (áp ngay).

export type TheoSp = Record<string, number>

export interface PhieuThuSo {
  TienMat: number
  ChuyenKhoan: number
  /** Vỏ khách trả để giảm nợ vỏ. */
  TraVo: TheoSp
  /** Số vỏ đã cọc khách trả lại. */
  HoanCocVo: TheoSp
  /** Tiền cọc công ty trả lại khách (tiền mặt). */
  TienHoanCoc: number
}

export interface CongNo {
  NoTien: number
  NoVo: TheoSp
  CocVo: TheoSp
  TienCoc: number
}

const nguyen = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n >= 0
const tong = (m: TheoSp) => Object.values(m).reduce((s, n) => s + n, 0)

/** Lỗi tiếng Việt hoặc null. `no` = công nợ hiện tại của khách (để chặn thu quá). */
export function kiemTraPhieuThu(p: PhieuThuSo, no: CongNo | null, giaCoc: TheoSp): string | null {
  if (![p.TienMat, p.ChuyenKhoan, p.TienHoanCoc].every(nguyen)) return 'Số tiền phải là số nguyên không âm.'
  for (const m of [p.TraVo, p.HoanCocVo]) for (const v of Object.values(m)) if (!nguyen(v)) return 'Số vỏ phải là số nguyên không âm.'
  if (p.TienMat + p.ChuyenKhoan === 0 && tong(p.TraVo) === 0 && tong(p.HoanCocVo) === 0) return 'Phiếu thu chưa có gì.'
  const n = no ?? { NoTien: 0, NoVo: {}, CocVo: {}, TienCoc: 0 }
  if (p.TienMat + p.ChuyenKhoan > Math.max(0, n.NoTien)) return `Khách chỉ đang nợ ${Math.max(0, n.NoTien).toLocaleString('vi-VN')}đ.`
  for (const [sp, v] of Object.entries(p.TraVo)) if (v > Math.max(0, n.NoVo[sp] ?? 0)) return `Khách chỉ đang nợ ${Math.max(0, n.NoVo[sp] ?? 0)} vỏ.`
  for (const [sp, v] of Object.entries(p.HoanCocVo)) if (v > (n.CocVo[sp] ?? 0)) return `Khách chỉ có ${n.CocVo[sp] ?? 0} vỏ đang cọc.`
  // Hoàn cọc = số vỏ × giá cọc hiện hành, không vượt tổng tiền cọc đang giữ.
  const hoan = tienHoanCoc(p.HoanCocVo, giaCoc, n.TienCoc)
  if (p.TienHoanCoc !== hoan) return `Tiền hoàn cọc phải là ${hoan.toLocaleString('vi-VN')}đ.`
  return null
}

export function tienHoanCoc(hoanCocVo: TheoSp, giaCoc: TheoSp, dangGiu: number): number {
  return Math.min(Math.max(0, dangGiu), Object.entries(hoanCocVo).reduce((s, [sp, n]) => s + n * (giaCoc[sp] ?? 0), 0))
}

const bot = (a: TheoSp = {}, b: TheoSp = {}) => {
  const kq: TheoSp = { ...a }
  for (const [k, v] of Object.entries(b)) kq[k] = (kq[k] ?? 0) - v
  for (const k of Object.keys(kq)) if (kq[k] === 0) delete kq[k]
  return kq
}

/** Công nợ sau khi áp phiếu thu. CK chưa xác nhận vẫn trừ — "Không thấy" thì cộng lại. */
export function apPhieuThu(no: Partial<CongNo> | undefined, p: PhieuThuSo): CongNo {
  return {
    NoTien: (no?.NoTien ?? 0) - p.TienMat - p.ChuyenKhoan,
    NoVo: bot(no?.NoVo, p.TraVo),
    CocVo: bot(no?.CocVo, p.HoanCocVo),
    TienCoc: (no?.TienCoc ?? 0) - p.TienHoanCoc,
  }
}

/** Tác động lên chuyến (tài xế thu): tiền mặt phải nộp thêm, vỏ rỗng trên xe thêm. */
export function tacDongChuyen(p: PhieuThuSo): { TienMat: number; VoRong: TheoSp } {
  const vo: TheoSp = { ...p.TraVo }
  for (const [k, v] of Object.entries(p.HoanCocVo)) vo[k] = (vo[k] ?? 0) + v
  return { TienMat: p.TienMat - p.TienHoanCoc, VoRong: vo }
}
