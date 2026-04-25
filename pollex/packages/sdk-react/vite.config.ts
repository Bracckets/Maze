import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [react(), dts({ insertTypesEntry: true })],
  resolve: {
    alias: {
      "@pollex/sdk-js": new URL("../sdk-js/src/index.ts", import.meta.url).pathname,
      "@pollex/shared-types": new URL("../shared-types/src/index.ts", import.meta.url).pathname
    }
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
      cssFileName: "styles"
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime", "@pollex/sdk-js"]
    }
  },
  test: {
    environment: "jsdom",
    globals: true
  }
});
