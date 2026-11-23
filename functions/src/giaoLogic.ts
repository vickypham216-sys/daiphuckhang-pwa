// Phiếu giao hàng — kiểu dữ liệu + kiểm tra, dùng chung app và máy chủ.
// App import thẳng file này (như nhanVienLogic.ts): không import Node/Firebase.
//
// Vicky chốt 20/11/2026:
//  - Tài xế ĐƯỢC giảm giá, bắt buộc lý do; Admin soát mỗi tối.
//  - Giao ít hơn đơn: được, bắt buộc lý do (hàng còn trên xe).
//  - Vỏ thiếu: tuỳ khách — NỢ VỎ hoặc THU CỌC, chọn mỗi lần giao.
//  - Thu tiền: tiền mặt, chuyển khoản (QR; kế toán xác nhận), ghi nợ.
//
// PhieuGiao là SỔ GỐC, KHÔNG SỬA: tài xế ghi khi giao (kể cả mất sóng), máy
// chủ cộng dồn công nợ / hàng trên xe ở bước kết thúc chuyến.

export interface DongGiao {
  SanPhamId: string
  Ten: string
  DonVi: string
  CoVo: boolean
  /** Số theo đơn (0 với đơn tại chỗ). */
  SoLuongDon: number
  SoLuong: number
  /** Giá theo đơn (giá mặc định với đơn tại chỗ). */
  GiaDon: number
  DonGia: number
}

export interface VoGiao {
  SanPhamId: string
  Ten: string
  /** Vỏ rỗng khách trả lại lần này (có thể > số giao: trả nợ vỏ cũ). */
  VoThu: number
  /** Vỏ thiếu ghi nợ cho khách. */
  NoVo: number
  /** Vỏ thiếu thu tiền cọc. */
  CocVo: number
  GiaCocVo: number
}

export interface ThanhToan {
  TienMat: number
  ChuyenKhoan: number
  GhiNo: number
}

export const tienHang = (dong: DongGiao[]) => dong.reduce((s, d) => s + d.SoLuong * d.DonGia, 0)
export const tienCoc = (vo: VoGiao[]) => vo.reduce((s, v) => s + v.CocVo * v.GiaCocVo, 0)
export const phaiThu = (dong: DongGiao[], vo: VoGiao[]) => tienHang(dong) + tienCoc(vo)
export const coGiamGia = (dong: DongGiao[]) => dong.some((d) => d.SoLuong > 0 && d.DonGia < d.GiaDon)
export const coGiaoThieu = (dong: DongGiao[]) => dong.some((d) => d.SoLuong < d.SoLuongDon)

/** Số vỏ còn thiếu của một sản phẩm có vỏ = giao − thu (không âm). */
export const voThieu = (soGiao: number, voThu: number) => Math.max(0, soGiao - voThu)

const nguyen = (n: number) => Number.isInteger(n) && n >= 0

/** Lỗi tiếng Việt hoặc null. `taiCho` = đơn tại chỗ (không có đơn gốc). */
export function kiemTraPhieuGiao(p: {
  Dong: DongGiao[]
  Vo: VoGiao[]
  TT: ThanhToan
  LyDoGiaoThieu: string | null
  LyDoGiamGia: string | null
  KhongGiao: boolean
  taiCho: boolean
}): string | null {
  if (p.Dong.length === 0) return 'Phiếu chưa có sản phẩm.'
  for (const d of p.Dong) {
    if (!nguyen(d.SoLuong)) return `${d.Ten}: số giao phải là số nguyên không âm.`
    if (!nguyen(d.DonGia)) return `${d.Ten}: giá không hợp lệ.`
    if (d.DonGia > d.GiaDon) return `${d.Ten}: giá giao không được cao hơn giá đơn (${d.GiaDon}).`
  }
  if (p.KhongGiao) {
    if (p.Dong.some((d) => d.SoLuong > 0)) return 'Đã đánh dấu "không giao được" thì số giao phải bằng 0.'
    if (!p.LyDoGiaoThieu?.trim()) return 'Cần ghi lý do không giao được.'
  } else {
    if (p.Dong.every((d) => d.SoLuong === 0)) return 'Chưa giao sản phẩm nào. Nếu khách không nhận, chọn "Không giao được".'
    if (p.taiCho && p.Dong.some((d) => d.SoLuong === 0)) return 'Đơn tại chỗ: bỏ dòng có số lượng 0.'
  }
  if (!p.taiCho && coGiaoThieu(p.Dong) && !p.LyDoGiaoThieu?.trim()) return 'Giao ít hơn đơn — cần ghi lý do.'
  if (coGiamGia(p.Dong) && !p.LyDoGiamGia?.trim()) return 'Có giảm giá — cần ghi lý do.'

  for (const v of p.Vo) {
    const d = p.Dong.find((x) => x.SanPhamId === v.SanPhamId)
    if (!d || !d.CoVo) return `${v.Ten}: sản phẩm này không có vỏ.`
    if (![v.VoThu, v.NoVo, v.CocVo].every(nguyen)) return `${v.Ten}: số vỏ phải là số nguyên không âm.`
    const thieu = voThieu(d.SoLuong, v.VoThu)
    if (v.NoVo + v.CocVo !== thieu)
      return `${v.Ten}: thiếu ${thieu} vỏ — phải chia hết vào "nợ vỏ" hoặc "thu cọc" (đang ${v.NoVo + v.CocVo}).`
    if (v.CocVo > 0 && !(v.GiaCocVo > 0)) return `${v.Ten}: sản phẩm chưa có giá cọc vỏ — chỉ ghi nợ vỏ được.`
  }

  const { TienMat, ChuyenKhoan, GhiNo } = p.TT
  if (![TienMat, ChuyenKhoan, GhiNo].every(nguyen)) return 'Số tiền phải là số nguyên không âm.'
  const can = phaiThu(p.Dong, p.Vo)
  if (TienMat + ChuyenKhoan + GhiNo !== can)
    return `Tiền mặt + chuyển khoản + ghi nợ phải bằng ${can.toLocaleString('vi-VN')}đ (đang ${(TienMat + ChuyenKhoan + GhiNo).toLocaleString('vi-VN')}đ).`
  return null
}
