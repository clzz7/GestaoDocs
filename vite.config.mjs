import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Tauri: don't clear screen so we see Rust/Cargo output
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    // Allow Tauri dev server to connect from the WebView
    host: '127.0.0.1',
    watch: {
      // Exclude src-tauri from Vite's watcher to avoid EBUSY errors
      // when Cargo locks build artifacts (e.g. .dll files)
      ignored: ['**/src-tauri/**'],
    },
  },
  // Tauri uses env variables prefixed with TAURI_
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
  build: {
    // Tauri's minimum supported Chromium target
    target: ['es2021', 'chrome100', 'safari13'],
    outDir: 'dist',
    emptyOutDir: true,
    // Reduce file size for the embedded WebView
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
