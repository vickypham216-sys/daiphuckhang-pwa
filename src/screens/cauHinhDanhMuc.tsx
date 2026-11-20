// Khai báo trường của từng danh mục. Xem DanhMuc.tsx.
import type { BanGhi, CauHinhDanhMuc } from './DanhMuc'
import { dinhDangSo } from '../lib/so'
import { chuanHoaSdt } from '../../functions/src/nhanVienLogic'

/** "51c 12345", "51C-123.45" → "51C-123.45"; "51C 1234" → "51C-1234". Để so trùng. */
export function chuanBienSo(s: string): string {
  const t = s.toUpperCase().replace(/[\s.\-]/g, '')
  // Thử đầu biển chỉ có chữ trước (51C, 51LD), rồi mới tới chữ + số (51C1):
  // thử ngược lại thì "51C12345" bị cắt thành "51C1-2345".
  const m = t.match(/^(\d{2}[A-Z]{1,2})(\d{4,5})$/) ?? t.match(/^(\d{2}[A-Z]\d)(\d{4,5})$/)
  if (!m) return t
  const duoi = m[2].length === 5 ? `${m[2].slice(0, 3)}.${m[2].slice(3)}` : m[2]
  return `${m[1]}-${duoi}`
}

export const XE: CauHinhDanhMuc = {
  boSuuTap: 'Xe',
  tenMot: 'xe',
  truong: [
    { ma: 'BienSo', nhan: 'Biển số', kieu: 'chu', batBuoc: true, goiY: '51C-123.45' },
    { ma: 'TenXe', nhan: 'Tên gọi', kieu: 'chu', goiY: 'Xe 1, Xe Hino…' },
    { ma: 'TaiTrong', nhan: 'Chở tối đa (bình hoặc thùng)', kieu: 'so', goiY: 'Để trống nếu không cần' },
    { ma: 'GhiChu', nhan: 'Ghi chú', kieu: 'dai' },
  ],
  tieuDe: (d) => String(d.BienSo ?? ''),
  phu: (d) => [d.TenXe, d.TaiTrong ? `chở ${dinhDangSo(d.TaiTrong as number)}` : null].filter(Boolean).join(' · ') || '—',
  kiemTra: (d, tatCa) => {
    d.BienSo = chuanBienSo(String(d.BienSo))
    return tatCa.some((x) => chuanBienSo(String(x.BienSo ?? '')) === d.BienSo) ? `Biển số ${d.BienSo} đã có.` : null
  },
}

const DON_VI = ['Bình', 'Thùng', 'Lốc', 'Chai'].map((x) => ({ giaTri: x, nhan: x }))

export const SAN_PHAM: CauHinhDanhMuc = {
  boSuuTap: 'SanPham',
  tenMot: 'sản phẩm',
  truong: [
    { ma: 'Ten', nhan: 'Tên sản phẩm', kieu: 'chu', batBuoc: true, goiY: 'Bình 20L, Thùng 24 chai 500ml…' },
    { ma: 'DonVi', nhan: 'Đơn vị bán', kieu: 'chon', batBuoc: true, luaChon: DON_VI },
    { ma: 'GiaBan', nhan: 'Giá bán mặc định (đ)', kieu: 'tien', batBuoc: true },
    { ma: 'CoVo', nhan: 'Có vỏ phải thu về (bình cọc vỏ)', kieu: 'co' },
    { ma: 'GiaCocVo', nhan: 'Tiền cọc 1 vỏ (đ)', kieu: 'tien', hienKhi: (d) => d.CoVo === true, goiY: 'Để trống nếu không thu cọc' },
  ],
  macDinh: { DonVi: 'Bình', CoVo: false },
  tieuDe: (d) => String(d.Ten ?? ''),
  phu: (d) =>
    [`${dinhDangSo(d.GiaBan as number)}đ / ${String(d.DonVi ?? '').toLowerCase()}`, d.CoVo ? 'có vỏ' : null, d.GiaCocVo ? `cọc ${dinhDangSo(d.GiaCocVo as number)}đ` : null]
      .filter(Boolean)
      .join(' · '),
  kiemTra: (d, tatCa) =>
    tatCa.some((x) => String(x.Ten ?? '').toLowerCase() === String(d.Ten).toLowerCase()) ? `Đã có sản phẩm tên "${String(d.Ten)}".` : null,
}

export const KHACH_HANG: CauHinhDanhMuc = {
  boSuuTap: 'KhachHang',
  tenMot: 'khách hàng',
  coTimKiem: true,
  truong: [
    { ma: 'Ten', nhan: 'Tên khách / cửa hàng', kieu: 'chu', batBuoc: true },
    { ma: 'SoDienThoai', nhan: 'Số điện thoại', kieu: 'sdt' },
    { ma: 'DiaChi', nhan: 'Địa chỉ giao', kieu: 'dai', batBuoc: true },
    { ma: 'GhiChu', nhan: 'Ghi chú cho tài xế', kieu: 'dai', goiY: 'Giờ giao, gửi bảo vệ, tầng mấy…' },
  ],
  tieuDe: (d) => String(d.Ten ?? ''),
  phu: (d) => [d.SoDienThoai, d.DiaChi].filter(Boolean).join(' · ') || '—',
  kiemTra: (d: BanGhi, tatCa) => {
    if (d.SoDienThoai) {
      const s = chuanHoaSdt(String(d.SoDienThoai))
      if (!s) return `Số điện thoại "${String(d.SoDienThoai)}" không hợp lệ (cần 10 số).`
      d.SoDienThoai = s
      const trung = tatCa.find((x) => x.SoDienThoai === s)
      if (trung) return `Số ${s} đã là của khách "${String(trung.Ten)}". Tìm khách đó để sửa thay vì thêm mới.`
    }
    return null
  },
}
