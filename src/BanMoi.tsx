// Báo có bản app mới và cho bấm cập nhật.
//
// vite.config.ts để registerType 'prompt' (không tự tải lại giữa lúc đang
// lập phiếu). Nhưng 'prompt' mà KHÔNG có đoạn này thì bản mới nằm chờ mãi:
// app cài dạng PWA hầu như không bao giờ bị đóng hẳn, nên người dùng kẹt ở
// bản cũ. MIA đã dính đúng lỗi này; DPK dính lại ngày 20/11/2026 (Vicky merge
// màn Nhân viên mà mở app vẫn thấy bản cũ).
import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

const KIEM_TRA_MOI_MS = 30 * 60 * 1000

export default function BanMoi() {
  const [capNhat, setCapNhat] = useState<(() => void) | null>(null)

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setCapNhat(() => () => updateSW(true))
      },
      // App để mở cả ngày thì vẫn phải biết có bản mới: hỏi lại máy chủ định kỳ.
      onRegisteredSW(_url, reg) {
        if (reg) setInterval(() => reg.update().catch(() => {}), KIEM_TRA_MOI_MS)
      },
    })
  }, [])

  if (!capNhat) return null
  return (
    <div className="ban-moi" role="status">
      <span>Có bản app mới.</span>
      <button onClick={capNhat}>Cập nhật</button>
    </div>
  )
}
