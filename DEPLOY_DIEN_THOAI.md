# Deploy app từ điện thoại — không cần laptop

GitHub tự build và đưa app lên <https://daiphuckhang.web.app> (file
`.github/workflows/deploy.yml`):

- **Tự chạy** mỗi lần có thay đổi mã được merge vào `main`.
- **Bấm tay**: GitHub → repo `daiphuckhang-pwa` → tab **Actions** → **Deploy
  app** → **Run workflow**.

Mỗi lần chạy deploy **luật bảo mật Firestore** và **giao diện app**. Vicky
không phải dán luật vào Console nữa.

---

## Cài một lần (khoảng 10 phút, làm trên điện thoại được)

GitHub cần một "tài khoản máy" (service account) chỉ có quyền deploy, không
đọc hay sửa được dữ liệu khách, đơn, tiền.

### Bước 1 — Tạo tài khoản máy

1. Mở <https://console.cloud.google.com/iam-admin/serviceaccounts?project=daiphuckhang>
   (đăng nhập bằng tài khoản Google quản lý Firebase).
2. Bấm **+ Create service account**. Name: `github-deploy` → **Create and continue**.
3. Ở **Grant this service account access**, thêm **năm** vai trò (bấm **Add
   another role** sau mỗi vai trò):
   - `Firebase Hosting Admin`
   - `Firebase Rules Admin`
   - `Cloud Datastore Index Admin`
   - `Firebase Viewer`
   - `Service Usage Consumer`

   Bấm **Continue** rồi **Done**.

### Bước 2 — Lấy khoá JSON

1. Bấm vào `github-deploy@…` vừa tạo → tab **Keys** → **Add key** → **Create
   new key** → **JSON** → **Create**.
2. Máy tải về một file `.json`. Mở file, **chọn tất cả và sao chép** toàn bộ,
   từ dấu `{` đầu đến dấu `}` cuối.

### Bước 3 — Dán vào GitHub

1. Mở <https://github.com/vickypham216-sys/daiphuckhang-pwa/settings/secrets/actions/new>
   (trên điện thoại thì mở bằng trình duyệt, app GitHub không có mục này).
2. Name: `FIREBASE_SERVICE_ACCOUNT`
3. Secret: dán nội dung vừa sao chép → **Add secret**.
4. **Xoá file `.json` khỏi máy.** GitHub đã giữ khoá.

### Bước 4 — Chạy thử

Tab **Actions** → **Deploy app** → **Run workflow**. Chờ 3–5 phút tới dấu ✅
xanh, rồi mở <https://daiphuckhang.web.app> và đăng nhập.

Ra dấu ❌ đỏ: chụp màn hình bước bị đỏ gửi Claude.

---

## Nếu cần thu hồi

Nghi khoá bị lộ: vào trang ở Bước 1 → `github-deploy` → tab **Keys** → xoá
khoá. Deploy sẽ báo lỗi cho tới khi tạo khoá mới. Dữ liệu không bị ảnh hưởng.
