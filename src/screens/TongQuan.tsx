// Trang chủ — Tổng quan hôm nay, theo vai trò. Mỗi việc cần xử lý bấm là tới
// đúng màn (như "chỉ đường bấm được" bên MIA). Chỉ đọc dữ liệu của hôm nay /
// việc đang treo — không nạp lịch sử.
import { useMemo } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useNghe } from '../lib/nghe'
import { dinhDangSo } from '../lib/so'
import { hienNgay, ngayVN, type DonHang } from '../lib/donHang'
import { TEN_TRANG_THAI_CHUYEN, type Chuyen } from '../lib/dieuPhoi'
import { phanTram, tongHop, type PhieuBC } from '../lib/baoCao'
import { cungGioHomQua, tienDo } from '../lib/tongQuan'

export type DiToi = (man: string, muc?: string) => void

interface PG extends PhieuBC { ChuyenId: string; CoGiamGia?: boolean; CK?: { TrangThai: string } | null; GioMay?: number; TaoLuc?: { toMillis(): number } }

/** Một việc cần xử lý: số + nhãn + bấm tới đâu. Không có gì thì ẩn hẳn (đỡ nhiễu). */
function Viec({ so, nhan, phu, di, gap }: { so: number; nhan: string; phu?: string; di: () => void; gap?: boolean }) {
  if (!so) return null
  return (
    <li>
      <button className={'viec' + (gap ? ' viec-gap' : '')} onClick={di}>
        <strong>{dinhDangSo(so)}</strong>
        <span>{nhan}{phu && <small>{phu}</small>}</span>
        <span aria-hidden="true">›</span>
      </button>
    </li>
  )
}

export default function TongQuan({ vaiTro, di }: { vaiTro: string; di: DiToi }) {
  const homNay = ngayVN(), homQua = ngayVN(-1), mai = ngayVN(1)
  const laAdmin = vaiTro === 'Admin'
  const xemTien = laAdmin || vaiTro === 'KeToan'
  const xemDieuPhoi = laAdmin || vaiTro === 'DieuPhoi'
  const xemKho = laAdmin || vaiTro === 'ThuKho'
  const xemDon = laAdmin || vaiTro === 'Sales' || vaiTro === 'DieuPhoi'
  const docDoiSoat = laAdmin || ['ThuKho', 'KeToan', 'DieuPhoi'].includes(vaiTro)

  const { ds: pg } = useNghe<PG>(() => query(collection(db, 'PhieuGiao'), where('Ngay', '==', homNay)), [homNay])
  const { ds: pgQua } = useNghe<PG>(() => query(collection(db, 'PhieuGiao'), where('Ngay', '==', homQua)), [homQua])
  const { ds: don } = useNghe<DonHang>(() => query(collection(db, 'DonHang'), where('NgayGiao', '>=', homNay), where('NgayGiao', '<=', mai)), [homNay])
  const { ds: chuyen } = useNghe<Chuyen>(() => query(collection(db, 'Chuyen'), where('Ngay', '==', homNay)), [homNay])
  const { ds: veKho } = useNghe<Chuyen>(() => query(collection(db, 'Chuyen'), where('TrangThai', '==', 'VeKho')), [])
  const { ds: choNop } = useNghe<Chuyen>(() => query(collection(db, 'Chuyen'), where('NopTien.TrangThai', '==', 'ChoNop')), [])
  const { ds: ckGiao } = useNghe<{ TT: { ChuyenKhoan: number } }>(() => query(collection(db, 'PhieuGiao'), where('CK.TrangThai', '==', 'ChoXacNhan')), [])
  const { ds: ckThu } = useNghe<{ ChuyenKhoan: number }>(() => query(collection(db, 'PhieuThu'), where('CK.TrangThai', '==', 'ChoXacNhan')), [])
  // DoiSoatChuyen: Sales không được đọc — đọc thử sẽ lỗi quyền, nên trỏ vào truy vấn rỗng.
  const { ds: doiSoat } = useNghe<{ ChenhLech: { Day: Record<string, number>; VoRong: Record<string, number> } }>(
    () => query(collection(db, 'DoiSoatChuyen'), where('Ngay', '==', docDoiSoat ? homNay : '0000-00-00')), [homNay, docDoiSoat])

  const t = useMemo(() => tongHop(pg ?? []), [pg])
  const tq = useMemo(() => tongHop(cungGioHomQua(pgQua ?? [], Date.now())), [pgQua])
  const pt = phanTram(t.doanhThu, tq.doanhThu)

  const donHomNay = (don ?? []).filter((d) => d.NgayGiao === homNay)
  const donMai = (don ?? []).filter((d) => d.NgayGiao === mai && d.TrangThai !== 'Huy')
  const chuaGan = donHomNay.filter((d) => d.TrangThai === 'Moi')
  const dsChuyen = (chuyen ?? []).filter((c) => c.TrangThai !== 'Huy').sort((a, b) => a.BienSo.localeCompare(b.BienSo) || a.SoChuyen - b.SoChuyen)
  const chuaXuat = dsChuyen.filter((c) => c.TrangThai === 'LapKeHoach' && c.DonIds.length > 0)
  const tienChoNop = (choNop ?? []).reduce((s, c) => s + (c.NopTien?.PhaiNop ?? 0), 0)
  const ckCho = (ckGiao ?? []).reduce((s, p) => s + p.TT.ChuyenKhoan, 0) + (ckThu ?? []).reduce((s, p) => s + p.ChuyenKhoan, 0)
  const soCk = (ckGiao ?? []).length + (ckThu ?? []).length
  const giam = (pg ?? []).filter((p) => p.CoGiamGia)
  const lech = (doiSoat ?? []).filter((d) => Object.keys(d.ChenhLech?.Day ?? {}).length || Object.keys(d.ChenhLech?.VoRong ?? {}).length)
  const donCoPhieu = new Set((pg ?? []).map((p) => (p as { DonId?: string | null }).DonId).filter(Boolean) as string[])

  const viec = [
    xemDieuPhoi && <Viec key="gan" so={chuaGan.length} nhan="đơn hôm nay chưa gán xe" di={() => di('dieuphoi')} gap />,
    xemKho && <Viec key="xuat" so={chuaXuat.length} nhan="chuyến chưa xuất kho" phu={chuaXuat.map((c) => `${c.BienSo} C${c.SoChuyen}`).join(', ')} di={() => di('kho', 'xuat')} gap />,
    xemKho && <Viec key="ve" so={(veKho ?? []).length} nhan="xe đã về, chờ đếm & chốt" phu={(veKho ?? []).map((c) => `${c.BienSo} C${c.SoChuyen}`).join(', ')} di={() => di('kho', 'xuat')} gap />,
    xemTien && <Viec key="nop" so={(choNop ?? []).length} nhan="chuyến chờ nộp tiền mặt" phu={`${dinhDangSo(tienChoNop)}đ`} di={() => di('ketoan', 'tien')} />,
    xemTien && <Viec key="ck" so={soCk} nhan="khoản chuyển khoản chờ xác nhận" phu={`${dinhDangSo(ckCho)}đ`} di={() => di('ketoan', 'ck')} />,
    xemTien && <Viec key="giam" so={giam.length} nhan="phiếu giảm giá hôm nay cần soát" di={() => di('ketoan', 'soat')} />,
    docDoiSoat && (laAdmin || vaiTro === 'KeToan' || vaiTro === 'ThuKho') && <Viec key="lech" so={lech.length} nhan="chuyến chốt bị lệch hàng/vỏ" di={() => di('baocao', 'kho')} />,
  ].filter(Boolean)
  const coViec = [chuaGan.length && xemDieuPhoi, chuaXuat.length && xemKho, (veKho ?? []).length && xemKho, (choNop ?? []).length && xemTien, soCk && xemTien, giam.length && xemTien, lech.length && docDoiSoat].some(Boolean)

  return (
    <div className="man man-rong">
      <section className="the the-rong">
        <h2>Hôm nay · {hienNgay(homNay)}</h2>
      </section>
      <div className="o-so">
        <div className="o-so-mot o-so-chinh">
          <span>Doanh thu</span>
          <strong>{pg ? dinhDangSo(t.doanhThu) + 'đ' : '…'}</strong>
          {pgQua && (
            <small className={'so-sanh ' + (pt != null && pt > 0 ? 'tang' : 'giam')}>
              {pt == null ? '' : `${pt > 0 ? '▲' : pt < 0 ? '▼' : '='} ${Math.abs(pt)}% · `}hôm qua cùng giờ {dinhDangSo(tq.doanhThu)}đ
            </small>
          )}
        </div>
        <div className="o-so-mot">
          <span>Lượt giao</span>
          <strong>{dinhDangSo(t.luotGiao)}</strong>
          <small>hôm qua cùng giờ {dinhDangSo(tq.luotGiao)}</small>
        </div>
        <div className="o-so-mot">
          <span>Tiền mặt đã thu</span>
          <strong>{dinhDangSo(t.tienMat)}đ</strong>
          <small>CK {dinhDangSo(t.chuyenKhoan)}đ · nợ {dinhDangSo(t.ghiNo)}đ</small>
        </div>
        <div className="o-so-mot">
          <span>Đơn cho ngày mai</span>
          <strong>{dinhDangSo(donMai.length)}</strong>
          {xemDon && <button className="nut-chu" onClick={() => di('donhang')}>Xem đơn ›</button>}
        </div>
      </div>

      <section className="the the-rong">
        <h2>Cần xử lý</h2>
        {coViec ? <ul className="ds-viec">{viec}</ul> : <p className="tin-tot">✔ Không có việc nào đang chờ.</p>}
      </section>

      <section className="the the-rong">
        <h2>Chuyến hôm nay ({dsChuyen.length})</h2>
        {chuyen && dsChuyen.length === 0 && <p className="ghi-chu">Chưa có chuyến nào.</p>}
        <ul className="ds-chuyen-tq">
          {dsChuyen.map((c) => {
            const td = tienDo(c.DonIds, donCoPhieu)
            return (
              <li key={c.id}>
                <div>
                  <strong>{c.BienSo} · C{c.SoChuyen}</strong>
                  <small>{c.TaiXe.HoTen}{c.PhuXe.length ? ` + ${c.PhuXe.length} phụ xe` : ''}</small>
                </div>
                <div className="tien-do">
                  <span className={'nhan-tt ' + (c.TrangThai === 'HoanThanh' ? 'tt-DaGiao' : c.TrangThai === 'DangGiao' ? 'tt-DaGan' : 'tt-Moi')}>{TEN_TRANG_THAI_CHUYEN[c.TrangThai]}</span>
                  {td.tong > 0 && (
                    <>
                      <div className="thanh-tien-do" role="progressbar" aria-valuenow={td.xong} aria-valuemin={0} aria-valuemax={td.tong} aria-label={`${td.xong}/${td.tong} khách`}>
                        <span style={{ width: `${(td.xong / td.tong) * 100}%` }} />
                      </div>
                      <small>{td.xong}/{td.tong} khách</small>
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
