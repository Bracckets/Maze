import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@pollex/sdk-react": new URL("../../packages/sdk-react/src/index.ts", import.meta.url).pathname,
      "@pollex/sdk-js": new URL("../../packages/sdk-js/src/index.ts", import.meta.url).pathname,
      "@pollex/shared-types": new URL("../../packages/shared-types/src/index.ts", import.meta.url).pathname
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
