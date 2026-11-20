// Gọi Cloud Functions quản lý nhân viên (functions/src/index.ts).
import { getFunctions, httpsCallable, connectFunctionsEmulator, FunctionsError } from 'firebase/functions'
import { doc, updateDoc } from 'firebase/firestore'
import { app, db, dungEmulator } from './firebase'
import type { VaiTro } from '../types'

const fns = getFunctions(app, 'asia-southeast1')
if (dungEmulator) connectFunctionsEmulator(fns, '127.0.0.1', 5001)

/** Lỗi từ máy chủ đã là câu tiếng Việt; lỗi mạng thì nói rõ là mạng. */
export function loiMayChu(e: unknown): string {
  if (e instanceof FunctionsError) {
    if (e.code === 'functions/unavailable' || e.code === 'functions/deadline-exceeded')
      return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.'
    if (e.code === 'functions/internal' && e.message === 'internal')
      return 'Máy chủ gặp lỗi. Thử lại sau ít phút.'
    // SDK có lúc gắn mã HTTP vào cuối, vd "… đã có tài khoản rồi. [409]".
    return e.message.replace(/\s*\[\d{3}\]$/, '')
  }
  return (e as Error)?.message ?? String(e)
}

export interface NhanVienMoiVao {
  dangNhap: string
  matKhau: string
  HoTen: string
  VaiTro: VaiTro
  SoDienThoai?: string
}

export async function taoNhanVien(d: NhanVienMoiVao) {
  await httpsCallable(fns, 'taoNhanVien')(d)
}

export async function datLaiMatKhau(uid: string, matKhau: string) {
  await httpsCallable(fns, 'datLaiMatKhau')({ uid, matKhau })
}

export async function doiTrangThai(uid: string, ngung: boolean) {
  await httpsCallable(fns, 'doiTrangThaiNhanVien')({ uid, ngung })
}

/** Sửa tên / vai trò / SĐT — ghi thẳng, firestore.rules chỉ cho Admin. */
export async function suaNhanVien(uid: string, d: { HoTen: string; VaiTro: VaiTro; SoDienThoai: string }) {
  await updateDoc(doc(db, 'NguoiDung', uid), d)
}
