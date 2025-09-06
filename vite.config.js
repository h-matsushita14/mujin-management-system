import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://script.google.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/macros/s/AKfycbzcm29NtPBqS_kJ5-S0nfJBYsyMGU91WFlwUdU7sDsB-QE-SdnF4HFpVIoh_Ra2CvON/exec'),
      },
    }
  }
})