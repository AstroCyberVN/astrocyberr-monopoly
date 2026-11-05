import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'monopoly-admin-route-rewrite',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url) {
            const [pathname, search] = req.url.split('?');
            if (pathname === '/admin' || pathname === '/admin/') {
              req.url = `/admin/index.html${search ? `?${search}` : ''}`;
            }
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url) {
            const [pathname, search] = req.url.split('?');
            if (pathname === '/admin' || pathname === '/admin/') {
              req.url = `/admin/index.html${search ? `?${search}` : ''}`;
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    host: true,
    open: false
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html')
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three-vendor';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor';
          }
          if (id.includes('node_modules/gsap') || id.includes('node_modules/canvas-confetti')) {
            return 'fx-vendor';
          }
        }
      }
    }
  }
});
