// Biểu tượng tab + logo — vẽ thẳng bằng SVG (như MIA): app phải mở được khi
// mất sóng, không tải bộ icon / ảnh ngoài. Nét dùng currentColor.
import type { ReactNode } from 'react'

export const ICON: Record<string, ReactNode> = {
  trangchu: (<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>),
  dieuphoi: (<><path d="M3 16V9h11v7M14 11h3.5l2.5 3v2h-6" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>),
  chuyen: (<><path d="M3 16V9h11v7M14 11h3.5l2.5 3v2h-6" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>),
  donhang: (<><path d="M5 7h14l-1 13H6L5 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>),
  kho: (<><path d="M3 10 12 4l9 6v10H3V10Z" /><path d="M9 20v-6h6v6" /></>),
  ketoan: (<><path d="M3 7h18v11H3z" /><path d="M3 11h18M7 15h3" /></>),
  baocao: (<><path d="M4 4h16v16H4z" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>),
  khach: (<><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><path d="M16 4.5a3 3 0 0 1 0 6M18 14c2 .8 3 2.8 3 6" /></>),
  danhmuc: (<><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="8" cy="5" r="1.4" /><circle cx="14" cy="12" r="1.4" /><circle cx="10" cy="19" r="1.4" /></>),
  sanpham: (<><path d="M9 3h6v3l2 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9l2-3V3Z" /><path d="M7 13h10" /></>),
  xe: (<><path d="M3 16V9h11v7M14 11h3.5l2.5 3v2h-6" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>),
  nhanvien: (<><circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" /></>),
  ncc: (<><path d="M3 21V9l6 3V9l6 3V5h6v16H3Z" /></>),
}

export function Icon({ ten, co = 19 }: { ten: string; co?: number }) {
  return (
    <svg width={co} height={co} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON[ten]}
    </svg>
  )
}

/** Logo tạm: giọt nước trong ô vuông bo góc. Thay bằng logo thật của Đại Phúc Khang khi có. */
export function Logo({ co = 30 }: { co?: number }) {
  return (
    <svg width={co} height={co} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#ffffff" />
      <path d="M16 5c-3.6 5-7 8.6-7 12.6A7 7 0 0 0 23 17.6C23 13.6 19.6 10 16 5Z" fill="#2563eb" />
      <path d="M12.6 18.4a3.6 3.6 0 0 0 3.4 3.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  )
}
