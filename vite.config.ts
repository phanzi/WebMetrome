import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { join } from "node:path";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [
    svgr(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    // tanstackRouter({
    //   routesDirectory: "./routes",
    //   generatedRouteTree: "./routeTree.gen.ts",
    //   target: "react",
    //   autoCodeSplitting: true,
    // }),
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
    // VitePWA({
    //   registerType: "autoUpdate",
    //   injectRegister: "auto",
    //   devOptions: {
    //     enabled: true,
    //   },
    //   pwaAssets: {
    //     integration: {
    //       outDir: "out/dist", // cwd 기준
    //     },
    //     injectThemeColor: false,
    //   },
    //   manifest: {
    //     theme_color: "#377CFB", // light mode primary color
    //   },
    // }),
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
  resolve: {
    alias: {
      "@": join(__dirname, "src"),
      "@server": join(__dirname, "server"),
    },
  },
});
