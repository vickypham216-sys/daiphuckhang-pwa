// Báo cáo tồn kho & vỏ (Admin, Kế toán, Thủ kho). Xem src/lib/baoCaoKho.ts.
import { useMemo, useState } from 'react'
import { Timestamp, collection, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useNghe } from '../lib/nghe'
import { dinhDangSo } from '../lib/so'
import { hienNgay, ngayVN } from '../lib/donHang'
import { TEN_KY, kyBaoCao, soNgay, type MaKy } from '../lib/baoCao'
import { bienDongTu, canVo, haoHut, xnt, type TheoSp } from '../lib/baoCaoKho'

const KY: MaKy[] = ['homnay', 'homqua', '7ngay', 'thangnay', 'thangtruoc']
const LUI_TOI_DA = 93 // ngày — XNT phải đọc mọi chứng từ từ đầu kỳ tới hôm nay

interface SP { Ten: string; DonVi: string; CoVo?: boolean; TrangThai?: string }

/** Một dòng nhãn — số, canh phải; `dau` = "+"/"−" khi là biến động. */
function Dong({ nhan, so, dau, dam, nho }: { nhan: string; so: number; dau?: boolean; dam?: boolean; nho?: string }) {
  return (
    <div className={'dong-so' + (dam ? ' dam' : '')}>
      <span>{nhan}{nho && <small>{nho}</small>}</span>
      <span>{dau && so > 0 ? '+' : ''}{so < 0 ? '−' : ''}{dinhDangSo(Math.abs(so))}</span>
    </div>
  )
}

export default function BaoCaoKho() {
  const [ma, setMa] = useState<MaKy | 'tuy'>('7ngay')
  const [tuyChon, setTuyChon] = useState(() => kyBaoCao('7ngay'))
  const ky = ma === 'tuy' ? tuyChon : kyBaoCao(ma)
  const homNay = ngayVN()
  const loiKy = ky.tu > ky.den ? 'Ngày bắt đầu sau ngày kết thúc.'
    : soNgay(ky.tu, homNay) > LUI_TOI_DA ? `Chỉ xem được trong ${LUI_TOI_DA} ngày gần nhất.` : null
  const tu = loiKy ? homNay : ky.tu

  const { ds: spRaw } = useNghe<SP>(() => collection(db, 'SanPham'), [])
  const { ds: ton, loi: loiTon } = useNghe<{ Day: number; VoRong: number }>(() => collection(db, 'TonKho'), [])
  const { ds: xe } = useNghe<{ BienSo: string; Hang?: TheoSp; VoRong?: TheoSp }>(() => collection(db, 'TrenXe'), [])
  const { ds: cn } = useNghe<{ TenKhach: string; NoVo?: TheoSp; CocVo?: TheoSp }>(() => collection(db, 'CongNoKhach'), [])
  const { ds: ncc } = useNghe<{ SanPhamId: string; SoVo: number }>(() => collection(db, 'NoVoNCC'), [])
  const { ds: nhap } = useNghe<{ Ngay: string; Dong: { SanPhamId: string; SoLuong: number; VoTra?: number }[] }>(
    () => query(collection(db, 'PhieuNhap'), where('Ngay', '>=', tu)), [tu])
  const { ds: xuat } = useNghe<{ Ngay: string; Dong: { SanPhamId: string; SoLuong: number }[] }>(
    () => query(collection(db, 'PhieuXuat'), where('Ngay', '>=', tu)), [tu])
  const { ds: ds } = useNghe<{ Ngay: string; BienSo: string; SoChuyen: number; TaiXe: { HoTen: string }; DeLai: boolean; Dem: { Day: TheoSp; VoRong: TheoSp } | null; ChenhLech: { Day: TheoSp; VoRong: TheoSp } }>(
    () => query(collection(db, 'DoiSoatChuyen'), where('Ngay', '>=', tu)), [tu])
  const { ds: dc } = useNghe<{ SanPhamId: string; Truoc: { Day: number; VoRong: number }; Sau: { Day: number; VoRong: number }; Luc?: Timestamp }>(
    () => query(collection(db, 'DieuChinhTon'), where('Luc', '>=', Timestamp.fromDate(new Date(tu + 'T00:00:00+07:00')))), [tu])

  const sanPham = (spRaw ?? []).filter((s) => s.TrangThai !== 'Inactive').sort((a, b) => a.Ten.localeCompare(b.Ten, 'vi'))
  const tonMap = new Map((ton ?? []).map((t) => [t.id, t]))
  const bd = useMemo(() => bienDongTu(nhap ?? [], xuat ?? [], ds ?? [],
    (dc ?? []).filter((d) => d.Luc).map((d) => ({ ...d, ngay: ngayVN(0, d.Luc!.toDate()) }))), [nhap, xuat, ds, dc])
  const dsKy = (ds ?? []).filter((d) => d.Ngay >= ky.tu && d.Ngay <= ky.den)
  const hh = haoHut(dsKy)
  const dangTai = !spRaw || !ton || !xe || !nhap || !xuat || !ds
  const ten = (id: string) => sanPham.find((s) => s.id === id)?.Ten ?? (spRaw ?? []).find((s) => s.id === id)?.Ten ?? id

  // Khách giữ vỏ nhiều nhất (nợ + cọc), mọi sản phẩm.
  const khachGiu = (cn ?? []).map((c) => ({
    id: c.id, ten: c.TenKhach,
    no: Object.values(c.NoVo ?? {}).reduce((s, n) => s + Math.max(0, n), 0),
    coc: Object.values(c.CocVo ?? {}).reduce((s, n) => s + n, 0),
  })).filter((k) => k.no + k.coc > 0).sort((a, b) => b.no + b.coc - (a.no + a.coc)).slice(0, 10)

  return (
    <div className="man man-rong">
      {/* ── Ảnh chụp hiện tại ── */}
      <section className="the the-rong">
        <h2>Hàng & vỏ hiện tại</h2>
        <p className="ghi-chu">Trên xe: số lúc xuất kho / chốt chuyến gần nhất — chưa trừ hàng đang giao dở.</p>
        {loiTon && <p className="loi">{loiTon}</p>}
        {dangTai && <p>Đang tải…</p>}
      </section>
      <div className="luoi-the">
        {!dangTai && sanPham.map((s) => {
          const c = canVo(s.id, tonMap.get(s.id), xe ?? [], s.CoVo ? cn ?? [] : [], s.CoVo ? ncc ?? [] : [])
          return (
            <section key={s.id} className="the the-rong the-so">
              <h3>{s.Ten}</h3>
              <Dong nhan="Trong kho (đầy)" so={c.khoDay} />
              <Dong nhan="Trên xe (đầy)" so={c.xeDay} />
              {s.CoVo ? (
                <>
                  <Dong nhan="Vỏ rỗng trong kho" so={c.khoRong} />
                  <Dong nhan="Vỏ rỗng trên xe" so={c.xeRong} />
                  <Dong nhan="Khách đang nợ vỏ" so={c.khachNo} />
                  <Dong nhan="Khách đang cọc vỏ" so={c.khachCoc} />
                  <Dong nhan="Vỏ đang lưu hành" so={c.luuHanh} dam nho="kho + xe + khách giữ" />
                  <Dong nhan="Đang nợ nhà cung cấp" so={-c.noNCC} />
                  <Dong nhan="Vỏ của công ty" so={c.cuaCongTy} dam />
                </>
              ) : <Dong nhan="Tổng hàng" so={c.khoDay + c.xeDay} dam />}
            </section>
          )
        })}
      </div>

      {/* ── Nhập – xuất – tồn theo kỳ ── */}
      <section className="the the-rong">
        <h2>Nhập – xuất – tồn {ky.tu === ky.den ? hienNgay(ky.tu) : `${hienNgay(ky.tu)} – ${hienNgay(ky.den)}`}</h2>
        <div className="dai-chip" role="tablist">
          {KY.map((k) => <button key={k} role="tab" aria-selected={ma === k} className={ma === k ? 'chip dang-chon' : 'chip'} onClick={() => setMa(k)}>{TEN_KY[k]}</button>)}
          <button role="tab" aria-selected={ma === 'tuy'} className={ma === 'tuy' ? 'chip dang-chon' : 'chip'} onClick={() => setMa('tuy')}>Tuỳ chọn</button>
        </div>
        {ma === 'tuy' && (
          <div className="hang-ngay-2">
            <label>Từ<input type="date" value={tuyChon.tu} max={homNay} onChange={(e) => e.target.value && setTuyChon({ ...tuyChon, tu: e.target.value })} /></label>
            <label>Đến<input type="date" value={tuyChon.den} max={homNay} onChange={(e) => e.target.value && setTuyChon({ ...tuyChon, den: e.target.value })} /></label>
          </div>
        )}
        {loiKy && <p className="loi">{loiKy}</p>}
      </section>
      {!loiKy && !dangTai && (
        <div className="luoi-the">
          {sanPham.map((s) => {
            const x = xnt(s.id, tonMap.get(s.id), bd, ky.tu, ky.den)
            return (
              <section key={s.id} className="the the-rong the-so">
                <h3>{s.Ten}</h3>
                <Dong nhan="Tồn đầu kỳ (đầy)" so={x.dauDay} dam />
                <Dong nhan="Nhập nhà cung cấp" so={x.nhap} dau />
                <Dong nhan="Xuất lên xe" so={-x.xuat} dau />
                <Dong nhan="Xe trả về kho" so={x.traVe} dau />
                {x.dieuChinhDay !== 0 && <Dong nhan="Điều chỉnh" so={x.dieuChinhDay} dau />}
                <Dong nhan="Tồn cuối kỳ (đầy)" so={x.cuoiDay} dam />
                {s.CoVo && (
                  <>
                    <hr />
                    <Dong nhan="Vỏ rỗng đầu kỳ" so={x.dauRong} dam />
                    <Dong nhan="Trả nhà cung cấp" so={-x.voTraNCC} dau />
                    <Dong nhan="Xe mang về" so={x.voVe} dau />
                    {x.dieuChinhRong !== 0 && <Dong nhan="Điều chỉnh" so={x.dieuChinhRong} dau />}
                    <Dong nhan="Vỏ rỗng cuối kỳ" so={x.cuoiRong} dam />
                  </>
                )}
              </section>
            )
          })}
        </div>
      )}

      {/* ── Hao hụt chuyến ── */}
      {!loiKy && !dangTai && (
        <section className="the the-rong">
          <h2>Hao hụt khi chốt chuyến</h2>
          <p className="ghi-chu">{dsKy.length} chuyến đã chốt trong kỳ · {hh.soChuyenLech} chuyến có chênh lệch. Số âm = thiếu.</p>
          {Object.keys({ ...hh.day, ...hh.voRong }).length === 0 && <p className="ghi-chu">Không có chênh lệch.</p>}
          {[...new Set([...Object.keys(hh.day), ...Object.keys(hh.voRong)])].map((sp) => (
            <div key={sp}>
              {(hh.day[sp] ?? 0) !== 0 && <Dong nhan={`${ten(sp)} — hàng đầy`} so={hh.day[sp]} dau />}
              {(hh.voRong[sp] ?? 0) !== 0 && <Dong nhan={`${ten(sp)} — vỏ`} so={hh.voRong[sp]} dau />}
            </div>
          ))}
          {hh.soChuyenLech > 0 && (
            <details className="bd-bang">
              <summary>Xem từng chuyến lệch</summary>
              {dsKy.filter((d) => Object.keys(d.ChenhLech?.Day ?? {}).length || Object.keys(d.ChenhLech?.VoRong ?? {}).length).map((d) => (
                <p key={d.id} className="ghi-chu">
                  {hienNgay(d.Ngay)} · {d.BienSo} C{d.SoChuyen} · {d.TaiXe?.HoTen}:{' '}
                  {[...Object.entries(d.ChenhLech.Day).map(([k, n]) => `${ten(k)} ${n > 0 ? '+' : ''}${n}`),
                    ...Object.entries(d.ChenhLech.VoRong).map(([k, n]) => `vỏ ${ten(k)} ${n > 0 ? '+' : ''}${n}`)].join(', ')}
                </p>
              ))}
            </details>
          )}
        </section>
      )}

      {/* ── Khách giữ vỏ ── */}
      <section className="the the-rong">
        <h2>Khách đang giữ nhiều vỏ nhất</h2>
        {khachGiu.length === 0 ? <p className="ghi-chu">Không có khách nào đang giữ vỏ.</p> : (
          <table className="bang-bc">
            <thead><tr><th>Khách</th><th>Nợ vỏ</th><th>Cọc</th></tr></thead>
            <tbody>{khachGiu.map((k) => <tr key={k.id}><td>{k.ten}</td><td>{dinhDangSo(k.no)}</td><td>{dinhDangSo(k.coc)}</td></tr>)}</tbody>
          </table>
        )}
      </section>
    </div>
  )
}
