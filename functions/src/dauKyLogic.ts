// Công nợ đầu kỳ — đọc bảng dán từ Excel + tính lại số dư. Dùng chung app +
// máy chủ (không import Node/Firebase).
//
// Số đầu kỳ lưu RIÊNG (CongNoKhach.DauKy) và cộng vào tổng: sửa đầu kỳ về sau
// thì tổng = tổng hiện tại − đầu kỳ cũ + đầu kỳ mới — KHÔNG đè mất phần đã
// phát sinh qua các chuyến.

export type TheoSp = Record<string, number>

export interface SoDauKy {
  NoTien: number
  NoVo: TheoSp
  CocVo: TheoSp
  TienCoc: number
}

export interface DongDauKy extends SoDauKy {
  Ten: string
  SoDienThoai: string | null
  DiaChi: string | null
}

export const DAU_KY_RONG: SoDauKy = { NoTien: 0, NoVo: {}, CocVo: {}, TienCoc: 0 }

/** "1.250.000", "1,250,000", "1 250 000đ", "" → số nguyên ≥ 0; sai → NaN. */
export function docSoExcel(s: string | undefined): number {
  const t = (s ?? '').replace(/[\s.,đ₫]/gi, '')
  if (t === '') return 0
  return /^\d+$/.test(t) ? Number(t) : NaN
}

/** Chuẩn hoá SĐT VN; không hợp lệ → null (giống nhanVienLogic.chuanHoaSdt). */
function sdt(s: string): string | null {
  let x = s.replace(/[\s.\-()']/g, '')
  if (x.startsWith('+84')) x = '0' + x.slice(3)
  else if (x.startsWith('84') && x.length === 11) x = '0' + x.slice(2)
  else if (/^\d{9}$/.test(x)) x = '0' + x // Excel hay ăn mất số 0 đầu
  return /^0\d{9}$/.test(x) ? x : null
}

/**
 * Tiêu đề cột theo đúng thứ tự app đọc. `spVo` = sản phẩm có vỏ.
 * Tên | SĐT | Địa chỉ | Nợ tiền | Nợ vỏ <sp>… | Vỏ cọc <sp>… | Tiền cọc
 */
export function tieuDe(spVo: { id: string; Ten: string }[]): string[] {
  return ['Tên khách', 'SĐT', 'Địa chỉ', 'Nợ tiền', ...spVo.map((s) => `Nợ vỏ ${s.Ten}`), ...spVo.map((s) => `Vỏ cọc ${s.Ten}`), 'Tiền cọc']
}

/** Đọc bảng dán (Excel → tab). Bỏ dòng trống và dòng tiêu đề. */
export function docBang(text: string, spVo: { id: string; Ten: string }[]): { dong: DongDauKy[]; loi: { so: number; loi: string }[] } {
  const dong: DongDauKy[] = []
  const loi: { so: number; loi: string }[] = []
  const n = spVo.length
  text.split(/\r?\n/).forEach((raw, i): undefined => {
    if (!raw.trim()) return
    const c = raw.split(raw.includes('\t') ? '\t' : /[;|]/).map((x) => x.trim())
    if (i === 0 && /tên/i.test(c[0] ?? '') && /n[ợo]/i.test(raw)) return undefined // dòng tiêu đề
    const so = i + 1
    const Ten = c[0] ?? ''
    if (!Ten) { loi.push({ so, loi: 'Thiếu tên khách.' }); return undefined }
    const SoDienThoai = c[1] ? sdt(c[1]) : null
    if (c[1] && !SoDienThoai) { loi.push({ so, loi: `SĐT "${c[1]}" không hợp lệ.` }); return undefined }
    const nums = [c[3], ...c.slice(4, 4 + 2 * n), c[4 + 2 * n]].map(docSoExcel)
    const sai = nums.findIndex((x) => Number.isNaN(x))
    if (sai >= 0) { loi.push({ so, loi: `Cột ${tieuDe(spVo)[3 + sai]}: không phải số.` }); return undefined }
    const NoVo: TheoSp = {}, CocVo: TheoSp = {}
    spVo.forEach((s, k) => {
      if (nums[1 + k]) NoVo[s.id] = nums[1 + k]
      if (nums[1 + n + k]) CocVo[s.id] = nums[1 + n + k]
    })
    dong.push({ Ten, SoDienThoai, DiaChi: c[2] || null, NoTien: nums[0], NoVo, CocVo, TienCoc: nums[1 + 2 * n] })
    return undefined
  })
  return { dong, loi }
}

const tru = (a: TheoSp = {}, b: TheoSp = {}, dau: 1 | -1) => {
  const kq: TheoSp = { ...a }
  for (const [k, v] of Object.entries(b)) kq[k] = (kq[k] ?? 0) + dau * v
  for (const k of Object.keys(kq)) if (kq[k] === 0) delete kq[k]
  return kq
}

/** Tổng mới = tổng hiện tại − đầu kỳ cũ + đầu kỳ mới. */
export function apDauKy(hienTai: Partial<SoDauKy> | undefined, cu: SoDauKy | undefined, moi: SoDauKy): SoDauKy {
  const h = { ...DAU_KY_RONG, ...(hienTai ?? {}) }
  const c = cu ?? DAU_KY_RONG
  return {
    NoTien: h.NoTien - c.NoTien + moi.NoTien,
    NoVo: tru(tru(h.NoVo, c.NoVo, -1), moi.NoVo, 1),
    CocVo: tru(tru(h.CocVo, c.CocVo, -1), moi.CocVo, 1),
    TienCoc: h.TienCoc - c.TienCoc + moi.TienCoc,
  }
}

/** Tìm khách: SĐT trùng trước, rồi tên trùng (không phân biệt hoa thường) và DUY NHẤT. */
export function timKhach(
  d: Pick<DongDauKy, 'Ten' | 'SoDienThoai'>,
  ds: { id: string; Ten: string; SoDienThoai?: string | null }[],
): { id: string } | { nhieu: true } | null {
  if (d.SoDienThoai) {
    const k = ds.find((x) => x.SoDienThoai === d.SoDienThoai)
    if (k) return { id: k.id }
  }
  const t = d.Ten.trim().toLowerCase()
  const cung = ds.filter((x) => x.Ten.trim().toLowerCase() === t)
  if (cung.length === 1) return { id: cung[0].id }
  if (cung.length > 1) return { nhieu: true }
  return null
}
