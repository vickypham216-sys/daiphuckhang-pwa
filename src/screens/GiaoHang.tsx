// Form giao hàng cho MỘT khách — tài xế / phụ xe dùng trên đường.
//
// CHẠY ĐƯỢC KHI MẤT SÓNG: ghi bằng writeBatch (không phải transaction, không
// gọi máy chủ). Firestore lưu tạm trên máy, có mạng thì tự gửi.
// Quy tắc nghiệp vụ: functions/src/giaoLogic.ts (dùng chung với máy chủ).
import { useMemo, useState } from 'react'
import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { dinhDangSo, docSo } from '../lib/so'
import type { DonHang } from '../lib/donHang'
import type { Chuyen } from '../lib/dieuPhoi'
import { noiDungChuyenKhoan, type TaiKhoanNhan } from '../lib/vietQR'
import type { CoId } from '../lib/nghe'
import MaQR from '../components/MaQR'
import { boDau, type BanGhi } from './DanhMuc'
import {
  coGiamGia,
  coGiaoThieu,
  kiemTraPhieuGiao,
  phaiThu,
  tienCoc,
  voThieu,
  type DongGiao,
  type VoGiao,
} from '../../functions/src/giaoLogic'

const so = (s: string | undefined) => {
  const n = docSo(s ?? '')
  return n === null || Number.isNaN(n) ? 0 : n
}

interface Props {
  c: CoId<Chuyen>
  uid: string
  tenToi: string
  /** Có = giao theo đơn; không = đơn tại chỗ. */
  don?: CoId<DonHang>
  sanPham: CoId<BanGhi>[]
  khach: CoId<BanGhi>[]
  /** Hàng còn trên xe chưa giao, theo sản phẩm — chặn đơn tại chỗ vượt quá. */
  conTrenXe: Record<string, number>
  tk: TaiKhoanNhan | null | undefined
  xong: (tin: string) => void
  huy: () => void
}

export default function FormGiao({ c, uid, tenToi, don, sanPham, khach, conTrenXe, tk, xong, huy }: Props) {
  const taiCho = !don
  const spTheoId = useMemo(() => new Map(sanPham.map((s) => [s.id, s])), [sanPham])

  // ── Khách (đơn tại chỗ) ────────────────────────────────────────────
  const [kh, setKh] = useState<{ id: string | null; Ten: string; DiaChi: string } | null>(null)
  const [tim, setTim] = useState('')
  const goiY = tim.trim()
    ? khach.filter((k) => boDau(`${String(k.Ten)} ${String(k.SoDienThoai ?? '')} ${String(k.DiaChi ?? '')}`).includes(boDau(tim.trim()))).slice(0, 6)
    : []

  // ── Dòng hàng ──────────────────────────────────────────────────────
  const dongGoc: DongGiao[] = don
    ? don.Dong.map((d) => ({ SanPhamId: d.SanPhamId, Ten: d.Ten, DonVi: d.DonVi, CoVo: d.CoVo, SoLuongDon: d.SoLuong, SoLuong: d.SoLuong, GiaDon: d.DonGia, DonGia: d.DonGia }))
    : Object.entries(conTrenXe)
        .filter(([, n]) => n > 0)
        .map(([id]) => {
          const s = spTheoId.get(id)
          const gia = Number(s?.GiaBan ?? 0)
          return { SanPhamId: id, Ten: String(s?.Ten ?? '?'), DonVi: String(s?.DonVi ?? ''), CoVo: s?.CoVo === true, SoLuongDon: 0, SoLuong: 0, GiaDon: gia, DonGia: gia }
        })
  const [sl, setSl] = useState<Record<string, string>>(() => Object.fromEntries(dongGoc.map((d) => [d.SanPhamId, taiCho ? '' : String(d.SoLuong)])))
  const [gia, setGia] = useState<Record<string, string>>({})
  const [khongGiao, setKhongGiao] = useState(false)
  const [lyDoThieu, setLyDoThieu] = useState('')
  const [lyDoGiam, setLyDoGiam] = useState('')

  const dong: DongGiao[] = dongGoc
    .map((d) => ({ ...d, SoLuong: khongGiao ? 0 : so(sl[d.SanPhamId]), DonGia: gia[d.SanPhamId] !== undefined ? so(gia[d.SanPhamId]) : d.GiaDon }))
    .filter((d) => !taiCho || d.SoLuong > 0)

  // ── Vỏ ─────────────────────────────────────────────────────────────
  const [voThu, setVoThu] = useState<Record<string, string>>({})
  /** Cách xử lý vỏ thiếu theo sản phẩm. */
  const [cachVo, setCachVo] = useState<Record<string, 'no' | 'coc'>>({})
  const vo: VoGiao[] = dong
    .filter((d) => d.CoVo)
    .map((d) => {
      const thu = voThu[d.SanPhamId] !== undefined ? so(voThu[d.SanPhamId]) : d.SoLuong
      const thieu = voThieu(d.SoLuong, thu)
      const giaCoc = Number(spTheoId.get(d.SanPhamId)?.GiaCocVo ?? 0)
      const coc = cachVo[d.SanPhamId] === 'coc' && giaCoc > 0
      return { SanPhamId: d.SanPhamId, Ten: d.Ten, VoThu: thu, NoVo: coc ? 0 : thieu, CocVo: coc ? thieu : 0, GiaCocVo: giaCoc }
    })

  // ── Tiền ───────────────────────────────────────────────────────────
  const can = phaiThu(dong, vo)
  const [cachTra, setCachTra] = useState<'tm' | 'ck' | 'no' | 'chia'>('tm')
  const [chia, setChia] = useState<{ tm: string; ck: string; no: string }>({ tm: '', ck: '', no: '' })
  const TT =
    cachTra === 'tm' ? { TienMat: can, ChuyenKhoan: 0, GhiNo: 0 }
    : cachTra === 'ck' ? { TienMat: 0, ChuyenKhoan: can, GhiNo: 0 }
    : cachTra === 'no' ? { TienMat: 0, ChuyenKhoan: 0, GhiNo: can }
    : { TienMat: so(chia.tm), ChuyenKhoan: so(chia.ck), GhiNo: so(chia.no) }
  const tenKhach = don?.TenKhach ?? kh?.Ten ?? ''
  const noiDungCK = noiDungChuyenKhoan(tenKhach, (don?.id ?? 'TC').slice(0, 6))

  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  async function luu() {
    setLoi(null)
    if (taiCho && !kh) return setLoi('Chưa chọn khách (hoặc nhập tên khách lẻ).')
    if (taiCho)
      for (const d of dong)
        if (d.SoLuong > (conTrenXe[d.SanPhamId] ?? 0)) return setLoi(`${d.Ten}: trên xe chỉ còn ${conTrenXe[d.SanPhamId] ?? 0}.`)
    const l = kiemTraPhieuGiao({
      Dong: dong, Vo: vo, TT, KhongGiao: khongGiao, taiCho,
      LyDoGiaoThieu: lyDoThieu.trim() || null, LyDoGiamGia: lyDoGiam.trim() || null,
    })
    if (l) return setLoi(l)
    if (TT.GhiNo > 0 && taiCho && !kh?.id) return setLoi('Khách lẻ không ghi nợ được — chọn khách có trong danh sách.')

    setBan(true)
    const b = writeBatch(db)
    const ref = don ? doc(db, 'PhieuGiao', don.id) : doc(collection(db, 'PhieuGiao'))
    b.set(ref, {
      ChuyenId: c.id, Ngay: c.Ngay, XeId: c.XeId, BienSo: c.BienSo, SoChuyen: c.SoChuyen,
      DonId: don?.id ?? null, TaiCho: taiCho,
      KhachHangId: don?.KhachHangId ?? kh?.id ?? null, TenKhach: tenKhach, DiaChi: don?.DiaChi ?? kh?.DiaChi ?? '',
      Dong: dong, Vo: vo.filter((v) => dong.find((d) => d.SanPhamId === v.SanPhamId)!.SoLuong > 0 || v.VoThu > 0),
      TT, TienHang: can - tienCoc(vo), TienCoc: tienCoc(vo), PhaiThu: can,
      KhongGiao: khongGiao,
      CoGiamGia: coGiamGia(dong), LyDoGiamGia: coGiamGia(dong) ? lyDoGiam.trim() : null,
      CoGiaoThieu: !taiCho && coGiaoThieu(dong), LyDoGiaoThieu: !taiCho && (coGiaoThieu(dong) || khongGiao) ? lyDoThieu.trim() : null,
      CK: TT.ChuyenKhoan > 0 ? { TrangThai: 'ChoXacNhan', NoiDung: noiDungCK } : null,
      TaoBoi: uid, TenNguoiTao: tenToi, TaoLuc: serverTimestamp(), GioMay: Date.now(),
    })
    if (don)
      b.update(doc(db, 'DonHang', don.id), {
        TrangThai: khongGiao ? 'KhongGiao' : 'DaGiao', PhieuGiaoId: don.id, SuaLuc: serverTimestamp(), SuaBoi: uid,
      })
    // KHÔNG await: mất sóng thì commit treo tới khi có mạng, nhưng dữ liệu đã
    // nằm trong cache — màn hình cập nhật ngay. Lỗi (luật từ chối) báo sau.
    b.commit().catch((e) => alert(`Phiếu giao ${tenKhach} KHÔNG lưu được lên máy chủ: ${(e as Error).message}. Báo điều phối.`))
    xong(khongGiao ? `Đã ghi: không giao được cho ${tenKhach}.` : `Đã ghi giao ${tenKhach}.`)
  }

  const coVo = vo.length > 0
  return (
    <div className="form-giao">
      <h3>{taiCho ? 'Đơn tại chỗ' : `Giao: ${don!.TenKhach}`}</h3>
      {!taiCho && <p className="ghi-chu">📍 {don!.DiaChi}</p>}

      {taiCho &&
        (kh ? (
          <div className="khach-da-chon">
            <div><strong>{kh.Ten}</strong><small>{kh.id ? kh.DiaChi : 'Khách lẻ'}</small></div>
            <button type="button" className="nut-vien" onClick={() => setKh(null)}>Đổi</button>
          </div>
        ) : (
          <div className="chon-khach">
            <label>Khách<input type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Tìm khách, hoặc gõ tên khách lẻ" /></label>
            {tim.trim() && (
              <ul className="ds-goi-y">
                {goiY.map((k) => (
                  <li key={k.id}><button type="button" onClick={() => setKh({ id: k.id, Ten: String(k.Ten), DiaChi: String(k.DiaChi ?? '') })}>
                    <strong>{String(k.Ten)}</strong><small>{[k.SoDienThoai, k.DiaChi].filter(Boolean).join(' · ')}</small></button></li>
                ))}
                <li><button type="button" onClick={() => setKh({ id: null, Ten: tim.trim(), DiaChi: '' })}>
                  <strong>Khách lẻ: "{tim.trim()}"</strong><small>Không lưu vào danh sách khách, không ghi nợ được</small></button></li>
              </ul>
            )}
          </div>
        ))}

      {!taiCho && (
        <label className="o-tick">
          <input type="checkbox" checked={khongGiao} onChange={(e) => setKhongGiao(e.target.checked)} />
          Không giao được (khách vắng, từ chối…)
        </label>
      )}

      {!khongGiao && (
        <div className="bang-giao">
          <div className="bang-giao-dau"><span>Sản phẩm</span><span>Giao</span><span>Đơn giá</span></div>
          {dongGoc.map((d) => {
            const x = so(sl[d.SanPhamId])
            const g = gia[d.SanPhamId] !== undefined ? so(gia[d.SanPhamId]) : d.GiaDon
            return (
              <div key={d.SanPhamId} className="bang-giao-dong">
                <span>
                  {d.Ten}
                  <small>{taiCho ? `trên xe còn ${conTrenXe[d.SanPhamId] ?? 0}` : `đơn ${d.SoLuongDon}`}{x < d.SoLuongDon && !taiCho ? ' · GIAO THIẾU' : ''}{g < d.GiaDon ? ' · GIẢM GIÁ' : ''}</small>
                </span>
                <input inputMode="numeric" aria-label={`Giao ${d.Ten}`} placeholder="0" value={sl[d.SanPhamId] ?? ''}
                  onChange={(e) => setSl({ ...sl, [d.SanPhamId]: e.target.value.replace(/\D/g, '') })} />
                <input inputMode="numeric" aria-label={`Giá ${d.Ten}`} value={dinhDangSo(g)}
                  onChange={(e) => setGia({ ...gia, [d.SanPhamId]: e.target.value.replace(/\D/g, '') })} />
              </div>
            )
          })}
        </div>
      )}
      {(khongGiao || (!taiCho && coGiaoThieu(dong))) && (
        <label>Lý do {khongGiao ? 'không giao được' : 'giao thiếu'} *<input value={lyDoThieu} onChange={(e) => setLyDoThieu(e.target.value)} /></label>
      )}
      {coGiamGia(dong) && (
        <label>Lý do giảm giá *<input value={lyDoGiam} onChange={(e) => setLyDoGiam(e.target.value)} placeholder="Admin xem lại mỗi tối" /></label>
      )}

      {!khongGiao && coVo && (
        <div className="khoi-vo">
          <h3>Vỏ</h3>
          {vo.map((v) => {
            const d = dong.find((x) => x.SanPhamId === v.SanPhamId)!
            const thieu = voThieu(d.SoLuong, v.VoThu)
            return (
              <div key={v.SanPhamId} className="dong-vo">
                <label>{v.Ten}: vỏ rỗng thu về
                  <input inputMode="numeric" aria-label={`Vỏ thu ${v.Ten}`} value={voThu[v.SanPhamId] ?? String(d.SoLuong)}
                    onChange={(e) => setVoThu({ ...voThu, [v.SanPhamId]: e.target.value.replace(/\D/g, '') })} />
                </label>
                {v.VoThu > d.SoLuong && <p className="ghi-chu">Thu dư {v.VoThu - d.SoLuong} vỏ — trừ vào nợ vỏ cũ của khách.</p>}
                {thieu > 0 && (
                  <div className="hang-nut nho">
                    <button type="button" className={cachVo[v.SanPhamId] !== 'coc' ? '' : 'nut-vien'} onClick={() => setCachVo({ ...cachVo, [v.SanPhamId]: 'no' })}>
                      Nợ {thieu} vỏ
                    </button>
                    <button type="button" disabled={!(v.GiaCocVo > 0)} className={cachVo[v.SanPhamId] === 'coc' ? '' : 'nut-vien'}
                      onClick={() => setCachVo({ ...cachVo, [v.SanPhamId]: 'coc' })}>
                      Thu cọc {v.GiaCocVo > 0 ? `${dinhDangSo(thieu * v.GiaCocVo)}đ` : '(chưa có giá cọc)'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!khongGiao && (
        <div className="khoi-tien">
          <h3>Thu tiền: {dinhDangSo(can)}đ{tienCoc(vo) > 0 && <small> (gồm cọc {dinhDangSo(tienCoc(vo))}đ)</small>}</h3>
          <div className="hang-nut nho">
            {(['tm', 'ck', 'no', 'chia'] as const).map((k) => (
              <button key={k} type="button" className={cachTra === k ? '' : 'nut-vien'} onClick={() => setCachTra(k)}>
                {{ tm: 'Tiền mặt', ck: 'Chuyển khoản', no: 'Ghi nợ', chia: 'Chia' }[k]}
              </button>
            ))}
          </div>
          {cachTra === 'chia' && (
            <div className="bang-chia">
              {(['tm', 'ck', 'no'] as const).map((k) => (
                <label key={k}>{{ tm: 'Tiền mặt', ck: 'Chuyển khoản', no: 'Ghi nợ' }[k]}
                  <input inputMode="numeric" value={chia[k] ? dinhDangSo(so(chia[k])) : ''} onChange={(e) => setChia({ ...chia, [k]: e.target.value.replace(/\D/g, '') })} />
                </label>
              ))}
              <p className="ghi-chu">Còn thiếu: {dinhDangSo(can - TT.TienMat - TT.ChuyenKhoan - TT.GhiNo)}đ</p>
            </div>
          )}
          {TT.ChuyenKhoan > 0 && <MaQR tk={tk} soTien={TT.ChuyenKhoan} noiDung={noiDungCK} />}
          {TT.ChuyenKhoan > 0 && <p className="ghi-chu">Kế toán sẽ đối chiếu sao kê và xác nhận khoản chuyển này.</p>}
        </div>
      )}

      {loi && <p className="loi" role="alert">{loi}</p>}
      <div className="hang-nut">
        <button className="nut-to" onClick={luu} disabled={ban}>{khongGiao ? 'Lưu: không giao được' : '✔ Lưu giao hàng'}</button>
        <button className="nut-vien" onClick={huy} disabled={ban}>Huỷ</button>
      </div>
    </div>
  )
}
