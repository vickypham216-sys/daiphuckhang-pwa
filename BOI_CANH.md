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

### Nhánh `main` (20/11/2026)

- `main` là nhánh mặc định, tạo từ nhánh làm việc đầu tiên. GitHub tự deploy
  khi merge vào `main`. Claude làm trên nhánh riêng, mở PR, Vicky duyệt.

### Deploy đầu tiên chạy được (20/11/2026)

- Lượt Actions #1 (bấm tay) ✅: build → luật + chỉ mục → hosting, tất cả xanh.
  Luật trên Console giờ là bản trong repo (có DieuPhoi, KeToan).
- App: <https://daiphuckhang.web.app>.
- Tài khoản máy `github-deploy` có 5 vai trò: Firebase Hosting Admin,
  Firebase Rules Admin, Cloud Datastore Index Admin, Firebase Viewer, Service
  Usage Consumer. Chưa có quyền Cloud Functions.
- Container Claude KHÔNG mở được daiphuckhang.web.app (proxy chặn) — muốn
  kiểm tra app thật thì nhờ Vicky.

### Màn Nhân viên + máy chủ (20/11/2026)

- **Đăng nhập bằng số điện thoại HOẶC email.** Tài xế, phụ xe phần lớn không
  dùng email. SĐT được đổi thành email nội bộ `<số>@daiphuckhang.web.app`
  (tên miền của chính app, không ai đăng ký được, không có hộp thư).
  Logic nằm DUY NHẤT ở `functions/src/nhanVienLogic.ts`; app import thẳng file
  đó (màn đăng nhập + màn Nhân viên) để hai bên không lệch.
- **Quên mật khẩu:** email thật → Firebase gửi mail (tiếng Việt). SĐT → báo
  "nhờ Admin đặt lại".
- Cloud Functions (`asia-southeast1`, callable): `taoNhanVien`,
  `datLaiMatKhau`, `doiTrangThaiNhanVien`. Đều chặn chỉ Admin.
  Ngưng tài khoản đi qua HÀM (khoá Auth + đăng xuất mọi máy + ghi TrangThai),
  không dùng trigger Firestore như MIA — trigger cần Eventarc, project mới
  hay vướng quyền.
- Luật `NguoiDung`: không ai tạo/xoá từ app (chỉ hàm); Admin chỉ sửa HoTen,
  VaiTro, SoDienThoai; **Admin không tự đổi vai trò mình** và không tự ngưng
  mình (lỡ tay là mất Admin).
- Mật khẩu tối thiểu 8 ký tự (MIA 10) — nhân viên gõ trên điện thoại.
- Đã thử trên Firebase giả lập (emulator): tạo tài xế bằng SĐT, tạo trùng
  báo lỗi, sửa tên, Admin không đổi được vai trò mình, tài xế đăng nhập bằng
  "+84 901 234 567", không thấy tab Nhân viên, quên mật khẩu SĐT, đặt mật khẩu
  mới, ngưng → tài xế bị chặn. Luật: Sales không tự nâng Admin, không đọc hồ
  sơ người khác; Admin không tạo hồ sơ tay, không sửa TrangThai thẳng; Sales
  gọi taoNhanVien bị từ chối.
- Chạy giả lập: `.env.local` với `VITE_USE_EMULATOR=true` và
  `VITE_FIREBASE_PROJECT_ID=demo-dpk`, rồi
  `npx firebase emulators:start --project demo-dpk` + `npx vite`.
- `github-deploy` cần thêm 5 vai trò (DEPLOY_DIEN_THOAI.md).

### Deploy máy chủ lần đầu (20/11/2026)

- PR #1 merge → Actions #2 ✅. 3 hàm tạo xong ở `asia-southeast1`. Firebase tự
  bật run, eventarc, extensions API và tự đặt chính sách xoá image cũ hơn 1
  ngày (đỡ tiền lưu trữ). Không cần thêm quyền build service account.
- `github-deploy` giờ có 10 vai trò (5 cũ + Cloud Functions Admin, Cloud Run
  Admin, Service Account User, Artifact Registry Administrator, Service Usage
  Admin).

### Báo có bản mới (20/11/2026)

Vicky merge màn Nhân viên, deploy ✅, mở app vẫn thấy bản cũ. Nguyên nhân:
`registerType: 'prompt'` mà không có code hỏi → bản mới nằm chờ mãi (MIA đã
dính lỗi này, quên chép sang). Thêm `src/BanMoi.tsx`: thanh vàng "Có bản app
mới · Cập nhật", và tự hỏi máy chủ mỗi 30 phút. Đã thử: build bản A, mở,
build bản B, tải lại → hiện thanh → bấm Cập nhật → ra bản B.

Máy đang giữ bản CŨ (chưa có BanMoi) phải tự thoát một lần: đóng HẾT tab/app
rồi mở lại, hoặc Ctrl+Shift+R. Từ bản này trở đi không cần nữa.

### Claude tự merge PR (20/11/2026)

Vicky: *"Next time bạn tự merge đi"*. Từ nay Claude tự merge PR vào `main` sau
khi build + test xanh, rồi theo dõi Actions tới ✅ và báo Vicky kết quả.

Vẫn HỎI Vicky trước khi merge khi:
- cần Vicky làm gì trên Google Cloud / Firebase trước (thêm quyền, bật dịch vụ);
- thay đổi xoá / chuyển đổi dữ liệu đã có, hoặc nới luật bảo mật;
- thay đổi quy tắc nghiệp vụ Vicky chưa chốt.
- 20/11: Vicky thử trên app THẬT: tạo tài xế bằng SĐT và đăng nhập được. Màn
  Nhân viên + 3 hàm máy chủ chạy đúng trên production.

### Sản phẩm, giữa chuyến, thất thoát (20/11/2026)

Vicky chọn:
- **Sản phẩm: bình có vỏ (cọc vỏ) + nước chai/thùng.** Sản phẩm có cờ `CoVo`:
  bình có vỏ thì phiếu giao phải ghi vỏ thu về / vỏ còn nợ / cọc; chai, thùng
  thì không. Không có bình bán đứt, không có đá/hàng khác (lúc này).
- **Giữa 2 chuyến: tuỳ chuyến.** Cuối mỗi chuyến chọn: *trả hết về kho* hoặc
  *để lại trên xe cho chuyến sau*. Vì vậy "hàng trên xe" tính theo **xe**,
  chạy liên tục qua các chuyến, không reset mỗi chuyến.
  → Đề xuất của Claude (chưa chốt): bắt buộc **đếm hàng + vỏ trên xe** mỗi khi
  hàng được để lại mà **tổ xe chuyến sau khác tổ chuyến trước**. Không đếm thì
  thiếu hụt không biết thuộc tổ nào.
- **Thất thoát: Admin xử lý tay.** App chỉ TÍNH và GHI chênh lệch (tiền, hàng,
  vỏ) trên chuyến, kèm tổ xe của chuyến đó. App KHÔNG tự trừ ai. Admin quyết
  định ghi nợ ai, bao nhiêu.

### Màn Xe, Sản phẩm, Khách hàng (20/11/2026)

- Một màn danh mục dùng chung (`src/screens/DanhMuc.tsx`), mỗi danh mục chỉ
  khai trường (`cauHinhDanhMuc.tsx`). **Không có nút xoá** — chứng từ cũ còn
  trỏ tới; thay bằng "Ngưng dùng". Luật cũng cấm xoá.
- **Xe** (Admin): biển số chuẩn hoá `51C-123.45` để so trùng ("51c 12345" =
  "51C-123.45"), tên gọi, chở tối đa, ghi chú.
- **Sản phẩm** (Admin): tên, đơn vị (Bình/Thùng/Lốc/Chai), giá bán mặc định,
  `CoVo` (có vỏ phải thu về), tiền cọc 1 vỏ (chỉ hiện khi CoVo).
- **Khách hàng** (Admin, **Sales, Điều phối** — người gặp khách mới): tên, SĐT
  (chuẩn hoá, báo trùng), địa chỉ giao (bắt buộc), ghi chú cho tài xế. Tìm
  kiếm không dấu ("nguyen" ra "Nguyễn"). Tài xế, phụ xe, kế toán, thủ kho chỉ
  đọc (chưa có tab; dùng ở màn sau).
- Chưa có: giá riêng theo khách, nhập khách từ Excel.
- Đã thử trên giả lập: thêm/trùng/ngưng cho cả 3; Sales thêm khách được, tài
  xế không thấy tab. Luật: Sales không tạo Xe/SanPham; tài xế không tạo khách;
  thiếu địa chỉ, giá âm, xoá, chưa đăng nhập đều bị chặn.

### Màn Đơn hàng (20/11/2026)

Vicky: *"Sales nhận đơn, sáng hôm sau điều phối gán xe"*.

- Tab **Đơn hàng** cho Admin, Sales, Điều phối. Mặc định xem đơn **ngày mai**
  (nút Hôm nay / Ngày mai, chọn ngày bất kỳ). Đầu danh sách có tổng số lượng
  theo sản phẩm — Điều phối/kho biết cần bao nhiêu hàng.
- Tạo đơn: tìm khách (không dấu) → bảng TẤT CẢ sản phẩm đang bán, gõ số lượng
  dòng cần → giá điền sẵn giá mặc định, **sửa được trên từng đơn**.
- Đơn **chụp lại** tên/địa chỉ/SĐT/ghi chú khách và tên/giá sản phẩm lúc tạo
  (`DonHang.Dong[]`). Đổi danh mục về sau không làm đổi đơn cũ.
- Trạng thái: `Moi` (Chờ gán xe) → `DaGan` → `DaGiao`; `Huy` kèm lý do bắt
  buộc. Chỉ sửa/huỷ khi còn `Moi`. Không xoá.
- Luật: chỉ Admin/Sales/Điều phối tạo; tạo phải là `Moi`, `ChuyenId` null,
  `TaoBoi` = mình; không tự gán xe từ màn này (để dành màn Điều phối).
- `npm run verify` (CI chạy trước deploy): ngày giờ VN, tổng tiền, kiểm tra
  đơn, biển số, logic nhân viên.
- **Chưa chốt: giá riêng theo khách** (đại lý vs khách lẻ). Hiện: giá mặc định,
  Sales sửa tay từng đơn.

### Màn Điều phối (20/11/2026)

Vicky: *"Giá giống nhau cho mọi khách, làm màn Điều phối đi"*. → **Không làm
giá riêng theo khách.** Giá mặc định của sản phẩm; Sales vẫn sửa tay được trên
từng đơn (khuyến mãi, làm tròn).

- Tab **Điều phối** (Admin, Điều phối). Mặc định **hôm nay** (đơn Sales nhập
  hôm qua cho ngày giao hôm nay).
- `Chuyen`: Ngay, XeId, BienSo, SoChuyen (tự đánh theo xe trong ngày, kể cả
  chuyến huỷ để số không bị dùng lại), TaiXe {uid, HoTen}, PhuXe[] (≤3),
  DonIds[] **theo thứ tự giao**, TrangThai, GhiChu.
  Trạng thái: `LapKeHoach` (Đang xếp đơn) → `DaXuatKho` → `DangGiao` →
  `HoanThanh`; `Huy`. App chỉ ghi `LapKeHoach`/`Huy`; các bước sau để máy chủ
  ghi ở màn Xuất kho.
- Tạo chuyến: chọn xe → **điền sẵn tổ xe của chuyến gần nhất của xe đó** (7
  ngày gần đây), đổi người thì sửa. Cảnh báo (không chặn) khi một người đang ở
  chuyến khác chưa xong cùng ngày.
- Gán đơn: tick đơn chờ → "Gán N đơn vào chuyến này". Một **transaction**: chỉ
  ghi khi chuyến còn LapKeHoach và mọi đơn còn Moi (hai người gán trùng thì
  người sau bị từ chối). Đơn được ghi `ChuyenId`, `TrangThai: DaGan`, `XeGan`
  ("51C-123.45 · C1" — Sales thấy đơn đi xe nào).
- Đổi thứ tự ↑↓, bỏ đơn ✕ (về lại "chờ"), sửa tổ xe, huỷ chuyến (chỉ khi
  không còn đơn). Cảnh báo **vượt sức chở** khi tổng số lượng > TaiTrong của xe.
- Luật: NguoiDung — Điều phối đọc được (để chọn người). DonHang — nhánh
  `ganHoacBoDon()` chỉ cho đổi ChuyenId/TrangThai/XeGan và kiểm `getAfter` của
  chuyến (còn LapKeHoach, DonIds khớp). Chuyen — không đổi ngày/xe/số chuyến,
  không tự đặt DaXuatKho, khoá khi đã xuất kho.
- Đã thử trên giả lập: đủ luồng trên; Sales thấy xe đã gán, không sửa được đơn
  đã gán. Luật: Sales không tạo chuyến; gán đơn mà chuyến không chứa đơn đó,
  sửa đơn đã gán, huỷ chuyến còn đơn, đổi xe, tự đặt "Đã xuất kho", sửa sau
  xuất kho, bỏ đơn khỏi chuyến đã xuất kho đều bị chặn.
