// Sinh bộ icon PWA từ logo tạm (giọt nước, vẽ bằng SVG — src/components/BieuTuong.tsx).
// Có logo thật của Đại Phúc Khang thì thay SVG dưới đây rồi chạy lại:
//   node scripts/taoIcon.mjs
// Icon "maskable" phải RIÊNG: Android cắt theo hình của hãng, chỉ giữ vòng tròn
// 80% ở giữa — dùng icon thường thì Samsung/Xiaomi xén cụt giọt nước (bài học MIA).
import sharp from 'sharp'

const giot = (nen, vienNgoai) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${vienNgoai}" fill="${nen}"/>
  <g transform="translate(256 262) scale(${nen === '#1e40af' ? 1 : 1.25}) translate(-256 -262)">
    <path d="M256 104c-52 72-112 132-112 196a112 112 0 0 0 224 0c0-64-60-124-112-196Z" fill="${nen === '#1e40af' ? '#ffffff' : '#2563eb'}"/>
    <path d="M202 312a56 56 0 0 0 54 54" stroke="${nen === '#1e40af' ? '#2563eb' : '#ffffff'}" stroke-width="22" stroke-linecap="round" fill="none"/>
  </g>
</svg>`

const thuong = Buffer.from(giot('#ffffff', 112))
const maskable = Buffer.from(giot('#1e40af', 0))
await sharp(thuong).resize(192).png().toFile('public/icon-192.png')
await sharp(thuong).resize(512).png().toFile('public/icon-512.png')
await sharp(maskable).resize(512).png().toFile('public/icon-maskable-512.png')
// iOS không hiểu nền trong suốt — apple-touch-icon nền đặc.
await sharp(maskable).resize(180).png().toFile('public/apple-touch-icon.png')
await sharp(thuong).resize(48).png().toFile('public/favicon-48.png')
console.log('Đã tạo icon trong public/')
