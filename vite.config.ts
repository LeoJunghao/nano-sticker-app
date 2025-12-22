
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 這裡只做基礎定義，確保不會在編譯時報錯
    'process.env': '{}'
  },
  server: {
    port: 3000,
    open: true
  }
});
