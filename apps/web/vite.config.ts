import react from "@vitejs/plugin-react";

import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  base: "/",
  server: {
    // Same-origin API calls in dev, so the API needs no CORS config.
    proxy: { "/api": "http://localhost:3000" },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/tests/setup",
    // undici's Request rejects relative URLs, so the client needs an absolute
    // base in tests. Requests are stubbed — nothing leaves the process.
    env: { VITE_API_URL: "http://localhost/api" },
  },
  resolve: {
    alias: {
      "@": "/src",
      "@app": "/src/app",
      "@components": "/src/components",
      "@services": "/src/services",
      "@redux": "/src/redux",
      "@models": "/src/models",
      "@shared": "/src/shared",
      "@assets": "/src/assets",
      "@routes": "/src/routes/paths",
      "@helpers": "/src/helpers",
      "@layouts": "/src/layouts",
      "@pages": "/src/pages",
      "@containers": "/src/containers",
    },
  },
});
