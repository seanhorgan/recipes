import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// Connected devices keep a GitHub token in the browser, so the built site only runs its own scripts and only talks
// to the GitHub API. (Build only: the dev server needs inline scripts for hot reload.)
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  'connect-src https://api.github.com',
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

// The app bundles the repo's markdown at build time (see src/data.ts), so it's served from GitHub Pages
// at https://seanhorgan.github.io/recipes/ and rebuilt on every push to main.
export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  server: { fs: { allow: ['..'] } },
});
