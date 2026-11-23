// Báo cáo doanh thu (Admin, Kế toán). Suy từ PhieuGiao — xem src/lib/baoCao.ts.
import { useMemo, useState } from 'react'
import { collection, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useNghe } from '../lib/nghe'
import { dinhDangSo } from '../lib/so'
import { hienNgay, ngayVN, type DonHang } from '../lib/donHang'
import {
  TEN_KY, kyBaoCao, kyTruoc, phanTram, soNgay, theoMoc, tongHop,
  type Dong3, type MaKy, type PhieuBC,
} from '../lib/baoCao'
import BieuDoCot from '../components/BieuDoCot'
import BaoCaoKho from './BaoCaoKho'

const KY: MaKy[] = ['homnay', 'homqua', '7ngay', 'thangnay', 'thangtruoc']
const TOI_DA_NGAY = 93

function SoSanh({ nay, truoc, tienTe = true }: { nay: number; truoc: number | null; tienTe?: boolean }) {
  if (truoc == null) return null
  const pt = phanTram(nay, truoc)
  // Xanh khi hơn, xám khi kém — KHÔNG đỏ (MIA: giảm chưa chắc là xấu, đỏ làm hoảng).
  return (
    <small className={'so-sanh ' + (pt != null && pt > 0 ? 'tang' : 'giam')}>
      {pt == null ? 'kỳ trước 0' : `${pt > 0 ? '▲' : pt < 0 ? '▼' : '='} ${Math.abs(pt)}%`} · kỳ trước {tienTe ? dinhDangSo(truoc) + 'đ' : dinhDangSo(truoc)}
    </small>
  )
}

function BangTop({ tieuDe, cot1, ds, tong, gioiHan }: { tieuDe: string; cot1: string; ds: Dong3[]; tong: number; gioiHan?: number }) {
  const [het, setHet] = useState(false)
  const hien = gioiHan && !het ? ds.slice(0, gioiHan) : ds
  return (
    <section className="the the-rong">
      <h2>{tieuDe}</h2>
      {ds.length === 0 ? <p className="ghi-chu">Không có dữ liệu trong kỳ.</p> : (
        <table className="bang-bc">
          <thead><tr><th>{cot1}</th><th>SL</th><th>Doanh thu</th><th>%</th></tr></thead>
          <tbody>
            {hien.map((x) => (
              <tr key={x.khoa}>
                <td>{x.ten}<small>{x.luot} lượt</small></td>
                <td>{dinhDangSo(x.soLuong)}</td>
                <td>{dinhDangSo(x.doanhThu)}</td>
                <td>{tong ? Math.round((x.doanhThu / tong) * 100) : 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {gioiHan && ds.length > gioiHan && (
        <button className="nut-chu" onClick={() => setHet(!het)}>{het ? 'Thu gọn' : `Xem tất cả ${ds.length}`}</button>
      )}
    </section>
  )
}

function BaoCaoDoanhThu() {
  const [ma, setMa] = useState<MaKy | 'tuy'>('homnay')
  const [tuyChon, setTuyChon] = useState(() => kyBaoCao('7ngay'))
  const ky = ma === 'tuy' ? tuyChon : kyBaoCao(ma)
  const truoc = kyTruoc(ky.tu, ky.den)
  const quaDai = soNgay(ky.tu, ky.den) > TOI_DA_NGAY || ky.tu > ky.den

  const { ds: phieu, loi } = useNghe<PhieuBC>(
    () => query(collection(db, 'PhieuGiao'), where('Ngay', '>=', ky.tu), where('Ngay', '<=', quaDai ? ky.tu : ky.den)), [ky.tu, ky.den, quaDai])
  const { ds: phieuTruoc } = useNghe<PhieuBC>(
    () => query(collection(db, 'PhieuGiao'), where('Ngay', '>=', truoc.tu), where('Ngay', '<=', quaDai ? truoc.tu : truoc.den)), [truoc.tu, truoc.den, quaDai])
  const { ds: don } = useNghe<DonHang>(
    () => query(collection(db, 'DonHang'), where('NgayGiao', '>=', ky.tu), where('NgayGiao', '<=', quaDai ? ky.tu : ky.den)), [ky.tu, ky.den, quaDai])

  const salesCua = useMemo(() => {
    const m = new Map((don ?? []).map((d) => [d.id, d.TenNguoiTao]))
    return (id: string) => m.get(id)
  }, [don])
  const t = useMemo(() => tongHop(phieu ?? [], salesCua), [phieu, salesCua])
  const tt = useMemo(() => (phieuTruoc ? tongHop(phieuTruoc) : null), [phieuTruoc])
  const moc = useMemo(() => theoMoc(phieu ?? [], ky.tu, ky.den), [phieu, ky.tu, ky.den])
  const tongThu = t.tienMat + t.chuyenKhoan + t.ghiNo

  return (
    <div className="man man-rong">
      <section className="the the-rong">
        <h2>Doanh thu {ky.tu === ky.den ? hienNgay(ky.tu) : `${hienNgay(ky.tu)} – ${hienNgay(ky.den)}`}</h2>
        <div className="dai-chip" role="tablist">
          {KY.map((k) => (
            <button key={k} role="tab" aria-selected={ma === k} className={ma === k ? 'chip dang-chon' : 'chip'} onClick={() => setMa(k)}>{TEN_KY[k]}</button>
          ))}
          <button role="tab" aria-selected={ma === 'tuy'} className={ma === 'tuy' ? 'chip dang-chon' : 'chip'} onClick={() => setMa('tuy')}>Tuỳ chọn</button>
        </div>
        {ma === 'tuy' && (
          <div className="hang-ngay-2">
            <label>Từ<input type="date" value={tuyChon.tu} max={ngayVN()} onChange={(e) => e.target.value && setTuyChon({ ...tuyChon, tu: e.target.value })} /></label>
            <label>Đến<input type="date" value={tuyChon.den} max={ngayVN()} onChange={(e) => e.target.value && setTuyChon({ ...tuyChon, den: e.target.value })} /></label>
          </div>
        )}
        {quaDai && <p className="loi">{ky.tu > ky.den ? 'Ngày bắt đầu sau ngày kết thúc.' : `Kỳ tối đa ${TOI_DA_NGAY} ngày — chọn ngắn lại.`}</p>}
        {loi && <p className="loi">{loi}</p>}
      </section>

      {!quaDai && (
        <>
          <div className="o-so">
            <div className="o-so-mot o-so-chinh">
              <span>Doanh thu</span>
              <strong>{phieu ? dinhDangSo(t.doanhThu) + 'đ' : '…'}</strong>
              {phieu && <SoSanh nay={t.doanhThu} truoc={tt?.doanhThu ?? null} />}
            </div>
            <div className="o-so-mot">
              <span>Sản lượng</span>
              <strong>{Object.entries(t.sanLuong).map(([dv, n]) => `${dinhDangSo(n)} ${dv.toLowerCase()}`).join(' · ') || '0'}</strong>
            </div>
            <div className="o-so-mot">
              <span>Lượt giao</span>
              <strong>{dinhDangSo(t.luotGiao)}</strong>
              <small>{t.taiCho ? `${t.taiCho} bán tại chỗ` : ''}{t.taiCho && t.khongGiao ? ' · ' : ''}{t.khongGiao ? `${t.khongGiao} không giao được` : ''}</small>
            </div>
            <div className="o-so-mot">
              <span>Giảm giá</span>
              <strong>{dinhDangSo(t.giamGia)}đ</strong>
              <small>{t.doanhThu + t.giamGia ? `= ${((t.giamGia / (t.doanhThu + t.giamGia)) * 100).toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% giá gốc` : ''}</small>
            </div>
          </div>

          <section className="the the-rong">
            <h2>Thu tiền trong kỳ</h2>
            <div className="thanh-ty-le" aria-hidden="true">
              {[['tm', t.tienMat], ['ck', t.chuyenKhoan], ['no', t.ghiNo]].map(([k, v]) =>
                (v as number) > 0 ? <span key={k as string} className={'ty-le-' + k} style={{ flexGrow: v as number }} /> : null)}
            </div>
            <table className="bang-bc bang-thu">
              <tbody>
                <tr><td><i className="cham ty-le-tm" />Tiền mặt</td><td>{dinhDangSo(t.tienMat)}đ</td><td>{tongThu ? Math.round((t.tienMat / tongThu) * 100) : 0}%</td></tr>
                <tr><td><i className="cham ty-le-ck" />Chuyển khoản</td><td>{dinhDangSo(t.chuyenKhoan)}đ</td><td>{tongThu ? Math.round((t.chuyenKhoan / tongThu) * 100) : 0}%</td></tr>
                <tr><td><i className="cham ty-le-no" />Ghi nợ</td><td>{dinhDangSo(t.ghiNo)}đ</td><td>{tongThu ? Math.round((t.ghiNo / tongThu) * 100) : 0}%</td></tr>
              </tbody>
            </table>
            {t.tienCoc > 0 && <p className="ghi-chu">Trong đó tiền cọc vỏ: {dinhDangSo(t.tienCoc)}đ (không tính vào doanh thu).</p>}
            <p className="ghi-chu">Chỉ tính tiền thu lúc giao hàng; thu nợ cũ xem ở Kế toán → Công nợ.</p>
          </section>

          <section className="the the-rong">
            <h2>{soNgay(ky.tu, ky.den) > 45 ? 'Doanh thu theo tuần' : 'Doanh thu theo ngày'}</h2>
            <BieuDoCot ds={moc.map((m) => ({ nhan: m.nhan, giaTri: m.doanhThu, phu: `${m.luot} lượt` }))}
              tieuDeBang={[soNgay(ky.tu, ky.den) > 45 ? 'Tuần' : 'Ngày', 'Doanh thu (đ)']} />
          </section>

          <div className="luoi-2">
            <BangTop tieuDe="Theo sản phẩm" cot1="Sản phẩm" ds={t.theoSanPham} tong={t.doanhThu} />
            <BangTop tieuDe="Theo xe" cot1="Xe" ds={t.theoXe} tong={t.doanhThu} />
            <BangTop tieuDe="Theo người nhận đơn" cot1="Sales" ds={t.theoSales} tong={t.doanhThu} />
            <BangTop tieuDe="Khách mua nhiều nhất" cot1="Khách" ds={t.theoKhach} tong={t.doanhThu} gioiHan={10} />
          </div>
        </>
      )}
    </div>
  )
}

/** Tab Báo cáo: Doanh thu (Admin, Kế toán) · Tồn kho & vỏ (Admin, Kế toán, Thủ kho). */
export default function BaoCao({ vaiTro, mucBanDau }: { vaiTro: string; mucBanDau?: string }) {
  const xemDoanhThu = vaiTro === 'Admin' || vaiTro === 'KeToan'
  const [muc, setMuc] = useState<'dt' | 'kho'>((mucBanDau as 'dt') ?? (xemDoanhThu ? 'dt' : 'kho'))
  return (
    <>
      {xemDoanhThu && (
        <div className="hang-nut nho thanh-muc">
          <button className={muc === 'dt' ? '' : 'nut-vien'} onClick={() => setMuc('dt')}>Doanh thu</button>
          <button className={muc === 'kho' ? '' : 'nut-vien'} onClick={() => setMuc('kho')}>Tồn kho & vỏ</button>
        </div>
      )}
      {muc === 'dt' && xemDoanhThu ? <BaoCaoDoanhThu /> : <BaoCaoKho />}
    </>
  )
}
