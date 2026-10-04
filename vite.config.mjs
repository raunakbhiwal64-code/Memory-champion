import { defineConfig } from 'vite';

// base './' keeps every asset path relative, so the built site works from
// any folder or sub-path (GitHub Pages, Netlify, a plain static server).
export default defineConfig({
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
  server: { host: true },
  preview: { host: true }
});
