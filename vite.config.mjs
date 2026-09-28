import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { getLanIPv4 } = require('./scripts/capacitor-env.js');
const { capacitorSkipNativeHmrReload } = require('./scripts/vite-skip-native-hmr-reload.js');

const lanIp = getLanIPv4();

export default defineConfig({
  plugins: [react(), tailwindcss(), capacitorSkipNativeHmrReload()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    hmr: lanIp ? { host: lanIp } : undefined,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'build',
  },
});
