import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Canton sandbox's JSON API sends no Access-Control-Allow-Origin header,
// so the browser can't call it cross-origin directly. Proxying same-path
// requests through Vite's own dev server keeps them same-origin instead.
const jsonApiTarget = process.env.VITE_JSON_API_TARGET ?? 'http://localhost:17575'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/v2': { target: jsonApiTarget, changeOrigin: true },
    },
  },
  preview: {
    proxy: {
      '/v2': { target: jsonApiTarget, changeOrigin: true },
    },
  },
})
