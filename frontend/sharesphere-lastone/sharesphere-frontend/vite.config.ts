import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development, /api is proxied to the Express backend (default port 5000),
// so no CORS or hard-coded URLs are needed. For production set VITE_API_BASE_URL.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': process.env.VITE_BACKEND_URL || 'http://localhost:5000' },
  },
});
