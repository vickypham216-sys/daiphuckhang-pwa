// Form thu nợ khách — dùng ở 2 nơi:
//  - Tài xế trên chuyến: ghi PhieuThu bằng writeBatch (được khi MẤT SÓNG), máy
//    chủ áp vào công nợ lúc chốt chuyến; tiền mặt cộng vào số phải nộp.
//  - Kế toán / Admin ở văn phòng: gọi máy chủ (thuNoVanPhong), áp ngay.
import { useState } from 'react'
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { goi, loiMayChu } from '../lib/goiMayChu'
import { useNgheMot, type CoId } from '../lib/nghe'
import { dinhDangSo, docSo } from '../lib/so'
import { noiDungChuyenKhoan, type TaiKhoanNhan } from '../lib/vietQR'
import type { Chuyen } from '../lib/dieuPhoi'
import MaQR from '../components/MaQR'
import { boDau, type BanGhi } from './DanhMuc'
import { kiemTraPhieuThu, tienHoanCoc, type CongNo } from '../../functions/src/thuNoLogic'

const so = (s: string | undefined) => {
  const n = docSo(s ?? '')
  return n === null || Number.isNaN(n) ? 0 : n
}

interface Props {
  /** Có = tài xế thu trên chuyến; không = văn phòng. */
  c?: CoId<Chuyen>
  uid: string
  tenToi: string
  khach: CoId<BanGhi>[]
  sanPham: CoId<BanGhi>[]
  /** Chọn sẵn khách (bấm từ dòng công nợ / dòng giao). */
  khachId?: string
  tk?: TaiKhoanNhan | null
  xong: (tin: string) => void
  huy: () => void
}

export default function FormThuNo({ c, uid, tenToi, khach, sanPham, khachId, tk, xong, huy }: Props) {
  const [khId, setKhId] = useState<string | null>(khachId ?? null)
  const [tim, setTim] = useState('')
  const no = useNgheMot<CongNo & { TenKhach: string }>(() => (khId ? doc(db, 'CongNoKhach', khId) : null), [khId])
  const kh = khach.find((k) => k.id === khId)
  const spVo = sanPham.filter((s) => s.CoVo === true)
  const giaCoc = Object.fromEntries(sanPham.map((s) => [s.id, Number(s.GiaCocVo ?? 0)]))

  const [tm, setTm] = useState('')
  const [ck, setCk] = useState('')
  const [traVo, setTraVo] = useState<Record<string, string>>({})
  const [hoanVo, setHoanVo] = useState<Record<string, string>>({})
  const [ghiChu, setGhiChu] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  const theoSp = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, so(v)]).filter(([, v]) => (v as number) > 0))
  const TraVo = theoSp(traVo), HoanCocVo = theoSp(hoanVo)
  const TienHoanCoc = tienHoanCoc(HoanCocVo, giaCoc, no?.TienCoc ?? 0)
  const p = { TienMat: so(tm), ChuyenKhoan: so(ck), TraVo, HoanCocVo, TienHoanCoc }
  const noiDung = noiDungChuyenKhoan(String(kh?.Ten ?? ''), 'NO')

  async function luu() {
    setLoi(null)
    if (!khId || !kh) return setLoi('Chưa chọn khách.')
    if (no === undefined) return setLoi('Đang tải công nợ…')
    const l = kiemTraPhieuThu(p, no, giaCoc)
    if (l) return setLoi(l)
    const tom = [p.TienMat + p.ChuyenKhoan > 0 && `${dinhDangSo(p.TienMat + p.ChuyenKhoan)}đ`,
      ...Object.values(TraVo).map((n) => `${n} vỏ`), TienHoanCoc > 0 && `hoàn cọc ${dinhDangSo(TienHoanCoc)}đ`].filter(Boolean).join(', ')
    if (c) {
      const b = writeBatch(db)
      b.set(doc(collection(db, 'PhieuThu')), {
        ...p, KhachHangId: khId, TenKhach: String(kh.Ten), Nguon: 'TaiXe',
        ChuyenId: c.id, Ngay: c.Ngay, BienSo: c.BienSo, SoChuyen: c.SoChuyen,
        CK: p.ChuyenKhoan > 0 ? { TrangThai: 'ChoXacNhan', NoiDung: noiDung } : null,
        DaGhiSo: false, GhiChu: ghiChu.trim() || null,
        TaoBoi: uid, TenNguoiTao: tenToi, TaoLuc: serverTimestamp(), GioMay: Date.now(),
      })
      b.commit().catch((e) => alert(`Phiếu thu nợ ${String(kh.Ten)} KHÔNG lưu được: ${(e as Error).message}. Báo kế toán.`))
      return xong(`Đã ghi thu nợ ${String(kh.Ten)}: ${tom}.`)
    }
    setBan(true)
    try {
      await goi('thuNoVanPhong', { ...p, KhachHangId: khId, GhiChu: ghiChu })
      xong(`Đã thu nợ ${String(kh.Ten)}: ${tom}.`)
    } catch (e) {
      setLoi(loiMayChu(e))
      setBan(false)
    }
  }

  const goiY = tim.trim() ? khach.filter((k) => boDau(`${String(k.Ten)} ${String(k.SoDienThoai ?? '')}`).includes(boDau(tim.trim()))).slice(0, 6) : []
  return (
    <div className="form-giao">
      <h3>Thu nợ{kh ? `: ${String(kh.Ten)}` : ''}</h3>
      {!khId && (
        <div className="chon-khach">
          <label>Khách<input type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm tên / số điện thoại" /></label>
          {goiY.length > 0 && (
            <ul className="ds-goi-y">
              {goiY.map((k) => <li key={k.id}><button type="button" onClick={() => setKhId(k.id)}><strong>{String(k.Ten)}</strong><small>{String(k.DiaChi ?? '')}</small></button></li>)}
            </ul>
          )}
        </div>
      )}
      {khId && no === undefined && <p>Đang tải công nợ…</p>}
      {khId && no !== undefined && (
        <>
          <p className={no && no.NoTien > 0 ? 'canh-bao' : 'ghi-chu'}>
            Đang nợ: <strong>{dinhDangSo(Math.max(0, no?.NoTien ?? 0))}đ</strong>
            {spVo.map((s) => (no?.NoVo?.[s.id] ?? 0) > 0 && ` · ${no!.NoVo[s.id]} vỏ ${String(s.Ten)}`)}
            {(no?.TienCoc ?? 0) > 0 && ` · đang cọc ${dinhDangSo(no!.TienCoc)}đ`}
            {c && <><br /><small>(số trên máy chủ, chưa tính giao/thu trong chuyến đang chạy)</small></>}
          </p>
          <div className="bang-chia">
            <label>Tiền mặt<input inputMode="numeric" value={tm ? dinhDangSo(so(tm)) : ''} onChange={(e) => setTm(e.target.value.replace(/\D/g, ''))} /></label>
            <label>Chuyển khoản<input inputMode="numeric" value={ck ? dinhDangSo(so(ck)) : ''} onChange={(e) => setCk(e.target.value.replace(/\D/g, ''))} /></label>
          </div>
          {p.ChuyenKhoan > 0 && c && <MaQR tk={tk} soTien={p.ChuyenKhoan} noiDung={noiDung} />}
          {spVo.map((s) => {
            const nVo = no?.NoVo?.[s.id] ?? 0, nCoc = no?.CocVo?.[s.id] ?? 0
            if (nVo <= 0 && nCoc <= 0) return null
            return (
              <div key={s.id} className="bang-chia">
                {nVo > 0 && <label>Thu vỏ nợ {String(s.Ten)}<input inputMode="numeric" placeholder={`tối đa ${nVo}`} value={traVo[s.id] ?? ''} onChange={(e) => setTraVo({ ...traVo, [s.id]: e.target.value.replace(/\D/g, '') })} /></label>}
                {nCoc > 0 && <label>Trả vỏ cọc, hoàn tiền<input inputMode="numeric" placeholder={`tối đa ${nCoc}`} value={hoanVo[s.id] ?? ''} onChange={(e) => setHoanVo({ ...hoanVo, [s.id]: e.target.value.replace(/\D/g, '') })} /></label>}
              </div>
            )
          })}
          {TienHoanCoc > 0 && <p className="canh-bao">Trả lại khách {dinhDangSo(TienHoanCoc)}đ tiền cọc{c ? ' (trừ vào tiền mặt phải nộp)' : ''}.</p>}
          <label>Ghi chú<input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></label>
        </>
      )}
      {loi && <p className="loi" role="alert">{loi}</p>}
      <div className="hang-nut">
        <button onClick={luu} disabled={ban || !khId}>{ban ? 'Đang lưu…' : 'Lưu phiếu thu'}</button>
        <button className="nut-vien" onClick={huy} disabled={ban}>Huỷ</button>
      </div>
    </div>
  )
}
