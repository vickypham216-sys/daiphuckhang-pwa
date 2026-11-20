// Gọi Cloud Functions quản lý nhân viên (functions/src/index.ts).
import { doc, updateDoc } from 'firebase/firestore'
import { db } from './firebase'
import { goi } from './goiMayChu'
import type { VaiTro } from '../types'

export { loiMayChu } from './goiMayChu'

export interface NhanVienMoiVao {
  dangNhap: string
  matKhau: string
  HoTen: string
  VaiTro: VaiTro
  SoDienThoai?: string
}

export async function taoNhanVien(d: NhanVienMoiVao) {
  await goi('taoNhanVien', d)
}

export async function datLaiMatKhau(uid: string, matKhau: string) {
  await goi('datLaiMatKhau', { uid, matKhau })
}

export async function doiTrangThai(uid: string, ngung: boolean) {
  await goi('doiTrangThaiNhanVien', { uid, ngung })
}

/** Sửa tên / vai trò / SĐT — ghi thẳng, firestore.rules chỉ cho Admin. */
export async function suaNhanVien(uid: string, d: { HoTen: string; VaiTro: VaiTro; SoDienThoai: string }) {
  await updateDoc(doc(db, 'NguoiDung', uid), d)
}
