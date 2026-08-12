import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.js.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Allows access from any network interface / IP
    host: true, 
    // Allow requests from any origin host
    allowedHosts: true, 
    cors: true, // Enables CORS for Vite dev server assets
    proxy: {
      // Proxies all /api requests to your backend running on port 5000
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})