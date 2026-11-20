// Số và tiền kiểu Việt Nam: 1.250.000 (dấu chấm ngăn nghìn).

/** 1250000 → "1.250.000" */
export function dinhDangSo(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return ''
  return Math.round(n).toLocaleString('vi-VN')
}

/** "1.250.000", "1 250 000", "1250000đ" → 1250000. Rỗng → null. Sai → NaN. */
export function docSo(s: string): number | null {
  const t = s.replace(/[\s.,đ₫]/gi, '')
  if (t === '') return null
  return /^\d+$/.test(t) ? Number(t) : NaN
}
