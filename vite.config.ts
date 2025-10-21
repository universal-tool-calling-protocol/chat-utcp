import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configure base path for GitHub Pages
  // Change 'chat-utcp' to your actual repository name if different
  base: process.env.NODE_ENV === 'production' ? '/chat-utcp/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    // Prevent 'global is not defined' errors
    global: 'globalThis',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
