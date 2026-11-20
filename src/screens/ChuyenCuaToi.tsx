// Màn "Chuyến của tôi" — tài xế, phụ xe xem chuyến hôm nay của mình.
// Tài xế bấm "Đã nhận đủ hàng" sau khi thủ kho xuất (bằng chứng nhận hàng).
// Giao hàng từng khách: bước sau.
import { useState } from 'react'
import { collection, doc, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { goi, loiMayChu } from '../lib/goiMayChu'
import { useNghe, useNgheMot, type CoId } from '../lib/nghe'
import { hienNgay, ngayVN, tomTatDong, type DonHang } from '../lib/donHang'
import { TEN_TRANG_THAI_CHUYEN, type Chuyen } from '../lib/dieuPhoi'
import { gioPhut, type PhieuXuat } from '../lib/xuatKho'

function TheChuyen({ c, uid, don }: { c: CoId<Chuyen>; uid: string; don: Map<string, CoId<DonHang>> }) {
  const phieu = useNgheMot<PhieuXuat>(() => (c.TrangThai === 'LapKeHoach' ? null : doc(db, 'PhieuXuat', c.id)), [c.id, c.TrangThai])
  const [ban, setBan] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const laTaiXe = c.TaiXe.uid === uid

  async function nhan() {
    if (!phieu) return
    if (!confirm(`Xác nhận đã nhận ĐỦ:\n${phieu.Dong.map((d) => `• ${d.Ten}: ${d.SoLuong}`).join('\n')}\n\nĐếm lại trước khi bấm. Sau khi xác nhận, thiếu hàng sẽ tính cho chuyến này.`)) return
    setLoi(null)
    setBan(true)
    try {
      await goi('nhanHang', { ChuyenId: c.id })
    } catch (e) {
      setLoi(loiMayChu(e))
    } finally {
      setBan(false)
    }
  }

  const dsDon = c.DonIds.map((id) => don.get(id)).filter((d): d is CoId<DonHang> => !!d)
  return (
    <section className="the the-rong chuyen">
      <div className="chuyen-dau">
        <h2>{c.BienSo} · Chuyến {c.SoChuyen}</h2>
        <span className="nhan-tt tt-DaGan">{c.TrangThai === 'DaXuatKho' ? 'Chờ nhận hàng' : TEN_TRANG_THAI_CHUYEN[c.TrangThai]}</span>
      </div>
      <p className="ghi-chu">Tài xế: {c.TaiXe.HoTen}{c.PhuXe.length > 0 && ` · Phụ xe: ${c.PhuXe.map((p) => p.HoTen).join(', ')}`}</p>
      {c.GhiChu && <p className="ghi-chu">📝 {c.GhiChu}</p>}

      {c.TrangThai === 'LapKeHoach' && <p className="ghi-chu">Kho chưa xuất hàng cho chuyến này.</p>}
      {phieu && (
        <>
          <h3>Hàng xuất kho</h3>
          <table className="bang-chi-tiet bang-to">
            <tbody>
              {phieu.Dong.map((d) => (
                <tr key={d.SanPhamId}><td>{d.Ten}</td><td><strong>{d.SoLuong}</strong> {d.DonVi.toLowerCase()}</td></tr>
              ))}
            </tbody>
          </table>
          {phieu.TrangThai === 'ChoNhan' && laTaiXe && (
            <button className="nut-to" onClick={nhan} disabled={ban}>{ban ? 'Đang gửi…' : '✔ Đã nhận đủ hàng'}</button>
          )}
          {phieu.TrangThai === 'ChoNhan' && !laTaiXe && <p className="ghi-chu">Chờ tài xế {c.TaiXe.HoTen} xác nhận nhận hàng.</p>}
          {phieu.TrangThai === 'DaNhan' && <p className="tin-tot">✔ {phieu.TenNguoiNhan} đã nhận đủ hàng lúc {gioPhut(phieu.NhanLuc)}</p>}
        </>
      )}
      {loi && <p className="loi" role="alert">{loi}</p>}

      <h3>Thứ tự giao ({dsDon.length} khách)</h3>
      <ol className="ds-don-chuyen">
        {dsDon.map((d) => (
          <li key={d.id}>
            <span>
              <strong>{d.TenKhach}</strong>
              <small>📍 {d.DiaChi}</small>
              {d.SoDienThoai && <small>📞 <a href={`tel:${d.SoDienThoai}`}>{d.SoDienThoai}</a></small>}
              <small>{tomTatDong(d.Dong)}</small>
              {(d.GhiChuKhach || d.GhiChu) && <small>📝 {[d.GhiChuKhach, d.GhiChu].filter(Boolean).join(' · ')}</small>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function ChuyenCuaToi({ uid }: { uid: string }) {
  const [ngay, setNgay] = useState(ngayVN())
  const { ds: chuyen, loi } = useNghe<Chuyen>(() => query(collection(db, 'Chuyen'), where('Ngay', '==', ngay)), [ngay])
  const { ds: don } = useNghe<DonHang>(() => query(collection(db, 'DonHang'), where('NgayGiao', '==', ngay)), [ngay])
  const cuaToi = (chuyen ?? [])
    .filter((c) => c.TrangThai !== 'Huy' && (c.TaiXe.uid === uid || c.PhuXe.some((p) => p.uid === uid)))
    .sort((a, b) => a.SoChuyen - b.SoChuyen)
  const mapDon = new Map((don ?? []).map((d) => [d.id, d]))
  return (
    <div className="man">
      <section className="the the-rong">
        <div className="hang-ngay">
          <h2>Chuyến của tôi {hienNgay(ngay)}</h2>
          <input type="date" value={ngay} onChange={(e) => e.target.value && setNgay(e.target.value)} aria-label="Chọn ngày" />
        </div>
        {loi && <p className="loi">{loi}</p>}
        {chuyen && cuaToi.length === 0 && <p className="ghi-chu">Không có chuyến nào trong ngày.</p>}
      </section>
      {cuaToi.map((c) => <TheChuyen key={c.id} c={c} uid={uid} don={mapDon} />)}
    </div>
  )
}
