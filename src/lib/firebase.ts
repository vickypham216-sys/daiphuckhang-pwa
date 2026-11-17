// Khởi tạo Firebase. Cấu hình đọc từ .env (công khai, có commit — xem file đó).
import { initializeApp } from 'firebase/app'
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.projectId) {
  throw new Error('Thiếu cấu hình Firebase trong file .env')
}

export const app = initializeApp(firebaseConfig)

// Cache cục bộ (IndexedDB): mất sóng vẫn đọc/ghi được, có mạng lại thì tự
// đẩy lên. Đây là điều kiện bắt buộc cho tài xế chạy ngoài đường.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

// Chỉ nối emulator khi bật TƯỜNG MINH (.env.local). MIA đã từng để cứng
// emulator trong code và bản thật không đồng bộ đi đâu cả.
export const dungEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'
if (dungEmulator) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
