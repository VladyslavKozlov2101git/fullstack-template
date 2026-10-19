import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin API calls in dev, so no CORS config on the API side.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
