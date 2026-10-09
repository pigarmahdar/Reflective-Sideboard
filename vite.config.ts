import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// GitHub Pages project sites serve from /<repo>/, so asset URLs must be
// prefixed. Deploying to a domain root instead? Set BASE to ''.
const BASE = process.env.PAGES_BASE ?? '/Reflective-Sideboard/';

export default defineConfig({
  base: BASE,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
