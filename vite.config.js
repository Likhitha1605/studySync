
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(import.meta.dirname, "frontend"),
  plugins: [react()],
  server: {
    fs: {
      allow: [resolve(import.meta.dirname)],
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
