import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    outDir: "dist-lib",
    emptyOutDir: true,
    lib: {
      entry: resolve(process.cwd(), "src/lib.ts"),
      name: "Utaformatix3Ts",
      formats: ["iife", "es"],
      fileName: (format) => (format === "iife" ? "utaformatix3-ts.iife.js" : "utaformatix3-ts.esm.js"),
    },
  },
});
