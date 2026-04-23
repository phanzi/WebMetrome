import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { join } from "node:path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  root: "client",
  envDir: ".",
  publicDir: false,
  plugins: [
    svgr(),
    tanstackRouter({
      routesDirectory: "./routes",
      generatedRouteTree: "./routeTree.gen.ts",
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
  ],
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
    outDir: join(process.cwd(), "out", "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": join(__dirname, "client"),
      "@server": join(__dirname, "server"),
    },
  },
});
