
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 改用字串表達式，讓 Vite 在替換時插入一段 JavaScript 邏輯，而非直接插入金鑰數值。
    // 這樣即使在 Vercel Build 時有 API_KEY，它也不會被寫死在產出的 js 檔案中。
    'process.env.API_KEY': '(globalThis.process?.env?.API_KEY || "")',
    'process.env': '(globalThis.process?.env || {})'
  },
  server: {
    port: 3000,
    open: true
  }
});
