# Tạo Firebase project cho Đại Phúc Khang

Vicky làm một lần, trên máy tính hoặc điện thoại, khoảng 10 phút. Claude chạy
trên cloud nên không có quyền vào Firebase, phải nhờ Vicky làm bước này.

1. Mở <https://console.firebase.google.com> và đăng nhập bằng tài khoản Google
   sẽ quản lý app.
2. Bấm **Create a project**.
   - Tên: `daiphuckhang` (nếu ID `daiphuckhang` đã có người dùng, Firebase sẽ
     tự thêm đuôi; ghi lại **Project ID** thật).
   - Google Analytics: **tắt** (không cần).
3. Vào **Build → Firestore Database → Create database**.
   - Location: **`asia-southeast1` (Singapore)**, giống MIA. ⚠️ Chọn rồi
     không đổi được.
   - Chế độ: **Production mode**.
4. Vào **Build → Authentication → Get started** và bật **Email/Password**.
5. Vào **Project settings (bánh răng) → General → Your apps** và bấm biểu
   tượng **Web `</>`**.
   - Tên app: `daiphuckhang-pwa`, tick **Also set up Firebase Hosting**.
   - Copy khối `firebaseConfig` hiện ra và gửi cho Claude. Khối này **không
     phải bí mật**: nó nằm công khai trong mã app web, dữ liệu được bảo vệ
     bằng luật bảo mật Firestore.
6. Nâng lên gói **Blaze** (trả theo dùng) khi cần Cloud Functions. Đặt
   **budget alert** ở mức thấp (ví dụ 5 USD/tháng) để Google báo khi vượt.

Xong thì gửi Claude **Project ID** và khối **firebaseConfig**.
