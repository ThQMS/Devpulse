import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiKey = process.env.API_KEY ?? 'troque-em-producao';
const apiTarget = process.env.VITE_API_TARGET ?? 'http://localhost:3001';
const wsTarget = process.env.VITE_WS_TARGET ?? 'ws://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        headers: { 'x-api-key': apiKey },
      },
      '/ws': {
        target: wsTarget,
        ws: true,
        changeOrigin: true,
        rewrite: (path) => (path.includes('?') ? `${path}&key=${apiKey}` : `${path}?key=${apiKey}`),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split heavy vendors so the main bundle stays small and caches well.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
});
