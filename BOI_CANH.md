# Đại Phúc Khang — bối cảnh dự án

**Đọc file này trước khi sửa bất cứ thứ gì.** File ghi những quyết định không
đọc ra được từ mã nguồn. Mục mới nằm SAU mục cũ. Khi hai mục nói khác nhau,
mục sau thắng.

- Mã nguồn: <https://github.com/vickypham216-sys/daiphuckhang-pwa>
- Firebase project: `daiphuckhang`, Firestore `asia-southeast1` (Singapore)
- App đang chạy: chưa có
- Cập nhật lần cuối: 17/11/2026

---

## 1. Quyết định đã chốt

### Firebase và dữ liệu tách riêng khỏi MIA Water (17/11/2026)

Vicky chốt: *"làm riêng vì đây là 2 công ty riêng biệt, nhân viên cũng khác
nhau"*.

- Mỗi công ty có **project Firebase riêng**, tài khoản đăng nhập riêng và
  hoá đơn Google Cloud riêng.
- **Không** thêm trường `congTy` vào dữ liệu. Cũng **không** viết luật bảo mật
  cho nhiều công ty dùng chung. Không có dữ liệu chung thì không có gì để lọc
  sai.
- Cần báo cáo gộp 2 công ty thì xuất số liệu từ 2 nơi về một chỗ. Không trộn
  database.

### Lấy MIA Water làm khung, nhưng thiết kế lại lõi vận hành (17/11/2026)

Dùng lại nền tảng của MIA: Vite + React + TypeScript, PWA, Firebase
Auth/Firestore, cách tạo chứng từ, cách phân quyền, cách tự deploy bằng GitHub
Actions.

**KHÔNG sao chép nguyên lõi vận hành của MIA.** Mô hình hai bên ngược nhau:

| | MIA Water | Đại Phúc Khang |
|---|---|---|
| Thứ cố định | Tài xế (gần như luôn chạy cùng một tuyến) | **Xe và tuyến** |
| Thứ thay đổi | — | **Tài xế được gán cho xe/tuyến theo từng ngày** |
| Đơn và khách gắn với | Tài xế | **Tuyến** |
| "Hàng trên xe" tính theo | Tài xế | **Xe (biển số)** |

Hệ quả cho thiết kế:

1. Thêm danh mục **Xe** (biển số, tải trọng) và **Tuyến** (danh sách khách,
   thứ tự giao).
2. Thêm **Phân ca hằng ngày**: *ngày + xe + tuyến → tài xế* (có thể thêm phụ
   xe). Mọi chứng từ trong ngày (xuất kho, giao hàng, trả hàng, nộp tiền) lấy
   tài xế từ phân ca. Người dùng không chọn lại tài xế trên từng phiếu.
3. Khách thuộc **tuyến**. App điền sẵn theo tuyến của khách, không theo "tài
   xế lần trước" như MIA.
4. Tồn hàng trên xe tính theo **xe**. Hôm đổi tài xế, hàng trên xe vẫn đúng.

### KHÔNG có tuyến cố định — đơn vị lõi là CHUYẾN (17/11/2026)

⚠️ **Thay phần "Xe và tuyến" ở mục trên.** Vicky trả lời: *"1 xe đi nhiều
tuyến trong 1 ngày. Tuyến đi không cố định. Mỗi ngày sẽ gán xe đi giao cho
các địa điểm nào. Có phụ xe, có thể có 2-3 phụ xe, chỉ có 1 kho."*

- **Không có danh mục Tuyến.** "Tuyến" chỉ là danh sách điểm giao của một
  chuyến, được lập mỗi ngày.
- **Chuyến** = ngày + xe + chuyến thứ mấy trong ngày + **tổ xe** (1 tài xế,
  0–3 phụ xe) + danh sách đơn/điểm giao. Tổ xe gắn với **chuyến**, không gắn
  với xe hay ngày. Lý do: giữa 2 chuyến trong ngày có thể đổi người.
- **Điều phối** (gán đơn vào chuyến) là màn hình trung tâm, dùng mỗi ngày.
  Màn này phải nhanh nhất app.
- Khách **không** thuộc tuyến hay tài xế nào. Thông tin điền sẵn lấy theo
  **khách** (địa chỉ, giá, phí ship lần trước).
- **Một kho.** Không cần chọn kho trên chứng từ.
- Mô hình chứng từ giữ như MIA, nhưng thay "tài xế" bằng "chuyến":
  ```
  Đơn hàng       →  MỘT khách
  Chuyến         →  MỘT xe, MỘT tổ xe, NHIỀU đơn
  Phiếu xuất kho →  MỘT chuyến                 →  trừ tồn kho, cộng hàng trên xe
  Phiếu giao     →  MỘT khách, trong một chuyến →  vỏ bình + tiền
  Phiếu trả hàng →  MỘT chuyến, khi về kho      →  cộng lại tồn kho
  ```

---

## 2. Cần Vicky trả lời trước khi dựng lõi

1. **Thất thoát ghi cho ai?** Chuyến về thiếu 3 vỏ và 200.000đ, tổ xe gồm tài
   xế A và phụ xe B, C. Khoản đó ghi nợ ai: tài xế, chia đều cả tổ, hay chỉ
   ghi nhận trên chuyến để Admin xử lý tay?
2. **Giữa 2 chuyến trong ngày, xe có về kho trả hàng thừa không?** Hay hàng
   thừa của chuyến 1 để luôn trên xe, xuất thêm cho chuyến 2? Nếu để luôn trên
   xe thì phải đối soát theo **xe + ngày**, không theo từng chuyến.
3. **Ai cầm tiền thu của khách?** Chỉ tài xế, hay phụ xe cũng thu?
4. **Phụ xe có đăng nhập app không?** Lương/thưởng của tài xế và phụ xe có
   tính theo chuyến hoặc sản lượng không? Nếu có, app phải ghi nhận tổ xe
   chính xác cho từng chuyến.
5. Ai làm **điều phối** (gán đơn vào xe) mỗi sáng: Admin, sales hay thủ kho?
6. Sản phẩm: chỉ bình có vỏ (cọc vỏ) hay có cả nước đóng chai / thùng?
7. Ai dùng app: Admin, kế toán, thủ kho, sales, điều phối, tài xế, phụ xe. Có
   vai trò nào khác không?

~~Đã trả lời 17/11: xe chạy nhiều tuyến/ngày; tuyến không cố định; có 2–3 phụ
xe; một kho.~~

---

## 3. Nhật ký

### Khung app (17/11/2026)

- Vite + React + TypeScript + PWA, nền giống MIA. Chưa có Cloud Functions.
- Cấu hình web Firebase để trong `.env` và **có commit**: các giá trị đó công
  khai trong mã app, không phải bí mật. MIA phải lấy cấu hình lúc build vì
  không commit; ở đây bỏ được bước đó.
- Đăng nhập email/mật khẩu. Hồ sơ `NguoiDung/{uid}` (ID trùng uid Auth) có
  `HoTen`, `VaiTro`, `TrangThai`. Vai trò tạm: Admin, ThuKho, Sales, TaiXe,
  PhuXe — chờ Vicky chốt.
- `firestore.rules`: mặc định từ chối; người dùng chỉ đọc hồ sơ mình, chỉ
  Admin sửa hồ sơ; danh mục SanPham / KhachHang / Xe: nhân viên đọc, Admin sửa.
- Chưa có icon/logo: điện thoại chưa hiện nút "Cài app".
- Đã thử: build OK; màn đăng nhập gọi tới Auth thật của project, sai mật
  khẩu báo đúng "Sai email hoặc mật khẩu".

### Vai trò, phụ xe, gói Blaze (17/11/2026)

Vicky: *"Có vai trò điều phối, sales, kế toán. Phụ xe cũng đăng nhập app. Có
nâng cấp gói blaze với budget limited."*

- Vai trò: **Admin, DieuPhoi, Sales, KeToan, ThuKho, TaiXe, PhuXe**. ThuKho
  giữ lại vì có một kho; Vicky chưa nói bỏ.
- **Phụ xe có tài khoản riêng.** Tổ xe trên chuyến lưu uid từng người, không
  lưu tên gõ tay.
- Gói **Blaze**: dùng được Cloud Functions → Admin tạo tài khoản nhân viên
  ngay trong app.
- ⚠️ **Budget trên Google Cloud chỉ GỬI CẢNH BÁO, không chặn chi tiêu.** Muốn
  chặn cứng phải tự viết hàm tắt billing, và tắt billing là app ngừng chạy
  giữa ngày. KHÔNG làm. Chống chi phí bất thường bằng cách viết truy vấn có
  giới hạn và theo dõi cảnh báo.
- Đổi `firestore.rules` (thêm vai trò) — Vicky cần dán lại vào Console.

### Đã xong phía Firebase (18/11/2026)

- Admin đầu tiên: `NguoiDung/xXudfeMxNoYj0Jn1G93GEUVcvxn2`, `HoTen` = Vicky.
- Project đã lên gói **Blaze**.

### Tự deploy bằng GitHub Actions (18/11/2026)

- `.github/workflows/deploy.yml`: build → deploy `firestore:rules` +
  `firestore:indexes` → deploy hosting. Chạy khi merge vào `main` hoặc bấm tay.
- **Khác MIA: luật bảo mật deploy tự động.** Lý do: Vicky đã quên dán luật
  (bản thêm DieuPhoi/KeToan) — luật dán tay sẽ lệch với repo. Mọi thay đổi
  luật vẫn qua PR được duyệt.
- Cấu hình web lấy từ `.env` có commit, không phải dò như MIA.
- Chưa deploy Cloud Functions. Khi có function, thêm bước + vai trò cho
  `github-deploy` (danh sách ở DEPLOY_DIEN_THOAI.md của MIA).
