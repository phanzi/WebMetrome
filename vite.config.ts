import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { join } from "node:path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  root: "client",
  envDir: ".",
  publicDir: false,
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    strictPort: true,
  },
  build: {
    outDir: join("out", "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      { find: "@", replacement: "client" },
      { find: "@server", replacement: "server" },
    ],
  },
});
