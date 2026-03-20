import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/occ-exposure/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: false,
  },
  cacheDir: process.env.TEMP + '/vite-occ-explorer',
})
