import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // strictPort: berhenti dengan pesan jelas kalau 5173 dipakai, bukan diam-diam
  // pindah ke 5174 — port lain akan ditolak CORS_ORIGINS backend.
  server: { port: 5173, strictPort: true, open: true },
});
