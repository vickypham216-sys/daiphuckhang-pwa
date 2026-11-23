// Kết thúc chuyến (thủ kho) — xe về, ĐẾM MÙ hàng đầy + vỏ rỗng trên xe (không
// cho thấy số phải có, để đếm thật chứ không chép số). Máy chủ (ketThucChuyen)
// tính chênh lệch, trả kho / để lại trên xe, cộng công nợ khách.
import { useState } from 'react'
import { doc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { goi, loiMayChu } from '../lib/goiMayChu'
import { useNgheMot, type CoId } from '../lib/nghe'
import { dinhDangSo } from '../lib/so'
import type { Chuyen } from '../lib/dieuPhoi'
import type { DoiSoatChuyen, PhieuXuat } from '../lib/xuatKho'
import { batBuocDem } from '../../functions/src/ketThucLogic'
import type { BanGhi } from './DanhMuc'

const toXe = (c: Chuyen) => c.ToXeUids ?? [c.TaiXe.uid, ...c.PhuXe.map((p) => p.uid)]

export function FormKetThuc({ c, phieu, chuyenNgay, sanPham, xong }: {
  c: CoId<Chuyen>; phieu: PhieuXuat; chuyenNgay: CoId<Chuyen>[]; sanPham: CoId<BanGhi>[]; xong: (t: string) => void
}) {
  const ten = (id: string) => String(sanPham.find((s) => s.id === id)?.Ten ?? phieu.Dong.find((d) => d.SanPhamId === id)?.Ten ?? id)
  const coVo = (id: string) => sanPham.find((s) => s.id === id)?.CoVo === true
  const ids = [...new Set([...phieu.Dong.map((d) => d.SanPhamId), ...Object.keys(phieu.DauChuyen?.Hang ?? {}), ...Object.keys(phieu.DauChuyen?.VoRong ?? {})])]
  const [day, setDay] = useState<Record<string, string>>({})
  const [vo, setVo] = useState<Record<string, string>>({})
  const [deLai, setDeLai] = useState(false)
  const [khongDem, setKhongDem] = useState(false)
  const [ghiChu, setGhiChu] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  const sau = chuyenNgay.filter((x) => x.XeId === c.XeId && x.SoChuyen > c.SoChuyen && x.TrangThai !== 'Huy').sort((a, b) => a.SoChuyen - b.SoChuyen)[0]
  const phaiDem = batBuocDem(deLai, toXe(c), sau ? toXe(sau) : null)
  const dem = phaiDem || !khongDem

  async function gui() {
    setLoi(null)
    if (dem && ids.some((id) => day[id] === undefined || day[id] === '' || (coVo(id) && (vo[id] === undefined || vo[id] === ''))))
      return setLoi('Nhập đủ số đếm cho mọi dòng (không có thì ghi 0).')
    setBan(true)
    try {
      const kq = await goi<{ ChenhLech: { Day: Record<string, number>; VoRong: Record<string, number> }; TienMatPhaiNop: number }>('ketThucChuyen', {
        ChuyenId: c.id, DeLai: deLai, GhiChu: ghiChu,
        DemDay: dem ? Object.fromEntries(ids.map((id) => [id, Number(day[id] || 0)])) : null,
        DemVoRong: dem ? Object.fromEntries(ids.filter(coVo).map((id) => [id, Number(vo[id] || 0)])) : null,
      })
      const cl = [...Object.entries(kq.ChenhLech.Day).map(([k, n]) => `${ten(k)}: ${n > 0 ? '+' : ''}${n}`),
        ...Object.entries(kq.ChenhLech.VoRong).map(([k, n]) => `vỏ ${ten(k)}: ${n > 0 ? '+' : ''}${n}`)]
      xong(`Đã chốt ${c.BienSo} · C${c.SoChuyen}. ${cl.length ? 'CHÊNH LỆCH: ' + cl.join(', ') + '.' : 'Khớp, không chênh lệch.'} Tiền mặt phải nộp: ${dinhDangSo(kq.TienMatPhaiNop)}đ.`)
    } catch (e) {
      setLoi(loiMayChu(e))
      setBan(false)
    }
  }

  return (
    <div className="form-dm">
      <div className="hang-nut nho">
        <button className={deLai ? 'nut-vien' : ''} onClick={() => setDeLai(false)}>Trả hết về kho</button>
        <button className={deLai ? '' : 'nut-vien'} onClick={() => setDeLai(true)}>Để lại trên xe</button>
      </div>
      {deLai && !phaiDem && (
        <label className="o-tick"><input type="checkbox" checked={khongDem} onChange={(e) => setKhongDem(e.target.checked)} />
          Không đếm — chuyến {sau!.SoChuyen} cùng tổ xe chạy tiếp</label>
      )}
      {deLai && phaiDem && <p className="ghi-chu">{sau ? `Chuyến ${sau.SoChuyen} khác tổ xe` : 'Chưa có chuyến sau'} → bắt buộc đếm.</p>}
      {dem && (
        <>
          <p className="ghi-chu">Đếm THẬT trên xe rồi nhập. App không hiện số phải có để tránh chép số.</p>
          <div className="bang-dem">
            <div className="bang-dem-dau"><span>Sản phẩm</span><span>Hàng đầy</span><span>Vỏ rỗng</span></div>
            {ids.map((id) => (
              <div key={id} className="bang-dem-dong">
                <span>{ten(id)}</span>
                <input inputMode="numeric" aria-label={`Đếm đầy ${ten(id)}`} placeholder="?" value={day[id] ?? ''} onChange={(e) => setDay({ ...day, [id]: e.target.value.replace(/\D/g, '') })} />
                {coVo(id) ? <input inputMode="numeric" aria-label={`Đếm vỏ ${ten(id)}`} placeholder="?" value={vo[id] ?? ''} onChange={(e) => setVo({ ...vo, [id]: e.target.value.replace(/\D/g, '') })} /> : <span className="ghi-chu">—</span>}
              </div>
            ))}
          </div>
        </>
      )}
      <label>Ghi chú<textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></label>
      {loi && <p className="loi" role="alert">{loi}</p>}
      <button onClick={gui} disabled={ban}>{ban ? 'Đang chốt…' : 'Chốt chuyến'}</button>
    </div>
  )
}

export function KetQuaDoiSoat({ chuyenId, sanPham }: { chuyenId: string; sanPham: CoId<BanGhi>[] }) {
  const ds = useNgheMot<DoiSoatChuyen>(() => doc(db, 'DoiSoatChuyen', chuyenId), [chuyenId])
  if (!ds) return null
  const ten = (id: string) => String(sanPham.find((s) => s.id === id)?.Ten ?? id)
  const cl = [...Object.entries(ds.ChenhLech.Day).map(([k, n]) => `${ten(k)}: ${n > 0 ? 'dư' : 'thiếu'} ${Math.abs(n)}`),
    ...Object.entries(ds.ChenhLech.VoRong).map(([k, n]) => `vỏ ${ten(k)}: ${n > 0 ? 'dư' : 'thiếu'} ${Math.abs(n)}`)]
  return (
    <div className={cl.length ? 'canh-bao' : 'tin-tot'}>
      {ds.CoDem ? (cl.length ? `⚠ Chênh lệch — ${cl.join(', ')}` : '✔ Đếm khớp') : 'Không đếm (cùng tổ chạy tiếp)'}
      {' · '}{ds.DeLai ? 'để lại trên xe' : 'đã trả về kho'} · tiền mặt phải nộp {dinhDangSo(ds.TienMatPhaiNop)}đ · {ds.TenNguoi}
    </div>
  )
}
