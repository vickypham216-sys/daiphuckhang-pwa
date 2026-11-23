// Màn Điều phối — sáng ra Điều phối tạo chuyến (xe + tổ xe) và gán đơn vào.
// Chỉ sửa được khi chuyến còn "Đang xếp đơn"; xuất kho xong là khoá.
import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { dinhDangSo } from '../lib/so'
import { hienNgay, ngayVN, tomTatDong, type DonHang as Don } from '../lib/donHang'
import {
  PHU_XE_TOI_DA,
  TEN_TRANG_THAI_CHUYEN,
  doiThuTu,
  kiemTraToXe,
  nguoiBiTrung,
  nhanChuyen,
  soChuyenTiepTheo,
  tongTheoDonVi,
  toXeGanNhat,
  type Chuyen,
  type NguoiTrenXe,
} from '../lib/dieuPhoi'
import type { NguoiDung } from '../types'

type CoId<T> = T & { id: string }
type NV = CoId<NguoiDung> & { uid: string }
interface Xe { BienSo: string; TenXe?: string | null; TaiTrong?: number | null; TrangThai?: string }

function useTruyVan<T>(tao: () => ReturnType<typeof query> | ReturnType<typeof collection>, deps: unknown[]) {
  const [ds, setDs] = useState<CoId<T>[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  useEffect(() => {
    setDs(null)
    return onSnapshot(
      tao(),
      (s) => setDs(s.docs.map((x) => ({ ...(x.data() as T), id: x.id }))),
      (e) => setLoi(e.message),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { ds, loi }
}

const loiGhi = (e: unknown) =>
  (e as { code?: string }).code === 'permission-denied'
    ? 'Không lưu được: chuyến đã xuất kho, hoặc tài khoản không có quyền.'
    : (e as Error).message ?? String(e)

// ── Form tạo chuyến / sửa tổ xe ─────────────────────────────────────────
function FormChuyen({
  ngay,
  dau,
  xe,
  nhanVien,
  chuyenNgay,
  chuyenGanDay,
  uid,
  xong,
  huy,
}: {
  ngay: string
  dau?: CoId<Chuyen>
  xe: CoId<Xe>[]
  nhanVien: NV[]
  chuyenNgay: CoId<Chuyen>[]
  chuyenGanDay: CoId<Chuyen>[]
  uid: string
  xong: (tin: string) => void
  huy: () => void
}) {
  const [xeId, setXeId] = useState(dau?.XeId ?? '')
  const [taiXe, setTaiXe] = useState(dau?.TaiXe.uid ?? '')
  const [phuXe, setPhuXe] = useState<string[]>(dau?.PhuXe.map((p) => p.uid) ?? [])
  const [ghiChu, setGhiChu] = useState(dau?.GhiChu ?? '')
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)
  const [daDienSan, setDaDienSan] = useState<string | null>(null)

  const dsTaiXe = nhanVien.filter((n) => n.VaiTro === 'TaiXe' || n.uid === taiXe)
  // Tài xế cũng có thể đi phụ xe cho người khác.
  const dsPhuXe = nhanVien.filter((n) => (n.VaiTro === 'PhuXe' || n.VaiTro === 'TaiXe') && n.uid !== taiXe)
  const ten = (u: string) => nhanVien.find((n) => n.uid === u)?.HoTen ?? '(không rõ)'

  function chonXe(id: string) {
    setXeId(id)
    if (dau) return
    // Điền sẵn tổ xe của chuyến gần nhất của xe này — đổi người thì sửa.
    const to = toXeGanNhat([...chuyenNgay, ...chuyenGanDay], id)
    const conLam = new Set(nhanVien.map((n) => n.uid))
    if (to && conLam.has(to.TaiXe.uid)) {
      setTaiXe(to.TaiXe.uid)
      setPhuXe(to.PhuXe.map((p) => p.uid).filter((u) => conLam.has(u)))
      setDaDienSan('Đã điền sẵn tổ xe của chuyến gần nhất của xe này. Đổi người thì sửa bên dưới.')
    } else setDaDienSan(null)
  }

  const trung = nguoiBiTrung(
    [taiXe, ...phuXe].filter(Boolean),
    chuyenNgay.filter((c) => c.id !== dau?.id),
  )

  async function luu() {
    setLoi(null)
    if (!xeId) return setLoi('Chưa chọn xe.')
    const l = kiemTraToXe(taiXe, phuXe)
    if (l) return setLoi(l)
    const nguoi = (u: string): NguoiTrenXe => ({ uid: u, HoTen: ten(u) })
    setBan(true)
    try {
      if (dau) {
        await updateDoc(doc(db, 'Chuyen', dau.id), {
          TaiXe: nguoi(taiXe),
          PhuXe: phuXe.map(nguoi),
          ToXeUids: [taiXe, ...phuXe],
          GhiChu: ghiChu.trim() || null,
          SuaLuc: serverTimestamp(),
          SuaBoi: uid,
        })
        xong(`Đã sửa tổ xe ${nhanChuyen(dau)}.`)
      } else {
        const x = xe.find((v) => v.id === xeId)!
        const so = soChuyenTiepTheo(chuyenNgay, xeId)
        await addDoc(collection(db, 'Chuyen'), {
          Ngay: ngay,
          XeId: xeId,
          BienSo: x.BienSo,
          SoChuyen: so,
          TaiXe: nguoi(taiXe),
          PhuXe: phuXe.map(nguoi),
          ToXeUids: [taiXe, ...phuXe],
          DonIds: [],
          TrangThai: 'LapKeHoach',
          GhiChu: ghiChu.trim() || null,
          TaoBoi: uid,
          TaoLuc: serverTimestamp(),
        })
        xong(`Đã tạo chuyến ${nhanChuyen({ BienSo: x.BienSo, SoChuyen: so })}. Chọn đơn rồi bấm "Gán vào chuyến này".`)
      }
    } catch (e) {
      setLoi(loiGhi(e))
      setBan(false)
    }
  }

  return (
    <section className="the the-rong">
      <h2>{dau ? `Sửa tổ xe ${nhanChuyen(dau)}` : `Tạo chuyến ${hienNgay(ngay)}`}</h2>
      {!dau && (
        <label>
          Xe *
          <select value={xeId} onChange={(e) => chonXe(e.target.value)}>
            <option value="">— Chọn xe —</option>
            {xe.map((x) => (
              <option key={x.id} value={x.id}>
                {x.BienSo}
                {x.TenXe ? ` · ${x.TenXe}` : ''} — chuyến {soChuyenTiepTheo(chuyenNgay, x.id)}
              </option>
            ))}
          </select>
        </label>
      )}
      {xe.length === 0 && !dau && <p className="ghi-chu">Chưa có xe. Admin thêm ở tab Xe.</p>}
      {daDienSan && <p className="ghi-chu">{daDienSan}</p>}
      <label>
        Tài xế *
        <select
          value={taiXe}
          onChange={(e) => {
            setTaiXe(e.target.value)
            setPhuXe(phuXe.filter((p) => p !== e.target.value))
          }}
        >
          <option value="">— Chọn tài xế —</option>
          {dsTaiXe.map((n) => (
            <option key={n.uid} value={n.uid}>
              {n.HoTen}
            </option>
          ))}
        </select>
      </label>
      {dsTaiXe.length === 0 && <p className="ghi-chu">Chưa có tài khoản vai trò Tài xế. Admin tạo ở tab Nhân viên.</p>}
      <fieldset className="nhom-tick">
        <legend>
          Phụ xe ({phuXe.length}/{PHU_XE_TOI_DA})
        </legend>
        {dsPhuXe.length === 0 && <p className="ghi-chu">Chưa có tài khoản Phụ xe.</p>}
        {dsPhuXe.map((n) => (
          <label key={n.uid} className="o-tick">
            <input
              type="checkbox"
              checked={phuXe.includes(n.uid)}
              disabled={!phuXe.includes(n.uid) && phuXe.length >= PHU_XE_TOI_DA}
              onChange={(e) => setPhuXe(e.target.checked ? [...phuXe, n.uid] : phuXe.filter((p) => p !== n.uid))}
            />
            {n.HoTen}
            {n.VaiTro === 'TaiXe' && <small> (tài xế)</small>}
          </label>
        ))}
      </fieldset>
      {trung.length > 0 && (
        <p className="canh-bao">
          ⚠ {trung.map((t) => `${ten(t.uid)} đang ở chuyến ${t.o}`).join('; ')}. Vẫn lưu được nếu người đó chạy xong
          chuyến kia rồi mới đi chuyến này.
        </p>
      )}
      <label>
        Ghi chú chuyến
        <textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} />
      </label>
      {loi && <p className="loi" role="alert">{loi}</p>}
      <div className="hang-nut">
        <button onClick={luu} disabled={ban}>
          {ban ? 'Đang lưu…' : dau ? 'Lưu tổ xe' : 'Tạo chuyến'}
        </button>
        <button className="nut-vien" onClick={huy} disabled={ban}>
          Huỷ
        </button>
      </div>
    </section>
  )
}

// ── Màn chính ───────────────────────────────────────────────────────────
export default function DieuPhoi({ uid }: { uid: string }) {
  const [ngay, setNgay] = useState(ngayVN())
  const [chon, setChon] = useState<Set<string>>(new Set())
  const [form, setForm] = useState<'moi' | CoId<Chuyen> | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  const { ds: chuyenRaw, loi: loiChuyen } = useTruyVan<Chuyen>(
    () => query(collection(db, 'Chuyen'), where('Ngay', '==', ngay)),
    [ngay],
  )
  const { ds: donRaw, loi: loiDon } = useTruyVan<Don>(
    () => query(collection(db, 'DonHang'), where('NgayGiao', '==', ngay)),
    [ngay],
  )
  // 7 ngày gần nhất — chỉ để điền sẵn tổ xe. Lọc 1 trường nên không cần chỉ mục.
  const { ds: ganDay } = useTruyVan<Chuyen>(
    () => query(collection(db, 'Chuyen'), where('Ngay', '>=', ngayVN(-7))),
    [],
  )
  const { ds: xeRaw } = useTruyVan<Xe>(() => collection(db, 'Xe'), [])
  const { ds: nvRaw, loi: loiNv } = useTruyVan<NguoiDung>(() => collection(db, 'NguoiDung'), [])

  const xe = (xeRaw ?? []).filter((x) => x.TrangThai !== 'Inactive').sort((a, b) => a.BienSo.localeCompare(b.BienSo))
  const nhanVien: NV[] = (nvRaw ?? [])
    .filter((n) => n.TrangThai !== 'Inactive')
    .map((n) => ({ ...n, uid: n.id }))
    .sort((a, b) => a.HoTen.localeCompare(b.HoTen, 'vi'))
  const chuyen = (chuyenRaw ?? [])
    .filter((c) => c.TrangThai !== 'Huy')
    .sort((a, b) => a.BienSo.localeCompare(b.BienSo) || a.SoChuyen - b.SoChuyen)
  const donTheoId = useMemo(() => new Map((donRaw ?? []).map((d) => [d.id, d])), [donRaw])
  const donCho = (donRaw ?? [])
    .filter((d) => d.TrangThai === 'Moi')
    .sort((a, b) => a.DiaChi.localeCompare(b.DiaChi, 'vi'))

  // Bỏ chọn đơn không còn "chờ" (người khác vừa gán / Sales vừa huỷ).
  useEffect(() => {
    const con = new Set(donCho.map((d) => d.id))
    if ([...chon].some((id) => !con.has(id))) setChon(new Set([...chon].filter((id) => con.has(id))))
  }, [donRaw]) // eslint-disable-line react-hooks/exhaustive-deps

  async function lam(viec: () => Promise<void>, tinXong: string) {
    setLoi(null)
    setTin(null)
    setBan(true)
    try {
      await viec()
      setTin(tinXong)
    } catch (e) {
      setLoi(loiGhi(e))
    } finally {
      setBan(false)
    }
  }

  // Gán: một transaction đọc chuyến + từng đơn, chỉ ghi khi chuyến còn đang
  // xếp và MỌI đơn còn "chờ" — hai người cùng gán một đơn thì người sau bị từ chối.
  const ganVao = (c: CoId<Chuyen>) => {
    const ids = donCho.map((d) => d.id).filter((id) => chon.has(id)) // giữ thứ tự đang hiện
    return lam(async () => {
      await runTransaction(db, async (tx) => {
        const refC = doc(db, 'Chuyen', c.id)
        const sc = await tx.get(refC)
        if (sc.data()?.TrangThai !== 'LapKeHoach') throw new Error('Chuyến này đã khoá (đã xuất kho hoặc đã huỷ).')
        const refs = ids.map((id) => doc(db, 'DonHang', id))
        const snaps = await Promise.all(refs.map((r) => tx.get(r)))
        for (const s of snaps) {
          const d = s.data() as Don | undefined
          if (!d || d.TrangThai !== 'Moi' || d.ChuyenId)
            throw new Error(`Đơn của ${d?.TenKhach ?? '?'} không còn chờ gán (vừa được gán hoặc huỷ). Thử lại.`)
        }
        const nhan = nhanChuyen(c)
        refs.forEach((r) =>
          tx.update(r, { ChuyenId: c.id, TrangThai: 'DaGan', XeGan: nhan, SuaLuc: serverTimestamp(), SuaBoi: uid }),
        )
        tx.update(refC, { DonIds: [...(sc.data()!.DonIds as string[]), ...ids], SuaLuc: serverTimestamp(), SuaBoi: uid })
      })
      setChon(new Set())
    }, `Đã gán ${ids.length} đơn vào ${nhanChuyen(c)}.`)
  }

  const boRa = (c: CoId<Chuyen>, donId: string) =>
    lam(async () => {
      await runTransaction(db, async (tx) => {
        const refC = doc(db, 'Chuyen', c.id)
        const sc = await tx.get(refC)
        if (sc.data()?.TrangThai !== 'LapKeHoach') throw new Error('Chuyến này đã khoá.')
        tx.update(doc(db, 'DonHang', donId), { ChuyenId: null, TrangThai: 'Moi', XeGan: null, SuaLuc: serverTimestamp(), SuaBoi: uid })
        tx.update(refC, { DonIds: (sc.data()!.DonIds as string[]).filter((x) => x !== donId), SuaLuc: serverTimestamp(), SuaBoi: uid })
      })
    }, `Đã bỏ đơn của ${donTheoId.get(donId)?.TenKhach ?? ''} khỏi ${nhanChuyen(c)}.`)

  const dichChuyen = (c: CoId<Chuyen>, i: number, buoc: -1 | 1) =>
    lam(() => updateDoc(doc(db, 'Chuyen', c.id), { DonIds: doiThuTu(c.DonIds, i, buoc), SuaLuc: serverTimestamp(), SuaBoi: uid }), '')

  const huyChuyen = (c: CoId<Chuyen>) => {
    if (!confirm(`Huỷ chuyến ${nhanChuyen(c)}?`)) return
    return lam(() => updateDoc(doc(db, 'Chuyen', c.id), { TrangThai: 'Huy', SuaLuc: serverTimestamp(), SuaBoi: uid }), `Đã huỷ ${nhanChuyen(c)}.`)
  }

  if (form)
    return (
      <div className="man">
        <FormChuyen
          ngay={ngay}
          dau={form === 'moi' ? undefined : form}
          xe={xe}
          nhanVien={nhanVien}
          chuyenNgay={chuyenRaw ?? []}
          chuyenGanDay={ganDay ?? []}
          uid={uid}
          xong={(t) => {
            setTin(t)
            setForm(null)
          }}
          huy={() => setForm(null)}
        />
      </div>
    )

  const loiTai = loiChuyen || loiDon || loiNv
  return (
    <div className="man">
      <section className="the the-rong">
        <div className="hang-ngay">
          <h2>Điều phối {hienNgay(ngay)}</h2>
          <input type="date" value={ngay} onChange={(e) => e.target.value && setNgay(e.target.value)} aria-label="Chọn ngày" />
        </div>
        <div className="hang-nut nho">
          <button className={ngay === ngayVN() ? '' : 'nut-vien'} onClick={() => setNgay(ngayVN())}>Hôm nay</button>
          <button className={ngay === ngayVN(1) ? '' : 'nut-vien'} onClick={() => setNgay(ngayVN(1))}>Ngày mai</button>
        </div>
      </section>

      {tin && <p className="tin-tot" role="status">{tin}</p>}
      {loi && <p className="loi" role="alert">{loi}</p>}
      {loiTai && <p className="loi">{loiTai}</p>}

      {/* Đơn chờ gán */}
      <section className="the the-rong">
        <h2>Đơn chờ gán xe ({donCho.length})</h2>
        {!donRaw && <p>Đang tải…</p>}
        {donRaw && donCho.length === 0 && <p className="ghi-chu">Không còn đơn nào chờ gán.</p>}
        {donCho.length > 1 && (
          <label className="o-tick">
            <input
              type="checkbox"
              checked={chon.size === donCho.length}
              onChange={(e) => setChon(e.target.checked ? new Set(donCho.map((d) => d.id)) : new Set())}
            />
            Chọn tất cả
          </label>
        )}
        <ul className="ds-don-cho">
          {donCho.map((d) => (
            <li key={d.id}>
              <label className="o-tick don-cho">
                <input
                  type="checkbox"
                  checked={chon.has(d.id)}
                  onChange={(e) => {
                    const s = new Set(chon)
                    if (e.target.checked) s.add(d.id)
                    else s.delete(d.id)
                    setChon(s)
                  }}
                />
                <span>
                  <strong>{d.TenKhach}</strong>
                  <small>📍 {d.DiaChi}</small>
                  <small>{tomTatDong(d.Dong)}</small>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {chon.size > 0 && <p className="ghi-chu">Đã chọn {chon.size} đơn — bấm "Gán vào chuyến này" ở chuyến bên dưới.</p>}
      </section>

      {/* Chuyến */}
      <button onClick={() => { setForm('moi'); setTin(null); setLoi(null) }}>+ Tạo chuyến</button>
      {chuyenRaw && chuyen.length === 0 && <p className="ghi-chu">Chưa có chuyến nào trong ngày.</p>}
      {chuyen.map((c) => {
        const xeCua = (xeRaw ?? []).find((x) => x.id === c.XeId)
        const don = c.DonIds.map((id) => donTheoId.get(id)).filter((d): d is CoId<Don> => !!d)
        const tong = tongTheoDonVi(don.map((d) => d.Dong))
        const tongSo = Object.values(tong).reduce((s, n) => s + n, 0)
        const qua = xeCua?.TaiTrong ? tongSo > xeCua.TaiTrong : false
        const mo = c.TrangThai === 'LapKeHoach'
        return (
          <section key={c.id} className="the the-rong chuyen">
            <div className="chuyen-dau">
              <h2>
                {c.BienSo} · Chuyến {c.SoChuyen}
              </h2>
              <span className={'nhan-tt ' + (mo ? 'tt-Moi' : 'tt-DaGan')}>{TEN_TRANG_THAI_CHUYEN[c.TrangThai]}</span>
            </div>
            <p className="ghi-chu">
              🚚 {c.TaiXe.HoTen}
              {c.PhuXe.length > 0 && ` · Phụ xe: ${c.PhuXe.map((p) => p.HoTen).join(', ')}`}
            </p>
            {c.GhiChu && <p className="ghi-chu">📝 {c.GhiChu}</p>}
            <p className={qua ? 'canh-bao' : 'ghi-chu'}>
              {don.length} đơn ·{' '}
              {Object.entries(tong).map(([dv, n]) => `${dinhDangSo(n)} ${dv.toLowerCase()}`).join(', ') || 'chưa có hàng'}
              {xeCua?.TaiTrong ? ` / xe chở ${dinhDangSo(xeCua.TaiTrong)}` : ''}
              {qua && ' — VƯỢT sức chở'}
            </p>
            <ol className="ds-don-chuyen">
              {don.map((d, i) => (
                <li key={d.id}>
                  <span>
                    <strong>{d.TenKhach}</strong>
                    <small>{d.DiaChi}</small>
                    <small>{tomTatDong(d.Dong)}</small>
                  </span>
                  {mo && (
                    <span className="nut-dong">
                      <button className="nut-vien" aria-label="Lên" disabled={ban || i === 0} onClick={() => dichChuyen(c, c.DonIds.indexOf(d.id), -1)}>↑</button>
                      <button className="nut-vien" aria-label="Xuống" disabled={ban || i === don.length - 1} onClick={() => dichChuyen(c, c.DonIds.indexOf(d.id), 1)}>↓</button>
                      <button className="nut-nguy" aria-label="Bỏ khỏi chuyến" disabled={ban} onClick={() => boRa(c, d.id)}>✕</button>
                    </span>
                  )}
                </li>
              ))}
            </ol>
            {mo && (
              <div className="hang-nut">
                <button disabled={ban || chon.size === 0} onClick={() => ganVao(c)}>
                  {chon.size > 0 ? `Gán ${chon.size} đơn vào chuyến này` : 'Chọn đơn ở trên để gán'}
                </button>
              </div>
            )}
            {mo && (
              <div className="hang-nut nho">
                <button className="nut-vien" onClick={() => { setForm(c); setTin(null); setLoi(null) }}>Sửa tổ xe</button>
                {c.DonIds.length === 0 && (
                  <button className="nut-nguy" onClick={() => huyChuyen(c)}>Huỷ chuyến</button>
                )}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
