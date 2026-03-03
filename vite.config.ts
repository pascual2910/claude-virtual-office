import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  root: 'client',
  plugins: [
    svelte(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '$lib': path.resolve('./client/src'),
      '$shared': path.resolve('./shared'),
    },
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/hooks': 'http://localhost:3377',
      '/api': 'http://localhost:3377',
      '/ws': {
        target: 'ws://localhost:3377',
        ws: true,
      },
    },
  },
});
