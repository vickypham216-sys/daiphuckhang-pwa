// Màn Kho — tồn kho (đầy + vỏ rỗng), nợ vỏ nhà cung cấp, nhập hàng, tồn đầu kỳ.
// Mọi con số do MÁY CHỦ ghi (functions/src/index.ts: nhapHang, datTonKho);
// màn này chỉ đọc và gửi yêu cầu. Cần mạng.
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where, type Query, type CollectionReference } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { goi, loiMayChu } from '../lib/goiMayChu'
import { dinhDangSo, docSo } from '../lib/so'
import { hienNgay, ngayVN } from '../lib/donHang'
import type { BanGhi } from './DanhMuc'
import XuatKho from './XuatKho'

type CoId<T> = T & { id: string }
interface TonKho { Ten: string; CoVo: boolean; Day: number; VoRong: number }
interface NoVo { TenNCC: string; Ten: string; SoVo: number }
interface DongNhap { SanPhamId: string; Ten: string; DonVi: string; CoVo: boolean; SoLuong: number; DonGia: number | null; VoTra: number }
interface PhieuNhap { Ngay: string; TenNCC: string; Dong: DongNhap[]; TongTien: number; GhiChu: string | null; TenNguoiTao: string }

function useNghe<T>(tao: () => Query | CollectionReference, deps: unknown[]) {
  const [ds, setDs] = useState<CoId<T>[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  useEffect(
    () => onSnapshot(tao(), (s) => setDs(s.docs.map((x) => ({ ...(x.data() as T), id: x.id }))), (e) => setLoi(e.message)),
    deps, // eslint-disable-line react-hooks/exhaustive-deps
  )
  return { ds, loi }
}

const soVao = (s: string) => {
  const n = docSo(s)
  return n === null || Number.isNaN(n) ? 0 : n
}

// ── Nhập hàng ───────────────────────────────────────────────────────────
function FormNhap({ sanPham, ncc, ton, xong, huy }: {
  sanPham: CoId<BanGhi>[]; ncc: CoId<BanGhi>[]; ton: Map<string, TonKho>; xong: (t: string) => void; huy: () => void
}) {
  const [nccId, setNccId] = useState(ncc.length === 1 ? ncc[0].id : '')
  const [ngay, setNgay] = useState(ngayVN())
  const [sl, setSl] = useState<Record<string, string>>({})
  const [gia, setGia] = useState<Record<string, string>>({})
  // Vỏ trả NCC: mặc định = số nhập (đổi 1-1). Đã gõ tay thì giữ số gõ.
  const [vo, setVo] = useState<Record<string, string>>({})
  const [ghiChu, setGhiChu] = useState('')
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  const dong = sanPham
    .map((s) => {
      const SoLuong = soVao(sl[s.id] ?? '')
      const coVo = s.CoVo === true
      return {
        SanPhamId: s.id, Ten: String(s.Ten), DonVi: String(s.DonVi ?? ''), CoVo: coVo, SoLuong,
        DonGia: gia[s.id] ? soVao(gia[s.id]) : null,
        VoTra: coVo ? (vo[s.id] !== undefined ? soVao(vo[s.id]) : SoLuong) : 0,
      }
    })
    .filter((d) => d.SoLuong > 0)

  async function gui() {
    setLoi(null)
    if (!nccId) return setLoi('Chưa chọn nhà cung cấp.')
    if (dong.length === 0) return setLoi('Chưa nhập số lượng sản phẩm nào.')
    for (const d of dong) {
      const coVoRong = ton.get(d.SanPhamId)?.VoRong ?? 0
      if (d.VoTra > coVoRong) return setLoi(`${d.Ten}: kho chỉ có ${coVoRong} vỏ rỗng, không trả NCC ${d.VoTra} vỏ được.`)
    }
    setBan(true)
    try {
      await goi('nhapHang', { NCCId: nccId, Ngay: ngay, Dong: dong, GhiChu: ghiChu })
      xong(`Đã nhập ${dong.map((d) => `${d.Ten} × ${d.SoLuong}`).join(', ')}.`)
    } catch (e) {
      setLoi(loiMayChu(e))
      setBan(false)
    }
  }

  const tong = dong.reduce((s, d) => s + d.SoLuong * (d.DonGia ?? 0), 0)
  return (
    <section className="the the-rong">
      <h2>Nhập hàng</h2>
      <label>
        Nhà cung cấp *
        <select value={nccId} onChange={(e) => setNccId(e.target.value)}>
          <option value="">— Chọn —</option>
          {ncc.map((n) => <option key={n.id} value={n.id}>{String(n.Ten)}</option>)}
        </select>
      </label>
      {ncc.length === 0 && <p className="ghi-chu">Chưa có nhà cung cấp. Admin thêm ở Danh mục → Nhà cung cấp.</p>}
      <label>
        Ngày nhập
        <input type="date" value={ngay} max={ngayVN()} onChange={(e) => setNgay(e.target.value)} />
      </label>
      <div className="bang-nhap">
        <div className="bang-nhap-dau"><span>Sản phẩm</span><span>Số nhập</span><span>Giá nhập</span><span>Vỏ trả NCC</span></div>
        {sanPham.map((s) => (
          <div key={s.id} className="bang-nhap-dong">
            <span>{String(s.Ten)}<small>{s.CoVo ? `vỏ rỗng trong kho: ${ton.get(s.id)?.VoRong ?? 0}` : String(s.DonVi ?? '').toLowerCase()}</small></span>
            <input inputMode="numeric" aria-label={`Số nhập ${String(s.Ten)}`} placeholder="0" value={sl[s.id] ?? ''}
              onChange={(e) => setSl({ ...sl, [s.id]: e.target.value.replace(/\D/g, '') })} />
            <input inputMode="numeric" aria-label={`Giá nhập ${String(s.Ten)}`} placeholder="—" value={gia[s.id] ? dinhDangSo(soVao(gia[s.id])) : ''}
              onChange={(e) => setGia({ ...gia, [s.id]: e.target.value.replace(/\D/g, '') })} />
            {s.CoVo ? (
              <input inputMode="numeric" aria-label={`Vỏ trả ${String(s.Ten)}`}
                value={vo[s.id] ?? (sl[s.id] ?? '')}
                onChange={(e) => setVo({ ...vo, [s.id]: e.target.value.replace(/\D/g, '') })} />
            ) : <span className="ghi-chu">—</span>}
          </div>
        ))}
      </div>
      <p className="ghi-chu">Vỏ trả NCC tự điền bằng số nhập (đổi 1-1). Trả ít hơn → công ty nợ NCC thêm vỏ; trả nhiều hơn → bớt nợ vỏ.</p>
      {tong > 0 && <p>Tổng tiền hàng: <strong>{dinhDangSo(tong)}đ</strong></p>}
      <label>Ghi chú<textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></label>
      {loi && <p className="loi" role="alert">{loi}</p>}
      <div className="hang-nut">
        <button onClick={gui} disabled={ban}>{ban ? 'Đang lưu…' : 'Lưu phiếu nhập'}</button>
        <button className="nut-vien" onClick={huy} disabled={ban}>Huỷ</button>
      </div>
    </section>
  )
}

// ── Tồn đầu kỳ / điều chỉnh (Admin) ───────────────────────────────────
function FormDatTon({ sp, ton, xong, huy }: { sp: CoId<BanGhi>; ton?: TonKho; xong: (t: string) => void; huy: () => void }) {
  const [day, setDay] = useState(String(ton?.Day ?? ''))
  const [voRong, setVoRong] = useState(String(ton?.VoRong ?? ''))
  const [lyDo, setLyDo] = useState(ton ? '' : 'Tồn đầu kỳ')
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)
  async function gui() {
    setLoi(null)
    setBan(true)
    try {
      await goi('datTonKho', { SanPhamId: sp.id, Day: soVao(day), VoRong: sp.CoVo ? soVao(voRong) : 0, LyDo: lyDo })
      xong(`Đã đặt tồn ${String(sp.Ten)}.`)
    } catch (e) {
      setLoi(loiMayChu(e))
      setBan(false)
    }
  }
  return (
    <div className="form-dm">
      <label>Hàng đầy trong kho<input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value.replace(/\D/g, ''))} /></label>
      {sp.CoVo === true && (
        <label>Vỏ rỗng trong kho<input inputMode="numeric" value={voRong} onChange={(e) => setVoRong(e.target.value.replace(/\D/g, ''))} /></label>
      )}
      <label>Lý do *<input value={lyDo} onChange={(e) => setLyDo(e.target.value)} placeholder="Tồn đầu kỳ / kiểm kho ngày…" /></label>
      {loi && <p className="loi" role="alert">{loi}</p>}
      <div className="hang-nut">
        <button onClick={gui} disabled={ban}>{ban ? 'Đang lưu…' : 'Lưu'}</button>
        <button className="nut-vien" onClick={huy} disabled={ban}>Huỷ</button>
      </div>
    </div>
  )
}

// ── Màn chính ───────────────────────────────────────────────────────────
export default function Kho({ vaiTro, mucBanDau }: { vaiTro: string; mucBanDau?: string }) {
  const laAdmin = vaiTro === 'Admin'
  const duocNhap = laAdmin || vaiTro === 'ThuKho'
  const [muc, setMuc] = useState<'ton' | 'xuat' | 'nhap'>((mucBanDau as 'ton') ?? (duocNhap ? 'xuat' : 'ton'))
  const [moNhap, setMoNhap] = useState(false)
  const [datTon, setDatTon] = useState<string | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const [moPhieu, setMoPhieu] = useState<string | null>(null)

  const { ds: spRaw } = useNghe<BanGhi>(() => collection(db, 'SanPham'), [])
  const { ds: tonRaw, loi: loiTon } = useNghe<TonKho>(() => collection(db, 'TonKho'), [])
  const { ds: noVo } = useNghe<NoVo>(() => collection(db, 'NoVoNCC'), [])
  const { ds: nccRaw } = useNghe<BanGhi>(() => collection(db, 'NhaCungCap'), [])
  const { ds: phieu, loi: loiPhieu } = useNghe<PhieuNhap>(
    () => query(collection(db, 'PhieuNhap'), where('Ngay', '>=', ngayVN(-30))), [],
  )

  const sanPham = (spRaw ?? []).filter((s) => s.TrangThai !== 'Inactive').sort((a, b) => String(a.Ten).localeCompare(String(b.Ten), 'vi'))
  const ncc = (nccRaw ?? []).filter((n) => n.TrangThai !== 'Inactive')
  const ton = new Map((tonRaw ?? []).map((t) => [t.id, t]))
  const noVoCon = (noVo ?? []).filter((n) => n.SoVo !== 0)

  const xong = (t: string) => { setTin(t); setMoNhap(false); setDatTon(null) }

  return (
    <div className="man">
      <div className="hang-nut nho">
        {duocNhap && <button className={muc === 'xuat' ? '' : 'nut-vien'} onClick={() => setMuc('xuat')}>Xuất kho</button>}
        <button className={muc === 'ton' ? '' : 'nut-vien'} onClick={() => setMuc('ton')}>Tồn kho</button>
        <button className={muc === 'nhap' ? '' : 'nut-vien'} onClick={() => setMuc('nhap')}>Phiếu nhập</button>
      </div>
      {tin && <p className="tin-tot" role="status">{tin}</p>}

      {muc === 'xuat' && <XuatKho sanPham={sanPham} ton={ton} />}

      {(muc === 'ton' || muc === 'nhap') && duocNhap && !moNhap && (
        <button onClick={() => { setMoNhap(true); setTin(null) }}>+ Nhập hàng</button>
      )}
      {moNhap && <FormNhap sanPham={sanPham} ncc={ncc} ton={ton} xong={xong} huy={() => setMoNhap(false)} />}

      {muc === 'ton' && !moNhap && (
        <>
          <section className="the the-rong">
            <h2>Tồn kho</h2>
            {loiTon && <p className="loi">{loiTon}</p>}
            <table className="bang-ton">
              <thead><tr><th>Sản phẩm</th><th>Hàng đầy</th><th>Vỏ rỗng</th></tr></thead>
              <tbody>
                {sanPham.map((s) => {
                  const t = ton.get(s.id)
                  return [
                    <tr key={s.id} onClick={() => laAdmin && setDatTon(datTon === s.id ? null : s.id)} className={laAdmin ? 'bam-duoc' : ''}>
                      <td>{String(s.Ten)}</td>
                      <td>{t ? dinhDangSo(t.Day) : <span className="ghi-chu">chưa có</span>}</td>
                      <td>{s.CoVo ? dinhDangSo(t?.VoRong ?? 0) : '—'}</td>
                    </tr>,
                    datTon === s.id && (
                      <tr key={s.id + '-dat'}><td colSpan={3}>
                        <FormDatTon sp={s} ton={t} xong={xong} huy={() => setDatTon(null)} />
                      </td></tr>
                    ),
                  ]
                })}
              </tbody>
            </table>
            {laAdmin && <p className="ghi-chu">Bấm vào một dòng để đặt tồn đầu kỳ hoặc điều chỉnh sau kiểm kho (có ghi vết).</p>}
          </section>
          <section className="the the-rong">
            <h2>Vỏ công ty đang nợ nhà cung cấp</h2>
            {noVoCon.length === 0 && <p className="ghi-chu">Không nợ vỏ.</p>}
            {noVoCon.map((n) => (
              <p key={n.id}>{n.TenNCC} · {n.Ten}: <strong>{n.SoVo > 0 ? `nợ ${dinhDangSo(n.SoVo)} vỏ` : `NCC nợ lại ${dinhDangSo(-n.SoVo)} vỏ`}</strong></p>
            ))}
          </section>
        </>
      )}

      {muc === 'nhap' && !moNhap && (
        <section className="the the-rong">
          <h2>Phiếu nhập 30 ngày gần đây</h2>
          {loiPhieu && <p className="loi">{loiPhieu}</p>}
          {phieu && phieu.length === 0 && <p className="ghi-chu">Chưa có phiếu nhập.</p>}
          <ul className="ds-nv">
            {(phieu ?? []).slice().sort((a, b) => (a.Ngay < b.Ngay ? 1 : -1)).map((p) => (
              <li key={p.id} className="dong-nv">
                <button className="dong-nv-dau" onClick={() => setMoPhieu(moPhieu === p.id ? null : p.id)}>
                  <span><strong>{hienNgay(p.Ngay)} · {p.TenNCC}</strong><small>{p.Dong.map((d) => `${d.Ten} × ${d.SoLuong}`).join(', ')}</small></span>
                </button>
                {moPhieu === p.id && (
                  <div className="dong-nv-than">
                    {p.Dong.map((d) => (
                      <p key={d.SanPhamId} className="ghi-chu">
                        {d.Ten}: nhập {d.SoLuong}{d.DonGia != null && ` × ${dinhDangSo(d.DonGia)}đ`}{d.CoVo && ` · trả ${d.VoTra} vỏ`}
                      </p>
                    ))}
                    {p.TongTien > 0 && <p>Tổng: <strong>{dinhDangSo(p.TongTien)}đ</strong></p>}
                    {p.GhiChu && <p className="ghi-chu">Ghi chú: {p.GhiChu}</p>}
                    <p className="ghi-chu">Người nhập: {p.TenNguoiTao}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
