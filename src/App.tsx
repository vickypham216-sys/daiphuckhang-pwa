import { useState, type FormEvent } from 'react'
import { dangNhap, dangXuat, guiEmailDatLaiMatKhau, usePhienDangNhap } from './lib/auth'
import { DUOI_EMAIL_NOI_BO, emailDangNhap } from '../functions/src/nhanVienLogic'
import NhanVien from './screens/NhanVien'
import DanhMuc from './screens/DanhMuc'
import DonHang from './screens/DonHang'
import DieuPhoi from './screens/DieuPhoi'
import { KHACH_HANG, SAN_PHAM, XE } from './screens/cauHinhDanhMuc'
import { TEN_VAI_TRO } from './types'

function ManDangNhap() {
  const [tenDN, setTenDN] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)

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
    <main className="khung-giua">
      <form className="the" onSubmit={gui}>
        <h1>Đại Phúc Khang</h1>
        <label>
          Số điện thoại hoặc email
          <input
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            value={tenDN}
            onChange={(e) => setTenDN(e.target.value)}
            required
          />
        </label>
        <label>
          Mật khẩu
          <input
            type="password"
            autoComplete="current-password"
            value={matKhau}
            onChange={(e) => setMatKhau(e.target.value)}
            required
          />
        </label>
        {loi && <p className="loi" role="alert">{loi}</p>}
        {tin && <p className="tin-tot" role="status">{tin}</p>}
        <button type="submit" disabled={dangGui}>
          {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
        <button type="button" className="nut-chu" onClick={quenMatKhau}>
          Quên mật khẩu?
        </button>
      </form>
    </main>
  )
}

function ThongBao({ tieuDe, noiDung }: { tieuDe: string; noiDung: string }) {
  return (
    <main className="khung-giua">
      <div className="the">
        <h1>{tieuDe}</h1>
        <p>{noiDung}</p>
        <button onClick={() => dangXuat()}>Đăng xuất</button>
      </div>
    </main>
  )
}

type Man = 'trangchu' | 'dieuphoi' | 'donhang' | 'khach' | 'sanpham' | 'xe' | 'nhanvien'

export default function App() {
  const phien = usePhienDangNhap()
  const [man, setMan] = useState<Man>('trangchu')

  if (phien.dangTai) return <main className="khung-giua">Đang tải…</main>
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
  const tab: { ma: Man; ten: string }[] = [
    { ma: 'trangchu', ten: 'Trang chủ' },
    ...(laAdmin || vaiTro === 'DieuPhoi' ? [{ ma: 'dieuphoi' as Man, ten: 'Điều phối' }] : []),
    ...(laAdmin || vaiTro === 'Sales' || vaiTro === 'DieuPhoi'
      ? [
          { ma: 'donhang' as Man, ten: 'Đơn hàng' },
          { ma: 'khach' as Man, ten: 'Khách hàng' },
        ]
      : []),
    ...(laAdmin
      ? [
          { ma: 'sanpham' as Man, ten: 'Sản phẩm' },
          { ma: 'xe' as Man, ten: 'Xe' },
          { ma: 'nhanvien' as Man, ten: 'Nhân viên' },
        ]
      : []),
  ]
  const manHien = tab.some((t) => t.ma === man) ? man : 'trangchu'

  return (
    <div className="app">
      <header className="thanh-tren">
        <strong>Đại Phúc Khang</strong>
        <span>
          {phien.hoSo.HoTen} · {TEN_VAI_TRO[vaiTro] ?? vaiTro}
        </span>
        <button className="nut-phu" onClick={() => dangXuat()}>
          Đăng xuất
        </button>
      </header>
      {tab.length > 1 && (
        <nav className="thanh-tab">
          {tab.map((t) => (
            <button key={t.ma} className={manHien === t.ma ? 'dang-chon' : ''} onClick={() => setMan(t.ma)}>
              {t.ten}
            </button>
          ))}
        </nav>
      )}
      <main className="noi-dung">
        {manHien === 'dieuphoi' ? (
          <DieuPhoi uid={phien.uid} />
        ) : manHien === 'donhang' ? (
          <DonHang uid={phien.uid} tenToi={phien.hoSo.HoTen} />
        ) : manHien === 'nhanvien' ? (
          <NhanVien uidToi={phien.uid} emailToi={phien.email} />
        ) : manHien === 'xe' ? (
          <DanhMuc key="xe" ch={XE} uid={phien.uid} duocSua={laAdmin} />
        ) : manHien === 'sanpham' ? (
          <DanhMuc key="sp" ch={SAN_PHAM} uid={phien.uid} duocSua={laAdmin} />
        ) : manHien === 'khach' ? (
          <DanhMuc key="kh" ch={KHACH_HANG} uid={phien.uid} duocSua />
        ) : (
          <p>Khung app đã chạy. Các màn Điều phối, Xuất kho, Giao hàng sẽ được thêm vào đây.</p>
        )}
      </main>
    </div>
  )
}
