import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Mark problematic modules as external to prevent bundling errors
  optimizeDeps: {
    exclude: ["pdf.js-extract", "canvas"],
  },
  build: {
    rollupOptions: {
      external: ["canvas", "pdf.js-extract"],
    },
  },
});
