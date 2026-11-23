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
      includeAssets: ['favicon-48.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'Đại Phúc Khang',
        short_name: 'Đại Phúc Khang',
        description: 'Điều phối xe, giao hàng và đối soát kho — Đại Phúc Khang',
        theme_color: '#1e40af',
        background_color: '#f5f7fc',
        display: 'standalone',
        start_url: '/',
        lang: 'vi',
        // Icon sinh từ logo tạm bằng scripts/taoIcon.mjs. Maskable phải là
        // file riêng (Android cắt theo hình của hãng).
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // woff2 phải có: thiếu thì mất sóng là mất font.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
})
