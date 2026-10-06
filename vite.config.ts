import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { host: true, port: 5191, strictPort: true },
  // exceljs (~900 kB) só é baixado ao exportar
  build: { chunkSizeWarningLimit: 1000 },
});
