// Tab Kế toán (Admin, Kế toán):
//  - Chuyển khoản chờ xác nhận: đối chiếu sao kê rồi bấm xác nhận.
//  - Soát giảm giá / giao thiếu / không giao theo ngày (Vicky: Admin soát mỗi tối).
//  - Tài khoản nhận chuyển khoản (Admin) — để app dựng mã QR.
import { useState } from 'react'
import { collection, doc, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useNghe, useNgheMot } from '../lib/nghe'
import { dinhDangSo } from '../lib/so'
import { hienNgay, ngayVN } from '../lib/donHang'
import { taiKhoanHopLe, boDau as boDauQR, type TaiKhoanNhan } from '../lib/vietQR'
import MaQR from '../components/MaQR'
import type { DongGiao, ThanhToan } from '../../functions/src/giaoLogic'

interface PhieuGiao {
  Ngay: string; BienSo: string; SoChuyen: number; TenKhach: string; TaiCho: boolean; Dong: DongGiao[]; TT: ThanhToan; PhaiThu: number
  CoGiamGia: boolean; LyDoGiamGia: string | null; CoGiaoThieu: boolean; LyDoGiaoThieu: string | null; KhongGiao: boolean
  CK: { TrangThai: 'ChoXacNhan' | 'DaXacNhan' | 'KhongThay'; NoiDung?: string } | null; TenNguoiTao: string
}

const NGAN_HANG: { bin: string; ten: string }[] = [
  { bin: '970407', ten: 'Techcombank' }, { bin: '970436', ten: 'Vietcombank' }, { bin: '970415', ten: 'VietinBank' },
  { bin: '970418', ten: 'BIDV' }, { bin: '970405', ten: 'Agribank' }, { bin: '970422', ten: 'MB Bank' },
  { bin: '970416', ten: 'ACB' }, { bin: '970432', ten: 'VPBank' }, { bin: '970423', ten: 'TPBank' },
  { bin: '970403', ten: 'Sacombank' }, { bin: '970443', ten: 'SHB' }, { bin: '970441', ten: 'VIB' },
  { bin: '970431', ten: 'Eximbank' }, { bin: '970426', ten: 'MSB' }, { bin: '970454', ten: 'VietCapital Bank' },
]

function ChuyenKhoan({ uid }: { uid: string }) {
  const { ds, loi } = useNghe<PhieuGiao>(() => query(collection(db, 'PhieuGiao'), where('CK.TrangThai', '==', 'ChoXacNhan')), [])
  const [loiGhi, setLoiGhi] = useState<string | null>(null)
  async function xacNhan(id: string, p: PhieuGiao, thay: boolean) {
    if (!thay && !confirm(`Không thấy ${dinhDangSo(p.TT.ChuyenKhoan)}đ của ${p.TenKhach} trong sao kê? Khoản này sẽ được báo để xử lý.`)) return
    setLoiGhi(null)
    try {
      await updateDoc(doc(db, 'PhieuGiao', id), { CK: { ...p.CK, TrangThai: thay ? 'DaXacNhan' : 'KhongThay', Boi: uid, Luc: serverTimestamp() } })
    } catch (e) {
      setLoiGhi(String(e))
    }
  }
  const dsSx = (ds ?? []).slice().sort((a, b) => (a.Ngay < b.Ngay ? -1 : 1))
  return (
    <section className="the the-rong">
      <h2>Chuyển khoản chờ xác nhận ({dsSx.length})</h2>
      {loi && <p className="loi">{loi}</p>}
      {loiGhi && <p className="loi">{loiGhi}</p>}
      {ds && dsSx.length === 0 && <p className="ghi-chu">Không có khoản nào chờ.</p>}
      <ul className="ds-nv">
        {dsSx.map((p) => (
          <li key={p.id} className="dong-nv">
            <div className="dong-nv-than">
              <div className="chuyen-dau"><strong>{p.TenKhach}</strong><strong>{dinhDangSo(p.TT.ChuyenKhoan)}đ</strong></div>
              <p className="ghi-chu">{hienNgay(p.Ngay)} · {p.BienSo} C{p.SoChuyen} · {p.TenNguoiTao}<br />Nội dung CK: {p.CK?.NoiDung}</p>
              <div className="hang-nut">
                <button onClick={() => xacNhan(p.id, p, true)}>✔ Đã thấy tiền</button>
                <button className="nut-nguy" onClick={() => xacNhan(p.id, p, false)}>Không thấy</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SoatNgay() {
  const [ngay, setNgay] = useState(ngayVN())
  const { ds, loi } = useNghe<PhieuGiao>(() => query(collection(db, 'PhieuGiao'), where('Ngay', '==', ngay)), [ngay])
  const giam = (ds ?? []).filter((p) => p.CoGiamGia)
  const thieu = (ds ?? []).filter((p) => p.CoGiaoThieu || p.KhongGiao)
  const tienGiam = giam.reduce((s, p) => s + p.Dong.reduce((t, d) => t + d.SoLuong * (d.GiaDon - d.DonGia), 0), 0)
  return (
    <section className="the the-rong">
      <div className="hang-ngay">
        <h2>Soát {hienNgay(ngay)}</h2>
        <input type="date" value={ngay} onChange={(e) => e.target.value && setNgay(e.target.value)} aria-label="Chọn ngày" />
      </div>
      {loi && <p className="loi">{loi}</p>}
      <p className="ghi-chu">{(ds ?? []).length} phiếu giao trong ngày.</p>
      <h3>Giảm giá ({giam.length}) · tổng giảm {dinhDangSo(tienGiam)}đ</h3>
      {giam.length === 0 && <p className="ghi-chu">Không có.</p>}
      {giam.map((p) => (
        <div key={p.id} className="dong-soat">
          <strong>{p.TenKhach}</strong> · {p.TenNguoiTao} · {p.BienSo} C{p.SoChuyen}
          {p.Dong.filter((d) => d.DonGia < d.GiaDon).map((d) => (
            <small key={d.SanPhamId}>{d.Ten} × {d.SoLuong}: {dinhDangSo(d.GiaDon)} → {dinhDangSo(d.DonGia)}đ (giảm {dinhDangSo((d.GiaDon - d.DonGia) * d.SoLuong)}đ)</small>
          ))}
          <small>Lý do: {p.LyDoGiamGia}</small>
        </div>
      ))}
      <h3>Giao thiếu / không giao ({thieu.length})</h3>
      {thieu.length === 0 && <p className="ghi-chu">Không có.</p>}
      {thieu.map((p) => (
        <div key={p.id} className="dong-soat">
          <strong>{p.TenKhach}</strong> · {p.TenNguoiTao} · {p.KhongGiao ? 'KHÔNG GIAO' : 'giao thiếu'}
          {p.Dong.filter((d) => d.SoLuong < d.SoLuongDon).map((d) => <small key={d.SanPhamId}>{d.Ten}: đơn {d.SoLuongDon}, giao {d.SoLuong}</small>)}
          <small>Lý do: {p.LyDoGiaoThieu}</small>
        </div>
      ))}
    </section>
  )
}

function TaiKhoanCK() {
  const tk = useNgheMot<TaiKhoanNhan>(() => doc(db, 'CaiDat', 'ThanhToan'), [])
  const [sua, setSua] = useState<TaiKhoanNhan | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const d = sua ?? tk ?? { MaNganHang: '', SoTaiKhoan: '', TenChuTaiKhoan: '', TenNganHang: '' }
  const doi = (x: Partial<TaiKhoanNhan>) => setSua({ ...d, ...x })
  async function luu() {
    setLoi(null)
    const moi = { ...d, SoTaiKhoan: d.SoTaiKhoan.replace(/\s/g, ''), TenChuTaiKhoan: boDauQR(d.TenChuTaiKhoan).toUpperCase() }
    if (!taiKhoanHopLe(moi)) return setLoi('Chọn ngân hàng và nhập số tài khoản (4–19 chữ/số, không dấu cách).')
    if (!moi.TenChuTaiKhoan) return setLoi('Thiếu tên chủ tài khoản.')
    try {
      await setDoc(doc(db, 'CaiDat', 'ThanhToan'), { MaNganHang: moi.MaNganHang, TenNganHang: moi.TenNganHang, SoTaiKhoan: moi.SoTaiKhoan, TenChuTaiKhoan: moi.TenChuTaiKhoan })
      setSua(null)
      setTin('Đã lưu. Quét thử mã bên dưới bằng app ngân hàng để chắc đúng tên chủ tài khoản.')
    } catch (e) {
      setLoi(String(e))
    }
  }
  return (
    <section className="the the-rong">
      <h2>Tài khoản nhận chuyển khoản</h2>
      <label>Ngân hàng
        <select value={d.MaNganHang} onChange={(e) => doi({ MaNganHang: e.target.value, TenNganHang: NGAN_HANG.find((n) => n.bin === e.target.value)?.ten ?? '' })}>
          <option value="">— Chọn —</option>
          {NGAN_HANG.map((n) => <option key={n.bin} value={n.bin}>{n.ten}</option>)}
        </select>
      </label>
      <label>Số tài khoản<input value={d.SoTaiKhoan} onChange={(e) => doi({ SoTaiKhoan: e.target.value })} /></label>
      <label>Tên chủ tài khoản (không dấu)<input value={d.TenChuTaiKhoan} onChange={(e) => doi({ TenChuTaiKhoan: e.target.value })} placeholder="CONG TY DAI PHUC KHANG" /></label>
      {loi && <p className="loi">{loi}</p>}
      {tin && <p className="tin-tot">{tin}</p>}
      {sua && <button onClick={luu}>Lưu tài khoản</button>}
      {tk && !sua && <MaQR tk={tk} soTien={1000} noiDung="DPK THU QR" />}
    </section>
  )
}

export default function KeToan({ uid, laAdmin }: { uid: string; laAdmin: boolean }) {
  const [muc, setMuc] = useState<'ck' | 'soat' | 'tk'>('ck')
  return (
    <div className="man">
      <div className="hang-nut nho">
        <button className={muc === 'ck' ? '' : 'nut-vien'} onClick={() => setMuc('ck')}>Chuyển khoản</button>
        <button className={muc === 'soat' ? '' : 'nut-vien'} onClick={() => setMuc('soat')}>Soát giảm giá</button>
        {laAdmin && <button className={muc === 'tk' ? '' : 'nut-vien'} onClick={() => setMuc('tk')}>Tài khoản nhận CK</button>}
      </div>
      {muc === 'ck' && <ChuyenKhoan uid={uid} />}
      {muc === 'soat' && <SoatNgay />}
      {muc === 'tk' && laAdmin && <TaiKhoanCK />}
    </div>
  )
}
