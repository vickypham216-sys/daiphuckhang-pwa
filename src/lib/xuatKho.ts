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
  GhiChu: string | null
  TrangThai: 'ChoNhan' | 'DaNhan'
  TenNguoiTao: string
  TenNguoiNhan?: string
  NhanLuc?: { toDate(): Date }
}

export const gioPhut = (t?: { toDate(): Date }) =>
  t ? t.toDate().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : ''
