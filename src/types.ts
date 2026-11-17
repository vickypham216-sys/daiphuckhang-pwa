// Vai trò trong app. Danh sách TẠM: chờ Vicky chốt (BOI_CANH.md mục 2).
export type VaiTro = 'Admin' | 'ThuKho' | 'Sales' | 'TaiXe' | 'PhuXe'

export const TEN_VAI_TRO: Record<VaiTro, string> = {
  Admin: 'Quản trị',
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
