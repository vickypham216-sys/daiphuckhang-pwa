// Đơn hàng — kiểu dữ liệu và phép tính thuần (không đụng Firebase) để test.
//
// Quy trình (Vicky chốt 20/11/2026): Sales nhận đơn (điện thoại, Zalo) và
// nhập trong ngày; sáng hôm sau Điều phối gán đơn vào chuyến xe.
//
// Đơn CHỤP LẠI tên/địa chỉ khách và tên/giá sản phẩm lúc tạo: khách đổi địa
// chỉ, sản phẩm đổi giá về sau thì đơn cũ không được đổi theo.

export type TrangThaiDon = 'Moi' | 'DaGan' | 'DaGiao' | 'KhongGiao' | 'Huy'

export const TEN_TRANG_THAI_DON: Record<TrangThaiDon, string> = {
  Moi: 'Chờ gán xe',
  DaGan: 'Đã gán xe',
  DaGiao: 'Đã giao',
  KhongGiao: 'Không giao được',
  Huy: 'Đã huỷ',
}

export interface DongDon {
  SanPhamId: string
  Ten: string
  DonVi: string
  CoVo: boolean
  SoLuong: number
  DonGia: number
}

export interface DonHang {
  KhachHangId: string
  TenKhach: string
  DiaChi: string
  SoDienThoai: string | null
  GhiChuKhach: string | null
  NgayGiao: string // YYYY-MM-DD giờ Việt Nam
  Dong: DongDon[]
  GhiChu: string | null
  TrangThai: TrangThaiDon
  ChuyenId: string | null
  /** Nhãn chuyến khi đã gán, vd "51C-123.45 · C1" — để Sales thấy đơn đi xe nào. */
  XeGan?: string | null
  /** Xe người lên đơn chọn khi xe đó chưa có chuyến: khi điều phối tạo chuyến cho xe này, đơn tự vào chuyến. */
  XeDuKien?: { XeId: string; BienSo: string } | null
  TaoBoi: string
  TenNguoiTao: string
  LyDoHuy?: string
}

/** Ngày theo giờ Việt Nam, dạng YYYY-MM-DD. `cong` = số ngày cộng thêm. */
export function ngayVN(cong = 0, bayGio: Date = new Date()): string {
  const d = new Date(bayGio.getTime() + cong * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d)
}

/** "2026-11-21" → "T7 21/11" */
export function hienNgay(ngay: string): string {
  const [y, m, d] = ngay.split('-').map(Number)
  const thu = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return `${thu === 0 ? 'CN' : 'T' + (thu + 1)} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export const tienDong = (d: DongDon) => d.SoLuong * d.DonGia
export const tongTien = (dong: DongDon[]) => dong.reduce((s, d) => s + tienDong(d), 0)

/** "Bình 20L × 5, Thùng 500ml × 2" */
export const tomTatDong = (dong: DongDon[]) => dong.map((d) => `${d.Ten} × ${d.SoLuong}`).join(', ')

/** Lỗi tiếng Việt, hoặc null khi đơn hợp lệ để lưu. */
export function kiemTraDon(d: Pick<DonHang, 'KhachHangId' | 'NgayGiao' | 'Dong'>, homNay: string): string | null {
  if (!d.KhachHangId) return 'Chưa chọn khách.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.NgayGiao)) return 'Ngày giao không hợp lệ.'
  if (d.NgayGiao < homNay) return 'Ngày giao đã qua.'
  if (d.Dong.length === 0) return 'Chưa có sản phẩm nào (số lượng phải lớn hơn 0).'
  for (const x of d.Dong) {
    if (!Number.isInteger(x.SoLuong) || x.SoLuong <= 0) return `${x.Ten}: số lượng phải là số nguyên lớn hơn 0.`
    if (x.SoLuong > 10_000) return `${x.Ten}: số lượng ${x.SoLuong} quá lớn, kiểm tra lại.`
    if (!Number.isFinite(x.DonGia) || x.DonGia < 0) return `${x.Ten}: đơn giá không hợp lệ.`
  }
  return null
}
