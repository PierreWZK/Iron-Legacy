import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5328, strictPort: true },
  build: {
    // Dépendances stables découpées à part : elles changent rarement, donc restent en cache entre deux versions du jeu.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\/]node_modules[\/](three|@react-three)[\/]/.test(id)) return 'three';
          if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return 'react';
          if (/[\/]node_modules[\/](colyseus\.js|@colyseus)[\/]/.test(id)) return 'network';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
