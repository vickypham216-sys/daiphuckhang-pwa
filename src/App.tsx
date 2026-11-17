import { useState, type FormEvent } from 'react'
import { dangNhap, dangXuat, usePhienDangNhap } from './lib/auth'
import { TEN_VAI_TRO } from './types'

function ManDangNhap() {
  const [email, setEmail] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)

  async function gui(e: FormEvent) {
    e.preventDefault()
    setLoi(null)
    setDangGui(true)
    try {
      await dangNhap(email, matKhau)
    } catch (err) {
      const ma = (err as { code?: string }).code ?? ''
      setLoi(
        ma === 'auth/invalid-credential' || ma === 'auth/wrong-password' || ma === 'auth/user-not-found'
          ? 'Sai email hoặc mật khẩu.'
          : ma === 'auth/network-request-failed'
            ? 'Không có mạng. Lần đăng nhập đầu tiên cần có mạng.'
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
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
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
        <button type="submit" disabled={dangGui}>
          {dangGui ? 'Đang đăng nhập…' : 'Đăng nhập'}
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

export default function App() {
  const phien = usePhienDangNhap()

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

  return (
    <div className="app">
      <header className="thanh-tren">
        <strong>Đại Phúc Khang</strong>
        <span>
          {phien.hoSo.HoTen} · {TEN_VAI_TRO[phien.hoSo.VaiTro] ?? phien.hoSo.VaiTro}
        </span>
        <button className="nut-phu" onClick={() => dangXuat()}>
          Đăng xuất
        </button>
      </header>
      <main className="noi-dung">
        <p>Khung app đã chạy. Các màn Điều phối, Xuất kho, Giao hàng sẽ được thêm vào đây.</p>
      </main>
    </div>
  )
}
