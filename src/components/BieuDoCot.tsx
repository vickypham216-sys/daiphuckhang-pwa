// Biểu đồ cột MỘT chuỗi (doanh thu theo ngày/tuần) — theo skill dataviz:
// một màu (--chinh, đã chạy validate_palette: PASS), không hộp chú giải (tiêu
// đề đã nói đang vẽ gì), cột ≤ 24px bo 4px đầu số liệu / vuông ở gốc, lưới
// 1px nhạt, trục y 0 / nửa / trần tròn, nhãn x ≤ 7. Chạm / rê vào khe cột →
// dòng chi tiết. Có "Xem dạng bảng". Rộng theo khung (ResizeObserver), không
// dùng viewBox co giãn (méo bo góc).
import { useEffect, useRef, useState } from 'react'
import { dinhDangSo } from '../lib/so'
import { tienGon, tranTron } from '../lib/baoCao'

export interface Cot { nhan: string; giaTri: number; phu?: string }

const CAO = 180, TRAI = 44, DUOI = 22, TREN = 8

export default function BieuDoCot({ ds, donVi = 'đ', tieuDeBang }: { ds: Cot[]; donVi?: string; tieuDeBang: [string, string] }) {
  const khung = useRef<HTMLDivElement>(null)
  const [rong, setRong] = useState(320)
  const [chon, setChon] = useState<number | null>(null)
  useEffect(() => {
    const el = khung.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setRong(Math.max(240, Math.floor(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const tran = tranTron(Math.max(0, ...ds.map((c) => c.giaTri)))
  const veRong = rong - TRAI
  const khe = ds.length ? veRong / ds.length : veRong
  const be = Math.max(2, Math.min(24, khe * 0.6))
  const y = (v: number) => TREN + (CAO - TREN - DUOI) * (1 - v / tran)
  const buocNhan = Math.max(1, Math.ceil(ds.length / 7))
  // Nhãn x: mỗi `buocNhan` cột một nhãn + LUÔN nhãn cuối (canh phải). Bỏ nhãn
  // đều đặn nào nằm quá sát nhãn cuối — không thì hai nhãn chồng nhau ("21/23/11").
  const hienNhan = new Set<number>([ds.length - 1])
  for (let i = 0; i < ds.length - 1; i += buocNhan) if (ds.length - 1 - i >= Math.max(2, buocNhan)) hienNhan.add(i)
  const c = chon != null ? ds[chon] : null

  // Cột bo 4px ở đầu (trên), vuông ở gốc.
  const cot = (x: number, v: number) => {
    const h = CAO - DUOI - y(v)
    if (h <= 0) return ''
    const r = Math.min(4, be / 2, h)
    const t = y(v)
    return `M${x},${CAO - DUOI} V${t + r} Q${x},${t} ${x + r},${t} H${x + be - r} Q${x + be},${t} ${x + be},${t + r} V${CAO - DUOI} Z`
  }

  const chonTheoX = (clientX: number) => {
    const r = khung.current!.getBoundingClientRect()
    const i = Math.floor((clientX - r.left - TRAI) / khe)
    setChon(i >= 0 && i < ds.length ? i : null)
  }

  return (
    <div className="bieu-do">
      <p className="bieu-do-chi-tiet" aria-live="polite">
        {c ? <><strong>{c.nhan}</strong> · {dinhDangSo(c.giaTri)}{donVi}{c.phu ? ` · ${c.phu}` : ''}</> : <span className="ghi-chu">Chạm vào cột để xem số</span>}
      </p>
      <div ref={khung} className="bieu-do-khung"
        onPointerMove={(e) => e.pointerType === 'mouse' && chonTheoX(e.clientX)}
        onPointerDown={(e) => chonTheoX(e.clientX)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setChon(null)}>
        <svg width={rong} height={CAO} role="img" aria-label={`Biểu đồ ${tieuDeBang[1].toLowerCase()} theo ${tieuDeBang[0].toLowerCase()}`}>
          {[0, tran / 2, tran].map((v) => (
            <g key={v}>
              <line x1={TRAI} x2={rong} y1={y(v)} y2={y(v)} className="bd-luoi" />
              <text x={TRAI - 6} y={y(v) + 4} textAnchor="end" className="bd-chu">{tienGon(v)}</text>
            </g>
          ))}
          {ds.map((d, i) => {
            const x = TRAI + i * khe + (khe - be) / 2
            return <path key={i} d={cot(x, d.giaTri)} className={'bd-cot' + (chon === i ? ' bd-cot-chon' : '')} />
          })}
          {ds.map((d, i) =>
            hienNhan.has(i) ? (
              <text key={i} x={i === ds.length - 1 && ds.length > 1 ? TRAI + (i + 1) * khe : TRAI + i * khe + khe / 2} y={CAO - 6}
                textAnchor={i === ds.length - 1 && ds.length > 1 ? 'end' : 'middle'} className="bd-chu">{d.nhan.replace('tuần ', '')}</text>
            ) : null,
          )}
        </svg>
      </div>
      <details className="bd-bang">
        <summary>Xem dạng bảng</summary>
        <table className="bang-ton">
          <thead><tr><th>{tieuDeBang[0]}</th><th>{tieuDeBang[1]}</th></tr></thead>
          <tbody>{ds.map((d, i) => <tr key={i}><td>{d.nhan}</td><td>{dinhDangSo(d.giaTri)}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  )
}
