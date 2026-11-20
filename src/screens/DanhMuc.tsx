// Màn danh mục dùng chung: Xe, Sản phẩm, Khách hàng.
//
// Mỗi danh mục chỉ khai báo các TRƯỜNG; thêm / sửa / ngưng / tìm kiếm dùng
// chung một chỗ. KHÔNG có nút xoá: chứng từ cũ còn trỏ tới xe, sản phẩm,
// khách — xoá đi là chứng từ cũ mồ côi. Thay bằng "Ngưng dùng".
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { dinhDangSo, docSo } from '../lib/so'

export type KieuTruong = 'chu' | 'sdt' | 'tien' | 'so' | 'co' | 'chon' | 'dai'

export interface Truong {
  ma: string
  nhan: string
  kieu: KieuTruong
  batBuoc?: boolean
  luaChon?: { giaTri: string; nhan: string }[]
  goiY?: string
  /** Chỉ hiện ô này khi điều kiện đúng (vd giá cọc vỏ chỉ khi CoVo). */
  hienKhi?: (d: BanGhi) => boolean
}

export type BanGhi = Record<string, unknown> & { id?: string; TrangThai?: 'Active' | 'Inactive' }

export interface CauHinhDanhMuc {
  boSuuTap: string
  tenMot: string // "xe", "sản phẩm", "khách hàng"
  truong: Truong[]
  /** Dòng chính + dòng phụ trong danh sách. */
  tieuDe: (d: BanGhi) => string
  phu: (d: BanGhi) => ReactNode
  /** Kiểm tra thêm ngoài "bắt buộc"; trả lỗi tiếng Việt hoặc null. */
  kiemTra?: (d: BanGhi, tatCa: BanGhi[]) => string | null
  coTimKiem?: boolean
  macDinh?: BanGhi
}

const rong = (v: unknown) => v == null || v === '' || (typeof v === 'number' && Number.isNaN(v))

function OTruong({ t, gt, doi }: { t: Truong; gt: unknown; doi: (v: unknown) => void }) {
  if (t.kieu === 'co')
    return (
      <label className="o-tick">
        <input type="checkbox" checked={gt === true} onChange={(e) => doi(e.target.checked)} />
        {t.nhan}
      </label>
    )
  let o: ReactNode
  if (t.kieu === 'chon')
    o = (
      <select value={String(gt ?? '')} onChange={(e) => doi(e.target.value)}>
        {t.luaChon!.map((l) => (
          <option key={l.giaTri} value={l.giaTri}>
            {l.nhan}
          </option>
        ))}
      </select>
    )
  else if (t.kieu === 'dai')
    o = <textarea rows={2} value={String(gt ?? '')} onChange={(e) => doi(e.target.value)} placeholder={t.goiY} />
  else if (t.kieu === 'tien' || t.kieu === 'so')
    o = (
      <input
        inputMode="numeric"
        value={typeof gt === 'number' ? dinhDangSo(gt) : String(gt ?? '')}
        onChange={(e) => {
          const n = docSo(e.target.value)
          doi(n === null ? '' : Number.isNaN(n) ? e.target.value : n)
        }}
        placeholder={t.goiY}
      />
    )
  else
    o = (
      <input
        inputMode={t.kieu === 'sdt' ? 'tel' : undefined}
        value={String(gt ?? '')}
        onChange={(e) => doi(e.target.value)}
        placeholder={t.goiY}
      />
    )
  return (
    <label>
      {t.nhan}
      {t.batBuoc && ' *'}
      {o}
    </label>
  )
}

/** Làm sạch trước khi ghi: cắt khoảng trắng, bỏ ô đang ẩn, kiểm tra kiểu. */
function lamSach(ch: CauHinhDanhMuc, d: BanGhi, tatCa: BanGhi[]): { du: Record<string, unknown> } | { loi: string } {
  const du: Record<string, unknown> = {}
  for (const t of ch.truong) {
    if (t.hienKhi && !t.hienKhi(d)) {
      du[t.ma] = t.kieu === 'co' ? false : null
      continue
    }
    let v = d[t.ma]
    if (typeof v === 'string') v = v.trim()
    if ((t.kieu === 'tien' || t.kieu === 'so') && !rong(v) && typeof v !== 'number')
      return { loi: `${t.nhan}: "${String(v)}" không phải số.` }
    if (t.batBuoc && rong(v)) return { loi: `Thiếu ${t.nhan.toLowerCase()}.` }
    du[t.ma] = t.kieu === 'co' ? v === true : rong(v) ? null : v
  }
  const loi = ch.kiemTra?.(du, tatCa)
  return loi ? { loi } : { du }
}

function FormBanGhi({
  ch,
  dau,
  tatCa,
  luu,
  huy,
  nutLuu,
}: {
  ch: CauHinhDanhMuc
  dau: BanGhi
  tatCa: BanGhi[]
  luu: (du: Record<string, unknown>) => Promise<void>
  huy?: () => void
  nutLuu: string
}) {
  const [d, setD] = useState<BanGhi>(dau)
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  async function gui() {
    setLoi(null)
    const kq = lamSach(ch, d, tatCa)
    if ('loi' in kq) return setLoi(kq.loi)
    setBan(true)
    try {
      await luu(kq.du)
      setD(dau)
    } catch (e) {
      setLoi((e as { code?: string }).code === 'permission-denied' ? 'Tài khoản này không được sửa danh mục này.' : String(e))
    } finally {
      setBan(false)
    }
  }

  return (
    <div className="form-dm">
      {ch.truong
        .filter((t) => !t.hienKhi || t.hienKhi(d))
        .map((t) => (
          <OTruong key={t.ma} t={t} gt={d[t.ma]} doi={(v) => setD({ ...d, [t.ma]: v })} />
        ))}
      {loi && <p className="loi" role="alert">{loi}</p>}
      <div className="hang-nut">
        <button onClick={gui} disabled={ban}>
          {ban ? 'Đang lưu…' : nutLuu}
        </button>
        {huy && (
          <button className="nut-vien" onClick={huy} disabled={ban}>
            Huỷ
          </button>
        )}
      </div>
    </div>
  )
}

/** Bỏ dấu để tìm "nguyen" ra "Nguyễn". */
export const boDau = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()

export default function DanhMuc({ ch, uid, duocSua }: { ch: CauHinhDanhMuc; uid: string; duocSua: boolean }) {
  const [ds, setDs] = useState<BanGhi[] | null>(null)
  const [loiTai, setLoiTai] = useState<string | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const [moThem, setMoThem] = useState(false)
  const [dangSua, setDangSua] = useState<string | null>(null)
  const [tim, setTim] = useState('')
  const [hienNgung, setHienNgung] = useState(false)

  useEffect(
    () =>
      onSnapshot(
        collection(db, ch.boSuuTap),
        (s) => setDs(s.docs.map((x) => ({ ...(x.data() as BanGhi), id: x.id }))),
        (e) => setLoiTai(e.message),
      ),
    [ch.boSuuTap],
  )

  const tatCa = ds ?? []
  const soNgung = tatCa.filter((x) => x.TrangThai === 'Inactive').length
  const hien = useMemo(() => {
    const q = boDau(tim.trim())
    return tatCa
      .filter((x) => hienNgung || x.TrangThai !== 'Inactive')
      .filter((x) => !q || boDau(ch.tieuDe(x) + ' ' + ch.truong.map((t) => String(x[t.ma] ?? '')).join(' ')).includes(q))
      .sort((a, b) => ch.tieuDe(a).localeCompare(ch.tieuDe(b), 'vi'))
  }, [tatCa, tim, hienNgung, ch])

  async function them(du: Record<string, unknown>) {
    await addDoc(collection(db, ch.boSuuTap), { ...du, TrangThai: 'Active', TaoLuc: serverTimestamp(), TaoBoi: uid })
    setTin(`Đã thêm ${ch.tenMot} ${ch.tieuDe(du)}.`)
    setMoThem(false)
  }

  async function sua(id: string, du: Record<string, unknown>) {
    await updateDoc(doc(db, ch.boSuuTap, id), { ...du, SuaLuc: serverTimestamp(), SuaBoi: uid })
    setTin(`Đã lưu ${ch.tieuDe(du)}.`)
    setDangSua(null)
  }

  async function doiTrangThai(x: BanGhi) {
    const ngung = x.TrangThai !== 'Inactive'
    if (ngung && !confirm(`Ngưng dùng ${ch.tieuDe(x)}? Chứng từ cũ vẫn giữ nguyên; chỉ không chọn được nữa.`)) return
    try {
      await updateDoc(doc(db, ch.boSuuTap, x.id!), { TrangThai: ngung ? 'Inactive' : 'Active', SuaLuc: serverTimestamp(), SuaBoi: uid })
      setTin(ngung ? `Đã ngưng ${ch.tieuDe(x)}.` : `Đã dùng lại ${ch.tieuDe(x)}.`)
    } catch (e) {
      setTin(String(e))
    }
  }

  return (
    <div className="man">
      {tin && <p className="tin-tot" role="status">{tin}</p>}
      {duocSua &&
        (moThem ? (
          <section className="the the-rong">
            <h2>Thêm {ch.tenMot}</h2>
            <FormBanGhi ch={ch} dau={ch.macDinh ?? {}} tatCa={tatCa} luu={them} huy={() => setMoThem(false)} nutLuu="Thêm" />
          </section>
        ) : (
          <button onClick={() => { setMoThem(true); setTin(null) }}>+ Thêm {ch.tenMot}</button>
        ))}

      <section className="the the-rong">
        <h2>
          Danh sách {ch.tenMot} ({hien.length})
        </h2>
        {ch.coTimKiem && (
          <input type="search" placeholder="Tìm theo tên, số điện thoại, địa chỉ…" value={tim} onChange={(e) => setTim(e.target.value)} />
        )}
        {loiTai && <p className="loi">{loiTai}</p>}
        {!ds && !loiTai && <p>Đang tải…</p>}
        {ds && hien.length === 0 && <p className="ghi-chu">{tim ? 'Không tìm thấy.' : `Chưa có ${ch.tenMot} nào.`}</p>}
        <ul className="ds-nv">
          {hien.map((x) => (
            <li key={x.id} className={'dong-nv' + (x.TrangThai === 'Inactive' ? ' da-ngung' : '')}>
              <button
                className="dong-nv-dau"
                onClick={() => duocSua && setDangSua(dangSua === x.id ? null : x.id!)}
                aria-expanded={dangSua === x.id}
              >
                <span>
                  <strong>{ch.tieuDe(x)}</strong>
                  <small>{ch.phu(x)}</small>
                </span>
                {x.TrangThai === 'Inactive' && <span className="nhan-ngung">Ngưng dùng</span>}
              </button>
              {dangSua === x.id && (
                <div className="dong-nv-than">
                  <FormBanGhi
                    ch={ch}
                    dau={x}
                    tatCa={tatCa.filter((y) => y.id !== x.id)}
                    luu={(du) => sua(x.id!, du)}
                    huy={() => setDangSua(null)}
                    nutLuu="Lưu thay đổi"
                  />
                  <hr />
                  <button className={x.TrangThai === 'Inactive' ? 'nut-vien' : 'nut-nguy'} onClick={() => doiTrangThai(x)}>
                    {x.TrangThai === 'Inactive' ? 'Dùng lại' : 'Ngưng dùng'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {soNgung > 0 && (
          <label className="o-tick">
            <input type="checkbox" checked={hienNgung} onChange={(e) => setHienNgung(e.target.checked)} />
            Hiện cả {soNgung} {ch.tenMot} đã ngưng
          </label>
        )}
      </section>
    </div>
  )
}
