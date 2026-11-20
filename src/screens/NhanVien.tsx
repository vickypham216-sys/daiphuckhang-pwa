// Màn Nhân viên — chỉ Admin. Tạo tài khoản, sửa tên/vai trò/SĐT, đặt lại mật
// khẩu, ngưng / mở lại.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { datLaiMatKhau, doiTrangThai, loiMayChu, suaNhanVien, taoNhanVien } from '../lib/nhanVien'
import {
  DUOI_EMAIL_NOI_BO,
  MAT_KHAU_TOI_THIEU,
  emailDangNhap,
} from '../../functions/src/nhanVienLogic'
import { TEN_VAI_TRO, type NguoiDung, type VaiTro } from '../types'

type Dong = NguoiDung & { uid: string }

const DS_VAI_TRO = Object.keys(TEN_VAI_TRO) as VaiTro[]

/** Hiện tên đăng nhập như người dùng gõ: SĐT thì bỏ đuôi email nội bộ. */
export function tenDangNhap(email?: string): string {
  if (!email) return '—'
  return email.endsWith(DUOI_EMAIL_NOI_BO) ? email.slice(0, -DUOI_EMAIL_NOI_BO.length) : email
}

function OVaiTro({ value, onChange, khoa }: { value: VaiTro; onChange: (v: VaiTro) => void; khoa?: boolean }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as VaiTro)} disabled={khoa}>
      {DS_VAI_TRO.map((v) => (
        <option key={v} value={v}>
          {TEN_VAI_TRO[v]}
        </option>
      ))}
    </select>
  )
}

function FormThem({ xong }: { xong: (ten: string) => void }) {
  const [HoTen, setHoTen] = useState('')
  const [VaiTro, setVaiTro] = useState<VaiTro>('TaiXe')
  const [dangNhap, setDangNhap] = useState('')
  const [matKhau, setMatKhau] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [dangGui, setDangGui] = useState(false)

  async function gui(e: FormEvent) {
    e.preventDefault()
    setLoi(null)
    if (!emailDangNhap(dangNhap)) return setLoi('Nhập số điện thoại 10 số, hoặc email.')
    if (matKhau.length < MAT_KHAU_TOI_THIEU) return setLoi(`Mật khẩu từ ${MAT_KHAU_TOI_THIEU} ký tự.`)
    setDangGui(true)
    try {
      await taoNhanVien({ HoTen, VaiTro, dangNhap, matKhau })
      xong(HoTen.trim())
      setHoTen('')
      setDangNhap('')
      setMatKhau('')
    } catch (err) {
      setLoi(loiMayChu(err))
    } finally {
      setDangGui(false)
    }
  }

  return (
    <form className="the the-rong" onSubmit={gui}>
      <h2>Thêm nhân viên</h2>
      <label>
        Họ tên
        <input value={HoTen} onChange={(e) => setHoTen(e.target.value)} required maxLength={80} />
      </label>
      <label>
        Vai trò
        <OVaiTro value={VaiTro} onChange={setVaiTro} />
      </label>
      <label>
        Số điện thoại hoặc email đăng nhập
        <input
          value={dangNhap}
          onChange={(e) => setDangNhap(e.target.value)}
          inputMode="email"
          autoComplete="off"
          placeholder="0901234567"
          required
        />
      </label>
      <label>
        Mật khẩu ban đầu
        <input
          value={matKhau}
          onChange={(e) => setMatKhau(e.target.value)}
          autoComplete="new-password"
          placeholder={`Ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`}
          required
        />
      </label>
      <p className="ghi-chu">Nhớ báo số điện thoại (hoặc email) và mật khẩu này cho nhân viên.</p>
      {loi && <p className="loi" role="alert">{loi}</p>}
      <button type="submit" disabled={dangGui}>
        {dangGui ? 'Đang tạo…' : 'Tạo tài khoản'}
      </button>
    </form>
  )
}

function DongNhanVien({ nv, laToi, emailToi, baoTin }: { nv: Dong; laToi: boolean; emailToi: string | null; baoTin: (s: string) => void }) {
  const [mo, setMo] = useState(false)
  const [HoTen, setHoTen] = useState(nv.HoTen)
  const [VaiTro, setVaiTro] = useState<VaiTro>(nv.VaiTro)
  const [sdt, setSdt] = useState(nv.SoDienThoai ?? '')
  const [matKhau, setMatKhau] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)
  const ngung = nv.TrangThai === 'Inactive'

  async function lam(viec: () => Promise<unknown>, tin: string) {
    setLoi(null)
    setBan(true)
    try {
      await viec()
      baoTin(tin)
      return true
    } catch (err) {
      setLoi(loiMayChu(err))
      return false
    } finally {
      setBan(false)
    }
  }

  return (
    <li className={'dong-nv' + (ngung ? ' da-ngung' : '')}>
      <button className="dong-nv-dau" onClick={() => setMo(!mo)} aria-expanded={mo}>
        <span>
          <strong>{nv.HoTen}</strong>
          {laToi && ' (bạn)'}
          <small>
            {TEN_VAI_TRO[nv.VaiTro] ?? nv.VaiTro} · {tenDangNhap(nv.DangNhap ?? (laToi ? (emailToi ?? undefined) : undefined))}
          </small>
        </span>
        {ngung && <span className="nhan-ngung">Đã ngưng</span>}
      </button>
      {mo && (
        <div className="dong-nv-than">
          <label>
            Họ tên
            <input value={HoTen} onChange={(e) => setHoTen(e.target.value)} maxLength={80} />
          </label>
          <label>
            Vai trò{laToi && ' (không tự đổi vai trò của mình được)'}
            <OVaiTro value={VaiTro} onChange={setVaiTro} khoa={laToi} />
          </label>
          <label>
            Số điện thoại liên hệ
            <input value={sdt} onChange={(e) => setSdt(e.target.value)} inputMode="tel" />
          </label>
          <button
            disabled={ban || !HoTen.trim()}
            onClick={() =>
              lam(() => suaNhanVien(nv.uid, { HoTen: HoTen.trim(), VaiTro, SoDienThoai: sdt.trim() }), `Đã lưu ${HoTen.trim()}.`)
            }
          >
            Lưu thay đổi
          </button>

          <hr />
          <label>
            Đặt mật khẩu mới
            <input
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
              autoComplete="new-password"
              placeholder={`Ít nhất ${MAT_KHAU_TOI_THIEU} ký tự`}
            />
          </label>
          <button
            className="nut-vien"
            disabled={ban || matKhau.length < MAT_KHAU_TOI_THIEU}
            onClick={async () => {
              if (await lam(() => datLaiMatKhau(nv.uid, matKhau), `Đã đặt mật khẩu mới cho ${nv.HoTen}.`)) setMatKhau('')
            }}
          >
            Đặt mật khẩu
          </button>

          {!laToi && (
            <>
              <hr />
              <button
                className={ngung ? 'nut-vien' : 'nut-nguy'}
                disabled={ban}
                onClick={() => {
                  if (!ngung && !confirm(`Ngưng tài khoản ${nv.HoTen}? Người này sẽ bị đăng xuất và không vào được app.`)) return
                  lam(() => doiTrangThai(nv.uid, !ngung), ngung ? `Đã mở lại ${nv.HoTen}.` : `Đã ngưng ${nv.HoTen}.`)
                }}
              >
                {ngung ? 'Mở lại tài khoản' : 'Ngưng tài khoản'}
              </button>
            </>
          )}
          {loi && <p className="loi" role="alert">{loi}</p>}
        </div>
      )}
    </li>
  )
}

export default function NhanVien({ uidToi, emailToi }: { uidToi: string; emailToi: string | null }) {
  const [ds, setDs] = useState<Dong[] | null>(null)
  const [loiTai, setLoiTai] = useState<string | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const [hienNgung, setHienNgung] = useState(false)

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'NguoiDung'),
        (snap) => setDs(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as NguoiDung) }))),
        (err) => setLoiTai(err.message),
      ),
    [],
  )

  const hien = useMemo(() => {
    const thuTu = (v: VaiTro) => DS_VAI_TRO.indexOf(v)
    return (ds ?? [])
      .filter((n) => hienNgung || n.TrangThai !== 'Inactive')
      .sort((a, b) => thuTu(a.VaiTro) - thuTu(b.VaiTro) || a.HoTen.localeCompare(b.HoTen, 'vi'))
  }, [ds, hienNgung])
  const soNgung = (ds ?? []).filter((n) => n.TrangThai === 'Inactive').length

  return (
    <div className="man">
      {tin && (
        <p className="tin-tot" role="status">
          {tin}
        </p>
      )}
      <FormThem xong={(ten) => setTin(`Đã tạo tài khoản cho ${ten}.`)} />

      <section className="the the-rong">
        <h2>Nhân viên ({hien.length})</h2>
        {loiTai && <p className="loi">{loiTai}</p>}
        {!ds && !loiTai && <p>Đang tải…</p>}
        <ul className="ds-nv">
          {hien.map((nv) => (
            <DongNhanVien key={nv.uid} nv={nv} laToi={nv.uid === uidToi} emailToi={emailToi} baoTin={setTin} />
          ))}
        </ul>
        {soNgung > 0 && (
          <label className="o-tick">
            <input type="checkbox" checked={hienNgung} onChange={(e) => setHienNgung(e.target.checked)} />
            Hiện cả {soNgung} tài khoản đã ngưng
          </label>
        )}
      </section>
    </div>
  )
}
