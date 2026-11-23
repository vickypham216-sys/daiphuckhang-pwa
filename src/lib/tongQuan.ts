// Tổng quan — hàm thuần (scripts/kiemTraTongQuan.ts).

/** Giờ ghi phiếu: giờ trên máy tài xế (GioMay, đúng cả khi ghi lúc mất sóng), không có thì giờ máy chủ. */
export function gioPhieu(p: { GioMay?: number | null; TaoLuc?: { toMillis(): number } | null }): number | null {
  if (typeof p.GioMay === 'number' && p.GioMay > 0) return p.GioMay
  return p.TaoLuc ? p.TaoLuc.toMillis() : null
}

/**
 * Phiếu hôm qua ghi TRƯỚC cùng giờ hiện tại (giờ VN). So cả ngày hôm qua thì
 * buổi sáng lúc nào cũng "giảm" — MIA đã dẫm (BOI_CANH MIA 06/10/2026).
 * Phiếu không có giờ → tính (thà dư còn hơn thiếu một phiếu hôm qua).
 */
export function cungGioHomQua<T extends { GioMay?: number | null; TaoLuc?: { toMillis(): number } | null }>(ds: T[], bayGio: number): T[] {
  const moc = bayGio - 86_400_000
  return ds.filter((p) => {
    const g = gioPhieu(p)
    return g == null || g <= moc
  })
}

/** Tiến độ chuyến: số đơn đã có phiếu giao / tổng đơn. */
export function tienDo(donIds: string[], phieuDonIds: Set<string>): { xong: number; tong: number } {
  return { xong: donIds.filter((id) => phieuDonIds.has(id)).length, tong: donIds.length }
}
