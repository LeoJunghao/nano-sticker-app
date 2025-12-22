
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // 確保 process.env.API_KEY 在瀏覽器中可用，符合開發規範
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env': {}
  },
  server: {
    port: 3000,
    open: true
  }
});
