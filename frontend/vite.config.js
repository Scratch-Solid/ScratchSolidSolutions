import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/signup': 'http://127.0.0.1:8000',
      '/login': 'http://127.0.0.1:8000',
      '/book': 'http://127.0.0.1:8000',
      '/bookings': 'http://127.0.0.1:8000',
      '/create_test_user': 'http://127.0.0.1:8000',
      '/healthz': 'http://127.0.0.1:8000',
    },
  },
})
