import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['defaults', 'not IE 11', 'Android >= 4.4', 'Chrome >= 49', 'Safari >= 10', 'iOS >= 10'],
      renderLegacyChunks: true,
      modernPolyfills: ['es.array.at', 'es.string.replace-all'],
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
