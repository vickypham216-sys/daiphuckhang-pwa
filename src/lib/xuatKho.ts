// Kiểu dữ liệu phiếu xuất (máy chủ ghi — functions/src/index.ts xuatKho).
import type { NguoiTrenXe } from './dieuPhoi'

export interface DongXuat {
  SanPhamId: string
  Ten: string
  DonVi: string
  CoVo: boolean
  SoLuong: number
  TheoDon: number
}

export interface PhieuXuat {
  ChuyenId: string
  Ngay: string
  BienSo: string
  SoChuyen: number
  TaiXe: NguoiTrenXe
  PhuXe: NguoiTrenXe[]
  Dong: DongXuat[]
  /** Hàng / vỏ để lại trên xe từ chuyến trước, lúc xuất kho. */
  DauChuyen?: { Hang: Record<string, number>; VoRong: Record<string, number> }
  GhiChu: string | null
  TrangThai: 'ChoNhan' | 'DaNhan'
  TenNguoiTao: string
  TenNguoiNhan?: string
  NhanLuc?: { toDate(): Date }
}

export const gioPhut = (t?: { toDate(): Date }) =>
  t ? t.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : ''

export interface DoiSoatChuyen {
  PhaiCo: { Day: Record<string, number>; VoRong: Record<string, number> }
  Dem: { Day: Record<string, number>; VoRong: Record<string, number> } | null
  ChenhLech: { Day: Record<string, number>; VoRong: Record<string, number> }
  DeLai: boolean
  CoDem: boolean
  TienMatPhaiNop: number
  TenNguoi: string
  GhiChu: string | null
}
