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
import type { Chuyen } from '../lib/dieuPhoi'
import { docSo } from '../lib/so'
import MaQR from '../components/MaQR'
import NhapDauKy from './NhapDauKy'
import FormThuNo from './ThuNo'
import { goi, loiMayChu } from '../lib/goiMayChu'
import type { BanGhi } from './DanhMuc'
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

interface KhoanCK { id: string; Loai: 'PhieuGiao' | 'PhieuThu'; Ngay: string; BienSo: string; SoChuyen: number; TenKhach: string; SoTien: number; NoiDung?: string; TenNguoiTao: string }

function ChuyenKhoan() {
  const { ds: dsGiao, loi } = useNghe<PhieuGiao>(() => query(collection(db, 'PhieuGiao'), where('CK.TrangThai', '==', 'ChoXacNhan')), [])
  const { ds: dsThu } = useNghe<{ Ngay: string; BienSo: string; SoChuyen: number; TenKhach: string; ChuyenKhoan: number; CK: { NoiDung?: string }; TenNguoiTao: string }>(
    () => query(collection(db, 'PhieuThu'), where('CK.TrangThai', '==', 'ChoXacNhan')), [])
  const [loiGhi, setLoiGhi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)
  async function xacNhan(p: KhoanCK, thay: boolean) {
    if (!thay && !confirm(`Không thấy ${dinhDangSo(p.SoTien)}đ của ${p.TenKhach} trong sao kê? Số này sẽ được CỘNG LẠI vào nợ của khách.`)) return
    setLoiGhi(null)
    setBan(true)
    try {
      await goi('xacNhanCK', { Loai: p.Loai, Id: p.id, Thay: thay })
    } catch (e) {
      setLoiGhi(loiMayChu(e))
    } finally {
      setBan(false)
    }
  }
  const dsSx: KhoanCK[] = [
    ...(dsGiao ?? []).map((p) => ({ id: p.id, Loai: 'PhieuGiao' as const, Ngay: p.Ngay, BienSo: p.BienSo, SoChuyen: p.SoChuyen, TenKhach: p.TenKhach, SoTien: p.TT.ChuyenKhoan, NoiDung: p.CK?.NoiDung, TenNguoiTao: p.TenNguoiTao })),
    ...(dsThu ?? []).map((p) => ({ id: p.id, Loai: 'PhieuThu' as const, Ngay: p.Ngay, BienSo: p.BienSo, SoChuyen: p.SoChuyen, TenKhach: p.TenKhach + ' (thu nợ)', SoTien: p.ChuyenKhoan, NoiDung: p.CK?.NoiDung, TenNguoiTao: p.TenNguoiTao })),
  ].sort((a, b) => (a.Ngay < b.Ngay ? -1 : 1))
  return (
    <section className="the the-rong">
      <h2>Chuyển khoản chờ xác nhận ({dsSx.length})</h2>
      {loi && <p className="loi">{loi}</p>}
      {loiGhi && <p className="loi">{loiGhi}</p>}
      {dsGiao && dsSx.length === 0 && <p className="ghi-chu">Không có khoản nào chờ.</p>}
      <ul className="ds-nv">
        {dsSx.map((p) => (
          <li key={p.id} className="dong-nv">
            <div className="dong-nv-than">
              <div className="chuyen-dau"><strong>{p.TenKhach}</strong><strong>{dinhDangSo(p.SoTien)}đ</strong></div>
              <p className="ghi-chu">{hienNgay(p.Ngay)} · {p.BienSo} C{p.SoChuyen} · {p.TenNguoiTao}<br />Nội dung CK: {p.NoiDung}</p>
              <div className="hang-nut">
                <button disabled={ban} onClick={() => xacNhan(p, true)}>✔ Đã thấy tiền</button>
                <button disabled={ban} className="nut-nguy" onClick={() => xacNhan(p, false)}>Không thấy</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function NopTien({ uid, tenToi }: { uid: string; tenToi: string }) {
  const { ds, loi } = useNghe<Chuyen>(() => query(collection(db, 'Chuyen'), where('NopTien.TrangThai', '==', 'ChoNop')), [])
  const [nhap, setNhap] = useState<Record<string, string>>({})
  const [tin, setTin] = useState<string | null>(null)
  const [loiGhi, setLoiGhi] = useState<string | null>(null)
  async function nhan(c: Chuyen & { id: string }) {
    const n = docSo(nhap[c.id] ?? '')
    if (n === null || Number.isNaN(n)) return setLoiGhi('Nhập số tiền thực nhận.')
    const lech = n - c.NopTien!.PhaiNop
    if (lech !== 0 && !confirm(`Nhận ${dinhDangSo(n)}đ, phải nộp ${dinhDangSo(c.NopTien!.PhaiNop)}đ → ${lech < 0 ? 'THIẾU' : 'DƯ'} ${dinhDangSo(Math.abs(lech))}đ. Ghi nhận?`)) return
    setLoiGhi(null)
    try {
      await updateDoc(doc(db, 'Chuyen', c.id), {
        NopTien: { TrangThai: 'DaNop', PhaiNop: c.NopTien!.PhaiNop, SoNhan: n, ChenhLech: lech, Boi: uid, TenNguoi: tenToi, Luc: serverTimestamp() },
      })
      setTin(`Đã nhận ${dinhDangSo(n)}đ của ${c.TaiXe.HoTen}${lech ? ` (${lech < 0 ? 'thiếu' : 'dư'} ${dinhDangSo(Math.abs(lech))}đ — Admin xử lý)` : ''}.`)
    } catch (e) {
      setLoiGhi(String(e))
    }
  }
  return (
    <section className="the the-rong">
      <h2>Tiền mặt chờ nộp ({(ds ?? []).length})</h2>
      {loi && <p className="loi">{loi}</p>}
      {tin && <p className="tin-tot">{tin}</p>}
      {loiGhi && <p className="loi">{loiGhi}</p>}
      {ds && ds.length === 0 && <p className="ghi-chu">Không có chuyến nào chờ nộp tiền.</p>}
      {(ds ?? []).map((c) => (
        <div key={c.id} className="dong-soat">
          <strong>{c.TaiXe.HoTen} · {c.BienSo} C{c.SoChuyen} · {hienNgay(c.Ngay)}</strong>
          <small>Phải nộp: <strong>{dinhDangSo(c.NopTien!.PhaiNop)}đ</strong></small>
          <div className="hang-nut">
            <input inputMode="numeric" aria-label={`Số nhận ${c.TaiXe.HoTen}`} placeholder="Số thực nhận" value={nhap[c.id] ? dinhDangSo(docSo(nhap[c.id]) ?? 0) : ''}
              onChange={(e) => setNhap({ ...nhap, [c.id]: e.target.value.replace(/\D/g, '') })} />
            <button onClick={() => nhan(c)}>Đã nhận</button>
          </div>
        </div>
      ))}
    </section>
  )
}

interface CongNo { TenKhach: string; NoTien: number; NoVo: Record<string, number>; CocVo: Record<string, number>; TienCoc: number }

function CongNoKhach({ laAdmin, uid, tenToi }: { laAdmin: boolean; uid: string; tenToi: string }) {
  const [moNhap, setMoNhap] = useState(false)
  const [thu, setThu] = useState<string | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const { ds: kh } = useNghe<BanGhi>(() => collection(db, 'KhachHang'), [])
  const { ds: spDu } = useNghe<BanGhi>(() => collection(db, 'SanPham'), [])
  const { ds, loi } = useNghe<CongNo>(() => collection(db, 'CongNoKhach'), [])
  const { ds: sp } = useNghe<{ Ten: string }>(() => collection(db, 'SanPham'), [])
  const ten = (id: string) => sp?.find((x) => x.id === id)?.Ten ?? id
  const coNo = (ds ?? []).filter((c) => c.NoTien !== 0 || Object.values(c.NoVo ?? {}).some((n) => n !== 0) || c.TienCoc !== 0)
    .sort((a, b) => b.NoTien - a.NoTien)
  const tong = coNo.reduce((s, c) => s + c.NoTien, 0)
  if (moNhap) return <NhapDauKy dong={() => setMoNhap(false)} />
  if (thu)
    return (
      <section className="the the-rong">
        <FormThuNo uid={uid} tenToi={tenToi} khach={kh ?? []} sanPham={(spDu ?? []).filter((x) => x.TrangThai !== 'Inactive')}
          khachId={thu === 'moi' ? undefined : thu} xong={(t) => { setTin(t); setThu(null) }} huy={() => setThu(null)} />
      </section>
    )
  return (
    <section className="the the-rong">
      {tin && <p className="tin-tot">{tin}</p>}
      <div className="hang-nut">
        <button onClick={() => { setThu('moi'); setTin(null) }}>+ Thu nợ</button>
        {laAdmin && <button className="nut-vien" onClick={() => setMoNhap(true)}>Nhập đầu kỳ (Excel)</button>}
      </div>
      <h2>Công nợ khách ({coNo.length}) · nợ tiền {dinhDangSo(tong)}đ</h2>
      {loi && <p className="loi">{loi}</p>}
      {ds && coNo.length === 0 && <p className="ghi-chu">Chưa có khách nào nợ.</p>}
      <table className="bang-ton">
        <thead><tr><th>Khách</th><th>Nợ tiền</th><th>Nợ vỏ</th><th>Cọc</th></tr></thead>
        <tbody>
          {coNo.map((c) => (
            <tr key={c.id} className="bam-duoc" onClick={() => { setThu(c.id); setTin(null) }}>
              <td>{c.TenKhach}</td>
              <td>{dinhDangSo(c.NoTien)}</td>
              <td>{Object.entries(c.NoVo ?? {}).filter(([, n]) => n).map(([k, n]) => `${n} ${ten(k)}`).join(', ') || '—'}</td>
              <td>{c.TienCoc ? `${dinhDangSo(c.TienCoc)}đ` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="ghi-chu">Số được cộng khi thủ kho chốt chuyến. Nợ vỏ âm = công ty đang giữ dư vỏ của khách. Bấm vào một dòng để thu nợ khách đó.</p>
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

export default function KeToan({ uid, tenToi, laAdmin }: { uid: string; tenToi: string; laAdmin: boolean }) {
  const [muc, setMuc] = useState<'tien' | 'ck' | 'no' | 'soat' | 'tk'>('tien')
  return (
    <div className="man">
      <div className="hang-nut nho">
        <button className={muc === 'tien' ? '' : 'nut-vien'} onClick={() => setMuc('tien')}>Tiền mặt</button>
        <button className={muc === 'ck' ? '' : 'nut-vien'} onClick={() => setMuc('ck')}>Chuyển khoản</button>
        <button className={muc === 'no' ? '' : 'nut-vien'} onClick={() => setMuc('no')}>Công nợ</button>
        <button className={muc === 'soat' ? '' : 'nut-vien'} onClick={() => setMuc('soat')}>Soát giảm giá</button>
        {laAdmin && <button className={muc === 'tk' ? '' : 'nut-vien'} onClick={() => setMuc('tk')}>Tài khoản nhận CK</button>}
      </div>
      {muc === 'tien' && <NopTien uid={uid} tenToi={tenToi} />}
      {muc === 'ck' && <ChuyenKhoan />}
      {muc === 'no' && <CongNoKhach laAdmin={laAdmin} uid={uid} tenToi={tenToi} />}
      {muc === 'soat' && <SoatNgay />}
      {muc === 'tk' && laAdmin && <TaiKhoanCK />}
    </div>
  )
}
