// Màn "Chuyến của tôi" — tài xế, phụ xe xem chuyến hôm nay của mình.
// Tài xế bấm "Đã nhận đủ hàng" sau khi thủ kho xuất (bằng chứng nhận hàng).
// Giao từng khách + đơn tại chỗ: GiaoHang.tsx (chạy được khi mất sóng).
import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { goi, loiMayChu } from '../lib/goiMayChu'
import { useNghe, useNgheMot, type CoId } from '../lib/nghe'
import { hienNgay, ngayVN, tomTatDong, type DonHang } from '../lib/donHang'
import { TEN_TRANG_THAI_CHUYEN, type Chuyen } from '../lib/dieuPhoi'
import { gioPhut, type PhieuXuat } from '../lib/xuatKho'
import { dinhDangSo } from '../lib/so'
import type { TaiKhoanNhan } from '../lib/vietQR'
import type { BanGhi } from './DanhMuc'
import FormGiao from './GiaoHang'
import type { DongGiao, ThanhToan } from '../../functions/src/giaoLogic'

interface PhieuGiao {
  DonId: string | null
  TaiCho: boolean
  TenKhach: string
  Dong: DongGiao[]
  TT: ThanhToan
  PhaiThu: number
  KhongGiao: boolean
  /** Còn nằm trên máy, chưa gửi lên máy chủ (mất sóng). */
  chuaGui: boolean
}

/** Nghe phiếu giao của chuyến, kèm cờ "chưa gửi" (đang chờ mạng). */
function usePhieuGiao(chuyenId: string, bat: boolean) {
  const [ds, setDs] = useState<CoId<PhieuGiao>[]>([])
  useEffect(() => {
    if (!bat) return setDs([])
    return onSnapshot(query(collection(db, 'PhieuGiao'), where('ChuyenId', '==', chuyenId)), { includeMetadataChanges: true }, (s) =>
      setDs(s.docs.map((x) => ({ ...(x.data() as PhieuGiao), id: x.id, chuaGui: x.metadata.hasPendingWrites }))),
    )
  }, [chuyenId, bat])
  return ds
}

interface ChungProps { uid: string; tenToi: string; sanPham: CoId<BanGhi>[]; khach: CoId<BanGhi>[]; tk: TaiKhoanNhan | null | undefined }

function TheChuyen({ c, don, ...chung }: { c: CoId<Chuyen>; don: Map<string, CoId<DonHang>> } & ChungProps) {
  const { uid } = chung
  const phieu = useNgheMot<PhieuXuat>(() => (c.TrangThai === 'LapKeHoach' ? null : doc(db, 'PhieuXuat', c.id)), [c.id, c.TrangThai])
  const dangGiao = c.TrangThai === 'DangGiao'
  const phieuGiao = usePhieuGiao(c.id, dangGiao || c.TrangThai === 'HoanThanh')
  const [ban, setBan] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const [moGiao, setMoGiao] = useState<string | 'taicho' | null>(null)
  const laTaiXe = c.TaiXe.uid === uid

  // Hàng còn trên xe chưa giao = xuất − đã giao (theo phiếu của chuyến này).
  const conTrenXe: Record<string, number> = {}
  for (const d of phieu?.Dong ?? []) conTrenXe[d.SanPhamId] = (conTrenXe[d.SanPhamId] ?? 0) + d.SoLuong
  for (const p of phieuGiao) for (const d of p.Dong) conTrenXe[d.SanPhamId] = (conTrenXe[d.SanPhamId] ?? 0) - d.SoLuong
  const giaoTheoDon = new Map(phieuGiao.filter((p) => p.DonId).map((p) => [p.DonId!, p]))
  const taiCho = phieuGiao.filter((p) => p.TaiCho)
  const tong = phieuGiao.reduce((t, p) => ({ tm: t.tm + p.TT.TienMat, ck: t.ck + p.TT.ChuyenKhoan, no: t.no + p.TT.GhiNo }), { tm: 0, ck: 0, no: 0 })
  const soChuaGui = phieuGiao.filter((p) => p.chuaGui).length
  const xongGiao = (t: string) => { setTin(t); setMoGiao(null) }

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

      {tin && <p className="tin-tot" role="status">{tin}</p>}
      {soChuaGui > 0 && <p className="canh-bao">⏳ {soChuaGui} phiếu giao đang lưu trên máy, sẽ tự gửi khi có sóng. Đừng xoá app / dữ liệu trình duyệt.</p>}
      {phieuGiao.length > 0 && (
        <p className="ghi-chu">
          Đã thu: tiền mặt <strong>{dinhDangSo(tong.tm)}đ</strong> · CK {dinhDangSo(tong.ck)}đ · ghi nợ {dinhDangSo(tong.no)}đ
        </p>
      )}

      <h3>Thứ tự giao ({dsDon.length} khách)</h3>
      <ol className="ds-don-chuyen">
        {dsDon.map((d) => {
          const pg = giaoTheoDon.get(d.id)
          return (
            <li key={d.id} className={pg ? 'da-giao' : ''}>
              <span>
                <strong>{d.TenKhach}</strong>
                <small>📍 {d.DiaChi}</small>
                {d.SoDienThoai && <small>📞 <a href={`tel:${d.SoDienThoai}`}>{d.SoDienThoai}</a></small>}
                <small>{tomTatDong(d.Dong)}</small>
                {(d.GhiChuKhach || d.GhiChu) && <small>📝 {[d.GhiChuKhach, d.GhiChu].filter(Boolean).join(' · ')}</small>}
                {pg && (
                  <small className={pg.KhongGiao ? 'chu-loi' : 'chu-tot'}>
                    {pg.KhongGiao ? '✖ Không giao được' : `✔ Đã giao · thu ${dinhDangSo(pg.PhaiThu)}đ`}{pg.chuaGui && ' · ⏳ chưa gửi'}
                  </small>
                )}
              </span>
              {dangGiao && !pg && moGiao !== d.id && (
                <button className="nut-giao" onClick={() => { setMoGiao(d.id); setTin(null) }}>Giao</button>
              )}
              {moGiao === d.id && (
                <FormGiao c={c} don={d} conTrenXe={conTrenXe} xong={xongGiao} huy={() => setMoGiao(null)} {...chung} />
              )}
            </li>
          )
        })}
      </ol>

      {(taiCho.length > 0 || dangGiao) && <h3>Đơn tại chỗ ({taiCho.length})</h3>}
      {taiCho.map((p) => (
        <p key={p.id} className="ghi-chu">
          ✔ {p.TenKhach}: {p.Dong.map((d) => `${d.Ten} × ${d.SoLuong}`).join(', ')} · {dinhDangSo(p.PhaiThu)}đ{p.chuaGui && ' · ⏳ chưa gửi'}
        </p>
      ))}
      {dangGiao && phieu && (
        <p className="ghi-chu">
          Hàng chưa giao trên xe: {Object.entries(conTrenXe).filter(([, n]) => n !== 0)
            .map(([id, n]) => `${phieu.Dong.find((d) => d.SanPhamId === id)?.Ten ?? id}: ${n}`).join(' · ') || 'hết'}
        </p>
      )}
      {dangGiao && moGiao !== 'taicho' && (
        <button className="nut-vien" onClick={() => { setMoGiao('taicho'); setTin(null) }}>+ Đơn tại chỗ (bán hàng dư)</button>
      )}
      {moGiao === 'taicho' && <FormGiao c={c} conTrenXe={conTrenXe} xong={xongGiao} huy={() => setMoGiao(null)} {...chung} />}
    </section>
  )
}

export default function ChuyenCuaToi({ uid, tenToi }: { uid: string; tenToi: string }) {
  const { ds: sanPham } = useNghe<BanGhi>(() => collection(db, 'SanPham'), [])
  const { ds: khach } = useNghe<BanGhi>(() => collection(db, 'KhachHang'), [])
  const tk = useNgheMot<TaiKhoanNhan>(() => doc(db, 'CaiDat', 'ThanhToan'), [])
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
      {cuaToi.map((c) => (
        <TheChuyen key={c.id} c={c} don={mapDon} uid={uid} tenToi={tenToi} tk={tk}
          sanPham={(sanPham ?? []).filter((x) => x.TrangThai !== 'Inactive')}
          khach={(khach ?? []).filter((x) => x.TrangThai !== 'Inactive')} />
      ))}
    </div>
  )
}
