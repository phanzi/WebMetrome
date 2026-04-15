import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { join } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  envDir: ".",
  publicDir: false,
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      protocol: "http",
      host: "localhost",
      port: 3000,
      clientPort: 3000,
    },
  },
  build: {
    outDir: join("out", "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": join(__dirname, "client"),
      "@server": join(__dirname, "server"),
    },
  },
});
