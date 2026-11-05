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
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html')
      }
    }
  }
});
