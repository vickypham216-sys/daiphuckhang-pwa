// Tồn kho, vỏ, nợ vỏ nhà cung cấp — phép tính thuần, để test.
//
// Số TÀI CHÍNH: chỉ máy chủ ghi (firestore.rules cấm app ghi TonKho, NoVoNCC).
//
// Mô hình vỏ (Vicky chốt 20/11/2026: NCC đổi vỏ 1-1):
//   TonKho/{sp}.Day     = hàng đầy trong kho
//   TonKho/{sp}.VoRong  = vỏ rỗng trong kho (chỉ sản phẩm CoVo)
//   NoVoNCC/{ncc__sp}.SoVo = số vỏ CÔNG TY đang nợ NCC (âm = NCC nợ công ty)
// Nhập N bình đầy, trả NCC M vỏ rỗng:
//   Day += N;  VoRong -= M;  NoVoNCC += N − M

export interface Ton {
  Day: number
  VoRong: number
}

export interface DongNhap {
  SanPhamId: string
  Ten: string
  DonVi: string
  CoVo: boolean
  SoLuong: number
  DonGia: number | null
  VoTra: number
}

const soNguyenKhongAm = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0

/** Đọc + làm sạch dòng nhập từ app. Trả mảng dòng, hoặc chuỗi lỗi tiếng Việt. */
export function docDongNhap(vao: unknown): DongNhap[] | string {
  if (!Array.isArray(vao) || vao.length === 0) return "Phiếu nhập chưa có sản phẩm nào."
  if (vao.length > 50) return "Phiếu nhập quá 50 dòng."
  const kq: DongNhap[] = []
  const daCo = new Set<string>()
  for (const x of vao as Record<string, unknown>[]) {
    const ten = typeof x?.Ten === "string" ? x.Ten : "?"
    if (typeof x?.SanPhamId !== "string" || !x.SanPhamId) return "Dòng nhập thiếu mã sản phẩm."
    if (daCo.has(x.SanPhamId)) return `${ten} bị lặp hai dòng.`
    daCo.add(x.SanPhamId)
    if (!soNguyenKhongAm(x.SoLuong) || x.SoLuong === 0) return `${ten}: số lượng nhập phải là số nguyên lớn hơn 0.`
    const VoTra = x.VoTra ?? 0
    if (!soNguyenKhongAm(VoTra)) return `${ten}: số vỏ trả NCC không hợp lệ.`
    if (x.CoVo !== true && VoTra > 0) return `${ten} không có vỏ, không trả vỏ được.`
    const DonGia = x.DonGia ?? null
    if (DonGia !== null && !soNguyenKhongAm(DonGia)) return `${ten}: giá nhập không hợp lệ.`
    kq.push({
      SanPhamId: x.SanPhamId,
      Ten: ten,
      DonVi: typeof x.DonVi === "string" ? x.DonVi : "",
      CoVo: x.CoVo === true,
      SoLuong: x.SoLuong,
      DonGia,
      VoTra,
    })
  }
  return kq
}

/**
 * Tính tồn sau khi nhập. `ton` = tồn hiện tại theo sản phẩm (thiếu = 0),
 * `noVo` = nợ vỏ NCC hiện tại theo sản phẩm (của NCC này).
 * Lỗi khi trả NCC nhiều vỏ rỗng hơn số đang có trong kho.
 */
export function tinhNhap(
  dong: DongNhap[],
  ton: Record<string, Ton>,
  noVo: Record<string, number>,
): { ton: Record<string, Ton>; noVo: Record<string, number> } | string {
  const tonMoi: Record<string, Ton> = {}
  const noMoi: Record<string, number> = {}
  for (const d of dong) {
    const t = ton[d.SanPhamId] ?? { Day: 0, VoRong: 0 }
    if (d.VoTra > t.VoRong) return `${d.Ten}: kho chỉ có ${t.VoRong} vỏ rỗng, không trả NCC ${d.VoTra} vỏ được.`
    tonMoi[d.SanPhamId] = { Day: t.Day + d.SoLuong, VoRong: t.VoRong - d.VoTra }
    if (d.CoVo) noMoi[d.SanPhamId] = (noVo[d.SanPhamId] ?? 0) + d.SoLuong - d.VoTra
  }
  return { ton: tonMoi, noVo: noMoi }
}

export const tongTienNhap = (dong: DongNhap[]) => dong.reduce((s, d) => s + d.SoLuong * (d.DonGia ?? 0), 0)

export const maNoVo = (nccId: string, spId: string) => `${nccId}__${spId}`
