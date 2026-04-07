import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/verify': 'http://127.0.0.1:3001',
      '/admin': 'http://127.0.0.1:3001',
      '/health': 'http://127.0.0.1:3001',
    }
  }
})
