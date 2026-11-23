import { useEffect, useState, type FormEvent } from 'react'
import { Icon, Logo } from './components/BieuTuong'
import { docChuTo, ghiChuTo, useCoMang } from './lib/mang'
import { dangNhap, dangXuat, guiEmailDatLaiMatKhau, usePhienDangNhap } from './lib/auth'
import { DUOI_EMAIL_NOI_BO, emailDangNhap } from '../functions/src/nhanVienLogic'
import NhanVien from './screens/NhanVien'
import DanhMuc from './screens/DanhMuc'
import DonHang from './screens/DonHang'
import DieuPhoi from './screens/DieuPhoi'
import Kho from './screens/Kho'
import ChuyenCuaToi from './screens/ChuyenCuaToi'
import KeToan from './screens/KeToan'
import BaoCao from './screens/BaoCao'
import TongQuan from './screens/TongQuan'
import { KHACH_HANG, NHA_CUNG_CAP, SAN_PHAM, XE } from './screens/cauHinhDanhMuc'
import { TEN_VAI_TRO } from './types'

function ManDangNhap() {
  const [tenDN, setTenDN] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)
  const [hienMk, setHienMk] = useState(false)

  async function quenMatKhau() {
    setLoi(null)
    setTin(null)
    const email = emailDangNhap(tenDN)
    if (!email) return setLoi('Nhập số điện thoại hoặc email của bạn vào ô trên trước.')
    if (email.endsWith(DUOI_EMAIL_NOI_BO))
      return setTin('Tài khoản đăng nhập bằng số điện thoại: nhờ Admin đặt lại mật khẩu trong màn Nhân viên.')
    try {
      await guiEmailDatLaiMatKhau(email)
    } catch {
      // Không báo email có tồn tại hay không — tránh dò tài khoản.
    }
    setTin(`Nếu ${email} có tài khoản, email đặt lại mật khẩu sẽ tới trong vài phút. Xem cả hộp Spam.`)
  }

  async function gui(e: FormEvent) {
    e.preventDefault()
    setLoi(null)
    setTin(null)
    const email = emailDangNhap(tenDN)
    if (!email) return setLoi('Nhập số điện thoại 10 số, hoặc email.')
    setDangGui(true)
    try {
      await dangNhap(email, matKhau)
    } catch (err) {
      const ma = (err as { code?: string }).code ?? ''
      setLoi(
        ma === 'auth/invalid-credential' || ma === 'auth/wrong-password' || ma === 'auth/user-not-found'
          ? 'Sai số điện thoại/email hoặc mật khẩu.'
          : ma === 'auth/network-request-failed'
            ? 'Không có mạng. Lần đăng nhập đầu tiên cần có mạng.'
            : ma === 'auth/user-disabled'
              ? 'Tài khoản đã bị ngưng. Liên hệ Admin nếu đây là nhầm lẫn.'
              : ma === 'auth/too-many-requests'
              ? 'Thử sai quá nhiều lần. Đợi vài phút rồi thử lại.'
                : 'Không đăng nhập được: ' + ma,
      )
    } finally {
      setDangGui(false)
    }
  }

  return (
    <main className="dn-nen">
      <span className="dn-bong dn-bong-1" aria-hidden="true" />
      <span className="dn-bong dn-bong-2" aria-hidden="true" />
      <div className="dn-khung">
        <div className="dn-gioi-thieu">
          <div className="dn-thuong-hieu"><Logo co={34} /><span className="dn-ten">Đại Phúc Khang</span></div>
          <h1 className="dn-hero">Nước sạch tới tận nơi, đúng giờ mỗi ngày.</h1>
          <p className="dn-phu">Điều phối · giao hàng · kho · thu nợ — một app cho cả đội Đại Phúc Khang.</p>
        </div>
        <div>
          <form className="dn-form" onSubmit={gui}>
            <label className="dn-nhan" htmlFor="dn-ten">Số điện thoại hoặc email</label>
            <input id="dn-ten" className="dn-o" inputMode="email" autoComplete="username" autoCapitalize="none"
              value={tenDN} onChange={(e) => setTenDN(e.target.value)} placeholder="0901234567" required />
            <p className="dn-goi-y">Nhân viên giao hàng dùng số điện thoại quản lý đã cấp.</p>
            <label className="dn-nhan" htmlFor="dn-mk">Mật khẩu</label>
            <div className="dn-o-boc">
              <input id="dn-mk" className="dn-o" type={hienMk ? 'text' : 'password'} autoComplete="current-password"
                value={matKhau} onChange={(e) => setMatKhau(e.target.value)} required />
              <button type="button" className="dn-hien" onClick={() => setHienMk(!hienMk)} aria-pressed={hienMk}>{hienMk ? 'Ẩn' : 'Hiện'}</button>
            </div>
            {loi && <p className="dn-loi" role="alert">{loi}</p>}
            {tin && <p className="tin-tot" role="status">{tin}</p>}
            <button type="submit" className="dn-nut" disabled={dangGui}>{dangGui ? 'Đang vào…' : 'Vào hệ thống'}</button>
            <button type="button" className="dn-quen" onClick={quenMatKhau}>Quên mật khẩu?</button>
          </form>
          <p className="dn-chan">Lần đầu cần có mạng. Sau đó app nhớ phiên đăng nhập và dùng được cả khi mất sóng.</p>
        </div>
      </div>
    </main>
  )
}

function ThongBao({ tieuDe, noiDung }: { tieuDe: string; noiDung: string }) {
  return (
    <main className="dn-nen">
      <div className="dn-khung dn-khung-hep">
        <div className="dn-thuong-hieu"><Logo co={34} /><span className="dn-ten">Đại Phúc Khang</span></div>
        <div className="dn-form">
          <h1 className="dn-tb">{tieuDe}</h1>
          <p>{noiDung}</p>
          <button className="dn-nut" onClick={() => dangXuat()}>Đăng xuất</button>
        </div>
      </div>
    </main>
  )
}

type Man = 'trangchu' | 'danhmuc' | 'ncc' | 'baocao' | 'ketoan' | 'chuyen' | 'kho' | 'dieuphoi' | 'donhang' | 'khach' | 'sanpham' | 'xe' | 'nhanvien'

const DANH_MUC: { ma: Man; ten: string; mo: string }[] = [
  { ma: 'khach', ten: 'Khách hàng', mo: 'Tên, SĐT, địa chỉ giao, ghi chú cho tài xế' },
  { ma: 'sanpham', ten: 'Sản phẩm', mo: 'Đơn vị, giá bán, vỏ và tiền cọc' },
  { ma: 'xe', ten: 'Xe', mo: 'Biển số, sức chở' },
  { ma: 'nhanvien', ten: 'Nhân viên', mo: 'Tài khoản, vai trò, mật khẩu' },
  { ma: 'ncc', ten: 'Nhà cung cấp', mo: 'Nơi nhập hàng, đổi vỏ' },
]
const ICON_DM: Record<string, string> = { khach: 'khach', sanpham: 'sanpham', xe: 'xe', nhanvien: 'nhanvien', ncc: 'ncc' }

/** Menu Danh mục (Admin) — gom 5 danh mục vào một tab, như "Quản trị" bên MIA. */
function MenuDanhMuc({ chon }: { chon: (m: Man) => void }) {
  return (
    <div className="man">
      <section className="the the-rong">
        <h2>Danh mục</h2>
        <ul className="ds-menu">
          {DANH_MUC.map((d) => (
            <li key={d.ma}>
              <button className="muc-menu" onClick={() => chon(d.ma)}>
                <span className="muc-menu-icon"><Icon ten={ICON_DM[d.ma]} co={22} /></span>
                <span><strong>{d.ten}</strong><small>{d.mo}</small></span>
                <span aria-hidden="true">›</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export default function App() {
  const phien = usePhienDangNhap()
  // null = chưa bấm tab nào → mở màn mặc định theo vai trò.
  const [man, setMan] = useState<Man | null>(null)
  // "Chỉ đường" từ Tổng quan: mở tab + mục con. `lanDi` đổi key để màn gắn lại
  // với mục mới (kể cả khi đang đứng sẵn ở tab đó).
  const [mucDi, setMucDi] = useState<string | undefined>(undefined)
  const [lanDi, setLanDi] = useState(0)
  const di = (m: string, muc?: string) => { setMan(m as Man); setMucDi(muc); setLanDi((x) => x + 1); window.scrollTo(0, 0) }
  const chonTab = (m: Man) => { setMan(m); setMucDi(undefined); window.scrollTo(0, 0) }
  const coMang = useCoMang()
  const [chuTo, setChuTo] = useState(docChuTo)
  useEffect(() => ghiChuTo(chuTo), [chuTo])
  // Bộ màu theo VAI TRÒ (không theo tab): tài xế "Sổ Kho", còn lại "Nhãn Chai".
  const vaiTroHs = phien.hoSo?.VaiTro
  useEffect(() => {
    document.documentElement.setAttribute('data-giaodien', vaiTroHs === 'TaiXe' || vaiTroHs === 'PhuXe' ? 'taixe' : 'admin')
  }, [vaiTroHs])

  if (phien.dangTai)
    return (
      <main className="dn-nen"><div className="dn-thuong-hieu dn-dang-tai" role="status"><Logo co={34} /><span className="dn-ten">Đang mở Đại Phúc Khang…</span></div></main>
    )
  if (!phien.uid) return <ManDangNhap />
  if (phien.loiHoSo) return <ThongBao tieuDe="Không vào được app" noiDung={phien.loiHoSo} />
  if (phien.thieuHoSo || !phien.hoSo)
    return (
      <ThongBao
        tieuDe="Tài khoản chưa được cấp quyền"
        noiDung={`Tài khoản ${phien.email ?? ''} chưa có hồ sơ nhân viên. Nhờ Admin tạo hồ sơ với mã ${phien.uid}.`}
      />
    )
  if (phien.hoSo.TrangThai === 'Inactive')
    return <ThongBao tieuDe="Tài khoản đã ngưng" noiDung="Liên hệ Admin nếu đây là nhầm lẫn." />

  const vaiTro = phien.hoSo.VaiTro
  const laAdmin = vaiTro === 'Admin'
  // Tab theo vai trò. Khách hàng: Sales, Điều phối cũng thêm/sửa được — họ là
  // người gặp khách mới. Xe, Sản phẩm (giá): chỉ Admin.
  // Tài xế / phụ xe: không có Trang chủ — mở app là vào thẳng chuyến của mình
  // (MIA: app tài xế càng ít tab càng tốt).
  const tab: { ma: Man; ten: string; icon: string }[] = [
    ...(vaiTro === 'TaiXe' || vaiTro === 'PhuXe' ? [] : [{ ma: 'trangchu' as Man, ten: 'Tổng quan', icon: 'trangchu' }]),
    ...(laAdmin || vaiTro === 'DieuPhoi' ? [{ ma: 'dieuphoi' as Man, ten: 'Điều phối', icon: 'dieuphoi' }] : []),
    ...(vaiTro === 'TaiXe' || vaiTro === 'PhuXe' ? [{ ma: 'chuyen' as Man, ten: 'Chuyến của tôi', icon: 'chuyen' }] : []),
    ...(laAdmin || vaiTro === 'Sales' || vaiTro === 'DieuPhoi' ? [{ ma: 'donhang' as Man, ten: 'Đơn hàng', icon: 'donhang' }] : []),
    ...(laAdmin || vaiTro === 'ThuKho' || vaiTro === 'KeToan' ? [{ ma: 'kho' as Man, ten: 'Kho', icon: 'kho' }] : []),
    ...(laAdmin || vaiTro === 'KeToan' ? [{ ma: 'ketoan' as Man, ten: 'Kế toán', icon: 'ketoan' }] : []),
    ...(laAdmin || vaiTro === 'KeToan' || vaiTro === 'ThuKho' ? [{ ma: 'baocao' as Man, ten: 'Báo cáo', icon: 'baocao' }] : []),
    ...(vaiTro === 'Sales' || vaiTro === 'DieuPhoi' ? [{ ma: 'khach' as Man, ten: 'Khách hàng', icon: 'khach' }] : []),
    ...(laAdmin ? [{ ma: 'danhmuc' as Man, ten: 'Danh mục', icon: 'danhmuc' }] : []),
  ]
  // Màn con của Danh mục (Admin): không có nút riêng trên dải tab — nút "Danh
  // mục" sáng khi đang ở đó, và có "‹ Danh mục" để quay về.
  const conDanhMuc: Man[] = ['khach', 'sanpham', 'xe', 'nhanvien', 'ncc']
  const trongDanhMuc = laAdmin && man != null && conDanhMuc.includes(man)
  const manMacDinh: Man = vaiTro === 'TaiXe' || vaiTro === 'PhuXe' ? 'chuyen' : 'trangchu'
  const manHien: Man = man && (tab.some((t) => t.ma === man) || trongDanhMuc) ? man : manMacDinh
  const nutSang: Man = trongDanhMuc ? 'danhmuc' : manHien

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div className="app-thuong-hieu">
            <Logo />
            <div>
              <div className="app-title">Đại Phúc Khang</div>
              <div className="app-subtitle">{phien.hoSo.HoTen} · {TEN_VAI_TRO[vaiTro] ?? vaiTro}</div>
            </div>
          </div>
          <div className="app-header-phai">
            <span className={'status-pill ' + (coMang ? 'status-online' : 'status-offline')} role="status">
              <span className="dot" />{coMang ? 'Có mạng' : 'Mất mạng'}
            </span>
            <div className="dau-nut">
              <button className={'nut-dau nut-co-chu' + (chuTo ? ' dang' : '')} onClick={() => setChuTo(!chuTo)} aria-pressed={chuTo}
                aria-label="Chữ to" title={chuTo ? 'Đang bật chữ to — bấm để về cỡ thường' : 'Bật chữ to'}>
                <span aria-hidden="true">A<span className="nut-co-chu-to">A</span></span>
              </button>
              <button className="nut-dau nut-in" onClick={() => window.print()} aria-label="In trang này">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 9V3h10v6" /><rect x="3" y="9" width="18" height="8" rx="1.5" /><path d="M7 14h10v7H7z" />
                </svg>In
              </button>
              <button className="nut-dau" onClick={() => dangXuat()}>Đăng xuất</button>
            </div>
          </div>
        </div>
      </header>
      {tab.length > 1 && (
        <nav className="tabbar" aria-label="Chức năng">
          {tab.map((t) => (
            <button key={t.ma} className={nutSang === t.ma ? 'active' : ''} aria-current={nutSang === t.ma ? 'page' : undefined} onClick={() => chonTab(t.ma)}>
              <span className="tabbar-boc"><Icon ten={t.icon} /></span>
              <span className="tabbar-nhan">{t.ten}</span>
            </button>
          ))}
        </nav>
      )}
      {trongDanhMuc && (
        <div className="thanh-quay-lai"><button className="nut-quay-lai" onClick={() => chonTab('danhmuc')}>‹ Danh mục</button></div>
      )}
      <main className={'noi-dung' + (tab.length > 1 ? ' co-tabbar' : '')}>
        {manHien === 'baocao' ? (
          <BaoCao key={'bc' + lanDi} vaiTro={vaiTro} mucBanDau={mucDi} />
        ) : manHien === 'ketoan' ? (
          <KeToan key={'kt' + lanDi} uid={phien.uid} tenToi={phien.hoSo.HoTen} laAdmin={laAdmin} mucBanDau={mucDi} />
        ) : manHien === 'chuyen' ? (
          <ChuyenCuaToi uid={phien.uid} tenToi={phien.hoSo.HoTen} />
        ) : manHien === 'kho' ? (
          <Kho key={'kho' + lanDi} vaiTro={vaiTro} mucBanDau={mucDi} />
        ) : manHien === 'dieuphoi' ? (
          <DieuPhoi uid={phien.uid} />
        ) : manHien === 'donhang' ? (
          <DonHang uid={phien.uid} tenToi={phien.hoSo.HoTen} />
        ) : manHien === 'nhanvien' ? (
          <NhanVien uidToi={phien.uid} emailToi={phien.email} />
        ) : manHien === 'xe' ? (
          <DanhMuc key="xe" ch={XE} uid={phien.uid} duocSua={laAdmin} />
        ) : manHien === 'sanpham' ? (
          <DanhMuc key="sp" ch={SAN_PHAM} uid={phien.uid} duocSua={laAdmin} />
        ) : manHien === 'danhmuc' ? (
          <MenuDanhMuc chon={chonTab} />
        ) : manHien === 'ncc' ? (
          <DanhMuc key="ncc" ch={NHA_CUNG_CAP} uid={phien.uid} duocSua={laAdmin} />
        ) : manHien === 'khach' ? (
          <DanhMuc key="kh" ch={KHACH_HANG} uid={phien.uid} duocSua />
        ) : (
          <TongQuan vaiTro={vaiTro} di={di} />
        )}
      </main>
    </div>
  )
}
