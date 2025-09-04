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
        rewrite: (path) => path.replace(/^\/api/, '/macros/s/AKfycbwAkzmRHOLC1wmpJmQgx8zOP-TqudBiel7dBsV3gduhtNvtJmzofPsnRo6FRcre1arp/exec'),
      },
    }
  }
})