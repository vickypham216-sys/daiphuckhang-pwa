// Gán đơn vào chuyến: một transaction đọc chuyến + từng đơn, chỉ ghi khi chuyến
// còn đang xếp và MỌI đơn còn "chờ" — hai người cùng gán một đơn thì người sau
// bị từ chối. Dùng chung cho màn Điều phối và form Đơn hàng.
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { nhanChuyen, type Chuyen } from './dieuPhoi'
import type { DonHang } from './donHang'

export async function ganDonVaoChuyen(chuyenId: string, donIds: string[], uid: string): Promise<string> {
  return runTransaction(db, async (tx) => {
    const refC = doc(db, 'Chuyen', chuyenId)
    const sc = await tx.get(refC)
    const c = sc.data() as Chuyen | undefined
    if (!c || c.TrangThai !== 'LapKeHoach') throw new Error('Chuyến này đã khoá (đã xuất kho hoặc đã huỷ).')
    const refs = donIds.map((id) => doc(db, 'DonHang', id))
    const snaps = await Promise.all(refs.map((r) => tx.get(r)))
    for (const s of snaps) {
      const d = s.data() as DonHang | undefined
      if (!d || d.TrangThai !== 'Moi' || d.ChuyenId)
        throw new Error(`Đơn của ${d?.TenKhach ?? '?'} không còn chờ gán (vừa được gán hoặc huỷ). Thử lại.`)
    }
    const nhan = nhanChuyen(c)
    refs.forEach((r) => tx.update(r, { ChuyenId: chuyenId, TrangThai: 'DaGan', XeGan: nhan, SuaLuc: serverTimestamp(), SuaBoi: uid }))
    tx.update(refC, { DonIds: [...c.DonIds, ...donIds], SuaLuc: serverTimestamp(), SuaBoi: uid })
    return nhan
  })
}
