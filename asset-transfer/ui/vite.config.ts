/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Dev-only: the browser talks to this origin (:5173); Vite forwards ledger
  // calls to the sandbox's JSON Ledger API (:7575) server-side, avoiding CORS.
  server: {
    proxy: {
      '/v2': { target: 'http://localhost:7575', changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
