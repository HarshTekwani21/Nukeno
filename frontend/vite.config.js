import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true,
    proxy: {
      '^/(chat|voice-chat|tasks|notes|auth|notifications|health|daily-summary)': {
        target: 'http://localhost:10000',
        changeOrigin: true,
      }
    }
  }
})
