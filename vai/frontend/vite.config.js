import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()

  ],
  build: {
    outDir: '../static/frontend', // Store built files in Django's static folder
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',     // Fixed filename for the JS file
        chunkFileNames: 'assets/[name].js',    // Fixed filename for chunk files
        assetFileNames: 'assets/[name].[ext]'  // Fixed filenames for other assets (CSS, images, etc.)
      }
    }
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000', // Proxy API calls to Django
    },
  },
})

