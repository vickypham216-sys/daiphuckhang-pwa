// Gọi Cloud Functions (callable). Dùng chung cho mọi màn.
import { getFunctions, httpsCallable, connectFunctionsEmulator, FunctionsError } from 'firebase/functions'
import { app, dungEmulator } from './firebase'

const fns = getFunctions(app, 'asia-southeast1')
if (dungEmulator) connectFunctionsEmulator(fns, '127.0.0.1', 5001)

export async function goi<T = unknown>(ten: string, duLieu: unknown): Promise<T> {
  return (await httpsCallable(fns, ten)(duLieu)).data as T
}

/** Lỗi từ máy chủ đã là câu tiếng Việt; lỗi mạng thì nói rõ là mạng. */
export function loiMayChu(e: unknown): string {
  if (e instanceof FunctionsError) {
    if (e.code === 'functions/unavailable' || e.code === 'functions/deadline-exceeded')
      return 'Không kết nối được máy chủ. Việc này cần có mạng — kiểm tra mạng rồi thử lại.'
    if (e.code === 'functions/internal' && e.message === 'internal') return 'Máy chủ gặp lỗi. Thử lại sau ít phút.'
    // SDK có lúc gắn mã HTTP vào cuối, vd "… [409]".
    return e.message.replace(/\s*\[\d{3}\]$/, '')
  }
  return (e as Error)?.message ?? String(e)
}
