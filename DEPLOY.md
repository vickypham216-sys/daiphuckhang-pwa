# Đưa app lên chạy thật — Đại Phúc Khang

## 1. Dán luật bảo mật (làm ngay, không cần máy tính có cài gì)

Database đang ở **Production mode**: từ chối mọi đọc/ghi. Chưa dán luật thì
đăng nhập được nhưng app báo "Tài khoản không có quyền truy cập".

1. Firebase Console → **Firestore** → tab **Rules**.
2. Xoá hết nội dung đang có, dán **toàn bộ** file `firestore.rules` trong repo.
3. Bấm **Publish**.

Mỗi lần Claude sửa `firestore.rules`, Claude sẽ nói rõ để dán lại.

## 2. Tạo tài khoản Admin đầu tiên

1. Firebase Console → **Security → Authentication** → tab **Users** →
   **Add user**. Nhập email và mật khẩu của Vicky.
2. Copy cột **User UID** của dòng vừa tạo (chuỗi dài kiểu `aB3x…`).
3. **Firestore** → tab **Data** → **Start collection**.
   - Collection ID: `NguoiDung` (đúng hoa thường)
   - Document ID: **dán User UID** ở bước 2 (KHÔNG bấm Auto-ID)
   - Thêm 2 field, kiểu **string**:
     - `HoTen` = tên hiển thị, ví dụ `Vicky`
     - `VaiTro` = `Admin`
   - Bấm **Save**.

Nhân viên khác về sau tạo trong app (màn Nhân viên), không cần làm tay.

## 3. Đưa giao diện lên web (Firebase Hosting)

Chưa làm. Khi khung app có màn dùng được, Claude sẽ cài GitHub tự deploy
giống MIA (`DEPLOY_DIEN_THOAI.md` bên MIA) để Vicky không cần laptop.
