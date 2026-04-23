import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { join } from "node:path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  root: "client",
  envDir: ".",
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
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      devOptions: {
        enabled: true,
      },
      pwaAssets: {
        integration: {
          outDir: "out/dist", // cwd 기준
        },
      },
      manifest: {
        theme_color: "#377CFB", // primary color
      },
    }),
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
    outDir: "../out/dist", // vite.root 기준
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": join(__dirname, "client"),
      "@server": join(__dirname, "server"),
    },
  },
});
