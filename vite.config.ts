import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(rootDir, "src");

// https://vite.dev/config/
export default defineConfig({
  root: appRoot,
  envDir: rootDir,
  publicDir: false,
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      host: "localhost",
      port: 3000,
      clientPort: 3000,
    },
  },
  build: {
    outDir: path.join(rootDir, "out", "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.join(rootDir, "src") },
      { find: "@server", replacement: path.join(rootDir, "src", "backend") },
    ],
  },
});
