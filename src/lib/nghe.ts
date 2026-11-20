// Nghe một truy vấn Firestore, trả danh sách {…dữ liệu, id}. Dùng chung.
import { useEffect, useState } from 'react'
import { onSnapshot, type CollectionReference, type DocumentReference, type Query } from 'firebase/firestore'

export type CoId<T> = T & { id: string }

export function useNghe<T>(tao: () => Query | CollectionReference, deps: unknown[]) {
  const [ds, setDs] = useState<CoId<T>[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  useEffect(() => {
    setDs(null)
    return onSnapshot(tao(), (s) => setDs(s.docs.map((x) => ({ ...(x.data() as T), id: x.id }))), (e) => setLoi(e.message))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return { ds, loi }
}

/** Nghe MỘT document. undefined = đang tải, null = không có. */
export function useNgheMot<T>(tao: () => DocumentReference | null, deps: unknown[]) {
  const [d, setD] = useState<CoId<T> | null | undefined>(undefined)
  useEffect(() => {
    const r = tao()
    if (!r) return setD(null)
    setD(undefined)
    return onSnapshot(r, (s) => setD(s.exists() ? { ...(s.data() as T), id: s.id } : null), () => setD(null))
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return d
}
