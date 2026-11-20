// Xuất kho theo chuyến — phép tính thuần, để test.
//
// Vicky chốt 20/11/2026: thủ kho xuất SỐ THỰC (có thể > tổng đơn: hàng dư để
// bán dọc đường); tài xế bấm "Đã nhận đủ hàng" làm bằng chứng nhận.
//
// Hàng trên xe tính theo XE (TrenXe/{xeId}), chạy liên tục qua các chuyến —
// vì giữa 2 chuyến có thể để lại hàng trên xe (BOI_CANH "tuỳ chuyến").

export interface DongXuat {
  SanPhamId: string
  Ten: string
  DonVi: string
  CoVo: boolean
  SoLuong: number
  /** Tổng theo đơn của chuyến — để biết bao nhiêu là hàng dư. */
  TheoDon: number
}

const soNguyen = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n)

/** Đọc dòng xuất từ app (chỉ lấy SanPhamId + SoLuong; tên/CoVo máy chủ tự lấy). */
export function docDongXuat(vao: unknown): { SanPhamId: string; SoLuong: number }[] | string {
  if (!Array.isArray(vao)) return "Dữ liệu xuất không hợp lệ."
  const kq: { SanPhamId: string; SoLuong: number }[] = []
  const daCo = new Set<string>()
  for (const x of vao as Record<string, unknown>[]) {
    if (typeof x?.SanPhamId !== "string" || !x.SanPhamId) return "Dòng xuất thiếu mã sản phẩm."
    if (daCo.has(x.SanPhamId)) return "Một sản phẩm bị lặp hai dòng."
    daCo.add(x.SanPhamId)
    if (!soNguyen(x.SoLuong) || x.SoLuong < 0 || x.SoLuong > 100_000) return "Số lượng xuất phải là số nguyên không âm."
    if (x.SoLuong > 0) kq.push({ SanPhamId: x.SanPhamId, SoLuong: x.SoLuong })
  }
  if (kq.length === 0) return "Phiếu xuất chưa có hàng nào."
  if (kq.length > 50) return "Phiếu xuất quá 50 dòng."
  return kq
}

/** Tổng số lượng theo sản phẩm từ các đơn (bỏ đơn huỷ). */
export function tongTheoSanPham(don: { TrangThai: string; Dong: { SanPhamId: string; SoLuong: number }[] }[]): Record<string, number> {
  const kq: Record<string, number> = {}
  for (const d of don) {
    if (d.TrangThai === "Huy") continue
    for (const x of d.Dong) kq[x.SanPhamId] = (kq[x.SanPhamId] ?? 0) + x.SoLuong
  }
  return kq
}

/** Tồn kho sau khi xuất, hoặc lỗi khi kho không đủ hàng đầy. */
export function tinhXuat(dong: { SanPhamId: string; Ten: string; SoLuong: number }[], tonDay: Record<string, number>): Record<string, number> | string {
  const kq: Record<string, number> = {}
  for (const d of dong) {
    const co = tonDay[d.SanPhamId] ?? 0
    if (d.SoLuong > co) return `${d.Ten}: kho chỉ còn ${co}, không xuất ${d.SoLuong} được.`
    kq[d.SanPhamId] = co - d.SoLuong
  }
  return kq
}

/** Cộng hàng vào xe. `hang` = hàng đầy trên xe theo sản phẩm. */
export function congLenXe(hang: Record<string, number>, dong: { SanPhamId: string; SoLuong: number }[], dau = 1): Record<string, number> {
  const kq = { ...hang }
  for (const d of dong) kq[d.SanPhamId] = (kq[d.SanPhamId] ?? 0) + dau * d.SoLuong
  return kq
}
