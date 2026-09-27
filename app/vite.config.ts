import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app bundles the repo's markdown at build time (see src/data.ts), so it's served from GitHub Pages
// at https://seanhorgan.github.io/recipes/ and rebuilt on every push to main.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
});
