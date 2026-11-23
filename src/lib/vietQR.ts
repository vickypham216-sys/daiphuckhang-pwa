// Dựng chuỗi VietQR (chuẩn EMVCo MPM của NAPAS) — hàm thuần, không mạng.
//
// ─────────────────────────────────────────────────────────────────────────
// VÌ SAO TỰ DỰNG CHỨ KHÔNG GỌI img.vietqr.io
//
// Cách nhanh nhất là nhúng <img src="https://img.vietqr.io/...">. Ba lý do bỏ:
//
//  1. App này phải mở được khi MẤT SÓNG. Ảnh tải từ mạng thì lúc cần nhất —
//     đứng ở cửa nhà khách — lại là lúc không hiện được.
//  2. Số tài khoản công ty và tên khách hàng sẽ đi ra một dịch vụ bên ngoài
//     trong mỗi lần hiện QR. Không có lý do gì phải làm vậy.
//  3. Thêm một thứ nữa có thể hỏng mà không ai kiểm soát được.
//
// Chuỗi mã chỉ là ghép chuỗi cộng một phép CRC. Việc vẽ ra ô vuông do thư
// viện `qrcode-generator` làm, gói sẵn trong bundle (~10KB).
//
// ─────────────────────────────────────────────────────────────────────────
// CẤU TRÚC — TLV lồng nhau
//
// Mỗi trường là [2 chữ số ID][2 chữ số ĐỘ DÀI][nội dung]:
//
//   00  "01"                     Phiên bản
//   01  "11" tĩnh | "12" động    Có số tiền thì là động
//   38  Thông tin thụ hưởng
//         00  "A000000727"       GUID của NAPAS
//         01    00  <BIN 6 số>   Mã ngân hàng
//               01  <số tài khoản>
//         02  "QRIBFTTA"         Chuyển vào TÀI KHOẢN (không phải thẻ)
//   53  "704"                    Tiền Việt
//   54  <số tiền>                bỏ qua nếu là mã tĩnh
//   58  "VN"
//   62    08  <nội dung chuyển khoản>
//   63  <CRC16>                  tính trên TOÀN BỘ chuỗi, kể cả "6304"
//
// Cái bẫy duy nhất đáng nhớ: CRC được tính trên chuỗi ĐÃ CÓ SẴN "6304" ở
// cuối. Quên phần đó thì mã trông vẫn hợp lệ nhưng mọi app ngân hàng đều từ
// chối, và không có thông báo lỗi nào giải thích vì sao.
// ─────────────────────────────────────────────────────────────────────────

export interface TaiKhoanNhan {
  /** Mã BIN 6 số của ngân hàng. Techcombank = 970407. */
  MaNganHang: string;
  SoTaiKhoan: string;
  /** Tên chủ tài khoản, viết KHÔNG DẤU. Chỉ để hiển thị, không vào mã QR. */
  TenChuTaiKhoan: string;
  /** Tên ngân hàng để hiện cho người đọc. Không vào mã QR. */
  TenNganHang: string;
}

/** Ghép một trường TLV. Độ dài luôn 2 chữ số. */
function tlv(id: string, giaTri: string): string {
  return id + String(giaTri.length).padStart(2, "0") + giaTri;
}

/**
 * CRC16/CCITT-FALSE — đa thức 0x1021, khởi tạo 0xFFFF, không đảo bit.
 * Trả về 4 chữ số hex IN HOA.
 */
export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Bỏ dấu tiếng Việt và mọi ký tự lạ.
 *
 * Nội dung chuyển khoản đi qua hệ thống liên ngân hàng, nơi chỉ chắc chắn an
 * toàn với chữ cái ASCII và chữ số. Gửi "Chị Hoa" thì bên nhận có thể thấy
 * "Ch? Hoa" hoặc mất hẳn dòng nội dung — mà đó chính là thứ dùng để đối chiếu
 * sao kê ra đúng khách.
 */
export function boDau(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nội dung chuyển khoản cho một khách.
 *
 * Cắt còn 25 ký tự: nhiều ngân hàng chặn ở khoảng đó, và cắt sẵn ở đây thì
 * biết trước khách sẽ thấy gì, thay vì để mỗi ngân hàng cắt một kiểu.
 */
export function noiDungChuyenKhoan(tenKhach: string, maKH: string): string {
  return boDau(`DPK ${tenKhach} ${maKH}`).slice(0, 25).trim();
}

/**
 * Dựng chuỗi VietQR.
 *
 * @param soTien  0 hoặc âm -> mã TĨNH (khách tự gõ số tiền).
 *                dương     -> mã ĐỘNG, điền sẵn đúng số phải trả.
 */
export function chuoiVietQR(
  tk: TaiKhoanNhan,
  soTien: number,
  noiDung: string
): string {
  const coSoTien = Number.isInteger(soTien) && soTien > 0;

  const thuHuong = tlv("00", tk.MaNganHang) + tlv("01", tk.SoTaiKhoan);
  const thongTin =
    tlv("00", "A000000727") + tlv("01", thuHuong) + tlv("02", "QRIBFTTA");

  const nd = boDau(noiDung).slice(0, 25).trim();

  let p =
    tlv("00", "01") +
    tlv("01", coSoTien ? "12" : "11") +
    tlv("38", thongTin) +
    tlv("53", "704") +
    (coSoTien ? tlv("54", String(soTien)) : "") +
    tlv("58", "VN") +
    (nd ? tlv("62", tlv("08", nd)) : "");

  // "63" + "04" phải nằm trong chuỗi TRƯỚC khi tính CRC — xem ghi chú đầu file.
  p += "6304";
  return p + crc16(p);
}

/**
 * Đủ thông tin để dựng mã chưa. Thiếu thì màn hình phải báo, không vẽ QR sai.
 *
 * SỐ TÀI KHOẢN ĐƯỢC PHÉP CÓ CHỮ CÁI. Đây là chỗ đã làm sai một lần
 * (03/09/2026): bản đầu chặn `^\d{6,19}$` vì tưởng tài khoản ngân hàng luôn
 * toàn số, nên từ chối thẳng tài khoản thật của công ty.
 *
 * Techcombank cấp cho điểm bán một TÀI KHOẢN ĐỊNH DANH dạng `MS00P0000...`.
 * Nó là số tài khoản đúng nghĩa: mã QR của ngân hàng mang chính chuỗi đó, và
 * app ngân hàng khác quét vào thì tra ra đúng tên người thụ hưởng. Nhiều ngân
 * hàng khác cũng có kiểu tài khoản ảo tương tự.
 *
 * Trường thụ hưởng của EMVCo là *alphanumeric*, không phải numeric — nên chỉ
 * chặn ký tự lạ (dấu, khoảng trắng, ký hiệu), không chặn chữ cái.
 */
export function taiKhoanHopLe(tk: Partial<TaiKhoanNhan> | null | undefined): boolean {
  if (!tk) return false;
  return (
    /^\d{6}$/.test(tk.MaNganHang ?? "") &&
    /^[A-Za-z0-9]{4,19}$/.test(tk.SoTaiKhoan ?? "")
  );
}
