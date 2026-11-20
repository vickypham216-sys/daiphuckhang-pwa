// Đăng nhập email + mật khẩu. firestore.rules dựa vào request.auth.uid để
// biết ai đang thao tác, nên không có đăng nhập thì không có phân quyền.
import { useEffect, useState } from 'react'
import {
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  connectAuthEmulator,
} from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { app, db, dungEmulator } from './firebase'
import type { NguoiDung } from '../types'

export const auth = getAuth(app)

// Phải nối emulator TRƯỚC mọi thao tác auth khác.
if (dungEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}

// Giữ đăng nhập trong máy, kể cả khi mất mạng.
setPersistence(auth, browserLocalPersistence).catch((e) =>
  console.error('Không đặt được chế độ ghi nhớ đăng nhập', e),
)

/** `email` đã đổi qua emailDangNhap() — SĐT thành email nội bộ. */
export const dangNhap = (email: string, matKhau: string) =>
  signInWithEmailAndPassword(auth, email, matKhau).then(() => undefined)

export const dangXuat = () => signOut(auth)

// Email đặt lại mật khẩu gửi bằng tiếng Việt.
auth.languageCode = 'vi'
export const guiEmailDatLaiMatKhau = (email: string) => sendPasswordResetEmail(auth, email)

export interface PhienDangNhap {
  dangTai: boolean
  uid: string | null
  email: string | null
  hoSo: NguoiDung | null
  /** Đã đăng nhập nhưng chưa có document NguoiDung/{uid}. */
  thieuHoSo: boolean
  /** Không ĐỌC được hồ sơ (vd rules từ chối) — khác với thiếu hồ sơ. */
  loiHoSo: string | null
}

export function usePhienDangNhap(): PhienDangNhap {
  const [uid, setUid] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [dangTaiAuth, setDangTaiAuth] = useState(true)
  const [hoSo, setHoSo] = useState<NguoiDung | null>(null)
  const [thieuHoSo, setThieuHoSo] = useState(false)
  const [loiHoSo, setLoiHoSo] = useState<string | null>(null)
  // uid mà việc tải hồ sơ đã xong. Thiếu nó thì có một nhịp render uid đã có
  // mà hồ sơ còn null — MIA đã vỡ màn hình đúng chỗ này.
  const [uidDaXong, setUidDaXong] = useState<string | null>(null)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUid(u?.uid ?? null)
        setEmail(u?.email ?? null)
        setDangTaiAuth(false)
      }),
    [],
  )

  useEffect(() => {
    if (!uid) {
      setHoSo(null)
      setThieuHoSo(false)
      setLoiHoSo(null)
      setUidDaXong(null)
      return
    }
    setUidDaXong(null)
    return onSnapshot(
      doc(db, 'NguoiDung', uid),
      (snap) => {
        setHoSo(snap.exists() ? (snap.data() as NguoiDung) : null)
        setThieuHoSo(!snap.exists())
        setLoiHoSo(null)
        setUidDaXong(uid)
      },
      (err) => {
        console.error('Không tải được hồ sơ người dùng', err)
        setHoSo(null)
        setThieuHoSo(false)
        setLoiHoSo(err.code === 'permission-denied' ? 'Tài khoản không có quyền truy cập.' : err.message)
        setUidDaXong(uid)
      },
    )
  }, [uid])

  return {
    dangTai: dangTaiAuth || (!!uid && uidDaXong !== uid),
    uid,
    email,
    hoSo,
    thieuHoSo,
    loiHoSo,
  }
}
