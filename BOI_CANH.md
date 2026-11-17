# Đại Phúc Khang — bối cảnh dự án

**Đọc file này trước khi sửa bất cứ thứ gì.** File ghi những quyết định không
đọc ra được từ mã nguồn. Mục mới nằm SAU mục cũ. Khi hai mục nói khác nhau,
mục sau thắng.

- Mã nguồn: <https://github.com/vickypham216-sys/daiphuckhang-pwa>
- Firebase project: **chưa tạo** (xem `TAO_FIREBASE.md`)
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

---

## 2. Cần Vicky trả lời trước khi dựng lõi

1. **Thất thoát cuối ngày ghi cho ai?** Ví dụ thiếu 3 vỏ và 200.000đ khi anh A
   lái xe 51C. Khoản đó ghi nợ anh A (người), hay treo trên xe 51C / chuyến?
   Câu trả lời quyết định cách đối soát cuối ngày và báo cáo công nợ.
2. Một xe có chạy **nhiều tuyến trong một ngày** không? Một tuyến có lúc cần
   **2 xe** không?
3. Có **phụ xe** không? Phụ xe có cần đăng nhập app không?
4. Có **một kho hay nhiều kho**?
5. Sản phẩm: chỉ bình có vỏ (cọc vỏ) hay có cả nước đóng chai / thùng?
6. Ai dùng app: Admin, kế toán, thủ kho, sales, tài xế. Có vai trò nào khác
   không?
