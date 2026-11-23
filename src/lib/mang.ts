// Trạng thái mạng cho viên "Có mạng / Mất mạng" ở đầu trang (như MIA).
import { useEffect, useState } from 'react'

export function useCoMang() {
  const [co, setCo] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const bat = () => setCo(true), tat = () => setCo(false)
    window.addEventListener('online', bat)
    window.addEventListener('offline', tat)
    return () => { window.removeEventListener('online', bat); window.removeEventListener('offline', tat) }
  }, [])
  return co
}

/** Chữ to: lưu trên máy (localStorage), bọc try/catch — trình duyệt chặn bộ nhớ thì vẫn chạy. */
export function docChuTo(): boolean {
  try { return localStorage.getItem('dpk:chuto') === '1' } catch { return false }
}
export function ghiChuTo(bat: boolean) {
  try { localStorage.setItem('dpk:chuto', bat ? '1' : '0') } catch { /* bỏ qua */ }
  document.documentElement.setAttribute('data-chuto', bat ? '1' : '0')
}
