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

### Kho, giao hàng, tiền, vỏ — trả lời của Vicky (20/11/2026)

*"mua từ nhà cung cấp, có trường hợp cho xe mang thêm hàng dư để bán cho khách
gọi dọc đường, cho tài xế tạo đơn tại chỗ, có khách ghi nợ trả sau, Khách chưa
trả vỏ thì ghi nợ vỏ hay thu tiền cọc"*

- Hàng **mua từ nhà cung cấp** → cần phiếu nhập hàng (+ tồn kho).
- Xuất kho có thể **nhiều hơn tổng đơn** (hàng dư để bán dọc đường) → phiếu
  xuất ghi số THỰC xuất, không mặc định bằng tổng đơn.
- **Tài xế tạo đơn tại chỗ** (khách gọi dọc đường) → lấy từ hàng dư trên xe.
- **Có khách ghi nợ** → cần sổ công nợ tiền theo khách.
- Vỏ: câu trả lời lặp lại câu hỏi — Claude hiểu là **tuỳ khách: hoặc ghi nợ
  vỏ, hoặc thu tiền cọc**, chọn trên từng lần giao. CHỜ Vicky xác nhận.
- 20/11 Vicky xác nhận: **vỏ thiếu → tuỳ khách, chọn mỗi lần giao** (nợ vỏ
  HOẶC thu cọc). **NCC đổi vỏ 1-1**: giao N bình đầy, lấy lại vỏ rỗng — app
  theo dõi vỏ rỗng trong kho và vỏ công ty đang nợ NCC. **Thu tiền: tiền mặt
  cho tài xế, chuyển khoản, ghi nợ trả sau.**

### Kế hoạch phần kho → giao → đối soát (Claude đề xuất 20/11)

Nguyên tắc như MIA: **tồn kho, vỏ, công nợ là số tài chính — chỉ máy chủ
ghi.** App gửi phiếu; Cloud Function kiểm tra và cộng/trừ trong transaction.

1. **Kho + Nhập hàng** — danh mục NCC; tồn đầu kỳ; phiếu nhập (đầy +, vỏ rỗng
   trả NCC −, nợ vỏ NCC ±). Thủ kho có mạng → hàm gọi trực tiếp (callable).
2. **Xuất kho theo chuyến** — số thực xuất (có thể > tổng đơn); tồn kho −,
   hàng trên xe +; chuyến → DaXuatKho (khoá điều phối).
3. **Giao hàng (tài xế, phải chạy KHI MẤT SÓNG)** — phiếu giao từng khách: số
   giao, vỏ thu, nợ vỏ/cọc, tiền mặt/CK/nợ; đơn tại chỗ từ hàng dư.
4. **Kết thúc chuyến** — đếm hàng dư, vỏ, tiền nộp → chênh lệch ghi nhận cho
   Admin xử lý tay; chọn trả kho hoặc để lại trên xe.
5. **Công nợ khách** (tiền, vỏ, cọc) + thu nợ.

### Bước 1: Kho + Nhập hàng (20/11/2026)

- Tab **Kho** (Admin, Thủ kho; Kế toán chỉ xem). Ba mục: Tồn kho · Phiếu nhập
  · Nhà cung cấp (Admin).
- `TonKho/{sanPhamId}`: `Day` (hàng đầy), `VoRong` (vỏ rỗng, chỉ CoVo).
  `NoVoNCC/{nccId__spId}.SoVo`: vỏ công ty nợ NCC (âm = NCC nợ lại).
  `PhieuNhap`, `DieuChinhTon` (vết). **App KHÔNG ghi được** mấy collection này.
- Hàm `nhapHang` (Admin, Thủ kho): một transaction — kiểm NCC, lấy CoVo từ
  danh mục (không tin app), chặn trả NCC nhiều vỏ hơn vỏ rỗng đang có, ghi
  phiếu + tồn + nợ vỏ. Vỏ trả NCC **tự điền = số nhập** (đổi 1-1), sửa được.
- Hàm `datTonKho` (Admin): đặt tồn đầu kỳ / điều chỉnh sau kiểm kho, **bắt
  buộc lý do**, ghi `DieuChinhTon` (trước → sau, ai, khi nào).
- Logic thuần ở `functions/src/khoLogic.ts` + test.
- `src/lib/goiMayChu.ts`: gọi callable + đổi lỗi thành câu tiếng Việt (dùng chung).
- Đã thử trên giả lập: tồn đầu kỳ 50 đầy/120 vỏ → nhập 100 đầy, trả 90 vỏ
  → 150 đầy/30 vỏ, nợ NCC 10 vỏ; trả 150 vỏ bị chặn. Thủ kho không thấy mục
  NCC, không ghi thẳng TonKho/PhieuNhap, không gọi datTonKho; Sales không đọc
  phiếu nhập, không gọi nhapHang.
- Chưa có: công nợ TIỀN với NCC (trả tiền nhập hàng), trả vỏ NCC riêng lẻ
  (không kèm nhập) — làm khi cần.

### Bước 2: Xuất kho + tài xế nhận hàng (20/11/2026)

Vicky: *"Có, tài xế bấm đã nhận đủ hàng"*.

- **Kho → Xuất kho** (Admin, Thủ kho): danh sách chuyến trong ngày. "Lập phiếu
  xuất" tự điền = tổng đơn của chuyến; sửa lên để mang **hàng dư** (app ghi
  "dư N để bán thêm"). **Chặn xuất ít hơn tổng đơn** (thiếu thì bỏ bớt đơn ở
  Điều phối) và chặn xuất quá tồn kho.
- Hàm `xuatKho`: `PhieuXuat/{chuyenId}` (id = mã chuyến → không xuất 2 lần),
  tồn kho −, `TrenXe/{xeId}.Hang` + (hàng đầy trên xe, theo XE, cộng dồn qua
  chuyến), chuyến → `DaXuatKho` (điều phối bị khoá). Lấy tên/CoVo từ danh mục
  và tổng đơn từ DonHang trên máy chủ, không tin số app gửi.
- Hàm `huyXuatKho` (đếm sai): chỉ khi tài xế CHƯA nhận; trả hàng về kho, trừ
  khỏi xe, chuyến về `LapKeHoach`; phiếu chép sang `PhieuXuatHuy` kèm lý do.
- Hàm `nhanHang`: **chỉ tài xế của chuyến** (hoặc Admin) — phụ xe không bấm
  được. Phiếu → `DaNhan` (ai, lúc nào); chuyến → `DangGiao`. Hộp xác nhận liệt
  kê lại số hàng, nhắc đếm lại.
- Tab **Chuyến của tôi** (Tài xế, Phụ xe — mở app là vào thẳng tab này): chuyến
  trong ngày có mình, hàng xuất kho, nút "Đã nhận đủ hàng", thứ tự giao (địa
  chỉ, bấm số gọi điện, ghi chú).
- `src/lib/nghe.ts`: hook nghe Firestore dùng chung (`useNghe`, `useNgheMot`).
- Đã thử trên giả lập: tự điền 18; xuất 15 bị chặn; xuất quá tồn bị chặn; xuất
  25+3 → tồn 75/7; huỷ → tồn về 100/10; xuất lại 20; phụ xe không có nút và
  máy chủ cũng từ chối; tài xế khác không thấy chuyến; tài xế nhận → Đang giao;
  kho thấy đã nhận, hết nút huỷ; xuất lần 2 / huỷ sau nhận / tài xế gọi
  xuatKho đều bị máy chủ từ chối.
- 20/11: PR #7 deploy ✅ (Actions #8).

### Giao hàng — Vicky chốt trước khi làm bước 3 (20/11/2026)

- **Tài xế ĐƯỢC giảm giá khi giao, bắt buộc ghi lý do**; app ghi lại để Admin
  xem (giá gốc theo đơn vs giá giao).
- **Chuyển khoản: app hiện mã QR đúng số tiền**; tài xế ghi "khách đã CK";
  **kế toán đối chiếu sao kê rồi bấm xác nhận**. Cần số tài khoản công ty.
- **Khách nhận ít hơn đơn: cho sửa số giao, bắt buộc lý do.** Hàng không giao
  vẫn nằm trên xe, cuối chuyến đếm lại.

### Bước 3: Giao hàng + Kế toán (23/11/2026)

Vicky: *"Không giới hạn, mỗi tối Admin soát danh sách giảm giá"*.

- **Chuyến của tôi → nút "Giao"** trên từng khách (chuyến `DangGiao`). Form:
  số giao + đơn giá (mặc định theo đơn), "Không giao được", lý do giao thiếu /
  giảm giá (bắt buộc khi có), **vỏ thu về** (mặc định = số giao; thiếu thì
  chọn "Nợ N vỏ" hoặc "Thu cọc"; thu dư = trả nợ vỏ cũ), **thu tiền**: Tiền mặt
  / Chuyển khoản (hiện **mã VietQR dựng trên máy**, không cần mạng) / Ghi nợ /
  Chia. Không cho giá giao cao hơn giá đơn.
- **Đơn tại chỗ** (+ Đơn tại chỗ): chọn khách trong danh sách hoặc **khách lẻ**
  (khách lẻ không ghi nợ được); chỉ bán trong số **hàng còn trên xe** = xuất −
  đã giao của chuyến (chưa tính hàng để lại từ chuyến trước — bước 4).
- **Chạy khi mất sóng**: ghi bằng `writeBatch` (PhieuGiao + DonHang → DaGiao /
  KhongGiao), KHÔNG await, không gọi máy chủ. Màn hình báo "⏳ N phiếu đang lưu
  trên máy" tới khi gửi xong. ⚠️ Xoá dữ liệu trình duyệt / đóng tab ẩn danh khi
  còn phiếu chưa gửi là MẤT phiếu (đã thấy khi thử).
- `PhieuGiao/{donId}` (đơn tại chỗ: id tự sinh) = **sổ gốc, không sửa, không
  xoá**. Quy tắc dùng chung app + máy chủ: `functions/src/giaoLogic.ts`.
- Luật: chỉ người có trong `Chuyen.ToXeUids` (máy chủ đặt lúc xuất kho; Điều
  phối ghi khi tạo/sửa tổ xe) và chuyến đang `DangGiao`; TaoBoi = mình; tiền
  mặt + CK + nợ = PhaiThu; CK > 0 thì `CK.TrangThai = ChoXacNhan`; phiếu theo
  đơn phải đúng chuyến. Đơn chỉ chuyển DaGiao/KhongGiao khi phiếu có thật
  (`existsAfter`). Chỉ Kế toán/Admin sửa được trường `CK`.
- Tab **Kế toán** (Admin, Kế toán): *Chuyển khoản chờ xác nhận* (Đã thấy tiền
  / Không thấy), *Soát giảm giá* theo ngày (giá gốc → giá giao, tổng tiền
  giảm, lý do) + giao thiếu / không giao, *Tài khoản nhận CK* (Admin; lưu
  `CaiDat/ThanhToan`, hiện QR thử 1.000đ để quét kiểm tra tên).
- Đã thử trên giả lập: đủ / thiếu + giảm giá + cọc + CK (QR 238.000đ) / không
  giao / ghi nợ — 2 phiếu ghi lúc MẤT SÓNG tự gửi khi có sóng; đơn tại chỗ quá
  hàng bị chặn; khách lẻ ghi nợ bị chặn; kế toán xác nhận CK; soát giảm giá.
  Luật: tài xế ngoài tổ, tiền không khớp, giả TaoBoi, sửa/xoá phiếu, tự xác
  nhận CK, đặt đơn Đã giao không phiếu, sửa tài khoản CK đều bị chặn.
- CHƯA: công nợ khách cộng dồn, hàng/vỏ/tiền cuối chuyến → bước 4.

### Kết thúc chuyến — Vicky chốt (23/11/2026)

*"Kế toán nhận tiền mặt, có bắt buộc đếm khi đổi tổ"*.
- Tài xế nộp tiền mặt cho **Kế toán**; kế toán bấm xác nhận số thực nhận.
- Hàng để lại trên xe mà **chuyến sau khác tổ → bắt buộc đếm**. Cùng tổ chạy
  tiếp thì được bỏ qua đếm.

### Bước 4: Kết thúc chuyến + nộp tiền + công nợ (23/11/2026)

- **Tài xế**: hết khách chưa ghi (khách không nhận vẫn phải ghi "Không giao
  được") → nút **🏁 Xong giao, về kho** (ghi từ máy tài xế, chạy cả khi mất
  sóng). Firestore gửi lệnh theo đúng thứ tự, nên khi máy chủ thấy `VeKho` thì
  mọi phiếu giao ghi trước đó cũng đã tới. Sau `VeKho` luật chặn ghi thêm phiếu.
- **Thủ kho** (Kho → Xuất kho, thẻ chuyến "Về kho"): **ĐẾM MÙ** — không hiện
  số phải có. Chọn *Trả hết về kho* (luôn đếm) hoặc *Để lại trên xe* (Vicky:
  chuyến sau khác tổ → bắt buộc đếm; cùng tổ → được bỏ qua; chưa có chuyến sau
  → bắt buộc). `functions/src/ketThucLogic.ts batBuocDem`.
- Hàm `ketThucChuyen`: số phải có = TrenXe (để lại + xuất) − giao; vỏ = để lại
  + thu; tiền mặt = Σ TienMat. Ghi `DoiSoatChuyen/{chuyenId}` (phải có, đếm,
  chênh lệch, tiền phải nộp). Trả kho → TonKho +, TrenXe về 0; để lại → TrenXe
  = số đếm. Cộng `CongNoKhach/{khachId}` (NoTien, NoVo theo sp — thu dư vỏ
  trừ nợ cũ, CocVo, TienCoc). Khách lẻ không vào công nợ. Chuyến → HoanThanh,
  `NopTien {ChoNop, PhaiNop}`. Chặn khi còn đơn chưa có phiếu trên máy chủ.
- `xuatKho` mới: chặn xuất khi xe còn chuyến khác chưa kết thúc; phiếu xuất
  ghi `DauChuyen` (hàng/vỏ để lại) → tài xế bán được cả hàng để lại.
- **Kế toán → Tiền mặt**: chuyến chờ nộp, nhập số thực nhận → ghi chênh lệch
  (Admin xử lý tay). **Kế toán → Công nợ**: nợ tiền, nợ vỏ, cọc theo khách.
- Đã thử trên giả lập (luồng đầy đủ): xuất C2 khi C1 chưa xong bị chặn; về kho
  lúc mất sóng; đếm bắt buộc (C2 khác tổ); chênh lệch đầy −1, vỏ −2; TrenXe
  9 bình (4 để lại + 5) + 2 thùng, 15 vỏ; tài xế C2 thấy hàng để lại; kế toán
  nhận 290k/300k → thiếu 10k; công nợ Quán B 200k + 3 vỏ. Luật: người ngoài tổ
  báo về kho, tài xế tự chốt / sửa NopTien / đọc công nợ, kế toán ghi công nợ
  thẳng, ghi phiếu sau khi chốt đều bị chặn.
- CHƯA: thu nợ khách (tiền, vỏ, hoàn cọc), báo cáo.

### Nhập công nợ đầu kỳ (23/11/2026)

Vicky: *"Làm nhập công nợ đầu kỳ trước"* (trước thu nợ, để chuẩn bị chạy thử).

- **Kế toán → Công nợ → "Nhập công nợ đầu kỳ (dán từ Excel)"** (chỉ Admin).
  Cột cố định: Tên | SĐT | Địa chỉ | Nợ tiền | Nợ vỏ <mỗi SP có vỏ> | Vỏ cọc
  <mỗi SP có vỏ> | Tiền cọc. Nút 📋 chép dòng tiêu đề để dán vào Excel. Xem
  trước từng dòng: Có rồi / Tạo mới / Trùng tên. Ô dán khoá tới khi tải xong
  danh mục (dán sớm thì cột vỏ bị lệch — đã thấy khi thử).
- Tìm khách: SĐT trùng trước, rồi tên trùng DUY NHẤT; không có → **tạo khách
  mới** (thiếu địa chỉ thì ghi "(chưa có địa chỉ)"). Excel ăn số 0 đầu SĐT →
  tự thêm lại.
- Hàm `nhapCongNoDauKy`: đầu kỳ lưu riêng `CongNoKhach.DauKy`; tổng = tổng
  hiện tại − đầu kỳ cũ + đầu kỳ mới → **nhập lại là THAY, không cộng dồn**, và
  không mất phần phát sinh qua chuyến. Vết: `DieuChinhCongNo`. Một khách hai
  dòng trong cùng lần dán → bỏ dòng sau, báo lỗi.
- Logic: `functions/src/dauKyLogic.ts` + test.
- Đã thử: khách có sẵn (nợ phát sinh 200k + 1 vỏ) + đầu kỳ 1tr/5 vỏ → 1,2tr/6;
  nhập lại 800k/4 vỏ → 1tr/5 (đúng, không cộng dồn); khách mới được tạo kèm
  cọc 2 vỏ / 100k; SĐT sai báo lỗi dòng.

### Thu nợ khách (23/11/2026)

Vicky: *"Làm thu nợ khách tiếp đi"*.

- `PhieuThu`: TienMat, ChuyenKhoan, TraVo {sp: n} (vỏ trả nợ), HoanCocVo
  {sp: n} + TienHoanCoc (công ty trả lại tiền cọc), KhachHangId (bắt buộc —
  khách lẻ không có nợ), Nguon `TaiXe` | `VanPhong`, DaGhiSo.
- **Tài xế** (Chuyến của tôi → **+ Thu nợ**): thấy nợ hiện tại của khách (số
  trên máy chủ, chưa tính chuyến đang chạy), nhập tiền mặt / CK (QR) / vỏ / trả
  vỏ cọc (hoàn = số vỏ × giá cọc hiện hành, không vượt tiền cọc đang giữ). Ghi
  bằng writeBatch → **được khi mất sóng**. Tiền mặt thu − hoàn cọc cộng vào số
  phải nộp; vỏ thu vào số vỏ phải có trên xe; `ketThucChuyen` áp vào công nợ
  và đánh dấu DaGhiSo.
- **Văn phòng** (Kế toán → Công nợ → bấm dòng khách, hoặc + Thu nợ): hàm
  `thuNoVanPhong` (Admin, Kế toán) áp ngay; CK tại văn phòng coi như đã thấy.
- Chặn thu quá nợ tiền / nợ vỏ / vỏ đang cọc (`thuNoLogic.ts`).
- **Xác nhận chuyển khoản chuyển sang máy chủ** (`xacNhanCK`, cho cả phiếu giao
  và phiếu thu): **"Không thấy" → CỘNG LẠI số đó vào nợ khách** (khách lẻ: chỉ
  đánh dấu). Luật cấm app sửa trường CK của PhieuGiao nữa. Thứ tự "Không thấy"
  trước hay sau lúc chốt chuyến đều ra cùng kết quả.
- Tài xế / phụ xe được ĐỌC CongNoKhach (để nhắc khách).
- Đã thử trên giả lập: khách nợ 500k / 4 vỏ / cọc 2 vỏ 100k → tài xế thu 200k
  TM + 100k CK + 3 vỏ + hoàn cọc 1 vỏ (50k) lúc MẤT SÓNG → chốt chuyến: tiền
  phải nộp 400k (250k giao + 200k − 50k), vỏ khớp 14 → nợ còn 200k / 1 vỏ /
  cọc 1 vỏ 50k → kế toán "Không thấy" CK 100k → nợ 300k → thu văn phòng 300k
  + 1 vỏ → 0. Luật/hàm: phiếu thu sau chốt, sửa phiếu thu, sửa CK thẳng, tài xế
  gọi thu văn phòng, thu quá nợ đều bị chặn.

### Báo cáo doanh thu (23/11/2026)

Vicky: *"Làm báo cáo doanh thu tiếp đi. Lưu ý check UX/UI như đã làm cho app
mia water"*.

- Tab **Báo cáo** (Admin, Kế toán). Nguồn duy nhất: `PhieuGiao` (sổ gốc).
  **Doanh thu = Σ số giao × đơn giá giao** (đã trừ giảm giá, KHÔNG gồm cọc;
  CK "Không thấy" vẫn là doanh thu — khách chuyển sang nợ). Logic thuần
  `src/lib/baoCao.ts` + `scripts/kiemTraBaoCao.ts` (trong verify).
- Kỳ: Hôm nay / Hôm qua / 7 ngày / Tháng này / Tháng trước / Tuỳ chọn (tối đa
  93 ngày — đọc thẳng phiếu, chưa có bảng tổng hợp sẵn). **So với kỳ trước**
  cùng số ngày; "Tháng này" so với CÙNG SỐ NGÀY đầu tháng trước (bài học MIA:
  so cả kỳ thì đầu kỳ luôn "giảm"). Tăng: xanh ▲; giảm: XÁM ▼ (không đỏ).
- Ô số: Doanh thu · Sản lượng theo đơn vị · Lượt giao (bán tại chỗ, không
  giao được) · Giảm giá (% giá gốc). Thu tiền: tiền mặt / CK / ghi nợ (thanh
  tỉ lệ + bảng; dòng "trong đó cọc vỏ").
- Biểu đồ cột (`components/BieuDoCot.tsx`) theo skill dataviz: 1 chuỗi, màu
  `--chinh` (validate_palette PASS), cột ≤ 24px bo 4px đầu, lưới 1px, trục y
  0/nửa/trần tròn ("2,5tr"), ≤ 7 nhãn x + nhãn cuối canh phải (bỏ nhãn quá sát
  nhãn cuối — đã thấy chồng "21/23/11"), chạm/rê → dòng chi tiết, "Xem dạng
  bảng". > 45 ngày thì gom theo tuần (thứ Hai). 3 màu thanh thu tiền
  (#0f5c8c, #e07a1f, #8a5cd1) chạy validate_palette PASS.
- Bảng: theo sản phẩm, theo xe, theo người nhận đơn (Sales — ghép DonId →
  DonHang.TenNguoiTao; đơn tại chỗ = "Bán tại chỗ"), top 10 khách (Xem tất cả).
- **Đo bằng máy ở 375 / 768 / 1280px** (`scratchpad bc.cjs`): tràn ngang, ô
  bấm < 44px, chữ bị cắt. Sửa: con của lưới phải `min-width: 0` (svg + dải
  chip đẩy thẻ tràn 11px ở 375px); số doanh thu không gãy "đ" xuống dòng.

### Báo cáo tồn kho & vỏ (23/11/2026)

Vicky: *"Làm báo cáo tồn kho và vỏ tiếp đi"*.

- Tab **Báo cáo** có 2 mục: Doanh thu (Admin, Kế toán) · **Tồn kho & vỏ**
  (Admin, Kế toán, **Thủ kho** — thủ kho chỉ thấy mục này).
- **Hàng & vỏ hiện tại** (ảnh chụp từ sổ máy chủ), mỗi sản phẩm một thẻ:
  kho đầy, trên xe đầy; với SP có vỏ: vỏ rỗng kho / xe, khách nợ vỏ, khách
  cọc vỏ → **vỏ đang lưu hành**; trừ nợ vỏ NCC → **vỏ của công ty**. "Trên xe"
  = số lúc xuất kho / chốt gần nhất (chưa trừ hàng đang giao dở) — có ghi chú.
- **Nhập – xuất – tồn theo kỳ** (≤ 93 ngày lùi): dựng NGƯỢC từ tồn hiện tại:
  cuối kỳ = hiện tại − biến động sau kỳ; đầu kỳ = cuối − biến động trong kỳ.
  Biến động = PhieuNhap (đầy +, vỏ − trả NCC), PhieuXuat (đầy −), DoiSoatChuyen
  trả kho (đầy +, vỏ +), DieuChinhTon (± theo trước/sau). ⚠️ **Thêm chứng từ
  mới làm đổi TonKho thì PHẢI thêm vào `bienDongTu()`**, không thì XNT lệch.
  Huỷ xuất kho = phiếu bị xoá + hàng trả lại → tự triệt tiêu.
- **Hao hụt khi chốt chuyến** trong kỳ (Σ chênh lệch đầy / vỏ, danh sách chuyến
  lệch) + **khách giữ nhiều vỏ nhất**.
- `src/lib/baoCaoKho.ts` + `scripts/kiemTraBaoCaoKho.ts` (dựng lại lịch sử 5
  ngày, khớp từng bước). Luật: Thủ kho được đọc CongNoKhach, DieuChinhTon.

### Rà UX toàn app (23/11/2026)

Vicky: *"check UX/UI của toàn bộ app, prefer như app mia water"*.

- `scripts/raUX.cjs` (Playwright): 3 vai trò (Admin, Tài xế, Sales) × mọi tab
  × các mục / form mở (Giao, Thu nợ, Đơn tại chỗ, Tạo đơn, Nhập hàng…) × **375
  / 768 / 1280px**. Đo: tràn ngang, phần tử ra ngoài khung, **vùng chạm < 44px**,
  chữ bị cắt, **tương phản < 4,5:1** (chữ thường) / 3:1 (chữ lớn). Lưu ảnh 375px.
  Dữ liệu mẫu đủ trạng thái: chuyến đang giao / lập kế hoạch / chờ nộp tiền,
  phiếu CK chờ, giảm giá, công nợ, tên khách + địa chỉ dài.
- Máy đo thấy (đã sửa): nút phụ 36px, ô ngày 40px, ô số 42px, SĐT bấm-gọi 17px
  (`a.goi`), ô tick 26px → tất cả ≥ 44px. Không có tràn / cắt chữ / thiếu tương
  phản.
- Soi ảnh thấy (máy không bắt được, đã sửa): danh sách đơn trong chuyến bó
  thông tin khách vào nửa màn (chừa chỗ cho ↑↓✕ cả ở màn tài xế) → flex, khách
  chiếm hết bề ngang; nút "Lưu giao hàng" gãy 3 dòng → rộng gấp đôi Huỷ; 4 nút
  cách trả tiền xếp lưới 2×2 trên điện thoại. ⚠️ Đổi `<li>` sang flex làm MẤT số
  thứ tự của `<ol>` — đã tự đánh lại bằng CSS counter (thứ tự giao là thông tin
  chính của tài xế).

### Tổng quan — Trang chủ (23/11/2026)

Vicky: *"Làm Tổng quan trước đi"* (trước khi chạy thử thật).

- Tab đầu tiên đổi tên **Tổng quan** (mọi vai trò trừ Tài xế / Phụ xe — tài xế
  chỉ còn MỘT tab "Chuyến của tôi", không hiện dải tab).
- **Hôm nay**: Doanh thu so với **hôm qua CÙNG GIỜ** (giờ ghi phiếu = `GioMay`
  trên máy tài xế, không có thì `TaoLuc`; `src/lib/tongQuan.ts cungGioHomQua`),
  lượt giao, tiền mặt đã thu (+ CK, nợ), đơn cho ngày mai.
- **Cần xử lý** — chỉ hiện việc đang có, theo vai trò, mỗi dòng **bấm là tới
  đúng màn + đúng mục**: đơn hôm nay chưa gán xe → Điều phối; chuyến chưa xuất
  kho, xe về chờ chốt → Kho/Xuất kho; chuyến chờ nộp tiền, CK chờ xác nhận,
  giảm giá cần soát → Kế toán (đúng mục); chuyến chốt bị lệch → Báo cáo/Tồn kho
  & vỏ. Việc gấp (vàng): chưa gán xe, chưa xuất, xe về chờ chốt. Không có việc:
  "✔ Không có việc nào đang chờ".
- Điều hướng: `App.di(man, muc)` → `mucBanDau` cho Kho / Kế toán / Báo cáo,
  `key` đổi theo lượt bấm để màn gắn lại đúng mục.
- **Chuyến hôm nay**: trạng thái + thanh tiến độ "đã giao x/y khách".
- Kho → Xuất kho nay hiện cả **chuyến "Về kho" của NGÀY KHÁC** (quên chốt hôm
  qua) — không thì Tổng quan trỏ tới mà không thấy.
- Chỉ đọc dữ liệu hôm nay / việc đang treo (không nạp lịch sử). Sales không
  đọc được DoiSoatChuyen — Tổng quan trỏ vào truy vấn rỗng cho vai trò đó.
- Đã thử: 4 vai trò; 6 lối bấm từ "Cần xử lý"; `scripts/raUX.cjs` (nay gồm
  Tổng quan của Admin, Sales, Thủ kho, Kế toán) — không lỗi ở 375/768/1280.

### Giao diện theo chuẩn MIA (23/11/2026)

Vicky (gửi ảnh màn đăng nhập + Tổng quan MIA): *"Update UX/UI, tôi thấy chưa
đẹp và tối ưu như bên app mia water"*.

- **Hệ màu = MIA** (Xanh hoàng gia: đầu trang #1e40af, nút #2563eb, thanh tab
  #173d80, vàng nhấn #f2bb58). **Hai bộ theo VAI TRÒ** (`data-giaodien` trên
  `<html>`): tài xế / phụ xe = **"Sổ Kho"** (nền kẻ ô, góc vuông, viền đậm, chữ
  gần đen — dưới nắng); còn lại = **"Nhãn Chai"** (bo 18px, nút viên thuốc,
  viền nhạt). Class chỉ dùng biến (`--chinh`, `--the`, `--bo-the`, `--bo-nut`…).
- **Đầu trang**: logo · "Đại Phúc Khang" · "Tên · Vai trò"; viên **Có mạng /
  Mất mạng**; nút **AA** (chữ to 115%, nhớ trên máy); **In** (chỉ màn rộng);
  Đăng xuất.
- **Thanh tab có biểu tượng** (SVG vẽ tay, `components/BieuTuong.tsx`, không
  tải ngoài): điện thoại = neo ĐÁY, viên vàng bọc biểu tượng mục đang mở; từ
  900px = menu NGANG dưới đầu trang, gạch vàng dưới mục đang mở.
- Admin còn **7 tab**: Tổng quan · Điều phối · Đơn hàng · Kho · Kế toán · Báo
  cáo · **Danh mục** (gom Khách hàng, Sản phẩm, Xe, Nhân viên, Nhà cung cấp —
  như "Quản trị" bên MIA; có "‹ Danh mục" để quay về). NCC chuyển từ Kho sang
  Danh mục. Sales / Điều phối giữ tab Khách hàng riêng.
- **Đăng nhập** như MIA: nền xanh nhạt + hai vòng giọt nước; nhãn chữ hoa giãn;
  ô nền nhạt; "Hiện" mật khẩu; "Vào hệ thống"; dòng "Lần đầu cần có mạng…".
  Từ 900px chia đôi: giới thiệu trái, form phải.
- Tổng quan: thẻ "Hôm nay" chứa 4 ô số nền xanh nhạt; "Cần xử lý" và "Chuyến
  hôm nay" chia 2 cột ở màn rộng. Bảng: tiêu đề cột chữ hoa nhỏ, nền nhạt.
- **Logo tạm** (giọt nước) + bộ **icon PWA** (`scripts/taoIcon.mjs`, maskable
  riêng) → điện thoại có nút "Cài app". CÓ LOGO THẬT thì thay SVG trong
  `BieuTuong.tsx` + `taoIcon.mjs`.
- Rà máy (`scripts/raUX.cjs`, nay chọn tab bằng `.tabbar`): sửa ô chọn NCC tên
  dài tràn 11px; nhãn "Tổng quan" bị cắt ở 7 tab/375px (bớt đệm, chữ 9,5px ở
  màn ≤ 420px); nút đầu trang 44px. Không còn lỗi ở 375 / 768 / 1280.

## Chọn sản phẩm bằng ô tìm (24/11/2026)

- Form Đơn hàng không liệt kê hết sản phẩm nữa. Người lên đơn gõ tên vào ô "+ Thêm sản phẩm", app gợi ý theo
  từng từ, không cần dấu ("kiem up" → Lavie Kiềm Úp 19L, "19" → mọi loại 19L). Enter chọn gợi ý đầu, rồi nhảy
  thẳng vào ô số lượng. Dòng nào thừa thì bấm ✕. Sản phẩm đã có trong đơn không hiện lại trong gợi ý.
- Trên điện thoại, tên sản phẩm nằm một dòng riêng, ô số lượng và ô giá nằm ở dòng dưới.
