// Mục "Xuất kho" trong tab Kho — thủ kho lập phiếu xuất cho từng chuyến.
// Số lượng tự điền = tổng đơn của chuyến; thêm hàng dư thì sửa lên.
// Máy chủ (xuatKho) chặn xuất thiếu so với đơn và xuất quá tồn kho.
import { useState } from 'react'
import { collection, doc, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { goi, loiMayChu } from '../lib/goiMayChu'
import { useNghe, useNgheMot, type CoId } from '../lib/nghe'
import { dinhDangSo } from '../lib/so'
import { hienNgay, ngayVN, type DonHang } from '../lib/donHang'
import { TEN_TRANG_THAI_CHUYEN, type Chuyen } from '../lib/dieuPhoi'
import { gioPhut, type PhieuXuat } from '../lib/xuatKho'
import type { BanGhi } from './DanhMuc'
import { FormKetThuc, KetQuaDoiSoat } from './KetThucChuyen'

interface TonKho { Day: number }

function FormXuat({ c, don, sanPham, ton, xong, huy }: {
  c: CoId<Chuyen>; don: CoId<DonHang>[]; sanPham: CoId<BanGhi>[]; ton: Map<string, TonKho>; xong: (t: string) => void; huy: () => void
}) {
  const theoDon: Record<string, number> = {}
  for (const d of don) if (c.DonIds.includes(d.id) && d.TrangThai !== 'Huy') for (const x of d.Dong) theoDon[x.SanPhamId] = (theoDon[x.SanPhamId] ?? 0) + x.SoLuong
  const [sl, setSl] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(theoDon).map(([k, v]) => [k, String(v)])))
  const [ghiChu, setGhiChu] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  const dong = sanPham.map((s) => ({ SanPhamId: s.id, SoLuong: Number(sl[s.id] || 0) })).filter((d) => d.SoLuong > 0)

  async function gui() {
    setLoi(null)
    for (const s of sanPham) {
      const x = Number(sl[s.id] || 0)
      if (x < (theoDon[s.id] ?? 0)) return setLoi(`${String(s.Ten)}: đơn cần ${theoDon[s.id]}, không xuất ít hơn được.`)
      if (x > (ton.get(s.id)?.Day ?? 0)) return setLoi(`${String(s.Ten)}: kho chỉ còn ${ton.get(s.id)?.Day ?? 0}.`)
    }
    if (dong.length === 0) return setLoi('Chưa có hàng nào để xuất.')
    setBan(true)
    try {
      await goi('xuatKho', { ChuyenId: c.id, Dong: dong, GhiChu: ghiChu })
      xong(`Đã xuất kho ${c.BienSo} · C${c.SoChuyen}. Chờ tài xế ${c.TaiXe.HoTen} bấm "Đã nhận đủ hàng".`)
    } catch (e) {
      setLoi(loiMayChu(e))
      setBan(false)
    }
  }

  return (
    <div className="form-dm">
      <div className="bang-xuat">
        <div className="bang-xuat-dau"><span>Sản phẩm</span><span>Theo đơn</span><span>Tồn kho</span><span>Xuất</span></div>
        {sanPham.map((s) => {
          const x = Number(sl[s.id] || 0)
          const du = x - (theoDon[s.id] ?? 0)
          return (
            <div key={s.id} className="bang-xuat-dong">
              <span>{String(s.Ten)}{du > 0 && <small>dư {du} để bán thêm</small>}</span>
              <span>{theoDon[s.id] ?? 0}</span>
              <span>{dinhDangSo(ton.get(s.id)?.Day ?? 0)}</span>
              <input inputMode="numeric" aria-label={`Xuất ${String(s.Ten)}`} placeholder="0" value={sl[s.id] ?? ''}
                onChange={(e) => setSl({ ...sl, [s.id]: e.target.value.replace(/\D/g, '') })} />
            </div>
          )
        })}
      </div>
      <label>Ghi chú<textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></label>
      {loi && <p className="loi" role="alert">{loi}</p>}
      <div className="hang-nut">
        <button onClick={gui} disabled={ban}>{ban ? 'Đang lưu…' : 'Xuất kho'}</button>
        <button className="nut-vien" onClick={huy} disabled={ban}>Huỷ</button>
      </div>
    </div>
  )
}

function TheChuyen({ c, don, sanPham, ton, baoTin, chuyenNgay }: {
  c: CoId<Chuyen>; don: CoId<DonHang>[]; sanPham: CoId<BanGhi>[]; ton: Map<string, TonKho>; baoTin: (t: string) => void; chuyenNgay: CoId<Chuyen>[]
}) {
  const [mo, setMo] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const phieu = useNgheMot<PhieuXuat>(() => (c.TrangThai === 'LapKeHoach' ? null : doc(db, 'PhieuXuat', c.id)), [c.id, c.TrangThai])
  const soDon = c.DonIds.length

  async function huyPhieu() {
    const lyDo = prompt('Huỷ phiếu xuất (hàng trả về kho, chuyến mở lại cho điều phối). Lý do:')
    if (lyDo === null) return
    setLoi(null)
    try {
      await goi('huyXuatKho', { ChuyenId: c.id, LyDo: lyDo })
      baoTin(`Đã huỷ phiếu xuất ${c.BienSo} · C${c.SoChuyen}, hàng đã trả về kho.`)
    } catch (e) {
      setLoi(loiMayChu(e))
    }
  }

  return (
    <section className="the the-rong chuyen">
      <div className="chuyen-dau">
        <h2>{c.BienSo} · Chuyến {c.SoChuyen}{c.Ngay !== ngayVN() && <small className="ghi-chu"> · {hienNgay(c.Ngay)}</small>}</h2>
        <span className={'nhan-tt ' + (c.TrangThai === 'LapKeHoach' || c.TrangThai === 'VeKho' ? 'tt-Moi' : c.TrangThai === 'DaXuatKho' ? 'tt-DaGan' : 'tt-DaGiao')}>
          {c.TrangThai === 'DaXuatKho' ? 'Chờ tài xế nhận' : TEN_TRANG_THAI_CHUYEN[c.TrangThai]}
        </span>
      </div>
      <p className="ghi-chu">🚚 {c.TaiXe.HoTen}{c.PhuXe.length > 0 && ` · ${c.PhuXe.map((p) => p.HoTen).join(', ')}`} · {soDon} đơn</p>
      {c.TrangThai === 'LapKeHoach' &&
        (mo ? (
          <FormXuat c={c} don={don} sanPham={sanPham} ton={ton} xong={(t) => { setMo(false); baoTin(t) }} huy={() => setMo(false)} />
        ) : (
          <button onClick={() => setMo(true)}>Lập phiếu xuất</button>
        ))}
      {phieu && (
        <>
          <table className="bang-chi-tiet">
            <tbody>
              {phieu.Dong.map((d) => (
                <tr key={d.SanPhamId}><td>{d.Ten}</td><td>{d.SoLuong} {d.DonVi.toLowerCase()}</td>
                  <td className="ghi-chu">{d.SoLuong > d.TheoDon ? `dư ${d.SoLuong - d.TheoDon}` : ''}</td></tr>
              ))}
            </tbody>
          </table>
          <p className="ghi-chu">Thủ kho: {phieu.TenNguoiTao}{phieu.GhiChu && ` · ${phieu.GhiChu}`}</p>
          {phieu.TrangThai === 'DaNhan' ? (
            c.TrangThai === 'DangGiao' && <p className="tin-tot">✔ {phieu.TenNguoiNhan} đã nhận đủ hàng lúc {gioPhut(phieu.NhanLuc)}</p>
          ) : (
            <button className="nut-nguy" onClick={huyPhieu}>Huỷ phiếu xuất (đếm sai)</button>
          )}
        </>
      )}
      {c.TrangThai === 'VeKho' && phieu && (
        <>
          <h3>Xe về — kết thúc chuyến</h3>
          <FormKetThuc c={c} phieu={phieu} chuyenNgay={chuyenNgay} sanPham={sanPham} xong={baoTin} />
        </>
      )}
      {c.TrangThai === 'HoanThanh' && <KetQuaDoiSoat chuyenId={c.id} sanPham={sanPham} />}
      {loi && <p className="loi" role="alert">{loi}</p>}
    </section>
  )
}

export default function XuatKho({ sanPham, ton }: { sanPham: CoId<BanGhi>[]; ton: Map<string, TonKho> }) {
  const [ngay, setNgay] = useState(ngayVN())
  const [tin, setTin] = useState<string | null>(null)
  const { ds: chuyen, loi } = useNghe<Chuyen>(() => query(collection(db, 'Chuyen'), where('Ngay', '==', ngay)), [ngay])
  const { ds: don } = useNghe<DonHang>(() => query(collection(db, 'DonHang'), where('NgayGiao', '==', ngay)), [ngay])
  // Xe về chờ chốt của NGÀY KHÁC (quên chốt hôm qua) vẫn phải hiện ở đây —
  // Tổng quan trỏ tới màn này, không thấy thì không ai chốt.
  const { ds: veKhoCu } = useNghe<Chuyen>(() => query(collection(db, 'Chuyen'), where('TrangThai', '==', 'VeKho')), [])
  const ds = [
    ...(veKhoCu ?? []).filter((c) => c.Ngay !== ngay).sort((a, b) => (a.Ngay < b.Ngay ? -1 : 1)),
    ...(chuyen ?? []).filter((c) => c.TrangThai !== 'Huy').sort((a, b) => a.BienSo.localeCompare(b.BienSo) || a.SoChuyen - b.SoChuyen),
  ]
  return (
    <>
      <section className="the the-rong">
        <div className="hang-ngay">
          <h2>Xuất kho {hienNgay(ngay)}</h2>
          <input type="date" value={ngay} onChange={(e) => e.target.value && setNgay(e.target.value)} aria-label="Chọn ngày" />
        </div>
        {loi && <p className="loi">{loi}</p>}
        {chuyen && ds.length === 0 && <p className="ghi-chu">Chưa có chuyến nào. Điều phối tạo chuyến trước.</p>}
      </section>
      {tin && <p className="tin-tot" role="status">{tin}</p>}
      {ds.map((c) => <TheChuyen key={c.id} c={c} don={don ?? []} sanPham={sanPham} ton={ton} baoTin={setTin} chuyenNgay={chuyen ?? []} />)}
    </>
  )
}
