// Vai trò trong app — Vicky chốt 17/11/2026 (BOI_CANH.md). Phụ xe CÓ đăng nhập.
// Thêm/bớt vai trò thì sửa cả laNhanVien() trong firestore.rules.
export type VaiTro = 'Admin' | 'DieuPhoi' | 'Sales' | 'KeToan' | 'ThuKho' | 'TaiXe' | 'PhuXe'

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  Admin: 'Quản trị',
  DieuPhoi: 'Điều phối',
  KeToan: 'Kế toán',
  ThuKho: 'Thủ kho',
  Sales: 'Bán hàng',
  TaiXe: 'Tài xế',
  PhuXe: 'Phụ xe',
}

/** Hồ sơ người dùng. ID document TRÙNG uid của Firebase Auth. */
export interface NguoiDung {
  HoTen: string
  VaiTro: VaiTro
  /** Thiếu trường này = đang dùng. */
  TrangThai?: 'Active' | 'Inactive'
}
