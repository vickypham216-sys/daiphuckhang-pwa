// Nhập công nợ đầu kỳ (Admin) — dán bảng từ Excel. Xem functions/src/dauKyLogic.ts.
import { useMemo, useState } from 'react'
import { collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { goi, loiMayChu } from '../lib/goiMayChu'
import { useNghe } from '../lib/nghe'
import { dinhDangSo } from '../lib/so'
import { docBang, tieuDe, timKhach } from '../../functions/src/dauKyLogic'

export default function NhapDauKy({ dong: dongForm }: { dong: () => void }) {
  const { ds: sp } = useNghe<{ Ten: string; CoVo?: boolean; TrangThai?: string }>(() => collection(db, 'SanPham'), [])
  const { ds: kh } = useNghe<{ Ten: string; SoDienThoai?: string | null }>(() => collection(db, 'KhachHang'), [])
  const spVo = (sp ?? []).filter((s) => s.CoVo === true && s.TrangThai !== 'Inactive').map((s) => ({ id: s.id, Ten: s.Ten }))
  const [text, setText] = useState('')
  const [tin, setTin] = useState<string | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  const bang = useMemo(() => docBang(text, spVo), [text, sp]) // eslint-disable-line react-hooks/exhaustive-deps
  const khach = (kh ?? []).map((k) => ({ id: k.id, Ten: k.Ten, SoDienThoai: k.SoDienThoai ?? null }))
  const xem = bang.dong.map((d) => ({ d, tim: timKhach(d, khach) }))
  const soNhieu = xem.filter((x) => x.tim && 'nhieu' in x.tim).length
  const tieuDeTab = tieuDe(spVo).join('\t')

  async function luu() {
    setLoi(null)
    setTin(null)
    if (bang.dong.length === 0) return setLoi('Chưa có dòng nào hợp lệ.')
    if (!confirm(`Ghi công nợ đầu kỳ cho ${bang.dong.length} khách (tạo mới ${xem.filter((x) => !x.tim).length})?`)) return
    setBan(true)
    try {
      const kq = await goi<{ capNhat: number; taoMoi: number; loi: { dong: number; loi: string }[] }>('nhapCongNoDauKy', { Dong: bang.dong })
      setTin(`Đã ghi ${kq.capNhat} khách (tạo mới ${kq.taoMoi}).${kq.loi.length ? ` Bỏ qua ${kq.loi.length} dòng: ` + kq.loi.map((x) => `#${x.dong} ${x.loi}`).join('; ') : ''}`)
      setText('')
    } catch (e) {
      setLoi(loiMayChu(e))
    } finally {
      setBan(false)
    }
  }

  return (
    <section className="the the-rong">
      <h2>Nhập công nợ đầu kỳ</h2>
      <ol className="ghi-chu huong-dan">
        <li>Trong Excel, xếp cột ĐÚNG thứ tự này (bấm để chép dòng tiêu đề, dán vào ô A1):</li>
      </ol>
      <button className="nut-vien" onClick={() => navigator.clipboard?.writeText(tieuDeTab).then(() => setTin('Đã chép dòng tiêu đề.'))}>
        📋 {tieuDe(spVo).join(' | ')}
      </button>
      <ol className="ghi-chu huong-dan" start={2}>
        <li>Chọn cả bảng (kể cả tiêu đề) → Ctrl+C → dán vào ô dưới.</li>
        <li>Khách đã có (trùng SĐT, hoặc trùng tên) thì cập nhật; chưa có thì tạo mới. Nhập lại lần nữa sẽ THAY số đầu kỳ cũ, không cộng dồn.</li>
      </ol>
      {/* Chờ tải xong danh mục: cột vỏ phụ thuộc danh sách sản phẩm có vỏ —
          dán khi chưa tải thì cột bị lệch. */}
      <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} disabled={!sp || !kh}
        placeholder={!sp || !kh ? 'Đang tải danh mục…' : 'Dán bảng từ Excel vào đây'} />
      {bang.loi.map((x) => <p key={x.so} className="loi">Dòng {x.so}: {x.loi}</p>)}
      {xem.length > 0 && (
        <table className="bang-ton">
          <thead><tr><th>Khách</th><th>Nợ tiền</th><th>Vỏ nợ / cọc</th><th></th></tr></thead>
          <tbody>
            {xem.map(({ d, tim }, i) => (
              <tr key={i}>
                <td>{d.Ten}<small className="ghi-chu"><br />{d.SoDienThoai ?? ''}</small></td>
                <td>{dinhDangSo(d.NoTien)}</td>
                <td>{spVo.map((s) => [d.NoVo[s.id] && `nợ ${d.NoVo[s.id]}`, d.CocVo[s.id] && `cọc ${d.CocVo[s.id]}`].filter(Boolean).join(', ')).filter(Boolean).join(' · ') || '—'}{d.TienCoc ? ` (${dinhDangSo(d.TienCoc)}đ)` : ''}</td>
                <td className={tim && 'nhieu' in tim ? 'chu-loi' : ''}>{!tim ? 'Tạo mới' : 'nhieu' in tim ? 'Trùng tên' : 'Có rồi'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {soNhieu > 0 && <p className="canh-bao">{soNhieu} dòng trùng tên nhiều khách — thêm SĐT, nếu không sẽ bị bỏ qua.</p>}
      {loi && <p className="loi" role="alert">{loi}</p>}
      {tin && <p className="tin-tot" role="status">{tin}</p>}
      <div className="hang-nut">
        <button onClick={luu} disabled={ban || bang.dong.length === 0}>{ban ? 'Đang ghi…' : `Ghi ${bang.dong.length} khách`}</button>
        <button className="nut-vien" onClick={dongForm}>Đóng</button>
      </div>
    </section>
  )
}
