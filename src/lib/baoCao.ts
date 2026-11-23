// Báo cáo doanh thu — hàm thuần, để test (scripts/kiemTraBaoCao.ts).
//
// NGUỒN: PhieuGiao (sổ gốc, không sửa). Doanh thu = Σ số giao × đơn giá giao
// (đã trừ giảm giá; KHÔNG gồm tiền cọc — cọc là tiền giữ hộ, trả lại khi khách
// trả vỏ). Chuyển khoản "Không thấy" vẫn là doanh thu: hàng đã giao, khách
// chuyển sang nợ. Phiếu "không giao được" có số giao 0 nên tự ra 0.

import { ngayVN } from './donHang'

export interface DongBC { SanPhamId: string; Ten: string; DonVi: string; SoLuong: number; GiaDon: number; DonGia: number }
export interface PhieuBC {
  Ngay: string
  Dong: DongBC[]
  TT: { TienMat: number; ChuyenKhoan: number; GhiNo: number }
  TienCoc?: number
  KhongGiao?: boolean
  TaiCho?: boolean
  DonId?: string | null
  BienSo?: string
  TenNguoiTao?: string
  KhachHangId?: string | null
  TenKhach?: string
}

export type MaKy = 'homnay' | 'homqua' | '7ngay' | 'thangnay' | 'thangtruoc'
export const TEN_KY: Record<MaKy, string> = { homnay: 'Hôm nay', homqua: 'Hôm qua', '7ngay': '7 ngày', thangnay: 'Tháng này', thangtruoc: 'Tháng trước' }

const cong = (ngay: string, n: number) => {
  const [y, m, d] = ngay.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
export const soNgay = (tu: string, den: string) =>
  Math.round((Date.parse(den + 'T00:00:00Z') - Date.parse(tu + 'T00:00:00Z')) / 86_400_000) + 1

/** Kỳ báo cáo theo giờ Việt Nam. `homNay` truyền vào để test. */
export function kyBaoCao(ma: MaKy, homNay = ngayVN()): { tu: string; den: string } {
  const dauThang = homNay.slice(0, 8) + '01'
  switch (ma) {
    case 'homnay': return { tu: homNay, den: homNay }
    case 'homqua': return { tu: cong(homNay, -1), den: cong(homNay, -1) }
    case '7ngay': return { tu: cong(homNay, -6), den: homNay }
    case 'thangnay': return { tu: dauThang, den: homNay }
    case 'thangtruoc': {
      const cuoi = cong(dauThang, -1)
      return { tu: cuoi.slice(0, 8) + '01', den: cuoi }
    }
  }
}

/**
 * Kỳ so sánh: cùng số ngày, ngay trước kỳ. Riêng "Tháng này" (chưa hết tháng)
 * so với CÙNG SỐ NGÀY đầu tháng trước — so cả tháng trước thì đầu tháng lúc
 * nào cũng "giảm" (MIA đã dẫm: so cả ngày hôm qua thì buổi sáng luôn hụt).
 */
export function kyTruoc(tu: string, den: string): { tu: string; den: string } {
  const n = soNgay(tu, den)
  if (tu.endsWith('-01') && n < 28) {
    const truoc = cong(tu, -1).slice(0, 8) + '01'
    const cuoiThangTruoc = cong(tu, -1)
    const den2 = cong(truoc, n - 1)
    return { tu: truoc, den: den2 > cuoiThangTruoc ? cuoiThangTruoc : den2 }
  }
  return { tu: cong(tu, -n), den: cong(tu, -1) }
}

export const doanhThuPhieu = (p: PhieuBC) => p.Dong.reduce((s, d) => s + d.SoLuong * d.DonGia, 0)
export const giamGiaPhieu = (p: PhieuBC) => p.Dong.reduce((s, d) => s + d.SoLuong * Math.max(0, d.GiaDon - d.DonGia), 0)

export interface Dong3 { khoa: string; ten: string; luot: number; soLuong: number; doanhThu: number }

export interface TongHop {
  doanhThu: number
  luotGiao: number
  khongGiao: number
  taiCho: number
  giamGia: number
  tienMat: number
  chuyenKhoan: number
  ghiNo: number
  /** Tiền cọc vỏ thu trong kỳ — nằm TRONG tiền mặt/CK/nợ, không phải doanh thu. */
  tienCoc: number
  /** Sản lượng theo đơn vị: { Bình: 120, Thùng: 30 } */
  sanLuong: Record<string, number>
  theoSanPham: Dong3[]
  theoXe: Dong3[]
  theoKhach: Dong3[]
  theoSales: Dong3[]
}

function gom(m: Map<string, Dong3>, khoa: string, ten: string, sl: number, dt: number, luot = 1) {
  const x = m.get(khoa) ?? { khoa, ten, luot: 0, soLuong: 0, doanhThu: 0 }
  x.luot += luot
  x.soLuong += sl
  x.doanhThu += dt
  m.set(khoa, x)
}
const sx = (m: Map<string, Dong3>) => [...m.values()].sort((a, b) => b.doanhThu - a.doanhThu || a.ten.localeCompare(b.ten, 'vi'))

/** `salesCuaDon` = DonId → tên Sales tạo đơn (đơn tại chỗ → "Bán tại chỗ"). */
export function tongHop(ds: PhieuBC[], salesCuaDon: (donId: string) => string | undefined = () => undefined): TongHop {
  const kq: TongHop = { doanhThu: 0, luotGiao: 0, khongGiao: 0, taiCho: 0, giamGia: 0, tienMat: 0, chuyenKhoan: 0, ghiNo: 0, tienCoc: 0, sanLuong: {}, theoSanPham: [], theoXe: [], theoKhach: [], theoSales: [] }
  const sp = new Map<string, Dong3>(), xe = new Map<string, Dong3>(), kh = new Map<string, Dong3>(), sa = new Map<string, Dong3>()
  for (const p of ds) {
    if (p.KhongGiao) { kq.khongGiao++; continue }
    const dt = doanhThuPhieu(p)
    const sl = p.Dong.reduce((s, d) => s + d.SoLuong, 0)
    kq.doanhThu += dt
    kq.luotGiao++
    if (p.TaiCho) kq.taiCho++
    kq.giamGia += giamGiaPhieu(p)
    // Tiền thu của phiếu GỒM cả cọc (không biết cọc trả bằng cách nào) —
    // hiển thị riêng dòng "trong đó cọc vỏ" để khớp với doanh thu.
    kq.tienMat += p.TT.TienMat
    kq.chuyenKhoan += p.TT.ChuyenKhoan
    kq.ghiNo += p.TT.GhiNo
    for (const d of p.Dong) {
      if (d.SoLuong <= 0) continue
      kq.sanLuong[d.DonVi] = (kq.sanLuong[d.DonVi] ?? 0) + d.SoLuong
      gom(sp, d.SanPhamId, d.Ten, d.SoLuong, d.SoLuong * d.DonGia)
    }
    gom(xe, p.BienSo ?? '?', p.BienSo ?? '?', sl, dt)
    gom(kh, p.KhachHangId ?? 'le:' + (p.TenKhach ?? ''), p.KhachHangId ? (p.TenKhach ?? '?') : `${p.TenKhach ?? ''} (khách lẻ)`, sl, dt)
    const s = p.TaiCho || !p.DonId ? 'Bán tại chỗ' : (salesCuaDon(p.DonId) ?? '(không rõ)')
    gom(sa, s, s, sl, dt)
  }
  kq.tienCoc = ds.reduce((s, p) => s + (p.KhongGiao ? 0 : p.TienCoc ?? 0), 0)
  kq.theoSanPham = sx(sp)
  kq.theoXe = sx(xe)
  kq.theoKhach = sx(kh)
  kq.theoSales = sx(sa)
  return kq
}

/** Cột biểu đồ: theo ngày (kỳ ≤ 45 ngày) hoặc theo tuần bắt đầu thứ Hai. Mốc rỗng vẫn có cột 0. */
export function theoMoc(ds: PhieuBC[], tu: string, den: string): { moc: string; nhan: string; doanhThu: number; luot: number }[] {
  const n = soNgay(tu, den)
  const tuan = n > 45
  const dauTuan = (ngay: string) => {
    const [y, m, d] = ngay.split('-').map(Number)
    const thu = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = CN
    return cong(ngay, -((thu + 6) % 7))
  }
  const moc = new Map<string, { doanhThu: number; luot: number }>()
  for (let x = tuan ? dauTuan(tu) : tu; x <= den; x = cong(x, tuan ? 7 : 1)) moc.set(x, { doanhThu: 0, luot: 0 })
  for (const p of ds) {
    if (p.KhongGiao || p.Ngay < tu || p.Ngay > den) continue
    const k = tuan ? dauTuan(p.Ngay) : p.Ngay
    const m = moc.get(k)
    if (!m) continue
    m.doanhThu += doanhThuPhieu(p)
    m.luot++
  }
  return [...moc].map(([k, v]) => ({ moc: k, nhan: (tuan ? 'tuần ' : '') + `${k.slice(8)}/${k.slice(5, 7)}`, ...v }))
}

/** 1.250.000 → "1,25tr"; 500.000 → "500k"; 2.000.000.000 → "2 tỷ". */
export function tienGon(n: number): string {
  const a = Math.abs(n), dau = n < 0 ? '−' : ''
  const f = (x: number) => (Math.round(x * 100) / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 })
  if (a >= 1e9) return dau + f(a / 1e9) + ' tỷ'
  if (a >= 1e6) return dau + f(a / 1e6) + 'tr'
  if (a >= 1e3) return dau + Math.round(a / 1e3) + 'k'
  return dau + String(a)
}

/** Trần trục y tròn: 1, 2, 2.5, 5 × 10^k ≥ max. */
export function tranTron(max: number): number {
  if (max <= 0) return 1
  const mu = 10 ** Math.floor(Math.log10(max))
  for (const b of [1, 2, 2.5, 5, 10]) if (b * mu >= max) return b * mu
  return 10 * mu
}

/** % thay đổi so với kỳ trước; null khi kỳ trước = 0. */
export function phanTram(nay: number, truoc: number): number | null {
  if (truoc === 0) return null
  return Math.round(((nay - truoc) / truoc) * 100)
}
