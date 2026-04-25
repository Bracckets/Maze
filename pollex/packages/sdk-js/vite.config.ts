import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [dts({ insertTypesEntry: true })],
  resolve: {
    alias: {
      "@pollex/shared-types": new URL("../shared-types/src/index.ts", import.meta.url).pathname
    }
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es", "cjs"],
      fileName: (format) => (format === "es" ? "index.js" : "index.cjs")
    },
    rollupOptions: {
      external: ["zod"]
    }
  },
  test: {
    environment: "jsdom"
  }
});
