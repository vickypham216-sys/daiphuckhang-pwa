// Vẽ mã VietQR ngay trên máy (không cần mạng). Xem src/lib/vietQR.ts.
import qrcode from 'qrcode-generator'
import { chuoiVietQR, taiKhoanHopLe, type TaiKhoanNhan } from '../lib/vietQR'
import { dinhDangSo } from '../lib/so'

export default function MaQR({ tk, soTien, noiDung }: { tk: TaiKhoanNhan | null | undefined; soTien: number; noiDung: string }) {
  if (!taiKhoanHopLe(tk))
    return <p className="canh-bao">Chưa cài tài khoản nhận chuyển khoản. Admin cài ở tab Kế toán → Tài khoản nhận CK.</p>
  const qr = qrcode(0, 'M')
  qr.addData(chuoiVietQR(tk!, soTien, noiDung))
  qr.make()
  return (
    <div className="ma-qr">
      <div dangerouslySetInnerHTML={{ __html: qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true }) }} />
      <p>
        <strong>{dinhDangSo(soTien)}đ</strong> · {tk!.TenNganHang}
        <br />
        {tk!.SoTaiKhoan} · {tk!.TenChuTaiKhoan}
        <br />
        <small>Nội dung: {noiDung}</small>
      </p>
    </div>
  )
}
