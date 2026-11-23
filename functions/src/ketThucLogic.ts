// Kết thúc chuyến — đối soát hàng, vỏ, tiền + cộng công nợ khách. Hàm thuần.
//
// Số phải có trên xe khi về:
//   hàng đầy[sp] = TrenXe.Hang[sp] (tồn để lại + xuất)  − Σ số giao
//   vỏ rỗng[sp]  = TrenXe.VoRong[sp] (để lại từ trước) + Σ vỏ thu về
//   tiền mặt     = Σ TienMat của các phiếu giao
// Chênh lệch = số đếm − số phải có (âm = thiếu). App KHÔNG tự trừ ai: Admin
// xử lý tay (Vicky chốt 20/11/2026).

export interface PhieuTinh {
  KhachHangId: string | null
  TenKhach: string
  Dong: { SanPhamId: string; SoLuong: number }[]
  Vo: { SanPhamId: string; VoThu: number; NoVo: number; CocVo: number; GiaCocVo: number }[]
  TT: { TienMat: number; ChuyenKhoan: number; GhiNo: number }
}

export type TheoSp = Record<string, number>

export function soPhaiCo(trenXe: { Hang?: TheoSp; VoRong?: TheoSp }, phieu: PhieuTinh[]) {
  const Day: TheoSp = { ...(trenXe.Hang ?? {}) }
  const VoRong: TheoSp = { ...(trenXe.VoRong ?? {}) }
  let TienMat = 0
  for (const p of phieu) {
    for (const d of p.Dong) Day[d.SanPhamId] = (Day[d.SanPhamId] ?? 0) - d.SoLuong
    for (const v of p.Vo) VoRong[v.SanPhamId] = (VoRong[v.SanPhamId] ?? 0) + v.VoThu
    TienMat += p.TT.TienMat
  }
  return { Day, VoRong, TienMat }
}

/** dem − phaiCo theo từng sản phẩm (hợp khoá của cả hai). Bỏ dòng bằng 0. */
export function chenhLech(phaiCo: TheoSp, dem: TheoSp): TheoSp {
  const kq: TheoSp = {}
  for (const k of new Set([...Object.keys(phaiCo), ...Object.keys(dem)])) {
    const c = (dem[k] ?? 0) - (phaiCo[k] ?? 0)
    if (c !== 0) kq[k] = c
  }
  return kq
}

export interface CongNoThem {
  TenKhach: string
  NoTien: number
  /** + nợ thêm, − trả bớt (thu dư vỏ = trả vỏ nợ cũ). */
  NoVo: TheoSp
  /** Số vỏ khách đang giữ có cọc. */
  CocVo: TheoSp
  TienCoc: number
}

/** Công nợ phát sinh theo khách từ các phiếu giao (khách lẻ — không id — bỏ qua). */
export function congNoTuPhieu(phieu: PhieuTinh[], soGiao: (p: PhieuTinh, spId: string) => number): Record<string, CongNoThem> {
  const kq: Record<string, CongNoThem> = {}
  for (const p of phieu) {
    if (!p.KhachHangId) continue
    const c = (kq[p.KhachHangId] ??= { TenKhach: p.TenKhach, NoTien: 0, NoVo: {}, CocVo: {}, TienCoc: 0 })
    c.NoTien += p.TT.GhiNo
    for (const v of p.Vo) {
      const du = Math.max(0, v.VoThu - soGiao(p, v.SanPhamId)) // trả vỏ cũ
      const no = v.NoVo - du
      if (no !== 0) c.NoVo[v.SanPhamId] = (c.NoVo[v.SanPhamId] ?? 0) + no
      if (v.CocVo > 0) {
        c.CocVo[v.SanPhamId] = (c.CocVo[v.SanPhamId] ?? 0) + v.CocVo
        c.TienCoc += v.CocVo * v.GiaCocVo
      }
    }
  }
  return kq
}

/** Cộng hai bảng theo sản phẩm. */
export function cong(a: TheoSp = {}, b: TheoSp = {}): TheoSp {
  const kq: TheoSp = { ...a }
  for (const [k, v] of Object.entries(b)) kq[k] = (kq[k] ?? 0) + v
  return kq
}

/**
 * Có bắt buộc đếm không. Vicky chốt: để lại trên xe mà chuyến SAU khác tổ thì
 * phải đếm. Trả về kho thì luôn đếm (kho nhận lại hàng).
 * `toSau` = uid tổ xe chuyến kế tiếp của xe (null = chưa có chuyến sau).
 */
export function batBuocDem(deLai: boolean, toNay: string[], toSau: string[] | null): boolean {
  if (!deLai) return true
  if (!toSau) return true // chưa biết ai chạy tiếp — đếm cho chắc
  const a = [...toNay].sort().join(","), b = [...toSau].sort().join(",")
  return a !== b
}
