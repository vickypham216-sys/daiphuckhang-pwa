// Màn Đơn hàng — Sales (và Admin, Điều phối) nhập đơn cho ngày giao.
import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { dinhDangSo, docSo } from '../lib/so'
import {
  TEN_TRANG_THAI_DON,
  hienNgay,
  kiemTraDon,
  ngayVN,
  tomTatDong,
  tongTien,
  type DonHang as Don,
  type DongDon,
} from '../lib/donHang'
import { boDau, type BanGhi } from './DanhMuc'

type CoId<T> = T & { id: string }

function useDanhSach(ten: string) {
  const [ds, setDs] = useState<CoId<BanGhi>[]>([])
  useEffect(
    () =>
      onSnapshot(collection(db, ten), (s) =>
        setDs(s.docs.map((x) => ({ ...(x.data() as BanGhi), id: x.id })).filter((x) => x.TrangThai !== 'Inactive')),
      ),
    [ten],
  )
  return ds
}

function ChonKhach({ khach, chon }: { khach: CoId<BanGhi>[]; chon: (k: CoId<BanGhi>) => void }) {
  const [tim, setTim] = useState('')
  const q = boDau(tim.trim())
  const kq = q
    ? khach.filter((k) => boDau(`${String(k.Ten)} ${String(k.SoDienThoai ?? '')} ${String(k.DiaChi ?? '')}`).includes(q)).slice(0, 8)
    : []
  return (
    <div className="chon-khach">
      <label>
        Khách hàng *
        <input type="search" value={tim} onChange={(e) => setTim(e.target.value)} placeholder="Gõ tên, số điện thoại hoặc địa chỉ" autoFocus />
      </label>
      {q && (
        <ul className="ds-goi-y">
          {kq.map((k) => (
            <li key={k.id}>
              <button type="button" onClick={() => chon(k)}>
                <strong>{String(k.Ten)}</strong>
                <small>{[k.SoDienThoai, k.DiaChi].filter(Boolean).join(' · ')}</small>
              </button>
            </li>
          ))}
          {kq.length === 0 && <li className="ghi-chu">Không thấy khách. Thêm khách mới ở tab Khách hàng.</li>}
        </ul>
      )}
    </div>
  )
}

interface FormProps {
  sanPham: CoId<BanGhi>[]
  khach: CoId<BanGhi>[]
  dau?: CoId<Don>
  uid: string
  tenToi: string
  xong: (tin: string) => void
  huy: () => void
}

function FormDon({ sanPham, khach, dau, uid, tenToi, xong, huy }: FormProps) {
  const homNay = ngayVN()
  const [kh, setKh] = useState<{ id: string; Ten: string; DiaChi: string; SoDienThoai: string | null; GhiChu: string | null } | null>(
    dau ? { id: dau.KhachHangId, Ten: dau.TenKhach, DiaChi: dau.DiaChi, SoDienThoai: dau.SoDienThoai, GhiChu: dau.GhiChuKhach } : null,
  )
  const [ngay, setNgay] = useState(dau?.NgayGiao ?? ngayVN(1))
  // Số lượng + giá theo sản phẩm. Giá điền sẵn giá mặc định, sửa được.
  const [sl, setSl] = useState<Record<string, string>>(() =>
    Object.fromEntries((dau?.Dong ?? []).map((d) => [d.SanPhamId, String(d.SoLuong)])),
  )
  const [gia, setGia] = useState<Record<string, number>>(() =>
    Object.fromEntries((dau?.Dong ?? []).map((d) => [d.SanPhamId, d.DonGia])),
  )
  const [ghiChu, setGhiChu] = useState(dau?.GhiChu ?? '')
  const [loi, setLoi] = useState<string | null>(null)
  const [ban, setBan] = useState(false)

  // Sản phẩm đã ngưng nhưng có trong đơn cũ vẫn phải hiện để sửa được đơn.
  const dsSp = useMemo(() => {
    const coSan = new Set(sanPham.map((s) => s.id))
    const cu = (dau?.Dong ?? [])
      .filter((d) => !coSan.has(d.SanPhamId))
      .map((d) => ({ id: d.SanPhamId, Ten: d.Ten, DonVi: d.DonVi, CoVo: d.CoVo, GiaBan: d.DonGia }) as CoId<BanGhi>)
    return [...sanPham, ...cu].sort((a, b) => String(a.Ten).localeCompare(String(b.Ten), 'vi'))
  }, [sanPham, dau])

  const dong: DongDon[] = dsSp
    .map((s) => ({
      SanPhamId: s.id,
      Ten: String(s.Ten),
      DonVi: String(s.DonVi ?? ''),
      CoVo: s.CoVo === true,
      SoLuong: Number(sl[s.id] || 0),
      DonGia: gia[s.id] ?? Number(s.GiaBan ?? 0),
    }))
    .filter((d) => d.SoLuong > 0)

  async function luu() {
    setLoi(null)
    const l = kiemTraDon({ KhachHangId: kh?.id ?? '', NgayGiao: ngay, Dong: dong }, homNay)
    if (l) return setLoi(l)
    setBan(true)
    const du = {
      KhachHangId: kh!.id,
      TenKhach: kh!.Ten,
      DiaChi: kh!.DiaChi,
      SoDienThoai: kh!.SoDienThoai,
      GhiChuKhach: kh!.GhiChu,
      NgayGiao: ngay,
      Dong: dong,
      GhiChu: ghiChu.trim() || null,
    }
    try {
      if (dau) {
        await updateDoc(doc(db, 'DonHang', dau.id), { ...du, SuaLuc: serverTimestamp(), SuaBoi: uid })
        xong(`Đã sửa đơn của ${kh!.Ten}.`)
      } else {
        await addDoc(collection(db, 'DonHang'), {
          ...du,
          TrangThai: 'Moi',
          ChuyenId: null,
          TaoBoi: uid,
          TenNguoiTao: tenToi,
          TaoLuc: serverTimestamp(),
        })
        xong(`Đã tạo đơn cho ${kh!.Ten}, giao ${hienNgay(ngay)}.`)
      }
    } catch (e) {
      setLoi((e as { code?: string }).code === 'permission-denied' ? 'Không lưu được: đơn đã được gán xe hoặc bạn không có quyền.' : String(e))
      setBan(false)
    }
  }

  return (
    <section className="the the-rong">
      <h2>{dau ? 'Sửa đơn' : 'Đơn mới'}</h2>
      {kh ? (
        <div className="khach-da-chon">
          <div>
            <strong>{kh.Ten}</strong>
            <small>{[kh.SoDienThoai, kh.DiaChi].filter(Boolean).join(' · ')}</small>
            {kh.GhiChu && <small>📝 {kh.GhiChu}</small>}
          </div>
          <button type="button" className="nut-vien" onClick={() => setKh(null)}>
            Đổi
          </button>
        </div>
      ) : (
        <ChonKhach
          khach={khach}
          chon={(k) =>
            setKh({
              id: k.id,
              Ten: String(k.Ten),
              DiaChi: String(k.DiaChi ?? ''),
              SoDienThoai: (k.SoDienThoai as string) ?? null,
              GhiChu: (k.GhiChu as string) ?? null,
            })
          }
        />
      )}

      <label>
        Ngày giao *
        <input type="date" value={ngay} min={homNay} onChange={(e) => setNgay(e.target.value)} />
      </label>

      <div className="bang-sp">
        <div className="bang-sp-dau">
          <span>Sản phẩm</span>
          <span>Số lượng</span>
          <span>Đơn giá (đ)</span>
        </div>
        {dsSp.length === 0 && <p className="ghi-chu">Chưa có sản phẩm. Admin thêm ở tab Sản phẩm.</p>}
        {dsSp.map((s) => (
          <div key={s.id} className={'bang-sp-dong' + (Number(sl[s.id] || 0) > 0 ? ' co-sl' : '')}>
            <span>
              {String(s.Ten)}
              <small>{String(s.DonVi ?? '').toLowerCase()}{s.CoVo ? ' · có vỏ' : ''}</small>
            </span>
            <input
              inputMode="numeric"
              aria-label={`Số lượng ${String(s.Ten)}`}
              value={sl[s.id] ?? ''}
              onChange={(e) => setSl({ ...sl, [s.id]: e.target.value.replace(/\D/g, '') })}
              placeholder="0"
            />
            <input
              inputMode="numeric"
              aria-label={`Đơn giá ${String(s.Ten)}`}
              value={dinhDangSo(gia[s.id] ?? Number(s.GiaBan ?? 0))}
              onChange={(e) => {
                const n = docSo(e.target.value)
                setGia({ ...gia, [s.id]: n === null || Number.isNaN(n) ? 0 : n })
              }}
            />
          </div>
        ))}
        <div className="bang-sp-tong">
          Tổng: <strong>{dinhDangSo(tongTien(dong))}đ</strong>
        </div>
      </div>

      <label>
        Ghi chú đơn
        <textarea rows={2} value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} placeholder="Giao trước 9h, thu tiền mặt…" />
      </label>
      {loi && <p className="loi" role="alert">{loi}</p>}
      <div className="hang-nut">
        <button onClick={luu} disabled={ban}>
          {ban ? 'Đang lưu…' : dau ? 'Lưu thay đổi' : 'Tạo đơn'}
        </button>
        <button className="nut-vien" onClick={huy} disabled={ban}>
          Huỷ
        </button>
      </div>
    </section>
  )
}

export default function DonHang({ uid, tenToi }: { uid: string; tenToi: string }) {
  const [ngay, setNgay] = useState(ngayVN(1))
  const [ds, setDs] = useState<CoId<Don>[] | null>(null)
  const [loiTai, setLoiTai] = useState<string | null>(null)
  const [form, setForm] = useState<'moi' | CoId<Don> | null>(null)
  const [mo, setMo] = useState<string | null>(null)
  const [tin, setTin] = useState<string | null>(null)
  const sanPham = useDanhSach('SanPham')
  const khach = useDanhSach('KhachHang')

  useEffect(() => {
    setDs(null)
    return onSnapshot(
      query(collection(db, 'DonHang'), where('NgayGiao', '==', ngay)),
      (s) => setDs(s.docs.map((x) => ({ ...(x.data() as Don), id: x.id }))),
      (e) => setLoiTai(e.message),
    )
  }, [ngay])

  const thuTu: Record<string, number> = { Moi: 0, DaGan: 1, DaGiao: 2, Huy: 3 }
  const hien = (ds ?? []).slice().sort((a, b) => thuTu[a.TrangThai] - thuTu[b.TrangThai] || a.TenKhach.localeCompare(b.TenKhach, 'vi'))
  const conHieuLuc = hien.filter((d) => d.TrangThai !== 'Huy')
  // Tổng số lượng theo sản phẩm — điều phối nhìn để biết cần bao nhiêu hàng.
  const tongSp = new Map<string, number>()
  for (const d of conHieuLuc) for (const x of d.Dong) tongSp.set(x.Ten, (tongSp.get(x.Ten) ?? 0) + x.SoLuong)

  async function huyDon(d: CoId<Don>) {
    const lyDo = prompt(`Huỷ đơn của ${d.TenKhach}? Nhập lý do:`)
    if (lyDo === null) return
    if (!lyDo.trim()) return setTin('Huỷ đơn cần có lý do.')
    try {
      await updateDoc(doc(db, 'DonHang', d.id), { TrangThai: 'Huy', LyDoHuy: lyDo.trim(), SuaLuc: serverTimestamp(), SuaBoi: uid })
      setTin(`Đã huỷ đơn của ${d.TenKhach}.`)
      setMo(null)
    } catch {
      setTin('Không huỷ được: đơn đã được gán xe.')
    }
  }

  if (form)
    return (
      <div className="man">
        <FormDon
          sanPham={sanPham}
          khach={khach}
          dau={form === 'moi' ? undefined : form}
          uid={uid}
          tenToi={tenToi}
          xong={(t) => {
            setTin(t)
            setForm(null)
          }}
          huy={() => setForm(null)}
        />
      </div>
    )

  return (
    <div className="man">
      {tin && <p className="tin-tot" role="status">{tin}</p>}
      <button onClick={() => { setForm('moi'); setTin(null) }}>+ Tạo đơn</button>

      <section className="the the-rong">
        <div className="hang-ngay">
          <h2>Đơn giao {hienNgay(ngay)}</h2>
          <input type="date" value={ngay} onChange={(e) => e.target.value && setNgay(e.target.value)} aria-label="Chọn ngày giao" />
        </div>
        <div className="hang-nut nho">
          <button className={ngay === ngayVN() ? '' : 'nut-vien'} onClick={() => setNgay(ngayVN())}>Hôm nay</button>
          <button className={ngay === ngayVN(1) ? '' : 'nut-vien'} onClick={() => setNgay(ngayVN(1))}>Ngày mai</button>
        </div>
        {conHieuLuc.length > 0 && (
          <p className="ghi-chu">
            {conHieuLuc.length} đơn · {[...tongSp].map(([t, n]) => `${t}: ${n}`).join(' · ')}
          </p>
        )}
        {loiTai && <p className="loi">{loiTai}</p>}
        {!ds && !loiTai && <p>Đang tải…</p>}
        {ds && hien.length === 0 && <p className="ghi-chu">Chưa có đơn nào cho ngày này.</p>}
        <ul className="ds-nv">
          {hien.map((d) => (
            <li key={d.id} className={'dong-nv' + (d.TrangThai === 'Huy' ? ' da-ngung' : '')}>
              <button className="dong-nv-dau" onClick={() => setMo(mo === d.id ? null : d.id)} aria-expanded={mo === d.id}>
                <span>
                  <strong>{d.TenKhach}</strong>
                  <small>{tomTatDong(d.Dong)}</small>
                  {d.XeGan && <small>🚚 {d.XeGan}</small>}
                </span>
                <span className={'nhan-tt tt-' + d.TrangThai}>{TEN_TRANG_THAI_DON[d.TrangThai]}</span>
              </button>
              {mo === d.id && (
                <div className="dong-nv-than">
                  <p className="ghi-chu">
                    📍 {d.DiaChi}
                    {d.SoDienThoai && <> · 📞 <a href={`tel:${d.SoDienThoai}`}>{d.SoDienThoai}</a></>}
                  </p>
                  {d.GhiChuKhach && <p className="ghi-chu">Khách: {d.GhiChuKhach}</p>}
                  <table className="bang-chi-tiet">
                    <tbody>
                      {d.Dong.map((x) => (
                        <tr key={x.SanPhamId}>
                          <td>{x.Ten}</td>
                          <td>× {x.SoLuong}</td>
                          <td>{dinhDangSo(x.DonGia)}</td>
                          <td>{dinhDangSo(x.SoLuong * x.DonGia)}</td>
                        </tr>
                      ))}
                      <tr className="dong-tong">
                        <td colSpan={3}>Tổng</td>
                        <td>{dinhDangSo(tongTien(d.Dong))}đ</td>
                      </tr>
                    </tbody>
                  </table>
                  {d.GhiChu && <p className="ghi-chu">Ghi chú: {d.GhiChu}</p>}
                  {d.LyDoHuy && <p className="loi">Lý do huỷ: {d.LyDoHuy}</p>}
                  <p className="ghi-chu">Người tạo: {d.TenNguoiTao}</p>
                  {d.TrangThai === 'Moi' && (
                    <div className="hang-nut">
                      <button onClick={() => { setForm(d); setTin(null) }}>Sửa</button>
                      <button className="nut-nguy" onClick={() => huyDon(d)}>Huỷ đơn</button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
