import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      // No includeAssets: workbox.globPatterns already precaches svg/png (favicon,
      // icons, apple-touch), so listing them here only created duplicate entries.
      manifest: {
        name: 'Afterword',
        short_name: 'Afterword',
        description: 'Build one shared chain of words, race a snakes-and-ladders board.',
        theme_color: '#2B2119',
        background_color: '#EADFC7',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // woff2 (offline fonts) + bin (the gzip-compressed dictionary, opaque so the
        // client decompresses it — see scripts/gen-dict.mjs) must be globbed too.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,bin}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // dict-in-JS chunk is ~1.98MB (>2MB default)
      },
      devOptions: { enabled: false },
    }),
  ],
})
