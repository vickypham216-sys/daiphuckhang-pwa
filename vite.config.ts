import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Hỏi trước khi tải bản mới, không tự reload giữa lúc tài xế đang
      // lập phiếu.
      registerType: 'prompt',
      manifest: {
        name: 'Đại Phúc Khang',
        short_name: 'Đại Phúc Khang',
        description: 'Điều phối xe, giao hàng và đối soát kho — Đại Phúc Khang',
        theme_color: '#0f5c8c',
        background_color: '#f4f7fa',
        display: 'standalone',
        start_url: '/',
        lang: 'vi',
        // TODO: thêm icon khi có logo (192, 512, maskable 512). Chưa có icon
        // thì điện thoại không hiện nút "Cài app".
        icons: [],
      },
      workbox: {
        // woff2 phải có: thiếu thì mất sóng là mất font.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
})
